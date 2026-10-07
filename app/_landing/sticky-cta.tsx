'use client';

import { useEffect, useState } from 'react';

import { STICKY_CTA } from './copy';
import { BookCTA } from './shared';

/* Mobile only. Shows once the hero CTA has scrolled away, and goes for good
   once the final CTA is reached so it never sits over the footer. */
export default function StickyCta() {
  const [pastHero, setPastHero] = useState(false);
  const [atEnd, setAtEnd] = useState(false);

  useEffect(() => {
    const hero = document.getElementById('hero-cta');
    const end = document.getElementById('final-cta');
    if (!hero || !end || !('IntersectionObserver' in window)) return;

    const heroIo = new IntersectionObserver(([e]) => {
      setPastHero(!e.isIntersecting && e.boundingClientRect.top < 0);
    });
    const endIo = new IntersectionObserver(([e]) => {
      setAtEnd(e.isIntersecting || e.boundingClientRect.top < 0);
    });
    heroIo.observe(hero);
    endIo.observe(end);
    return () => {
      heroIo.disconnect();
      endIo.disconnect();
    };
  }, []);

  if (!pastHero || atEnd) return null;

  return (
    <div className="sm-dock fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur md:hidden">
      <BookCTA label={STICKY_CTA} className="w-full" />
    </div>
  );
}
