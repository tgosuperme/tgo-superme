import Link from 'next/link';

import BrandMark from '@/components/BrandMark';
import SiteFooter from '@/components/SiteFooter';
import { CONTACT_EMAIL } from '@/lib/site';

export type LegalSection = {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
};

export default function LegalPageLayout({
  eyebrow,
  title,
  titleAccent,
  intro,
  updated,
  sections,
  notice,
}: {
  notice?: string;
  eyebrow: string;
  title: string;
  titleAccent: string;
  intro: string;
  updated: string;
  sections: LegalSection[];
}) {
  return (
    <main className="min-h-screen bg-white font-body text-ink">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-[1120px] items-center justify-between gap-4 px-5 py-4 md:px-8">
          <Link href="/" aria-label="SuperMe home" className="inline-flex items-center">
            <BrandMark height={32} />
          </Link>
          <Link href="/" className="text-[13.5px] font-medium text-ink-soft hover:text-brand">
            &larr; Back
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-[760px] px-5 py-14 md:py-20">
        {notice && (
          <p className="mb-8 rounded-lg border border-[#C15151] bg-[#FFEDED] px-4 py-3 text-[13.5px] font-semibold text-[#C15151]">
            {notice}
          </p>
        )}
        <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-brand">{eyebrow}</p>
        <h1 className="mt-3 font-heading text-[clamp(28px,4.4vw,40px)] font-extrabold leading-[1.15]">
          {title} <span className="text-brand">{titleAccent}</span>
        </h1>
        <p className="mt-4 text-[15.5px] leading-relaxed text-ink-soft">{intro}</p>
        <p className="mt-3 text-[12.5px] text-ink-soft">Last updated {updated}</p>

        <div className="mt-10 divide-y divide-line border-t border-line">
          {sections.map((s) => (
            <section key={s.heading} className="py-7">
              <h2 className="font-heading text-[19px] font-bold leading-snug">{s.heading}</h2>
              <div className="mt-3 space-y-3 text-[14.5px] leading-relaxed text-ink-soft">
                {s.paragraphs.map((p) => (
                  <p key={p.slice(0, 40)}>{p}</p>
                ))}
              </div>
              {s.bullets && (
                <ul className="mt-4 grid gap-2.5">
                  {s.bullets.map((b) => (
                    <li key={b.slice(0, 40)} className="flex items-start gap-2.5">
                      <span className="mt-[8px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                      <span className="text-[14px] leading-relaxed text-ink-soft">{b}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <section className="mt-6 rounded-2xl border border-line bg-brand-pale p-6 text-center sm:p-8">
          <h2 className="font-heading text-[19px] font-bold">Questions about this page?</h2>
          <p className="mx-auto mt-2 max-w-[440px] text-[14.5px] leading-relaxed text-ink-soft">
            Write to us and a person will answer. We aim to reply within two working days.
          </p>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="mt-5 inline-flex min-h-[48px] items-center justify-center rounded-lg bg-brand px-7 text-[15px] font-semibold text-white"
          >
            {CONTACT_EMAIL}
          </a>
        </section>

        <p className="mt-6 text-center text-[12px] leading-relaxed text-ink-soft">
          This page is written in plain English and describes how we actually operate. It is not
          legal advice, and it should be reviewed by a qualified adviser before it is relied on.
        </p>
      </div>

      <SiteFooter />
    </main>
  );
}
