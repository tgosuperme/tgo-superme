import Image from 'next/image';

/**
 * The SuperMe logo, one definition used by every page.
 *
 * Two assets, one lockup: the stacked two-tone wordmark ("super" over "me"),
 * and the butterfly symbol to its right. Both come from Brand Assets, copied
 * to /brand/ because the original folder name contains a space, which survives
 * a URL only as %20 and breaks the first time someone hand-writes the path.
 *
 * The wordmark already contains the name, which is why there is no "SuperMe"
 * in type beside it; the icon-square-plus-text header this replaced said the
 * name twice.
 *
 * Deliberately not a link. On the landing page it would point at itself, and
 * on checkout and thank-you a logo that navigates is an exit from a page the
 * buyer is meant to finish. Wrap it in a Link at the call site if that ever
 * changes.
 *
 * `onDark` renders the whole lockup solid white, because the navy half of the
 * wordmark is invisible on the navy footer. The filter sits on the WRAPPER so
 * the butterfly is carried with it: brightness(0) crushes every channel to
 * black, then invert flips it to white, so transparency is preserved and both
 * shapes stay exact.
 */

const WORDMARK_RATIO = 1075 / 1182; // intrinsic, so height alone drives layout
const SYMBOL_RATIO = 1508 / 1517;

/* The butterfly reads as a companion to the wordmark rather than a second
   logo competing with it, so it sits a little under full height and is
   optically centred against the two-line stack. */
const SYMBOL_SCALE = 0.74;

export default function BrandMark({
  height = 38,
  onDark = false,
  priority = false,
  symbol = true,
}: {
  height?: number;
  onDark?: boolean;
  priority?: boolean;
  /** Set false for a tight space where the wordmark alone is enough. */
  symbol?: boolean;
}) {
  const symbolHeight = Math.round(height * SYMBOL_SCALE);

  return (
    <span
      className="inline-flex items-center"
      style={{
        gap: Math.round(height * 0.28),
        filter: onDark ? 'brightness(0) invert(1)' : undefined,
      }}
    >
      <Image
        src="/brand/superme-icon.png"
        alt="SuperMe"
        width={Math.round(height * WORDMARK_RATIO)}
        height={height}
        priority={priority}
        style={{ height, width: 'auto' }}
      />
      {symbol && (
        <Image
          src="/brand/superme-butterfly.png"
          /* Decorative: the wordmark beside it already carries the name, and a
             screen reader announcing "SuperMe SuperMe" helps nobody. */
          alt=""
          aria-hidden
          width={Math.round(symbolHeight * SYMBOL_RATIO)}
          height={symbolHeight}
          priority={priority}
          style={{ height: symbolHeight, width: 'auto' }}
        />
      )}
    </span>
  );
}
