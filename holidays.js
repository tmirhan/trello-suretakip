/**
 * holidays.js
 * -----------------------------------------------------------------------
 * Türkiye Cumhuriyeti resmî tatilleri.
 * -----------------------------------------------------------------------
 */

const FIXED_HOLIDAYS = [
  { month: 1, day: 1, name: 'Yılbaşı' },
  { month: 4, day: 23, name: 'Ulusal Egemenlik ve Çocuk Bayramı' },
  { month: 5, day: 1, name: 'Emek ve Dayanışma Günü' },
  { month: 5, day: 19, name: "Atatürk'ü Anma, Gençlik ve Spor Bayramı" },
  { month: 7, day: 15, name: 'Demokrasi ve Millî Birlik Günü' },
  { month: 8, day: 30, name: 'Zafer Bayramı' },
  { month: 10, day: 29, name: 'Cumhuriyet Bayramı' },
];

const RELIGIOUS_HOLIDAYS = {
  2025: [
    { start: '2025-03-30', days: 3, name: 'Ramazan Bayramı' },
    { start: '2025-06-06', days: 4, name: 'Kurban Bayramı' },
  ],
  2026: [
    { start: '2026-03-20', days: 3, name: 'Ramazan Bayramı' },
    { start: '2026-05-27', days: 4, name: 'Kurban Bayramı' },
  ],
  2027: [
    { start: '2027-03-09', days: 3, name: 'Ramazan Bayramı' },
    { start: '2027-05-16', days: 4, name: 'Kurban Bayramı' },
  ],
};

function getHolidaySetForYear(year) {
  const set = new Set();

  FIXED_HOLIDAYS.forEach(({ month, day }) => {
    const key = toKey(year, month, day);
    set.add(key);
  });

  const religious = RELIGIOUS_HOLIDAYS[year];
  let missingReligiousData = false;

  if (religious) {
    religious.forEach(({ start, days }) => {
      const [y, m, d] = start.split('-').map(Number);
      const startDate = new Date(y, m - 1, d, 12, 0, 0, 0);
      for (let i = 0; i < days; i += 1) {
        const dt = new Date(startDate.getTime());
        dt.setDate(dt.getDate() + i);
        set.add(toKey(dt.getFullYear(), dt.getMonth() + 1, dt.getDate()));
      }
    });
  } else {
    missingReligiousData = true;
  }

  return { set, missingReligiousData };
}

function isOfficialHoliday(date) {
  const year = date.getFullYear();
  const key = toKey(year, date.getMonth() + 1, date.getDate());

  const { set, missingReligiousData } = getHolidaySetForYear(year);

  const isHol = set.has(key);
  let name = null;
  if (isHol) {
    const fixed = FIXED_HOLIDAYS.find((h) => toKey(year, h.month, h.day) === key);
    if (fixed) {
      name = fixed.name;
    } else {
      const religious = RELIGIOUS_HOLIDAYS[year] || [];
      const match = religious.find((r) => {
        const [y, m, d] = r.start.split('-').map(Number);
        const startDate = new Date(y, m - 1, d, 12, 0, 0, 0);
        const endDate = new Date(startDate.getTime());
        endDate.setDate(endDate.getDate() + r.days - 1);
        const t = new Date(year, date.getMonth(), date.getDate(), 12, 0, 0, 0).getTime();
        return t >= startDate.getTime() && t <= endDate.getTime();
      });
      name = match ? match.name : 'Resmî Tatil';
    }
  }

  return { isHoliday: isHol, name, missingReligiousData };
}

function toKey(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FIXED_HOLIDAYS, RELIGIOUS_HOLIDAYS, getHolidaySetForYear, isOfficialHoliday };
} else {
  window.Holidays = { FIXED_HOLIDAYS, RELIGIOUS_HOLIDAYS, getHolidaySetForYear, isOfficialHoliday };
}
