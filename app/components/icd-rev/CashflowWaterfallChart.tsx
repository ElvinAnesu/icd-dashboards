"use client";

import { BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Tooltip, type ChartData, type ChartOptions } from "chart.js";
import { useMemo } from "react";
import { Bar } from "react-chartjs-2";
import { convertTzsMillions, formatAxisTick, type CashflowCurrency } from "@/app/components/icd-rev/currency";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const labels = [
  "Opening balance",
  "Storage fees",
  "Handling charges",
  "Permit fees",
  "Port charges",
  "Staff costs",
  "Overheads",
  "Other costs",
  "Closing balance",
];

const baseTzs = [0, 720, 880, 980, 1040, 980, 860, 800, 0];
const topTzs = [720, 880, 980, 1040, 980, 860, 800, 760, 760];
const colors = ["#60a5fa", "#10b981", "#10b981", "#34d399", "#ef4444", "#ef4444", "#ef4444", "#ef4444", "#60a5fa"];

type Props = {
  currency: CashflowCurrency;
};

export default function CashflowWaterfallChart({ currency }: Props) {
  const data = useMemo<ChartData<"bar">>(
    () => ({
      labels,
      datasets: [
        {
          label: "Waterfall",
          data: baseTzs.map((b, i) => [
            convertTzsMillions(b, currency),
            convertTzsMillions(topTzs[i], currency),
          ]) as unknown as number[],
          backgroundColor: colors,
          borderWidth: 0,
        },
      ],
    }),
    [currency]
  );

  const options = useMemo<ChartOptions<"bar">>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          ticks: { color: "#64748b", maxRotation: 20, minRotation: 20 },
          grid: { color: "rgba(148, 163, 184, 0.2)" },
        },
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
      <h2 className="text-lg font-semibold text-slate-900 mb-1">Cashflow waterfall - April 2026</h2>
      <p className="text-sm text-slate-500 mb-4">
        Inflows (green) and outflows (red) showing net cash movement.
      </p>
      <div className="relative h-80 w-full">
        <Bar data={data} options={options} />
      </div>
    </div>
  );
}
