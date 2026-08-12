'use client';

/**
 * Everything below the hero, in the order the signed-off PDF sets out:
 *
 *      (page 2's card and credentials both live in the hero now)
 *   2  What you'll experience ..... page 3
 *   3  Your 5-day schedule ........ page 4
 *   4  Live sessions band ......... page 5
 *   5  Does this sound like you? .. page 5
 *   6  Testimonials ............... page 6
 *   7  Who is Atul ................ page 7
 *   8  Why this works ............. page 8
 *   9  What people notice ......... page 9
 * 10a  Come to Day One (promise) ... page 10
 * 10b  The two options .......... page 10
 *  11  FAQ ........................ page 11
 *  12  Important information ...... page 12
 *
 * COPY IS VERBATIM from that PDF. It is the wording the UK compliance review
 * was run against, so it must not be re-voiced, shortened or "improved". Three
 * devices from the reference postpartum page are deliberately absent and must
 * stay absent: a rising-price strip, a struck-through list price with a savings
 * badge, and any percentage outcome claim.
 */
import {
  ArrowRight,
  Barbell,
  CalendarBlank,
  CaretDown,
  CheckCircle,
  Clock,
  Eye,
  FirstAidKit,
  Function as FunctionIcon,
  Lightning,
  Minus,
  Plus,
  Ruler,
  ShieldCheck,
  VideoCamera,
  Wind,
  X,
} from '@phosphor-icons/react/dist/ssr';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import Bonuses from './bonuses';
import { legoBrick, legoDelay } from './lego-style';
import { domAnimation, LazyMotion, m, type Variants } from './motion-lite';
import {
  C,
  LEGAL_LINKS,
  PRICE_LABEL,
  SectionEyebrow,
  SectionHeading,
  SESSION_TIMES,
  SESSIONS_LABEL,
  START_DATE,
} from './shared';

// ── Animation primitives (same curve and timings as the reference page) ──
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
};
const fadeUpSm: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
};
const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

/* ── section 2 · what you'll experience (PDF p3) ─────────────────────────
   Design and motion are the postpartum page's Experience section verbatim:
   staggered fade-up on the heading block, staggered fade-up on the cards, a
   hover lift, and the orphan-card placement fix. SuperMe has 7 cards too, so
   that last-row maths applies unchanged. */

/* One accent per card, in palette order, so the grid reads as a deliberate
   set rather than seven random colours. The bed is the accent held back to a
   pale wash; the glyph is the matching ink, which is the same hue darkened
   until it clears 4.5:1. Card, type and border stay white and navy, so the
   colour lands only on the 48px icon tile. */
const ACCENTS: { bed: string; fg: string }[] = [
  { bed: 'rgba(79,168,199,0.16)', fg: C.skyInk },      // brand blue
  { bed: 'rgba(159,218,203,0.34)', fg: C.mintInk },    // mint
  { bed: 'rgba(233,139,122,0.26)', fg: C.coralInk },   // coral
  { bed: 'rgba(255,178,109,0.30)', fg: C.peachInk },   // peach
  { bed: 'rgba(255,193,7,0.30)', fg: C.yellowInk },   // yellow
  { bed: 'rgba(169,154,203,0.26)', fg: C.lavenderInk },// lavender
  { bed: 'rgba(114,183,122,0.26)', fg: C.greenInk },   // green
];

const EXPERIENCE: { icon: typeof Wind; title: string; body: string }[] = [
  {
    icon: VideoCamera,
    title: 'Live Coach-Led Sessions',
    body: 'Every day live on Zoom with Atul. Guided movement, real-time corrections and a clear progression, not another routine to follow alone.',
  },
  {
    icon: FirstAidKit,
    title: 'Supported, Pain-Safe Movement',
    body: "Walls, belts, blocks and simple modifications help you work through each movement without forcing the area that's already doing too much.",
  },
  {
    icon: Wind,
    title: 'Unload Before You Strengthen',
    body: 'Learn how to take the load off first, using breath work and supported movement before asking your body to do more.',
  },
  {
    icon: Lightning,
    title: 'Wake Up Your Inner Support',
    body: 'Activate the deeper muscles around your core, spine, hips and joints that are meant to help carry the load.',
  },
  {
    icon: Barbell,
    title: 'Build Strength Into Movement',
    body: 'Progress from supported work into standing movements that build strength, stability and better movement through your back, neck and knees.',
  },
  {
    icon: Eye,
    title: 'Real-Time Form Corrections',
    body: "Atul watches how you move, makes adjustments and gives you the right variation, so you're not left wondering if you're doing it correctly.",
  },
  {
    icon: Ruler,
    title: 'Measure Your Own Progress',
    body: 'Score how you feel at the start and again on Day 4, so you can see your own change rather than simply taking another promise on faith.',
  },
];

function Experience() {
  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <m.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          className="mx-auto max-w-3xl text-center"
        >
          <m.div variants={fadeUpSm}>
            <SectionEyebrow text="The Experience" />
          </m.div>
          <m.h2
            variants={fadeUp}
            className="mt-3 font-heading text-[28px] font-extrabold leading-tight sm:text-[40px]"
            style={{ color: C.ink }}
          >
            Here&apos;s What You&apos;ll Experience{' '}
            <span style={{ color: C.gold }}>In 5 Days</span>
          </m.h2>
          <m.p
            variants={fadeUp}
            className="mt-4 text-[15px] sm:text-[16px]"
            style={{ color: C.inkSoft }}
          >
            Don&apos;t take our word for it. Experience the approach live and see
            your own progress across 5 days.
          </m.p>
        </m.div>

        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {EXPERIENCE.map(({ icon: Icon, title, body }, idx) => {
            // 7 cards leave a single orphan in the last row at both breakpoints
            // (2-col: 3 rows + 1 · 3-col: 2 rows + 1). The orphan spans the full
            // row but is width-capped and centred so it reads as one normal card
            // instead of a stranded left-aligned one. Widths mirror the gap-5
            // (20px) track maths at each breakpoint.
            const isOrphan = idx === EXPERIENCE.length - 1;
            const placement = [
              isOrphan && EXPERIENCE.length % 2 === 1
                ? 'sm:col-span-2 sm:mx-auto sm:w-full sm:max-w-[calc(50%-10px)]'
                : '',
              isOrphan && EXPERIENCE.length % 3 === 1
                ? 'lg:col-span-3 lg:max-w-[calc(33.333%-13.334px)]'
                : '',
            ]
              .filter(Boolean)
              .join(' ');
            return (
              <article
                key={title}
                data-lego=""
                className={`lego-hover relative overflow-hidden rounded-2xl p-7 ${placement}`}
                style={{
                  ...legoBrick(idx),
                  background: 'white',
                  border: `1px solid ${C.line}`,
                  /* a 3px accent rule along the top edge: enough to tie the
                     card to its icon, small enough to stay in the 10% */
                  borderTop: `3px solid ${ACCENTS[idx % ACCENTS.length].bed}`,
                }}
              >
                <span
                  data-lego-stud=""
                  className="lego-stud grid h-12 w-12 place-items-center rounded-xl"
                  style={{
                    ...legoBrick(idx),
                    background: ACCENTS[idx % ACCENTS.length].bed,
                  }}
                >
                  <Icon
                    weight="duotone"
                    className="h-6 w-6"
                    style={{ color: ACCENTS[idx % ACCENTS.length].fg }}
                  />
                </span>
                <h3
                  className="mt-4 font-heading text-[18px] font-bold leading-snug"
                  style={{ color: C.ink }}
                >
                  {title}
                </h3>
                <p
                  className="mt-2 text-[14px] leading-relaxed"
                  style={{ color: C.inkSoft }}
                >
                  {body}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ── section 3 · the 5-day schedule (PDF p4) ─────────────────────────── */

const DAYS = [
  {
    n: 'Day 1',
    title: 'Unload & Release',
    body: 'Start by taking pressure off the areas doing too much. Guided breathing, supported movement, gentle spinal mobility and prop-assisted positions help you move without forcing the painful area.',
  },
  {
    n: 'Day 2',
    title: 'Breathe & Brace',
    body: 'Use breath work to settle tension before introducing the deeper stabilising muscles around your core, spine, hips and joints. Begin building the support your body has been missing.',
  },
  {
    n: 'Day 3',
    title: 'Strengthen & Support',
    body: 'Progress into controlled strengthening with mindful breathing and safe alignment. Build strength through the deep core and spinal support system while learning how to move with greater control.',
  },
  {
    n: 'Day 4',
    title: 'Stand Tall & Measure',
    body: "Bring everything together through standing movements, hip opening, leg strengthening and better alignment. Then measure your progress and see what's changed since Day 1.",
  },
  {
    n: 'Day 5',
    title: 'The Next Step',
    body: 'Understand what your 5 days have actually shown you, what still needs to change, and how to continue building the strength, mobility and movement habits that create lasting progress.',
  },
];

/**
 * Scroll-linked progress for the timeline.
 *
 * Writes `--tl-p` (0 → 1) straight onto the <ol> node from a rAF-throttled
 * scroll handler, so the rail fills without React re-rendering once per frame.
 * The node states are toggled by classList for the same reason — the only
 * React state here is `active`, which changes five times per pass at most.
 *
 * The "read line" sits at 62% of the viewport height rather than the middle:
 * a node should light as it arrives at the comfortable reading position, not
 * once it has already gone past.
 */
function useTimelineProgress(count: number) {
  const olRef = useRef<HTMLOListElement>(null);
  const [active, setActive] = useState(-1);

  useEffect(() => {
    const ol = olRef.current;
    if (!ol) return;

    // Reduced motion: show the finished state and never listen to scroll.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      ol.style.setProperty('--tl-p', '1');
      setActive(count - 1);
      return;
    }

    let raf = 0;
    const measure = () => {
      raf = 0;
      const box = ol.getBoundingClientRect();
      if (!box.height) return;

      const line = window.innerHeight * 0.62;
      const p = Math.min(1, Math.max(0, (line - box.top) / box.height));
      ol.style.setProperty('--tl-p', p.toFixed(4));

      /* offsetTop is no use here: each node's offsetParent is its own <li>,
         not the list. Both rects are current, so the difference is the node's
         position within the rail. */
      const travelled = p * box.height;
      let last = -1;
      ol.querySelectorAll<HTMLElement>('[data-tl-node]').forEach((node, i) => {
        const r = node.getBoundingClientRect();
        if (travelled >= r.top + r.height / 2 - box.top) last = i;
      });
      setActive(last);
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [count]);

  return { olRef, active };
}

function Schedule() {
  /* Structure stays on the primary blue: heading, rail and nodes. The only
     accent in the section is the day pill, one colour for all five, which is
     what keeps the run reading as continuous. */
  const { olRef, active } = useTimelineProgress(DAYS.length);

  return (
    <section className="px-4 py-16 sm:py-24" style={{ background: C.canvas }}>
      <SectionHeading sub="A step-by-step 5-day progression, with each session building on the last.">
        Your <span style={{ color: C.goldDeep }}>5-Day Schedule</span>
      </SectionHeading>

      {/* Alternating rail. The spine is a single centred line on desktop and
          slides to the left edge on mobile, where a zig-zag has no room.
          The fill inside it is scaled by --tl-p as you scroll. */}
      <ol ref={olRef} className="relative mx-auto mt-12 max-w-[900px]">
        <span aria-hidden className="tl-rail">
          <span className="tl-fill" />
        </span>

        {DAYS.map((d, i) => {
          const left = i % 2 === 0; // card in the left column on desktop
          return (
            <li
              key={d.n}
              className={`relative mb-6 pl-14 sm:mb-9 sm:w-1/2 sm:pl-0 ${
                left ? 'sm:pr-12 sm:text-right' : 'sm:ml-auto sm:pl-12'
              }`}
            >
              {/* The node. Positioning lives on the outer span and the snap
                  animation on the inner one, because a single element cannot
                  both hold a centring translate and keyframe its transform. */}
              <span
                data-tl-node
                className={`tl-node ${left ? 'tl-node-right' : 'tl-node-left'} ${
                  i <= active ? 'is-on' : ''
                }`}
              >
                <span aria-hidden className="tl-node-ring" />
                <span className="tl-node-inner">{i + 1}</span>
              </span>

              {/* data-lego-loop, not data-lego: this is the one run on the
                  page that replays on every scroll pass, per the brief. */}
              <div
                data-lego-loop="x"
                className="lego-hover rounded-2xl border p-6"
                style={{
                  ...legoDelay(0),
                  ['--lego-from' as string]: left ? '26px' : '-26px',
                  borderColor: i <= active ? C.lineStrong : C.line,
                  background: C.white,
                }}
              >
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em]"
                  style={{ background: 'rgba(233,139,122,0.20)', color: C.coralInk }}
                >
                  <CalendarBlank weight="bold" className="lego-stud h-3 w-3" />
                  {d.n}
                </span>
                <h3
                  className="mt-3 font-heading text-[18px] font-bold"
                  style={{ color: C.ink }}
                >
                  {d.title}
                </h3>
                <p
                  className="mt-2 text-[13.5px] leading-relaxed"
                  style={{ color: C.inkSoft }}
                >
                  {d.body}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/* ── section 4 · live sessions band (PDF p5) ─────────────────────────── */

function SessionsBand() {
  return (
    <section className="px-4 py-14" style={{ background: C.white }}>
      <div
        className="mx-auto max-w-[900px] rounded-3xl px-6 py-12 text-center sm:px-12"
        style={{ background: C.ink }}
      >
        {/* Label, times and start date are all env-driven — see .env.example.
            Nothing in this band is written into the markup. */}
        <span
          data-lego=""
          className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.2em]"
          style={{ background: 'rgba(255,178,109,0.22)', color: '#FFE9D6' }}
        >
          <Clock weight="bold" className="h-3 w-3" />
          {SESSIONS_LABEL}
        </span>
        <h2
          className="mt-5 font-heading text-[clamp(24px,3.6vw,36px)] font-bold leading-tight"
          style={{ color: C.white }}
        >
          {/* Bright sky, not goldDeep: this h2 sits on the navy band, where
              primary blue is 2.22:1 and bright sky is 5.85:1. The one place the
              highlight flips colour, because the ground flipped. */}
          {SESSION_TIMES}, <span style={{ color: C.sky }}>live on Zoom</span>.
        </h2>
        <p className="mt-3 text-[15px]" style={{ color: 'rgba(250,245,234,0.75)' }}>
          Pick whichever time fits your day.
        </p>
        <div className="mx-auto mt-7 flex max-w-[400px] flex-col items-center">
          <a
            href="/checkout"
            className="lego-press lego-pulse group inline-flex min-h-[56px] w-full items-center justify-center gap-2 rounded-full px-7 py-4 font-heading text-[15px] font-bold"
            style={{
              background: C.white,
              color: C.ink,
              ['--pulse-color' as string]: 'rgba(255,255,255,0.5)',
            }}
          >
            Start Your 5-Day Reset · {PRICE_LABEL}
            <ArrowRight
              weight="bold"
              className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </a>
          <p
            className="mt-3 text-[13px] font-medium"
            style={{ color: 'rgba(250,245,234,0.7)' }}
          >
            Refundable If You Don&apos;t Love Day One
          </p>
        </div>
      </div>
    </section>
  );
}

/* ── section 5 · does this sound like you? (PDF p5) ──────────────────── */

/* Each line carries one blue phrase, the bit the reader is meant to recognise
   as their own. Split into three parts rather than marked up inline so the
   sentences stay exactly as signed off, just wrapped. */
const RECOGNITION: [string, string, string][] = [
  ['Your back, neck or knee pain ', 'keeps coming back', ', even after trying exercises and stretches.'],
  ['You wake up ', 'feeling stiff', ', or find yourself avoiding certain movements because they hurt.'],
  ["You're ", 'afraid of making things worse', ", so you've stopped doing the activities you actually enjoy."],
  ["You've tried random YouTube routines and workouts, but still ", "don't know what your body actually needs", '.'],
  ["You're ", 'tired of managing the pain day after day', ' and want a clear, guided approach to move better and feel stronger.'],
];

function Recognition() {
  return (
    <section className="px-4 py-16 sm:py-24" style={{ background: C.canvas }}>
      <SectionHeading>
        Does this <span style={{ color: C.goldDeep }}>sound like you</span>?
      </SectionHeading>
      <ul className="mx-auto mt-10 grid max-w-[760px] gap-3">
        {RECOGNITION.map(([pre, hl, post], idx) => (
          <li
            key={hl}
            data-lego=""
            className="lego-hover-sm flex items-start gap-3.5 rounded-2xl border px-5 py-4"
            style={{ ...legoDelay(idx), borderColor: C.line, background: C.white }}
          >
            <span
              className="lego-stud mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
              style={{ background: 'rgba(233,139,122,0.20)' }}
            >
              <X weight="bold" className="h-2.5 w-2.5" style={{ color: C.coralInk }} />
            </span>
            <span
              className="text-[14.5px] leading-relaxed"
              style={{ color: C.inkSoft }}
            >
              {pre}
              {/* blueFill is now the primary blue itself: #1054C2 is 6.84:1 on
                  white, so the old darker derived step is no longer needed */}
              <strong style={{ color: C.blueFill, fontWeight: 600 }}>{hl}</strong>
              {post}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ── section 6 · testimonials (PDF p6) ───────────────────────────────── */

/**
 * Three client clips, served from Vercel Blob rather than bundled, so they never
 * touch the deploy size or the critical path.
 *
 * No poster art exists yet, so the frames show the video itself: preload
 * "metadata" pulls just the header and first frame, which the browser paints as
 * an implicit poster. That is a few KB per clip, not the whole file. When real
 * thumbnails land, add `poster` here and nothing else has to change.
 */
const BLOB = 'https://pm4wnvllwxriwvmg.public.blob.vercel-storage.com';
const TESTIMONIALS: { name: string; caption: string; src: string; poster?: string }[] = [
  { name: 'Testimonial 1', caption: '', src: `${BLOB}/testimonial-1.mp4` },
  { name: 'Testimonial 2', caption: '', src: `${BLOB}/testimonial-2.mp4` },
  { name: 'Testimonial 3', caption: '', src: `${BLOB}/testimonial-3.mp4` },
];

function Testimonials() {
  return (
    <section className="px-4 py-16 sm:py-24" style={{ background: C.white }}>
      <SectionHeading sub="From working professionals and busy parents to people who had stopped moving the way they used to, these are real people who used the Inner Brace Method to improve their mobility, build strength and move with greater ease.">
        Real People Who Refused To Let Pain Decide What They{' '}
        <span style={{ color: C.goldDeep }}>Could &amp; Couldn&apos;t Do</span>
      </SectionHeading>

      {/* Three across from sm up. On the narrowest phones they stack one per
          row and the rail is capped, because a 9:14 portrait clip at full
          viewport width is taller than the screen. */}
      <ul className="mx-auto mt-11 grid max-w-[340px] grid-cols-1 gap-4 sm:max-w-[1080px] sm:grid-cols-3 sm:gap-5">
        {TESTIMONIALS.map((t, idx) => (
          <li
            key={t.name}
            data-lego=""
            /* No hover lift. The card IS the video player: moving it under the
               cursor fights the scrub bar and the play button the reader is
               aiming at. Entrance animation only. */
            className="aspect-[9/14] overflow-hidden rounded-2xl border"
            style={{ ...legoBrick(idx, 110), borderColor: C.line, background: C.sand }}
          >
            <video
              src={t.src}
              poster={t.poster}
              controls
              playsInline
              preload="metadata"
              className="h-full w-full object-cover"
              aria-label={t.name}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ── section 7 · who is Atul (PDF p7) ────────────────────────────────── */

function Guide() {
  return (
    <section className="px-4 py-16 sm:py-24" style={{ background: C.canvas }}>
      {/* Two layouts, one DOM order.

          Mobile reads eyebrow → heading → portraits → description: the reader
          should know WHO they are looking at before the photographs, and get
          the credentials after. The DOM is written in exactly that order.

          Desktop keeps the original two columns — portraits left, the whole
          text block right — by placing the three children explicitly: images
          into column 1 spanning both rows, heading into row 1 of column 2,
          description into row 2. Nothing is duplicated and nothing is hidden. */}
      <div className="mx-auto flex max-w-[1060px] flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:gap-x-10 lg:gap-y-0">
        {/* ── 1 · eyebrow + heading ──
            Centred on phones, where this block is the top of the section and a
            left-set eyebrow reads as a fragment. The body copy below stays
            left-aligned at every width: centred paragraphs are hard to read. */}
        <div className="text-center lg:col-start-2 lg:row-start-1 lg:self-end lg:text-left">
          <SectionEyebrow text="Meet Your Guide" />
          <h2
            className="mt-4 font-heading text-[clamp(26px,4vw,40px)] font-bold leading-[1.15]"
            style={{ color: C.ink }}
          >
            Who Is <span style={{ color: C.goldDeep }}>Atul</span>, And Why Does
            He Teach You To Move Differently?
          </h2>
        </div>

        {/* ── 2 · portrait cluster ──
            All three frames are Atul himself, from his own shoot in
            public/Atul_s image. The sources are 4000x6000 and 6000x4000 camera
            files at 8 to 11MB, several EXIF-rotated, so each was
            exif-transposed, centre-cropped to its frame's aspect and
            re-encoded into public/atul at display size (275/128/119KB).
            The earlier note that these were a demonstrator no longer applies:
            it is him in every frame, so the alt text names him. */}
        <div className="grid grid-cols-[1.25fr_1fr] gap-3 lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:self-center">
          <div
            data-lego=""
            className="overflow-hidden rounded-2xl border"
            style={{ borderColor: C.line, background: C.canvas }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/atul/atul-warrior.jpg"
              alt="Atul Mishra in a standing warrior posture"
              width={900}
              height={1200}
              className="aspect-[3/4] h-full w-full object-cover"
              loading="lazy"
            />
          </div>
          <div className="grid gap-3">
            <div
              data-lego=""
              className="overflow-hidden rounded-2xl border"
              style={{ ...legoDelay(1, 110), borderColor: C.line, background: C.canvas }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/atul/atul-seated.jpg"
                alt="Atul Mishra in a seated balance from the Inner Brace Method"
                width={800}
                height={800}
                className="aspect-square h-full w-full object-cover"
                loading="lazy"
              />
            </div>
            <div
              data-lego=""
              className="overflow-hidden rounded-2xl border"
              style={{ ...legoDelay(2, 110), borderColor: C.line, background: C.canvas }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/atul/atul-side-angle.jpg"
                alt="Atul Mishra in a standing side-angle posture from the Inner Brace Method"
                width={800}
                height={800}
                className="aspect-square h-full w-full object-cover"
                loading="lazy"
              />
            </div>
          </div>
        </div>

        {/* ── 3 · the description, quote and closer ── */}
        <div className="lg:col-start-2 lg:row-start-2">
          <div
            className="space-y-4 text-[14.5px] leading-relaxed lg:mt-5"
            style={{ color: C.inkSoft }}
          >
            <p>
              Atul is an <strong>E-RYT 500 certified yoga educator</strong> with{' '}
              <strong>16+ years of teaching and practice</strong>, who has
              supported <strong>1,000+ clients</strong> and trained{' '}
              <strong>500+ teachers</strong>.
            </p>
            <p>
              Over the years, he saw a common pattern. People with persistent
              back, neck and knee discomfort were often told to stretch more,
              strengthen more or simply push through it, without understanding
              how they were actually moving.
            </p>
            <p>
              That led him to develop a more structured approach that combines
              breath work, supported movement, strengthening and real-time
              correction to help people build better movement patterns
              progressively.
            </p>
          </div>

          <blockquote
            className="mt-6 rounded-2xl border-l-2 py-4 pl-5 pr-5 text-[15px] italic leading-relaxed"
            style={{
              borderColor: C.lavender,
              background: C.white,
              color: C.ink,
            }}
          >
            “You don&apos;t need to push through pain. You need to learn how to
            support your body and move with greater awareness.”
          </blockquote>

          <p
            className="mt-5 text-[14.5px] leading-relaxed"
            style={{ color: C.inkSoft }}
          >
            That&apos;s the thinking behind the Inner Brace Method™, and this
            5-Day Challenge gives you the opportunity to experience the approach
            live before deciding what comes next.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ── section 8 · why this works (PDF p8) ─────────────────────────────── */

/* One accent per step, so the five stages of the method are visually
   countable. Same construction as the Experience grid: the bed is the accent
   held back to a pale wash, the glyph is its matching ink. */
const MECH_ACCENTS: { bed: string; fg: string }[] = [
  { bed: 'rgba(159,218,203,0.34)', fg: C.mintInk },     // 01 unload
  { bed: 'rgba(140,207,227,0.30)', fg: C.skyInk },      // 02 brace
  { bed: 'rgba(169,154,203,0.24)', fg: C.lavenderInk }, // 03 move
  { bed: 'rgba(114,183,122,0.24)', fg: C.greenInk },    // 04 strengthen
  { bed: 'rgba(255,178,109,0.30)', fg: C.peachInk },    // 05 retrain
];

const MECHANISM = [
  {
    n: '01',
    icon: Wind,
    title: 'Unload Before You Stretch',
    body: 'Take pressure off the areas already doing too much before asking them to move further.',
  },
  {
    n: '02',
    icon: ShieldCheck,
    title: 'Brace Before You Strengthen',
    body: "Reconnect your body's deeper support before adding more load.",
  },
  {
    n: '03',
    icon: FunctionIcon,
    title: 'Move Without Forcing',
    body: 'Use breath, props and controlled mobility to restore movement without pushing through stiffness.',
  },
  {
    n: '04',
    icon: Barbell,
    title: 'Strengthen What Supports You',
    body: "Build strength through your core, hips, spine and joints so the load isn't concentrated in one area.",
  },
  {
    n: '05',
    icon: Lightning,
    title: 'Retrain Everyday Movement',
    body: 'Take that new support into sitting, standing, bending, walking and the movements you do every day.',
  },
];

function Mechanism() {
  return (
    <section className="px-4 py-16 sm:py-24" style={{ background: C.white }}>
      <SectionHeading
        sub={
          <>
            Most programmes either tell you to stretch more, strengthen more, or
            rest more. But if the same back, neck or knee discomfort keeps
            returning, doing more of the same isn&apos;t necessarily the answer.
            The Inner Brace Method™ changes{' '}
            <strong style={{ color: C.ink }}>what you do</strong>, and{' '}
            <strong style={{ color: C.ink }}>the order you do it in</strong>.
          </>
        }
      >
        Why This <span style={{ color: C.goldDeep }}>Works</span>.
      </SectionHeading>

      <ul className="mx-auto mt-11 grid max-w-[1120px] gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {MECHANISM.map((step, idx) => (
          <MechanismCard key={step.n} step={step} idx={idx} />
        ))}
      </ul>
    </section>
  );
}

/**
 * One step of the method, in two shapes from the SAME markup.
 *
 * Desktop (sm and up) is untouched from the original: a flat grid, icon
 * top-left, number top-right, title below, body below that.
 *
 * Mobile is a DEALT STACK. Each card is `position: sticky` at a top offset one
 * header-height further down than the card before it, so as you scroll a card
 * parks and the next one slides up over it, leaving only its header strip
 * showing. By the last card the four before it read as a pile of tabs — the
 * five stages of the method visible at once, in order, without five full
 * paragraphs of scrolling.
 *
 * Three things this depends on, all easy to break:
 *
 *  1. The card must be OPAQUE. It is covering the one beneath it; a
 *     translucent background would show both sets of type at once.
 *  2. No ancestor may have `overflow: hidden` or a `transform`. Either one
 *     silently turns `position: sticky` into `position: static` — the classic
 *     way this effect dies. The section and the <ul> are therefore left plain.
 *  3. The title must sit BESIDE the icon on the header row, not under it, so
 *     the strip left showing is one line tall and actually names the step.
 *
 * The lego entrance is dropped on mobile for these cards: an entrance
 * transform on a sticky element fights the stick, and the stack is the motion
 * here anyway. Above sm it comes back.
 */
function MechanismCard({
  step,
  idx,
}: {
  step: (typeof MECHANISM)[number];
  idx: number;
}) {
  const { n, icon: Icon, title, body } = step;
  const accent = MECH_ACCENTS[idx % MECH_ACCENTS.length];

  return (
    <li
      className="sm-stack-card sm:!static"
      style={{
        /* Each card parks 58px lower than the last, which is the height of the
           header strip plus its padding. Read by the CSS in globals.css. */
        ['--stack-i' as string]: idx,
        zIndex: idx + 1,
      }}
    >
      {/* sm:h-full is what levels the row on desktop. The grid item is the
          <li>, which stretches by default, but the card the reader actually
          sees is this inner div — without a height it wraps its own copy and
          the five cards end up with ragged bottoms, because the bodies are
          two, three and four lines long. Left off below sm, where the cards
          are a sticky stack and each one must keep its natural height. */}
      <div
        data-lego=""
        className="lego-hover rounded-2xl border p-5 sm:h-full"
        style={{
          ...legoBrick(idx, 80),
          borderColor: C.line,
          /* Opaque, not C.canvas's translucency — see note 1 above. */
          background: C.canvas,
        }}
      >
        {/* Header strip: the part that stays visible once the card is parked. */}
        <div className="flex w-full items-center gap-3 sm:block">
          <span className="flex shrink-0 items-center sm:mb-0 sm:w-full sm:justify-between">
            <span
              data-lego-stud=""
              className="lego-stud inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
              style={{ ...legoBrick(idx, 80), background: accent.bed }}
            >
              <Icon weight="bold" className="h-4 w-4" style={{ color: accent.fg }} />
            </span>
            <span
              className="ml-auto hidden font-heading text-[12px] font-bold tracking-[0.1em] sm:inline"
              style={{ color: C.inkMuted }}
            >
              {n}
            </span>
          </span>

          <h3
            className="min-w-0 flex-1 font-heading text-[15px] font-bold leading-snug sm:mt-4"
            style={{ color: C.ink }}
          >
            {title}
          </h3>

          {/* The step number rides the header row on mobile. */}
          <span
            className="ml-auto shrink-0 font-heading text-[12px] font-bold tracking-[0.1em] sm:hidden"
            style={{ color: C.inkMuted }}
          >
            {n}
          </span>
        </div>

        <p className="mt-2 text-[13px] leading-relaxed" style={{ color: C.inkSoft }}>
          {body}
        </p>
      </div>
    </li>
  );
}

/* ── section 9 · what people notice (PDF p9) ─────────────────────────── */

const NOTICE = [
  'Less stiffness in the morning',
  'Easier movement through the day',
  'More comfortable sitting, standing & walking',
  'Less tension through the back, neck & knees',
  'Better mobility without forcing a stretch',
  'More strength & stability in everyday movement',
  'Greater confidence in how their body moves',
  'A body that feels stronger, steadier & easier to move',
];

function Notice() {
  return (
    <section className="px-4 py-16 sm:py-24" style={{ background: C.canvas }}>
      <SectionHeading>
        That&apos;s why <span style={{ color: C.goldDeep }}>people</span> start
        noticing…
      </SectionHeading>

      {/* 8 items into 3 columns leaves 2 stranded hard-left on the last row
          with a column-wide hole beside them. Fixed by making the desktop grid
          SIX columns and giving every card a 2-column span — visually
          identical to a 3-column grid, but now a half-column offset exists.
          The first of the two orphans starts at column 2, so the pair occupies
          columns 2–5 and sits dead centre.

          A 3-column grid cannot do this: centring two items across three
          tracks needs fractional placement, and col-span-3 on each would stack
          them on separate rows instead of keeping them side by side. */}
      <ul className="mx-auto mt-10 grid max-w-[960px] gap-3 sm:grid-cols-2 lg:grid-cols-6">
        {NOTICE.map((line, idx) => {
          const orphans = NOTICE.length % 3;
          const startsTail = orphans === 2 && idx === NOTICE.length - 2;
          return (
          <li
            key={line}
            data-lego=""
            className={`lego-hover-sm flex items-center gap-3 rounded-2xl border px-4 py-3.5 lg:col-span-2 ${
              startsTail ? 'lg:col-start-2' : ''
            }`}
            style={{ ...legoBrick(idx, 60), borderColor: C.line, background: C.white }}
          >
            <span
              className="lego-stud inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
              style={{ background: 'rgba(159,218,203,0.34)' }}
            >
              <CheckCircle
                weight="fill"
                className="h-3.5 w-3.5"
                style={{ color: C.mintInk }}
              />
            </span>
            <span className="text-[13.5px] leading-snug" style={{ color: C.inkSoft }}>
              {line}
            </span>
          </li>
          );
        })}
      </ul>

      {/* Required qualifier. Sits with the outcomes, never hidden in the footer. */}
      <p
        className="mx-auto mt-7 max-w-[960px] text-center text-[12.5px]"
        style={{ color: C.inkMuted }}
      >
        Results vary from person to person.
      </p>
    </section>
  );
}

/* ── section 10a · come to day one, then decide (PDF p10) ─────────────── */

function Promise() {
  return (
    <section
      className="px-4 py-20 sm:py-28"
      style={{
        background: `radial-gradient(ellipse 70% 40% at 50% 0%, rgba(38,140,179,0.08), transparent 60%), ${C.canvas}`,
      }}
    >
      {/* The refund promise, given the Sreshtha promise-band treatment: sealed
          medallion, gold flourish, serif centre-set. It is the single most
          load-bearing sentence on the page, so it gets its own object rather
          than being one more block of body copy. */}
      <m.div
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.25 }}
        className="sm-promise-card"
      >
        <div className="sm-promise-seal" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 3 4 6v6c0 5 3.5 8.5 8 9 4.5-.5 8-4 8-9V6l-8-3Z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        </div>

        <h2
          className="font-heading text-[clamp(28px,3.6vw,44px)] font-medium leading-[1.12] tracking-[-0.012em]"
          style={{ color: C.ink, textWrap: 'balance' } as React.CSSProperties}
        >
          Come to Day One.{' '}
          <span className="italic" style={{ color: C.goldDeep }}>
            Then Decide.
          </span>
        </h2>

        <p
          className="mx-auto mt-6 max-w-[560px] text-[17px] leading-[1.65]"
          style={{ color: C.inkSoft }}
        >
          Join Day 1 of the 5-Day Pain Reset Challenge and experience the Inner
          Brace Method for yourself. If you attend Day 1 and decide it&apos;s not
          for you, simply let us know by the end of the day and we&apos;ll refund
          your {PRICE_LABEL} in full.
        </p>

        <p className="sm-promise-closer">
          <span
            className="font-heading text-[clamp(18px,1.6vw,21px)] italic leading-[1.5]"
            style={{ color: C.goldDeep }}
          >
            That&apos;s it. Come to Day 1. Experience the approach. Then decide if
            it&apos;s right for you.
          </span>
        </p>
      </m.div>
    </section>
  );
}

/* ── section 10b · the two options (PDF p10) ─────────────────────────────
   A section of its own, not a tail on the promise: it gets the masthead
   treatment, its own band, and the full section rhythm. */

function TwoOptions() {
  return (
    <section className="px-4 py-16 sm:py-24" style={{ background: C.white }}>
      <div className="mx-auto mb-4 flex max-w-3xl justify-center">
        <SectionEyebrow text="The Choice" />
      </div>
      <SectionHeading>
        From Here, You Have{' '}
        <span style={{ color: C.goldDeep }}>Two Options</span>.
      </SectionHeading>

      <div className="mx-auto mt-12 grid max-w-[900px] gap-4 sm:grid-cols-2">
        <div
          data-lego="x"
          className="lego-hover rounded-2xl border p-6"
          style={{
            ['--lego-from' as string]: '-30px',
            borderColor: C.line,
            background: C.white,
          }}
        >
          <span
            className="lego-stud inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em]"
            style={{ background: C.sand, color: C.inkMuted }}
          >
            <Minus weight="bold" className="h-3 w-3" />
            Option 1
          </span>
          <p
            className="mt-4 text-[14px] leading-relaxed"
            style={{ color: C.inkSoft }}
          >
            Keep stretching, resting and trying random exercises, hoping the
            stiffness eventually settles, without really understanding what your
            body needs to move and strengthen differently.
          </p>
        </div>

        <div
          data-lego="x"
          className="lego-hover rounded-2xl p-6"
          style={{
            ['--lego-from' as string]: '30px',
            ['--lego-d' as string]: '110ms',
            background: C.ink,
            boxShadow: '0 22px 50px -26px rgba(24,59,86,0.5)',
          }}
        >
          <span
            className="lego-stud inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em]"
            style={{ background: 'rgba(255,193,7,0.22)', color: '#FFEEBA' }}
          >
            <Plus weight="bold" className="h-3 w-3" />
            Option 2
          </span>
          <p
            className="mt-4 text-[14px] leading-relaxed"
            style={{ color: 'rgba(250,245,234,0.88)' }}
          >
            Take the next step and experience the Inner Brace Method through 5
            days of live, coach-led movement, breath work and strengthening, so
            you can learn how to support your body and start moving with greater
            strength, stability and ease.
          </p>
          <a
            href="/checkout"
            className="lego-press lego-pulse group mt-6 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 font-heading text-[14.5px] font-bold"
            style={{
              background: C.white,
              color: C.ink,
              ['--pulse-color' as string]: 'rgba(255,255,255,0.45)',
            }}
          >
            Start Your 5-Day Reset · {PRICE_LABEL}
            <ArrowRight
              weight="bold"
              className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </a>
          <p
            className="mt-3 text-center text-[12.5px]"
            style={{ color: 'rgba(250,245,234,0.7)' }}
          >
            Refundable If You Don&apos;t Love Day One
          </p>
        </div>
      </div>
    </section>
  );
}

/* ── section 11 · FAQ (PDF p11) ──────────────────────────────────────── */

const FAQS = [
  {
    q: 'Is this just another stretching or exercise routine?',
    a: 'No. This is a live, coach-led programme built specifically for back, neck and knee pain, using a named method, the Inner Brace Method. Every session is sequenced around what your body needs to unload and support first, not a generic set of stretches.',
  },
  {
    q: "I've tried exercise routines before and they didn't help, or made things worse. Why would this be different?",
    a: "A generic routine isn't sequenced for a back, neck or knee that's already guarding and the wrong movement on an irritated area can make things worse. That's exactly why the Inner Brace Method starts by taking the load off before asking anything to stretch or strengthen. Nothing is forced, and every movement is adapted live by your coach.",
  },
  {
    q: 'My employer already gives me a free app for this. Why would I pay for a challenge?',
    a: "Those apps are useful, but they're self-guided — nobody is watching how you move or correcting you in real time. This challenge is live, with a coach adjusting what you're doing as you're doing it. It's a different kind of support, not a replacement.",
  },
  {
    q: "Isn't physiotherapy enough?",
    a: "Physiotherapy is a great first step, and this isn't a replacement for medical care. What we often hear is that the exercises help while the sessions are happening, and things drift back afterwards. This challenge focuses on the ongoing part, learning to move differently day to day, for longer than a six-week course.",
  },
  {
    q: "I've already spent money on this problem. Why would this be different?",
    a: "Because most approaches focus on where it hurts, not on why the load keeps landing there in the first place. This method starts by unloading the area, then rebuilding the support around it, the sequence itself is what's different, not just another set of exercises.",
  },
  {
    q: 'Will this fix my pain in 5 days?',
    a: "No and we won't tell you it will. Five days is enough to safely experience the method, understand what your body needs, and see your own progress from Day 1 to Day 4. Most people notice a real shift by session three or four; lasting change comes from the months that follow, not the five days alone.",
  },
  {
    q: "What if I can't make the live session time?",
    a: `Every session runs twice a day, ${SESSION_TIMES}, so you can pick whichever fits. Live sessions are how the coaching and real-time correction work, so we don't offer indefinite replays.`,
  },
  {
    q: 'What happens after the 5 days?',
    a: "Day 5 is where we talk about what your 5 days actually showed you, and how to keep building on it if you'd like to continue. There's no obligation, it's entirely your decision.",
  },
  {
    q: 'Is this safe if I have a diagnosed condition?',
    a: 'If you have a diagnosed condition where your clinician has advised against certain movement, please check with them first. This programme is a complement to medical care, not a replacement for it.',
  },
];

function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="px-4 py-16 sm:py-24" style={{ background: C.canvas }}>
      <SectionHeading>
        Frequently Asked{' '}
        <span style={{ color: C.goldDeep }}>Questions</span>
      </SectionHeading>

      <ul className="mx-auto mt-10 grid max-w-[820px] gap-3">
        {FAQS.map((f, i) => {
          const isOpen = open === i;
          return (
            <li
              key={f.q}
              data-lego=""
              /* No hover lift: the row is already a button, and lifting a
                 stack of accordion rows on hover makes the list jitter as the
                 cursor crosses it. The +/- glyph carries the affordance. */
              className="overflow-hidden rounded-2xl border"
              style={{
                ...legoDelay(i, 45),
                borderColor: isOpen ? C.lineStrong : C.line,
                background: C.white,
              }}
            >
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                className="group flex w-full items-start justify-between gap-4 px-5 py-4 text-left"
              >
                <span
                  className="font-heading text-[15px] font-bold leading-snug"
                  style={{ color: C.ink }}
                >
                  {f.q}
                </span>
                <span
                  className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-transform duration-300 group-hover:scale-110 group-active:scale-95"
                  style={{ background: 'rgba(255,193,7,0.28)' }}
                >
                  {isOpen ? (
                    <Minus weight="bold" className="h-3 w-3" style={{ color: C.yellowInk }} />
                  ) : (
                    <Plus weight="bold" className="h-3 w-3" style={{ color: C.yellowInk }} />
                  )}
                </span>
              </button>
              {isOpen && (
                <p
                  className="px-5 pb-5 text-[14px] leading-relaxed"
                  style={{ color: C.inkSoft }}
                >
                  {f.a}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ── section 12 · important information (PDF p12) ────────────────────── */

function LegalNotice() {
  return (
    <section className="px-4 py-14 sm:py-20" style={{ background: C.white }}>
      <div
        className="mx-auto max-w-[820px] rounded-2xl border p-7 sm:p-9"
        style={{ borderColor: C.line, background: C.canvas }}
      >
        <h2
          className="font-heading text-[19px] font-bold"
          style={{ color: C.ink }}
        >
          Important Information{' '}
          <span style={{ color: C.goldDeep }}>Before You Start</span>
        </h2>

        <div
          className="mt-4 space-y-3.5 text-[13.5px] leading-relaxed"
          style={{ color: C.inkSoft }}
        >
          <p>
            SuperMe is a yoga and movement education service. It is not a medical
            service and is not a substitute for medical care. Nothing on this page
            is medical advice, a diagnosis, or a treatment plan.
          </p>
          <p>
            The 5-Day Pain Reset is designed to provide guided movement, breath
            work, mobility and strengthening education. It is not intended to
            diagnose, treat or manage a diagnosed medical condition.
          </p>
          <p>
            Atul Mishra is a yoga teacher with a postgraduate diploma in Yoga
            Education from Kaivalyadhama and an E-RYT 500 certification with Yoga
            Alliance. He is not a doctor, physiotherapist or registered clinician.
            The 5-Day Pain Reset is therefore not a replacement for physiotherapy
            or any medical care you are currently receiving.
          </p>
          <p>
            Please speak with your GP or clinician before starting, particularly
            if you are recovering from an acute injury or surgery, have not been
            cleared to exercise, or have been advised that movement is not
            appropriate for you.
          </p>
          <p>
            During any session, do not push through pain. If something hurts, stop
            the movement and tell the teacher.
          </p>

          <h3
            className="pt-2 font-heading text-[15px] font-bold"
            style={{ color: C.ink }}
          >
            About The Results You See On This Page
          </h3>
          <p>
            Any timelines or outcomes mentioned on this page come from individual
            client case files and experiences. They are not typical results,
            predictive of what you will experience, or guaranteed. Your body,
            history, movement patterns and circumstances are different, so your
            experience may be different too.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ── footer ──────────────────────────────────────────────────────────── */

function Footer() {
  return (
    <footer
      className="px-4 py-10 text-center text-[12.5px]"
      style={{ background: C.ink, color: 'rgba(250,245,234,0.6)' }}
    >
      {/* One sentence on desktop; two centred lines on a phone, split at the
          natural break between WHEN it runs and WHAT it costs. The separator
          before the price is dropped on mobile — a line that opens with a
          middot reads as a broken list item. Both halves are inline-block so
          each one wraps as its own unit rather than reflowing into the other. */}
      <p className="mx-auto max-w-[640px]">
        <span className="inline-block">
          Starts {START_DATE} · Live on Zoom
        </span>
        <span aria-hidden className="hidden sm:inline">
          {' · '}
        </span>
        <span className="block sm:inline">
          {PRICE_LABEL}, refunded in full if day one is not for you
        </span>
      </p>

      <ul className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
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
  );
}

export default function BelowFold() {
  /* LazyMotion is not decoration: it mounts the single IntersectionObserver
     that adds `bw-in` to revealed elements. Without it every .bw-reveal-*
     stays at opacity 0 once .bw-js is on the document. */
  return (
    <LazyMotion features={domAnimation}>
      <Experience />
      <Schedule />
      <SessionsBand />
      <Recognition />
      <Testimonials />
      {/* The bonuses sit here, immediately above Meet Your Guide, so the
          reader has seen the proof and knows what lands in their inbox before
          they are introduced to the person delivering it. */}
      <Bonuses />
      <Guide />
      <Mechanism />
      <Notice />
      <Promise />
      <TwoOptions />
      <Faq />
      <LegalNotice />
      <Footer />
    </LazyMotion>
  );
}
