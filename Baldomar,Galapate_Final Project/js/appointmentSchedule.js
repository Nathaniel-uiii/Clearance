/**
 * Port of prime-next/src/lib/appointmentSchedule.ts — day + month → next slot at
 * Asia/Manila 09:00; 3-hour lead for booking; cancel only within 3h after booking.
 * Use when you add appointment booking to this PHP site (same rules as Clearance API).
 */
(function (global) {
  var APPOINTMENT_TZ = "Asia/Manila";
  var APPOINTMENT_START_HOUR = 9;
  var APPOINTMENT_START_MINUTE = 0;
  var MIN_HOURS_BEFORE_APPOINTMENT = 3;
  var HOURS_AFTER_BOOKING_TO_CANCEL = 3;
  var MS_PER_HOUR = 60 * 60 * 1000;

  var MONTH_NAMES = [
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
  ];

  function getManilaYMD(ms) {
    var f = new Intl.DateTimeFormat("en-US", {
      timeZone: APPOINTMENT_TZ,
      year: "numeric",
      month: "numeric",
      day: "numeric",
    });
    var parts = f.formatToParts(new Date(ms));
    var get = function (t) {
      return Number(parts.find(function (p) {
        return p.type === t;
      }).value);
    };
    return { y: get("year"), m: get("month"), d: get("day") };
  }

  function manilaWallToUtcMs(year, monthIndex0, day, hour, minute) {
    var utcHour = hour - 8;
    return Date.UTC(year, monthIndex0, day, utcHour, minute, 0, 0);
  }

  function manilaWallMatchesUtcMs(utcMs, year, monthIndex0, day, hour, minute) {
    var f = new Intl.DateTimeFormat("en-US", {
      timeZone: APPOINTMENT_TZ,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    });
    var parts = f.formatToParts(new Date(utcMs));
    var get = function (t) {
      return Number(parts.find(function (p) {
        return p.type === t;
      }).value);
    };
    return (
      get("year") === year &&
      get("month") === monthIndex0 + 1 &&
      get("day") === day &&
      get("hour") === hour &&
      get("minute") === minute
    );
  }

  function resolveAppointmentStartUtcMs(dayNum, monthName, referenceMs) {
    if (referenceMs === undefined) referenceMs = Date.now();
    var monthIndex0 = MONTH_NAMES.indexOf(monthName);
    if (
      monthIndex0 < 0 ||
      !Number.isFinite(dayNum) ||
      dayNum < 1 ||
      dayNum > 31
    ) {
      return null;
    }

    var y = getManilaYMD(referenceMs).y;
    var year = y;
    var ms = manilaWallToUtcMs(
      year,
      monthIndex0,
      dayNum,
      APPOINTMENT_START_HOUR,
      APPOINTMENT_START_MINUTE,
    );
    if (
      !manilaWallMatchesUtcMs(
        ms,
        year,
        monthIndex0,
        dayNum,
        APPOINTMENT_START_HOUR,
        APPOINTMENT_START_MINUTE,
      )
    ) {
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
      if (
        !manilaWallMatchesUtcMs(
          ms,
          year,
          monthIndex0,
          dayNum,
          APPOINTMENT_START_HOUR,
          APPOINTMENT_START_MINUTE,
        )
      ) {
        return null;
      }
    }
    return ms;
  }

  function canBookAtLeastHoursAhead(dayNum, monthName, referenceMs) {
    if (referenceMs === undefined) referenceMs = Date.now();
    var start = resolveAppointmentStartUtcMs(dayNum, monthName, referenceMs);
    if (start == null) return false;
    return start >= referenceMs + MIN_HOURS_BEFORE_APPOINTMENT * MS_PER_HOUR;
  }

  function cancelAllowedUntilUtcMs(createdAtMs) {
    if (!Number.isFinite(createdAtMs)) return null;
    return createdAtMs + HOURS_AFTER_BOOKING_TO_CANCEL * MS_PER_HOUR;
  }

  function mayCancelAppointment(createdAtMs, nowMs) {
    var until = cancelAllowedUntilUtcMs(createdAtMs);
    if (until == null) return false;
    return nowMs <= until;
  }

  function secondsUntilCancelDeadline(createdAtMs, nowMs) {
    var until = cancelAllowedUntilUtcMs(createdAtMs);
    if (until == null) return 0;
    return Math.max(0, Math.floor((until - nowMs) / 1000));
  }

  global.AppointmentSchedule = {
    APPOINTMENT_TZ: APPOINTMENT_TZ,
    APPOINTMENT_START_HOUR: APPOINTMENT_START_HOUR,
    APPOINTMENT_START_MINUTE: APPOINTMENT_START_MINUTE,
    MIN_HOURS_BEFORE_APPOINTMENT: MIN_HOURS_BEFORE_APPOINTMENT,
    HOURS_AFTER_BOOKING_TO_CANCEL: HOURS_AFTER_BOOKING_TO_CANCEL,
    MONTH_NAMES: MONTH_NAMES,
    resolveAppointmentStartUtcMs: resolveAppointmentStartUtcMs,
    canBookAtLeastHoursAhead: canBookAtLeastHoursAhead,
    cancelAllowedUntilUtcMs: cancelAllowedUntilUtcMs,
    mayCancelAppointment: mayCancelAppointment,
    secondsUntilCancelDeadline: secondsUntilCancelDeadline,
  };
})(typeof window !== "undefined" ? window : this);
