"use client";

import { useEffect, useMemo, useState } from "react";
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
  parseISO,
  isValid,
  startOfWeek,
  startOfMonth,
  startOfYear,
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
): { labels: string[]; starts: Date[]; granularity: Granularity } {
  const now = new Date();

  if (filterType === "today") {
    const dayStart = startOfDay(now);
    const dayEnd = endOfDay(now);
    const hours = eachHourOfInterval({ start: dayStart, end: dayEnd });
    return {
      labels: hours.map((d) => format(d, "HH:mm")),
      starts: hours,
      granularity: "hour",
    };
  }

  if (filterType === "last7days") {
    const start = startOfDay(subDays(now, 6));
    const end = endOfDay(now);
    const days = eachDayOfInterval({ start, end });
    return {
      labels: days.map((d) => format(d, "EEE d")),
      starts: days,
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
      starts: weeks,
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
      starts: years,
      granularity: "year",
    };
  }
  if (daysDiff > SIX_MONTHS_DAYS) {
    const months = eachMonthOfInterval({ start: safeStart, end: safeEnd });
    return {
      labels: months.map((d) => format(d, "MMM yyyy")),
      starts: months,
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
      starts: weeks,
      granularity: "week",
    };
  }
  const days = eachDayOfInterval({ start: safeStart, end: safeEnd });
  return {
    labels: days.map((d) => format(d, "MMM d")),
    starts: days,
    granularity: "day",
  };
}

type ReceivedRow = { U_CRDate?: string | null };
type ExitedRow = { U_GateOutDate?: string | null };

function parseMaybeDate(value: unknown): Date | null {
  if (typeof value !== "string" || value.trim().length <= 0) return null;
  const d = parseISO(value);
  if (isValid(d)) return d;
  const fallback = new Date(value);
  return isValid(fallback) ? fallback : null;
}

function bucketStart(date: Date, granularity: Granularity): Date {
  switch (granularity) {
    case "hour":
      return new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        date.getHours(),
        0,
        0,
        0
      );
    case "day":
      return startOfDay(date);
    case "week":
      return startOfWeek(date, { weekStartsOn: 1 });
    case "month":
      return startOfMonth(date);
    case "year":
      return startOfYear(date);
    default:
      return startOfDay(date);
  }
}

function aggregateSeries<T>(
  rows: T[],
  getDateValue: (row: T) => unknown,
  granularity: Granularity,
  indexByStart: Map<number, number>,
  length: number
): number[] {
  const out = Array.from({ length }, () => 0);
  for (const row of rows) {
    const dt = parseMaybeDate(getDateValue(row));
    if (!dt) continue;
    const key = bucketStart(dt, granularity).getTime();
    const idx = indexByStart.get(key);
    if (idx !== undefined) {
      out[idx] += 1;
    }
  }
  return out;
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
  refreshSignal?: number;
}

export default function ReceivingVsExitTrendChart({
  filterType,
  startDate,
  endDate,
  refreshSignal = 0,
}: ReceivingVsExitTrendChartProps) {
  const [receivedRows, setReceivedRows] = useState<ReceivedRow[] | null>(null);
  const [exitedRows, setExitedRows] = useState<ExitedRow[] | null>(null);
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

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [receivedRes, exitedRes] = await Promise.all([
          fetch(`/api/containers/received?${params.toString()}`),
          fetch(`/api/permits/exited?${params.toString()}`),
        ]);

        const [receivedJson, exitedJson] = await Promise.all([
          receivedRes.json(),
          exitedRes.json(),
        ]);

        if (!receivedRes.ok) {
          throw new Error(
            typeof receivedJson?.error === "string"
              ? receivedJson.error
              : "Failed loading received containers"
          );
        }
        if (!exitedRes.ok) {
          throw new Error(
            typeof exitedJson?.error === "string"
              ? exitedJson.error
              : "Failed loading exited permits"
          );
        }
        if (!Array.isArray(receivedJson) || !Array.isArray(exitedJson)) {
          throw new Error("Unexpected response shape");
        }

        if (!cancelled) {
          setReceivedRows(receivedJson as ReceivedRow[]);
          setExitedRows(exitedJson as ExitedRow[]);
        }
      } catch (e) {
        if (!cancelled) {
          setReceivedRows(null);
          setExitedRows(null);
          setError(e instanceof Error ? e.message : "Failed to load");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [filterType, startDate, endDate, refreshSignal]);

  const { labels, granularity, inSeries, outSeries } = useMemo(() => {
    const { labels, starts, granularity } = resolveBuckets(
      filterType,
      startDate,
      endDate
    );
    const indexByStart = new Map<number, number>();
    starts.forEach((d, i) => indexByStart.set(d.getTime(), i));
    const inSeries = aggregateSeries(
      receivedRows ?? [],
      (row) => row.U_CRDate,
      granularity,
      indexByStart,
      labels.length
    );
    const outSeries = aggregateSeries(
      exitedRows ?? [],
      (row) => row.U_GateOutDate,
      granularity,
      indexByStart,
      labels.length
    );
    return { labels, granularity, inSeries, outSeries };
  }, [filterType, startDate, endDate, receivedRows, exitedRows]);

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
          text: "Count",
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
      <h2 className="text-lg font-semibold text-slate-900 mb-4">
        Daily receiving vs exit trend
      </h2>
      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
      <div className="relative h-80 w-full min-h-[280px]">
        {loading ? (
          <div className="flex h-full items-center justify-center text-slate-400 text-sm">
            Loading...
          </div>
        ) : (
          <Line data={data} options={options} />
        )}
      </div>
    </div>
  );
}
