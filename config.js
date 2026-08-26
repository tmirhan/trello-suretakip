/**
 * config.js
 * -----------------------------------------------------------------------
 * TÜM Power-Up kodu, YALNIZCA bu dosyadan (window.HMK_CONFIG) beslenir —
 * kod içinde başka hiçbir yerde gömülü API anahtarı YOKTUR.
 *
 * >>> TESLİM ANI NOTU <<<
 * TRELLO_API_KEY alanı kasıtlı olarak BOŞ bırakılmıştır: bu bir yapay
 * zekâ tarafından üretilen bir şablon projesidir ve gerçek bir Trello
 * hesabına ait bir API anahtarı içermez (böyle bir anahtar üretilemez —
 * yalnızca sizin trello.com/power-ups/admin hesabınızdan alınabilir).
 * Aşağıdaki değeri doldurmadan Power-Up ÇALIŞMAZ; TrelloPowerUp SDK'sı
 * bunu senkron olarak zorunlu kıldığından, boş bırakılırsa sayfa açık ve
 * anlaşılır bir hata gösterir (sessizce bozuk davranmaz) — bkz.
 * power-up.js / popup.js / settings.js / history.js / hiddenCards.js /
 * customSnooze.js içindeki assertConfigured() kontrolü.
 *
 * Doldurma adımları için README.md § "Trello Yapılandırması" bölümüne
 * bakın.
 * -----------------------------------------------------------------------
 */

window.HMK_CONFIG = {
  TRELLO_API_KEY: '',
  APP_NAME: 'HMK Süre Hesaplama',
  EMAIL_BACKEND_URL: '/api/send-email',
};
