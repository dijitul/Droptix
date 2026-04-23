import { spawn } from 'node:child_process';
import { getIntegration } from './integrations';
import { env } from '@/lib/env';

/**
 * Mail sender with graceful fallbacks, so the admin is never locked
 * out of their own site:
 *
 *   1. Mailgun EU (preferred) — if API key + domain configured in
 *      /admin/integrations
 *   2. Local sendmail (default on CyberPanel / Postfix boxes)
 *   3. Console log to PM2 stdout — user can `pm2 logs droptix` to grab
 *      the magic-link URL
 *
 * Priority is tight: the moment a Mailgun API key + domain are entered
 * at /admin/integrations, all traffic routes there — no redeploy needed.
 */

export type MailAddress = { email: string; name?: string };

export type SendMailParams = {
  to: MailAddress | MailAddress[];
  subject: string;
  htmlBody: string;
  textBody: string;
  headers?: Record<string, string>;
};

const MAILGUN_EU_BASE = 'https://api.eu.mailgun.net/v3';

export async function sendMail(params: SendMailParams): Promise<void> {
  const [mailgunKey, mailgunDomain, fromEmailCfg, fromNameCfg] = await Promise.all([
    getIntegration('MAILGUN', 'api_key'),
    getIntegration('MAILGUN', 'domain'),
    getIntegration('MAILGUN', 'from_email'),
    getIntegration('MAILGUN', 'from_name'),
  ]);
  const fromEmail = fromEmailCfg ?? 'tickets@droptix.co.uk';
  const fromName = fromNameCfg ?? 'Droptix';
  const toList = Array.isArray(params.to) ? params.to : [params.to];

  // ── 1. Mailgun EU ──────────────────────────────────────────
  if (mailgunKey && mailgunDomain) {
    try {
      await sendViaMailgun({ ...params, fromEmail, fromName, toList, apiKey: mailgunKey, domain: mailgunDomain });
      return;
    } catch (err) {
      console.warn('[mail] Mailgun send failed, falling back to sendmail:', err instanceof Error ? err.message : err);
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

async function sendViaMailgun(params: SendMailParams & {
  fromEmail: string;
  fromName: string;
  toList: MailAddress[];
  apiKey: string;
  domain: string;
}): Promise<void> {
  const body = new URLSearchParams();
  body.append('from', `${params.fromName} <${params.fromEmail}>`);
  for (const r of params.toList) {
    body.append('to', r.name ? `${r.name} <${r.email}>` : r.email);
  }
  body.append('subject', params.subject);
  body.append('text', params.textBody);
  body.append('html', params.htmlBody);
  body.append('o:tracking-clicks', 'no');
  body.append('o:tracking-opens', 'no');
  if (params.headers) {
    for (const [k, v] of Object.entries(params.headers)) {
      body.append(`h:${k}`, v);
    }
  }

  const auth = Buffer.from(`api:${params.apiKey}`).toString('base64');
  const url = `${MAILGUN_EU_BASE}/${encodeURIComponent(params.domain)}/messages`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Mailgun ${res.status}: ${text.slice(0, 300)}`);
  }
  const to = params.toList.map((t) => t.email).join(', ');
  console.log(`[mail] sent via Mailgun EU → ${to}`);
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
