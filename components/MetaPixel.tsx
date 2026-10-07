'use client';

import Script from 'next/script';
import { useEffect } from 'react';

import { captureAttribution } from '@/lib/attribution';
import { captureFbclid } from '@/lib/client-signals';

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? '';

/* The browser pixel fires PageView only; every conversion goes through the
   Conversions API. The captures run above the PIXEL_ID guard so attribution
   does not go dark when the pixel id is unset. */
export default function MetaPixel() {
  useEffect(() => {
    captureFbclid();
    captureAttribution();
  }, []);

  if (!PIXEL_ID) return null;

  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">
        {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${PIXEL_ID}');fbq('track','PageView');`}
      </Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: 'none' }}
          alt=""
          src={`https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`}
        />
      </noscript>
    </>
  );
}
