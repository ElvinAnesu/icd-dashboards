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

    /*
     * Container receipt counts per manifest (U_MRN):
     * - Lines live on [@BIS_CONT1], linked to [@BIS_OCONT] via DocEntry.
     * - Received: COUNT/SUM of lines where U_IN = 'Y'; pending where U_IN = 'N'.
     */
    let query = `SELECT 
                  H.U_MRN AS MRN,
                  H.U_VN AS VESSEL,
                  H.U_Voyage AS VOYAGE,
                  H.U_NoOfBL AS NO_OF_BL,
                  H.U_NoOfCN AS CONTAINERS,
                  H.U_TO AS OPERATOR,
                  ISNULL(CC.RECEIVED_CONTAINERS, 0) AS RECEIVED_CONTAINERS,
                  ISNULL(CC.PENDING_CONTAINERS, 0) AS PENDING_CONTAINERS
                  FROM [@BIS_OMAINF] H
                  LEFT JOIN (
                    SELECT
                      C.U_MRN,
                      SUM(CASE WHEN L.U_IN = 'Y' THEN 1 ELSE 0 END) AS RECEIVED_CONTAINERS,
                      SUM(CASE WHEN L.U_IN = 'N' THEN 1 ELSE 0 END) AS PENDING_CONTAINERS
                    FROM [@BIS_OCONT] C
                    INNER JOIN [@BIS_CONT1] L ON L.DocEntry = C.DocEntry
                    GROUP BY C.U_MRN
                  ) CC ON CC.U_MRN = H.U_MRN`;
    const conditions: string[] = [];

    if (filterType) {
      const now = new Date();
      let filterStartDate: Date | null = null;

      switch (filterType) {
        case "today":
          filterStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          conditions.push(`H.CreateDate >= '${filterStartDate.toISOString()}'`);
          break;
        case "last7days":
          filterStartDate = new Date(now);
          filterStartDate.setDate(now.getDate() - 7);
          conditions.push(`H.CreateDate >= '${filterStartDate.toISOString()}'`);
          break;
        case "last3months":
          filterStartDate = new Date(now);
          filterStartDate.setMonth(now.getMonth() - 3);
          conditions.push(`H.CreateDate >= '${filterStartDate.toISOString()}'`);
          break;
        case "custom":
          if (startDate) {
            conditions.push(`H.CreateDate >= '${startDate}'`);
          }
          if (endDate) {
            const endDateTime = new Date(endDate);
            endDateTime.setHours(23, 59, 59, 999);
            conditions.push(`H.CreateDate <= '${endDateTime.toISOString()}'`);
          }
          break;
      }
    }

    if (search) {
      dbReq.input("search", sql.NVarChar(200), search);
      conditions.push(
        buildCharIndexSearchSql([
          "H.U_MRN",
          "H.U_VN",
          "H.U_Voyage",
          "H.U_NoOfBL",
          "H.U_NoOfCN",
          "H.U_TO",
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
