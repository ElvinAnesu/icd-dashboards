"use client";

import { useCallback, useMemo, useState } from "react";
import DateFilter from "@/app/components/DateFilter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ArAgingAnalysisChart from "../components/icd-rev/ArAgingAnalysisChart";
import CashPositionCards from "../components/icd-rev/CashPositionCards";
import RevenueByServiceTypeChart from "../components/icd-rev/RevenueByServiceTypeChart";
import WaivedSalesOrdersChart from "../components/icd-rev/WaivedSalesOrdersChart";
import type { CashflowCurrency } from "../components/icd-rev/currency";

type DateFilterOption = "today" | "last7days" | "last3months" | "custom";

export default function IcdRevenueDashboard() {
  const [filterType, setFilterType] = useState<DateFilterOption>("today");
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [currency, setCurrency] = useState<CashflowCurrency>("TZS");

  const handleFilterChange = useCallback(
    (newFilterType: DateFilterOption, newStartDate?: Date, newEndDate?: Date) => {
      setFilterType(newFilterType);
      setStartDate(newStartDate);
      setEndDate(newEndDate);
    },
    []
  );

  const selectedRangeText = useMemo(() => {
    if (filterType !== "custom") return null;
    if (!startDate && !endDate) return "Custom range selected";
    if (startDate && endDate) {
      return `Range: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
    }
    if (startDate) return `From ${startDate.toLocaleDateString()}`;
    return `Until ${endDate?.toLocaleDateString()}`;
  }, [filterType, startDate, endDate]);

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              ICD Revenue
            </h1>
            <p className="text-slate-600">Track billed sales, collections, and receivables</p>
            {selectedRangeText && (
              <p className="text-xs text-slate-500 mt-2">{selectedRangeText}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Select
              value={currency}
              onValueChange={(value) => setCurrency(value as CashflowCurrency)}
            >
              <SelectTrigger className="w-[120px] h-9 bg-white border-2 border-slate-300 font-medium shadow-sm hover:bg-slate-50 hover:border-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="TZS" className="text-slate-900">
                  TZS
                </SelectItem>
                <SelectItem value="USD" className="text-slate-900">
                  USD
                </SelectItem>
              </SelectContent>
            </Select>
            <DateFilter onFilterChange={handleFilterChange} />
          </div>
        </div>

        <CashPositionCards
          currency={currency}
          filterType={filterType}
          startDate={startDate}
          endDate={endDate}
        />
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-1">Revenue overview</h2>
          <RevenueByServiceTypeChart
            currency={currency}
            filterType={filterType}
            startDate={startDate}
            endDate={endDate}
          />
        </div>
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ArAgingAnalysisChart
            currency={currency}
            filterType={filterType}
            startDate={startDate}
            endDate={endDate}
          />
          <WaivedSalesOrdersChart
            currency={currency}
            filterType={filterType}
            startDate={startDate}
            endDate={endDate}
          />
        </div>
      </div>
    </div>
  );
}
