import Image from 'next/image';

import BrandMark from '@/components/BrandMark';

import { asset } from './asset-version';
import { HERO } from './copy';
import { Accented, BookCTA } from './shared';

export default function Hero() {
  return (
    <header className="px-5 pb-16 pt-6 sm:px-8 sm:pb-20 lg:pb-24">
      <div className="mx-auto flex max-w-[1120px] justify-center lg:justify-start">
        <BrandMark height={36} priority />
      </div>

      <div className="mx-auto mt-10 grid max-w-[1120px] items-center gap-12 sm:mt-14 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-16">
        <div className="text-center lg:text-left">
          <h1 className="font-heading text-[clamp(26px,2.2vw+14px,40px)] font-black leading-[1.18] text-ink">
            <Accented parts={HERO.headline} />
          </h1>
          <p className="mx-auto mt-6 max-w-[640px] text-[17px] font-semibold leading-relaxed text-ink sm:text-[18px] lg:mx-0">
            {HERO.subheadline}
          </p>
          <p className="mx-auto mt-4 max-w-[640px] text-[16px] leading-relaxed text-ink-soft lg:mx-0">
            {HERO.supporting}
          </p>
          <div id="hero-cta" className="mt-8 flex flex-col items-center lg:items-start">
            <BookCTA label={HERO.cta} />
            <p className="mt-3 text-[14px] font-medium text-ink-soft">{HERO.under}</p>
          </div>
        </div>

        <figure className="sm-portrait mx-auto w-full max-w-[300px] sm:max-w-[360px] lg:max-w-[420px]">
          <Image
            src={asset('/atul/atul-primary.jpg')}
            alt="Atul Mishra, Head Coach at SuperMe"
            width={900}
            height={1200}
            sizes="(min-width: 1024px) 420px, (min-width: 640px) 360px, 300px"
            className="block h-auto w-full rounded-2xl"
          />
        </figure>
      </div>
    </header>
  );
}
