/**
 * api/send-email.js
 * -----------------------------------------------------------------------
 * Vercel Serverless Function (Node runtime). E-posta gönderme isteğini
 * tarayıcıdan alır, gerçek gönderimi sunucu tarafında Resend
 * (https://resend.com) REST API'si üzerinden yapar.
 *
 * NEDEN BİR BACKEND GEREKİYOR:
 * Tarayıcı JavaScript'i bir SMTP sunucusuna veya e-posta sağlayıcısının
 * gizli API anahtarı gerektiren uç noktalarına DOĞRUDAN erişemez —
 * erişebilseydi, o anahtar herkesin görebileceği istemci kodunda ifşa
 * olurdu. Bu fonksiyon, gizli anahtarı (RESEND_API_KEY) yalnızca sunucu
 * tarafında, Vercel'in Ortam Değişkenleri'nde tutar; tarayıcıya asla
 * gönderilmez.
 *
 * NEDEN RESEND:
 * Basit bir REST API'si vardır (SDK/bağımlılık gerekmez — düz `fetch`
 * yeterlidir), bu da bu projenin "build adımı yok" ilkesini bozmadan
 * (Vercel serverless fonksiyonları zaten Node çalıştırır, ayrı bir
 * npm paketi kurulumu gerekmez) çalışmasını sağlar. Ücretsiz katmanı
 * vardır. Aynı adapter arayüzünü koruyarak SendGrid / Mailgun /
 * Postmark / kendi SMTP proxy'nize de kolayca geçebilirsiniz — bkz.
 * README.md § "Alternatif E-posta Sağlayıcıları".
 *
 * KURULUM: README.md § "E-posta Bildirimleri (Backend Kurulumu)".
 * -----------------------------------------------------------------------
 */

const RESEND_API_URL = 'https://api.resend.com/emails';

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 */
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Yalnızca POST istekleri kabul edilir.' });
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    res.status(500).json({
      error:
        "RESEND_API_KEY tanımlı değil. Vercel projenizde Settings > Environment " +
        "Variables bölümünden ekleyip yeniden deploy edin (bkz. README.md § " +
        "'E-posta Bildirimleri').",
    });
    return;
  }

  const body = req.body || {};
  const { to, subject, text, html, fromName, fromEmail } = body;

  if (!to || (Array.isArray(to) && to.length === 0)) {
    res.status(400).json({ error: "'to' alanı zorunludur (en az bir e-posta adresi)." });
    return;
  }
  if (!subject) {
    res.status(400).json({ error: "'subject' alanı zorunludur." });
    return;
  }
  if (!text && !html) {
    res.status(400).json({ error: "'text' veya 'html' alanlarından en az biri zorunludur." });
    return;
  }

  // Gönderen adresi doğrulanmış bir domain gerektirir (Resend panelinden
  // eklenir); yapılandırılmamışsa Resend'in sandbox adresine düşülür —
  // bu, gerçek kullanıcılara teslimat için yeterli DEĞİLDİR, yalnızca
  // test amaçlıdır (bkz. README.md).
  const senderName = fromName && String(fromName).trim() ? String(fromName).trim() : 'HMK Süre Hesaplama';
  const senderEmail =
    fromEmail && String(fromEmail).trim() ? String(fromEmail).trim() : 'onboarding@resend.dev';

  try {
    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${senderName} <${senderEmail}>`,
        to: Array.isArray(to) ? to : [to],
        subject,
        text: text || undefined,
        html: html || undefined,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      res.status(response.status).json({
        error: (data && data.message) || `Resend API HTTP ${response.status} döndürdü.`,
      });
      return;
    }

    res.status(200).json({ success: true, id: data.id || null });
  } catch (err) {
    res.status(500).json({ error: (err && err.message) || 'E-posta gönderilirken beklenmeyen bir hata oluştu.' });
  }
};
