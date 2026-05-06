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

type Props = {
  filterType: TrendFilterType;
  startDate?: Date;
  endDate?: Date;
  refreshSignal?: number;
};

type DistributionResponse = {
  labels?: unknown;
  counts?: unknown;
  sampleCount?: unknown;
  averageHours?: unknown;
};

export default function PermitTurnaroundHistogram({
  filterType,
  startDate,
  endDate,
  refreshSignal = 0,
}: Props) {
  const [labels, setLabels] = useState<string[]>([]);
  const [counts, setCounts] = useState<number[]>([]);
  const [sampleCount, setSampleCount] = useState(0);
  const [averageHours, setAverageHours] = useState<number | null>(null);
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

    async function loadDistribution() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/permits/avg-turnaround/distribution?${params.toString()}`
        );
        const json = (await res.json()) as DistributionResponse & { error?: unknown };
        if (!res.ok) {
          throw new Error(
            typeof json?.error === "string" ? json.error : "Request failed"
          );
        }
        const nextLabels = Array.isArray(json.labels)
          ? json.labels.filter((x): x is string => typeof x === "string")
          : [];
        const nextCounts = Array.isArray(json.counts)
          ? json.counts.filter((x): x is number => typeof x === "number")
          : [];
        const nextSampleCount =
          typeof json.sampleCount === "number" ? json.sampleCount : 0;
        const nextAverageHours =
          typeof json.averageHours === "number" && Number.isFinite(json.averageHours)
            ? json.averageHours
            : null;

        if (!cancelled) {
          setLabels(nextLabels);
          setCounts(nextCounts);
          setSampleCount(nextSampleCount);
          setAverageHours(nextAverageHours);
        }
      } catch (e) {
        if (!cancelled) {
          setLabels([]);
          setCounts([]);
          setSampleCount(0);
          setAverageHours(null);
          setError(e instanceof Error ? e.message : "Failed to load");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadDistribution();
    return () => {
      cancelled = true;
    };
  }, [filterType, startDate, endDate, refreshSignal]);

  const totalFromCounts = useMemo(
    () => counts.reduce((a, b) => a + b, 0),
    [counts]
  );

  const data = {
    labels,
    datasets: [
      {
        label: "Permits",
        data: counts,
        backgroundColor: "rgba(59, 130, 246, 0.65)",
        borderColor: "rgba(37, 99, 235, 1)",
        borderWidth: 1,
        borderRadius: 4,
        categoryPercentage: 0.85,
        barPercentage: 0.9,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          title: (items: TooltipItem<"bar">[]) => items[0]?.label ?? "",
          label: (tooltipItem: TooltipItem<"bar">) => {
            const y = tooltipItem.parsed.y;
            if (y == null) return "";
            const pct =
              totalFromCounts <= 0 ? 0 : Math.round((y / totalFromCounts) * 100);
            return ` ${y} permit${y === 1 ? "" : "s"} (${pct}% of sample)`;
          },
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: "Turnaround time (hours)",
          color: "#64748b",
          font: { size: 12 },
        },
        ticks: { color: "#64748b", maxRotation: 45, minRotation: 0 },
        grid: { display: false },
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: "Number of permits",
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
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900 mb-1">
        Permit turnaround distribution
      </h2>
      <p className="text-sm text-slate-500 mb-1">
        Average time from permit creation to permit exit.
      </p>
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      <div className="relative h-72 w-full">
        {loading ? (
          <div className="h-full flex items-center justify-center text-sm text-slate-400">
            Loading...
          </div>
        ) : sampleCount <= 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-slate-400 text-center px-4">
            No permits with valid issue and exit timestamps in this period.
          </div>
        ) : (
          <Bar data={data} options={options} />
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600 border-t border-slate-100 pt-4">
        <div>
          <span className="text-slate-400">Sample permits</span>{" "}
          <span className="font-semibold text-slate-800">{sampleCount}</span>
        </div>
        <div>
          <span className="text-slate-400">Approx. sample mean</span>{" "}
          <span className="font-semibold text-slate-800">
            {averageHours === null ? "—" : `${averageHours.toFixed(1)} h`}
          </span>
        </div>
      </div>
    </div>
  );
}
