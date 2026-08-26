/**
 * browserNotificationAdapter.js
 * -----------------------------------------------------------------------
 * Kanal: Tarayıcı Bildirimi (Browser Notification API).
 *
 * ⚠️ PLATFORM SINIRI: Bu API yalnızca bildirimi tetikleyen kişinin O ANDA
 * AÇIK olan tarayıcı sekmesinde/oturumunda bildirim gösterebilir. Başka
 * bir kart üyesine, o kişi Trello'yu açık tutmuyorsa bildirim GÖNDEREMEZ
 * (bunun için sunucu taraflı Web Push + Service Worker + her kullanıcının
 * push aboneliğini saklayan bir backend gerekir — bu, saf statik bir
 * Power-Up'ın kapsamı dışındadır). Bu yüzden bu adaptör "alıcı" kavramını
 * yok sayar ve sadece geçerli oturumda bildirim gösterir.
 * -----------------------------------------------------------------------
 */

(function initBrowserNotificationAdapter(root) {
  /**
   * Tarayıcı bildirim izni ister (yalnızca henüz sorulmadıysa).
   * @returns {Promise<boolean>} İzin verildi mi?
   */
  async function ensurePermission() {
    if (typeof Notification === 'undefined') return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    try {
      const result = await Notification.requestPermission();
      return result === 'granted';
    } catch (err) {
      console.error('[BrowserNotificationAdapter] İzin istenemedi:', err);
      return false;
    }
  }

  /**
   * @param {import('./notificationService.js').NotificationMessage} message
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async function send(message) {
    if (typeof Notification === 'undefined') {
      return { success: false, error: 'Bu tarayıcı Notification API desteklemiyor.' };
    }

    const granted = await ensurePermission();
    if (!granted) {
      return { success: false, error: 'Tarayıcı bildirim izni verilmedi.' };
    }

    try {
      // eslint-disable-next-line no-new
      new Notification(message.title, {
        body: message.bodyLines.join('\n'),
        icon: message.iconUrl,
        tag: `hmk-${message.cardId}-${message.thresholdKey}`,
      });
      return { success: true };
    } catch (err) {
      return { success: false, error: err && err.message ? err.message : 'Bildirim gösterilemedi.' };
    }
  }

  const BrowserNotificationAdapter = { channelId: 'browser', send, ensurePermission };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = BrowserNotificationAdapter;
  } else {
    root.BrowserNotificationAdapter = BrowserNotificationAdapter;
  }
})(typeof window !== 'undefined' ? window : globalThis);
