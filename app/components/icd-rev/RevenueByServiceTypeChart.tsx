"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";
import { formatAxisTick, type CashflowCurrency } from "@/app/components/icd-rev/currency";
import type { ServiceTypeResponse } from "@/types/service-type-api";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  BarController,
  Tooltip,
  Legend
);

type DateFilterOption = "today" | "last7days" | "last3months" | "custom";

type Props = {
  currency: CashflowCurrency;
  filterType: DateFilterOption;
  startDate?: Date;
  endDate?: Date;
};

/** Line/border colors — extended for many ItemCode series from API. */
const SERIES_PALETTE = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
  "#f97316",
  "#6366f1",
  "#14b8a6",
  "#a855f7",
  "#eab308",
  "#0ea5e9",
  "#f43f5e",
];

const TZ_TO_MILLIONS = 1_000_000;

function toMillions(rawTzs: number): number {
  return rawTzs / TZ_TO_MILLIONS;
}

export default function RevenueByServiceTypeChart({
  currency,
  filterType,
  startDate,
  endDate,
}: Props) {
  const [payload, setPayload] = useState<ServiceTypeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set("filterType", filterType);
      if (startDate) {
        params.set("startDate", startDate.toISOString().split("T")[0]);
      }
      if (endDate) {
        params.set("endDate", endDate.toISOString().split("T")[0]);
      }

      try {
        const response = await fetch(`/api/sales/service-type?${params.toString()}`);
        const json: unknown = await response.json();

        if (!response.ok) {
          const msg =
            typeof json === "object" && json !== null && "error" in json
              ? String((json as { error: unknown }).error)
              : `Request failed (${response.status})`;
          throw new Error(msg);
        }

        const body = json as ServiceTypeResponse;
        if (!cancelled) {
          setPayload(body);
        }
      } catch (e) {
        if (!cancelled) {
          setPayload(null);
          setError(e instanceof Error ? e.message : "Failed to load revenue by service");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [filterType, startDate, endDate]);

  const barChartData = useMemo((): ChartData<"bar"> | null => {
    if (!payload || payload.mode !== "bar") {
      return null;
    }
    const labels = payload.rows.map((r) => r.dscription?.trim() || r.itemCode);
    const data = payload.rows.map((r) => toMillions(r.revenue));
    return {
      labels,
      datasets: [
        {
          label: "Revenue",
          data,
          backgroundColor: labels.map((_, i) => SERIES_PALETTE[i % SERIES_PALETTE.length]),
          borderColor: labels.map((_, i) => SERIES_PALETTE[i % SERIES_PALETTE.length]),
          borderWidth: 1,
        },
      ],
    };
  }, [payload]);

  const lineChartData = useMemo((): ChartData<"line"> | null => {
    if (!payload || payload.mode !== "trend") {
      return null;
    }
    return {
      labels: payload.labels,
      datasets: payload.series.map((s, i) => {
        const color = SERIES_PALETTE[i % SERIES_PALETTE.length];
        return {
          label: s.dscription?.trim() || s.itemCode,
          data: s.data.map(toMillions),
          borderColor: color,
          tension: 0.3,
          pointRadius: 3,
          pointHoverRadius: 5,
          fill: false,
        };
      }),
    };
  }, [payload]);

  const showBar = payload?.mode === "bar";
  const title =
    payload?.mode === "trend" ? "Revenue trend by service type" : "Revenue by service type";
 
  const scalesY = useMemo(
    () => ({
      ticks: {
        color: "#64748b",
        callback: (value: number | string) => formatAxisTick(Number(value), currency),
      },
      grid: { color: "#e2e8f0" },
      title: {
        display: true,
        text: `Revenue (${currency} millions)`,
        color: "#64748b",
      },
    }),
    [currency]
  );

  const barOptions: ChartOptions<"bar"> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: "#64748b" },
        },
        y: scalesY,
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            label: (ctx) =>
              `${ctx.label}: ${formatAxisTick(Number(ctx.raw), currency)}`,
          },
        },
      },
    }),
    [currency, scalesY]
  );

  const lineOptions: ChartOptions<"line"> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: "#64748b" },
        },
        y: scalesY,
      },
      plugins: {
        legend: {
          position: "top",
          labels: { color: "#64748b", usePointStyle: true, padding: 16, boxWidth: 8, boxHeight: 8 },
        },
        tooltip: {
          callbacks: {
            label: (ctx) =>
              `${ctx.dataset.label}: ${formatAxisTick(Number(ctx.parsed.y), currency)}`,
          },
        },
      },
    }),
    [currency, scalesY]
  );

  const hasBarData = barChartData && barChartData.labels && barChartData.labels.length > 0;
  const hasLineData =
    lineChartData &&
    lineChartData.labels &&
    lineChartData.labels.length > 0 &&
    lineChartData.datasets &&
    lineChartData.datasets.length > 0;

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900 mb-1">{title}</h2>
      <div className="relative h-72 w-full flex items-center justify-center">
        {loading ? (
          <p className="text-sm text-slate-500">Loading revenue by service…</p>
        ) : error ? (
          <p className="text-sm text-red-600 text-center px-4">{error}</p>
        ) : showBar && barChartData ? (
          hasBarData ? (
            <Bar data={barChartData} options={barOptions} />
          ) : (
            <p className="text-sm text-slate-500">No invoice lines in this period.</p>
          )
        ) : lineChartData ? (
          hasLineData ? (
            <Line data={lineChartData} options={lineOptions} />
          ) : (
            <p className="text-sm text-slate-500">No invoice lines in this period.</p>
          )
        ) : (
          <p className="text-sm text-slate-500">No data.</p>
        )}
      </div>
    </div>
  );
}
