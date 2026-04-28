/**
 * Parse SAP-style date string + numeric time for OLPI / OIGE headers.
 * Time: seconds-from-midnight when 0–86399; else HHMM / HHMMSS-style when parsable.
 */
export function parseSapDateWithTime(
  dateStr: string | null | undefined,
  timeNum: number | null | undefined
): Date | null {
  if (dateStr == null || String(dateStr).trim() === "") return null;
  const datePart = new Date(dateStr);
  if (isNaN(datePart.getTime())) return null;
  const mid = new Date(datePart);
  mid.setHours(0, 0, 0, 0);

  if (typeof timeNum !== "number" || !Number.isFinite(timeNum)) {
    return mid;
  }

  if (timeNum >= 0 && timeNum < 86400) {
    return new Date(mid.getTime() + timeNum * 1000);
  }

  if (timeNum >= 0 && timeNum <= 235959) {
    const sec = timeNum % 100;
    const min = Math.floor((timeNum % 10000) / 100);
    const hour = Math.floor(timeNum / 10000);
    if (hour <= 23 && min <= 59 && sec <= 59) {
      return new Date(
        mid.getTime() + (((hour * 60 + min) * 60 + sec) * 1000)
      );
    }
  }

  return mid;
}

/** Hours from permit issue (OLPI) to gate exit (OIGE); null if invalid or exit before issue. */
export function turnaroundHoursBetween(
  issued: Date | null,
  exited: Date | null
): number | null {
  if (!issued || !exited) return null;
  const ms = exited.getTime() - issued.getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  return ms / (1000 * 60 * 60);
}
