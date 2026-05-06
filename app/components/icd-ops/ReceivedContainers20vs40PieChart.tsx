"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  PieController,
  type TooltipItem,
} from "chart.js";
import { Pie } from "react-chartjs-2";
import type { TrendFilterType } from "@/app/components/icd-ops/ReceivingVsExitTrendChart";

ChartJS.register(ArcElement, Tooltip, Legend, PieController);

type SizeRow = {
  DocEntry?: number;
  LineId?: number;
  U_size1?: string | null;
};

/** Trimmed U_size1: leading digit 2 → 20 ft, 4 → 40 ft; else discarded. */
function aggregate20vs40(rows: SizeRow[]): {
  ft20: number;
  ft40: number;
  discarded: number;
} {
  let ft20 = 0;
  let ft40 = 0;
  let discarded = 0;
  for (const row of rows) {
    const s = String(row.U_size1 ?? "").trim();
    if (s.length === 0) {
      discarded++;
      continue;
    }
    const lead = s.charAt(0);
    if (lead === "2") ft20++;
    else if (lead === "4") ft40++;
    else discarded++;
  }
  return { ft20, ft40, discarded };
}

type Props = {
  filterType: TrendFilterType;
  startDate?: Date;
  endDate?: Date;
  refreshSignal?: number;
};

export default function ReceivedContainers20vs40PieChart({
  filterType,
  startDate,
  endDate,
  refreshSignal = 0,
}: Props) {
  const [rows, setRows] = useState<SizeRow[] | null>(null);
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
          `/api/containers/received/size?${params.toString()}`
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
        if (!cancelled) setRows(json as SizeRow[]);
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
  }, [filterType, startDate, endDate, refreshSignal]);

  const { ft20, ft40, classifiedTotal, discarded } = useMemo(() => {
    const list = rows ?? [];
    const agg = aggregate20vs40(list);
    const classified = agg.ft20 + agg.ft40;
    return {
      ft20: agg.ft20,
      ft40: agg.ft40,
      classifiedTotal: classified,
      discarded: agg.discarded,
    };
  }, [rows]);

  const data = useMemo(
    () => ({
      labels: ["20 ft", "40 ft"],
      datasets: [
        {
          data: [ft20, ft40],
          backgroundColor: ["#3b82f6", "#10b981"],
          borderColor: "#ffffff",
          borderWidth: 2,
          hoverBackgroundColor: ["#2563eb", "#059669"],
        },
      ],
    }),
    [ft20, ft40]
  );

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
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
            label: (tooltipItem: TooltipItem<"pie">) => {
              const raw = tooltipItem.raw;
              const n =
                typeof raw === "number"
                  ? raw
                  : typeof raw === "string"
                    ? Number(raw)
                    : 0;
              if (!Number.isFinite(n)) return "";
              const pct =
                classifiedTotal <= 0
                  ? 0
                  : Math.round((n / classifiedTotal) * 100);
              return ` ${tooltipItem.label ?? ""}: ${n} (${pct}% of 20/40 split)`;
            },
          },
        },
      },
    }),
    [classifiedTotal]
  );

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900 mb-4">
        Container lengths
      </h2>
      {error && (
        <p className="text-sm text-red-600 mb-2">{error}</p>
      )}
      <div className="relative h-64 max-w-md mx-auto">
        {loading ? (
          <div className="flex h-full items-center justify-center text-slate-400 text-sm">
            Loading…
          </div>
        ) : classifiedTotal <= 0 ? (
          <div className="flex h-full items-center justify-center text-center text-slate-400 text-sm px-4">
            No 20 ft or 40 ft classified rows for this period.
          </div>
        ) : (
          <Pie data={data} options={options} />
        )}
      </div>
      {!loading && (
        <p className="text-center text-xs text-slate-400 mt-2">
          Classified (20/40):{" "}
          <span className="font-medium text-slate-600">{classifiedTotal}</span>
          {discarded > 0 && (
            <>
              {" "}
              · Excluded (other sizes):{" "}
              <span className="font-medium text-slate-600">{discarded}</span>
            </>
          )}
        </p>
      )}
    </div>
  );
}
