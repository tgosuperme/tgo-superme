/**
 * The lego system's style helpers.
 *
 * Deliberately in their OWN module with no 'use client' directive. They used
 * to live alongside the observer in ./lego.tsx, which broke the build: a plain
 * function exported from a 'use client' module arrives in a Server Component
 * as a client-reference proxy, not as a function, so calling it at render time
 * fails with "(0 , k.c6) is not a function" during prerender. The hero and the
 * thank-you page are both Server Components, so the helpers cannot live there.
 *
 * The runtime half — the observers that actually add `lego-in` — is in
 * ./lego.tsx and stays a client component.
 *
 * See app/globals.css for the keyframes these variables feed.
 */

/** Per-item stagger. Capped so a 12-item grid never waits a full second. */
export function legoDelay(index: number, step = 65, max = 8): React.CSSProperties {
  return { ['--lego-d' as string]: `${Math.min(index, max) * step}ms` };
}

/**
 * Stagger plus an alternating tilt. Bricks that all arrive dead level read as
 * a fade; a degree and a half of opposing rotation is what makes a row look
 * like separate pieces being placed rather than one block appearing.
 */
export function legoBrick(index: number, step = 65, max = 8): React.CSSProperties {
  return {
    ...legoDelay(index, step, max),
    ['--lego-tilt' as string]: index % 2 === 0 ? '-1.6deg' : '1.6deg',
  };
}
