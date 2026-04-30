/**
 * Maps invoice line descriptions that only differ by container size or cargo type
 * (e.g. 20FT vs 40FT vs GOODS) onto one service name for reporting.
 */
export function bundleServiceDescription(raw: string): string {
  let s = raw.trim().replace(/\s+/g, " ");
  if (!s) {
    return s;
  }

  // Strip trailing variants repeatedly so nested suffixes are removed.
  const trailingVariant =
    /\s+(\d+\s*FT|\d+FT|GOODS|Good|Goods|good)\s*$/i;

  let prev = "";
  while (s !== prev) {
    prev = s;
    s = s.replace(trailingVariant, "").trim();
  }

  return s;
}

/** Stable key for merging rows that share the same bundled service. */
export function bundleServiceKey(raw: string): string {
  return bundleServiceDescription(raw).toUpperCase();
}
