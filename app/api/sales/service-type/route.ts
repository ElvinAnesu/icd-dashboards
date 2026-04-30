import sql from "mssql";
import { format } from "date-fns";
import config from "@/lib/dbconfig";
import {
  resolveChartModeFromQueryParams,
  useWeeklyTrendBuckets,
} from "@/lib/revenue-service-chart-mode";
import { bundleServiceDescription, bundleServiceKey } from "@/lib/service-bundle";
import { NextRequest } from "next/server";
import type {
  ServiceTypeBarResponse,
  ServiceTypeTrendResponse,
} from "@/types/service-type-api";

const MAX_BAR_SERIES = 25;
const MAX_LINE_SERIES = 15;

/**
 * GET /api/sales/service-type — revenue by service (INV1) joined to OINV.
 * Groups by ItemCode in SQL, then bundles variants (20FT/40FT/GOODS etc.) by description for display.
 * Bar snapshot vs trend series aligned to DocDate filter (same params as other sales routes).
 */
export async function GET(request: NextRequest) {
  try {
    await sql.connect(config);

    const searchParams = request.nextUrl.searchParams;
    const filterType = searchParams.get("filterType");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const dateConditions = buildDocDateConditions(filterType, startDate, endDate);
    const whereClause =
      "WHERE T0.CANCELED = 'N'" +
      (dateConditions.length > 0 ? " AND " + dateConditions.join(" AND ") : "");

    const mode = resolveChartModeFromQueryParams(filterType, startDate, endDate);

    if (mode === "bar") {
      const query = `
        SELECT
          T1.ItemCode AS ItemCode,
          MAX(T1.Dscription) AS Dscription,
          SUM(T1.LineTotal) AS Revenue
        FROM OINV AS T0
        INNER JOIN INV1 AS T1 ON T0.DocEntry = T1.DocEntry
        ${whereClause}
        GROUP BY T1.ItemCode
        ORDER BY SUM(T1.LineTotal) DESC
      `;

      const result = await sql.query(query);
      const rows = (result.recordset as Record<string, unknown>[]).map((r) => ({
        itemCode: String(readCol(r, "ItemCode", "itemcode") ?? ""),
        dscription: String(readCol(r, "Dscription", "dscription") ?? ""),
        revenue: Number(readCol(r, "Revenue", "revenue") ?? 0),
      }));

      const merged = mergeBarRowsByBundle(rows);
      const body: ServiceTypeBarResponse = { mode: "bar", rows: merged };
      return Response.json(body);
    }

    const bucketExpr = useWeeklyTrendBuckets(filterType, startDate, endDate)
      ? "DATEADD(WEEK, DATEDIFF(WEEK, 0, CAST(T0.DocDate AS DATE)), 0)"
      : "CAST(T0.DocDate AS DATE)";

    const query = `
      SELECT
        ${bucketExpr} AS BucketStart,
        T1.ItemCode AS ItemCode,
        MAX(T1.Dscription) AS Dscription,
        SUM(T1.LineTotal) AS Revenue
      FROM OINV AS T0
      INNER JOIN INV1 AS T1 ON T0.DocEntry = T1.DocEntry
      ${whereClause}
      GROUP BY ${bucketExpr}, T1.ItemCode
      ORDER BY ${bucketExpr}, T1.ItemCode
    `;

    const result = await sql.query(query);
    const raw = (result.recordset as Record<string, unknown>[]).map((r) => ({
      bucketStart: readCol(r, "BucketStart", "bucketstart"),
      itemCode: String(readCol(r, "ItemCode", "itemcode") ?? ""),
      dscription: String(readCol(r, "Dscription", "dscription") ?? ""),
      revenue: Number(readCol(r, "Revenue", "revenue") ?? 0),
    }));

    const trend = pivotTrend(raw);
    const body: ServiceTypeTrendResponse = trend;
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

function toIsoDate(value: unknown): string {
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) {
    return "";
  }
  return d.toISOString().slice(0, 10);
}

function mergeBarRowsByBundle(
  rows: { itemCode: string; dscription: string; revenue: number }[]
): { itemCode: string; dscription: string; revenue: number }[] {
  const map = new Map<string, { dscription: string; revenue: number; itemCode: string }>();

  for (const row of rows) {
    const baseLabel = bundleServiceDescription(row.dscription || row.itemCode);
    const key = bundleServiceKey(row.dscription || row.itemCode);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        dscription: baseLabel,
        revenue: row.revenue,
        itemCode: row.itemCode,
      });
    } else {
      existing.revenue += row.revenue;
    }
  }

  return [...map.values()]
    .filter((r) => r.revenue !== 0)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, MAX_BAR_SERIES)
    .map(({ itemCode, dscription, revenue }) => ({ itemCode, dscription, revenue }));
}

function pivotTrend(
  raw: { bucketStart: unknown; itemCode: string; dscription: string; revenue: number }[]
): ServiceTypeTrendResponse {
  const bucketKeys = [...new Set(raw.map((r) => toIsoDate(r.bucketStart)))].filter(Boolean).sort();

  const labels = bucketKeys.map((k) => format(new Date(k + "T12:00:00"), "MMM d"));

  const byBundle = new Map<string, { dscription: string; byBucket: Map<string, number> }>();

  for (const row of raw) {
    const k = toIsoDate(row.bucketStart);
    if (!k) {
      continue;
    }
    const label = bundleServiceDescription(row.dscription || row.itemCode);
    const bundleKey = bundleServiceKey(row.dscription || row.itemCode);
    let entry = byBundle.get(bundleKey);
    if (!entry) {
      entry = { dscription: label, byBucket: new Map() };
      byBundle.set(bundleKey, entry);
    }
    entry.byBucket.set(k, (entry.byBucket.get(k) ?? 0) + row.revenue);
  }

  const seriesFull = [...byBundle.entries()]
    .map(([key, { dscription, byBucket }]) => ({
      itemCode: key,
      dscription: dscription || key,
      data: bucketKeys.map((bk) => byBucket.get(bk) ?? 0),
      _total: bucketKeys.reduce((s, bk) => s + (byBucket.get(bk) ?? 0), 0),
    }))
    .filter((s) => s._total !== 0);

  seriesFull.sort((a, b) => b._total - a._total);

  const series = seriesFull.slice(0, MAX_LINE_SERIES).map(({ itemCode, dscription, data }) => ({
    itemCode,
    dscription,
    data,
  }));

  return {
    mode: "trend",
    labels,
    series,
  };
}

function buildDocDateConditions(
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
