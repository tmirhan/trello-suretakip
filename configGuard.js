/**
 * configGuard.js
 * -----------------------------------------------------------------------
 * config.js doldurulmadan deploy edilirse (TRELLO_API_KEY boş), Power-Up
 * sessizce bozuk davranmak yerine her sayfada açık, anlaşılır bir hata
 * göstermelidir. Bu dosya, her giriş noktası script'inin (power-up.js,
 * popup.js, settings.js, history.js, hiddenCards.js, customSnooze.js)
 * başında çağırdığı tek bir kontrol sağlar.
 * -----------------------------------------------------------------------
 */

(function initConfigGuard(root) {
  /**
   * window.HMK_CONFIG'in var olduğunu ve TRELLO_API_KEY'in dolu
   * olduğunu doğrular. Doğrulama başarısızsa hem konsola hem de (eğer
   * bir <body> varsa) sayfaya okunabilir bir hata basar ve throw eder —
   * çağıran kod bu noktadan sonra devam etmemelidir.
   * @returns {{TRELLO_API_KEY: string, APP_NAME: string, EMAIL_BACKEND_URL: string}}
   */
  function assertConfigured() {
    const config = root.HMK_CONFIG;
    const missing = !config || !config.TRELLO_API_KEY || !config.TRELLO_API_KEY.trim();

    if (missing) {
      const message =
        'HMK Süre Hesaplama yapılandırılmamış: config.js içindeki TRELLO_API_KEY ' +
        'alanı boş. Lütfen trello.com/power-ups/admin üzerinden aldığınız API ' +
        'anahtarını config.js dosyasına girin (bkz. README.md § "Trello Yapılandırması").';

      if (typeof document !== 'undefined' && document.body) {
        document.body.innerHTML =
          '<div style="font-family:-apple-system,sans-serif;padding:16px;' +
          'color:#bf2600;background:#ffebe6;border:1px solid #ffbdad;' +
          'border-radius:4px;font-size:13px;line-height:1.5;">' +
          '⚠️ ' + message.replace(/</g, '&lt;') +
          '</div>';
      }
      throw new Error(message);
    }

    return config;
  }

  const ConfigGuard = { assertConfigured };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ConfigGuard;
  } else {
    root.ConfigGuard = ConfigGuard;
  }
})(typeof window !== 'undefined' ? window : globalThis);
