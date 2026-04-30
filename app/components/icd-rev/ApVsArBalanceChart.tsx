"use client";

import { BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Tooltip, type ChartData, type ChartOptions } from "chart.js";
import { useMemo } from "react";
import { Bar } from "react-chartjs-2";
import { convertTzsMillions, formatAxisTick, type CashflowCurrency } from "@/app/components/icd-rev/currency";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const rawData: ChartData<"bar"> = {
  labels: ["Jan", "Feb", "Mar", "Apr"],
  datasets: [
    { label: "AR (receivable)", data: [280, 305, 290, 312], backgroundColor: "#10b981" },
    { label: "AP (payable)", data: [155, 168, 180, 190], backgroundColor: "#f97316" },
  ],
};

type Props = {
  currency: CashflowCurrency;
};

export default function ApVsArBalanceChart({ currency }: Props) {
  const data = useMemo<ChartData<"bar">>(
    () => ({
      ...rawData,
      datasets: rawData.datasets.map((dataset) => ({
        ...dataset,
        data: (dataset.data as number[]).map((v) => convertTzsMillions(v, currency)),
      })),
    }),
    [currency]
  );

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
        x: { ticks: { color: "#64748b" }, grid: { display: false } },
        y: {
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
      <h2 className="text-lg font-semibold text-slate-900 mb-1">AP vs AR balance</h2>
      <p className="text-sm text-slate-500 mb-4">What you owe vs. what you are owed by month.</p>
      <div className="relative h-72 w-full">
        <Bar data={data} options={options} />
      </div>
    </div>
  );
}
