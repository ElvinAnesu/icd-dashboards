import sql from "mssql";
import config from "@/lib/dbconfig";
import { NextRequest } from "next/server";
import { buildDashboardDateConditions } from "@/lib/dashboardDateFilter";
import { loadingPermitBaseTypeSqlPredicate } from "@/lib/loadingPermitGateLink";

/**
 * GET /api/permits/pending — [@BIS_OLPI] permits with no matching OIGE gate-out (not exited yet),
 * filtered by U_DocDate (created window).
 */
export async function GET(request: NextRequest) {
  try {
    await sql.connect(config);

    const searchParams = request.nextUrl.searchParams;
    const filterType = searchParams.get("filterType");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const docWhereParts = buildDashboardDateConditions(
      "P.U_DocDate",
      filterType,
      startDate,
      endDate
    );

    const bt = loadingPermitBaseTypeSqlPredicate("G");

    const notExistsInner = [
      "G.U_BaseDocNo = P.DocEntry",
      ...(bt ? [bt] : []),
    ];

    const outerWhere: string[] = [
      `NOT EXISTS (
  SELECT 1 FROM OIGE G
  WHERE ${notExistsInner.join(" AND ")}
)`,
      ...docWhereParts,
    ];

    let query = `
SELECT P.*
FROM [@BIS_OLPI] P
WHERE ${outerWhere.join(" AND ")}
`.trim();

    const result = await sql.query(query);

    return Response.json(result.recordset);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
