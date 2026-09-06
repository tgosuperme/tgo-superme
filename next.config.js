/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  /**
   * ── WHY THE BUILD DIRECTORY IS CONFIGURABLE ───────────────────────────────
   * `next dev` and `next build` both write to `.next` by default, and they
   * overwrite each other's manifests. Run a build while a dev server is up and
   * the dev server keeps serving HTML that references asset hashes the build
   * has just replaced — the stylesheet 404s and every page renders as raw,
   * unstyled HTML until dev is restarted. Refreshing does not fix it, which is
   * what makes it look like a CSS bug rather than a tooling collision.
   *
   * That happened repeatedly on this project. Setting NEXT_DIST_DIR gives a
   * build its own directory so it cannot touch a running dev server:
   *
   *     npm run dev                              → .next
   *     NEXT_DIST_DIR=.next-build npm run build  → .next-build
   *
   * Vercel is unaffected: it builds into a clean checkout with no dev server,
   * so the variable is simply unset there and this resolves to `.next`.
   */
  distDir: process.env.NEXT_DIST_DIR || '.next',

  images: {
    // Prefer modern formats — smaller LCP/decode with identical visuals.
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    // Tree-shake the icon barrel so only the used glyphs ship.
    optimizePackageImports: ['@phosphor-icons/react'],
  },
};

module.exports = nextConfig;
