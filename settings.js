/**
 * settings.js
 * -----------------------------------------------------------------------
 * "Ayarlar" ekranının form <-> SettingsService köprüsü.
 * -----------------------------------------------------------------------
 */

/* global TrelloPowerUp, SettingsService, BrowserNotificationAdapter, ConfigGuard */

(function () {
  const HMK_CONFIG = ConfigGuard.assertConfigured();
  var t = TrelloPowerUp.iframe({ appKey: HMK_CONFIG.TRELLO_API_KEY, appName: HMK_CONFIG.APP_NAME });

  const els = {
    notificationsEnabled: document.getElementById('notificationsEnabled'),
    chBrowser: document.getElementById('chBrowser'),
    browserPermissionStatus: document.getElementById('browserPermissionStatus'),
    chEmail: document.getElementById('chEmail'),
    chSlack: document.getElementById('chSlack'),
    chTeams: document.getElementById('chTeams'),
    chDiscord: document.getElementById('chDiscord'),
    thD7: document.getElementById('thD7'),
    thD3: document.getElementById('thD3'),
    thD1: document.getElementById('thD1'),
    thDueDay: document.getElementById('thDueDay'),
    thOverdue: document.getElementById('thOverdue'),
    recipientModeRadios: document.querySelectorAll('input[name="recipientMode"]'),
    customEmails: document.getElementById('customEmails'),
    slackWebhookUrl: document.getElementById('slackWebhookUrl'),
    teamsWebhookUrl: document.getElementById('teamsWebhookUrl'),
    discordWebhookUrl: document.getElementById('discordWebhookUrl'),
    emailFromName: document.getElementById('emailFromName'),
    emailFromEmail: document.getElementById('emailFromEmail'),
    saveSettingsBtn: document.getElementById('saveSettingsBtn'),
    historyLinkBtn: document.getElementById('historyLinkBtn'),
    settingsError: document.getElementById('settingsError'),
    settingsStatus: document.getElementById('settingsStatus'),
  };

  function fillForm(settings) {
    els.notificationsEnabled.checked = !!settings.notificationsEnabled;
    els.chBrowser.checked = !!settings.channels.browser;
    els.chEmail.checked = !!settings.channels.email;
    els.chSlack.checked = !!settings.channels.slack;
    els.chTeams.checked = !!settings.channels.teams;
    els.chDiscord.checked = !!settings.channels.discord;

    els.thD7.checked = !!settings.thresholds.d7;
    els.thD3.checked = !!settings.thresholds.d3;
    els.thD1.checked = !!settings.thresholds.d1;
    els.thDueDay.checked = !!settings.thresholds.dueDay;
    els.thOverdue.checked = !!settings.thresholds.overdue;

    els.recipientModeRadios.forEach((r) => {
      r.checked = r.value === settings.recipients.mode;
    });
    els.customEmails.value = (settings.recipients.customEmails || []).join(', ');

    els.slackWebhookUrl.value = settings.integrations.slackWebhookUrl || '';
    els.teamsWebhookUrl.value = settings.integrations.teamsWebhookUrl || '';
    els.discordWebhookUrl.value = settings.integrations.discordWebhookUrl || '';
    els.emailFromName.value = settings.integrations.email.fromName || '';
    els.emailFromEmail.value = settings.integrations.email.fromEmail || '';
  }

  function readForm() {
    const selectedMode = Array.from(els.recipientModeRadios).find((r) => r.checked);
    const customEmails = els.customEmails.value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    return {
      notificationsEnabled: els.notificationsEnabled.checked,
      channels: {
        browser: els.chBrowser.checked,
        email: els.chEmail.checked,
        slack: els.chSlack.checked,
        teams: els.chTeams.checked,
        discord: els.chDiscord.checked,
      },
      thresholds: {
        d7: els.thD7.checked,
        d3: els.thD3.checked,
        d1: els.thD1.checked,
        dueDay: els.thDueDay.checked,
        overdue: els.thOverdue.checked,
      },
      recipients: {
        mode: selectedMode ? selectedMode.value : 'cardMembers',
        customEmails,
      },
      integrations: {
        slackWebhookUrl: els.slackWebhookUrl.value.trim(),
        teamsWebhookUrl: els.teamsWebhookUrl.value.trim(),
        discordWebhookUrl: els.discordWebhookUrl.value.trim(),
        email: {
          fromName: els.emailFromName.value.trim(),
          fromEmail: els.emailFromEmail.value.trim(),
        },
      },
    };
  }

  function updateBrowserPermissionStatus() {
    if (typeof Notification === 'undefined') {
      els.browserPermissionStatus.textContent = 'Bu tarayıcı bildirim API\'sini desteklemiyor.';
      return;
    }
    const map = {
      granted: '✓ İzin verildi — tarayıcı bildirimleri gösterilebilir.',
      denied: '✗ İzin reddedildi — tekrar açmak için tarayıcının site ayarlarından "Bildirimler" iznini elle değiştirmeniz gerekir.',
      default: 'Henüz izin istenmedi — "Ayarları Kaydet" ile birlikte istenecek.',
    };
    els.browserPermissionStatus.textContent = map[Notification.permission] || '';
  }

  async function init() {
    try {
      const settings = await SettingsService.getSettings(t);
      fillForm(settings);
    } catch (err) {
      els.settingsError.hidden = false;
      els.settingsError.textContent = 'Ayarlar okunamadı: ' + (err.message || err);
    }
    updateBrowserPermissionStatus();
    t.sizeTo('body').done();
  }

  els.saveSettingsBtn.addEventListener('click', async () => {
    els.settingsError.hidden = true;
    els.settingsStatus.hidden = true;
    try {
      const settings = readForm();
      await SettingsService.saveSettings(t, settings);

      // Tarayıcı Bildirimleri açıldıysa izni hemen iste (kullanıcı gerçek
      // bir tıklama içinde olduğundan tarayıcı popup engelleyicisine
      // takılmaz).
      if (settings.channels.browser && typeof BrowserNotificationAdapter !== 'undefined') {
        await BrowserNotificationAdapter.ensurePermission();
      }
      updateBrowserPermissionStatus();

      els.settingsStatus.hidden = false;
      els.settingsStatus.className = 'apply-status success';
      els.settingsStatus.textContent = '✓ Ayarlar kaydedildi.';
    } catch (err) {
      els.settingsError.hidden = false;
      els.settingsError.textContent = 'Ayarlar kaydedilemedi: ' + (err.message || err);
    }
  });

  els.historyLinkBtn.addEventListener('click', () => {
    t.popup({
      title: 'Bildirim Geçmişi',
      url: 'history.html',
      height: 500,
    });
  });

  init();
})();
