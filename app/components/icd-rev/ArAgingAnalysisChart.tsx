"use client";

import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from "chart.js";
import { useEffect, useMemo, useState } from "react";
import { Bar } from "react-chartjs-2";
import { convertTzsMillions, formatAxisTick, type CashflowCurrency } from "@/app/components/icd-rev/currency";
import type { ArAgingDetailRow, ArAgingResponse } from "@/types/ar-aging-api";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const BUCKET_KEYS = ["0-30", "31-60", "61-90", "90+"] as const;

const BUCKET_DATASET_META: { key: (typeof BUCKET_KEYS)[number]; label: string; color: string }[] = [
  { key: "0-30", label: "0-30 days", color: "#60a5fa" },
  { key: "31-60", label: "31-60 days", color: "#f59e0b" },
  { key: "61-90", label: "61-90 days", color: "#fb7185" },
  { key: "90+", label: "90+ days", color: "#dc2626" },
];

const TZ_TO_MILLIONS = 1_000_000;

type DateFilterOption = "today" | "last7days" | "last3months" | "custom";

type Props = {
  currency: CashflowCurrency;
  filterType: DateFilterOption;
  startDate?: Date;
  endDate?: Date;
  /** Top customers by total outstanding (API default 12). */
  top?: number;
};

function pivotAgingRows(rows: ArAgingDetailRow[]): {
  labels: string[];
  datasetsValues: Map<(typeof BUCKET_KEYS)[number], number[]>;
} {
  const customerOrder: string[] = [];
  const nameByCode = new Map<string, string>();
  const seen = new Set<string>();

  for (const r of rows) {
    if (!seen.has(r.cardCode)) {
      seen.add(r.cardCode);
      customerOrder.push(r.cardCode);
      nameByCode.set(r.cardCode, r.cardName?.trim() || r.cardCode);
    }
  }

  const labels = customerOrder.map((code) => nameByCode.get(code) ?? code);

  const datasetsValues = new Map<(typeof BUCKET_KEYS)[number], number[]>();
  for (const k of BUCKET_KEYS) {
    datasetsValues.set(
      k,
      customerOrder.map((code) => {
        const row = rows.find((x) => x.cardCode === code && x.agingBucket === k);
        const raw = row?.balanceDue ?? 0;
        return raw / TZ_TO_MILLIONS;
      })
    );
  }

  return { labels, datasetsValues };
}

export default function ArAgingAnalysisChart({
  currency,
  filterType,
  startDate,
  endDate,
  top = 12,
}: Props) {
  const [payload, setPayload] = useState<ArAgingResponse | null>(null);
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
      params.set("top", String(top));

      try {
        const response = await fetch(`/api/sales/aging?${params.toString()}`);
        const json: unknown = await response.json();

        if (!response.ok) {
          const msg =
            typeof json === "object" && json !== null && "error" in json
              ? String((json as { error: unknown }).error)
              : `Request failed (${response.status})`;
          throw new Error(msg);
        }

        if (!cancelled) {
          setPayload(json as ArAgingResponse);
        }
      } catch (e) {
        if (!cancelled) {
          setPayload(null);
          setError(e instanceof Error ? e.message : "Failed to load AR aging");
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
  }, [filterType, startDate, endDate, top]);

  const chartData = useMemo<ChartData<"bar"> | null>(() => {
    if (!payload?.rows?.length) {
      return null;
    }
    const { labels, datasetsValues } = pivotAgingRows(payload.rows);

    return {
      labels,
      datasets: BUCKET_DATASET_META.map((meta) => ({
        label: meta.label,
        data: (datasetsValues.get(meta.key) ?? []).map((v) => convertTzsMillions(v, currency)),
        backgroundColor: meta.color,
        stack: "aging",
      })),
    };
  }, [payload, currency]);

  const options = useMemo<ChartOptions<"bar">>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top",
          labels: { color: "#64748b", usePointStyle: true, padding: 14, boxWidth: 8, boxHeight: 8 },
        },
      },
      scales: {
        x: { stacked: true, ticks: { color: "#64748b" }, grid: { display: false } },
        y: {
          stacked: true,
          beginAtZero: true,
          ticks: { color: "#64748b", callback: (value) => formatAxisTick(value, currency) },
          grid: { color: "rgba(148, 163, 184, 0.2)" },
        },
      },
    }),
    [currency]
  );

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900 mb-1">AR aging analysis</h2>
      <div className="relative h-72 w-full flex items-center justify-center">
        {loading ? (
          <p className="text-sm text-slate-500">Loading AR aging…</p>
        ) : error ? (
          <p className="text-sm text-red-600 text-center px-4">{error}</p>
        ) : chartData ? (
          <Bar data={chartData} options={options} />
        ) : (
          <p className="text-sm text-slate-500">No open AR in this period.</p>
        )}
      </div>
    </div>
  );
}
