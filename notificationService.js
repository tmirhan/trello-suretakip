/**
 * notificationService.js
 * -----------------------------------------------------------------------
 * Bildirim gönderiminin TEK giriş noktası. Kanal adaptörlerini (adapter
 * pattern) bir kayıt (registry) üzerinden yönetir; yeni bir kanal eklemek
 * için sadece registerAdapter() ile yeni bir adaptör eklemek yeterlidir —
 * ReminderService / SchedulerService'te hiçbir değişiklik gerekmez.
 *
 * @typedef {Object} NotificationMessage
 * @property {string} title
 * @property {string[]} bodyLines
 * @property {string} cardId
 * @property {string} cardName
 * @property {string} listName
 * @property {string} dueLabel
 * @property {string} cardUrl
 * @property {string} thresholdKey - 'd7' | 'd3' | 'd1' | 'dueDay' | 'overdue'
 * @property {string} iconUrl
 * -----------------------------------------------------------------------
 */

/* global BrowserNotificationAdapter, EmailAdapter, SlackAdapter, TeamsAdapter, DiscordAdapter, StorageService */

(function initNotificationService(root) {
  const SS = typeof StorageService !== 'undefined' ? StorageService : root.StorageService;

  /** Eşik anahtarına göre kullanıcıya gösterilecek etiket. */
  const THRESHOLD_LABELS = {
    d7: '7 gün önce',
    d3: '3 gün önce',
    d1: '1 gün önce',
    dueDay: 'son gün',
    overdue: 'süresi geçti',
  };

  /** channelId -> adapter modülü kayıt haritası. */
  const adapters = {};

  /**
   * Yeni bir bildirim kanalı adaptörü kaydeder. Yeni servis eklemek
   * isteyen biri (örn. "WhatsApp", "Webhook-genel") sadece bu
   * fonksiyonu çağırarak sisteme dahil olur.
   * @param {{channelId: string, send: Function}} adapter
   */
  function registerAdapter(adapter) {
    adapters[adapter.channelId] = adapter;
  }

  // Varsayılan 5 kanal (Browser, E-posta, Slack, Teams, Discord).
  if (typeof BrowserNotificationAdapter !== 'undefined') registerAdapter(BrowserNotificationAdapter);
  if (typeof EmailAdapter !== 'undefined') registerAdapter(EmailAdapter);
  if (typeof SlackAdapter !== 'undefined') registerAdapter(SlackAdapter);
  if (typeof TeamsAdapter !== 'undefined') registerAdapter(TeamsAdapter);
  if (typeof DiscordAdapter !== 'undefined') registerAdapter(DiscordAdapter);

  /**
   * Profesyonel, tutarlı biçimli bildirim mesajı oluşturur. İstenen
   * örnek formatı esas alır:
   *   ⏰ Son Tarih Yaklaşıyor
   *   Kart: İşe İade Davası Dilekçesi
   *   Liste: Hazırlanıyor
   *   Son Tarih: 25.07.2026
   *   Kartı Aç
   *
   * @param {Object} params
   * @param {{id: string, name: string, listName: string, dueLabel: string, url: string}} params.card
   * @param {string} params.thresholdKey
   * @returns {NotificationMessage}
   */
  function buildMessage({ card, thresholdKey }) {
    const titleByThreshold = {
      d7: '📅 Son Tarih Yaklaşıyor (7 gün)',
      d3: '📅 Son Tarih Yaklaşıyor (3 gün)',
      d1: '⏰ Son Tarih Yaklaşıyor',
      dueDay: '🔔 Son Tarih Bugün',
      overdue: '🚨 Süre Geçti',
    };

    const relativeByThreshold = {
      d7: '7 gün sonra sona eriyor.',
      d3: '3 gün sonra sona eriyor.',
      d1: 'yarın sona eriyor.',
      dueDay: 'bugün sona eriyor.',
      overdue: 'süresi geçti.',
    };

    const title = titleByThreshold[thresholdKey] || '🔔 Süre Bildirimi';

    const bodyLines = [
      `Kart: ${card.name}`,
      `${card.name} ${relativeByThreshold[thresholdKey] || ''}`,
      `Liste: ${card.listName || '—'}`,
      `Son Tarih: ${card.dueLabel}`,
    ];

    return {
      title,
      bodyLines,
      cardId: card.id,
      cardName: card.name,
      listName: card.listName || '—',
      dueLabel: card.dueLabel,
      cardUrl: card.url,
      thresholdKey,
      thresholdLabel: THRESHOLD_LABELS[thresholdKey] || thresholdKey,
      iconUrl: card.iconUrl,
    };
  }

  /**
   * Bir bildirimi, ayarlarda etkin olan TÜM kanallara gönderir ve her
   * kanalın sonucunu (başarılı/başarısız) bildirim geçmişine kaydeder.
   *
   * @param {TrelloPowerUp.Iframe} t
   * @param {Object} params
   * @param {NotificationMessage} params.message
   * @param {Object} params.channelsEnabled - { browser, email, slack, teams, discord }
   * @param {Object} params.channelConfigs - kanal bazlı config (webhook url'leri, e-posta gönderen bilgileri vs.)
   * @param {{label: string, emails?: string[]}} params.recipientInfo - log için "kime gönderildi" bilgisi
   * @returns {Promise<Array<{channelId: string, success: boolean, error?: string}>>}
   */
  async function dispatch(t, { message, channelsEnabled, channelConfigs, recipientInfo }) {
    const results = [];

    const enabledChannelIds = Object.keys(channelsEnabled || {}).filter((id) => channelsEnabled[id]);

    for (const channelId of enabledChannelIds) {
      const adapter = adapters[channelId];
      if (!adapter) {
        results.push({ channelId, success: false, error: 'Bu kanal için adaptör kayıtlı değil.' });
        continue;
      }

      let outcome;
      try {
        outcome = await adapter.send(message, (channelConfigs || {})[channelId] || {});
      } catch (err) {
        outcome = { success: false, error: err && err.message ? err.message : 'Beklenmeyen hata.' };
      }

      results.push({ channelId, ...outcome });

      // Her gönderim denemesi (başarılı/başarısız) geçmişe kaydedilir.
      // eslint-disable-next-line no-await-in-loop
      await SS.appendNotificationLog(t, {
        sentAtISO: new Date().toISOString(),
        cardId: message.cardId,
        cardName: message.cardName,
        listName: message.listName,
        dueLabel: message.dueLabel,
        threshold: message.thresholdKey,
        thresholdLabel: message.thresholdLabel,
        channel: channelId,
        recipient: (recipientInfo && recipientInfo.label) || '—',
        status: outcome.success ? 'success' : 'failed',
        error: outcome.error || null,
      });
    }

    return results;
  }

  const NotificationService = {
    THRESHOLD_LABELS,
    registerAdapter,
    buildMessage,
    dispatch,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationService;
  } else {
    root.NotificationService = NotificationService;
  }
})(typeof window !== 'undefined' ? window : globalThis);
