/**
 * Optional strict link OIGE → [@BIS_OLPI]: BaseType must match loading permit ObjType.
 * Set LOADING_PERMIT_BASE_TYPE in env to the numeric ObjType from your database (e.g. from OUDO).
 * If unset, only U_BaseDocNo = P.DocEntry is used (may be sufficient if unique).
 */
export function loadingPermitBaseTypeSqlPredicate(gateAlias = "G"): string | null {
  const raw = process.env.LOADING_PERMIT_BASE_TYPE;
  if (raw === undefined || raw === "") {
    return null;
  }
  const n = parseInt(String(raw), 10);
  if (!Number.isFinite(n)) {
    return null;
  }
  return `${gateAlias}.BaseType = ${n}`;
}
