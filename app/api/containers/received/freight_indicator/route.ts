import sql from "mssql";
import config from "@/lib/dbconfig";
import { NextRequest } from "next/server";

/**
 * Freight indicator (FCL vs LCL) from [@BIS_OCONT].U_FI, filtered by U_CRDate.
 * Same date filters as GET /api/containers/received.
 */
export async function GET(request: NextRequest) {
  try {
    await sql.connect(config);

    const searchParams = request.nextUrl.searchParams;
    const filterType = searchParams.get("filterType");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    let query =
      "SELECT U_CRDate, U_FI FROM [@BIS_OCONT]";
    const conditions: string[] = [];

    if (filterType) {
      const now = new Date();
      let filterStartDate: Date | null = null;

      switch (filterType) {
        case "today":
          filterStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          conditions.push(`U_CRDate >= '${filterStartDate.toISOString()}'`);
          break;
        case "last7days":
          filterStartDate = new Date(now);
          filterStartDate.setDate(now.getDate() - 7);
          conditions.push(`U_CRDate >= '${filterStartDate.toISOString()}'`);
          break;
        case "last3months":
          filterStartDate = new Date(now);
          filterStartDate.setMonth(now.getMonth() - 3);
          conditions.push(`U_CRDate >= '${filterStartDate.toISOString()}'`);
          break;
        case "custom":
          if (startDate) {
            conditions.push(`U_CRDate >= '${startDate}'`);
          }
          if (endDate) {
            const endDateTime = new Date(endDate);
            endDateTime.setHours(23, 59, 59, 999);
            conditions.push(`U_CRDate <= '${endDateTime.toISOString()}'`);
          }
          break;
      }
    }

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
