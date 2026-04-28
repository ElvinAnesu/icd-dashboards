"use client";

import { useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import {
  format,
  startOfDay,
  endOfDay,
  subDays,
  subMonths,
  eachHourOfInterval,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  eachYearOfInterval,
  differenceInCalendarDays,
} from "date-fns";

export type TrendFilterType =
  | "today"
  | "last7days"
  | "last3months"
  | "custom";

type Granularity = "hour" | "day" | "week" | "month" | "year";

const TWO_YEARS_DAYS = 731;
const SIX_MONTHS_DAYS = 186;

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

function resolveBuckets(
  filterType: TrendFilterType,
  startDate?: Date,
  endDate?: Date
): { labels: string[]; granularity: Granularity } {
  const now = new Date();

  if (filterType === "today") {
    const dayStart = startOfDay(now);
    const dayEnd = endOfDay(now);
    const hours = eachHourOfInterval({ start: dayStart, end: dayEnd });
    return {
      labels: hours.map((d) => format(d, "HH:mm")),
      granularity: "hour",
    };
  }

  if (filterType === "last7days") {
    const start = startOfDay(subDays(now, 6));
    const end = endOfDay(now);
    const days = eachDayOfInterval({ start, end });
    return {
      labels: days.map((d) => format(d, "EEE d")),
      granularity: "day",
    };
  }

  if (filterType === "last3months") {
    const rangeStart = subMonths(startOfDay(now), 3);
    const weeks = eachWeekOfInterval(
      { start: rangeStart, end: now },
      { weekStartsOn: 1 }
    );
    return {
      labels: weeks.map((d, i) => `${format(d, "MMM d")} (wk ${i + 1})`),
      granularity: "week",
    };
  }

  // Custom: infer from range; fallback to last 7 days if range unknown
  const end = endDate ? endOfDay(endDate) : endOfDay(now);
  const start = startDate
    ? startOfDay(startDate)
    : startOfDay(subDays(end, 6));
  const safeStart = start.getTime() <= end.getTime() ? start : end;
  const safeEnd = start.getTime() <= end.getTime() ? end : start;
  const daysDiff =
    differenceInCalendarDays(safeEnd, safeStart) + 1;

  if (daysDiff > TWO_YEARS_DAYS) {
    const years = eachYearOfInterval({ start: safeStart, end: safeEnd });
    return {
      labels: years.map((d) => format(d, "yyyy")),
      granularity: "year",
    };
  }
  if (daysDiff > SIX_MONTHS_DAYS) {
    const months = eachMonthOfInterval({ start: safeStart, end: safeEnd });
    return {
      labels: months.map((d) => format(d, "MMM yyyy")),
      granularity: "month",
    };
  }
  if (daysDiff > 7) {
    const weeks = eachWeekOfInterval(
      { start: safeStart, end: safeEnd },
      { weekStartsOn: 1 }
    );
    return {
      labels: weeks.map((d) => format(d, "MMM d")),
      granularity: "week",
    };
  }
  const days = eachDayOfInterval({ start: safeStart, end: safeEnd });
  return {
    labels: days.map((d) => format(d, "MMM d")),
    granularity: "day",
  };
}

function mockInOut(
  n: number,
  granularity: Granularity
): { inSeries: number[]; outSeries: number[] } {
  const base =
    granularity === "hour"
      ? 3.5
      : granularity === "day"
        ? 42
        : granularity === "week"
          ? 180
          : granularity === "month"
            ? 750
            : 3200;

  const inSeries = Array.from({ length: n }, (_, i) => {
    const wave = Math.sin(i * 0.42 + 0.2) * 0.28;
    const drift = (i / Math.max(n - 1, 1)) * 0.12;
    return Math.max(0, Math.round(base * (0.85 + wave + drift)));
  });
  const outSeries = Array.from({ length: n }, (_, i) => {
    const wave = Math.cos(i * 0.38 + 0.5) * 0.26;
    const drift = (i / Math.max(n - 1, 1)) * 0.1;
    return Math.max(0, Math.round(base * (0.78 + wave + drift)));
  });
  return { inSeries, outSeries };
}

function granularityLabel(g: Granularity): string {
  switch (g) {
    case "hour":
      return "Hours";
    case "day":
      return "Days";
    case "week":
      return "Weeks";
    case "month":
      return "Months";
    case "year":
      return "Years";
    default:
      return "";
  }
}

interface ReceivingVsExitTrendChartProps {
  filterType: TrendFilterType;
  startDate?: Date;
  endDate?: Date;
}

export default function ReceivingVsExitTrendChart({
  filterType,
  startDate,
  endDate,
}: ReceivingVsExitTrendChartProps) {
  const { labels, granularity, inSeries, outSeries } = useMemo(() => {
    const { labels, granularity } = resolveBuckets(
      filterType,
      startDate,
      endDate
    );
    const { inSeries, outSeries } = mockInOut(labels.length, granularity);
    return { labels, granularity, inSeries, outSeries };
  }, [filterType, startDate, endDate]);

  const data = {
    labels,
    datasets: [
      {
        label: "Containers in (received)",
        data: inSeries,
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59, 130, 246, 0.12)",
        fill: true,
        tension: 0.35,
        pointRadius: granularity === "hour" ? 0 : 3,
        pointHoverRadius: 5,
        borderWidth: 2,
      },
      {
        label: "Containers out (exited)",
        data: outSeries,
        borderColor: "#10b981",
        backgroundColor: "rgba(16, 185, 129, 0.08)",
        fill: true,
        tension: 0.35,
        pointRadius: granularity === "hour" ? 0 : 3,
        pointHoverRadius: 5,
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index" as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: "top" as const,
        labels: { color: "#475569", usePointStyle: true, padding: 16 },
      },
      title: { display: false },
      tooltip: {
        backgroundColor: "rgba(15, 23, 42, 0.92)",
        titleColor: "#f8fafc",
        bodyColor: "#e2e8f0",
        padding: 12,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: granularityLabel(granularity),
          color: "#64748b",
          font: { size: 12, weight: "bold" as const },
        },
        ticks: { color: "#64748b", maxRotation: 45, minRotation: 0 },
        grid: { color: "rgba(148, 163, 184, 0.15)" },
      },
      y: {
        title: {
          display: true,
          text: "Containers (mock)",
          color: "#64748b",
          font: { size: 12, weight: "bold" as const },
        },
        ticks: { color: "#64748b" },
        grid: { color: "rgba(148, 163, 184, 0.2)" },
        beginAtZero: true,
      },
    },
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900 mb-1">
        Daily receiving vs exit trend
      </h2>
      <p className="text-sm text-slate-500 mb-1">
        Two lines compare containers in versus containers out — when
        &quot;in&quot; stays above &quot;out&quot;, stock tends to build;
        the opposite suggests clearing.
      </p>
      <p className="text-xs text-slate-400 mb-4">
        Mock data for illustration. X-axis steps:{" "}
        <span className="font-medium text-slate-600">
          {granularityLabel(granularity)}
        </span>
        {filterType === "today" && " (each hour today)."}
        {filterType === "last7days" && " (each of the last 7 days)."}
        {filterType === "last3months" && " (weekly buckets)."}
        {filterType === "custom" &&
          " (range: 7 days or fewer → days; longer up to ~6 months → weeks; beyond ~6 months up to ~2 years → months; beyond ~2 years → years)."}
      </p>
      <div className="relative h-80 w-full min-h-[280px]">
        <Line data={data} options={options} />
      </div>
    </div>
  );
}
