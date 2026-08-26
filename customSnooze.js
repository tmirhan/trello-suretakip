/**
 * customSnooze.js — "Özel Tarih Seç" popup'ının mantığı.
 * Kart bağlamı, bu popup'ı açan card-buttons zincirinden miras kalır.
 */

/* global TrelloPowerUp, DateUtils, SnoozeService, ConfigGuard */

(function () {
  const HMK_CONFIG = ConfigGuard.assertConfigured();
  var t = TrelloPowerUp.iframe({ appKey: HMK_CONFIG.TRELLO_API_KEY, appName: HMK_CONFIG.APP_NAME });

  const dateInput = document.getElementById('customSnoozeDate');
  const errorEl = document.getElementById('customSnoozeError');
  const confirmBtn = document.getElementById('customSnoozeConfirm');

  dateInput.value = DateUtils.toISODateString(DateUtils.addDays(DateUtils.today(), 1));

  confirmBtn.addEventListener('click', async () => {
    errorEl.hidden = true;
    try {
      const until = DateUtils.parseDateInput(dateInput.value);
      if (until.getTime() <= DateUtils.today().getTime()) {
        errorEl.hidden = false;
        errorEl.textContent = 'Lütfen bugünden sonraki bir tarih seçin.';
        return;
      }

      const card = await t.card('id', 'name', 'due');
      const list = await t.list('name');

      await SnoozeService.hideCard(
        t,
        { id: card.id, name: card.name, listName: list.name, dueISO: card.due },
        until
      );

      t.closePopup();
    } catch (err) {
      errorEl.hidden = false;
      errorEl.textContent = 'Hata: ' + (err.message || err);
    }
  });

  t.sizeTo('body').done();
})();
