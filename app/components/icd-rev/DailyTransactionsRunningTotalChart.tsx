"use client";

import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from "chart.js";
import { useMemo } from "react";
import { Line } from "react-chartjs-2";
import { convertTzsMillions, formatAxisTick, type CashflowCurrency } from "@/app/components/icd-rev/currency";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

const labels = [
  "Apr 1",
  "Apr 2",
  "Apr 3",
  "Apr 4",
  "Apr 5",
  "Apr 6",
  "Apr 7",
  "Apr 8",
  "Apr 9",
  "Apr 10",
  "Apr 11",
  "Apr 12",
  "Apr 13",
  "Apr 14",
  "Apr 15",
  "Apr 16",
  "Apr 17",
  "Apr 18",
  "Apr 19",
  "Apr 20",
  "Apr 21",
  "Apr 22",
];

const dailyRevenueTzsMillions = [42, 36, 54, 49, 61, 45, 58, 67, 52, 74, 63, 57, 66, 48, 44, 53, 70, 51, 69, 62, 77, 73];
const targetRevenueTzsMillions = [40, 40, 45, 45, 50, 50, 52, 55, 55, 58, 58, 60, 60, 60, 62, 62, 65, 65, 65, 68, 68, 70];

const rawData: ChartData<"line"> = {
  labels,
  datasets: [
    {
      label: "Daily revenue",
      data: dailyRevenueTzsMillions,
      borderColor: "#3b82f6",
      backgroundColor: "rgba(59, 130, 246, 0.12)",
      pointRadius: 2,
      borderWidth: 2,
      tension: 0.3,
      fill: true,
    },
    {
      label: "Daily target",
      data: targetRevenueTzsMillions,
      borderColor: "#f59e0b",
      borderDash: [6, 4],
      pointRadius: 2,
      borderWidth: 2,
      tension: 0.3,
      fill: false,
    },
  ],
};

type Props = {
  currency: CashflowCurrency;
};

export default function DailyTransactionsRunningTotalChart({ currency }: Props) {
  const data = useMemo<ChartData<"line">>(
    () => ({
      ...rawData,
      datasets: rawData.datasets.map((dataset) => ({
        ...dataset,
        data: (dataset.data as number[]).map((v) => convertTzsMillions(v, currency)),
      })),
    }),
    [currency]
  );

  const options = useMemo<ChartOptions<"line">>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          ticks: { color: "#64748b", maxRotation: 50, minRotation: 50 },
          grid: { color: "rgba(148, 163, 184, 0.2)" },
        },
        y: {
          type: "linear",
          position: "left",
          beginAtZero: true,
          ticks: { color: "#64748b", callback: (value) => formatAxisTick(value, currency) },
          grid: { color: "rgba(148, 163, 184, 0.2)" },
          title: { display: true, text: `Daily (${currency} M)`, color: "#64748b" },
        },
      },
    }),
    [currency]
  );
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900 mb-1">Daily transactions</h2>
      <p className="text-sm text-slate-500 mb-4">Daily billed sales compared against daily target.</p>
      <div className="relative h-72 w-full">
        <Line data={data} options={options} />
      </div>
    </div>
  );
}
