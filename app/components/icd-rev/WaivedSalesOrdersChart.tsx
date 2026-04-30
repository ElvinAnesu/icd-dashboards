"use client";

import {
  BubbleController,
  Chart as ChartJS,
  Legend,
  LinearScale,
  PointElement,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from "chart.js";
import { useEffect, useMemo, useState } from "react";
import { Bubble } from "react-chartjs-2";
import { convertTzsMillions, formatAxisTick, type CashflowCurrency } from "@/app/components/icd-rev/currency";
import type { WaiversResponse } from "@/types/waivers-api";

ChartJS.register(BubbleController, PointElement, LinearScale, Tooltip, Legend);

const BUBBLE_FILL = [
  "rgba(244, 63, 94, 0.55)",
  "rgba(220, 38, 38, 0.65)",
  "rgba(249, 115, 22, 0.55)",
  "rgba(251, 146, 60, 0.5)",
  "rgba(59, 130, 246, 0.55)",
  "rgba(34, 197, 94, 0.5)",
  "rgba(168, 85, 247, 0.5)",
  "rgba(236, 72, 153, 0.5)",
];

const BUBBLE_BORDER = [
  "rgba(244, 63, 94, 0.9)",
  "rgba(185, 28, 28, 0.95)",
  "rgba(234, 88, 12, 0.9)",
  "rgba(234, 88, 12, 0.85)",
  "rgba(37, 99, 235, 0.9)",
  "rgba(22, 101, 52, 0.9)",
  "rgba(107, 33, 168, 0.9)",
  "rgba(190, 24, 93, 0.9)",
];

const TZ_TO_MILLIONS = 1_000_000;

function countToRadius(count: number, counts: number[]): number {
  if (counts.length === 0) {
    return 18;
  }
  const minC = Math.min(...counts);
  const maxC = Math.max(...counts);
  if (maxC <= minC) {
    return 22;
  }
  const t = (count - minC) / (maxC - minC);
  return 12 + t * 26;
}

type DateFilterOption = "today" | "last7days" | "last3months" | "custom";

type Props = {
  currency: CashflowCurrency;
  filterType: DateFilterOption;
  startDate?: Date;
  endDate?: Date;
};

export default function WaivedSalesOrdersChart({
  currency,
  filterType,
  startDate,
  endDate,
}: Props) {
  const [payload, setPayload] = useState<WaiversResponse | null>(null);
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
        const response = await fetch(`/api/sales/waivers?${params.toString()}`);
        const json: unknown = await response.json();

        if (!response.ok) {
          const msg =
            typeof json === "object" && json !== null && "error" in json
              ? String((json as { error: unknown }).error)
              : `Request failed (${response.status})`;
          throw new Error(msg);
        }

        if (!cancelled) {
          setPayload(json as WaiversResponse);
        }
      } catch (e) {
        if (!cancelled) {
          setPayload(null);
          setError(e instanceof Error ? e.message : "Failed to load waivers");
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

  const { chartData, meta } = useMemo(() => {
    const rows = payload?.rows ?? [];
    const categories = rows.map((r) => r.waiverReason.trim() || "—");
    const counts = rows.map((r) => r.timesGiven);
    /** API amount is raw TZS; chart Y uses millions then currency conversion. */
    const valueMillions = rows.map((r) => r.totalWaivedAmount / TZ_TO_MILLIONS);
    const valuesConverted = valueMillions.map((m) => convertTzsMillions(m, currency));

    const data: ChartData<"bubble"> = {
      datasets: [
        {
          label: "Waived by reason",
          data: rows.map((row, i) => ({
            x: i,
            y: valuesConverted[i],
            r: countToRadius(row.timesGiven, counts),
          })),
          backgroundColor: rows.map((_, i) => BUBBLE_FILL[i % BUBBLE_FILL.length]),
          borderColor: rows.map((_, i) => BUBBLE_BORDER[i % BUBBLE_BORDER.length]),
          borderWidth: 1.5,
        },
      ],
    };

    return {
      chartData: data,
      meta: { categories, counts, valuesConverted },
    };
  }, [payload, currency]);

  const options = useMemo<ChartOptions<"bubble">>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: "rgba(15, 23, 42, 0.92)",
          titleColor: "#f8fafc",
          bodyColor: "#e2e8f0",
          padding: 12,
          cornerRadius: 8,
          displayColors: false,
          callbacks: {
            title: (items) => {
              const i = items[0]?.dataIndex ?? 0;
              return meta.categories[i] ?? "";
            },
            label: (ctx) => {
              const i = ctx.dataIndex;
              const valM = meta.valuesConverted[i] ?? 0;
              const cnt = meta.counts[i] ?? 0;
              const avg = cnt > 0 ? valM / cnt : 0;
              return [
                `Waived value: ${formatAxisTick(valM, currency)}`,
                `Times given: ${String(cnt)}`,
                `Avg per line: ${formatAxisTick(avg, currency)}`,
              ];
            },
          },
        },
      },
      layout: {
        padding: { top: 12, bottom: 8, left: 4, right: 12 },
      },
      scales: {
        x: {
          type: "linear",
          min: -0.5,
          max: Math.max(0, meta.categories.length - 0.5),
          ticks: {
            color: "#64748b",
            maxRotation: 45,
            minRotation: 0,
            stepSize: 1,
            callback(value) {
              const i = Number(value);
              if (!Number.isInteger(i) || i < 0 || i >= meta.categories.length) {
                return "";
              }
              const full = meta.categories[i];
              return full.length > 18 ? `${full.slice(0, 16)}…` : full;
            },
          },
          grid: { color: "rgba(148, 163, 184, 0.15)" },
        },
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: `Waived value (${currency} M)`,
            color: "#64748b",
            font: { size: 11 },
          },
          ticks: {
            color: "#64748b",
            callback: (value) => formatAxisTick(Number(value), currency),
          },
          grid: { color: "rgba(148, 163, 184, 0.2)" },
        },
      },
    }),
    [currency, meta]
  );

  const hasData = (payload?.rows.length ?? 0) > 0;

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900 mb-1">Waived sales orders</h2>
     
      <div className="relative h-72 w-full flex items-center justify-center">
        {loading ? (
          <p className="text-sm text-slate-500">Loading waivers…</p>
        ) : error ? (
          <p className="text-sm text-red-600 text-center px-4">{error}</p>
        ) : hasData ? (
          <Bubble data={chartData} options={options} />
        ) : (
          <p className="text-sm text-slate-500">No waiver data in this period.</p>
        )}
      </div>
    </div>
  );
}
