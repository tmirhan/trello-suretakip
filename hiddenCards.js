/**
 * hiddenCards.js — "Gizli Kartlar" panelinin mantığı.
 */

/* global TrelloPowerUp, DateUtils, SnoozeService, ConfigGuard */

(function () {
  const HMK_CONFIG = ConfigGuard.assertConfigured();
  var t = TrelloPowerUp.iframe({ appKey: HMK_CONFIG.TRELLO_API_KEY, appName: HMK_CONFIG.APP_NAME });

  const els = {
    banner: document.getElementById('hiddenBannerText'),
    list: document.getElementById('hiddenCardsList'),
    emptyNote: document.getElementById('hiddenEmptyNote'),
    showAllBtn: document.getElementById('showAllBtn'),
  };

  function describeEntry(entry) {
    if (entry.hiddenPermanently) return 'Süresiz gizli';
    if (entry.hiddenUntilISO) {
      return `Tekrar görünecek: ${DateUtils.formatDateTR(new Date(entry.hiddenUntilISO))}`;
    }
    return '';
  }

  async function render() {
    const entries = await SnoozeService.listActiveHidden(t);

    els.banner.textContent = entries.length
      ? `${entries.length} kart geçici olarak gizlenmiş`
      : 'Gizlenmiş kart yok';

    if (!entries.length) {
      els.list.innerHTML = '';
      els.emptyNote.hidden = false;
      t.sizeTo('body').done();
      return;
    }

    els.emptyNote.hidden = true;

    els.list.innerHTML = entries
      .map(
        (entry) => `
        <li class="hidden-card-item" data-card-id="${entry.cardId}">
          <div class="hidden-card-info">
            <strong>${escapeHtml(entry.cardName)}</strong>
            <span class="hint">${escapeHtml(entry.listName || '')} — ${describeEntry(entry)}</span>
          </div>
          <button type="button" class="btn btn-secondary btn-sm unhide-btn" data-card-id="${entry.cardId}">
            Tekrar Göster
          </button>
        </li>`
      )
      .join('');

    els.list.querySelectorAll('.unhide-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        await SnoozeService.unhideCard(t, btn.getAttribute('data-card-id'));
        render();
      });
    });

    t.sizeTo('body').done();
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }

  els.showAllBtn.addEventListener('click', async () => {
    await SnoozeService.unhideAll(t);
    render();
  });

  render();
})();
