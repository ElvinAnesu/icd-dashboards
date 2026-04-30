import sql from "mssql";
import config from "@/lib/dbconfig";
import { NextRequest } from "next/server";
import type { ArAgingDetailRow, ArAgingResponse } from "@/types/ar-aging-api";

/**
 * GET /api/sales/aging — open AR (DocStatus = O) by customer and aging bucket, filtered by DocDate.
 * Returns only the top `top` customers by total outstanding balance in the filtered period.
 * Query params: same date filter as other sales routes (`filterType`, `startDate`, `endDate`) plus optional `top` (default 12, max 50).
 */
export async function GET(request: NextRequest) {
  try {
    await sql.connect(config);

    const searchParams = request.nextUrl.searchParams;
    const filterType = searchParams.get("filterType");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const rawTop = searchParams.get("top");
    const parsed = rawTop ? parseInt(rawTop, 10) : NaN;
    const topN = Number.isFinite(parsed) ? Math.min(50, Math.max(1, parsed)) : 12;

    const dateConditions = buildOinvDocDateConditions(filterType, startDate, endDate);
    const dateClause =
      dateConditions.length > 0 ? " AND " + dateConditions.join(" AND ") : "";

    const agingCase = `
      CASE
        WHEN DATEDIFF(DAY, CAST(T0.DocDueDate AS DATE), CAST(GETDATE() AS DATE)) <= 30 THEN '0-30'
        WHEN DATEDIFF(DAY, CAST(T0.DocDueDate AS DATE), CAST(GETDATE() AS DATE)) <= 60 THEN '31-60'
        WHEN DATEDIFF(DAY, CAST(T0.DocDueDate AS DATE), CAST(GETDATE() AS DATE)) <= 90 THEN '61-90'
        ELSE '90+'
      END`;

    const query = `
      WITH Agg AS (
        SELECT
          T0.CardCode AS CardCode,
          T0.CardName AS CardName,
          ${agingCase} AS AgingBucket,
          SUM(T0.DocTotal - ISNULL(T0.PaidToDate, 0)) AS BalanceDue
        FROM OINV AS T0
        WHERE T0.DocStatus = 'O'
          AND T0.CANCELED = 'N'
          ${dateClause}
        GROUP BY T0.CardCode, T0.CardName, ${agingCase}
        HAVING SUM(T0.DocTotal - ISNULL(T0.PaidToDate, 0)) <> 0
      ),
      Totals AS (
        SELECT CardCode, MAX(CardName) AS CardName, SUM(BalanceDue) AS TotalDue
        FROM Agg
        GROUP BY CardCode
      ),
      Ranked AS (
        SELECT CardCode, CardName, TotalDue,
          ROW_NUMBER() OVER (ORDER BY TotalDue DESC, CardName ASC) AS rn
        FROM Totals
      )
      SELECT A.CardCode, A.CardName, A.AgingBucket, A.BalanceDue
      FROM Agg AS A
      INNER JOIN Ranked AS R ON A.CardCode = R.CardCode AND R.rn <= ${topN}
      ORDER BY R.rn ASC, A.CardName ASC,
        CASE A.AgingBucket WHEN '0-30' THEN 1 WHEN '31-60' THEN 2 WHEN '61-90' THEN 3 ELSE 4 END
    `;

    const result = await sql.query(query);
    const rows: ArAgingDetailRow[] = (result.recordset as Record<string, unknown>[]).map(
      (r) => ({
        cardCode: String(readCol(r, "CardCode", "cardcode") ?? ""),
        cardName: String(readCol(r, "CardName", "cardname") ?? ""),
        agingBucket: String(readCol(r, "AgingBucket", "agingbucket") ?? ""),
        balanceDue: Number(readCol(r, "BalanceDue", "balancedue") ?? 0),
      })
    );

    const body: ArAgingResponse = { rows, top: topN };
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

function buildOinvDocDateConditions(
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
