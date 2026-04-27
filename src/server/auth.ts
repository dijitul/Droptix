import NextAuth, { type DefaultSession } from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { db } from './db';
import { env } from '@/lib/env';
import { sendMail } from './mail';
import { BRAND, emailLayout } from './emails/_layout';

/**
 * Auth.js v5 — magic-link only, no passwords.
 * WCAG 3.3.8 compliant (no CAPTCHA cognitive puzzles required).
 *
 * User roles are set on the User row directly; the session type below
 * declares the shape so server components can `auth()` and get role.
 */

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: 'BUYER' | 'ORGANISER' | 'ADMIN' | 'SUPERADMIN';
    } & DefaultSession['user'];
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: 'database' },
  secret: env.AUTH_SECRET,
  trustHost: true,
  pages: {
    signIn: '/login',
    verifyRequest: '/login/check-email',
    error: '/login/error',
  },
  providers: [
    {
      id: 'magic-link',
      name: 'Email magic link',
      type: 'email',
      maxAge: 15 * 60, // 15 min — tighter than default 24h for security
      sendVerificationRequest: async ({ identifier, url }) => {
        // Industrial-brand magic link. The CTA URL has nothing
        // user-facing in it (token, callback) so we don't escape it
        // for display, only as an href.
        const bodyHtml = `
          <div style="font-family:'JetBrains Mono', ui-monospace, monospace; font-size:11px; color:${BRAND.primary}; letter-spacing:1.5px; text-transform:uppercase; margin-bottom:8px;">
            Magic link · valid 15 minutes
          </div>
          <h1 style="font-family: -apple-system, BlinkMacSystemFont, system-ui, sans-serif; font-size:28px; font-weight:800; line-height:1.15; color:${BRAND.onSurface}; margin:0 0 16px; letter-spacing:-0.3px;">
            Sign in to Droptix
          </h1>
          <p style="margin:0 0 8px; font-size:15px; line-height:1.6; color:${BRAND.onSurfaceVariant};">
            Tap the button below to sign in. The link works once and expires in 15 minutes — if it
            does, just request another from the sign-in page.
          </p>
          <p style="margin:24px 0 0; font-size:12px; line-height:1.6; color:${BRAND.onSurfaceVariant};">
            Didn&rsquo;t ask for this? Ignore the email — nothing happens until you click.
          </p>
        `;

        await sendMail({
          to: { email: identifier },
          subject: 'Sign in to Droptix',
          textBody: [
            'Sign in to Droptix',
            '',
            'Tap the link below to sign in. It expires in 15 minutes.',
            '',
            url,
            '',
            "Didn't ask for this? Ignore the email — nothing will happen.",
          ].join('\n'),
          htmlBody: emailLayout({
            preheader: 'Your Droptix sign-in link — expires in 15 minutes.',
            bodyHtml,
            appUrl: env.NEXT_PUBLIC_APP_URL,
            cta: { label: 'Sign in', href: url },
          }),
        });
      },
      server: '', // unused — we sendMail() directly
      from: 'tickets@droptix.co.uk',
    },
  ],
  callbacks: {
    async session({ session, user }) {
      session.user.id = user.id;
      // Prisma User.role typed via declaration merge above
      session.user.role = (user as unknown as { role: 'BUYER' | 'ORGANISER' | 'ADMIN' | 'SUPERADMIN' }).role;
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      // Opportunistic: first sign-in marks the email verified. Auth.js's
      // User type doesn't expose emailVerified in the callback arg, so we
      // check via a lightweight DB read before writing.
      if (!user?.id) return;
      const existing = await db.user.findUnique({
        where: { id: user.id },
        select: { emailVerified: true },
      });
      if (existing && !existing.emailVerified) {
        await db.user.update({
          where: { id: user.id },
          data: { emailVerified: new Date() },
        });
      }
    },
  },
});
