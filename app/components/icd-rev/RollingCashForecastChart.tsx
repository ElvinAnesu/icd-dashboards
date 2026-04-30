"use client";

import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
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

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

const rawData: ChartData<"line"> = {
  labels: ["W18", "W19", "W20", "W21", "W22", "W23", "W24", "W25", "W26", "W27", "W28", "W29", "W30"],
  datasets: [
    {
      label: "Projected balance",
      data: [800, 890, 840, 925, 905, 960, 940, 1010, 985, 1050, 1020, 1080, 1100],
      borderColor: "#3b82f6",
      backgroundColor: "rgba(59, 130, 246, 0.12)",
      tension: 0.35,
      fill: true,
      pointRadius: 3,
    },
    {
      label: "Stress case",
      data: [800, 770, 760, 790, 780, 815, 805, 890, 870, 915, 900, 930, 960],
      borderColor: "#f87171",
      borderDash: [6, 6],
      tension: 0.35,
      pointRadius: 2,
    },
  ],
};

type Props = {
  currency: CashflowCurrency;
};

export default function RollingCashForecastChart({ currency }: Props) {
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
        x: { ticks: { color: "#64748b" }, grid: { color: "rgba(148, 163, 184, 0.2)" } },
        y: {
          ticks: { color: "#64748b", callback: (value) => formatAxisTick(value, currency) },
          grid: { color: "rgba(148, 163, 184, 0.2)" },
        },
      },
    }),
    [currency]
  );
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900 mb-1">Rolling 13-week cash forecast</h2>
      <p className="text-sm text-slate-500 mb-4">
        Projected cash balance week by week based on open AR/AP.
      </p>
      <div className="relative h-72 w-full">
        <Line data={data} options={options} />
      </div>
    </div>
  );
}
