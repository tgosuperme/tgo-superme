import { Check, X } from '@phosphor-icons/react/dist/ssr';
import Image from 'next/image';

import { asset } from './asset-version';
import { FIT, METHOD, PROOF, STEPS, TEAM, VIDEOS } from './copy';
import { Accented, CtaBlock, Eyebrow, Section, SectionHeading } from './shared';
import VideoCard, { type VideoTestimonial } from './video-card';

/* Section order and component forms follow fitjam.in; the ground stays white. */

/* Client WhatsApp chats; all four confirmed as real clients by Atul, 7 Oct 2026. */
const PROOF_PHOTOS: { src: string; w: number; h: number; alt: string }[] = [
  {
    src: '/proof/wa-01.jpg',
    w: 610,
    h: 1356,
    alt: 'WhatsApp message from Yatendra saying his back pain of two years is gone after the group yoga classes',
  },
  { src: '/proof/wa-02.jpg', w: 900, h: 1599, alt: 'WhatsApp message from Sarah about the live corrections' },
  { src: '/proof/wa-03.jpg', w: 900, h: 1599, alt: 'WhatsApp message from Vikram about the sessions' },
  { src: '/proof/wa-04.jpg', w: 900, h: 1599, alt: 'WhatsApp message from Emma about neck and upper back stiffness' },
];

/* From the India funnel: the eight newer clips in the uploader's numbering,
   then the original five. Posters live in /public/testimonials. */
const VIDEO_TESTIMONIALS: VideoTestimonial[] = [
  '1225866642',
  '1225866643',
  '1225866645',
  '1225866644',
  '1225866709',
  '1225866708',
  '1225866710',
  '1225866815',
  '1220112152',
  '1220112153',
  '1220112154',
  '1220752306',
  '1220752305',
].map((vimeoId) => ({ vimeoId, poster: `/testimonials/vimeo-${vimeoId}.jpg` }));

function Proof() {
  return (
    <Section id="proof">
      <SectionHeading label={PROOF.label} parts={PROOF.heading} />
      {/* 2 x 2 at every width. One 9:16 frame for all four; object-contain so no chat text is cropped. */}
      <ul className="mx-auto mt-10 grid max-w-[360px] grid-cols-1 gap-4 sm:mt-12 sm:max-w-[700px] sm:grid-cols-2 sm:gap-5">
        {PROOF_PHOTOS.map((p) => (
          <li key={p.src} className="fj-card p-2 sm:p-3">
            <div className="relative w-full overflow-hidden rounded-lg bg-white" style={{ aspectRatio: '9 / 16' }}>
              <Image
                src={asset(p.src)}
                alt={p.alt}
                fill
                sizes="(min-width: 640px) 340px, 360px"
                className="object-contain"
              />
            </div>
          </li>
        ))}
      </ul>
      <p className="mx-auto mt-10 max-w-[760px] text-center text-[16px] leading-relaxed text-ink sm:text-[17px]">
        {PROOF.line}
      </p>
      <CtaBlock label={PROOF.cta} />
    </Section>
  );
}

function Videos() {
  return (
    <Section id="video-testimonials">
      <div className="mx-auto max-w-3xl text-center">
        <Eyebrow text={`${VIDEOS.heading[0]}${VIDEOS.heading[1]}${VIDEOS.heading[2]}`} />
        <h2 className="font-heading text-[clamp(28px,1.8vw+20px,44px)] font-black leading-[1.15] text-ink">
          {VIDEOS.sub}
        </h2>
      </div>
      {/* Portrait clips: 2 across on phones, 3 on tablets, 4 on desktop; the last row centres. */}
      <ul className="mx-auto mt-10 flex max-w-[1040px] flex-wrap justify-center gap-3 sm:mt-12 sm:gap-5">
        {VIDEO_TESTIMONIALS.map((v) => (
          <li
            key={v.vimeoId}
            className="fj-card w-full max-w-[360px] p-3 sm:w-[calc(50%-10px)] sm:max-w-none md:w-[calc(33.333%-14px)] lg:w-[calc(25%-15px)]"
          >
            <p className="mb-3 text-center text-[11px] font-bold uppercase tracking-[0.18em] text-ink-soft">
              Video Testimonial
            </p>
            <VideoCard item={v} />
          </li>
        ))}
      </ul>
      <p className="mt-10 text-center text-[17px] text-ink sm:text-[18px]">
        <span className="font-bold">{VIDEOS.trust[0]}</span>
        {VIDEOS.trust[1]}
      </p>
      <CtaBlock label={VIDEOS.cta} />
    </Section>
  );
}

function Team() {
  const [intro, ...rest] = TEAM.paragraphs;
  return (
    <Section id="team">
      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:gap-14">
        <figure className="mx-auto w-full max-w-[380px] lg:mx-0">
          <Image
            src={asset('/atul/behind-the-inner-brace-method.webp')}
            alt="The team behind the Inner Brace Method: Sriram Natarajan, Atul Mishra and Stéphane Bezençon"
            width={1672}
            height={941}
            sizes="(min-width: 1024px) 380px, 90vw"
            className="block h-auto w-full rounded-lg"
          />
        </figure>

        <div>
          <Eyebrow text="Meet SuperMe" />
          <h2 className="font-heading text-[clamp(28px,1.8vw+20px,44px)] font-black leading-[1.15] text-ink">
            <Accented parts={TEAM.heading} />
          </h2>
          <blockquote className="fj-quote mt-7">{intro}</blockquote>
          <div className="mt-6 space-y-5 text-[16px] leading-[1.7] text-ink-soft sm:text-[17px]">
            {rest.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}

function Method() {
  return (
    <Section id="method">
      <SectionHeading label={METHOD.label} parts={METHOD.heading} />
      <ol className="mx-auto mt-10 grid max-w-[1000px] grid-cols-1 gap-5 sm:mt-12 md:grid-cols-2">
        {METHOD.phases.map((ph, i) => (
          <li
            key={ph.letter}
            className={`fj-card p-6 text-left sm:p-7 ${i === METHOD.phases.length - 1 && METHOD.phases.length % 2 === 1 ? 'md:col-span-2' : ''}`}
          >
            <h3 className="text-[19px] font-extrabold text-ink sm:text-[20px]">
              <span className="text-brand">{ph.letter}</span> - {ph.name}
            </h3>
            <p className="mt-2 text-[16px] leading-relaxed text-ink-soft">{ph.body}</p>
          </li>
        ))}
      </ol>
      <p className="mx-auto mt-8 max-w-[680px] text-center text-[16px] font-semibold leading-relaxed text-ink sm:text-[17px]">
        {METHOD.note}
      </p>
    </Section>
  );
}

function Steps() {
  return (
    <Section id="how-it-works">
      <SectionHeading label="How It Works" parts={STEPS.heading} />
      <ol className="mx-auto mt-10 grid max-w-[1040px] grid-cols-1 sm:mt-14 md:grid-cols-3">
        {STEPS.steps.map((s) => (
          <li key={s.n} className="fj-step px-6 py-6 text-center">
            <span className="fj-step-num">{s.n}</span>
            <h3 className="mt-5 text-[19px] font-extrabold leading-snug text-ink">{s.title}</h3>
            <p className="mt-2 text-[16px] leading-relaxed text-ink-soft">{s.body}</p>
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
      <SectionHeading label="Who This Is For" parts={FIT.heading} />
      <div className="mx-auto mt-10 max-w-[560px] text-left sm:mt-12">
        <h3 className="text-[17px] font-bold text-ink">{FIT.yesLabel}</h3>
        <ul className="mt-3 space-y-2.5">
          {FIT.yes.map((t) => (
            <li key={t} className="flex gap-2.5 text-[16px] leading-snug text-ink">
              <Check weight="bold" aria-hidden className="mt-[3px] h-[18px] w-[18px] shrink-0 text-green-ink" />
              <span>{t}</span>
            </li>
          ))}
        </ul>
        <h3 className="mt-9 text-[17px] font-bold text-ink">{FIT.noLabel}</h3>
        <ul className="mt-3 space-y-2.5">
          {FIT.no.map((t) => (
            <li key={t} className="flex gap-2.5 text-[16px] leading-snug text-ink">
              <X weight="bold" aria-hidden className="mt-[3px] h-[18px] w-[18px] shrink-0 text-coral-ink" />
              <span>{t}</span>
            </li>
          ))}
        </ul>
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
