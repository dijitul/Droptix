/**
 * Shared email scaffolding — industrial brand wrapper, table-based
 * layout, inline styles only.
 *
 * Email rendering reality:
 *   · Outlook desktop uses Word's HTML engine — no flexbox/grid, no
 *     <link>/<style> reliability, no border-radius, no SVG.
 *   · Gmail strips <style> tags in some webmail/Android versions.
 *   · Apple Mail / iOS will respect most CSS but inverts darks
 *     unintelligently in dark mode unless you use the supported
 *     `color-scheme` and `meta name="color-scheme"` hints.
 *   · Many corporate clients block remote images by default.
 *
 * Strategy: tables for structure, inline styles for everything,
 * brand colours as hex (not CSS vars), high-contrast dark surface
 * with light text. Hero images render with descriptive alt so the
 * email reads even when blocked.
 */

export const BRAND = {
  // Mirror src/app/globals.css :root values exactly. Hard-coded
  // because email runtime can't read CSS vars from the web app.
  surface: '#111508',
  surfaceContainer: '#1e2113',
  surfaceContainerHigh: '#282b1d',
  outlineVariant: '#444933',
  onSurface: '#e2e4cf',
  onSurfaceVariant: '#c4c9ac',
  primary: '#abd600',
  onPrimary: '#283500',
  secondary: '#ff5e07',
  tertiary: '#7df4ff',
} as const;

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export type EmailLayoutOptions = {
  /** Plain-English preview shown by Gmail/Apple Mail in the inbox list. */
  preheader: string;
  /** Pre-rendered HTML body (the bit between header and footer). */
  bodyHtml: string;
  appUrl: string;
  /** Optional CTA — rendered above the body if provided. */
  cta?: { label: string; href: string };
};

/**
 * Wrap body content in the Droptix email shell.
 *
 * Returns a complete HTML document, ready to drop into Mailgun.
 */
export function emailLayout({ preheader, bodyHtml, appUrl, cta }: EmailLayoutOptions): string {
  return `<!doctype html>
<html lang="en-GB">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="dark light" />
  <meta name="supported-color-schemes" content="dark light" />
  <title>Droptix</title>
</head>
<body style="margin:0; padding:0; background:${BRAND.surface}; color:${BRAND.onSurface}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;">
  <!-- Preheader: visible in inbox list, hidden in email body -->
  <div style="display:none; max-height:0; overflow:hidden; opacity:0; mso-hide:all; visibility:hidden;">
    ${escapeHtml(preheader)}
  </div>

  <!-- Outer wrapper for mail clients that don't honour body bg -->
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${BRAND.surface}; padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px; width:100%;">
          <!-- Header — brand bar with hazard stripe underline -->
          <tr>
            <td style="padding:20px 24px; background:${BRAND.surfaceContainer}; border:2px solid ${BRAND.outlineVariant}; border-bottom:0;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; font-size:22px; font-weight:700; letter-spacing:0.5px; color:${BRAND.onSurface}; text-transform:uppercase;">
                    <a href="${appUrl}" style="color:${BRAND.onSurface}; text-decoration:none;">
                      <span style="color:${BRAND.primary};">▣</span>&nbsp;Droptix
                    </a>
                  </td>
                  <td align="right" style="font-family: 'JetBrains Mono', 'IBM Plex Mono', ui-monospace, monospace; font-size:11px; color:${BRAND.tertiary}; letter-spacing:1px; text-transform:uppercase;">
                    UK · Music
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Hazard stripe (image fallback for clients that don't render gradients) -->
          <tr>
            <td style="height:6px; background-color:${BRAND.primary}; background-image: repeating-linear-gradient(45deg, ${BRAND.primary} 0, ${BRAND.primary} 10px, ${BRAND.secondary} 10px, ${BRAND.secondary} 20px); line-height:6px; font-size:0;">&nbsp;</td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 24px; background:${BRAND.surfaceContainer}; border:2px solid ${BRAND.outlineVariant}; border-top:0; border-bottom:0;">
              ${bodyHtml}

              ${
                cta
                  ? `
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;">
                <tr>
                  <td>
                    <a href="${cta.href}" style="display:inline-block; background:${BRAND.primary}; color:${BRAND.onPrimary}; text-decoration:none; padding:14px 24px; font-weight:700; font-size:14px; letter-spacing:1.5px; text-transform:uppercase; border:2px solid ${BRAND.primary};">
                      ${escapeHtml(cta.label)}
                    </a>
                  </td>
                </tr>
              </table>`
                  : ''
              }
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 24px; background:${BRAND.surfaceContainer}; border:2px solid ${BRAND.outlineVariant}; border-top:0;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; font-size:12px; line-height:1.6; color:${BRAND.onSurfaceVariant};">
                    <strong style="color:${BRAND.onSurface};">Droptix</strong>
                    &mdash; UK tickets for the music scene that actually matters.
                    <br />
                    <a href="${appUrl}/discover" style="color:${BRAND.tertiary}; text-decoration:none;">Browse events</a>
                    &nbsp;·&nbsp;
                    <a href="${appUrl}/support" style="color:${BRAND.tertiary}; text-decoration:none;">Get help</a>
                    &nbsp;·&nbsp;
                    <a href="${appUrl}/legal/privacy" style="color:${BRAND.tertiary}; text-decoration:none;">Privacy</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Spacer below outer card -->
          <tr>
            <td style="height:24px; line-height:24px; font-size:0;">&nbsp;</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Render a single line of "label · value" in the body, with the label
 * in tertiary cyan tech-tag style. Used in order confirmations to
 * surface event date, venue, etc.
 */
export function metaRow(label: string, value: string): string {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:8px;">
    <tr>
      <td width="120" style="font-family: 'JetBrains Mono', ui-monospace, monospace; font-size:11px; color:${BRAND.tertiary}; letter-spacing:1px; text-transform:uppercase; padding-right:16px; vertical-align:top;">
        ${escapeHtml(label)}
      </td>
      <td style="font-family: -apple-system, BlinkMacSystemFont, system-ui, sans-serif; font-size:15px; color:${BRAND.onSurface}; vertical-align:top;">
        ${value}
      </td>
    </tr>
  </table>`;
}
