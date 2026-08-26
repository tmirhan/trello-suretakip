# HMK Süre Hesaplama — Trello Power-Up

**Sürüm: 1.0.0 (production)**

Trello kartları üzerinde 6100 sayılı **Hukuk Muhakemeleri Kanunu (HMK)**
hükümlerine (m.90, m.91, m.93) uygun hukuki süre hesaplaması yapan;
kartların süresini geçici olarak gizleyip erteleyebilen; ve yaklaşan/geçmiş
son tarihler için Tarayıcı, E-posta, Slack, Teams ve Discord kanallarından
otomatik hatırlatma gönderen, statik (tarayıcı tarafında build adımı
gerektirmeyen) bir Trello Power-Up.

Bu belge, projeyi **hiç görmemiş** birinin, başka hiçbir kaynağa
bakmadan, sıfırdan çalışır hâle getirebilmesi için yazılmıştır.

---

## İçindekiler

1. [Ön Koşullar](#ön-koşullar)
2. [Dosya Yapısı ve Mimari](#dosya-yapısı-ve-mimari)
3. [Kurulum — Adım Adım](#kurulum--adım-adım)
4. [Özellik 1 — Süreyi Kaldır / Ertele](#özellik-1--süreyi-kaldır--ertele)
5. [Özellik 2 — Otomatik Hatırlatma](#özellik-2--otomatik-hatırlatma)
6. [E-posta Bildirimleri (Backend Kurulumu)](#e-posta-bildirimleri-backend-kurulumu)
7. [Slack / Discord / Teams Webhook Kurulumu](#slack--discord--teams-webhook-kurulumu)
8. [Yeni Bir Bildirim Kanalı Eklemek](#yeni-bir-bildirim-kanalı-eklemek)
9. [Depolama Mimarisi (Storage Audit)](#depolama-mimarisi-storage-audit)
10. [Platform Sınırları — Dürüst Bir Değerlendirme](#platform-sınırları--dürüst-bir-değerlendirme)
11. [Sorun Giderme](#sorun-giderme)
12. [Sürüm Geçmişi ve Lisans](#sürüm-geçmişi-ve-lisans)

---

## Ön Koşullar

- Bir **GitHub** hesabı (ücretsiz).
- Bir **Vercel** hesabı (ücretsiz; GitHub ile giriş yapabilirsiniz — https://vercel.com).
- Bir **Trello** hesabı ve içinde en az bir pano (board).
- (İsteğe bağlı, yalnızca e-posta bildirimleri istiyorsanız) Ücretsiz bir
  **Resend** hesabı (https://resend.com).
- Herhangi bir kod yazma bilgisine **gerek yoktur**; yalnızca birkaç
  metin dosyasını düzenleyip web arayüzlerinde birkaç alan dolduracaksınız.

---

## Dosya Yapısı ve Mimari

Tüm dosyalar **kök dizinde**, düz (flat) yapıdadır — hiçbir dosya alt
klasörde değildir (tek istisna: `api/send-email.js`, Vercel'in
serverless fonksiyon klasör kuralı gereği `api/` altında olmalıdır).

```
trello-hmk-powerup/
│
├── config.example.js       # Yapılandırma şablonu (yalnızca referans)
├── config.js                 # GERÇEK yapılandırma — TEK doldurmanız gereken dosya
├── configGuard.js              # config.js boşsa açık hata gösteren koruma
│
├── connector.html               # Trello'nun yüklediği tek giriş noktası
├── index.html                     # İnsanlar için genel bilgi sayfası (Trello KULLANMAZ)
│
├── popup.html / popup.js            # HMK süre hesaplayıcı arayüzü
├── power-up.js                        # TrelloPowerUp.initialize() — tüm capability'ler
│
├── calculator.js                        # HMK hesaplama orkestratörü
├── dateUtils.js                           # Tarih yardımcıları
├── holidays.js                              # Türkiye resmî tatil takvimi
├── hmk.js                                     # HMK m.90/91/93 hesap mantığı
│
│   Katmanlı servis mimarisi:
├── storageService.js                          # t.get/t.set üzerine ince katman
├── settingsService.js                           # Bildirim ayarlarını okur/yazar
├── snoozeService.js                               # Gizle/ertele iş mantığı
├── reminderService.js                               # Board tarama + eşik hesabı
├── notificationService.js                             # Bildirim dağıtımı (adapter registry)
├── schedulerService.js                                  # Ne zaman tarama yapılacağını yönetir
│
│   Bildirim kanalı adaptörleri:
├── browserNotificationAdapter.js
├── emailAdapter.js                                        # api/send-email.js'i çağırır
├── slackAdapter.js
├── teamsAdapter.js
├── discordAdapter.js
│
│   Ekranlar:
├── settings.html / settings.js                              # "Ayarlar" ekranı
├── history.html / history.js                                  # "Bildirim Geçmişi"
├── hiddenCards.html / hiddenCards.js                             # "Gizli Kartlar" paneli
├── customSnooze.html / customSnooze.js                             # "Özel Tarih Seç"
│
├── api/
│   └── send-email.js                                               # Vercel Serverless Function (Resend)
│
├── style.css                                                         # Ortak stiller + karanlık mod + responsive
├── manifest.json                                                       # Belgeleme amaçlı Power-Up meta verisi
├── vercel.json                                                          # Statik deploy, build adımı yok
├── package.json                                                         # Node bağımlılığı yok
├── .gitignore
├── LICENSE                                                                # MIT
├── CHANGELOG.md
└── README.md                                                              # Bu dosya
```

### Katman sorumlulukları

| Katman | Sorumluluk |
|---|---|
| `ConfigGuard` | `config.js`'in doldurulduğunu doğrular; boşsa sayfayı açık bir hata mesajıyla durdurur |
| `StorageService` | Trello Power-Up Storage'a (t.get/t.set) tek, tutarlı erişim noktası |
| `SettingsService` | Bildirim tercihlerini (kanallar, eşikler, alıcılar, webhook/e-posta bilgileri) okur/yazar |
| `SnoozeService` | Kart gizleme/erteleme kayıtlarını yönetir; süresi geçen kayıtları otomatik "unutur" |
| `NotificationService` | Bir mesajı etkin TÜM kanallara dağıtır; adaptör kayıt defteri tutar |
| `ReminderService` | Board'daki TÜM kartları **tek bir** `t.cards()` çağrısıyla okur, eşikleri hesaplar, tekrarı engeller |
| `SchedulerService` | `ReminderService`'in ne zaman (periyodik/manuel) tetikleneceğini yönetir |
| Kanal adaptörleri | Her biri `{channelId, send(message, config)}` arayüzünü uygular |
| `api/send-email.js` | Tek sunucu-taraflı bileşen; gizli e-posta API anahtarını tarayıcıdan gizler |

---

## Kurulum — Adım Adım

### Adım 1 — Projeyi GitHub'a yükleyin

1. https://github.com/new adresinden yeni, **public veya private** bir
   repo oluşturun (isim serbest, örn. `hmk-trello-powerup`).
2. Bu klasörün **içeriğini** (klasörün kendisini değil, içindeki tüm
   dosyaları) reponun **kök dizinine** yükleyin. Terminalden:
   ```bash
   cd trello-hmk-powerup
   git init
   git add .
   git commit -m "İlk sürüm: HMK Süre Hesaplama Power-Up v1.0.0"
   git branch -M main
   git remote add origin https://github.com/KULLANICI_ADINIZ/hmk-trello-powerup.git
   git push -u origin main
   ```
   Terminal kullanmak istemiyorsanız: GitHub'da reponun sayfasında
   **"uploading an existing file"** bağlantısına tıklayıp tüm dosyaları
   sürükleyip bırakabilirsiniz.
3. **Kontrol:** GitHub'da repoyu açtığınızda `connector.html`,
   `power-up.js`, `config.js` gibi dosyaların doğrudan ana sayfada
   (bir alt klasöre girmeden) göründüğünden emin olun.

### Adım 2 — Vercel'e bağlayın

1. https://vercel.com adresine gidin, GitHub hesabınızla giriş yapın.
2. **"Add New…" → "Project"** düğmesine tıklayın.
3. Az önce oluşturduğunuz `hmk-trello-powerup` reposunu bulup **"Import"**
   deyin.
4. Framework Preset otomatik olarak **"Other"** olarak algılanacaktır;
   değiştirmeyin. `vercel.json` dosyası zaten build/install komutlarını
   devre dışı bıraktığından herhangi bir ayar değiştirmenize gerek yoktur.
5. **"Deploy"** düğmesine basın. 30-60 saniye içinde tamamlanır.
6. Deploy tamamlandığında Vercel size bir adres verir — bu adres
   `https://<sizin-projeniz>.vercel.app` biçimindedir (tam adresi Vercel
   panelinizde "Domains" bölümünde görürsünüz). Bu adresi bir kenara not
   edin; aşağıdaki adımlarda **"SİZİN VERCEL ADRESİNİZ"** ifadesi geçtiğinde
   bu adresi kastediyoruz.
7. **Doğrulama:** Tarayıcınızda şu adresleri tek tek açın (SİZİN VERCEL
   ADRESİNİZ'i kendi adresinizle değiştirerek); hiçbiri "404: NOT_FOUND"
   göstermemeli, gerçek kod/metin içeriği göstermelidir:
   - `SİZİN VERCEL ADRESİNİZ/connector.html`
   - `SİZİN VERCEL ADRESİNİZ/power-up.js`
   - `SİZİN VERCEL ADRESİNİZ/style.css`

### Adım 3 — developer.atlassian.com üzerinden Trello Power-Up oluşturun

Trello Power-Up'ları, Atlassian'ın geliştirici portalı üzerinden Trello
hesabınızla bağlantılı olarak yönetilir.

1. https://developer.atlassian.com/ adresine gidin ve sağ üstten
   **"Log in"** ile Trello hesabınızla (veya Atlassian hesabınızla) giriş
   yapın.
2. Trello Power-Up yönetim paneli doğrudan şu adrestedir:
   https://trello.com/power-ups/admin — bu, Atlassian portalının Trello
   Power-Up'lar için gösterdiği aynı yönetim ekranıdır; giriş yaptıktan
   sonra buraya yönlendirilirsiniz.
3. **"Yeni bir Power-Up oluştur"** (New) düğmesine tıklayın.
4. Formu doldurun:
   - **Power-Up name:** `HMK Süre Hesaplama` (istediğiniz bir isim
     verebilirsiniz).
   - **Workspace:** Power-Up'ı kullanacağınız Trello çalışma alanı.
   - **Iframe connector URL:**
     ```
     SİZİN VERCEL ADRESİNİZ/connector.html
     ```
   - **Email** ve **Support contact** alanlarını (zorunluysa) kendi
     bilgilerinizle doldurun.
5. **"Create"** ile Power-Up'ı oluşturun.

### Adım 4 — API Key alma

1. Oluşturduğunuz Power-Up'ın sayfasında sol menüden **"API Key"**
   sekmesine gidin.
2. **"Generate a new API Key"** düğmesine basın.
3. Görüntülenen anahtarı kopyalayın (uzun bir harf/rakam dizisidir).

### Adım 5 — Token hakkında (önemli: elle bir token GİRMEYİN)

Bu Power-Up, sizin ya da başka bir kullanıcının Trello hesabına erişim
**token**'ını elle bir yere yapıştırmanızı **gerektirmez ve buna izin
vermemelidir**. Sebebi:

- Trello, "sır gibi görünen" değerlerin (token, secret, auth içeren
  anahtar adları) Power-Up'ın paylaşımlı (shared) depolama alanına
  yazılmasını zaten teknik olarak engeller.
- Doğru ve güvenli yöntem: her kullanıcı, **"Hesapla ve Uygula"**
  butonuna ilk kez bastığında, Trello'nun kendi yetkilendirme
  penceresi (`t.getRestApi().authorize()`) açılır, kullanıcı "İzin Ver"
  der ve Trello o kullanıcıya özel bir token'ı **tarayıcısında güvenli
  şekilde** saklar. Bu Power-Up bu akışı zaten otomatik olarak uygular
  (bkz. `popup.js`); ek bir yapılandırma gerekmez.

Yani "Token alma" adımı, teknik olarak **kullanıcıların ilk kullanımda
kendiliğinden yaşayacağı bir adımdır**, sizin önceden elle yapmanız
gereken bir işlem değildir.

### Adım 6 — Connector URL ve Allowed Origins ayarlama

1. Power-Up sayfanızda **"Connector URL"** (bazı ekranlarda "Iframe
   connector URL") alanının Adım 3'te girdiğiniz değerle doğru
   olduğunu teyit edin.
2. Aynı sayfada (genellikle API Key sekmesinde) **"Allowed Origins"**
   alanına, SİZİN VERCEL ADRESİNİZ'i (başında `https://` ile, sonunda
   `/connector.html` OLMADAN, yalnızca domain kısmını) ekleyin, örn.:
   ```
   https://<sizin-projeniz>.vercel.app
   ```

### Adım 7 — Manifest / capability'leri işaretleme

Bu proje, klasik Trello Power-Up sisteminde çalışır; bu sistemde
`manifest.json` dosyası Trello'ya **otomatik yüklenmez** — capability'ler
Trello'nun kendi web arayüzünden **işaretlenir**:

1. Power-Up sayfanızda **"Capabilities"** (Yetenekler) sekmesine gidin.
2. Bu depodaki `manifest.json` dosyasının `capabilities` listesinde yer
   alan aşağıdaki 5 capability'nin her biri için, karşılığındaki
   JavaScript dosyasının adını (Trello bunu otomatik önerir, siz sadece
   "Bu yeteneği kullanıyorum" kutucuğunu işaretlersiniz) etkinleştirin:
   - `card-buttons`
   - `board-buttons`
   - `card-badges`
   - `authorization-status`
   - `show-settings`
3. Kaydedin.

### Adım 8 — Power-Up'ı etkinleştirme (enable)

1. Power-Up sayfanızın üstünde bir **"Enable"** veya **"Make Public /
   Private"** seçeneği görürsünüz (workspace'e göre değişir). Power-Up'ı
   en azından kendi workspace'iniz için etkinleştirin.

### Adım 9 — API anahtarını `config.js`'e girin

1. Bu depodaki `config.js` dosyasını açın.
2. Adım 4'te aldığınız API Key'i yapıştırın:
   ```js
   window.HMK_CONFIG = {
     TRELLO_API_KEY: 'buraya-adım-4teki-anahtarınızı-yapıştırın',
     APP_NAME: 'HMK Süre Hesaplama',
     EMAIL_BACKEND_URL: '/api/send-email',
   };
   ```
3. Değişikliği commit edip GitHub'a push edin:
   ```bash
   git add config.js
   git commit -m "Trello API anahtarını ekle"
   git push
   ```
4. Vercel, GitHub'a her push'ta otomatik olarak yeniden deploy eder;
   30-60 saniye bekleyin.

> **Neden `config.js` "sır" (secret) değil de doğrudan repoya
> commit ediliyor?** Trello'nun kendi dokümantasyonu, Power-Up API
> anahtarının tasarım gereği herkese açık (public) bir tanımlayıcı
> olduğunu, gizli tutulmasının gerekmediğini belirtir — tıpkı bir web
> sitesinin analytics ölçüm kimliği gibi. Gerçek gizli bilgi (e-posta
> gönderimi için kullanılan Resend API anahtarı), bu depodaki HİÇBİR
> dosyada yer almaz; yalnızca Vercel'in sunucu tarafı Ortam
> Değişkenleri'nde tutulur (bkz. [E-posta Bildirimleri](#e-posta-bildirimleri-backend-kurulumu)).

### Adım 10 — Panoya ekleme

1. Bir Trello panosu açın.
2. Sağ üstteki menüden **"Power-Ups"** (veya "..." → "Power-Ups") seçin.
3. **"Custom"** sekmesinde Power-Up'ınızı bulup **"Add"** ile ekleyin.

### Adım 11 — İlk test

1. Panodaki herhangi bir kartı açın; kart detayında **"Hukuki Süre
   Hesapla"** ve **"⋮ Süre Seçenekleri"** butonlarını görmelisiniz.
2. **"Hukuki Süre Hesapla"** → tebligat türü/tarih/süre girin →
   **"Hesapla ve Uygula"** → Trello ilk kez kart-güncelleme izni
   isteyecektir, "İzin Ver" deyin → hesaplanan tarih kartın Bitiş
   Tarihi alanına yazılmalı ve kartın önünde kırmızı bir rozet
   belirmelidir.
3. Pano üst çubuğundaki **"..."** menüsünden Power-Up ayarlarını açıp
   **Ayarlar** ekranını (bildirim kanalları) görüntüleyin.
4. Pano üst çubuğundaki **"🔄 Şimdi Kontrol Et"** ile hatırlatma
   taramasını elle tetikleyip bir özet mesajı görün.

Bu adımların hepsi hatasız çalışıyorsa kurulum tamamlanmıştır.

---

## Özellik 1 — Süreyi Kaldır / Ertele

Her kartın arkasında **"⋮ Süre Seçenekleri"** butonu:

- **Süreyi Gizle** — süresiz, yalnızca "Tekrar Göster" ile geri gelir.
- **Yarın / 3 Gün Sonra / 1 Hafta Sonra Hatırlat** — belirtilen tarihe
  kadar gizlenir, süre dolunca **otomatik olarak** tekrar görünür hâle
  gelir (ek bir işlem gerekmez — bu, her okuma anında anlık olarak
  hesaplanır, arka planda ayrı bir "temizlik" işlemi gerektirmez).
- **Özel Tarih Seç** — serbest tarih girişi (bugünden sonraki herhangi
  bir tarih).
- **Tekrar Göster** — gizlemeyi hemen kaldırır.

Pano üst çubuğundaki **"🙈 Gizli Kartlar"** butonu, o an gizli olan tüm
kartları tek bir listede gösterir ("N kart geçici olarak gizlenmiş"
bilgi kutusu + her kart için "Tekrar Göster" + toplu "Tümünü Tekrar
Göster"). Bu panel, board-shared depolamadan **tek bir okuma** ile
doldurulur (kart başına ayrı bir API çağrısı yapılmaz).

**Trello kartının kendisine (Due Date, kapak, vb.) hiçbir şekilde
dokunulmaz** — gizleme yalnızca bu Power-Up'ın kendi verisinde tutulur.

### ⚠️ Önemli platform sınırı

Trello'nun herkese açık Power-Up API'si, bir kartı panonun **native**
liste görünümünden (board grid) fiilen kaldırmaya/gizlemeye **izin
vermez**. Bu nedenle "gizleme": kartın Trello panosunda hâlâ **görünür**
kalacağı, ancak üzerinde **"🙈 Gizli"** rozetiyle işaretleneceği ve bu
Power-Up'ın kendi panellerinde (hatırlatma taraması dahil) **atlanacağı**
anlamına gelir.

---

## Özellik 2 — Otomatik Hatırlatma

**Ayarlar** ekranından (pano üst çubuğundaki "..." menüsü, ya da
board-buttons'taki "🔔 Bildirim Geçmişi" düğmesinin yanındaki bağlantı):

- Bildirimleri Aç/Kapat
- Kanallar: Tarayıcı / E-posta / Slack / Teams / Discord
- Eşikler: 7 gün önce / 3 gün önce / 1 gün önce / son gün / süresi geçince
- Alıcılar: Kart üyeleri / Board yöneticileri / Belirli kullanıcılar
- Slack / Teams / Discord webhook URL'leri
- E-posta gönderen adı/adresi

Her bildirim **yalnızca bir kez** gönderilir (kart + eşik + son tarih
kombinasyonu için tekilleştirme yapılır; son tarih değişirse döngü
sıfırdan başlar). Tüm gönderimler (başarılı/başarısız) **Bildirim
Geçmişi** sayfasında tarih, kart adı, eşik, kime, yöntem ve durum
bilgisiyle listelenir.

### Bildirim içeriği örneği

```
⏰ Son Tarih Yaklaşıyor
Kart: İşe İade Davası Dilekçesi
İşe İade Davası Dilekçesi yarın sona eriyor.
Liste: Hazırlanıyor
Son Tarih: 25.07.2026
[Kartı Aç]
```

---

## E-posta Bildirimleri (Backend Kurulumu)

Tarayıcı JavaScript'i bir SMTP sunucusuna doğrudan erişemez; bu nedenle
e-posta gönderimi, bu depodaki `api/send-email.js` **Vercel Serverless
Function**'ı üzerinden, **Resend** (https://resend.com) servisi
kullanılarak yapılır. Gizli API anahtarı yalnızca sunucu tarafında
tutulur, tarayıcıya hiçbir zaman gönderilmez.

### Kurulum

1. https://resend.com adresinde ücretsiz bir hesap açın.
2. Sol menüden **"API Keys"** → **"Create API Key"** ile yeni bir anahtar
   oluşturun, kopyalayın (yalnızca bir kez gösterilir).
3. Vercel projenizin sayfasında **"Settings" → "Environment Variables"**
   bölümüne gidin.
4. Yeni bir değişken ekleyin:
   - **Key:** `RESEND_API_KEY`
   - **Value:** (Resend'den kopyaladığınız anahtar)
   - **Environment:** Production (ve isterseniz Preview/Development)
5. **"Save"** deyin, ardından Vercel projenizin **"Deployments"**
   sekmesinden son deployment'ın yanındaki "..." menüsünden
   **"Redeploy"** yapın (ortam değişkenleri yalnızca yeni bir deploy'da
   etkin olur).
6. (Önerilir, zorunlu değil) Resend panelinde **"Domains"** bölümünden
   kendi e-posta domaininizi doğrulayın; bu yapılmazsa e-postalar
   yalnızca test amaçlı `onboarding@resend.dev` sandbox adresinden
   gönderilir (gerçek alıcılara güvenilir teslimat için domain
   doğrulaması gerekir).
7. Power-Up'ın **Ayarlar** ekranında "E-posta" kanalını açın, "Gönderen
   Ad" ve "Gönderen E-posta" (doğruladığınız domain'den bir adres)
   alanlarını doldurun, "Belirli Kullanıcılar" alıcı modunu seçip alıcı
   e-posta adreslerini girin.

### Alternatif e-posta sağlayıcıları

`api/send-email.js` dosyası, aynı `{to, subject, text, html, fromName,
fromEmail}` girdisini kabul edip `{success, error}` döndüren basit bir
arayüze sahiptir. SendGrid, Mailgun, Postmark veya kendi SMTP proxy
sunucunuza geçmek isterseniz, bu dosyanın içindeki tek `fetch()`
çağrısını ilgili servisin REST uç noktasıyla değiştirmeniz yeterlidir;
`emailAdapter.js` ve geri kalan hiçbir dosya değişmez.

---

## Slack / Discord / Teams Webhook Kurulumu

### Slack

1. https://api.slack.com/apps → **"Create New App"** → **"From
   scratch"**.
2. Sol menüden **"Incoming Webhooks"** → açık (On) konuma getirin.
3. **"Add New Webhook to Workspace"** → bildirim gitmesini istediğiniz
   kanalı seçin → **"Allow"**.
4. Oluşan `https://hooks.slack.com/services/...` adresini kopyalayıp
   Power-Up **Ayarlar** ekranındaki "Slack Webhook URL" alanına
   yapıştırın.

### Discord

1. Discord'da ilgili sunucuda, bildirim gitmesini istediğiniz kanalın
   **Kanal Ayarları** (dişli ikonu) → **Entegrasyonlar** → **Webhooks**
   → **"Yeni Webhook"**.
2. İsterseniz isim/avatar değiştirin, **"Webhook URL'sini Kopyala"**
   deyin.
3. URL'yi Power-Up **Ayarlar** ekranındaki "Discord Webhook URL"
   alanına yapıştırın.

### Microsoft Teams

1. İlgili kanalda **"..."** → **"Connectors"** (eski arayüz) veya
   **"Workflows"** (yeni arayüz, "Post to a channel when a webhook
   request is received" şablonu).
2. Webhook'u oluşturup verilen URL'yi kopyalayın.
3. URL'yi Power-Up **Ayarlar** ekranındaki "Teams Webhook URL" alanına
   yapıştırın.

> **Not:** Slack ve Teams webhook uç noktaları tarayıcıya CORS izni
> vermediğinden, bu iki kanaldaki gönderim "en iyi çaba" (best-effort)
> ile yapılır — istek atılabildi mi kesin olarak bilinir, ancak mesajın
> kanalda göründüğü tarayıcı tarafından doğrulanamaz. Discord ve
> e-posta backend'i için gerçek HTTP durum kodu okunur ve
> başarılı/başarısız net olarak ayırt edilir.

---

## Yeni Bir Bildirim Kanalı Eklemek

Adapter pattern sayesinde yeni bir kanal eklemek `NotificationService`,
`ReminderService` veya `SchedulerService`'te **hiçbir değişiklik
gerektirmez**:

1. Yeni bir `xyzAdapter.js` dosyası oluşturun:
   ```js
   (function (root) {
     async function send(message, config) {
       // message: { title, bodyLines, cardName, listName, dueLabel, cardUrl, ... }
       // config: settings.integrations içindeki ilgili alan
       return { success: true }; // veya { success: false, error: '...' }
     }
     const XyzAdapter = { channelId: 'xyz', send };
     if (typeof module !== 'undefined' && module.exports) module.exports = XyzAdapter;
     else root.XyzAdapter = XyzAdapter;
   })(typeof window !== 'undefined' ? window : globalThis);
   ```
2. `notificationService.js`'in başındaki kayıt bloğuna bir satır ekleyin:
   ```js
   if (typeof XyzAdapter !== 'undefined') registerAdapter(XyzAdapter);
   ```
3. `connector.html`'e `<script src="xyzAdapter.js"></script>` ekleyin
   (`notificationService.js`'den ÖNCE).
4. `settings.html`/`settings.js`'e ilgili checkbox/config alanlarını
   ekleyin.

---

## Depolama Mimarisi (Storage Audit)

Aşağıdaki tablo, `storageService.js` içindeki her anahtarın hangi
kapsamda (scope) tutulduğunu ve NEDEN o kapsamın doğru seçim olduğunu
özetler (v1.0.0 denetiminde gözden geçirilmiş, değişiklik gerekmemiştir):

| Anahtar | Kapsam | Neden |
|---|---|---|
| `hmkSonGun` (HMK son gün) | `card` / `shared` | Kartın kendisine ait bilgi; kartı gören herkes (board'daki herkes) aynı değeri görmeli |
| `hmk_hidden_cards` (gizleme haritası) | `board` / `shared` | Bir kullanıcının gizlediği kartı, aynı board'daki diğer kullanıcılar da (hatırlatma taraması dahil) tutarlı şekilde görmeli |
| `hmk_settings` (bildirim ayarları) | `board` / `shared` | Bildirim tercihleri board-geneli bir yapılandırmadır, kullanıcıya özel değildir |
| `hmk_sent_thresholds` (gönderim tekilleştirme) | `board` / `shared` | Bir kullanıcının tetiklediği taramada gönderilen bildirim, başka bir kullanıcının taramasında TEKRAR gönderilmemeli |
| `hmk_notification_log` (bildirim geçmişi) | `board` / `shared` | Ekip geneli görünürlük gereklidir |
| `hmk_last_scheduler_run` | `board` / `shared` | Taramanın son çalışma zamanı board-geneli bir durumdur |

`organization` (workspace geneli) kapsamı kasıtlı olarak
**kullanılmamıştır**: farklı panoların farklı bildirim tercihlerine
(örn. bir pano yalnızca Slack, diğeri yalnızca e-posta) sahip olabilmesi
gerektiğinden, `board` kapsamı daha doğru granülariteyi sağlar.
`private` (kullanıcıya özel) kapsamı da kullanılmamıştır: yukarıdaki
verilerin hiçbiri kullanıcıya özel değildir, tam tersine ekip geneli
tutarlılık gerektirir.

---

## Platform Sınırları — Dürüst Bir Değerlendirme

| Sınır | Açıklama |
|---|---|
| **"Arka plan" çalışması yok** | Trello Power-Up'ları sunucu tarafında **çalıştırılamaz** — bu bir statik site olduğundan, Power-Up yalnızca bir kullanıcı ilgili board'u tarayıcıda **açık tuttuğu** sürece kod çalıştırabilir. Kimse board'u açık tutmuyorsa, o saatlerde **hiçbir bildirim gönderilmez.** Kesin/7-gün-24-saat teslimat gerekiyorsa, `reminderService.js` mantığını temel alan ayrı bir sunucu tarafı zamanlayıcı (örn. Vercel Cron Job + Trello REST API) kurulması gerekir — bu depo kapsamının dışındadır. |
| **Kart gerçekten gizlenemez** | Trello native board görünümünden kart kaldırma, Power-Up API'sinde desteklenmez (bkz. Özellik 1). |
| **Slack/Teams isteği kesin doğrulanamaz** | CORS kısıtı nedeniyle "en iyi çaba" ile gönderilir (yukarıya bakın). |
| **E-posta üçüncü taraf servise bağımlı** | Doğrudan SMTP erişimi tarayıcıdan mümkün değildir; bir backend (bu depoda Resend ile hazır) gerekir. |
| **Depolama 4096 karakter sınırı** | Trello Power-Up Storage, tek bir anahtar için 4096 karaktere izin verir. `NOTIFICATION_LOG` ve `SENT_THRESHOLDS` bu sınırın altında kalacak şekilde otomatik olarak budanır — eski kayıtlar zamanla düşer. |
| **Çok büyük board'larda tek taramada bildirim sınırı** | Bir taramada en fazla 25 yeni bildirim gönderilir (webhook/e-posta servislerinin hız sınırlarına takılmamak için); kalan kartlar bir sonraki taramada işlenir, veri kaybı olmaz. |
| **Webhook URL'leri board'daki herkese teknik olarak erişilebilir** | Ayarlar `board-shared` kapsamda saklanır (panodaki herkesin aynı ayarları kullanabilmesi için); webhook URL'leri API anahtarı gibi yarı-gizli sayılmalıdır. |

---

## Sorun Giderme

| Belirti | Muhtemel sebep / çözüm |
|---|---|
| Sayfa açılır açılmaz kırmızı bir hata kutusu görüyorum | `config.js` içindeki `TRELLO_API_KEY` boş. Adım 9'u tamamlayın. |
| Kart/pano butonları hiç görünmüyor | `connector.html`'in tüm script'leri doğru sırayla yüklediğinden emin olun; tarayıcı konsolunda 404/exception arayın. |
| `GET .../power-up.js 404` | Dosyalar repo kökünde değil, bir alt klasörde. Kökte olduklarını GitHub'da kontrol edin. |
| "Hesapla ve Uygula" çalışmıyor | `config.js`'teki `TRELLO_API_KEY`'in doğru ve Vercel'e deploy edilmiş olduğundan emin olun (Adım 9, son push). |
| Tarayıcı bildirimi çıkmıyor | Ayarlar'da izin durumunu gösteren metni kontrol edin; "reddedildi" ise tarayıcının site ayarlarından elle izin vermeniz gerekir. |
| Slack/Teams mesajı gelmiyor ama "başarılı" görünüyor | Bu kanallarda CORS nedeniyle kesin doğrulama yapılamaz; webhook URL'sinin doğru olduğunu ilgili platformda kontrol edin. |
| E-posta gitmiyor, "RESEND_API_KEY tanımlı değil" hatası | Vercel'de Environment Variable eklemeyi ve ardından **Redeploy** yapmayı unutmayın (env değişkenleri yalnızca yeni deploy'larda etkinleşir). |
| Bildirim Geçmişi boş | Henüz hiçbir eşik tetiklenmemiş olabilir ya da bildirimler kapalı — Ayarlar'ı kontrol edin. |

---

## Sürüm Geçmişi ve Lisans

- Sürüm geçmişi için `CHANGELOG.md` dosyasına bakın.
- Lisans: MIT (bkz. `LICENSE`).
- **Dinî bayram tarihleri:** `holidays.js` içindeki `RELIGIOUS_HOLIDAYS`
  tablosunda yalnızca **2025-2027** yılları için Diyanet kaynaklı
  doğrulanmış veriler bulunur; sonraki yıllar için tabloya yeni girişler
  eklenmelidir.
- Bu araç bir **hesaplama/hatırlatma yardımcısıdır**, hukuki tavsiye
  niteliği taşımaz. Kritik süreler için sonucu mutlaka manuel olarak
  teyit edin.
