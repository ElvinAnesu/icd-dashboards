/**
 * Builds SQL fragments for dashboard-style date filters (same semantics as containers APIs).
 * `columnExpr` must be a trusted column reference (e.g. `P.U_DocDate`, `G.U_GateOutDate`).
 */
export function buildDashboardDateConditions(
  columnExpr: string,
  filterType: string | null,
  startDate: string | null,
  endDate: string | null
): string[] {
  const conditions: string[] = [];

  if (!filterType) {
    return conditions;
  }

  const now = new Date();

  switch (filterType) {
    case "today": {
      const filterStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      conditions.push(`${columnExpr} >= '${filterStartDate.toISOString()}'`);
      break;
    }
    case "last7days": {
      const filterStartDate = new Date(now);
      filterStartDate.setDate(now.getDate() - 7);
      conditions.push(`${columnExpr} >= '${filterStartDate.toISOString()}'`);
      break;
    }
    case "last3months": {
      const filterStartDate = new Date(now);
      filterStartDate.setMonth(now.getMonth() - 3);
      conditions.push(`${columnExpr} >= '${filterStartDate.toISOString()}'`);
      break;
    }
    case "custom":
      if (startDate) {
        conditions.push(`${columnExpr} >= '${startDate}'`);
      }
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        conditions.push(`${columnExpr} <= '${endDateTime.toISOString()}'`);
      }
      break;
    default:
      break;
  }

  return conditions;
}
