/**
 * power-up.js
 * -----------------------------------------------------------------------
 * Trello Power-Up giriş noktası. connector.html tarafından yüklenir.
 *
 * MEVCUT ÖZELLİK (değişmedi): HMK süre hesaplama, card-buttons üzerinden
 * "Hukuki Süre Hesapla" popup'ını açar ve hesaplanan tarihi kartın Due
 * Date alanına yazar.
 *
 * YENİ ÖZELLİK 1 — Süreyi Kaldır/Ertele: her kartta "⋮ Süre Seçenekleri"
 * butonu, Trello'nun kendi itemized popup'ını (t.popup({items:[...]}))
 * kullanarak Süreyi Gizle / Yarın / 3 Gün / 1 Hafta / Özel Tarih / Tekrar
 * Göster seçeneklerini sunar. Ayrıca board-buttons'ta "Gizli Kartlar"
 * paneli bulunur.
 *
 * YENİ ÖZELLİK 2 — Otomatik Hatırlatma: SchedulerService, board açıkken
 * periyodik olarak (ve "Şimdi Kontrol Et" ile manuel) ReminderService
 * üzerinden yaklaşan/geçmiş son tarihleri tarar ve NotificationService
 * aracılığıyla etkin kanallara (Browser/E-posta/Slack/Teams/Discord)
 * bildirim gönderir. Ayarlar, "show-settings" ile açılan settings.html
 * üzerinden yönetilir.
 *
 * appKey/appName neden config.js'den okunuyor: t.getRestApi() bunu
 * TrelloPowerUp.initialize()'a senkron olarak verilmesini zorunlu
 * kılar; bu yüzden her giriş noktası dosyası (bu dosya dahil) sayfa
 * yüklenir yüklenmez ConfigGuard.assertConfigured() ile config.js'i
 * okur. TRELLO_API_KEY boşsa sayfa açık bir hata gösterir (bkz.
 * configGuard.js) — sessizce bozuk davranmaz.
 * -----------------------------------------------------------------------
 */

/* global TrelloPowerUp, SnoozeService, ReminderService, SchedulerService, DateUtils, ConfigGuard */

const HMK_CONFIG = ConfigGuard.assertConfigured();
var TRELLO_API_KEY = HMK_CONFIG.TRELLO_API_KEY;
var APP_NAME = HMK_CONFIG.APP_NAME;
var APP_AUTHOR = HMK_CONFIG.APP_NAME;

var ICON_SVG =
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">' +
      '<circle cx="12" cy="12" r="9" fill="none" stroke="#44546F" stroke-width="2"/>' +
      '<path d="M12 7v5l3.5 2" fill="none" stroke="#44546F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg>'
  );

/** @returns {Promise} */
function openCalculatorPopup(t) {
  return t.popup({
    title: 'HMK Süre Hesaplama',
    url: 'popup.html',
    height: 640,
    args: { apiKey: TRELLO_API_KEY },
  });
}

/**
 * Kart üzerindeki "⋮ Süre Seçenekleri" itemized menüsünü açar.
 * Trello'nun kendi öge-listesi (items) popup'ı kullanılır — ekstra bir
 * HTML sayfası gerektirmez, her öge kendi callback'inde çalışır.
 * @param {TrelloPowerUp.Iframe} t
 */
function openSnoozeMenu(t) {
  return t.card('id', 'name', 'due').then(function (card) {
    return t.list('name').then(function (list) {
      const cardInfo = { id: card.id, name: card.name, listName: list.name, dueISO: card.due };

      return t.popup({
        title: 'Süre Seçenekleri',
        items: [
          {
            text: 'Süreyi Gizle',
            callback: function (t2) {
              return SnoozeService.hideCard(t2, cardInfo, null).then(function () {
                return t2.closePopup();
              });
            },
          },
          {
            text: 'Yarın Hatırlat',
            callback: function (t2) {
              return SnoozeService.hideCard(t2, cardInfo, SnoozeService.daysFromNow(1)).then(function () {
                return t2.closePopup();
              });
            },
          },
          {
            text: '3 Gün Sonra Hatırlat',
            callback: function (t2) {
              return SnoozeService.hideCard(t2, cardInfo, SnoozeService.daysFromNow(3)).then(function () {
                return t2.closePopup();
              });
            },
          },
          {
            text: '1 Hafta Sonra Hatırlat',
            callback: function (t2) {
              return SnoozeService.hideCard(t2, cardInfo, SnoozeService.daysFromNow(7)).then(function () {
                return t2.closePopup();
              });
            },
          },
          {
            text: 'Özel Tarih Seç',
            callback: function (t2) {
              return t2.popup({
                title: 'Özel Tarih',
                url: 'customSnooze.html',
                height: 200,
                args: { apiKey: TRELLO_API_KEY },
              });
            },
          },
          {
            text: 'Tekrar Göster',
            callback: function (t2) {
              return SnoozeService.unhideCard(t2, cardInfo.id).then(function () {
                return t2.closePopup();
              });
            },
          },
        ],
      });
    });
  });
}

if (typeof TrelloPowerUp === 'undefined') {
  throw new Error('[HMK Power-Up] TrelloPowerUp SDK bulunamadı. power-up.min.js yüklenemedi.');
}

TrelloPowerUp.initialize(
  {
    /**
     * Kart arka yüzünde gösterilecek butonlar: mevcut hesaplayıcı +
     * yeni "⋮ Süre Seçenekleri" (gizle/ertele) menüsü.
     */
    'card-buttons': function (t) {
      return [
        {
          icon: ICON_SVG,
          text: 'Hukuki Süre Hesapla',
          callback: function (t2) {
            return openCalculatorPopup(t2);
          },
        },
        {
          icon: ICON_SVG,
          text: '⋮ Süre Seçenekleri',
          callback: function (t2) {
            return openSnoozeMenu(t2);
          },
        },
      ];
    },

    /**
     * Pano üst çubuğu: hesaplayıcı, Gizli Kartlar paneli (canlı sayaçlı),
     * Bildirim Geçmişi ve manuel "Şimdi Kontrol Et".
     *
     * Bu callback aynı zamanda otomatik hatırlatma zamanlayıcısını da
     * başlatır — Trello bu callback'i board her yüklendiğinde board
     * bağlamlı bir `t` ile çağırır, bu da periyodik taramayı başlatmak
     * için en uygun/erişilebilir noktadır (bkz. schedulerService.js
     * başındaki platform sınırı notu: yalnızca board açıkken çalışır).
     */
    'board-buttons': function (t) {
      SchedulerService.startPeriodicCheck(t);

      return SnoozeService.listActiveHidden(t).then(function (hidden) {
        return [
          {
            icon: ICON_SVG,
            text: 'HMK Süre Hesapla',
            callback: function (t2) {
              return openCalculatorPopup(t2);
            },
          },
          {
            icon: ICON_SVG,
            text: hidden.length ? '🙈 Gizli Kartlar (' + hidden.length + ')' : '🙈 Gizli Kartlar',
            callback: function (t2) {
              return t2.popup({ title: 'Gizli Kartlar', url: 'hiddenCards.html', height: 420 });
            },
          },
          {
            icon: ICON_SVG,
            text: '🔔 Bildirim Geçmişi',
            callback: function (t2) {
              return t2.popup({ title: 'Bildirim Geçmişi', url: 'history.html', height: 500 });
            },
          },
          {
            icon: ICON_SVG,
            text: '🔄 Şimdi Kontrol Et',
            callback: function (t2) {
              return SchedulerService.runNow(t2).then(function (result) {
                return t2.alert({
                  message: result.disabled
                    ? 'Bildirimler kapalı (Ayarlar\'dan açabilirsiniz).'
                    : result.checked + ' kart tarandı, ' + result.notified + ' bildirim gönderildi.',
                  duration: 6,
                });
              });
            },
          },
        ];
      });
    },

    /**
     * Kart ön yüzü rozetleri: mevcut HMK son-gün rozeti + yeni
     * gizli/ertelenmiş durum rozeti.
     */
        'card-badges': function (t) {
      return Promise.all([
        t.get('card', 'shared', 'hmkSonGun'),
        t.card('due'),
        SnoozeService.getCardHiddenStatus(t, t.getContext().card),
      ])
        .then(function (results) {
          const storedISO = results[0];
          const card = results[1];
          const hiddenStatus = results[2];
          const badges = [];

          if (storedISO) {
            const stillMatches =
              card.due && new Date(card.due).getTime() === new Date(storedISO).getTime();

            if (stillMatches) {
              badges.push({
                text: 'HMK Son Gün: ' + DateUtils.formatDateTR(new Date(storedISO)),
                color: 'red',
              });
            } else {
              t.remove('card', 'shared', 'hmkSonGun');
            }
          }

          if (hiddenStatus.hidden) {
            const entry = hiddenStatus.entry;
            const label = entry.hiddenPermanently
              ? '🙈 Süre Gizli'
              : '🙈 Ertelendi: ' + DateUtils.formatDateTR(new Date(entry.hiddenUntilISO));
            badges.push({ text: label, color: 'light-gray' });
          }
          return badges;
        })
        .catch(function () {
          return [];
        });
    },
    /**
     * Trello'ya REST API yetkisi olup olmadığını bildirir.
     */
    'authorization-status': function (t) {
      return t
        .getRestApi()
        .isAuthorized()
        .then(function (isAuthorized) {
          return { authorized: !!isAuthorized };
        })
        .catch(function () {
          return { authorized: false };
        });
    },

    /**
     * Pano ayarları ("..." menüsü) — artık özel Ayarlar ekranını açar
     * (bildirim kanalları, eşikler, alıcılar, webhook/e-posta bilgileri).
     */
    'show-settings': function (t) {
      return t.popup({
        title: 'HMK Süre Hesaplama — Ayarlar',
        url: 'settings.html',
        height: 640,
        args: { apiKey: TRELLO_API_KEY },
      });
    },
  },
  {
    appKey: TRELLO_API_KEY,
    appName: APP_NAME,
    appAuthor: APP_AUTHOR,
  }
);
