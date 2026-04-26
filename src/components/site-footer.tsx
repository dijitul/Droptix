import Link from 'next/link';
import { DroptixMark } from './droptix-mark';
import { CookieResetButton } from './cookie-banner';

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-24 border-t-2 border-primary/20 bg-surface-dim">
      <div className="hazard-stripe" aria-hidden="true" />

      <div className="container grid gap-10 py-14 md:grid-cols-4">
        <div className="md:col-span-1">
          <Link href="/" className="flex items-center gap-2 font-display text-lg font-bold uppercase tracking-tight">
            <DroptixMark className="h-5 w-5 text-primary" />
            <span>Droptix</span>
          </Link>
          <p className="mt-3 text-sm text-muted-foreground">
            UK tickets for the music scene that actually matters. Built for independent promoters,
            priced for punters.
          </p>
          <p className="mt-3 label-tech text-tertiary">Made in the UK</p>
        </div>

        <FooterColumn title="Discover">
          <FooterLink href="/discover">All events</FooterLink>
          <FooterLink href="/genres">By genre</FooterLink>
          <FooterLink href="/cities">By city</FooterLink>
          <FooterLink href="/venues">By venue</FooterLink>
          <FooterLink href="/organisers">By promoter</FooterLink>
          <FooterLink href="/discover?when=tonight">Tonight</FooterLink>
          <FooterLink href="/discover?when=this-weekend">This weekend</FooterLink>
        </FooterColumn>

        <FooterColumn title="Promoters">
          <FooterLink href="/sell">Put an event on sale</FooterLink>
          <FooterLink href="/sell/fees">Fees & payouts</FooterLink>
          <FooterLink href="/login">Organiser sign-in</FooterLink>
        </FooterColumn>

        <FooterColumn title="Company">
          <FooterLink href="/about">About</FooterLink>
          <FooterLink href="/legal/terms">Terms</FooterLink>
          <FooterLink href="/legal/privacy">Privacy</FooterLink>
          <FooterLink href="/legal/cookies">Cookies</FooterLink>
          <li>
            <CookieResetButton>Cookie settings</CookieResetButton>
          </li>
          <FooterLink href="/accessibility">Accessibility</FooterLink>
          <FooterLink href="/support">Support</FooterLink>
        </FooterColumn>
      </div>

      <div className="border-t border-border">
        <div className="container flex flex-col items-start justify-between gap-3 py-5 text-xs text-muted-foreground md:flex-row md:items-center">
          <div className="label-tech">SN-DX-{year}</div>
          <p>© {year} Droptix — all rights reserved</p>
          <p>
            Having a problem at the door?{' '}
            <Link href="/support" className="text-tertiary underline underline-offset-2">
              Get help
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="label-tech mb-4 text-primary">{title}</div>
      <ul className="flex flex-col gap-2 text-sm">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="text-on-surface-variant hover:text-primary transition-colors">
        {children}
      </Link>
    </li>
  );
}
