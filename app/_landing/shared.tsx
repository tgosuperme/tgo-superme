import { ArrowRight } from '@phosphor-icons/react/dist/ssr';
import Link from 'next/link';

import { BOOK_HREF } from '@/lib/site';

export type Parts = readonly [string, string, string];

export function Section({
  id,
  children,
  className = '',
}: {
  id?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`sm-section px-5 py-16 sm:px-8 sm:py-20 lg:py-24 ${className}`}>
      <div className="mx-auto w-full max-w-[1120px]">{children}</div>
    </section>
  );
}

export function Eyebrow({ text }: { text: string }) {
  return <p className="sm-eyebrow">{text}</p>;
}

export function Accented({ parts }: { parts: Parts }) {
  return (
    <>
      {parts[0]}
      <span className="text-brand">{parts[1]}</span>
      {parts[2]}
    </>
  );
}

export function SectionHeading({
  parts,
  label,
  sub,
}: {
  parts: Parts;
  label?: string;
  sub?: string;
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      {label && <Eyebrow text={label} />}
      <h2 className="font-heading text-[clamp(28px,1.6vw+20px,42px)] font-extrabold leading-[1.15] text-ink">
        <Accented parts={parts} />
      </h2>
      {sub && (
        <p className="mx-auto mt-4 max-w-2xl text-[17px] font-medium leading-relaxed text-ink-soft sm:text-[18px]">
          {sub}
        </p>
      )}
    </div>
  );
}

export function BookCTA({ label, className = '' }: { label: string; className?: string }) {
  return (
    <Link href={BOOK_HREF} className={`sm-cta ${className}`}>
      <span>{label}</span>
      <ArrowRight weight="bold" aria-hidden className="sm-cta-arrow" />
    </Link>
  );
}

export function CtaBlock({ label, note }: { label: string; note?: string }) {
  return (
    <div className="mt-10 flex flex-col items-center sm:mt-12">
      <BookCTA label={label} />
      {note && <p className="mt-3 text-center text-[14px] font-medium text-ink-soft">{note}</p>}
    </div>
  );
}

/* Holds the real file's box so nothing reflows when the artwork lands. */
export function MediaPlaceholder({
  ratio,
  label,
  className = '',
}: {
  ratio: string;
  label: string;
  className?: string;
}) {
  return (
    <div
      className={`sm-placeholder ${className}`}
      style={{ aspectRatio: ratio }}
      role="img"
      aria-label={label}
    >
      <span>{label}</span>
    </div>
  );
}
