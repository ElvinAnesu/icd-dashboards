import sql from "mssql";
import config from "@/lib/dbconfig";
import { NextRequest } from "next/server";
import { buildDashboardDateConditions } from "@/lib/dashboardDateFilter";

/**
 * GET /api/permits — all loading permits from [@BIS_OLPI], filtered by U_DocDate (created).
 */
export async function GET(request: NextRequest) {
  try {
    await sql.connect(config);

    const searchParams = request.nextUrl.searchParams;
    const filterType = searchParams.get("filterType");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    let query = "SELECT * FROM [@BIS_OLPI]";
    const conditions = buildDashboardDateConditions(
      "U_DocDate",
      filterType,
      startDate,
      endDate
    );

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    const result = await sql.query(query);

    return Response.json(result.recordset);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
