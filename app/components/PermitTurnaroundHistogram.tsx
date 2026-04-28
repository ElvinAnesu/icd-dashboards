"use client";

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

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

/** Hour bin edges: [0,6), [6,12), … , [96, ∞). Labels match bins. */
const BIN_LABELS = [
  "0–6 h",
  "6–12 h",
  "12–24 h",
  "24–48 h",
  "48–72 h",
  "72–96 h",
  "96+ h",
] as const;

/**
 * Mock histogram counts (permits per bin). Most mass under 24 h; tail shows outliers.
 * Deterministic so SSR/client match.
 */
const MOCK_BIN_COUNTS: readonly number[] = [38, 72, 65, 41, 28, 14, 22];

/** Approximate bin midpoints for mean (96+ uses 110 h as stand-in). */
const BIN_MID_HOURS = [3, 9, 18, 36, 60, 84, 110];

function weightedMeanHours(counts: readonly number[]): number {
  let sum = 0;
  let n = 0;
  for (let i = 0; i < counts.length; i++) {
    sum += counts[i] * BIN_MID_HOURS[i];
    n += counts[i];
  }
  return n <= 0 ? 0 : sum / n;
}

const TOTAL_MOCK = MOCK_BIN_COUNTS.reduce((a, b) => a + b, 0);
const AVG_HOURS_MOCK = weightedMeanHours(MOCK_BIN_COUNTS);

export default function PermitTurnaroundHistogram() {
  const data = {
    labels: [...BIN_LABELS],
    datasets: [
      {
        label: "Permits",
        data: [...MOCK_BIN_COUNTS],
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
              TOTAL_MOCK <= 0 ? 0 : Math.round((y / TOTAL_MOCK) * 100);
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
        Average time from permit creation to permit exit (mock data).
      </p>
      <p className="text-xs text-slate-400 mb-4">
        Histogram shows how turnaround times are spread—many fast permits with a
        long tail of slower ones (outliers).
      </p>
      <div className="relative h-72 w-full">
        <Bar data={data} options={options} />
      </div>
      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600 border-t border-slate-100 pt-4">
        <div>
          <span className="text-slate-400">Sample permits</span>{" "}
          <span className="font-semibold text-slate-800">{TOTAL_MOCK}</span>
        </div>
        <div>
          <span className="text-slate-400">Approx. sample mean</span>{" "}
          <span className="font-semibold text-slate-800">
            {AVG_HOURS_MOCK.toFixed(1)} h
          </span>
        </div>
      </div>
    </div>
  );
}
