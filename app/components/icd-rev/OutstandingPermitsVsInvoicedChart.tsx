"use client";

import { BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Tooltip, type ChartData, type ChartOptions } from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const data: ChartData<"bar"> = {
  labels: ["Wk 14", "Wk 15", "Wk 16", "Wk 17", "Wk 18"],
  datasets: [
    {
      label: "Invoiced",
      data: [8, 12, 7, 10, 9],
      backgroundColor: "#60a5fa",
      stack: "permits",
    },
    {
      label: "Pending billing",
      data: [3, 2, 4, 1, 3],
      backgroundColor: "#a3a3a3",
      stack: "permits",
    },
  ],
};

const options: ChartOptions<"bar"> = {
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
      ticks: { color: "#64748b" },
      grid: { color: "rgba(148, 163, 184, 0.2)" },
    },
  },
};

export default function OutstandingPermitsVsInvoicedChart() {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900 mb-1">Outstanding permits vs. invoiced</h2>
      <p className="text-sm text-slate-500 mb-4">
        Ops-to-finance linkage - unbilled vs. billed loading permits.
      </p>
      <div className="relative h-72 w-full">
        <Bar data={data} options={options} />
      </div>
    </div>
  );
}
