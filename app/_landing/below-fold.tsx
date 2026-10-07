import { Check, X } from '@phosphor-icons/react/dist/ssr';
import Image from 'next/image';

import { asset } from './asset-version';
import { FIT, METHOD, PROOF, STEPS, TEAM, VIDEOS } from './copy';
import { CtaBlock, MediaPlaceholder, Section, SectionHeading } from './shared';
import VideoCard, { type VideoTestimonial } from './video-card';

/* Add `src: asset('/proof/...')` per entry when the client photos land, and
   change PROOF_RATIO to the supplied files' own ratio. */
const PROOF_RATIO = '4 / 5';
const PROOF_PHOTOS: { src?: string; alt: string }[] = Array.from({ length: 6 }, () => ({
  alt: 'Client photo or result',
}));

/* Fill poster + src (through asset()), name and meta per clip. */
const VIDEO_TESTIMONIALS: VideoTestimonial[] = [{}, {}, {}];

const TEAM_PHOTOS = [
  { src: '/brand/founders/sriram-natarajan.jpg', name: 'Sriram Natarajan', role: 'Founder' },
  { src: '/brand/founders/stephane-bezencon.jpg', name: 'Stephen', role: 'Founder' },
  { src: '/atul/atul-seated.jpg', name: 'Atul Mishra', role: 'Head Coach' },
];

function Proof() {
  return (
    <Section id="proof">
      <SectionHeading label={PROOF.label} parts={PROOF.heading} sub={PROOF.line} />
      <ul className="mx-auto mt-10 grid max-w-[960px] grid-cols-2 gap-3 sm:mt-12 sm:grid-cols-3 sm:gap-5">
        {PROOF_PHOTOS.map((p, i) => (
          <li key={i}>
            {p.src ? (
              <div className="relative w-full overflow-hidden rounded-xl" style={{ aspectRatio: PROOF_RATIO }}>
                <Image src={p.src} alt={p.alt} fill sizes="(min-width: 640px) 320px, 50vw" className="object-cover" />
              </div>
            ) : (
              <MediaPlaceholder ratio={PROOF_RATIO} label="Client photo or result" />
            )}
          </li>
        ))}
      </ul>
      <CtaBlock label={PROOF.cta} />
    </Section>
  );
}

function Videos() {
  return (
    <Section id="video-testimonials">
      <SectionHeading parts={VIDEOS.heading} sub={VIDEOS.sub} />
      <ul className="sm-rail mx-auto mt-10 max-w-[960px] sm:mt-12">
        {VIDEO_TESTIMONIALS.map((v, i) => (
          <li key={i}>
            <VideoCard item={v} />
          </li>
        ))}
      </ul>
      <p className="mt-10 text-center text-[18px] font-semibold text-ink sm:text-[20px]">
        <span className="font-extrabold text-brand">{VIDEOS.trust[0]}</span>
        {VIDEOS.trust[1]}
      </p>
      <CtaBlock label={VIDEOS.cta} />
    </Section>
  );
}

function Team() {
  return (
    <Section id="team">
      <SectionHeading parts={TEAM.heading} />
      <ul className="mx-auto mt-10 flex max-w-[640px] flex-wrap justify-center gap-6 sm:mt-12 sm:gap-10">
        {TEAM_PHOTOS.map((m) => (
          <li key={m.name} className="flex w-[132px] flex-col items-center text-center sm:w-[156px]">
            <Image
              src={asset(m.src)}
              alt={`${m.name}, ${m.role}`}
              width={312}
              height={312}
              sizes="156px"
              className="block aspect-square w-full rounded-2xl object-cover"
            />
            <span className="mt-3 text-[15px] font-bold text-ink">{m.name}</span>
            <span className="text-[13px] font-medium text-ink-soft">{m.role}</span>
          </li>
        ))}
      </ul>
      <div className="mx-auto mt-10 max-w-[680px] space-y-5 text-[17px] leading-[1.7] text-ink-soft sm:mt-12">
        {TEAM.paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    </Section>
  );
}

function Method() {
  return (
    <Section id="method">
      <SectionHeading label={METHOD.label} parts={METHOD.heading} />
      <ol className="sm-ledger mx-auto mt-10 max-w-[760px] sm:mt-12">
        {METHOD.phases.map((ph) => (
          <li key={ph.letter} className="sm-ledger-row">
            <span className="sm-ledger-letter" aria-hidden>
              {ph.letter}
            </span>
            <div>
              <h3 className="text-[20px] font-extrabold leading-tight text-ink sm:text-[22px]">
                <span className="sr-only">{ph.letter}: </span>
                {ph.name}
              </h3>
              <p className="mt-1.5 text-[16px] leading-relaxed text-ink-soft sm:text-[17px]">{ph.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="mx-auto mt-8 max-w-[620px] text-center text-[16px] font-semibold leading-relaxed text-ink sm:text-[17px]">
        {METHOD.note}
      </p>
    </Section>
  );
}

function Steps() {
  return (
    <Section id="how-it-works">
      <SectionHeading parts={STEPS.heading} />
      <ol className="sm-flow mx-auto mt-10 max-w-[1040px] sm:mt-14">
        {STEPS.steps.map((s) => (
          <li key={s.n} className="sm-flow-step">
            <span className="sm-flow-num">{s.n}</span>
            <div>
              <h3 className="text-[19px] font-extrabold leading-snug text-ink sm:text-[20px]">{s.title}</h3>
              <p className="mt-2 text-[16px] leading-relaxed text-ink-soft">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <CtaBlock label={STEPS.cta} />
    </Section>
  );
}

function Fit() {
  return (
    <Section id="who-this-is-for">
      <SectionHeading parts={FIT.heading} />
      <div className="mx-auto mt-10 grid max-w-[960px] gap-5 sm:mt-12 md:grid-cols-2 md:gap-6">
        <div className="rounded-xl border-2 border-brand bg-white p-6 shadow-soft sm:p-8">
          <h3 className="text-[19px] font-extrabold text-ink">{FIT.yesLabel}</h3>
          <ul className="mt-5 space-y-4">
            {FIT.yes.map((t) => (
              <li key={t} className="flex gap-3 text-[16px] leading-snug text-ink">
                <span className="sm-mark bg-green-bed text-green-ink">
                  <Check weight="bold" />
                </span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-line bg-brand-pale p-6 sm:p-8">
          <h3 className="text-[19px] font-extrabold text-ink">{FIT.noLabel}</h3>
          <ul className="mt-5 space-y-4">
            {FIT.no.map((t) => (
              <li key={t} className="flex gap-3 text-[16px] leading-snug text-ink-soft">
                <span className="sm-mark bg-coral-bed text-coral-ink">
                  <X weight="bold" />
                </span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div id="final-cta">
        <CtaBlock label={FIT.cta} note={FIT.under} />
      </div>
    </Section>
  );
}

export default function BelowFold() {
  return (
    <>
      <Proof />
      <Videos />
      <Team />
      <Method />
      <Steps />
      <Fit />
    </>
  );
}
