import Image from 'next/image';

/**
 * The SuperMe logo, one definition used by every page.
 *
 * The asset is the stacked two-tone lockup (sky "super" over navy "me"), so it
 * already contains the wordmark. Pairing it with the word "SuperMe" in type
 * would say the name twice, which is why the icon-square-plus-text header it
 * replaces is gone rather than sitting beside it.
 *
 * Served from /brand/superme-icon.png, a copy of Brand Assets/1.png. The
 * original filename has a space in it, which survives a URL only as %20 and
 * breaks the first time someone hand-writes the path.
 *
 * Deliberately not a link. On the landing page it would point at itself, and
 * on checkout and thank-you a logo that navigates is an exit from a page the
 * buyer is meant to finish. Wrap it in a Link at the call site if that ever
 * changes.
 *
 * `onDark` renders the mark solid white, because the navy half of the logo is
 * invisible on the navy footer. brightness(0) crushes every channel to black
 * first, then invert flips it to white, so transparency is preserved and the
 * letterforms stay exact.
 */

const RATIO = 1075 / 1182; // intrinsic, so height alone drives the layout

export default function BrandMark({
  height = 38,
  onDark = false,
  priority = false,
}: {
  height?: number;
  onDark?: boolean;
  priority?: boolean;
}) {
  return (
    <Image
      src="/brand/superme-icon.png"
      alt="SuperMe"
      width={Math.round(height * RATIO)}
      height={height}
      priority={priority}
      style={{
        height,
        width: 'auto',
        filter: onDark ? 'brightness(0) invert(1)' : undefined,
      }}
    />
  );
}
