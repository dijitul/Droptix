import { spawn } from 'node:child_process';
import { getIntegration } from './integrations';
import { env } from '@/lib/env';

/**
 * Mail sender with graceful fallbacks, so the admin is never locked
 * out of their own site:
 *
 *   1. SMTP2GO (preferred) — if an API key is configured in
 *      /admin/integrations (HTTP send API, no SMTP connection needed)
 *   2. Local sendmail (default on CyberPanel / Postfix boxes)
 *   3. Console log to PM2 stdout — user can `pm2 logs droptix` to grab
 *      the magic-link URL
 *
 * Priority is tight: the moment an SMTP2GO API key is entered at
 * /admin/integrations, all traffic routes there — no redeploy needed.
 */

export type MailAddress = { email: string; name?: string };

export type SendMailParams = {
  to: MailAddress | MailAddress[];
  subject: string;
  htmlBody: string;
  textBody: string;
  headers?: Record<string, string>;
};

const SMTP2GO_SEND_URL = 'https://api.smtp2go.com/v3/email/send';

export async function sendMail(params: SendMailParams): Promise<void> {
  const [smtp2goKey, fromEmailCfg, fromNameCfg] = await Promise.all([
    getIntegration('SMTP2GO', 'api_key'),
    getIntegration('SMTP2GO', 'from_email'),
    getIntegration('SMTP2GO', 'from_name'),
  ]);
  const fromEmail = fromEmailCfg ?? 'tickets@droptix.co.uk';
  const fromName = fromNameCfg ?? 'Droptix';
  const toList = Array.isArray(params.to) ? params.to : [params.to];

  // ── 1. SMTP2GO ─────────────────────────────────────────────
  if (smtp2goKey) {
    try {
      await sendViaSmtp2go({ ...params, fromEmail, fromName, toList, apiKey: smtp2goKey });
      return;
    } catch (err) {
      console.warn('[mail] SMTP2GO send failed, falling back to sendmail:', err instanceof Error ? err.message : err);
    }
  }

  // ── 2. Local sendmail ──────────────────────────────────────
  try {
    await sendViaSendmail({ ...params, fromEmail, fromName, toList });
    return;
  } catch (err) {
    console.warn('[mail] sendmail failed:', err instanceof Error ? err.message : err);
  }

  // ── 3. Console log fallback ────────────────────────────────
  console.warn('[mail] ALL SENDERS FAILED — logging email so it isn\'t lost:');
  console.warn('  To:', toList.map((t) => t.email).join(', '));
  console.warn('  Subject:', params.subject);
  console.warn('  Body (text):');
  console.warn('  ' + params.textBody.split('\n').join('\n  '));
}

function formatAddress(a: MailAddress): string {
  return a.name ? `${a.name} <${a.email}>` : a.email;
}

async function sendViaSmtp2go(params: SendMailParams & {
  fromEmail: string;
  fromName: string;
  toList: MailAddress[];
  apiKey: string;
}): Promise<void> {
  // SMTP2GO /email/send accepts: sender, to, cc, bcc, subject, text_body,
  // html_body, custom_headers, attachments, inlines, template_id, template_data.
  // There is no per-request tracking toggle — open/click tracking is controlled
  // in the SMTP2GO dashboard (keep it off there for transactional-only sending).
  const payload: Record<string, unknown> = {
    sender: `${params.fromName} <${params.fromEmail}>`,
    to: params.toList.map(formatAddress),
    subject: params.subject,
    text_body: params.textBody,
    html_body: params.htmlBody,
  };
  if (params.headers) {
    payload.custom_headers = Object.entries(params.headers).map(([header, value]) => ({
      header,
      value,
    }));
  }

  const res = await fetch(SMTP2GO_SEND_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Header auth is SMTP2GO's recommended method (keeps the key out of the body).
      'X-Smtp2go-Api-Key': params.apiKey,
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text().catch(() => '');
  if (!res.ok) {
    throw new Error(`SMTP2GO ${res.status}: ${text.slice(0, 300)}`);
  }

  // SMTP2GO returns HTTP 200 even for per-recipient failures — inspect the body.
  let data: { data?: { succeeded?: number; failed?: number; failures?: unknown[]; error?: string } } = {};
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`SMTP2GO: unparseable response: ${text.slice(0, 200)}`);
  }
  const result = data.data ?? {};
  if (result.error || (result.failed ?? 0) > 0 || (result.succeeded ?? 0) < 1) {
    throw new Error(
      `SMTP2GO send rejected: ${result.error ?? JSON.stringify(result.failures ?? result).slice(0, 300)}`,
    );
  }

  const to = params.toList.map((t) => t.email).join(', ');
  console.log(`[mail] sent via SMTP2GO → ${to}`);
}

function sendViaSendmail(params: SendMailParams & {
  fromEmail: string;
  fromName: string;
  toList: MailAddress[];
}): Promise<void> {
  return new Promise((resolve, reject) => {
    const sendmailPath = process.env.SENDMAIL_PATH ?? '/usr/sbin/sendmail';
    const to = params.toList.map((t) => t.email).join(', ');
    const messageId = `<${Date.now()}.${Math.random().toString(36).slice(2)}@droptix.co.uk>`;

    const rfc5322 = [
      `From: ${params.fromName} <${params.fromEmail}>`,
      `To: ${to}`,
      `Subject: ${params.subject}`,
      `MIME-Version: 1.0`,
      `Message-ID: ${messageId}`,
      `Date: ${new Date().toUTCString()}`,
      `Content-Type: multipart/alternative; boundary="dtx_boundary"`,
      ``,
      `--dtx_boundary`,
      `Content-Type: text/plain; charset=utf-8`,
      `Content-Transfer-Encoding: 8bit`,
      ``,
      params.textBody,
      ``,
      `--dtx_boundary`,
      `Content-Type: text/html; charset=utf-8`,
      `Content-Transfer-Encoding: 8bit`,
      ``,
      params.htmlBody,
      ``,
      `--dtx_boundary--`,
      ``,
    ].join('\r\n');

    const proc = spawn(sendmailPath, ['-t', '-i', '-f', params.fromEmail]);
    let stderr = '';
    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) {
        console.log(`[mail] sent via sendmail → ${to}`);
        resolve();
      } else {
        reject(new Error(`sendmail exit ${code}: ${stderr.trim() || 'unknown'}`));
      }
    });
    proc.stdin.write(rfc5322);
    proc.stdin.end();
    void env; // keep reference
  });
}
