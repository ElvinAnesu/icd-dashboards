"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";
import DateFilter from "@/app/components/DateFilter";
import { SEARCH_QUERY_PARAM } from "@/lib/apiTableSearch";

type DateFilterOption = "today" | "last7days" | "last3months" | "custom";

type Row = Record<string, unknown>;

function collectColumnKeys(rows: Row[]): string[] {
  const seen = new Set<string>();
  const order: string[] = [];
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!seen.has(key)) {
        seen.add(key);
        order.push(key);
      }
    }
  }
  return order;
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export default function FilteredRecordTablePage({
  title,
  description,
  apiPath,
}: {
  title: string;
  description: string;
  apiPath: string;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<DateFilterOption>("today");
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [refreshSignal, setRefreshSignal] = useState(0);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedSearch(search.trim().slice(0, 200));
    }, 350);
    return () => window.clearTimeout(t);
  }, [search]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
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
      if (debouncedSearch) {
        params.set(SEARCH_QUERY_PARAM, debouncedSearch);
      }
      const res = await fetch(`${apiPath}?${params.toString()}`);
      const data: unknown = await res.json();
      if (!res.ok) {
        const msg =
          data &&
          typeof data === "object" &&
          "error" in data &&
          typeof (data as { error: unknown }).error === "string"
            ? (data as { error: string }).error
            : "Request failed";
        setError(msg);
        setRows([]);
        return;
      }
      if (!Array.isArray(data)) {
        setRows([]);
        return;
      }
      setRows(data as Row[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [apiPath, filterType, startDate, endDate, debouncedSearch, refreshSignal]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFilterChange = useCallback(
    (newFilterType: DateFilterOption, newStartDate?: Date, newEndDate?: Date) => {
      setFilterType(newFilterType);
      setStartDate(newStartDate);
      setEndDate(newEndDate);
    },
    []
  );

  const columns = collectColumnKeys(rows);

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Link
            href="/icd-operations"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to ICD Operations
          </Link>
        </div>
        <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              {title}
            </h1>
            <p className="text-slate-600">{description}</p>
          </div>
          <div className="flex flex-col items-stretch sm:items-end gap-3">
            <DateFilter
              onFilterChange={handleFilterChange}
              onRefresh={() => setRefreshSignal((n) => n + 1)}
            />
            <label className="relative block w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search (server filter)..."
                className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                autoComplete="off"
              />
            </label>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 text-red-800 px-4 py-3 mb-6">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-slate-600">Loading...</p>
        ) : rows.length === 0 ? (
          <p className="text-slate-600">
            {debouncedSearch
              ? "No records match your search for this period."
              : "No records for this period."}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full text-sm text-left">
              <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  {columns.map((col) => (
                    <th key={col} className="px-3 py-2 whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50/80">
                    {columns.map((col) => {
                      const text = formatCell(row[col]);
                      return (
                        <td
                          key={col}
                          className="px-3 py-2 whitespace-nowrap text-slate-800 max-w-[320px] truncate"
                          title={text}
                        >
                          {text}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
