import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import {
  ATTR_COOKIE,
  ATTR_TTL_SECONDS,
  mergeAttribution,
  parseAttributionFromUrl,
  readAttrCookie,
} from '@/lib/attribution-edge';

/* Edge copy of the attribution capture. The browser capture in MetaPixel loses
   in-app-browser visitors who navigate before hydration or whose storage is
   restricted; this one runs on the first request, before any JavaScript. Both
   write the same cookie in the same shape. */
export function middleware(req: NextRequest) {
  const res = NextResponse.next();

  try {
    const live = parseAttributionFromUrl(req.nextUrl.search);
    const stored = readAttrCookie(req.cookies.get(ATTR_COOKIE)?.value);

    const { attr, changed } = mergeAttribution(stored, {
      live,
      landingUrl: req.nextUrl.href,
      referrer: req.headers.get('referer') ?? '',
    });

    if (changed) {
      // Raw JSON: Next encodes once on the way out, encoding here would double-encode.
      res.cookies.set(ATTR_COOKIE, JSON.stringify(attr), {
        path: '/',
        maxAge: ATTR_TTL_SECONDS,
        sameSite: 'lax',
        httpOnly: false,
        secure: req.nextUrl.protocol === 'https:',
      });
    }
  } catch {
    /* never break a page render over attribution */
  }

  return res;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
