/**
 * hmk.js — HMK m.90 / m.91 / m.93 hesap mantığı (değiştirilmedi).
 */

(function initHmkModule(root) {
  const DU = typeof DateUtils !== 'undefined' ? DateUtils : root.DateUtils;
  const HD = typeof Holidays !== 'undefined' ? Holidays : root.Holidays;

  const TEBLIGAT_TURU = {
    E_TEBLIGAT: 'e-teblig',
    TEFHIM: 'tefhim',
    FIZIKI: 'fiziki',
  };

  const SURE_BIRIMI = {
    GUN: 'gun',
    HAFTA: 'hafta',
    AY: 'ay',
  };

  function calculateTebligEdilmisSayilanTarih(girilenTarih, tebligatTuru) {
    switch (tebligatTuru) {
      case TEBLIGAT_TURU.E_TEBLIGAT:
        return DU.addDays(girilenTarih, 5);
      case TEBLIGAT_TURU.TEFHIM:
      case TEBLIGAT_TURU.FIZIKI:
        return DU.normalizeDate(girilenTarih);
      default:
        throw new Error(`Bilinmeyen tebligat türü: ${tebligatTuru}`);
    }
  }

  function calculateSureBaslangici(tebligEdilmisSayilanTarih) {
    return DU.addDays(tebligEdilmisSayilanTarih, 1);
  }

  function calculateHamSonGun(sureBaslangici, miktar, birim) {
    if (!Number.isFinite(miktar) || miktar <= 0) {
      throw new Error('Süre miktarı pozitif bir sayı olmalıdır.');
    }

    switch (birim) {
      case SURE_BIRIMI.GUN:
        return DU.addDays(sureBaslangici, miktar - 1);
      case SURE_BIRIMI.HAFTA:
        return DU.addDays(sureBaslangici, miktar * 7 - 1);
      case SURE_BIRIMI.AY:
        return DU.addMonths(sureBaslangici, miktar);
      default:
        throw new Error(`Bilinmeyen süre birimi: ${birim}`);
    }
  }

  function adjustForWeekendAndHolidays(hamSonGun) {
    let candidate = DU.normalizeDate(hamSonGun);
    const uzatmaNedenleri = [];
    let missingReligiousData = false;
    let uzatildiMi = false;

    const MAX_ITER = 30;
    let iter = 0;

    while (iter < MAX_ITER) {
      const holidayCheck = HD.isOfficialHoliday(candidate);
      if (holidayCheck.missingReligiousData) {
        missingReligiousData = true;
      }

      if (DU.isWeekend(candidate)) {
        uzatildiMi = true;
        uzatmaNedenleri.push(`${DU.formatDateTR(candidate)} hafta sonuna denk geliyor`);
        candidate = DU.addDays(candidate, 1);
        iter += 1;
        continue;
      }

      if (holidayCheck.isHoliday) {
        uzatildiMi = true;
        uzatmaNedenleri.push(`${DU.formatDateTR(candidate)} "${holidayCheck.name}" resmî tatiline denk geliyor`);
        candidate = DU.addDays(candidate, 1);
        iter += 1;
        continue;
      }

      break;
    }

    return { sonGun: candidate, uzatildiMi, uzatmaNedenleri, missingReligiousData };
  }

  const HMK_API = {
    TEBLIGAT_TURU,
    SURE_BIRIMI,
    calculateTebligEdilmisSayilanTarih,
    calculateSureBaslangici,
    calculateHamSonGun,
    adjustForWeekendAndHolidays,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = HMK_API;
  } else {
    root.HMK = HMK_API;
  }
})(typeof window !== 'undefined' ? window : globalThis);
