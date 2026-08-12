/**
 * The shell every legal page uses — privacy, terms and refunds.
 *
 * A Server Component with no state: these pages are static text and should
 * cost nothing to render. The lego entrances still work, because the observer
 * that drives them is mounted globally in the root layout.
 *
 * The copy in the three pages is deliberately PLAIN. It describes what SuperMe
 * actually does in ordinary sentences rather than reproducing a boilerplate
 * contract, on the reasoning that a page nobody can read protects nobody. It
 * is not a substitute for a solicitor's review before launch — see the note at
 * the foot of each page.
 *
 * Every "get in touch" route on all three pages resolves to one address, from
 * NEXT_PUBLIC_CONTACT_EMAIL.
 */
import { ArrowLeft, ShieldCheck } from '@phosphor-icons/react/dist/ssr';
import Link from 'next/link';

import { legoDelay } from './lego-style';
import { C, CONTACT_EMAIL, LEGAL_LINKS } from './shared';

export type LegalSection = {
  heading: string;
  /** Each entry is one paragraph. Strings only — no markup in the content. */
  paragraphs: string[];
  /** Optional bullet list, rendered under the paragraphs. */
  bullets?: string[];
};

export default function LegalPage({
  eyebrow,
  title,
  titleAccent,
  intro,
  updated,
  sections,
}: {
  eyebrow: string;
  title: string;
  /** The trailing phrase of the title, set in the section-heading blue. */
  titleAccent: string;
  intro: string;
  updated: string;
  sections: LegalSection[];
}) {
  return (
    <main className="font-body" style={{ background: C.paleBlue, color: C.ink }}>
      {/* ── header ─────────────────────────────────────────────────── */}
      <header style={{ background: C.white, borderBottom: `1px solid ${C.line}` }}>
        <div className="mx-auto flex max-w-[1120px] items-center justify-between gap-4 px-5 py-4 md:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <span
              className="lego-stud grid h-9 w-9 place-items-center rounded-xl"
              style={{ background: C.blueFill }}
            >
              <ShieldCheck weight="fill" className="h-4 w-4 text-white" />
            </span>
            <span className="font-heading text-[17px] font-bold" style={{ color: C.ink }}>
              SuperMe
            </span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[13.5px] font-medium"
            style={{ color: C.inkSoft }}
          >
            <ArrowLeft weight="bold" className="h-3.5 w-3.5" />
            Back
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-[760px] px-5 py-14 md:py-20">
        {/* ── title block. Centred on phones, like every other page. ── */}
        <div className="text-center sm:text-left">
          <span
            data-lego=""
            className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.2em]"
            style={{ background: C.goldSoft, color: C.goldDeep }}
          >
            <span
              className="lego-pulse-dot inline-block h-1.5 w-1.5 shrink-0 rounded-full"
              style={{
                background: C.gold,
                ['--dot-pulse' as string]: 'rgba(16,84,194,0.5)',
              }}
            />
            {eyebrow}
          </span>

          <h1
            data-lego=""
            className="mt-4 font-heading text-[clamp(28px,4.4vw,40px)] font-bold leading-[1.14]"
            style={{ ...legoDelay(1, 80), color: C.ink }}
          >
            {title} <span style={{ color: C.goldDeep }}>{titleAccent}</span>
          </h1>

          <p
            data-lego=""
            className="mt-4 text-[15.5px] leading-relaxed"
            style={{ ...legoDelay(2, 80), color: C.inkSoft }}
          >
            {intro}
          </p>

          <p className="mt-3 text-[12.5px]" style={{ color: C.inkMuted }}>
            Last updated {updated}
          </p>
        </div>

        {/* ── the sections ───────────────────────────────────────────── */}
        <div className="mt-10 grid gap-4">
          {sections.map((s, i) => (
            <section
              key={s.heading}
              data-lego=""
              className="rounded-3xl p-6 sm:p-8"
              style={{
                ...legoDelay(Math.min(i, 4), 60),
                background: C.white,
                border: `1px solid ${C.line}`,
              }}
            >
              <h2
                className="font-heading text-[19px] font-bold leading-snug"
                style={{ color: C.ink }}
              >
                {s.heading}
              </h2>

              <div
                className="mt-3 space-y-3 text-[14.5px] leading-relaxed"
                style={{ color: C.inkSoft }}
              >
                {s.paragraphs.map((p) => (
                  <p key={p.slice(0, 40)}>{p}</p>
                ))}
              </div>

              {s.bullets && (
                <ul className="mt-4 grid gap-2.5">
                  {s.bullets.map((b) => (
                    <li key={b.slice(0, 40)} className="flex items-start gap-2.5">
                      <span
                        className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ background: C.sky }}
                      />
                      <span
                        className="text-[14px] leading-relaxed"
                        style={{ color: C.inkSoft }}
                      >
                        {b}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        {/* ── one contact route, from env ────────────────────────────── */}
        <section
          data-lego=""
          className="mt-4 rounded-3xl p-6 text-center sm:p-8"
          style={{ background: C.lightBlue, border: `1px solid ${C.line}` }}
        >
          <h2 className="font-heading text-[19px] font-bold" style={{ color: C.ink }}>
            Questions about this page?
          </h2>
          <p
            className="mx-auto mt-2 max-w-[440px] text-[14.5px] leading-relaxed"
            style={{ color: C.inkSoft }}
          >
            Write to us and a person will answer. We aim to reply within two
            working days.
          </p>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="lego-press mt-5 inline-flex min-h-[48px] items-center justify-center rounded-full px-7 text-[15px] font-semibold text-white"
            style={{ background: C.blueFill }}
          >
            {CONTACT_EMAIL}
          </a>
        </section>

        <p
          className="mt-6 text-center text-[12px] leading-relaxed"
          style={{ color: C.inkMuted }}
        >
          This page is written in plain English and describes how we actually
          operate. It is not legal advice, and it should be reviewed by a
          qualified adviser before it is relied on.
        </p>
      </div>

      {/* ── footer ─────────────────────────────────────────────────── */}
      <footer
        className="px-4 py-10 text-center text-[12.5px]"
        style={{ background: C.ink, color: 'rgba(250,245,234,0.6)' }}
      >
        <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          {LEGAL_LINKS.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                className="transition-colors duration-200 hover:text-white"
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-4">© 2026 MyEntourage Sàrl, Lausanne. All rights reserved.</p>
      </footer>
    </main>
  );
}
