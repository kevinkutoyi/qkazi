import { Resend } from "resend";

function getResend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error(
      "RESEND_API_KEY is not set. Get one from https://resend.com and put it in .env.",
    );
  }
  return new Resend(key);
}

function getFrom(): string {
  return process.env.RESEND_FROM ?? "Qkazi <onboarding@resend.dev>";
}

function appUrl(): string {
  return process.env.APP_URL ?? "http://localhost:3000";
}

async function send(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  const { data, error } = await getResend().emails.send({
    from: getFrom(),
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  });
  if (error) {
    // Don't leak provider error details to the user; log on the server.
    console.error("[mailer] Resend error:", error);
    throw new Error("Failed to send email");
  }
  return data;
}

function wrap(title: string, body: string): string {
  // Inline-styled, single-column transactional template. Renders OK in
  // Gmail, Outlook, and Apple Mail without any external CSS.
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111827;">
    <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:24px;">
        <span style="display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:6px;background:#16a34a;color:#fff;font-weight:700;">Q</span>
        <span style="font-size:18px;font-weight:600;">Qkazi</span>
      </div>
      <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;">
        <h1 style="margin:0 0 12px;font-size:20px;">${title}</h1>
        ${body}
      </div>
      <p style="margin-top:24px;font-size:12px;color:#6b7280;text-align:center;">
        You received this email because someone used your address on Qkazi.
        If that wasn't you, you can ignore it safely.
      </p>
    </div>
  </body>
</html>`;
}

function button(href: string, label: string): string {
  return `<p style="margin:20px 0;">
    <a href="${href}" style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;font-weight:600;">
      ${label}
    </a>
  </p>`;
}

export async function sendVerificationEmail(opts: {
  to: string;
  name: string;
  token: string;
}) {
  const url = `${appUrl()}/verify-email/confirm?token=${encodeURIComponent(opts.token)}`;
  const html = wrap(
    "Confirm your email",
    `<p>Hi ${escapeHtml(opts.name)},</p>
     <p>Welcome to Qkazi! Please confirm your email address so you can log in.</p>
     ${button(url, "Confirm email")}
     <p style="font-size:12px;color:#6b7280;">Or paste this URL into your browser:<br/><span style="word-break:break-all;">${url}</span></p>
     <p style="font-size:12px;color:#6b7280;">This link expires in 24 hours.</p>`,
  );
  const text = `Welcome to Qkazi!

Confirm your email by opening this link (expires in 24 hours):

${url}`;
  await send({
    to: opts.to,
    subject: "Confirm your Qkazi email",
    html,
    text,
  });
}

export async function sendPasswordResetEmail(opts: {
  to: string;
  name: string;
  token: string;
}) {
  const url = `${appUrl()}/password-reset/confirm?token=${encodeURIComponent(opts.token)}`;
  const html = wrap(
    "Reset your password",
    `<p>Hi ${escapeHtml(opts.name)},</p>
     <p>Someone asked to reset the password for your Qkazi account. If that was you, click below to choose a new one.</p>
     ${button(url, "Reset password")}
     <p style="font-size:12px;color:#6b7280;">Or paste this URL into your browser:<br/><span style="word-break:break-all;">${url}</span></p>
     <p style="font-size:12px;color:#6b7280;">This link expires in 1 hour. If you didn't request this, ignore the email.</p>`,
  );
  const text = `Reset your Qkazi password by opening this link (expires in 1 hour):

${url}

If you didn't request this, ignore the email.`;
  await send({
    to: opts.to,
    subject: "Reset your Qkazi password",
    html,
    text,
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
