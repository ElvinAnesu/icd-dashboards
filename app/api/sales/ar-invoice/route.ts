import sql from "mssql";
import config from "@/lib/dbconfig";
import { NextRequest } from "next/server";

/**
 * GET /api/sales/ar-invoice — AR invoice totals from OINV filtered by DocDate.
 */
export async function GET(request: NextRequest) {
  try {
    await sql.connect(config);

    const searchParams = request.nextUrl.searchParams;
    const filterType = searchParams.get("filterType");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    let query = "SELECT DocTotal FROM OINV";
    const conditions: string[] = ["CANCELED = 'N'"];

    if (filterType) {
      const now = new Date();
      let filterStartDate: Date | null = null;

      switch (filterType) {
        case "today":
          filterStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          conditions.push(`DocDate >= '${filterStartDate.toISOString()}'`);
          break;
        case "last7days":
          filterStartDate = new Date(now);
          filterStartDate.setDate(now.getDate() - 7);
          conditions.push(`DocDate >= '${filterStartDate.toISOString()}'`);
          break;
        case "last3months":
          filterStartDate = new Date(now);
          filterStartDate.setMonth(now.getMonth() - 3);
          conditions.push(`DocDate >= '${filterStartDate.toISOString()}'`);
          break;
        case "custom":
          if (startDate) {
            conditions.push(`DocDate >= '${startDate}'`);
          }
          if (endDate) {
            const endDateTime = new Date(endDate);
            endDateTime.setHours(23, 59, 59, 999);
            conditions.push(`DocDate <= '${endDateTime.toISOString()}'`);
          }
          break;
      }
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    const result = await sql.query(query);
    return Response.json(result.recordset);
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
