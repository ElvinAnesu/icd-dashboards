"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock } from "lucide-react";
import type { TrendFilterType } from "@/app/components/icd-ops/ReceivingVsExitTrendChart";

function formatAvgHours(h: number | null): { primary: string; secondary: string } {
  if (h === null || !Number.isFinite(h)) return { primary: "—", secondary: "" };
  const rounded = Math.round(h * 10) / 10;
  const primary = rounded.toFixed(1).replace(/\.0$/, "");
  const days = Math.floor(h / 24);
  const rem = Math.round(h - days * 24);
  const secondary = days > 0 ? `${days}d ${rem}h` : "";
  return { primary, secondary };
}

type Props = {
  filterType: TrendFilterType;
  startDate?: Date;
  endDate?: Date;
};

export default function AveragePermitTurnaroundRing({
  filterType,
  startDate,
  endDate,
}: Props) {
  const [averageHours, setAverageHours] = useState<number | null>(null);
  const [sampleCount, setSampleCount] = useState<number>(0);
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
        const res = await fetch(`/api/permits/avg-turnaround?${params.toString()}`);
        const json = await res.json();
        if (!res.ok) {
          throw new Error(
            typeof json?.error === "string" ? json.error : "Request failed"
          );
        }
        if (
          json?.averageHours !== null &&
          json?.averageHours !== undefined &&
          typeof json.averageHours !== "number"
        ) {
          throw new Error("Unexpected response");
        }
        if (!cancelled) {
          const avg = json.averageHours;
          setAverageHours(typeof avg === "number" && Number.isFinite(avg) ? avg : null);
          setSampleCount(typeof json.sampleCount === "number" ? json.sampleCount : 0);
        }
      } catch (e) {
        if (!cancelled) {
          setAverageHours(null);
          setSampleCount(0);
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
  }, [filterType, startDate, endDate]);

  const { primary, secondary } = useMemo(
    () => formatAvgHours(averageHours),
    [averageHours]
  );

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm flex flex-col items-center">
      <h2 className="text-lg font-semibold text-slate-900 mb-1 self-stretch text-center">
        Average turnaround time
      </h2>

      {error && (
        <p className="text-sm text-red-600 mb-4 text-center">{error}</p>
      )}
      <div className="relative mx-auto flex h-44 w-44 flex-shrink-0 items-center justify-center">
        <div
          className="absolute inset-0 rounded-full bg-gradient-to-br from-slate-50 via-white to-blue-50 shadow-[inset_0_2px_8px_rgba(15,23,42,0.06)] ring-[3px] ring-blue-100 ring-offset-2 ring-offset-white"
          aria-hidden
        />
        <div className="relative z-10 flex flex-col items-center justify-center px-4 text-center pointer-events-none">
          {loading ? (
            <span className="text-sm text-slate-400">Loading…</span>
          ) : averageHours === null || sampleCount <= 0 ? (
            <span className="text-sm text-slate-400 px-2">
              No permits with valid issue and exit times in this period.
            </span>
          ) : (
            <>
              <Clock className="h-7 w-7 text-blue-600 mb-2 opacity-90" strokeWidth={1.75} />
              <span className="text-4xl font-bold tracking-tight text-slate-900 tabular-nums">
                {primary}
              </span>
              <span className="text-xs font-medium uppercase tracking-wide text-slate-400 mt-0.5">
                hours avg.
              </span>
              {secondary ? (
                <span className="text-xs text-slate-600 mt-2 font-medium">{secondary}</span>
              ) : null}
            </>
          )}
        </div>
      </div>
      {!loading && sampleCount > 0 && (
        <p className="text-xs text-slate-500 mt-6 text-center">
          Based on{" "}
          <span className="font-medium text-slate-700">{sampleCount}</span> permit
          {sampleCount === 1 ? "" : "s"} with parseable timestamps.
        </p>
      )}
    </div>
  );
}
