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
      "G.U_GateOutDate",
      filterType,
      startDate,
      endDate
    );

    const bt = loadingPermitBaseTypeSqlPredicate("G");

    const gateWhereParts = [
      "G.U_BaseDocNo = P.DocEntry",
      ...(bt ? [bt] : []),
      ...gateDateConditions,
    ];

    let query = `
SELECT P.*
FROM [@BIS_OLPI] P
WHERE EXISTS (
  SELECT 1 FROM OIGE G
  WHERE ${gateWhereParts.join(" AND ")}
)`.trim();

    const result = await sql.query(query);

    return Response.json(result.recordset);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
