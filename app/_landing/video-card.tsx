'use client';

import { Play } from '@phosphor-icons/react';
import Image from 'next/image';
import { useState } from 'react';

import { asset } from './asset-version';

export type VideoTestimonial = {
  vimeoId: string;
  /** /public path of the clip's 9:16 still frame. */
  poster: string;
};

/* title/byline/portrait off strip the uploader chrome from the player. */
function vimeoSrc(id: string) {
  const p = new URLSearchParams({
    dnt: '1',
    title: '0',
    byline: '0',
    portrait: '0',
    badge: '0',
    playsinline: '1',
    autoplay: '1',
  });
  return `https://player.vimeo.com/video/${id}?${p.toString()}`;
}

/* A still until clicked: only the chosen card ever loads a Vimeo player. */
export default function VideoCard({ item }: { item: VideoTestimonial }) {
  const [playing, setPlaying] = useState(false);

  return (
    <div className="relative w-full overflow-hidden rounded-lg" style={{ aspectRatio: '9 / 16' }}>
      {playing ? (
        <iframe
          src={vimeoSrc(item.vimeoId)}
          title="Client video testimonial"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0"
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          className="sm-video-poster absolute inset-0 h-full w-full"
          aria-label="Play client video testimonial"
        >
          <Image
            src={asset(item.poster)}
            alt=""
            fill
            sizes="(min-width: 1024px) 240px, (min-width: 768px) 30vw, (min-width: 640px) 45vw, 360px"
            className="object-cover"
          />
          <span className="sm-play" aria-hidden>
            <Play weight="fill" />
          </span>
        </button>
      )}
    </div>
  );
}
