"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Doughnut } from "react-chartjs-2";
import type { TrendFilterType } from "@/app/components/ReceivingVsExitTrendChart";

ChartJS.register(ArcElement, Tooltip, Legend);

type FreightRow = {
  U_FI?: string | null;
};

function aggregateFreight(rows: FreightRow[]): {
  fcl: number;
  lcl: number;
  other: number;
} {
  let fcl = 0;
  let lcl = 0;
  let other = 0;
  for (const row of rows) {
    const v = String(row.U_FI ?? "").trim().toUpperCase();
    if (v === "FCL") fcl++;
    else if (v === "LCL") lcl++;
    else other++;
  }
  return { fcl, lcl, other };
}

type Props = {
  filterType: TrendFilterType;
  startDate?: Date;
  endDate?: Date;
};

export default function ReceivedContainersFclLclGauge({
  filterType,
  startDate,
  endDate,
}: Props) {
  const [rows, setRows] = useState<FreightRow[] | null>(null);
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
        const res = await fetch(
          `/api/containers/received/freight_indicator?${params.toString()}`
        );
        const json = await res.json();
        if (!res.ok) {
          throw new Error(
            typeof json?.error === "string" ? json.error : "Request failed"
          );
        }
        if (!Array.isArray(json)) {
          throw new Error("Unexpected response");
        }
        if (!cancelled) setRows(json as FreightRow[]);
      } catch (e) {
        if (!cancelled) {
          setRows(null);
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

  const { fcl, lcl, other, total, fclPct } = useMemo(() => {
    const list = rows ?? [];
    const agg = aggregateFreight(list);
    const n =
      agg.fcl + agg.lcl + agg.other;
    const pct =
      n <= 0 ? 0 : Math.round((agg.fcl / n) * 100);
    return { ...agg, total: n, fclPct: pct };
  }, [rows]);

  const chartPayload = useMemo(() => {
    const includeOther = other > 0;
    const labels = includeOther
      ? [
          "FCL",
          "LCL",
          "Other / unspecified",
        ]
      : ["FCL", "LCL"];
    const dataVals = includeOther ? [fcl, lcl, other] : [fcl, lcl];
    const bg = includeOther
      ? ["#3b82f6", "#10b981", "#94a3b8"]
      : ["#3b82f6", "#10b981"];
    const hoverBg = includeOther
      ? ["#2563eb", "#059669", "#64748b"]
      : ["#2563eb", "#059669"];
    return { labels, dataVals, bg, hoverBg };
  }, [fcl, lcl, other]);

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
            padding: 14,
            usePointStyle: true,
            pointStyle: "circle",
          },
        },
        tooltip: {
          callbacks: {
            label: (ctx: {
              dataset: { data: number[] };
              dataIndex: number;
            }) => {
              const raw = ctx.dataset.data[ctx.dataIndex];
              const share =
                total <= 0 ? 0 : Math.round((raw / total) * 100);
              return ` ${raw} (${share}% of received)`;
            },
          },
        },
      },
    }),
    [total]
  );

  const data = useMemo(
    () => ({
      labels: chartPayload.labels,
      datasets: [
        {
          data: chartPayload.dataVals,
          backgroundColor: chartPayload.bg,
          borderWidth: 0,
          hoverBackgroundColor: chartPayload.hoverBg,
        },
      ],
    }),
    [chartPayload]
  );

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900 mb-4">
        Freight Indicator
      </h2>
      {error && (
        <p className="text-sm text-red-600 mb-2">{error}</p>
      )}
      <div className="relative h-52 max-w-md mx-auto">
        {loading ? (
          <div className="flex h-full items-center justify-center text-slate-400 text-sm">
            Loading…
          </div>
        ) : total <= 0 ? (
          <div className="flex h-full items-center justify-center text-center text-slate-400 text-sm px-4">
            No freight indicator rows for this period.
          </div>
        ) : (
          <>
            <Doughnut data={data} options={options} />
            <div className="absolute inset-x-0 bottom-8 flex flex-col items-center pointer-events-none">
              <span className="text-3xl font-bold text-slate-900">{fclPct}%</span>
              <span className="text-xs text-slate-500 font-medium mt-0.5">
                FCL
              </span>
            </div>
          </>
        )}
      </div>
      <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 mt-2 text-sm text-slate-600">
        <div>
          <span className="text-slate-400">FCL</span>{" "}
          <span className="font-semibold text-slate-800">
            {loading ? "…" : fcl}
          </span>
        </div>
        <div>
          <span className="text-slate-400">LCL</span>{" "}
          <span className="font-semibold text-slate-800">
            {loading ? "…" : lcl}
          </span>
        </div>
        {other > 0 && (
          <div>
            <span className="text-slate-400">Other</span>{" "}
            <span className="font-semibold text-slate-800">{other}</span>
          </div>
        )}
        <div>
          <span className="text-slate-400">Total</span>{" "}
          <span className="font-semibold text-slate-800">
            {loading ? "…" : total}
          </span>
        </div>
      </div>
    </div>
  );
}
