/**
 * schedulerService.js
 * -----------------------------------------------------------------------
 * ReminderService.scanBoardAndNotify()'ın NE ZAMAN çalışacağını
 * yönetir. İki tetikleyici vardır:
 *   1. Otomatik: connector.html açık olduğu sürece belirli aralıklarla
 *      (varsayılan 15 dakika) — bkz. power-up.js.
 *   2. Manuel: pano üzerindeki "Şimdi Kontrol Et" board-button'ı.
 *
 * ⚠️ PLATFORM SINIRI: Bu "arka plan" çalışması yalnızca bir kullanıcı
 * Trello'yu (bu board'u) tarayıcıda AÇIK tuttuğu sürece işler — Trello
 * Power-Up'ları, hiç kimse board'u açmadığında sunucu tarafında
 * ÇALIŞTIRILAMAZ (Trello bu tür bir "arka plan işçisi" API'si sunmaz).
 * Kimsenin board'u açmadığı saatlerde de kesin teslimat isteniyorsa,
 * ayrı bir sunucu tarafı zamanlayıcı (örn. Vercel Cron + Trello REST
 * API + bu dosyadaki ile aynı mantık) kurulması gerekir — bkz.
 * README.md § "Platform Sınırları — Dürüst Bir Değerlendirme".
 *
 * PERFORMANS: runIfDue(), son çalışmadan bu yana yeterli süre
 * geçmediyse HİÇBİR API çağrısı yapmaz (StorageService'teki tek bir
 * zaman damgasını okur ve çıkar) — bu, "gereksiz API çağrısı yapılmasın"
 * gereksinimini karşılar.
 * -----------------------------------------------------------------------
 */

/* global StorageService, ReminderService */

(function initSchedulerService(root) {
  const SS = typeof StorageService !== 'undefined' ? StorageService : root.StorageService;

  const DEFAULT_INTERVAL_MS = 15 * 60 * 1000; // 15 dakika

  let intervalHandle = null;

  /**
   * Son taramadan bu yana `minIntervalMs` geçmişse yeni bir tarama
   * başlatır; geçmediyse hiçbir şey yapmadan döner (ekstra API çağrısı
   * yapılmaz).
   * @param {TrelloPowerUp.Iframe} t
   * @param {number} [minIntervalMs]
   * @returns {Promise<{ran: boolean, result?: Object}>}
   */
  async function runIfDue(t, minIntervalMs) {
    const interval = minIntervalMs || DEFAULT_INTERVAL_MS;
    const lastRunISO = await SS.getBoardShared(t, SS.KEYS.LAST_SCHEDULER_RUN, null);

    if (lastRunISO) {
      const elapsed = Date.now() - new Date(lastRunISO).getTime();
      if (elapsed < interval) {
        return { ran: false };
      }
    }

    const result = await ReminderService.scanBoardAndNotify(t);
    return { ran: true, result };
  }

  /**
   * Aralık kontrolünü atlayıp taramayı hemen çalıştırır (manuel "Şimdi
   * Kontrol Et" butonu için).
   * @param {TrelloPowerUp.Iframe} t
   */
  async function runNow(t) {
    return ReminderService.scanBoardAndNotify(t);
  }

  /**
   * connector.html yaşam döngüsü boyunca periyodik kontrolü başlatır.
   * Birden fazla çağrılırsa önceki interval temizlenir (çift
   * zamanlayıcı oluşmaz).
   * @param {TrelloPowerUp.Iframe} t
   * @param {number} [intervalMs]
   */
  function startPeriodicCheck(t, intervalMs) {
    stopPeriodicCheck();
    const interval = intervalMs || DEFAULT_INTERVAL_MS;

    // İlk kontrolü hemen (ama yine runIfDue üzerinden, gereksiz tekrar
    // olmasın diye) tetikle, sonra periyodik devam et.
    runIfDue(t, interval).catch((err) => console.error('[SchedulerService] İlk kontrol hatası:', err));

    intervalHandle = setInterval(() => {
      runIfDue(t, interval).catch((err) => console.error('[SchedulerService] Periyodik kontrol hatası:', err));
    }, interval);
  }

  function stopPeriodicCheck() {
    if (intervalHandle) {
      clearInterval(intervalHandle);
      intervalHandle = null;
    }
  }

  const SchedulerService = { runIfDue, runNow, startPeriodicCheck, stopPeriodicCheck, DEFAULT_INTERVAL_MS };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SchedulerService;
  } else {
    root.SchedulerService = SchedulerService;
  }
})(typeof window !== 'undefined' ? window : globalThis);
