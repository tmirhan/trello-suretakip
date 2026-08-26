/**
 * history.js — Bildirim Geçmişi tablosunu StorageService'ten okuyup render eder.
 */

/* global TrelloPowerUp, StorageService, ConfigGuard */

(function () {
  const HMK_CONFIG = ConfigGuard.assertConfigured();
  var t = TrelloPowerUp.iframe({ appKey: HMK_CONFIG.TRELLO_API_KEY, appName: HMK_CONFIG.APP_NAME });

  const els = {
    emptyNote: document.getElementById('historyEmptyNote'),
    table: document.getElementById('historyTable'),
    tbody: document.getElementById('historyTableBody'),
    clearBtn: document.getElementById('clearHistoryBtn'),
  };

  const CHANNEL_LABELS = {
    browser: 'Tarayıcı',
    email: 'E-posta',
    slack: 'Slack',
    teams: 'Teams',
    discord: 'Discord',
  };

  const THRESHOLD_LABELS = {
    d7: '7 gün önce',
    d3: '3 gün önce',
    d1: '1 gün önce',
    dueDay: 'Son gün',
    overdue: 'Süresi geçti',
  };

  function formatDateTime(iso) {
    try {
      const d = new Date(iso);
      return d.toLocaleString('tr-TR');
    } catch (e) {
      return iso;
    }
  }

  async function render() {
    const log = await StorageService.getBoardShared(t, StorageService.KEYS.NOTIFICATION_LOG, []);

    if (!log.length) {
      els.emptyNote.hidden = false;
      els.table.hidden = true;
      t.sizeTo('body').done();
      return;
    }

    els.emptyNote.hidden = true;
    els.table.hidden = false;

    // En yeni en üstte.
    const rows = log
      .slice()
      .reverse()
      .map((entry) => {
        const statusClass = entry.status === 'success' ? 'status-ok' : 'status-fail';
        const statusLabel = entry.status === 'success' ? '✓ Başarılı' : '✗ Başarısız';
        return `
          <tr>
            <td>${formatDateTime(entry.sentAtISO)}</td>
            <td>${escapeHtml(entry.cardName)}</td>
            <td>${THRESHOLD_LABELS[entry.threshold] || entry.threshold}</td>
            <td>${escapeHtml(entry.recipient || '—')}</td>
            <td>${CHANNEL_LABELS[entry.channel] || entry.channel}</td>
            <td class="${statusClass}" title="${entry.error ? escapeHtml(entry.error) : ''}">${statusLabel}</td>
          </tr>`;
      })
      .join('');

    els.tbody.innerHTML = rows;
    t.sizeTo('body').done();
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }

  els.clearBtn.addEventListener('click', async () => {
    await StorageService.setBoardShared(t, StorageService.KEYS.NOTIFICATION_LOG, []);
    render();
  });

  render();
})();
