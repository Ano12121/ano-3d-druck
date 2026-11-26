import nodemailer from 'nodemailer';

const STATUS_LABELS = {
  neu: 'Bestellung eingegangen',
  slicing: 'Slicing & Druckvorbereitung',
  im_druck: 'Auf dem Druckbett (aktiv im Druck)',
  finish: 'Qualitätscheck & Finishing',
  versendet: 'Versendet — unterwegs zu dir',
};

export function isSmtpConfigured() {
  return Boolean(
    process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
  );
}

function getTransporter() {
  if (!isSmtpConfigured()) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

function formatEurServer(amount) {
  return `${Number(amount || 0).toFixed(2).replace('.', ',')} €`;
}

export async function dispatchStudioEmail({ to, subject, text, html, type }) {
  const from =
    process.env.SMTP_FROM ||
    process.env.SMTP_USER ||
    'LAYERLAB 3D-Studio <no-reply@layerlab.local>';

  const entry = {
    id: `MAIL-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    to,
    from,
    subject,
    text,
    html,
    type: type || 'notification',
    mode: isSmtpConfigured() ? 'smtp' : 'preview',
    delivered: false,
    error: null,
    createdAt: new Date().toISOString(),
  };

  const transporter = getTransporter();
  if (transporter) {
    try {
      await transporter.sendMail({ from, to, subject, text, html });
      entry.delivered = true;
    } catch (err) {
      entry.error = err.message || 'SMTP Versand fehlgeschlagen';
    }
  } else {
    entry.delivered = true; // logged cleanly in Studio E-Mail-Ausgang preview
  }

  return entry;
}

export async function sendOrderConfirmationEmail(order, studio) {
  const brand = studio?.brandName || 'LAYERLAB';
  const itemLines = order.items
    .map(
      (i) =>
        `• ${i.quantity}x ${i.title} (${i.colorName}, ${i.sizeOption}) — ${formatEurServer(
          i.unitPrice * i.quantity
        )}`
    )
    .join('\n');

  const htmlRows = order.items
    .map(
      (i) =>
        `<tr>
          <td style="padding:8px 0;border-bottom:1px solid #242834;color:#F4F4F0;">${i.quantity}× ${i.title}<br/><span style="font-size:12px;color:#8E95A5;">${i.colorName} • ${i.sizeOption}</span></td>
          <td style="padding:8px 0;border-bottom:1px solid #242834;text-align:right;font-family:monospace;color:#F4F4F0;">${formatEurServer(
            i.unitPrice * i.quantity
          )}</td>
        </tr>`
    )
    .join('');

  const subject = `${brand}: Deine 3D-Druck Bestellung ${order.id} ist eingegangen!`;
  const text = `Hallo ${order.customer.name},\n\nvielen Dank für deine Bestellung bei ${brand}!\n\nBestellnummer: ${order.id}\nZahlungsart: ${order.paymentMethod}\nStatus: ${STATUS_LABELS[order.status] || order.status}\n\nArtikel:\n${itemLines}\n\nZwischensumme: ${formatEurServer(order.subtotal)}\nVersand: ${order.shipping === 0 ? 'Kostenlos' : formatEurServer(order.shipping)}\nGesamt: ${formatEurServer(order.total)}\n\nMit deinem Code ${order.id} kannst du jederzeit live im Shop verfolgen, wann dein Druck auf dem Druckbett liegt!\n\nBeste Grüße,\n${brand}`;

  const html = `
    <div style="background:#090A0D;color:#F4F4F0;font-family:system-ui,sans-serif;padding:28px;border-radius:16px;max-width:560px;margin:auto;border:1px solid #232733;">
      <div style="font-size:12px;letter-spacing:2px;color:#FF5500;font-family:monospace;font-weight:700;">${brand} // 3D-DRUCK STUDIO</div>
      <h1 style="font-size:22px;margin:10px 0 6px;">Danke für deine Bestellung, ${order.customer.name}!</h1>
      <p style="color:#9DA4B4;font-size:14px;margin:0 0 18px;">Dein Druckauftrag <strong style="color:#FF7326;font-family:monospace;">${order.id}</strong> wurde erfolgreich registriert.</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">${htmlRows}</table>
      <div style="margin-top:16px;text-align:right;font-family:monospace;font-size:16px;font-weight:700;color:#FF7326;">Gesamt: ${formatEurServer(order.total)}</div>
      <p style="margin-top:20px;font-size:12px;color:#8E95A5;">Tracking-Code im Shop: <strong>${order.id}</strong></p>
    </div>`;

  return dispatchStudioEmail({
    to: order.customer.email,
    subject,
    text,
    html,
    type: 'order_confirmation',
  });
}

export async function sendOrderStatusEmail(order, studio) {
  const brand = studio?.brandName || 'LAYERLAB';
  const label = STATUS_LABELS[order.status] || order.status;
  const subject = `${brand}: Update zu deinem 3D-Druck ${order.id} — ${label}`;
  const text = `Hallo ${order.customer.name},\n\nes gibt Neuigkeiten zu deinem Auftrag ${order.id}!\nNeuer Status: ${label}\n\nDu kannst den aktuellen Fortschritt jederzeit mit deinem Code ${order.id} im Shop ansehen.\n\nViele Grüße,\n${brand}`;
  const html = `
    <div style="background:#090A0D;color:#F4F4F0;font-family:system-ui,sans-serif;padding:24px;border-radius:14px;max-width:520px;margin:auto;border:1px solid #232733;">
      <div style="font-size:11px;letter-spacing:2px;color:#38BDF8;font-family:monospace;">LIVE DRUCK-UPDATE // ${order.id}</div>
      <h2 style="margin:10px 0 8px;font-size:20px;">${label}</h2>
      <p style="color:#9DA4B4;font-size:14px;margin:0;">Hallo ${order.customer.name}, dein 3D-Druck bei ${brand} hat den nächsten Produktionsschritt erreicht.</p>
    </div>`;

  return dispatchStudioEmail({
    to: order.customer.email,
    subject,
    text,
    html,
    type: 'status_update',
  });
}
