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

const BIN_LABELS = [
  "0–6 h",
  "6–12 h",
  "12–24 h",
  "24–48 h",
  "48–72 h",
  "72–96 h",
  "96+ h",
] as const;

function resolveBinIndex(hours: number): number {
  if (hours < 6) return 0;
  if (hours < 12) return 1;
  if (hours < 24) return 2;
  if (hours < 48) return 3;
  if (hours < 72) return 4;
  if (hours < 96) return 5;
  return 6;
}

/**
 * GET /api/permits/avg-turnaround/distribution
 * Histogram-ready turnaround distribution using the same turnaround logic as /api/permits/avg-turnaround.
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

    const counts = Array.from({ length: BIN_LABELS.length }, () => 0);
    const validHours: number[] = [];

    for (const row of rows) {
      const issued = parseSapDateWithTime(row.U_DocDate, row.U_ETime);
      const exited = parseSapDateWithTime(row.U_GateOutDate, row.U_ExitTime1);
      const h = turnaroundHoursBetween(issued, exited);
      if (h !== null && Number.isFinite(h)) {
        validHours.push(h);
        counts[resolveBinIndex(h)] += 1;
      }
    }

    const sampleCount = validHours.length;
    const averageHours =
      sampleCount <= 0
        ? null
        : validHours.reduce((a, b) => a + b, 0) / sampleCount;

    return Response.json({
      labels: [...BIN_LABELS],
      counts,
      sampleCount,
      averageHours,
      rowCount: rows.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
