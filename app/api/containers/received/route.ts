import sql from "mssql";
import config from "@/lib/dbconfig";
import { NextRequest } from "next/server";
import {
  normalizeSearchFromParams,
  buildCharIndexSearchSql,
} from "@/lib/apiTableSearch";

export async function GET(request: NextRequest) {
  try {
    const pool = await sql.connect(config);
    const dbReq = pool.request();

    const searchParams = request.nextUrl.searchParams;
    const filterType = searchParams.get("filterType");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const search = normalizeSearchFromParams(searchParams);

    let query = `SELECT 
                      U_MBLNo as MBLNo,
                      U_HBLNo as HBLNo,
                      U_CNo as CONTAINER_NO,
                      U_size1 as SIZE,
                      U_FrIn as TYPE
                      FROM [@BIS_CONT1]`;
    const conditions: string[] = [];

    if (filterType) {
      const now = new Date();
      let filterStartDate: Date | null = null;

      switch (filterType) {
        case "today":
          filterStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          conditions.push(`U_GID >= '${filterStartDate.toISOString()}'`);
          break;
        case "last7days":
          filterStartDate = new Date(now);
          filterStartDate.setDate(now.getDate() - 7);
          conditions.push(`U_GID >= '${filterStartDate.toISOString()}'`);
          break;
        case "last3months":
          filterStartDate = new Date(now);
          filterStartDate.setMonth(now.getMonth() - 3);
          conditions.push(`U_GID >= '${filterStartDate.toISOString()}'`);
          break;
        case "custom":
          if (startDate) {
            conditions.push(`U_GID >= '${startDate}'`);
          }
          if (endDate) {
            const endDateTime = new Date(endDate);
            endDateTime.setHours(23, 59, 59, 999);
            conditions.push(`U_GID <= '${endDateTime.toISOString()}'`);
          }
          break;
      }
    }

    if (search) {
      dbReq.input("search", sql.NVarChar(200), search);
      conditions.push(
        buildCharIndexSearchSql([
          "Remark",
          "U_MBLNo",
          "U_HBLNo",
          "U_MRN",
          "U_VN",
          "U_CustCode",
          "U_CustName",
          "U_CRN",
          "U_DON",
          "U_POD",
          "U_CT",
          "DocNum",
          "DocEntry",
        ])
      );
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    const result = await dbReq.query(query);

    return Response.json(result.recordset);
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
