/**
 * reminderService.js
 * -----------------------------------------------------------------------
 * ÖZELLİK 2 — "Otomatik Hatırlatma" iş mantığı.
 *
 * Board'daki kartları (TEK bir API çağrısıyla — performans gereksinimi)
 * okur, her kart için hangi eşiklerin (7/3/1 gün önce, son gün, süresi
 * geçince) aşıldığını hesaplar, daha önce gönderilmemiş olanları
 * belirler ve NotificationService üzerinden dağıtır.
 *
 * ⚠️ ALICI SINIRI (dürüstçe belirtilmelidir): Trello Power-Up istemci
 * SDK'sı, kart üyelerinin e-posta adreslerini GÜVENLİK/GİZLİLİK
 * nedeniyle DÖNDÜRMEZ (yalnızca ad/soyad/avatar gibi genel bilgiler
 * alınabilir). Bu nedenle:
 *   - "Kart üyeleri" / "Board yöneticileri" seçenekleri, Tarayıcı
 *     Bildirimi ve Slack/Teams/Discord kanalları için birebir uygundur
 *     (bu kanallar belirli bir e-posta adresine değil, bir kanala/
 *     tarayıcı oturumuna bildirim gönderir).
 *   - E-posta kanalı için gerçek bir alıcı listesi gerektiğinden, e-posta
 *     her koşulda Ayarlar > "Belirli Kullanıcılar" alanına girilen
 *     adreslere gönderilir (kart üyelerinin e-postalarına OTOMATİK
 *     ERİŞİLEMEZ). Bu, Trello'nun kendi API kısıtıdır.
 * -----------------------------------------------------------------------
 */

/* global DateUtils, StorageService, SettingsService, SnoozeService, NotificationService */

(function initReminderService(root) {
  const DU = typeof DateUtils !== 'undefined' ? DateUtils : root.DateUtils;
  const SS = typeof StorageService !== 'undefined' ? StorageService : root.StorageService;

  /** daysUntilDue -> threshold anahtarı eşlemesi (tam gün eşleşmesi). */
  function thresholdForDaysUntil(daysUntil) {
    if (daysUntil === 7) return 'd7';
    if (daysUntil === 3) return 'd3';
    if (daysUntil === 1) return 'd1';
    if (daysUntil === 0) return 'dueDay';
    if (daysUntil < 0) return 'overdue';
    return null;
  }

  /**
   * Belirli bir kart+eşik için daha önce bildirim gönderilip
   * gönderilmediğini kontrol eder; kartın son tarihi değiştiyse eski
   * kayıt geçersiz sayılır (sıfırdan başlar).
   * @param {Object} sentMap - StorageService.KEYS.SENT_THRESHOLDS içeriği
   * @param {string} cardId
   * @param {string} dueISO
   * @param {string} thresholdKey
   * @returns {boolean}
   */
  function alreadySent(sentMap, cardId, dueISO, thresholdKey) {
    const record = sentMap[cardId];
    if (!record || record.dueISO !== dueISO) return false;
    return !!record.sent[thresholdKey];
  }

  /**
   * sentMap üzerinde ilgili kart+eşik için "gönderildi" işareti koyar.
   * Kartın son tarihi kayıttakinden farklıysa önce sıfırlar (yeni bir
   * son tarih = yeni bir bildirim döngüsü).
   */
  function markSent(sentMap, cardId, dueISO, thresholdKey) {
    if (!sentMap[cardId] || sentMap[cardId].dueISO !== dueISO) {
      sentMap[cardId] = { dueISO, sent: {} };
    }
    sentMap[cardId].sent[thresholdKey] = true;
  }

  /**
   * Ayarlardaki alıcı moduna göre, log/e-posta için insan-okunur bir
   * alıcı özeti üretir. Bkz. dosya başındaki ALICI SINIRI notu.
   * @param {Object} settings
   * @param {{idMembers: string[]}} card
   * @param {Object<string, {fullName: string}>} memberMap
   */
  function describeRecipients(settings, card, memberMap) {
    const mode = settings.recipients.mode;

    if (mode === 'custom') {
      const emails = settings.recipients.customEmails || [];
      return { label: emails.length ? emails.join(', ') : 'Belirli kullanıcılar (tanımsız)', emails };
    }

    if (mode === 'boardAdmins') {
      return { label: 'Board yöneticileri', emails: settings.recipients.customEmails || [] };
    }

    // Varsayılan: cardMembers
    const names = (card.idMembers || [])
      .map((id) => (memberMap[id] ? memberMap[id].fullName : null))
      .filter(Boolean);
    return {
      label: names.length ? `Kart üyeleri (${names.join(', ')})` : 'Kart üyeleri (atanmamış)',
      emails: settings.recipients.customEmails || [], // e-posta kanalı için gerçek adresler (bkz. üstteki not)
    };
  }

  /**
   * Board'daki TÜM kartları tek seferde okuyup hatırlatma taraması
   * yapar. card-badges gibi kart-bazlı sık tetiklenen bir capability
   * İÇİNDEN çağrılmamalıdır (performans için); bunun yerine
   * SchedulerService tarafından periyodik/tek seferlik olarak
   * board-buttons ya da zamanlayıcı üzerinden tetiklenmelidir.
   *
   * @param {TrelloPowerUp.Iframe} t
   * @returns {Promise<{checked: number, notified: number, skippedHidden: number}>}
   */
  async function scanBoardAndNotify(t) {
    const settings = await SettingsService.getSettings(t);
    if (!settings.notificationsEnabled) {
      return { checked: 0, notified: 0, skippedHidden: 0, disabled: true };
    }

    // TEK API çağrısıyla tüm kartlar (gereksiz çağrı yapılmaz).
    const [cards, lists, members] = await Promise.all([
      t.cards('id', 'name', 'due', 'idList', 'idMembers', 'url'),
      t.lists('id', 'name'),
      t.board('members'),
    ]);

    const listNameById = {};
    (lists || []).forEach((l) => {
      listNameById[l.id] = l.name;
    });

    const memberMap = {};
    ((members && members.members) || []).forEach((m) => {
      memberMap[m.id] = m;
    });

    const hiddenMap = await SnoozeService.pruneExpiredEntries(t);
    const sentMap = await SS.getBoardShared(t, SS.KEYS.SENT_THRESHOLDS, {});

    // PERFORMANS: çok büyük bir board'da (örn. 5000 kart) Power-Up ilk kez
    // etkinleştirildiğinde ya da uzun süre kapalı kaldıktan sonra açıldığında,
    // aynı anda binlerce kart eşiği aşmış olabilir. Bunların hepsini TEK bir
    // taramada, sıralı (sequential) webhook/e-posta çağrısı olarak göndermek
    // hem taramayı çok uzatır hem de üçüncü taraf servislerin (Slack/Discord/
    // Resend) hız sınırlarına (rate limit) takılma riski doğurur. Bu yüzden
    // tek bir taramada gönderilecek bildirim sayısı sınırlanır; kalan kartlar
    // bir sonraki periyodik/manuel taramada (dedupe sayesinde kaldığı yerden)
    // işlenir — veri kaybı olmaz, yalnızca dağıtım birkaç tarama turuna yayılır.
    const MAX_NOTIFICATIONS_PER_SCAN = 25;

    let checked = 0;
    let notified = 0;
    let skippedHidden = 0;
    let capped = false;

    for (const card of cards || []) {
      if (!card.due) continue;
      checked += 1;

      if (hiddenMap[card.id]) {
        skippedHidden += 1;
        continue; // kullanıcı bu kartı gizlemiş/ertelemiş — hatırlatma atlanır
      }

      if (notified >= MAX_NOTIFICATIONS_PER_SCAN) {
        capped = true;
        continue; // bu kart bir sonraki taramada işlenecek (checked sayımı devam eder)
      }

      const dueDate = new Date(card.due);
      const daysUntil = DU.daysBetween(DU.today(), dueDate);
      const thresholdKey = thresholdForDaysUntil(daysUntil);
      if (!thresholdKey) continue;
      if (!settings.thresholds[thresholdKey]) continue; // kullanıcı bu eşiği kapatmış
      if (alreadySent(sentMap, card.id, card.due, thresholdKey)) continue;

      const recipientInfo = describeRecipients(settings, card, memberMap);

      const message = NotificationService.buildMessage({
        card: {
          id: card.id,
          name: card.name,
          listName: listNameById[card.idList] || '—',
          dueLabel: DU.formatDateTR(dueDate),
          url: card.url,
        },
        thresholdKey,
      });

      // eslint-disable-next-line no-await-in-loop
      await NotificationService.dispatch(t, {
        message,
        channelsEnabled: settings.channels,
        channelConfigs: {
          slack: { webhookUrl: settings.integrations.slackWebhookUrl },
          teams: { webhookUrl: settings.integrations.teamsWebhookUrl },
          discord: { webhookUrl: settings.integrations.discordWebhookUrl },
          email: {
            fromName: settings.integrations.email.fromName,
            fromEmail: settings.integrations.email.fromEmail,
            toEmails: recipientInfo.emails,
            backendUrl: (root.HMK_CONFIG && root.HMK_CONFIG.EMAIL_BACKEND_URL) || '/api/send-email',
          },
        },
        recipientInfo,
      });

      markSent(sentMap, card.id, card.due, thresholdKey);
      notified += 1;
    }

    // ⚠️ SENT_THRESHOLDS de board-shared, 4096 karakter limitine tabi.
    // Artık board'da bulunmayan (silinmiş/arşivlenmiş) kartların
    // kayıtlarını düşürerek haritayı, gerçekte var olan kart sayısıyla
    // sınırlı tutuyoruz — aksi hâlde zamanla t.set() reddedebilir.
    const activeCardIds = new Set((cards || []).map((c) => c.id));
    const prunedSentMap = {};
    Object.keys(sentMap).forEach((cardId) => {
      if (activeCardIds.has(cardId)) prunedSentMap[cardId] = sentMap[cardId];
    });

    // Ek güvenlik payı: çok sayıda aktif kartlı büyük board'larda budanmış
    // harita bile 4096 karakteri aşabilir. Bu durumda en eski `setAtISO`
    // dışındaki kayıtları (en az önemli / en eski dueISO'lu olanları)
    // bütçe altına inene kadar düşürüyoruz. Bu, o kartlar için bir
    // sonraki taramada yeniden bildirim gönderilmesi anlamına gelebilir
    // (nadir, yalnızca çok büyük board'larda) — sessiz veri kaybından
    // (t.set reddi) çok daha güvenli bir davranıştır.
    let sentMapToSave = prunedSentMap;
    const SENT_MAP_CHAR_BUDGET = 3500;
    while (
      Object.keys(sentMapToSave).length > 1 &&
      JSON.stringify(sentMapToSave).length > SENT_MAP_CHAR_BUDGET
    ) {
      const idsByDue = Object.keys(sentMapToSave).sort((a, b) => {
        const da = new Date(sentMapToSave[a].dueISO).getTime();
        const db = new Date(sentMapToSave[b].dueISO).getTime();
        return da - db; // en eski son tarihli kayıt önce düşer
      });
      const next = { ...sentMapToSave };
      delete next[idsByDue[0]];
      sentMapToSave = next;
    }

    await SS.setBoardShared(t, SS.KEYS.SENT_THRESHOLDS, sentMapToSave);
    await SS.setBoardShared(t, SS.KEYS.LAST_SCHEDULER_RUN, new Date().toISOString());

    return { checked, notified, skippedHidden, disabled: false };
  }

  const ReminderService = { thresholdForDaysUntil, scanBoardAndNotify };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ReminderService;
  } else {
    root.ReminderService = ReminderService;
  }
})(typeof window !== 'undefined' ? window : globalThis);
