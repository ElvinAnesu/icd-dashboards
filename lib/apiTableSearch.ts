/**
 * Shared server-side table search: optional `search` query param, substring match via CHARINDEX.
 * Uses a bound @search parameter (no string concatenation of user input).
 */
export const SEARCH_QUERY_PARAM = "search";
export const SEARCH_MAX_LEN = 200;

export function normalizeSearchFromParams(searchParams: {
  get(name: string): string | null;
}): string | null {
  const raw = searchParams.get(SEARCH_QUERY_PARAM)?.trim() ?? "";
  if (!raw) return null;
  return raw.length > SEARCH_MAX_LEN ? raw.slice(0, SEARCH_MAX_LEN) : raw;
}

/**
 * SQL predicate: true when @search appears in any of the given columns (substring, case-sensitive per DB collation).
 * Each entry must be a trusted column expression (e.g. `U_MRN`, `P.Remark`, `CAST(P.DocNum AS NVARCHAR(50))`).
 */
export function buildCharIndexSearchSql(columnRefs: string[]): string {
  const parts = columnRefs.map(
    (col) =>
      `CHARINDEX(@search, ISNULL(CAST(${col} AS NVARCHAR(MAX)), N'')) > 0`
  );
  return `(${parts.join(" OR ")})`;
}
