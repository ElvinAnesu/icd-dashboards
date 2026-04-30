"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  type TooltipItem,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import type { TrendFilterType } from "@/app/components/icd-ops/ReceivingVsExitTrendChart";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

type SizeRow = {
  DocEntry?: number;
  LineId?: number;
  U_size1?: string | null;
};

function aggregateBySize(rows: SizeRow[]): { labels: string[]; counts: number[] } {
  const map = new Map<string, number>();
  for (const row of rows) {
    const raw = String(row.U_size1 ?? "").trim();
    const key = raw.length > 0 ? raw : "(unspecified)";
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  const entries = [...map.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0], undefined, { sensitivity: "base" })
  );
  return {
    labels: entries.map(([k]) => k),
    counts: entries.map(([, v]) => v),
  };
}

type Props = {
  filterType: TrendFilterType;
  startDate?: Date;
  endDate?: Date;
};

export default function ReceivedContainersBySizeChart({
  filterType,
  startDate,
  endDate,
}: Props) {
  const [rows, setRows] = useState<SizeRow[] | null>(null);
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
        const res = await fetch(
          `/api/containers/received/size?${params.toString()}`
        );
        const json = await res.json();
        if (!res.ok) {
          throw new Error(
            typeof json?.error === "string" ? json.error : "Request failed"
          );
        }
        if (!Array.isArray(json)) {
          throw new Error("Unexpected response");
        }
        if (!cancelled) setRows(json as SizeRow[]);
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

  const { labels, counts, total } = useMemo(() => {
    const list = rows ?? [];
    const agg = aggregateBySize(list);
    const sum = agg.counts.reduce((a, b) => a + b, 0);
    return { labels: agg.labels, counts: agg.counts, total: sum };
  }, [rows]);

  const data = useMemo(
    () => ({
      labels,
      datasets: [
        {
          label: "Containers",
          data: counts,
          backgroundColor: "rgba(59, 130, 246, 0.7)",
          borderColor: "rgba(37, 99, 235, 1)",
          borderWidth: 1,
          borderRadius: 4,
        },
      ],
    }),
    [labels, counts]
  );

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            label: (tooltipItem: TooltipItem<"bar">) => {
              const y = tooltipItem.parsed.y;
              if (y == null) return "";
              const pct =
                total <= 0 ? 0 : Math.round((y / total) * 100);
              return ` ${y} (${pct}% of rows)`;
            },
          },
        },
      },
      scales: {
        x: {
          title: {
            display: true,
            text: "Container size",
            color: "#64748b",
            font: { size: 12 },
          },
          ticks: {
            color: "#64748b",
            maxRotation: 45,
            minRotation: 0,
            autoSkip: false,
          },
          grid: { display: false },
        },
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Number of containers",
            color: "#64748b",
            font: { size: 12 },
          },
          ticks: {
            color: "#64748b",
            precision: 0,
          },
          grid: { color: "rgba(148, 163, 184, 0.25)" },
        },
      },
    }),
    [total]
  );

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900 mb-4">
        Received containers by size
      </h2>
      {error && (
        <p className="text-sm text-red-600 mb-2">{error}</p>
      )}
      <div className="relative min-h-[14rem] h-72 w-full">
        {loading ? (
          <div className="flex h-full items-center justify-center text-slate-400 text-sm">
            Loading…
          </div>
        ) : total <= 0 ? (
          <div className="flex h-full items-center justify-center text-center text-slate-400 text-sm px-4">
            No container size rows for this period.
          </div>
        ) : (
          <Bar data={data} options={options} />
        )}
      </div>
      {!loading && total > 0 && (
        <p className="text-xs text-slate-400 mt-3 border-t border-slate-100 pt-3">
          Unique sizes: {labels.length} · Total lines: {total}
        </p>
      )}
    </div>
  );
}
