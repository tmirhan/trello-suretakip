/**
 * storageService.js
 * -----------------------------------------------------------------------
 * Trello Power-Up Storage (t.get / t.set / t.remove) üzerine ince bir
 * katman. Trello, storage'ı otomatik olarak "board", "card", "member",
 * "organization" bağlamına göre sunucu tarafında saklar — bu sayede:
 *   - Board değiştiğinde veriler karışmaz (her board kendi verisini görür).
 *   - Tarayıcı kapansa/sekme kapansa da veri kaybolmaz (sunucu tarafı).
 * Bu modül bu davranışı DEĞİŞTİRMEZ, sadece tutarlı ve hataya dayanıklı
 * bir arayüz sağlar.
 *
 * Kullanılan anahtarlar tek bir yerde (KEYS) toplanmıştır ki farklı
 * dosyalar birbirini ezmesin.
 * -----------------------------------------------------------------------
 */

/* global TrelloPowerUp */

(function initStorageService(root) {
  /** Tüm modüllerin ortak kullandığı Power-Up Storage anahtarları. */
  const KEYS = {
    /** Kartın HMK hesaplama sonucu (mevcut özellik — DEĞİŞMEDİ) */
    CARD_HMK_SON_GUN: 'hmkSonGun',

    /** { [cardId]: SnoozeEntry } biçiminde board-shared harita */
    HIDDEN_CARDS_MAP: 'hmk_hidden_cards',

    /** Bildirim ayarları (board-shared) */
    SETTINGS: 'hmk_settings',

    /** Gönderilmiş eşik bildirimlerinin tekilleştirme kaydı (board-shared) */
    SENT_THRESHOLDS: 'hmk_sent_thresholds',

    /** Bildirim geçmişi (board-shared, dizi, en yeni sonda) */
    NOTIFICATION_LOG: 'hmk_notification_log',

    /** Son planlı kontrolün ne zaman yapıldığı (board-shared) */
    LAST_SCHEDULER_RUN: 'hmk_last_scheduler_run',
  };

  // ⚠️ Trello Power-Up storage, tek bir anahtar için 4096 karakter
  // sınırı uygular ("PluginData length of 4096 characters exceeded").
  // Sabit bir "200 kayıt" sınırı bu limiti kolayca aşar (gerçekçi
  // kart adları/alıcı listeleriyle bir kayıt ~150-350 karakter tutar).
  // Bu yüzden budama, kayıt SAYISINA değil, serileştirilmiş TOPLAM
  // karakter uzunluğuna göre yapılır; güvenli pay bırakmak için hedef
  // 3500 karakterdir (4096'nın altında).
  const NOTIFICATION_LOG_CHAR_BUDGET = 3500;

  /**
   * Board-shared bir anahtarı okur; yoksa varsayılan değeri döndürür.
   * Trello, tanımsız bir anahtar okunduğunda reject ETMEZ (undefined
   * döner) ancak bazı sürümlerde reddedebildiği için try/catch ile
   * sarılmıştır.
   * @param {TrelloPowerUp.Iframe} t
   * @param {string} key
   * @param {*} fallback
   * @returns {Promise<*>}
   */
  async function getBoardShared(t, key, fallback) {
    try {
      const value = await t.get('board', 'shared', key);
      return value === undefined || value === null ? fallback : value;
    } catch (err) {
      console.error('[StorageService] getBoardShared hata:', key, err);
      return fallback;
    }
  }

  /**
   * Board-shared bir anahtara değer yazar.
   * @param {TrelloPowerUp.Iframe} t
   * @param {string} key
   * @param {*} value
   * @returns {Promise<void>}
   */
  async function setBoardShared(t, key, value) {
    try {
      await t.set('board', 'shared', key, value);
    } catch (err) {
      console.error('[StorageService] setBoardShared hata:', key, err);
      throw err;
    }
  }

  /**
   * Card-shared bir anahtarı okur (yalnızca kart bağlamındaki t için).
   * @param {TrelloPowerUp.Iframe} t
   * @param {string} key
   * @param {*} fallback
   */
  async function getCardShared(t, key, fallback) {
    try {
      const value = await t.get('card', 'shared', key);
      return value === undefined || value === null ? fallback : value;
    } catch (err) {
      console.error('[StorageService] getCardShared hata:', key, err);
      return fallback;
    }
  }

  /**
   * Card-shared bir anahtara değer yazar.
   * @param {TrelloPowerUp.Iframe} t
   * @param {string} key
   * @param {*} value
   */
  async function setCardShared(t, key, value) {
    try {
      await t.set('card', 'shared', key, value);
    } catch (err) {
      console.error('[StorageService] setCardShared hata:', key, err);
      throw err;
    }
  }

  /**
   * Bildirim geçmişine bir kayıt ekler; log belirli bir uzunluğu
   * aştığında en eski kayıtları budar (sınırsız büyümeyi önler).
   * @param {TrelloPowerUp.Iframe} t
   * @param {Object} entry - { cardId, cardName, listName, dueISO, threshold, channel, recipient, status, error, sentAtISO }
   */
  async function appendNotificationLog(t, entry) {
    const log = await getBoardShared(t, KEYS.NOTIFICATION_LOG, []);
    log.push(entry);

    // En eskiden başlayarak, JSON boyutu bütçenin altına inene kadar buda.
    // Bu, sabit bir kayıt sayısı yerine gerçek karakter uzunluğuna göre
    // çalıştığından, uzun kart adları/alıcı listeleri olsa bile
    // t.set()'in 4096 karakter limitini asla aşmaz.
    let trimmed = log;
    while (trimmed.length > 1 && JSON.stringify(trimmed).length > NOTIFICATION_LOG_CHAR_BUDGET) {
      trimmed = trimmed.slice(1);
    }
    // Tek bir kayıt bile bütçeyi aşıyorsa (aşırı uzun hata mesajı vb.),
    // o kaydı da güvenli bir uzunluğa kırp.
    if (trimmed.length === 1 && JSON.stringify(trimmed).length > NOTIFICATION_LOG_CHAR_BUDGET) {
      trimmed = [{ ...trimmed[0], error: (trimmed[0].error || '').slice(0, 200) }];
    }

    await setBoardShared(t, KEYS.NOTIFICATION_LOG, trimmed);
  }

  const StorageService = {
    KEYS,
    getBoardShared,
    setBoardShared,
    getCardShared,
    setCardShared,
    appendNotificationLog,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = StorageService;
  } else {
    root.StorageService = StorageService;
  }
})(typeof window !== 'undefined' ? window : globalThis);
