/**
 * /thank-you · the post-registration page.
 *
 * Structure follows the bodyworx.in/thank-you reference the client supplied,
 * section for section: confirmation → the diary facts → the ONE required
 * action → what that action gets you → the two attendance notes → policy →
 * prep → a closing band that repeats the action. Every surface is rebuilt in
 * the SuperMe system though — pale blue canvas, navy ink, Phosphor duotone
 * glyphs on their accent beds, the same 2xl/3xl card radii as the landing page.
 *
 * Two deliberate departures from the reference:
 *
 *  1. The reference's policy block is three flat negatives, one of which is
 *     "no refunds". There is nothing to refund here — the challenge is free —
 *     so that line would be answering a question nobody asked. The three cards
 *     keep the reference's shape but say what is actually true about a live
 *     cohort, and the free place is restated underneath rather than a payment
 *     policy being invented for it.
 *
 *  2. Both WhatsApp buttons are the same <JoinButton>, pointed at
 *     NEXT_PUBLIC_WHATSAPP_COMMUNITY_URL. One component, so the label and the
 *     href can never drift apart between the top of the page and the bottom.
 *
 * All dates, times and the invite link come from env — see .env.example.
 *
 * ── NO GATE ─────────────────────────────────────────────────────────────────
 * This page used to have a second state: a "we cannot see a place held here"
 * panel for anyone arriving without the registration cookie. That is gone, and
 * so is the cookie check that drove it. The page always shows the
 * confirmation.
 *
 * The reason is that the gate protected nothing and cost something real. What
 * sits behind it is a WhatsApp invite to a free challenge — no value to
 * anyone who has not registered — while an expired cookie, a blocked cookie or
 * an in-app browser would show a genuine registrant a screen telling them
 * their place was not held. That is a bad trade in both directions.
 *
 * The cookie is still read by ./page.tsx, for the greeting alone.
 */
import {
  ArrowRight,
  BellRinging,
  CalendarBlank,
  CheckCircle,
  Clock,
  Confetti,
  Crown,
  Heart,
  Lightning,
  Note,
  PlayCircle,
  Prohibit,
  ShieldCheck,
  Star,
  VideoCamera,
  WarningCircle,
  WhatsappLogo,
} from '@phosphor-icons/react/dist/ssr';
import Link from 'next/link';

import BrandMark from '@/components/BrandMark';
import ConfettiBurst from '@/components/ConfettiBurst';

import { VIP_BONUSES } from '../_landing/bonus-data';
import { legoBrick, legoDelay } from '../_landing/lego-style';
import MobileCtaBar, { MOBILE_CTA_BAR_SPACE } from '../_landing/mobile-cta-bar';
import {
  C,
  LEGAL_LINKS,
  SESSION_TIMES_TZ,
  SESSIONS_LABEL,
  START_DATE,
  WHATSAPP_COMMUNITY_URL,
} from '../_landing/shared';

const HAS_INVITE = WHATSAPP_COMMUNITY_URL.length > 0;

export type ThankYouProps = {
  /**
   * This person also paid for the VIP upgrade.
   *
   * ONE COMPONENT SERVES BOTH THANK-YOU PAGES. Everything a free registrant
   * needs — the diary facts, the WhatsApp step, the attendance notes, the prep
   * list — is identical for a VIP buyer, and duplicating the page to add three
   * paragraphs would guarantee the two drift the first time a session time
   * changes. So VIP is a flag that ADDS a block and adjusts two lines, never a
   * second copy.
   */
  vip?: boolean;
  firstName?: string;
  email?: string;
};

/**
 * The one action on this page, used three times — the green step-1 card, the
 * closing navy band, and the docked mobile bar. All three call it, so the
 * label and the href are defined once.
 *
 * `tone` only picks the pill's colours for the ground it sits on: white pill
 * with green type on the green card, white pill with navy type on the navy
 * band, and green fill with white type in the docked bar, which sits on the
 * page's own white. The WhatsApp glyph stays WhatsApp green on the light ones.
 *
 * When the env URL is unset the button still renders, in a flat non-clickable
 * state, so the layout and the instruction hold. There is deliberately no
 * "we'll email it to you" line — the client removed that copy.
 */
function JoinButton({
  className = '',
  tone,
  label,
  compact = false,
}: {
  className?: string;
  tone: 'onGreen' | 'onNavy' | 'solid';
  label: string;
  /** The docked-bar size. Shorter, tighter, and smaller type. */
  compact?: boolean;
}) {
  const light = tone !== 'solid';

  const inner = (
    <>
      <WhatsappLogo
        weight="fill"
        className={compact ? 'h-4 w-4' : 'h-5 w-5'}
        style={{ color: tone === 'onNavy' ? C.greenInk : undefined }}
      />
      {label}
      <ArrowRight
        weight="bold"
        className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
      />
    </>
  );

  const shape = compact
    ? 'group inline-flex min-h-[48px] shrink-0 items-center justify-center gap-2 rounded-full px-5 text-[14px] font-semibold'
    : 'group inline-flex min-h-[54px] items-center justify-center gap-2.5 rounded-full px-8 text-[15px] font-bold';

  /* Only the two in-flow buttons are watched. The docked one must NOT be, or
     the bar would observe itself, read as permanently on screen, and hide for
     good. */
  const watched = compact ? undefined : '';

  if (!HAS_INVITE) {
    return (
      <span
        data-join-cta={watched}
        className={`${shape} ${className} cursor-default`}
        /* The two in-flow buttons sit on the green card and the navy band, so a
           white wash with white type reads as a disabled pill there. The docked
           one sits on the bar's own white, where that would be invisible — it
           gets a pale bed and muted ink instead. */
        style={
          light
            ? { background: 'rgba(255,255,255,0.4)', color: '#FFFFFF' }
            : { background: C.lightBlue, color: C.inkMuted }
        }
      >
        {inner}
      </span>
    );
  }

  return (
    <a
      href={WHATSAPP_COMMUNITY_URL}
      target="_blank"
      rel="noopener noreferrer"
      data-join-cta={watched}
      /* Marks all three instances (both in-flow buttons and the docked one)
         for the GA join_whatsapp listener. Separate from data-join-cta, which
         only tags the two the mobile bar watches. */
      data-ga-join=""
      className={`lego-press ${light ? 'lego-pulse' : 'lego-pulse-glow'} ${shape} ${className}`}
      style={
        light
          ? {
              background: C.white,
              color: tone === 'onNavy' ? C.ink : C.greenInk,
              ['--pulse-color' as string]: 'rgba(255,255,255,0.45)',
            }
          : { background: C.greenInk, color: C.white }
      }
    >
      {inner}
    </a>
  );
}

/* ── what the community gets you ─────────────────────────────────────── */
const COMMUNITY = [
  { icon: VideoCamera, text: 'Your daily Zoom link for both session times' },
  { icon: BellRinging, text: 'A reminder before every live session' },
  { icon: Note, text: 'What to have ready for each day' },
  { icon: Heart, text: 'Support across the full 5 days' },
  { icon: ShieldCheck, text: 'Updates directly from Atul' },
];

/* Reference's shape, SuperMe's actual terms. */
const POLICY = [
  'No moving to a later cohort once this one starts',
  'Live sessions are where the correction happens',
  'Replays are not guaranteed for a session you miss',
];

const PREP = [
  'Wear something you can move in',
  'Have a mat, or a rug on a hard floor',
  'Find a space where you can lie down',
  'Join the WhatsApp community now',
];

/** Brand bar. The status pill is always the confirmed one — see below. */
function PageHeader() {
  return (
    <header style={{ background: C.white, borderBottom: `1px solid ${C.line}` }}>
      <div className="mx-auto flex max-w-[1120px] items-center justify-between gap-4 px-5 py-4 md:px-8">
        <BrandMark height={34} priority />
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em]"
          style={{ background: C.greenBed, color: C.greenInk }}
        >
          <CheckCircle weight="fill" className="h-3 w-3" />
          Place confirmed
        </span>
      </div>
    </header>
  );
}


export default function ThankYou({
  vip = false,
  firstName = '',
  email = '',
}: ThankYouProps) {
  return (
    <main className="font-body" style={{ background: C.paleBlue, color: C.ink }}>
      <ConfettiBurst />
      <PageHeader />

      <div className="mx-auto max-w-[820px] px-5 py-14 md:py-20">
        {/* ── 1 · confirmation ─────────────────────────────────────── */}
        <div className="text-center">
          <span
            data-lego=""
            className="lego-pulse mx-auto grid h-16 w-16 place-items-center rounded-full"
            style={{
              background: C.white,
              border: `1px solid ${C.line}`,
              boxShadow: '0 14px 30px -18px rgba(0,32,98,0.4)',
              ['--pulse-color' as string]: 'rgba(42,170,239,0.35)',
            }}
          >
            <Confetti weight="duotone" className="h-7 w-7" style={{ color: C.blue }} />
          </span>

          <span
            data-lego=""
            className="mt-5 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.2em]"
            style={{ ...legoDelay(1, 80), background: C.greenBed, color: C.greenInk }}
          >
            <CheckCircle weight="fill" className="h-3 w-3" />
            Congratulations
          </span>

          <h1
            data-lego=""
            className="mt-4 font-heading text-[clamp(28px,4.6vw,44px)] font-bold leading-[1.12] tracking-[-0.01em]"
            style={{ ...legoDelay(2, 80), color: C.ink }}
          >
            {/* The first name comes from the registration cookie when there is
                one; the headline reads correctly either way. */}
            {firstName ? `${firstName}, your` : 'Your'} 5-Day Pain Reset is{' '}
            <span style={{ color: C.goldDeep }}>Confirmed.</span>
          </h1>

          <p
            data-lego=""
            className="mx-auto mt-4 max-w-[560px] text-[15.5px] leading-relaxed"
            style={{ ...legoDelay(3, 80), color: C.inkSoft }}
          >
            {vip
              ? 'Your place and your VIP access are both confirmed on the live 5-Day Pain Reset Challenge with Atul, and your joining email is on its way'
              : 'Your free place is held on the live 5-Day Pain Reset Challenge with Atul, and your joining email is on its way'}
            {email ? ` to ${email}` : ''}. Please read this page before you
            close it — there is one step left, and your session links come
            through it.
          </p>
        </div>

        {/* ── VIP extras ───────────────────────────────────────────────
            Sits directly under the confirmation and ABOVE the WhatsApp step,
            because it is the thing this reader just paid for and the thing
            they will look for first. It does not displace the WhatsApp step
            as "step 1 of 1" though — the recordings still arrive through the
            community, so that instruction has to stay the single required
            action for VIP and free alike. */}
        {vip && (
          <section
            data-lego=""
            className="mx-auto mt-9 max-w-[620px] rounded-3xl p-6 sm:p-7"
            style={{
              ...legoDelay(4, 80),
              background: C.white,
              border: `2px solid ${C.blueFill}`,
              boxShadow: '0 26px 60px -34px rgba(16,84,194,0.5)',
            }}
          >
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white"
              style={{ background: C.blueFill }}
            >
              <Crown weight="fill" className="h-3 w-3" />
              VIP access confirmed
            </span>

            <h2
              className="mt-3.5 font-heading text-[19px] font-bold leading-snug"
              style={{ color: C.ink }}
            >
              What your VIP access adds.
            </h2>

            <ul className="mt-4 grid gap-3">
              {[
                {
                  icon: PlayCircle,
                  title: 'Full recordings of all 5 sessions',
                  body: 'They unlock the moment the challenge starts, not weeks later, so you can rewatch each day the same evening. Yours to keep for life.',
                },
                {
                  icon: Star,
                  title: 'Priority attention in the room',
                  body: 'Your form corrections and your questions go first, and there is extra support between sessions.',
                },
                {
                  icon: Lightning,
                  title: `Your ${VIP_BONUSES.length} extra guides`,
                  body: `${VIP_BONUSES.map((b) => b.title).join(' and ')}, posted alongside the two that come with every place.`,
                },
              ].map(({ icon: Icon, title, body }, i) => (
                <li key={title} className="flex items-start gap-3" style={legoBrick(i, 60)}>
                  <span
                    className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full"
                    style={{ background: C.lightBlue }}
                  >
                    <Icon weight="fill" className="h-3.5 w-3.5" style={{ color: C.blueFill }} />
                  </span>
                  <span className="min-w-0">
                    <span
                      className="block text-[14px] font-semibold leading-snug"
                      style={{ color: C.ink }}
                    >
                      {title}
                    </span>
                    <span
                      className="mt-0.5 block text-[13.5px] leading-snug"
                      style={{ color: C.inkSoft }}
                    >
                      {body}
                    </span>
                  </span>
                </li>
              ))}
            </ul>

            <p
              className="mt-4 flex items-start gap-2 rounded-2xl p-3 text-[12.5px] leading-snug"
              style={{ background: C.lightBlue, color: C.ink }}
            >
              <WarningCircle
                weight="fill"
                className="mt-0.5 h-4 w-4 shrink-0"
                style={{ color: C.blueFill }}
              />
              Your recordings and extra guides are delivered inside the same
              WhatsApp community, so the step below still applies to you.
            </p>
          </section>
        )}

        {/* ── 2 · the two diary facts ──────────────────────────────── */}
        <ul className="mx-auto mt-9 grid max-w-[560px] gap-3 sm:grid-cols-2">
          {[
            {
              icon: CalendarBlank,
              label: 'Challenge starts',
              value: START_DATE,
              bed: C.lightBlue,
              ink: C.skyInk,
            },
            {
              icon: Clock,
              label: SESSIONS_LABEL,
              value: SESSION_TIMES_TZ,
              bed: C.peachBed,
              ink: C.peachInk,
            },
          ].map(({ icon: Icon, label, value, bed, ink }, i) => (
            /* Icon and text centre as one group on a phone, where each card
               is full width and a left-set pair drifts away from the centred
               heading above it. From sm up the pair goes back to the left,
               because the cards then sit side by side. */
            <li
              key={label}
              data-lego=""
              className="lego-hover-sm flex items-center justify-center gap-3 rounded-2xl px-4 py-3.5 text-center sm:justify-start sm:text-left"
              style={{
                ...legoBrick(i, 90),
                background: C.white,
                border: `1px solid ${C.line}`,
              }}
            >
              <span
                className="lego-stud grid h-9 w-9 shrink-0 place-items-center rounded-xl"
                style={{ background: bed }}
              >
                <Icon weight="bold" className="h-4 w-4" style={{ color: ink }} />
              </span>
              <span className="min-w-0 leading-tight">
                <span
                  className="block text-[10px] font-bold uppercase tracking-[0.14em]"
                  style={{ color: C.inkMuted }}
                >
                  {label}
                </span>
                <span
                  className="mt-0.5 block font-heading text-[15px] font-bold"
                  style={{ color: C.ink }}
                >
                  {value}
                </span>
              </span>
            </li>
          ))}
        </ul>

        {/* ── 3 · the one required action ──────────────────────────── */}
        <section
          data-lego=""
          className="mt-10 overflow-hidden rounded-3xl px-6 py-10 text-center sm:px-10"
          style={{
            background: `linear-gradient(150deg, ${C.mintInk} 0%, ${C.greenInk} 55%, #0F6B33 100%)`,
            boxShadow: '0 30px 60px -34px rgba(23,135,64,0.6)',
          }}
        >
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em]"
            style={{ background: 'rgba(255,255,255,0.22)', color: '#FFFFFF' }}
          >
            <WarningCircle weight="fill" className="h-3 w-3" />
            Important · step 1 of 1
          </span>

          <h2
            className="mt-4 font-heading text-[clamp(22px,3.2vw,32px)] font-bold leading-tight text-white"
          >
            Join the WhatsApp community now.
          </h2>
          <p
            className="mx-auto mt-3 max-w-[460px] text-[14.5px] leading-relaxed"
            style={{ color: 'rgba(255,255,255,0.88)' }}
          >
            Zoom links, reminders and the daily joining note are all sent inside
            the community.{' '}
            <strong className="font-semibold text-white">
              Your access to the challenge runs through this group.
            </strong>
          </p>

          <JoinButton
            className="mt-7"
            tone="onGreen"
            label="Join the Community"
          />

          {HAS_INVITE && (
            <p className="mt-3 text-[12.5px]" style={{ color: 'rgba(255,255,255,0.75)' }}>
              Opens in WhatsApp · one tap to join
            </p>
          )}
        </section>

        {/* ── 4 · what the community gets you ──────────────────────── */}
        <section className="mt-14 text-center">
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
            What you&apos;ll receive inside
          </span>
          <h2
            data-lego=""
            className="mt-3 font-heading text-[clamp(22px,3.2vw,32px)] font-bold leading-tight"
            style={{ ...legoDelay(1, 70), color: C.ink }}
          >
            What arrives in the{' '}
            <span style={{ color: C.goldDeep }}>community</span>.
          </h2>
        </section>

        <ul className="mx-auto mt-7 grid max-w-[620px] gap-3">
          {COMMUNITY.map(({ icon: Icon, text }, i) => (
            <li
              key={text}
              data-lego=""
              className="lego-hover-sm flex items-center gap-3 rounded-2xl px-4 py-3.5"
              style={{
                ...legoBrick(i, 60),
                background: C.white,
                border: `1px solid ${C.line}`,
              }}
            >
              <span
                className="lego-stud grid h-8 w-8 shrink-0 place-items-center rounded-full"
                style={{ background: C.lightBlue }}
              >
                <Icon weight="duotone" className="h-4 w-4" style={{ color: C.skyInk }} />
              </span>
              <span className="flex-1 text-[14px] leading-snug" style={{ color: C.inkSoft }}>
                {text}
              </span>
              <CheckCircle
                weight="fill"
                className="h-4.5 w-4.5 shrink-0"
                style={{ color: C.green, height: 18, width: 18 }}
              />
            </li>
          ))}
        </ul>

        {/* ── 5 · the two attendance notes ─────────────────────────── */}
        <p
          data-lego=""
          className="mx-auto mt-4 flex max-w-[620px] items-start gap-2.5 rounded-2xl px-4 py-3.5 text-[13px] leading-snug"
          style={{ background: C.yellowBed, color: C.ink, border: `1px solid #F5E3B0` }}
        >
          <WarningCircle
            weight="fill"
            className="mt-0.5 h-4 w-4 shrink-0"
            style={{ color: C.yellowInk }}
          />
          <span>
            Please do <strong>not mute or leave the community</strong> during the
            5 days — it is where every session link is posted.
          </span>
        </p>

        <p
          data-lego=""
          className="mx-auto mt-3 flex max-w-[620px] items-start gap-2.5 rounded-2xl px-4 py-3.5 text-[13px] leading-snug"
          style={{ background: C.white, color: C.inkSoft, border: `1px solid ${C.line}` }}
        >
          <Clock
            weight="fill"
            className="mt-0.5 h-4 w-4 shrink-0"
            style={{ color: C.coralInk }}
          />
          <span>
            <strong style={{ color: C.ink }}>
              Join 5 minutes before each live session.
            </strong>{' '}
            These are live, coach-led sessions — arriving late means missing the
            set-up that the rest of the hour is built on.
          </span>
        </p>

        {/* ── 6 · policy ───────────────────────────────────────────── */}
        <section className="mt-14 text-center">
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
            Please note
          </span>
          <h2
            data-lego=""
            className="mt-3 font-heading text-[clamp(22px,3.2vw,32px)] font-bold leading-tight"
            style={{ ...legoDelay(1, 70), color: C.ink }}
          >
            How the live <span style={{ color: C.goldDeep }}>cohort works</span>.
          </h2>
          <p className="mx-auto mt-3 max-w-[520px] text-[14.5px]" style={{ color: C.inkSoft }}>
            Because this is a live, structured five days rather than a library
            of recordings:
          </p>
        </section>

        <ul className="mt-7 grid gap-3 sm:grid-cols-3">
          {POLICY.map((line, i) => (
            <li
              key={line}
              data-lego=""
              className="lego-hover-sm flex flex-col items-center gap-2.5 rounded-2xl px-4 py-5 text-center"
              style={{
                ...legoBrick(i, 80),
                background: C.white,
                border: `1px solid ${C.line}`,
              }}
            >
              <span
                className="lego-stud grid h-8 w-8 place-items-center rounded-full"
                style={{ background: C.coralBed }}
              >
                <Prohibit weight="bold" className="h-4 w-4" style={{ color: C.coralInk }} />
              </span>
              <span className="text-[13px] leading-snug" style={{ color: C.inkSoft }}>
                {line}
              </span>
            </li>
          ))}
        </ul>

        {/* The reference page puts "no refunds" here. Ours says the one thing
            that is actually true and actually reassuring: nothing was charged
            and nothing ever will be. */}
        <p
          data-lego=""
          className="mt-3 flex items-start gap-2.5 rounded-2xl px-5 py-4 text-[13.5px] leading-snug"
          style={{ background: C.mintBed, color: C.ink, border: `1px solid #BFE9E3` }}
        >
          <ShieldCheck
            weight="fill"
            className="mt-0.5 h-4 w-4 shrink-0"
            style={{ color: C.mintInk }}
          />
          <span>
            <strong>Your place is completely free.</strong> Nothing was charged,
            there is no card on file, and nothing turns into a subscription
            afterwards.
          </span>
        </p>

        {/* ── 7 · prep ─────────────────────────────────────────────── */}
        <section className="mt-14 text-center">
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
            Quick prep
          </span>
          <h2
            data-lego=""
            className="mt-3 font-heading text-[clamp(22px,3.2vw,32px)] font-bold leading-tight"
            style={{ ...legoDelay(1, 70), color: C.ink }}
          >
            What to do <span style={{ color: C.goldDeep }}>before Day One</span>.
          </h2>
        </section>

        <ul className="mt-7 grid gap-3 sm:grid-cols-2">
          {PREP.map((line, i) => (
            <li
              key={line}
              data-lego=""
              className="lego-hover-sm flex items-center gap-3 rounded-2xl px-4 py-3.5"
              style={{
                ...legoBrick(i, 70),
                background: C.white,
                border: `1px solid ${C.line}`,
              }}
            >
              <span
                className="lego-stud grid h-7 w-7 shrink-0 place-items-center rounded-full font-heading text-[12px] font-bold"
                style={{ background: C.lavenderBed, color: C.lavenderInk }}
              >
                {i + 1}
              </span>
              <span className="text-[13.5px] leading-snug" style={{ color: C.inkSoft }}>
                {line}
              </span>
            </li>
          ))}
        </ul>

        <p
          className="mt-4 text-center text-[12.5px]"
          style={{ color: C.inkMuted }}
        >
          <strong style={{ color: C.ink }}>No equipment needed.</strong> No prior
          experience needed either.
        </p>
      </div>

      {/* ── 8 · closing band ───────────────────────────────────────── */}
      <section className="px-5 pb-16 pt-4">
        <div
          data-lego=""
          className="mx-auto max-w-[820px] rounded-3xl px-6 py-14 text-center sm:px-12"
          style={{ background: C.ink }}
        >
          <h2
            className="mx-auto max-w-[520px] font-heading text-[clamp(22px,3.4vw,34px)] font-bold leading-tight"
            style={{ color: C.white }}
          >
            This is your <span style={{ color: C.sky }}>first step</span> toward
            moving with less stiffness and more support.
          </h2>
          <p className="mt-3 text-[14.5px]" style={{ color: 'rgba(250,245,234,0.75)' }}>
            Join the community and we will see you on {START_DATE}.
          </p>

          <JoinButton className="mt-7" tone="onNavy" label="Join the Community" />
        </div>
      </section>

      {/* ── footer ─────────────────────────────────────────────────── */}
      <footer
        className="px-5 py-12 text-center"
        style={{ background: C.ink, color: 'rgba(250,245,234,0.6)' }}
      >
        <p
          className="text-[10.5px] font-bold uppercase tracking-[0.2em]"
          style={{ color: C.sky }}
        >
          SuperMe · The Inner Brace Method™
        </p>
        <p className="mx-auto mt-4 max-w-[680px] text-[11.5px] leading-relaxed">
          SuperMe is a yoga and movement education service. It is not a medical
          service and is not a substitute for medical care. Nothing here is
          medical advice, a diagnosis or a treatment plan. Atul Mishra is a yoga
          teacher, not a doctor, physiotherapist or registered clinician. Please
          speak with your GP or clinician before starting if you have not been
          cleared to exercise. Do not push through pain during any session.
          Results vary from person to person.
        </p>
        <ul className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12px]">
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
        <p className="mt-4 text-[12px]">
          © 2026 MyEntourage Sàrl, Lausanne. All rights reserved.
        </p>

        {/* The docked bar's height, reserved inside the footer rather than
            after it — a spacer below the footer would put a pale strip under
            the navy. Mobile and tablet only, like the bar. */}
        <div
          aria-hidden
          className="lg:hidden"
          style={{ height: MOBILE_CTA_BAR_SPACE - 24 }}
        />
      </footer>

      {/* ── docked CTA · mobile and tablet ─────────────────────────────
          Not gated on HAS_INVITE. A missing invite makes the button flat and
          non-clickable, the same as the two in-flow ones — the page keeps
          saying there is one step left either way. */}
      <MobileCtaBar
        watch="[data-join-cta]"
        label="Step 1 of 1"
        trailing="Join WhatsApp"
        note="Your Zoom links come through it"
      >
        <JoinButton compact tone="solid" label="Join Now" />
      </MobileCtaBar>
    </main>
  );
}
