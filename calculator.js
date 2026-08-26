/**
 * calculator.js — HMK modüllerini birleştiren orkestratör (değiştirilmedi).
 */

(function initCalculatorModule(root) {
  const DU = typeof DateUtils !== 'undefined' ? DateUtils : root.DateUtils;
  const H = typeof HMK !== 'undefined' ? HMK : root.HMK;

  function hesaplaSure(girdi) {
    const { baslangicTarihi, tebligatTuru, sureMiktari, sureBirimi } = girdi;

    if (!(baslangicTarihi instanceof Date) || Number.isNaN(baslangicTarihi.getTime())) {
      throw new Error('Geçersiz başlangıç tarihi.');
    }
    if (!Object.values(H.TEBLIGAT_TURU).includes(tebligatTuru)) {
      throw new Error('Lütfen bir tebligat türü seçin.');
    }
    if (!Object.values(H.SURE_BIRIMI).includes(sureBirimi)) {
      throw new Error('Geçersiz süre birimi.');
    }
    if (!Number.isFinite(sureMiktari) || sureMiktari <= 0) {
      throw new Error('Lütfen geçerli bir süre miktarı girin.');
    }

    const tebligEdilmisSayilanTarih = H.calculateTebligEdilmisSayilanTarih(
      baslangicTarihi,
      tebligatTuru
    );

    const sureBaslangici = H.calculateSureBaslangici(tebligEdilmisSayilanTarih);

    const hamSonGun = H.calculateHamSonGun(sureBaslangici, sureMiktari, sureBirimi);

    const { sonGun, uzatildiMi, uzatmaNedenleri, missingReligiousData } =
      H.adjustForWeekendAndHolidays(hamSonGun);

    return {
      baslangicTarihi: DU.normalizeDate(baslangicTarihi),
      tebligatTuru,
      tebligEdilmisSayilanTarih,
      sureBaslangici,
      sureMiktari,
      sureBirimi,
      hamSonGun,
      sonGun,
      tatilNedeniyleUzatildi: uzatildiMi,
      uzatmaNedenleri,
      dinTatiliVerisiEksik: missingReligiousData,
    };
  }

  function tebligatTuruEtiketi(tebligatTuru) {
    switch (tebligatTuru) {
      case H.TEBLIGAT_TURU.E_TEBLIGAT:
        return 'E-Tebliğ';
      case H.TEBLIGAT_TURU.TEFHIM:
        return 'Tefhim';
      case H.TEBLIGAT_TURU.FIZIKI:
        return 'Fiziki Tebliğ';
      default:
        return tebligatTuru;
    }
  }

  function sureEtiketi(miktar, birim) {
    const birimMetni = { gun: 'Gün', hafta: 'Hafta', ay: 'Ay' }[birim] || birim;
    return `${miktar} ${birimMetni}`;
  }

  const CALC_API = { hesaplaSure, tebligatTuruEtiketi, sureEtiketi };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = CALC_API;
  } else {
    root.Calculator = CALC_API;
  }
})(typeof window !== 'undefined' ? window : globalThis);
