/** Mirrors prime-api scheduling: day + month → next occurrence at local wall time (Asia/Manila, 09:00). */

export const APPOINTMENT_TZ = "Asia/Manila";
export const APPOINTMENT_START_HOUR = 9;
export const APPOINTMENT_START_MINUTE = 0;
export const MIN_HOURS_BEFORE_APPOINTMENT = 3;
/** User may cancel only within this many hours after the appointment was booked (`created_at`). */
export const HOURS_AFTER_BOOKING_TO_CANCEL = 3;
const MS_PER_HOUR = 60 * 60 * 1000;

/**
 * Parse API `created_at` to UTC milliseconds for cancel countdown.
 * Handles ISO with offset, naive ISO/Postgres `YYYY-MM-DD HH:mm:ss` (treated as UTC),
 * and microsecond fractions (truncated to ms).
 */
export function parseApiCreatedAtUtcMs(raw: string | undefined | null): number | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;

  if (/^\d+$/.test(s)) {
    const n = Number(s);
    if (!Number.isFinite(n)) return null;
    if (n > 1e14) return n;
    if (n > 1e12) return n;
    if (n > 1e9) return n * 1000;
    return null;
  }

  let t = s.includes("T") ? s : s.replace(" ", "T");
  t = t.replace(/(\.\d{3})\d+(?=[Zz+-]|$)/, "$1");

  const hasTz =
    /[Zz]$/.test(t) ||
    /[+-]\d{2}:?\d{2}$/.test(t) ||
    /[+-]\d{2}:\d{2}:\d{2}$/.test(t);
  if (!hasTz) t += "Z";

  const ms = Date.parse(t);
  return Number.isFinite(ms) ? ms : null;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

function getManilaYMD(ms: number): { y: number; m: number; d: number } {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone: APPOINTMENT_TZ,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
  const parts = f.formatToParts(new Date(ms));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { y: get("year"), m: get("month"), d: get("day") };
}

/** Philippines is UTC+8 year-round (no DST). */
function manilaWallToUtcMs(
  year: number,
  monthIndex0: number,
  day: number,
  hour: number,
  minute: number,
): number {
  const utcHour = hour - 8;
  return Date.UTC(year, monthIndex0, day, utcHour, minute, 0, 0);
}

function manilaWallMatchesUtcMs(
  utcMs: number,
  year: number,
  monthIndex0: number,
  day: number,
  hour: number,
  minute: number,
): boolean {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone: APPOINTMENT_TZ,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });
  const parts = f.formatToParts(new Date(utcMs));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return (
    get("year") === year &&
    get("month") === monthIndex0 + 1 &&
    get("day") === day &&
    get("hour") === hour &&
    get("minute") === minute
  );
}

/**
 * UTC instant for the next (day, month name) at configured Manila wall time, or null if invalid.
 */
export function resolveAppointmentStartUtcMs(
  dayNum: number,
  monthName: string,
  referenceMs = Date.now(),
): number | null {
  const monthIndex0 = MONTH_NAMES.indexOf(
    monthName as (typeof MONTH_NAMES)[number],
  );
  if (monthIndex0 < 0 || !Number.isFinite(dayNum) || dayNum < 1 || dayNum > 31) {
    return null;
  }

  const { y } = getManilaYMD(referenceMs);
  let year = y;
  let ms = manilaWallToUtcMs(
    year,
    monthIndex0,
    dayNum,
    APPOINTMENT_START_HOUR,
    APPOINTMENT_START_MINUTE,
  );
  if (!manilaWallMatchesUtcMs(ms, year, monthIndex0, dayNum, APPOINTMENT_START_HOUR, APPOINTMENT_START_MINUTE)) {
    return null;
  }
  if (ms < referenceMs) {
    year += 1;
    ms = manilaWallToUtcMs(
      year,
      monthIndex0,
      dayNum,
      APPOINTMENT_START_HOUR,
      APPOINTMENT_START_MINUTE,
    );
    if (!manilaWallMatchesUtcMs(ms, year, monthIndex0, dayNum, APPOINTMENT_START_HOUR, APPOINTMENT_START_MINUTE)) {
      return null;
    }
  }
  return ms;
}

export function canBookAtLeastHoursAhead(
  dayNum: number,
  monthName: string,
  referenceMs = Date.now(),
): boolean {
  const start = resolveAppointmentStartUtcMs(dayNum, monthName, referenceMs);
  if (start == null) return false;
  return start >= referenceMs + MIN_HOURS_BEFORE_APPOINTMENT * MS_PER_HOUR;
}

/** Last moment (UTC ms) cancellation is still allowed — booking time + HOURS_AFTER_BOOKING_TO_CANCEL. */
export function cancelAllowedUntilUtcMs(createdAtMs: number): number | null {
  if (!Number.isFinite(createdAtMs)) return null;
  return createdAtMs + HOURS_AFTER_BOOKING_TO_CANCEL * MS_PER_HOUR;
}

export function mayCancelAppointment(createdAtMs: number, nowMs: number): boolean {
  const until = cancelAllowedUntilUtcMs(createdAtMs);
  if (until == null) return false;
  return nowMs <= until;
}

/** Countdown to the cancel window end (0 once past). */
export function secondsUntilCancelDeadline(createdAtMs: number, nowMs: number): number {
  const until = cancelAllowedUntilUtcMs(createdAtMs);
  if (until == null) return 0;
  return Math.max(0, Math.floor((until - nowMs) / 1000));
}

export { MONTH_NAMES as APPOINTMENT_MONTH_NAMES };
