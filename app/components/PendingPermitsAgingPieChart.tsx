"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  PieController,
  type TooltipItem,
} from "chart.js";
import { Pie } from "react-chartjs-2";
import type { TrendFilterType } from "@/app/components/ReceivingVsExitTrendChart";
import { parseSapDateWithTime } from "@/lib/permitTimestamps";

ChartJS.register(ArcElement, Tooltip, Legend, PieController);

type PermitRow = {
  U_DocDate?: string | null;
  U_ETime?: number | null;
};

const LABELS = [
  "< 12 hrs waiting since creation",
  "12–24 hrs waiting since creation",
  "> 24 hrs waiting since creation (critical)",
] as const;

function hoursWaitingSinceCreation(created: Date, now: Date): number {
  return (now.getTime() - created.getTime()) / (1000 * 60 * 60);
}

function bucketPendingHours(rows: PermitRow[]): {
  under12: number;
  h12to24: number;
  over24: number;
  skipped: number;
} {
  const now = new Date();
  let under12 = 0;
  let h12to24 = 0;
  let over24 = 0;
  let skipped = 0;

  for (const row of rows) {
    const created = parseSapDateWithTime(row.U_DocDate, row.U_ETime);
    if (!created) {
      skipped++;
      continue;
    }
    const h = hoursWaitingSinceCreation(created, now);
    if (!Number.isFinite(h)) {
      skipped++;
      continue;
    }
    if (h < 0) {
      skipped++;
      continue;
    }
    if (h < 12) under12++;
    else if (h <= 24) h12to24++;
    else over24++;
  }

  return { under12, h12to24, over24, skipped };
}

type Props = {
  filterType: TrendFilterType;
  startDate?: Date;
  endDate?: Date;
};

export default function PendingPermitsAgingPieChart({
  filterType,
  startDate,
  endDate,
}: Props) {
  const [rows, setRows] = useState<PermitRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const params = new URLSearchParams();
    params.append("filterType", filterType);
    if (filterType === "custom") {
      if (startDate) {
        params.append("startDate", startDate.toISOString());
      }
      if (endDate) {
        params.append("endDate", endDate.toISOString());
      }
    }

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/permits/pending?${params.toString()}`);
        const json = await res.json();
        if (!res.ok) {
          throw new Error(
            typeof json?.error === "string" ? json.error : "Request failed"
          );
        }
        if (!Array.isArray(json)) {
          throw new Error("Unexpected response");
        }
        if (!cancelled) setRows(json as PermitRow[]);
      } catch (e) {
        if (!cancelled) {
          setRows(null);
          setError(e instanceof Error ? e.message : "Failed to load");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [filterType, startDate, endDate]);

  const { values, total, classifiedTotal, skipped } = useMemo(() => {
    const list = rows ?? [];
    const b = bucketPendingHours(list);
    const vals = [b.under12, b.h12to24, b.over24];
    const classified = vals.reduce((a, x) => a + x, 0);
    const totalRows = list.length;
    return {
      values: vals,
      total: totalRows,
      classifiedTotal: classified,
      skipped: b.skipped,
    };
  }, [rows]);

  const data = useMemo(
    () => ({
      labels: [...LABELS],
      datasets: [
        {
          data: values,
          backgroundColor: ["#22c55e", "#f59e0b", "#ef4444"],
          borderColor: "#ffffff",
          borderWidth: 2,
          hoverBackgroundColor: ["#16a34a", "#d97706", "#dc2626"],
        },
      ],
    }),
    [values]
  );

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: "bottom" as const,
          labels: {
            color: "#475569",
            padding: 12,
            font: { size: 11 },
            usePointStyle: true,
            pointStyle: "circle",
          },
        },
        tooltip: {
          callbacks: {
            label: (tooltipItem: TooltipItem<"pie">) => {
              const raw = tooltipItem.raw;
              const n =
                typeof raw === "number"
                  ? raw
                  : typeof raw === "string"
                    ? Number(raw)
                    : 0;
              if (!Number.isFinite(n)) return "";
              const pct =
                classifiedTotal <= 0
                  ? 0
                  : Math.round((n / classifiedTotal) * 100);
              return ` ${tooltipItem.label ?? ""}: ${n} (${pct}%)`;
            },
          },
        },
      },
    }),
    [classifiedTotal]
  );

  const showPie =
    !loading && !error && classifiedTotal > 0;

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900 mb-4">
        Permit Aging
      </h2>
      
      {error && (
        <p className="text-sm text-red-600 mb-2">{error}</p>
      )}
      <div className="relative h-56 max-w-md mx-auto">
        {loading ? (
          <div className="flex h-full items-center justify-center text-slate-400 text-sm">
            Loading…
          </div>
        ) : !showPie ? (
          <div className="flex h-full items-center justify-center text-center text-slate-400 text-sm px-4">
            {total === 0
              ? "No pending permits in this period."
              : "No permits with a parseable creation time to chart."}
          </div>
        ) : (
          <Pie data={data} options={options} />
        )}
      </div>
      {!loading && (
        <p className="text-center text-xs text-slate-400 mt-2">
          Pending permits:{" "}
          <span className="font-medium text-slate-600">{total}</span>
          {skipped > 0 && (
            <>
              {" "}
              · Excluded (time parse):{" "}
              <span className="font-medium text-slate-600">{skipped}</span>
            </>
          )}
        </p>
      )}
    </div>
  );
}
