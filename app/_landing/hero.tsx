import Image from 'next/image';

import BrandMark from '@/components/BrandMark';

import { asset } from './asset-version';
import { HERO } from './copy';
import { Accented, BookCTA } from './shared';

/* fitjam.in's hero: one centred column, the coach in a ringed circle, one CTA. */
export default function Hero() {
  return (
    <header className="px-5 pb-16 pt-6 text-center sm:px-8 sm:pb-20">
      <div className="flex justify-center">
        <BrandMark height={32} priority />
      </div>

      <div className="mx-auto mt-10 max-w-[920px] sm:mt-12">
        <h1 className="font-heading text-[clamp(26px,2.4vw+14px,42px)] font-black leading-[1.18] text-ink">
          <Accented parts={HERO.headline} />
        </h1>
        <p className="mx-auto mt-6 max-w-[760px] text-[17px] leading-relaxed text-ink sm:text-[18px]">
          {HERO.subheadline}
        </p>
        <p className="mx-auto mt-5 max-w-[760px] text-[16px] leading-relaxed text-ink-soft sm:text-[17px]">
          {HERO.supporting}
        </p>

        <div className="fj-ring mx-auto mt-10">
          <Image
            src={asset('/atul/atul-primary.jpg')}
            alt="Atul Mishra, Head Coach at SuperMe"
            width={520}
            height={520}
            priority
            sizes="260px"
            className="fj-ring-img"
          />
        </div>

        <div id="hero-cta" className="mt-10 flex flex-col items-center">
          <BookCTA label={HERO.cta} />
          <p className="mt-3 text-[14px] font-medium text-ink-soft">{HERO.under}</p>
        </div>
      </div>
    </header>
  );
}
