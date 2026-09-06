/**
 * Delete Next's incremental build cache before every build.
 *
 * ── THE BUG THIS PREVENTS ───────────────────────────────────────────────────
 * This is the "page loads with no CSS, just raw stacked text" fault that kept
 * coming back on this project, locally and on the live site. It is not a stale
 * dev server and not a browser cache. It is the BUILD emitting HTML that
 * points at a stylesheet the same build never wrote.
 *
 * Reproduced here, twice:
 *
 *   with a warm .next/cache
 *     server/app/index.html  ->  /_next/static/css/2266c31bc24cf315.css
 *     static/css/            ->  ce1b39cd102f6eb0.css        ← 404 on load
 *
 *   after deleting .next/cache, same source
 *     server/app/index.html  ->  /_next/static/css/ce1b39cd102f6eb0.css
 *     static/css/            ->  ce1b39cd102f6eb0.css        ← agree
 *
 * The mechanism: Next restores a route's prerendered HTML from the incremental
 * cache when that route's own code has not changed. The restored HTML has the
 * CSS asset hash baked into it from whenever it was cached. Edit globals.css
 * and the CSS chunk gets a new hash, but the page's own payload is unchanged,
 * so the stale HTML is reused — and it references a file that no longer exists.
 * The browser 404s the stylesheet and renders the document bare.
 *
 * It is silent: the build succeeds, the route table looks right, and only the
 * page in a browser shows it. It hits the pages that change LEAST, which are
 * the legal pages and the thank-you pages — which is exactly where it kept
 * being noticed.
 *
 * ── WHY THIS RUNS ON THE SERVER TOO, NOT JUST LOCALLY ───────────────────────
 * Vercel restores .next/cache between deployments to speed builds up, which is
 * the same warm-cache condition reproduced above. npm runs `prebuild` ahead of
 * `build`, and Vercel's build step is `npm run build`, so this runs there as
 * well. That is deliberate: a fast build that ships an unstyled page is worth
 * less than a slow one that does not.
 *
 * ── THE COST ────────────────────────────────────────────────────────────────
 * Every build is a cold build. On this site that is roughly a minute. The
 * alternative is a class of failure that produces no error anywhere, reaches
 * production, and is only found by a human opening the page.
 *
 * Deletes only the CACHE, never the build output, so it is safe to run at any
 * time — including when there is no build yet.
 */

import { rm } from 'node:fs/promises';
import { join } from 'node:path';

/* Honours NEXT_DIST_DIR for the same reason next.config.js does: `next dev`
   and `next build` share a dist directory and clobber each other's assets, so
   builds run against a separate one while a dev server is up. */
const distDir = process.env.NEXT_DIST_DIR || '.next';
const cacheDir = join(process.cwd(), distDir, 'cache');

await rm(cacheDir, { recursive: true, force: true });
console.log(`[prebuild] cleared ${distDir}/cache — prerendered HTML will be regenerated against this build's asset hashes`);
