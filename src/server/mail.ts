import { spawn } from 'node:child_process';
import { ServerClient as PostmarkClient, Models as PostmarkModels } from 'postmark';
import { getIntegration } from './integrations';
import { env } from '@/lib/env';

/**
 * Mail sender with graceful fallbacks, so the admin is never locked
 * out of their own site:
 *
 *   1. Postmark (preferred) — if token configured in the integrations vault
 *   2. Local sendmail (default on CyberPanel / Postfix boxes)
 *   3. Console log to PM2 stdout — user can `pm2 logs droptix` to grab the
 *      magic-link URL
 *
 * Priority is tight: the moment a Postmark token is entered at
 * /admin/integrations, all traffic routes there — no redeploy needed.
 */

export type MailAddress = { email: string; name?: string };

export type SendMailParams = {
  to: MailAddress | MailAddress[];
  subject: string;
  htmlBody: string;
  textBody: string;
  messageStream?: string;
  headers?: Record<string, string>;
};

export async function sendMail(params: SendMailParams): Promise<void> {
  const [postmarkToken, fromEmailCfg, fromNameCfg] = await Promise.all([
    getIntegration('POSTMARK', 'server_token'),
    getIntegration('POSTMARK', 'from_email'),
    getIntegration('POSTMARK', 'from_name'),
  ]);
  const fromEmail = fromEmailCfg ?? 'tickets@droptix.co.uk';
  const fromName = fromNameCfg ?? 'Droptix';
  const toList = Array.isArray(params.to) ? params.to : [params.to];

  // ── 1. Postmark ────────────────────────────────────────────
  if (postmarkToken) {
    try {
      const postmark = new PostmarkClient(postmarkToken);
      await postmark.sendEmail({
        From: `${fromName} <${fromEmail}>`,
        To: toList.map((t) => (t.name ? `${t.name} <${t.email}>` : t.email)).join(', '),
        Subject: params.subject,
        HtmlBody: params.htmlBody,
        TextBody: params.textBody,
        MessageStream: params.messageStream ?? 'outbound',
        Headers: params.headers
          ? Object.entries(params.headers).map(([Name, Value]) => ({ Name, Value }))
          : undefined,
        TrackOpens: false,
        TrackLinks: PostmarkModels.LinkTrackingOptions.None,
      });
      return;
    } catch (err) {
      console.warn('[mail] Postmark send failed, falling back to sendmail:', err instanceof Error ? err.message : err);
    }
  }

  // ── 2. Local sendmail ──────────────────────────────────────
  // Works on any CyberPanel / Postfix / Exim server. Cheap, reliable
  // enough for transactional admin + magic links. Not a long-term
  // answer (deliverability) — Postmark takes over the moment its
  // token is set.
  try {
    await sendViaSendmail({ ...params, fromEmail, fromName, toList });
    return;
  } catch (err) {
    console.warn('[mail] sendmail failed:', err instanceof Error ? err.message : err);
  }

  // ── 3. Console log fallback ────────────────────────────────
  // Last-resort: dump the email to server logs so an admin can SSH
  // in, `pm2 logs droptix`, copy out the magic-link URL. Only matters
  // on first-boot before Postmark / sendmail are working.
  console.warn('[mail] ALL SENDERS FAILED — logging email so it isn\'t lost:');
  console.warn('  To:', toList.map((t) => t.email).join(', '));
  console.warn('  Subject:', params.subject);
  console.warn('  Body (text):');
  console.warn('  ' + params.textBody.split('\n').join('\n  '));
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
