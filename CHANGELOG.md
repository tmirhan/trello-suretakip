# Changelog

Bu proje [Semantic Versioning](https://semver.org/lang/tr/) kullanır.
Format [Keep a Changelog](https://keepachangelog.com/tr/1.1.0/) esas
alınmıştır.

## [1.0.0] — Production sürüm

İlk stabil (production-ready) sürüm. Önceki geliştirme aşamalarında
eklenen tüm özellikler bu sürümde denetlenmiş, sertleştirilmiş ve
belgelenmiş hâlleriyle yer alır.

### Eklenenler
- **HMK süre hesaplama:** E-Tebliğ, Tefhim, Fiziki Tebliğ türlerine göre
  HMK m.90/91/93'e uygun süre hesabı; sonucu kartın Bitiş Tarihi alanına
  yazma.
- **Süreyi Kaldır / Ertele:** kart bazlı gizleme (süresiz / yarın / 3 gün
  / 1 hafta / özel tarih), otomatik tekrar görünme, board-genelinde
  "Gizli Kartlar" paneli.
- **Otomatik Hatırlatma:** 7 gün önce / 3 gün önce / 1 gün önce / son gün
  / süresi geçince eşiklerinde, Tarayıcı / E-posta / Slack / Teams /
  Discord kanallarından tekilleştirilmiş (aynı bildirim iki kez
  gönderilmez) bildirim; Bildirim Geçmişi tablosu.
- **Ayarlar ekranı:** bildirim kanalları, eşikler, alıcı modu, webhook
  URL'leri, e-posta gönderen bilgileri tek bir yerden yönetilir.
- **`api/send-email.js`:** e-posta gönderimi için Resend tabanlı, gizli
  anahtarı yalnızca sunucu tarafında tutan Vercel Serverless Function.

### Değişenler (v1.0.0 sertleştirme turu)
- **`config.js` / `config.example.js` / `configGuard.js`:** tüm Trello
  API anahtarı kullanımı, kod içine gömülü değerlerden tek bir
  yapılandırma dosyasına taşındı; anahtar boşsa sayfa sessizce bozulmak
  yerine açık bir hata gösterir.
- **E-posta kanalı EmailJS'ten Resend tabanlı kendi backend'imize
  taşındı:** istemci tarafında hiçbir API anahtarı bulunmaz.
- Tüm `BURAYA_TRELLO_API_KEYINIZI_YAZIN`, `PROJE_ADI` gibi kod-içi
  placeholder'lar temizlendi; kalan tek "doldurulması gereken" yer
  `config.js`'teki tek bir alandır.
- `manifest.json` gerçek/production alan adlarıyla güncellendi; eksik
  capability bırakılmadı.
- `style.css`'e karanlık mod (`prefers-color-scheme: dark`) ve mobil
  görünüm için responsive kurallar eklendi.
- README tamamen yeniden yazıldı: sıfırdan kuruluma ekran görüntüsü
  gerektirmeyecek ayrıntıda adım adım talimatlar.
- `LICENSE` (MIT) ve bu `CHANGELOG.md` eklendi.

### Denetlenip DEĞİŞTİRİLMEDEN bırakılanlar
- `calculator.js`, `dateUtils.js`, `holidays.js`, `hmk.js` — HMK
  hesaplama mantığı (yalnızca geriye dönük uyumlu `daysBetween()`
  eklendi).
- `popup.html` / `popup.js` — mevcut hesaplayıcı arayüzü.
- Depolama (Storage) kapsam seçimleri (`board`/`shared` vb.) — denetim
  sonucunda doğru bulundu, değiştirilmedi (bkz. `storageService.js`
  yorumları).

---

## Bilinen Platform Sınırları (sürüm notu değil, kalıcı gerçekler)

Aşağıdakiler bir "eksik" değil, Trello Power-Up platformunun kendi
mimari sınırlarıdır; her sürümde geçerliliğini korur. Ayrıntılar için
README.md § "Platform Sınırları" bölümüne bakın:
- Power-Up'lar sunucu tarafında çalıştırılamaz (yalnızca board açıkken
  hatırlatma taraması yapılabilir).
- Bir kart, Trello'nun native board görünümünden Power-Up API'siyle
  fiilen kaldırılamaz.
- Slack/Teams webhook'ları CORS nedeniyle kesin teslimat doğrulaması
  sunmaz (Discord ve e-posta backend'i gerçek HTTP durum kodu döndürür).
