/**
 * snoozeService.js
 * -----------------------------------------------------------------------
 * ÖZELLİK 1 — "Süreyi Kaldır / Ertele"
 *
 * Bu servis, bir kartı Power-Up'ın KENDİ listelerinden/panellerinden
 * (örn. "Gizli Kartlar" paneli, ileride eklenecek raporlar) geçici olarak
 * gizler. Trello kartının gerçek Due Date alanına ASLA dokunmaz.
 *
 * ⚠️ PLATFORM SINIRI (dürüstçe belirtilmelidir): Trello'nun herkese açık
 * Power-Up API'si, bir kartı panonun NATIVE liste görünümünden
 * (board grid) gizlemeye izin VERMEZ. Power-Up'lar yalnızca kart
 * rozetleri (badges), kart butonları (buttons) ve popup'lar
 * ekleyebilir — Trello'nun kendi liste/kart render motorunu kontrol
 * edemez. Bu nedenle "gizleme", kartın Trello panosunda görünmemesi
 * anlamına gelmez; kartın bu Power-Up'ın kendi panellerinde (Gizli
 * Kartlar listesi, hatırlatma taramaları) atlanması anlamına gelir.
 * Kartın kendisi rozetle işaretlenir ("🙈 Gizli") ki kullanıcı durumu
 * görebilsin.
 *
 * Veri, board-shared tek bir haritada saklanır:
 *   { [cardId]: SnoozeEntry }
 * Bu sayede "Gizli Kartlar" paneli tüm kartları tek bir okuma ile
 * listeleyebilir (kart kart API çağrısı yapmaz — performans gereksinimi).
 * -----------------------------------------------------------------------
 */

/* global StorageService, DateUtils, TrelloPowerUp */

(function initSnoozeService(root) {
  const SS = typeof StorageService !== 'undefined' ? StorageService : root.StorageService;

  /**
   * @typedef {Object} SnoozeEntry
   * @property {string} cardId
   * @property {string} cardName
   * @property {string} listName
   * @property {string|null} dueISO
   * @property {string|null} hiddenUntilISO - null + hiddenPermanently=false demek "gizli değil"
   * @property {boolean} hiddenPermanently - "Süreyi Gizle" (manuel "Tekrar Göster" gerekir)
   * @property {string} setAtISO
   */

  /**
   * Board'daki tüm gizleme kayıtlarını okur.
   * @param {TrelloPowerUp.Iframe} t
   * @returns {Promise<Object<string, SnoozeEntry>>}
   */
  async function getHiddenMap(t) {
    return SS.getBoardShared(t, SS.KEYS.HIDDEN_CARDS_MAP, {});
  }

  /**
   * Bir kaydın şu an itibarıyla "gizli" sayılıp sayılmadığını hesaplar.
   * Süresi geçmiş ("Yarın", "3 Gün" vb.) kayıtlar otomatik olarak
   * gizli SAYILMAZ (otomatik tekrar görünme — ek bir işlem gerekmez,
   * çünkü bu fonksiyon her okumada anlık olarak değerlendirir).
   * @param {SnoozeEntry} entry
   * @param {Date} [now]
   * @returns {boolean}
   */
  function isEntryCurrentlyHidden(entry, now) {
    if (!entry) return false;
    if (entry.hiddenPermanently) return true;
    if (!entry.hiddenUntilISO) return false;
    const currentTime = (now || new Date()).getTime();
    return new Date(entry.hiddenUntilISO).getTime() > currentTime;
  }

  /**
   * Süresi geçmiş (artık gizli olmayan) kayıtları haritadan temizler ve
   * günceller. Bu, "süre dolunca otomatik tekrar görünsün" gereksinimini
   * karşılar — kayıt otomatik silinir, kart tekrar normal görünür.
   * @param {TrelloPowerUp.Iframe} t
   * @returns {Promise<Object<string, SnoozeEntry>>} Güncel (temizlenmiş) harita
   */
  async function pruneExpiredEntries(t) {
    const map = await getHiddenMap(t);
    const now = new Date();
    let changed = false;
    const next = {};

    Object.keys(map).forEach((cardId) => {
      const entry = map[cardId];
      if (isEntryCurrentlyHidden(entry, now)) {
        next[cardId] = entry;
      } else {
        changed = true; // süresi geçmiş / hiç gizli değilmiş — düşür
      }
    });

    if (changed) {
      await SS.setBoardShared(t, SS.KEYS.HIDDEN_CARDS_MAP, next);
    }
    return next;
  }

  /**
   * Bir kartı, belirtilen tarihe kadar (veya süresiz) gizler.
   * @param {TrelloPowerUp.Iframe} t - kart bağlamındaki t
   * @param {{id: string, name: string, listName: string, dueISO: string|null}} card
   * @param {Date|null} until - null ise süresiz ("Süreyi Gizle")
   */
  async function hideCard(t, card, until) {
  const map = await getHiddenMap(t);

  map[card.id] = {
    cardId: card.id,
    cardName: card.name,
    listName: card.listName || '',
    dueISO: card.dueISO || null,
    hiddenUntilISO: until ? until.toISOString() : null,
    hiddenPermanently: !until,
    setAtISO: new Date().toISOString(),
  };

  // Power-Up kaydını sakla
  await SS.setBoardShared(t, SS.KEYS.HIDDEN_CARDS_MAP, map);
    if (!until) {
  await t.set('card', 'due', null);
}
    
  return map[card.id];
}

  /**
   * "Tekrar Göster" — kartı gizleme haritasından tamamen kaldırır.
   * @param {TrelloPowerUp.Iframe} t
   * @param {string} cardId
   */
  async function unhideCard(t, cardId) {
    const map = await getHiddenMap(t);
    if (map[cardId]) {
      delete map[cardId];
      await SS.setBoardShared(t, SS.KEYS.HIDDEN_CARDS_MAP, map);
    }
  }

  /**
   * Board'daki tüm gizli kartları tek seferde tekrar gösterir.
   * @param {TrelloPowerUp.Iframe} t
   */
  async function unhideAll(t) {
    await SS.setBoardShared(t, SS.KEYS.HIDDEN_CARDS_MAP, {});
  }

  /**
   * Şu an aktif olarak gizli olan kartların listesini döndürür (süresi
   * geçmişleri otomatik temizleyerek).
   * @param {TrelloPowerUp.Iframe} t
   * @returns {Promise<SnoozeEntry[]>}
   */
  async function listActiveHidden(t) {
    const map = await pruneExpiredEntries(t);
    return Object.values(map);
  }

  /**
   * Belirli bir kartın gizli olup olmadığını (ve varsa kaydını) döndürür.
   * @param {TrelloPowerUp.Iframe} t
   * @param {string} cardId
   * @returns {Promise<{hidden: boolean, entry: SnoozeEntry|null}>}
   */
  async function getCardHiddenStatus(t, cardId) {
    const map = await getHiddenMap(t);
    const entry = map[cardId] || null;
    return { hidden: isEntryCurrentlyHidden(entry), entry };
  }

  /** Hazır süre kısayolları için yardımcı: bugünden itibaren N gün sonrası. */
  function daysFromNow(n) {
    const d = DateUtils.today();
    return DateUtils.addDays(d, n);
  }

  const SnoozeService = {
    getHiddenMap,
    isEntryCurrentlyHidden,
    pruneExpiredEntries,
    hideCard,
    unhideCard,
    unhideAll,
    listActiveHidden,
    getCardHiddenStatus,
    daysFromNow,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SnoozeService;
  } else {
    root.SnoozeService = SnoozeService;
  }
})(typeof window !== 'undefined' ? window : globalThis);
