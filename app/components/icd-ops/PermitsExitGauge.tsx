"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Doughnut } from "react-chartjs-2";
import type { TrendFilterType } from "@/app/components/icd-ops/ReceivingVsExitTrendChart";

ChartJS.register(ArcElement, Tooltip, Legend);

type Props = {
  filterType: TrendFilterType;
  startDate?: Date;
  endDate?: Date;
  refreshSignal?: number;
};

export default function PermitsExitGauge({
  filterType,
  startDate,
  endDate,
  refreshSignal = 0,
}: Props) {
  const [created, setCreated] = useState<number | null>(null);
  const [pending, setPending] = useState<number | null>(null);
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

    const qs = params.toString();

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [permRes, pendRes] = await Promise.all([
          fetch(`/api/permits?${qs}`),
          fetch(`/api/permits/pending?${qs}`),
        ]);

        const permJson = await permRes.json();
        const pendJson = await pendRes.json();

        if (!permRes.ok) {
          throw new Error(
            typeof permJson?.error === "string" ? permJson.error : "Failed to load permits"
          );
        }
        if (!pendRes.ok) {
          throw new Error(
            typeof pendJson?.error === "string" ? pendJson.error : "Failed to load pending permits"
          );
        }

        if (!Array.isArray(permJson) || !Array.isArray(pendJson)) {
          throw new Error("Unexpected API response");
        }

        if (!cancelled) {
          setCreated(permJson.length);
          setPending(pendJson.length);
        }
      } catch (e) {
        if (!cancelled) {
          setCreated(null);
          setPending(null);
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

  const { exited, pct } = useMemo(() => {
    if (created === null || pending === null) {
      return { exited: 0, pct: 0 };
    }
    const ex = Math.max(0, created - pending);
    const p =
      created <= 0 ? 0 : Math.min(100, Math.round((ex / created) * 100));
    return { exited: ex, pct: p };
  }, [created, pending]);

  const data = useMemo(
    () => ({
      labels: ["Issued", "Exited"],
      datasets: [
        {
          data: [pct, 100 - pct],
          backgroundColor: ["#3b82f6", "#e2e8f0"],
          borderWidth: 0,
          hoverBackgroundColor: ["#2563eb", "#cbd5e1"],
        },
      ],
    }),
    [pct]
  );

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      rotation: -90,
      circumference: 180,
      cutout: "72%",
      plugins: {
        legend: {
          display: true,
          position: "bottom" as const,
          labels: {
            color: "#475569",
            padding: 16,
            usePointStyle: true,
            pointStyle: "circle",
          },
        },
        tooltip: {
          callbacks: {
            label: (ctx: { label?: string; parsed: number }) => {
              const v = ctx.parsed;
              const c = created ?? 0;
              const ex = exited;
              const pend = pending ?? 0;
              if (ctx.label === "Exited (of created)") {
                return ` Share of created: ${v}% (${ex} of ${c})`;
              }
              return ` ${100 - pct}% of created (${pend} pending)`;
            },
          },
        },
      },
    }),
    [created, exited, pending, pct]
  );

  const showChart =
    !loading &&
    !error &&
    created !== null &&
    pending !== null &&
    created > 0;

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900 mb-4">
        Issued vs Exited
      </h2>

      {error && (
        <p className="text-sm text-red-600 mb-2">{error}</p>
      )}
      <div className="relative h-52 max-w-md mx-auto">
        {loading ? (
          <div className="flex h-full items-center justify-center text-slate-400 text-sm">
            Loading…
          </div>
        ) : !showChart ? (
          <div className="flex h-full items-center justify-center text-center text-slate-400 text-sm px-4">
            {created === 0
              ? "No permits created in this period."
              : "Unable to show gauge."}
          </div>
        ) : (
          <>
            <Doughnut data={data} options={options} />
            <div className="absolute inset-x-0 bottom-8 flex flex-col items-center pointer-events-none">
              <span className="text-3xl font-bold text-slate-900">{pct}%</span>
              <span className="text-xs text-slate-500 font-medium mt-0.5">
                exited of created
              </span>
            </div>
          </>
        )}
      </div>
      <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 mt-4 text-sm text-slate-600">
        <div>
          <span className="text-slate-400">Created</span>{" "}
          <span className="font-semibold text-slate-800">
            {loading ? "…" : created ?? "—"}
          </span>
        </div>
        <div>
          <span className="text-slate-400">Exited</span>{" "}
          <span className="font-semibold text-slate-800">
            {loading ? "…" : created !== null && pending !== null ? exited : "—"}
          </span>
        </div>
        <div>
          <span className="text-slate-400">Pending</span>{" "}
          <span className="font-semibold text-amber-900">
            {loading ? "…" : pending ?? "—"}
          </span>
        </div>
      </div>
    </div>
  );
}
