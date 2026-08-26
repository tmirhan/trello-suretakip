/**
 * dateUtils.js
 * -----------------------------------------------------------------------
 * Timezone-safe date yardımcı fonksiyonları.
 * -----------------------------------------------------------------------
 */

function normalizeDate(date) {
  const d = new Date(date.getTime());
  d.setHours(12, 0, 0, 0);
  return d;
}

function parseDateInput(value) {
  if (!value) {
    throw new Error('Geçersiz tarih girişi: boş değer.');
  }

  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return normalizeDate(new Date(Number(y), Number(m) - 1, Number(d)));
  }

  const trMatch = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(value);
  if (trMatch) {
    const [, d, m, y] = trMatch;
    return normalizeDate(new Date(Number(y), Number(m) - 1, Number(d)));
  }

  throw new Error(`Tanınmayan tarih biçimi: ${value}`);
}

function toISODateString(date) {
  const d = normalizeDate(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDateTR(date) {
  const d = normalizeDate(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

function addDays(date, days) {
  const d = normalizeDate(date);
  d.setDate(d.getDate() + days);
  return normalizeDate(d);
}

function addMonths(date, months) {
  const d = normalizeDate(date);
  const originalDay = d.getDate();

  const targetMonthIndex = d.getMonth() + months;
  const targetDate = new Date(d.getFullYear(), targetMonthIndex, 1, 12, 0, 0, 0);

  const lastDayOfTargetMonth = getLastDayOfMonth(targetDate);

  const day = Math.min(originalDay, lastDayOfTargetMonth);
  targetDate.setDate(day);

  return normalizeDate(targetDate);
}

function addWeeks(date, weeks) {
  return addDays(date, weeks * 7);
}

function getLastDayOfMonth(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  return new Date(year, month + 1, 0).getDate();
}

function isWeekend(date) {
  const day = normalizeDate(date).getDay();
  return day === 0 || day === 6;
}

function isSameDate(a, b) {
  const da = normalizeDate(a);
  const db = normalizeDate(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

function today() {
  return normalizeDate(new Date());
}

function daysBetween(a, b) {
  const da = normalizeDate(a);
  const db = normalizeDate(b);
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((db.getTime() - da.getTime()) / msPerDay);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    normalizeDate,
    parseDateInput,
    toISODateString,
    formatDateTR,
    addDays,
    addMonths,
    addWeeks,
    getLastDayOfMonth,
    isWeekend,
    isSameDate,
    today,
    daysBetween,
  };
} else {
  window.DateUtils = {
    normalizeDate,
    parseDateInput,
    toISODateString,
    formatDateTR,
    addDays,
    addMonths,
    addWeeks,
    getLastDayOfMonth,
    isWeekend,
    isSameDate,
    today,
    daysBetween,
  };
}
