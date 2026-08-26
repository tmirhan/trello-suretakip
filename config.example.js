/**
 * config.example.js
 * -----------------------------------------------------------------------
 * BU BİR ŞABLONDUR. Projeyi çalıştırmak için:
 *   1. Bu dosyayı KOPYALAYIP `config.js` adıyla kaydedin (aynı klasöre).
 *   2. Aşağıdaki TRELLO_API_KEY değerini kendi Trello API anahtarınızla
 *      doldurun (bkz. README.md § "Trello Yapılandırması").
 *   3. `config.js` dosyasını da (bu şablonla birlikte) reponuza commit
 *      edip Vercel'e deploy edin.
 *
 * ÖNEMLİ — config.js'i .gitignore'a EKLEMEYİN:
 * Bu proje saf statik bir site olduğundan (build adımı yok), tarayıcıya
 * giden her dosya, GitHub reposunda commit edilmiş OLARAK bulunmalıdır —
 * Vercel, ortam değişkenlerini statik .js dosyalarının içine otomatik
 * olarak "gömmez". Neyse ki bu bir sorun değildir: Trello'nun kendi
 * dokümantasyonu, Power-Up API anahtarının ("appKey") tasarım gereği
 * HERKESE AÇIK (public) bir tanımlayıcı olduğunu, sır (secret)
 * sayılmaması gerektiğini açıkça belirtir — tıpkı bir web sitesinin
 * Google Analytics ölçüm kimliği gibi. Asıl gizli olması gereken değer
 * (RESEND_API_KEY gibi e-posta backend anahtarları) bu dosyada DEĞİL,
 * yalnızca Vercel'in sunucu-taraflı Ortam Değişkenleri'nde saklanır
 * (bkz. README.md § "E-posta Bildirimleri").
 * -----------------------------------------------------------------------
 */

window.HMK_CONFIG = {
  /**
   * Trello Power-Up API anahtarınız.
   * Alındığı yer: https://trello.com/power-ups/admin > Power-Up'ınız > "API Key"
   */
  TRELLO_API_KEY: '',

  /**
   * Trello'nun yetkilendirme ekranlarında ve REST API istemcisinde
   * gösterilecek uygulama adı. Değiştirmeniz gerekmez.
   */
  APP_NAME: 'HMK Süre Hesaplama',

  /**
   * E-posta bildirimlerinin gönderildiği sunucu taraflı uç nokta.
   * Bu depodaki /api/send-email.js serverless fonksiyonuyla birlikte
   * çalışacak şekilde tasarlanmıştır; aynı domain'e (Vercel projenize)
   * deploy ettiğiniz sürece değiştirmeniz gerekmez.
   */
  EMAIL_BACKEND_URL: '/api/send-email',
};
