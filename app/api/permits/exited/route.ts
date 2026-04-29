import sql from "mssql";
import config from "@/lib/dbconfig";
import { NextRequest } from "next/server";
import { buildDashboardDateConditions } from "@/lib/dashboardDateFilter";
import { loadingPermitBaseTypeSqlPredicate } from "@/lib/loadingPermitGateLink";

/**
 * GET /api/permits/exited — [@BIS_OLPI] permits that have a gate-out on OIGE linked by
 * U_BaseDocNo = DocEntry, filtered by OIGE.U_GateOutDate (exit window).
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

    const gateWhereParts = [
      "G.U_BaseDocNo = P.DocEntry",
      ...(bt ? [bt] : []),
    ];

    let query = `
SELECT P.*, X.U_GateOutDate
FROM [@BIS_OLPI] P
CROSS APPLY (
  SELECT TOP 1 G.U_GateOutDate
  FROM OIGE G
  WHERE ${gateWhereParts.join(" AND ")}
  ORDER BY G.U_GateOutDate ASC, G.DocEntry ASC
) X`.trim();

    if (gateDateConditions.length > 0) {
      query += ` WHERE ${gateDateConditions.join(" AND ")}`;
    }

    const result = await sql.query(query);

    return Response.json(result.recordset);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
