"use client";

import { useState, useEffect } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type DateFilterOption = "today" | "last7days" | "last3months" | "custom";

interface DateFilterProps {
  onFilterChange?: (filterType: DateFilterOption, startDate?: Date, endDate?: Date) => void;
}

export default function DateFilter({ onFilterChange }: DateFilterProps) {
  const [selectedFilter, setSelectedFilter] = useState<DateFilterOption>("today");
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();

  useEffect(() => {
    if (onFilterChange) {
      onFilterChange(selectedFilter, startDate, endDate);
    }
  }, [selectedFilter, startDate, endDate, onFilterChange]);

  return (
    <div className="flex items-center gap-3">
      <Select
        value={selectedFilter}
        onValueChange={(value) => setSelectedFilter(value as DateFilterOption)}
      >
        <SelectTrigger className="w-[180px] h-9 bg-white border-2 border-slate-300 font-medium shadow-sm hover:bg-slate-50 hover:border-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 [&>span]:text-slate-900 [&>span]:font-semibold">
          <SelectValue placeholder="Select period" className="text-slate-900 font-semibold" />
        </SelectTrigger>
        <SelectContent className="bg-white">
          <SelectItem value="today" className="text-slate-900">Today</SelectItem>
          <SelectItem value="last7days" className="text-slate-900">Last 7 Days</SelectItem>
          <SelectItem value="last3months" className="text-slate-900">Last 3 Months</SelectItem>
          <SelectItem value="custom" className="text-slate-900">Custom</SelectItem>
        </SelectContent>
      </Select>

      {selectedFilter === "custom" && (
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger>
              <div className="inline-flex h-9 w-[140px] items-center justify-start gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-400 cursor-pointer shadow-sm transition-colors">
                <CalendarIcon className="h-4 w-4 text-slate-500" />
                <span>{startDate ? format(startDate, "MMM dd, yyyy") : "Start date"}</span>
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={setStartDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <span className="text-slate-600 font-medium">to</span>

          <Popover>
            <PopoverTrigger>
              <div className="inline-flex h-9 w-[140px] items-center justify-start gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-400 cursor-pointer shadow-sm transition-colors">
                <CalendarIcon className="h-4 w-4 text-slate-500" />
                <span>{endDate ? format(endDate, "MMM dd, yyyy") : "End date"}</span>
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={setEndDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );
}
