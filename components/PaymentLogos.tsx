/**
 * Payment-method logo row. Inline SVGs (no external assets) so the row reads
 * as a polished brand strip instead of plain text labels.
 *
 * Each logo is rendered inside a small white tile with a soft border so they
 * line up cleanly regardless of intrinsic aspect ratio.
 *
 * WHICH marks appear is governed by INDIA_RAILS_LIVE — see the note above the
 * logo lists, and lib/payments.ts.
 */
import { INDIA_RAILS_LIVE } from '@/lib/payments';

type LogoProps = { className?: string };

function VisaLogo({ className }: LogoProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 22"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M28.4 1.4L24.6 20.6h-4.7L23.7 1.4h4.7zM48.7 13.8l2.5-6.9 1.4 6.9h-3.9zm5.3 6.8H58l-3.8-19.2h-4c-.9 0-1.7.5-2 1.4l-7.1 17.8h4.9l1-2.7h6l.5 2.7zM41.9 14.4c0-4.7-6.6-5-6.5-7.1 0-.6.6-1.3 2-1.5.7-.1 2.5-.2 4.7 1l.8-3.8c-1.1-.4-2.6-.9-4.5-.9-4.7 0-8 2.5-8 6.1 0 2.7 2.4 4.1 4.2 5 1.9.9 2.5 1.5 2.5 2.3 0 1.3-1.5 1.8-2.9 1.8-2.5 0-3.9-.7-5-1.2l-.9 3.9c1.2.5 3.4 1 5.7 1 5 0 8.2-2.5 8.2-6.3M21.8 1.4L14.2 20.6H9.3l-3.7-14.4C5.4 5.4 5.2 5.1 4.6 4.8 3.5 4.2 1.7 3.7 0 3.4l.1-.5h7.9c1 0 1.9.7 2.1 1.9l2 10.5L17 1.4h4.8z"
        fill="#1A1F71"
      />
    </svg>
  );
}

function MastercardLogo({ className }: LogoProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 30"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="18" cy="15" r="11" fill="#EB001B" />
      <circle cx="30" cy="15" r="11" fill="#F79E1B" />
      <path
        d="M24 7.5a10.97 10.97 0 010 15 10.97 10.97 0 010-15z"
        fill="#FF5F00"
      />
    </svg>
  );
}

function AmexLogo({ className }: LogoProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 56 22"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect width="56" height="22" rx="2" fill="#006FCF" />
      <text
        x="28"
        y="10"
        textAnchor="middle"
        fill="white"
        fontFamily="Arial Black, Arial, sans-serif"
        fontWeight="900"
        fontSize="5.6"
        letterSpacing="0.4"
      >
        AMERICAN
      </text>
      <text
        x="28"
        y="17"
        textAnchor="middle"
        fill="white"
        fontFamily="Arial Black, Arial, sans-serif"
        fontWeight="900"
        fontSize="5.6"
        letterSpacing="0.4"
      >
        EXPRESS
      </text>
    </svg>
  );
}



function MaestroLogo({ className }: LogoProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 30"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="18" cy="15" r="11" fill="#0099DF" />
      <circle cx="30" cy="15" r="11" fill="#ED1C2E" />
      <path
        d="M24 7.5a10.97 10.97 0 010 15 10.97 10.97 0 010-15z"
        fill="#7375CF"
      />
    </svg>
  );
}

/**
 * RuPay and UPI, as WORDMARKS rather than reproductions.
 *
 * Both real marks are owned by NPCI and their use is governed by a brand
 * licence tied to being a live acquirer or merchant on the network. Neither is
 * traced here: RuPay's is its two-tone lettering in the network's orange and
 * green, UPI's its own orange-and-green wordmark, and both are set in the
 * page's own type rather than the licensed logotype.
 *
 * That is deliberate, and it survives the account question either way. Once
 * NPCI's brand assets are available under the merchant licence, swap these two
 * for the supplied SVGs — the surrounding tile, sizing and gating all stay as
 * they are, so it is a two-function change.
 */
function RuPayLogo({ className }: LogoProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 72 22"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <text
        x="0"
        y="17"
        fontFamily="Inter, system-ui, sans-serif"
        fontSize="18"
        fontWeight="700"
        fill="#097A3D"
      >
        Ru
      </text>
      <text
        x="26"
        y="17"
        fontFamily="Inter, system-ui, sans-serif"
        fontSize="18"
        fontWeight="700"
        fill="#F26F21"
      >
        Pay
      </text>
    </svg>
  );
}

function UpiLogo({ className }: LogoProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 60 22"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <text
        x="0"
        y="17"
        fontFamily="Inter, system-ui, sans-serif"
        fontSize="17"
        fontWeight="800"
        letterSpacing="0.5"
        fill="#0B2B5B"
      >
        UPI
      </text>
      {/* The two chevrons that make the mark read as UPI rather than as three
          plain letters: orange over green, angled, to its right. */}
      <path d="M40 4l7 7-7 7" stroke="#F26F21" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M48 4l7 7-7 7" stroke="#097A3D" strokeWidth="3" strokeLinecap="round" fill="none" />
    </svg>
  );
}

type Brand = { id: string; label: string; Logo: (p: LogoProps) => JSX.Element; w: string };

// `compact` is the hero offer card, `full` the checkout strip.
//
// THE INDIAN MARKS ARE GATED, and this is the whole point of the gate. RuPay
// and UPI are what an Indian buyer looks for before they will start a payment
// at all — and they are also the two marks this checkout cannot honour unless
// the Stripe account behind it is registered to an Indian entity. Printing a
// UPI logo on a card-only checkout does not merely overstate: it recruits the
// buyer's intent and then strands it at the payment sheet, which is a worse
// outcome than never having shown the mark.
//
// So they render only when lib/payments.ts says the rails are live — and as of
// the client's decision they are NOT: the existing non-Indian Stripe account
// stays, with INR as a presentment currency, which takes cards and nothing
// else. The RuPay and UPI marks below are therefore dead code today, kept
// because the decision is explicitly revisitable and rebuilding them from
// scratch later is worse than leaving two functions unused.
/* EVERY WIDTH IS A LITERAL, in both rows, and that is not duplication for its
   own sake. Tailwind's JIT compiler finds classes by scanning source text for
   complete strings, so a width built at runtime — `w-${n + 1}` — is a class
   Tailwind never sees and never emits, and the tile silently collapses to its
   intrinsic size. The two rows differ by one step, and they are written out. */
const CARD_COMPACT: Brand[] = [
  { id: 'visa', label: 'Visa', Logo: VisaLogo, w: 'w-9' },
  { id: 'mc', label: 'Mastercard', Logo: MastercardLogo, w: 'w-7' },
  { id: 'amex', label: 'American Express', Logo: AmexLogo, w: 'w-9' },
  { id: 'maestro', label: 'Maestro', Logo: MaestroLogo, w: 'w-7' },
];

const CARD_FULL: Brand[] = [
  { id: 'visa', label: 'Visa', Logo: VisaLogo, w: 'w-10' },
  { id: 'mc', label: 'Mastercard', Logo: MastercardLogo, w: 'w-8' },
  { id: 'amex', label: 'American Express', Logo: AmexLogo, w: 'w-10' },
  { id: 'maestro', label: 'Maestro', Logo: MaestroLogo, w: 'w-8' },
];

const INDIA_COMPACT: Brand[] = [
  { id: 'upi', label: 'UPI', Logo: UpiLogo, w: 'w-9' },
  { id: 'rupay', label: 'RuPay', Logo: RuPayLogo, w: 'w-10' },
];

const INDIA_FULL: Brand[] = [
  { id: 'upi', label: 'UPI', Logo: UpiLogo, w: 'w-10' },
  { id: 'rupay', label: 'RuPay', Logo: RuPayLogo, w: 'w-11' },
];

/* India's marks LEAD when they are live: they are the ones this audience scans
   for, and a row that opens on Visa reads as an international checkout that
   may or may not take their money.

   Maestro drops out of the compact row once they are there — it is visually
   almost indistinguishable from Mastercard, and six tiles wrap an orphan onto
   its own line on a phone, which is what the compact row exists to avoid. */
const COMPACT_LOGOS: Brand[] = INDIA_RAILS_LIVE
  ? [...INDIA_COMPACT, ...CARD_COMPACT.filter((b) => b.id !== 'maestro')]
  : CARD_COMPACT;

const FULL_LOGOS: Brand[] = INDIA_RAILS_LIVE
  ? [...INDIA_FULL, ...CARD_FULL]
  : CARD_FULL;

type PaymentLogosProps = {
  /** Visual density. `compact` is used inside the hero offer card; `full` for checkout. */
  size?: 'compact' | 'full';
  /** Optional className applied to the outer wrapper. */
  className?: string;
};

export default function PaymentLogos({ size = 'full', className }: PaymentLogosProps) {
  const isCompact = size === 'compact';
  const logos = isCompact ? COMPACT_LOGOS : FULL_LOGOS;
  return (
    <div
      role="list"
      aria-label="Accepted payment methods"
      className={[
        'flex flex-wrap items-center justify-center',
        isCompact ? 'gap-1' : 'gap-1.5 sm:gap-2',
        className ?? '',
      ].join(' ')}
    >
      {logos.map(({ id, label, Logo, w }) => (
        <div
          key={id}
          role="listitem"
          aria-label={label}
          className={[
            'inline-flex items-center justify-center rounded-md border border-line bg-white shadow-soft',
            isCompact ? 'h-5 px-1' : 'h-7 px-1.5 sm:h-8 sm:px-2',
          ].join(' ')}
        >
          <Logo className={[w, isCompact ? 'max-h-3.5' : 'max-h-4 sm:max-h-5'].join(' ')} />
        </div>
      ))}
    </div>
  );
}
