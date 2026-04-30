export type DateFilterOption = "today" | "last7days" | "last3months" | "custom";

export function inclusiveDayCount(start: Date, end: Date): number {
  const s = new Date(start);
  const e = new Date(end);
  s.setHours(0, 0, 0, 0);
  e.setHours(0, 0, 0, 0);
  return Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
}

/** Matches RevenueByServiceTypeChart: bar for today or custom range under 7 days; line otherwise. */
export function resolveChartMode(
  filterType: DateFilterOption,
  startDate?: Date,
  endDate?: Date
): "bar" | "line" {
  if (filterType === "today") {
    return "bar";
  }
  if (filterType === "last7days" || filterType === "last3months") {
    return "line";
  }
  if (filterType === "custom") {
    if (!startDate || !endDate) {
      return "line";
    }
    const days = inclusiveDayCount(startDate, endDate);
    if (days >= 7) {
      return "line";
    }
    return "bar";
  }
  return "line";
}

export function resolveChartModeFromQueryParams(
  filterType: string | null,
  startDateStr: string | null,
  endDateStr: string | null
): "bar" | "line" {
  const ft = (filterType ?? "today") as DateFilterOption;
  if (ft === "today") {
    return "bar";
  }
  if (ft === "last7days" || ft === "last3months") {
    return "line";
  }
  if (ft === "custom") {
    if (!startDateStr || !endDateStr) {
      return "line";
    }
    const days = inclusiveDayCount(new Date(startDateStr), new Date(endDateStr));
    return days >= 7 ? "line" : "bar";
  }
  return "line";
}

/** Trend SQL: weekly buckets for long ranges, daily otherwise. */
export function useWeeklyTrendBuckets(
  filterType: string | null,
  startDateStr: string | null,
  endDateStr: string | null
): boolean {
  if (filterType === "last3months") {
    return true;
  }
  if (filterType === "custom" && startDateStr && endDateStr) {
    return inclusiveDayCount(new Date(startDateStr), new Date(endDateStr)) > 14;
  }
  return false;
}
