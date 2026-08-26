/**
 * settingsService.js
 * -----------------------------------------------------------------------
 * "Ayarlar" ekranının okuduğu/yazdığı bildirim tercihlerini yönetir.
 * Ayarlar board-shared olarak saklanır (panodaki herkes aynı ayarları
 * görür/kullanır — panolar arası karışma olmaz, her board kendi
 * ayarını tutar).
 * -----------------------------------------------------------------------
 */

/* global StorageService */

(function initSettingsService(root) {
  const SS = typeof StorageService !== 'undefined' ? StorageService : root.StorageService;

  /**
   * @typedef {Object} HmkSettings
   * @property {boolean} notificationsEnabled
   * @property {{browser: boolean, email: boolean, slack: boolean, teams: boolean, discord: boolean}} channels
   * @property {{d7: boolean, d3: boolean, d1: boolean, dueDay: boolean, overdue: boolean}} thresholds
   * @property {{mode: ('cardMembers'|'boardAdmins'|'custom'), customEmails: string[]}} recipients
   * @property {{slackWebhookUrl: string, teamsWebhookUrl: string, discordWebhookUrl: string, email: {fromName: string, fromEmail: string}}} integrations
   */

  /** @returns {HmkSettings} */
  function getDefaultSettings() {
    return {
      notificationsEnabled: false,
      channels: {
        browser: true,
        email: false,
        slack: false,
        teams: false,
        discord: false,
      },
      thresholds: {
        d7: true,
        d3: true,
        d1: true,
        dueDay: true,
        overdue: true,
      },
      recipients: {
        mode: 'cardMembers',
        customEmails: [],
      },
      integrations: {
        slackWebhookUrl: '',
        teamsWebhookUrl: '',
        discordWebhookUrl: '',
        email: { fromName: 'HMK Süre Hesaplama', fromEmail: '' },
      },
    };
  }

  /**
   * Kaydedilmiş ayarları okur; hiçbir ayar yoksa varsayılanı döndürür.
   * Eski/kısmi kayıtlarla geriye dönük uyumluluk için varsayılanla
   * derinlemesine birleştirilir (yeni eklenen alanlar kaybolmaz).
   * @param {TrelloPowerUp.Iframe} t
   * @returns {Promise<HmkSettings>}
   */
  async function getSettings(t) {
    const stored = await SS.getBoardShared(t, SS.KEYS.SETTINGS, null);
    const defaults = getDefaultSettings();
    if (!stored) return defaults;

    return {
      ...defaults,
      ...stored,
      channels: { ...defaults.channels, ...(stored.channels || {}) },
      thresholds: { ...defaults.thresholds, ...(stored.thresholds || {}) },
      recipients: { ...defaults.recipients, ...(stored.recipients || {}) },
      integrations: {
        ...defaults.integrations,
        ...(stored.integrations || {}),
        email: { ...defaults.integrations.email, ...((stored.integrations || {}).email || {}) },
      },
    };
  }

  /**
   * Ayarları kaydeder.
   * @param {TrelloPowerUp.Iframe} t
   * @param {HmkSettings} settings
   */
  async function saveSettings(t, settings) {
    await SS.setBoardShared(t, SS.KEYS.SETTINGS, settings);
  }

  const SettingsService = { getDefaultSettings, getSettings, saveSettings };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SettingsService;
  } else {
    root.SettingsService = SettingsService;
  }
})(typeof window !== 'undefined' ? window : globalThis);
