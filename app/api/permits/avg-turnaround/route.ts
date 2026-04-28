import sql from "mssql";
import config from "@/lib/dbconfig";
import { NextRequest } from "next/server";
import { buildDashboardDateConditions } from "@/lib/dashboardDateFilter";
import { loadingPermitBaseTypeSqlPredicate } from "@/lib/loadingPermitGateLink";
import {
  parseSapDateWithTime,
  turnaroundHoursBetween,
} from "@/lib/permitTimestamps";

type Row = {
  U_DocDate?: string | null;
  U_ETime?: number | null;
  U_GateOutDate?: string | null;
  U_ExitTime1?: number | null;
};

/**
 * GET /api/permits/avg-turnaround
 * Average hours from OLPI issue (U_DocDate + U_ETime) to gate exit (U_GateOutDate + U_ExitTime1),
 * for permits with a gate-out in the selected exit window (same as /api/permits/exited).
 */
export async function GET(request: NextRequest) {
  try {
    await sql.connect(config);

    const searchParams = request.nextUrl.searchParams;
    const filterType = searchParams.get("filterType");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const gateDateConditions = buildDashboardDateConditions(
      "X.U_GateOutDate",
      filterType,
      startDate,
      endDate
    );

    const bt = loadingPermitBaseTypeSqlPredicate("G");

    const innerWhereParts = [
      "G.U_BaseDocNo = P.DocEntry",
      ...(bt ? [bt] : []),
    ];

    let query = `
SELECT
  P.U_DocDate,
  P.U_ETime,
  X.U_GateOutDate,
  X.U_ExitTime1
FROM [@BIS_OLPI] P
CROSS APPLY (
  SELECT TOP 1 G.U_GateOutDate, G.U_ExitTime1
  FROM OIGE G
  WHERE ${innerWhereParts.join(" AND ")}
  ORDER BY G.U_GateOutDate ASC, G.DocEntry ASC
) X`.trim();

    if (gateDateConditions.length > 0) {
      query += ` WHERE ${gateDateConditions.join(" AND ")}`;
    }

    const result = await sql.query(query);
    const rows = result.recordset as Row[];

    const hours: number[] = [];
    for (const row of rows) {
      const issued = parseSapDateWithTime(row.U_DocDate, row.U_ETime);
      const exited = parseSapDateWithTime(row.U_GateOutDate, row.U_ExitTime1);
      const h = turnaroundHoursBetween(issued, exited);
      if (h !== null && Number.isFinite(h)) {
        hours.push(h);
      }
    }

    const sampleCount = hours.length;
    const averageHours =
      sampleCount <= 0
        ? null
        : hours.reduce((a, b) => a + b, 0) / sampleCount;

    return Response.json({
      averageHours,
      sampleCount,
      rowCount: rows.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
