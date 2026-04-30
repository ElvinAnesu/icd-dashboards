"use client";

import { useEffect, useState } from "react";
import { formatCurrencyMillions, type CashflowCurrency } from "@/app/components/icd-rev/currency";

type PositionCard = {
  key: "totalRevenue" | "cashCollected" | "arOutstanding";
  title: string;
  subtitle: string;
  subtitleClassName: string;
};

const POSITION_CARDS: PositionCard[] = [
  {
    key: "totalRevenue",
    title: "Total revenue",
    subtitle: "AR invoices",
    subtitleClassName: "text-slate-600",
  },
  {
    key: "cashCollected",
    title: "Cash collected",
    subtitle: "Incoming payments",
    subtitleClassName: "text-slate-600",
  },
  {
    key: "arOutstanding",
    title: "AR outstanding",
    subtitle: "Open balance",
    subtitleClassName: "text-slate-600",
  },
];

type Props = {
  currency: CashflowCurrency;
  filterType?: "today" | "last7days" | "last3months" | "custom";
  startDate?: Date;
  endDate?: Date;
};

type DocTotalRecord = {
  DocTotal: number;
};

type OutstandingArResponse = {
  outstandingTotal: number;
};

export default function CashPositionCards({ currency, filterType, startDate, endDate }: Props) {
  const [totalRevenueTzsMillions, setTotalRevenueTzsMillions] = useState<number>(0);
  const [cashCollectedTzsMillions, setCashCollectedTzsMillions] = useState<number>(0);
  const [arOutstandingTzsMillions, setArOutstandingTzsMillions] = useState<number>(0);

  useEffect(() => {
    let isActive = true;

    function buildQueryString() {
      const params = new URLSearchParams();
      if (filterType) {
        params.set("filterType", filterType);
      }
      if (startDate) {
        params.set("startDate", startDate.toISOString().split("T")[0]);
      }
      if (endDate) {
        params.set("endDate", endDate.toISOString().split("T")[0]);
      }
      return params.toString();
    }

    async function loadPositionTotals() {
      const query = buildQueryString();
      const suffix = query ? `?${query}` : "";

      const [arResponse, recCashResponse, outstandingArResponse] = await Promise.all([
        fetch(`/api/sales/ar-invoice${suffix}`),
        fetch(`/api/sales/rec-cash${suffix}`),
        fetch(`/api/sales/outstanding-ar${suffix}`),
      ]);

      if (!arResponse.ok && isActive) {
        setTotalRevenueTzsMillions(0);
      } else if (arResponse.ok) {
        const records: DocTotalRecord[] = await arResponse.json();
        const totalTzs = records.reduce((sum, row) => sum + Number(row.DocTotal ?? 0), 0);
        const totalMillions = totalTzs / 1_000_000;
        if (isActive) {
          setTotalRevenueTzsMillions(totalMillions);
        }
      }

      if (!recCashResponse.ok && isActive) {
        setCashCollectedTzsMillions(0);
      } else if (recCashResponse.ok) {
        const records: DocTotalRecord[] = await recCashResponse.json();
        const totalTzs = records.reduce((sum, row) => sum + Number(row.DocTotal ?? 0), 0);
        const totalMillions = totalTzs / 1_000_000;
        if (isActive) {
          setCashCollectedTzsMillions(totalMillions);
        }
      }

      if (!outstandingArResponse.ok && isActive) {
        setArOutstandingTzsMillions(0);
      } else if (outstandingArResponse.ok) {
        const body: OutstandingArResponse = await outstandingArResponse.json();
        const totalTzs = Number(body.outstandingTotal ?? 0);
        const totalMillions = totalTzs / 1_000_000;
        if (isActive) {
          setArOutstandingTzsMillions(totalMillions);
        }
      }
    }

    loadPositionTotals().catch(() => {
      if (isActive) {
        setTotalRevenueTzsMillions(0);
        setCashCollectedTzsMillions(0);
        setArOutstandingTzsMillions(0);
      }
    });

    return () => {
      isActive = false;
    };
  }, [filterType, startDate, endDate]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {POSITION_CARDS.map((card) => (
        <div key={card.title} className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
          <p className="text-slate-500 text-sm">{card.title}</p>
          <p className="text-2xl font-bold leading-tight text-slate-900 mt-1">
            {card.key === "totalRevenue"
              ? formatCurrencyMillions(totalRevenueTzsMillions, currency)
              : card.key === "cashCollected"
                ? formatCurrencyMillions(cashCollectedTzsMillions, currency)
                : card.key === "arOutstanding"
                  ? formatCurrencyMillions(arOutstandingTzsMillions, currency)
                  : "N/A"}
          </p>
          <p className={`text-sm mt-2 ${card.subtitleClassName}`}>{card.subtitle}</p>
        </div>
      ))}
    </div>
  );
}
