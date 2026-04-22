import NextAuth, { type DefaultSession } from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { db } from './db';
import { env } from '@/lib/env';
import { sendMail } from './mail';

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
        // Keep copy short + UK-native; full HTML template lives under
        // src/emails/magic-link.tsx when we adopt react-email in Phase 1.
        await sendMail({
          to: { email: identifier },
          subject: 'Sign in to Droptix',
          textBody: [
            'Tap the link below to sign in to Droptix. It expires in 15 minutes.',
            '',
            url,
            '',
            "If you didn't ask for this, ignore the email — nothing will happen.",
          ].join('\n'),
          htmlBody: `
            <div style="font-family: ui-sans-serif, system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #0B0B12;">
              <h1 style="font-size: 24px; font-weight: 600; margin: 0 0 16px;">Sign in to Droptix</h1>
              <p style="margin: 0 0 24px; color: #5B5B66;">Tap the button to sign in. This link expires in 15 minutes.</p>
              <a href="${url}" style="display: inline-block; background: #6D28D9; color: #fff; text-decoration: none; padding: 12px 20px; border-radius: 10px; font-weight: 500;">Sign in</a>
              <p style="margin: 32px 0 0; color: #5B5B66; font-size: 12px;">Didn't ask for this? Ignore the email.</p>
            </div>
          `,
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
      // Opportunistic: first sign-in bumps emailVerified + created_at is already set
      if (user?.id && !user.emailVerified) {
        await db.user.update({
          where: { id: user.id },
          data: { emailVerified: new Date() },
        });
      }
    },
  },
});
