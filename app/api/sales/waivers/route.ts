import sql from "mssql";
import config from "@/lib/dbconfig";
import { NextRequest } from "next/server";
import type { WaiversResponse, WaiversSummaryRow } from "@/types/waivers-api";

/**
 * GET /api/sales/waivers — waiver reasons from sales order lines (RDR1) with ORDR header,
 * filtered by ORDR.DocDate. Same query params as other sales routes (`filterType`, `startDate`, `endDate`).
 */
export async function GET(request: NextRequest) {
  try {
    await sql.connect(config);

    const searchParams = request.nextUrl.searchParams;
    const filterType = searchParams.get("filterType");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const dateConditions = buildOrdrDocDateConditions(filterType, startDate, endDate);
    const dateClause =
      dateConditions.length > 0 ? " AND " + dateConditions.join(" AND ") : "";

    const query = `
      SELECT
        T1.U_Weive AS WaiverReason,
        COUNT(*) AS TimesGiven,
        SUM(ISNULL(T1.U_WaiveAmt, 0)) AS TotalWaivedAmount
      FROM ORDR AS T0
      INNER JOIN RDR1 AS T1 ON T0.DocEntry = T1.DocEntry
      WHERE T1.U_Weive IS NOT NULL
        AND T1.U_Weive <> ''
        AND T1.U_Weive <> 'Select'
        AND T0.CANCELED = 'N'
        ${dateClause}
      GROUP BY T1.U_Weive
      ORDER BY SUM(ISNULL(T1.U_WaiveAmt, 0)) DESC
    `;

    const result = await sql.query(query);
    const rows: WaiversSummaryRow[] = (result.recordset as Record<string, unknown>[]).map(
      (r) => ({
        waiverReason: String(readCol(r, "WaiverReason", "waiverreason") ?? ""),
        timesGiven: Number(readCol(r, "TimesGiven", "timesgiven") ?? 0),
        totalWaivedAmount: Number(readCol(r, "TotalWaivedAmount", "totalwaivedamount") ?? 0),
      })
    );

    const body: WaiversResponse = { rows };
    return Response.json(body);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}

function readCol(row: Record<string, unknown>, ...names: string[]): unknown {
  for (const name of names) {
    if (name in row && row[name] !== undefined && row[name] !== null) {
      return row[name];
    }
    const lower = name.toLowerCase();
    for (const key of Object.keys(row)) {
      if (key.toLowerCase() === lower) {
        return row[key];
      }
    }
  }
  return undefined;
}

function buildOrdrDocDateConditions(
  filterType: string | null,
  startDate: string | null,
  endDate: string | null
): string[] {
  const conditions: string[] = [];
  if (!filterType) {
    return conditions;
  }

  const now = new Date();

  switch (filterType) {
    case "today": {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      conditions.push(`T0.DocDate >= '${start.toISOString()}'`);
      conditions.push(`T0.DocDate <= '${end.toISOString()}'`);
      break;
    }
    case "last7days": {
      const filterStartDate = new Date(now);
      filterStartDate.setDate(now.getDate() - 7);
      conditions.push(`T0.DocDate >= '${filterStartDate.toISOString()}'`);
      break;
    }
    case "last3months": {
      const filterStartDate = new Date(now);
      filterStartDate.setMonth(now.getMonth() - 3);
      conditions.push(`T0.DocDate >= '${filterStartDate.toISOString()}'`);
      break;
    }
    case "custom":
      if (startDate) {
        conditions.push(`T0.DocDate >= '${startDate}'`);
      }
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        conditions.push(`T0.DocDate <= '${endDateTime.toISOString()}'`);
      }
      break;
    default:
      break;
  }

  return conditions;
}
