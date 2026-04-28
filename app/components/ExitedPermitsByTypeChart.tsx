"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  type TooltipItem,
} from "chart.js";
import { Doughnut } from "react-chartjs-2";
import type { TrendFilterType } from "@/app/components/ReceivingVsExitTrendChart";

ChartJS.register(ArcElement, Tooltip, Legend);

type PermitRow = {
  U_Type?: string | null;
};

const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
  "#f43f5e",
  "#6366f1",
  "#14b8a6",
];

function aggregateByType(rows: PermitRow[]): { labels: string[]; values: number[] } {
  const map = new Map<string, number>();
  for (const row of rows) {
    const raw = String(row.U_Type ?? "").trim();
    const key = raw.length > 0 ? raw : "(unspecified)";
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  const entries = [...map.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0], undefined, { sensitivity: "base" })
  );
  return {
    labels: entries.map(([k]) => k),
    values: entries.map(([, v]) => v),
  };
}

type Props = {
  filterType: TrendFilterType;
  startDate?: Date;
  endDate?: Date;
};

export default function ExitedPermitsByTypeChart({
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
        const res = await fetch(`/api/permits/exited?${params.toString()}`);
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

  const { labels, values, total } = useMemo(() => {
    const list = rows ?? [];
    const agg = aggregateByType(list);
    const sum = agg.values.reduce((a, b) => a + b, 0);
    return { labels: agg.labels, values: agg.values, total: sum };
  }, [rows]);

  const backgroundColor = useMemo(
    () => labels.map((_, i) => COLORS[i % COLORS.length]),
    [labels]
  );

  const hoverBackgroundColor = useMemo(
    () => labels.map((_, i) => COLORS[i % COLORS.length]),
    [labels]
  );

  const data = useMemo(
    () => ({
      labels,
      datasets: [
        {
          data: values,
          backgroundColor,
          borderColor: "#ffffff",
          borderWidth: 2,
          hoverBackgroundColor,
        },
      ],
    }),
    [labels, values, backgroundColor, hoverBackgroundColor]
  );

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      cutout: "58%",
      plugins: {
        legend: {
          display: true,
          position: "bottom" as const,
          labels: {
            color: "#475569",
            padding: 14,
            usePointStyle: true,
            pointStyle: "circle",
          },
        },
        tooltip: {
          callbacks: {
            label: (tooltipItem: TooltipItem<"doughnut">) => {
              const raw = tooltipItem.raw;
              const n =
                typeof raw === "number"
                  ? raw
                  : typeof raw === "string"
                    ? Number(raw)
                    : 0;
              if (!Number.isFinite(n)) return "";
              const pct =
                total <= 0 ? 0 : Math.round((n / total) * 100);
              return ` ${tooltipItem.label ?? ""}: ${n} (${pct}%)`;
            },
          },
        },
      },
    }),
    [total]
  );

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900 mb-4">
        Exited permits type
      </h2>
      {error && (
        <p className="text-sm text-red-600 mb-2">{error}</p>
      )}
      <div className="relative min-h-[14rem] h-64 max-w-md mx-auto">
        {loading ? (
          <div className="flex h-full items-center justify-center text-slate-400 text-sm">
            Loading…
          </div>
        ) : total <= 0 ? (
          <div className="flex h-full items-center justify-center text-center text-slate-400 text-sm px-4">
            No exited permits in this period.
          </div>
        ) : (
          <Doughnut data={data} options={options} />
        )}
      </div>
      {!loading && total > 0 && (
        <p className="text-center text-xs text-slate-400 mt-2">
          Total exited permits:{" "}
          <span className="font-medium text-slate-600">{total}</span>
        </p>
      )}
    </div>
  );
}
