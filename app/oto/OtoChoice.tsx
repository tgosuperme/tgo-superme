'use client';

/**
 * The OTO · one offer, not a choice between two.
 *
 * WHERE THIS SITS
 * Landing → registration modal → OTO → (VIP only) checkout → confirmation.
 * By the time anyone reads this page their place is already registered: the
 * Pabbly row and the registration_complete event both went out when the modal
 * was submitted. So this page sells exactly one thing — the VIP pass — and the
 * reader loses nothing by declining it.
 *
 * ── IT WAS A RADIO PAIR, AND THAT WAS THE PROBLEM ─────────────────────────
 * The page used to present two cards, a seat and a VIP seat, as alternatives
 * to pick between. Asked to make the page dedicated to VIP, and it is worth
 * writing down WHY a comparison was the wrong frame here rather than just
 * noting that it changed:
 *
 *   · The comparison had no tension left. Once the seat went free, the two
 *     columns read "free" against "4.99", which is not a decision anyone
 *     deliberates — it is a reason to take the free one and leave.
 *   · A radio pair asks "which of these?". That question has a cheap answer.
 *     One offer with a decline link asks "do you want this?", which is the
 *     question the page is actually for.
 *   · Half the page was spent restating what the reader already agreed to on
 *     the landing page, and none of that space was selling anything.
 *
 * So: no second column, no price next to a price, no "total today" row
 * reconciling two numbers. The page names what VIP adds, shows it, and asks
 * once.
 *
 * ── THE DECLINE IS A BUTTON, NOT A WHISPER ────────────────────────────────
 * It shipped as a bare underlined link below the price card, and that was
 * wrong in a way the numbers showed: people who did not want the pass could
 * not find the way on, so they left the page rather than reaching their
 * joining instructions.
 *
 * Which is the whole lesson. The seat is real and ALREADY REGISTERED by the
 * time anyone reads this page — the Pabbly row is written, registration_
 * complete has fired. Hiding the way forward does not sell more upgrades; it
 * strands the funnel's main conversion one click from the finish line and
 * loses a lead that was already won.
 *
 * So it is a full-width secondary button in the same container as the primary,
 * and it is repeated in the docked bar on phones. The hierarchy is carried by
 * FILL, not by size or by hiding: solid blue for the upgrade, outlined on
 * white for the decline. A clear first and second, with no third state called
 * "invisible".
 *
 * ── WHAT THIS PAGE MAY NOT CLAIM ──────────────────────────────────────────
 * The four guides and the score report belong to a PLACE, not to VIP — the
 * landing page says so in writing, with values, in its bonuses section. They
 * are absent here on purpose. See the note above VIP_BONUSES in
 * lib/checkout-config.ts.
 *
 * ── THE FIGURES ARE THE CLIENT'S ──────────────────────────────────────────
 * AED 29 / 6 / 6 / 9 came with the Dubai move and are stated on the VIP order
 * summary at the checkout too, from the same list. Nothing here is estimated,
 * and the credit deliberately carries no figure: it is not a product.
 *
 * The stack total is SUMMED from that list rather than written down, so a
 * repriced bonus cannot leave a total behind that no longer adds up — the one
 * arithmetic error on a page like this that a reader will always spot.
 */
import {
  ArrowLeft,
  ArrowRight,
  ArrowsClockwise,
  CalendarBlank,
  Crown,
  Lightning,
  Monitor,
  Moon,
  ShieldCheck,
  VideoCamera,
  WhatsappLogo,
} from '@phosphor-icons/react/dist/ssr';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import BrandMark from '@/components/BrandMark';
import JoinTracker from '@/components/JoinTracker';
import PaymentLogos from '@/components/PaymentLogos';
import WhatsAppJoinPanel from '@/components/WhatsAppJoinPanel';
import {
  CHECKOUT_CONFIG,
  PLANS,
  VIP_BONUSES,
  VIP_EXTRAS_TOTAL,
  type VipBonus,
} from '@/lib/checkout-config';
import { GA_EVENTS, gaEvent } from '@/lib/ga';
import { readRegistration, type StoredRegistration } from '@/lib/registration-client';

import { legoBrick, legoDelay } from '../_landing/lego-style';
import MobileCtaBar, { MOBILE_CTA_BAR_SPACE_TALL } from '../_landing/mobile-cta-bar';
import { C, DATE_RANGE, SESSION_TIMES_TZ, START_DATE } from '../_landing/shared';

const VIP = PLANS.vip;

/* Flat and non-clickable when the invite is unset — the same rule the
   confirmation page uses, so a missing URL fails visibly in review rather than
   shipping a dead button to someone who has already registered. */
const HAS_INVITE = CHECKOUT_CONFIG.whatsappCommunityUrl.length > 0;

/* Icons live here rather than in the config, which is imported by server code
   that has no business pulling in a component library. Keyed on VipBonus.key
   so neither side matches on prose. */
const BONUS_ICON: Record<VipBonus['key'], typeof VideoCamera> = {
  recordings: VideoCamera,
  desk: Monitor,
  sleep: Moon,
  priority: Crown,
  credit: ArrowsClockwise,
};

/**
 * One bonus, as a card rather than a bullet.
 *
 * The brief asked for the bonuses highlighted, and a list of ticks is not that
 * — it is the same list the checkout shows in its order summary, where it is
 * meant to be scanned and forgotten. Here each one gets its own bed, its own
 * icon and a line of prose, because this page has nothing else to do.
 *
 * The first card is given the full width on every breakpoint: the recordings
 * are the reason people buy this pass, and a grid that treats them as one of
 * five equal tiles buries the only item most readers need to see.
 */
function BonusCard({ bonus, index }: { bonus: VipBonus; index: number }) {
  const Icon = BONUS_ICON[bonus.key];
  const lead = index === 0;

  return (
    <article
      data-lego=""
      className={`lego-hover-sm relative overflow-hidden rounded-3xl p-5 sm:p-6 ${
        lead ? 'sm:col-span-2' : ''
      }`}
      style={{
        ...legoBrick(index, 70),
        background: C.white,
        border: `1px solid ${lead ? C.gold : C.line}`,
        boxShadow: lead ? '0 18px 44px -32px rgba(0,32,98,0.45)' : 'none',
      }}
    >
      {/* A gold wash behind the lead card only, so the grid has one clear
          entry point instead of five things competing to be read first. */}
      {lead && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${C.goldSoft} 0%, rgba(255,255,255,0) 62%)`,
          }}
        />
      )}

      <div className="relative flex items-start gap-3.5">
        <span
          className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl"
          style={{ background: C.goldSoft }}
        >
          <Icon weight="fill" className="h-5 w-5" style={{ color: C.goldDeep }} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3
              className="font-heading text-[16px] font-bold leading-snug sm:text-[17px]"
              style={{ color: C.ink }}
            >
              {bonus.title}
            </h3>
            {/* The price sits BESIDE the heading rather than under the prose,
                so the five of them line up into a column the eye can add up
                on its way down. The credit has no value and simply shows
                nothing — no "included", no dash, no placeholder. */}
            {typeof bonus.value === 'number' && (
              <span
                className="shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-bold"
                style={{ background: C.goldSoft, color: C.goldDeep }}
              >
                {CHECKOUT_CONFIG.currencySymbol}
                {bonus.value}
              </span>
            )}
          </div>
          <p
            className="mt-1.5 text-[13.5px] leading-relaxed"
            style={{ color: C.inkSoft, textWrap: 'pretty' } as React.CSSProperties}
          >
            {bonus.body}
          </p>
        </div>
      </div>
    </article>
  );
}

export default function OtoChoice() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  /* Typed into the modal a moment ago, so the page can greet them by name. */
  const [reg, setReg] = useState<StoredRegistration | null>(null);
  useEffect(() => setReg(readRegistration()), []);

  /* THE ONLY DESTINATION THAT IS A TILL. The pass is the single thing on this
     page, so there is no plan to resolve and nothing to branch on — the plan
     rides in the query string rather than storage so it survives a refresh,
     a shared link and a back button. */
  const upgrade = () => {
    if (busy) return;
    setBusy(true);

    gaEvent(GA_EVENTS.beginCheckout, {
      value: VIP.priceAed,
      currency: CHECKOUT_CONFIG.currency,
      items: [{ item_id: VIP.id, item_name: VIP.productName, price: VIP.priceAed }],
    });

    router.push('/checkout?plan=vip');
  };

  return (
    <main className="min-h-screen" style={{ background: C.paleBlue }}>
      {/* GA join_whatsapp. One delegated listener for the [data-ga-join]
          button in the panel at the foot of this page, same as the
          confirmation pages mount for theirs. */}
      <JoinTracker />
      {/* ── header ─────────────────────────────────────────────────── */}
      <header style={{ background: C.white, borderBottom: `1px solid ${C.line}` }}>
        <div className="mx-auto flex max-w-[1120px] items-center justify-between gap-4 px-5 py-4 md:px-8">
          <BrandMark height={34} priority />
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

      <div className="mx-auto max-w-[900px] px-5 py-10 md:px-8 md:py-14">
        {/* ── the ask ────────────────────────────────────────────────
            Centred: this page has no form column to align to, it is one offer
            presented head-on. */}
        <div className="mx-auto max-w-[660px] text-center">
          <span
            data-lego=""
            className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em]"
            style={{ background: C.goldSoft, color: C.goldDeep }}
          >
            <Crown weight="fill" className="h-3 w-3" />
            One-time upgrade offer
          </span>

          <h1
            data-lego=""
            className="mt-4 font-heading text-[clamp(28px,5.2vw,42px)] font-bold leading-[1.1] tracking-[-0.01em]"
            style={{ ...legoDelay(1, 80), color: C.ink, textWrap: 'balance' } as React.CSSProperties}
          >
            {reg?.firstName ? `${reg.firstName}, make it a ` : 'Make it a '}
            <span style={{ color: C.goldDeep }}>VIP seat</span>.
          </h1>

          <p
            data-lego=""
            className="mx-auto mt-3.5 max-w-[560px] text-[15.5px] leading-relaxed"
            style={{ ...legoDelay(2, 80), color: C.inkSoft, textWrap: 'pretty' } as React.CSSProperties}
          >
            Your place on the challenge is confirmed either way. This is the one
            chance to upgrade it — and it is only offered here, on this page,
            before the cohort starts.
          </p>

          {/* THE REAL REASON TO UPGRADE, said once and early. The five days are
              live: whatever is not recorded is simply gone when they end. That
              is a fact about the format rather than a pressure tactic, and it
              is the single most persuasive true thing this page can say. */}
          <p
            data-lego=""
            className="mx-auto mt-4 inline-flex max-w-[520px] items-start gap-2 rounded-2xl px-4 py-3 text-left text-[13.5px] leading-snug"
            style={{ ...legoDelay(3, 80), background: C.white, border: `1px solid ${C.gold}` }}
          >
            <Lightning
              weight="fill"
              className="mt-0.5 h-4 w-4 shrink-0"
              style={{ color: C.goldDeep }}
            />
            <span style={{ color: C.inkSoft }}>
              The sessions are live and nothing is kept after them.{' '}
              <strong style={{ color: C.ink }}>
                VIP is the only way to still have the five days on Day 6.
              </strong>
            </span>
          </p>
        </div>

        {/* ── the bonuses ────────────────────────────────────────────
            The page's centre of gravity, which is why it gets the heading and
            the grid rather than a column in a comparison table. */}
        <h2
          data-lego=""
          className="mt-12 text-center text-[11px] font-bold uppercase tracking-[0.18em]"
          style={{ ...legoDelay(1, 90), color: C.inkMuted }}
        >
          Everything the VIP pass adds
        </h2>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {VIP_BONUSES.map((bonus, i) => (
            <BonusCard key={bonus.key} bonus={bonus} index={i} />
          ))}
        </div>

        {/* ── what the stack adds up to ──────────────────────────────
            One line, not a panel. The arithmetic is the argument here and it
            does not need decorating: a reader who has just scrolled five
            priced cards already has the number roughly in mind, and this
            confirms it rather than announcing it.

            NO SAVINGS PERCENTAGE. Against a 4.99 pass that figure rounds to
            90%, which is the loud claim the advertising rules actually care
            about — and bonus-data.ts records that the stack was deliberately
            sized to keep the landing page's headline near 70%. Stating the two
            real numbers and letting them speak is the same argument without
            the claim. */}
        <p
          data-lego=""
          className="mt-6 text-center text-[13.5px] leading-relaxed"
          style={{ ...legoDelay(1, 90), color: C.inkSoft }}
        >
          That is{' '}
          <strong style={{ color: C.ink }}>
            {CHECKOUT_CONFIG.currencySymbol}
            {VIP_EXTRAS_TOTAL} of extras
          </strong>{' '}
          on top of the five live days, for {VIP.priceLabel}.
        </p>

        {/* ── the price and the ask ──────────────────────────────────
            ONE figure on the page. There is no "total today" row reconciling a
            choice any more, because there is no choice to reconcile. */}
        <section
          data-lego=""
          className="mx-auto mt-10 max-w-[560px] rounded-3xl p-6 text-center sm:p-8"
          style={{
            ...legoDelay(2, 90),
            background: C.white,
            border: `1px solid ${C.gold}`,
            boxShadow: '0 22px 60px -40px rgba(0,32,98,0.5)',
          }}
        >
          <p
            className="text-[11px] font-bold uppercase tracking-[0.16em]"
            style={{ color: C.inkMuted }}
          >
            {VIP.productName}
          </p>

          <p
            className="mt-2.5 font-heading text-[46px] font-bold leading-none"
            style={{ color: C.goldDeep }}
          >
            {VIP.priceLabel}
          </p>

          <p className="mt-2.5 text-[13px]" style={{ color: C.inkSoft }}>
            One payment, once — and it comes back off the programme if you
            continue after Day 5.
          </p>

          <button
            type="button"
            onClick={upgrade}
            disabled={busy}
            data-oto-cta=""
            className="lego-press lego-pulse-glow group mt-6 inline-flex min-h-[56px] w-full items-center justify-center gap-2.5 rounded-full text-[15.5px] font-semibold text-white disabled:cursor-progress disabled:opacity-70"
            style={{ background: C.blueFill }}
          >
            {busy ? 'Opening…' : `Upgrade to VIP · ${VIP.priceLabel}`}
            {!busy && (
              <ArrowRight
                weight="bold"
                className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5"
              />
            )}
          </button>

          {/* ── the decline, INSIDE the card ──────────────────────────
              It was a bare underlined link below the card, and it cost
              completions: people who did not want the pass could not see the
              way on, so they left the page instead of reaching their joining
              instructions. A decline that is hard to find does not sell more
              upgrades, it just loses the registration that was already made.

              So it is a real secondary button now, in the same container as
              the primary, sharing its width and its height. The hierarchy is
              carried by FILL rather than by size: the upgrade is a solid blue
              pill, this is outlined on white. That is a clear first and second
              without one of them being hidden. */}
          <Link
            href={CHECKOUT_CONFIG.confirmedPath}
            className="lego-press group mt-3 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full text-[14.5px] font-semibold transition-colors duration-200"
            style={{
              background: C.white,
              border: `1.5px solid ${C.lineStrong}`,
              color: C.ink,
            }}
          >
            Continue with my standard seat
            <ArrowRight
              weight="bold"
              className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5"
            />
          </Link>

          <p
            className="mt-3.5 flex items-start justify-center gap-1.5 text-[12.5px] leading-snug"
            style={{ color: C.inkSoft }}
          >
            <ShieldCheck
              weight="fill"
              className="mt-0.5 h-3.5 w-3.5 shrink-0"
              style={{ color: C.mintInk }}
            />
            Come to Day 1. If it&apos;s not for you, message us by the end of
            that day and it&apos;s refunded in full.
          </p>

          <div className="mt-4">
            <PaymentLogos size="compact" />
          </div>
        </section>

        <p className="mt-8 text-center text-[12.5px]" style={{ color: C.inkMuted }}>
          <CalendarBlank
            weight="bold"
            className="mr-1.5 inline h-3.5 w-3.5 align-[-2px]"
            style={{ color: C.skyInk }}
          />
          Starts {START_DATE} · {DATE_RANGE} · {SESSION_TIMES_TZ} · Live on Zoom
        </p>

        {/* ── the step that has to happen either way ──────────────────
            BELOW the offer, not above it, and that order is the whole design.
            Put it first and it answers the page before the page has asked:
            somebody who has their Zoom links has no reason left to read about
            the pass. Put it last and it catches everyone the offer did not —
            which, on an upsell, is most of them.

            It is the same panel as the confirmation page, from the same
            component, because it is the same instruction. The copy differs
            only where this moment differs: nobody has upgraded yet, so it says
            the group is the way in whichever way they go, and the pass is
            mentioned once so declining the offer does not feel like leaving
            something behind.

            This is also why the page needed the decline button beside the
            upgrade: a reader who joins the community from here and closes the
            tab has done everything the funnel actually needs. */}
        <WhatsAppJoinPanel
          className="mt-12"
          /* A typographic apostrophe as the character, not &rsquo;: entities
             are decoded in JSX text but not in a string prop, so the entity
             form would print literally on the badge. */
          eyebrow="Don’t Miss This!"
          pulseEyebrow
          title="Your place is held. One step to use it."
          body={
            <>
              Zoom links, reminders and the daily joining note are all sent
              inside the WhatsApp community — for VIP and standard places
              alike.{' '}
              <strong className="font-semibold text-white">
                Join it now, whichever you choose above.
              </strong>
            </>
          }
          footnote={
            HAS_INVITE
              ? 'Opens in WhatsApp · one tap to join'
              : undefined
          }
        >
          {/* A plain anchor rather than the thank-you page's JoinButton: that
              one carries the `data-join-cta` marker its docked bar watches, and
              this page's bar is watching the upgrade button instead. Tagged
              `data-ga-join` so the same JoinTracker listener counts it. */}
          {HAS_INVITE ? (
            <a
              href={CHECKOUT_CONFIG.whatsappCommunityUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-ga-join=""
              className="lego-press group inline-flex min-h-[54px] items-center justify-center gap-2.5 rounded-full px-8 text-[15px] font-bold"
              style={{ background: C.white, color: C.greenInk }}
            >
              <WhatsappLogo weight="fill" className="h-5 w-5" />
              Join the Community
              <ArrowRight
                weight="bold"
                className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
              />
            </a>
          ) : (
            /* Flat and non-clickable when NEXT_PUBLIC_WHATSAPP_COMMUNITY_URL
               is unset, so a missing invite is obvious in review rather than
               shipping as a dead button. */
            <span
              className="inline-flex min-h-[54px] cursor-default items-center justify-center gap-2.5 rounded-full px-8 text-[15px] font-bold"
              style={{ background: 'rgba(255,255,255,0.4)', color: '#FFFFFF' }}
            >
              <WhatsappLogo weight="fill" className="h-5 w-5" />
              Join the Community
            </span>
          )}
        </WhatsAppJoinPanel>
      </div>

      {/* Reserves the docked bar's height in normal flow. The TALL value,
          because the bar carries the decline row as well as the button. */}
      <div aria-hidden className="lg:hidden" style={{ height: MOBILE_CTA_BAR_SPACE_TALL }} />

      {/* ── docked CTA · mobile and tablet ───────────────────────────
          BOTH ROUTES, not just the upgrade. On a phone the price card is a
          long way down the page, so a bar offering only the upgrade left a
          reader who did not want it with nothing to tap and no visible way to
          their joining instructions — which is the drop-off this bar is meant
          to prevent, not cause.

          The decline sits in the row ABOVE the button rather than beside it.
          Two reasons: the primary stays in the easiest reach at the bottom of
          the screen, and a full-width row is the only shape that fits this
          label at 390px without truncating it to "Continue with my stand…". */}
      <MobileCtaBar
        watch="[data-oto-cta]"
        label="VIP pass"
        trailing={VIP.priceLabel}
        note={
          <>
            <ShieldCheck weight="fill" className="h-3 w-3 shrink-0" style={{ color: C.mintInk }} />
            Refunded after Day 1
          </>
        }
        above={
          <Link
            href={CHECKOUT_CONFIG.confirmedPath}
            className="lego-press group inline-flex min-h-[42px] w-full items-center justify-center gap-1.5 rounded-xl text-[13px] font-semibold"
            style={{
              background: C.paleBlue,
              border: `1px solid ${C.lineStrong}`,
              color: C.ink,
            }}
          >
            Continue with my standard seat
            <ArrowRight
              weight="bold"
              className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </Link>
        }
      >
        <button
          type="button"
          onClick={upgrade}
          disabled={busy}
          className="lego-press lego-pulse-glow group inline-flex min-h-[48px] shrink-0 items-center justify-center gap-2 rounded-full px-5 text-[14px] font-semibold text-white disabled:cursor-progress disabled:opacity-70"
          style={{ background: C.blueFill }}
        >
          {busy ? (
            'Opening…'
          ) : (
            <>
              {/* The price is already in the bar's trailing slot, so the narrow
                  label drops it rather than repeating it into a width that has
                  room for neither. */}
              <span className="min-[400px]:hidden">Upgrade</span>
              <span className="hidden min-[400px]:inline">Upgrade to VIP</span>
              <ArrowRight
                weight="bold"
                className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
              />
            </>
          )}
        </button>
      </MobileCtaBar>
    </main>
  );
}
