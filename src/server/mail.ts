import { ServerClient as PostmarkClient } from 'postmark';
import { requireIntegration, getIntegration } from './integrations';

/**
 * Transactional email via Postmark.
 * Switched to a getter-per-call so key rotation via admin panel takes
 * effect without a redeploy.
 */

async function getPostmark(): Promise<PostmarkClient> {
  const token = await requireIntegration('POSTMARK', 'server_token');
  return new PostmarkClient(token);
}

export type MailAddress = { email: string; name?: string };

export async function sendMail(params: {
  to: MailAddress | MailAddress[];
  subject: string;
  htmlBody: string;
  textBody: string;
  messageStream?: string; // 'outbound' | 'broadcast' — Postmark split for deliverability
  headers?: Record<string, string>;
  attachments?: Array<{ Name: string; Content: string; ContentType: string; ContentID?: string }>;
}): Promise<void> {
  const fromEmail = (await getIntegration('POSTMARK', 'from_email')) ?? 'tickets@droptix.co.uk';
  const fromName = (await getIntegration('POSTMARK', 'from_name')) ?? 'Droptix';

  const postmark = await getPostmark();
  const to = Array.isArray(params.to) ? params.to : [params.to];

  await postmark.sendEmail({
    From: `${fromName} <${fromEmail}>`,
    To: to.map((t) => (t.name ? `${t.name} <${t.email}>` : t.email)).join(', '),
    Subject: params.subject,
    HtmlBody: params.htmlBody,
    TextBody: params.textBody,
    MessageStream: params.messageStream ?? 'outbound',
    Headers: params.headers
      ? Object.entries(params.headers).map(([Name, Value]) => ({ Name, Value }))
      : undefined,
    Attachments: params.attachments,
    TrackOpens: false, // deliberate — don't burn privacy trust
    TrackLinks: 'None',
  });
}
