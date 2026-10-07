'use client';

import { Play } from '@phosphor-icons/react';
import Image from 'next/image';
import { useState } from 'react';

import { MediaPlaceholder } from './shared';

export type VideoTestimonial = {
  /** /public path of the clip's still frame. */
  poster?: string;
  /** /public path or URL of the clip. */
  src?: string;
  name?: string;
  meta?: string;
};

/* A still until clicked: only the chosen card ever becomes a real <video>. */
export default function VideoCard({ item }: { item: VideoTestimonial }) {
  const [playing, setPlaying] = useState(false);

  if (!item.src || !item.poster) {
    return (
      <MediaPlaceholder
        ratio="9 / 16"
        label="Video testimonial: a client on camera, 9:16 portrait"
        className="w-full"
      />
    );
  }

  return (
    <figure className="w-full">
      <div className="relative w-full overflow-hidden rounded-xl bg-brand-light" style={{ aspectRatio: '9 / 16' }}>
        {playing ? (
          <video
            src={item.src}
            poster={item.poster}
            controls
            autoPlay
            playsInline
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            className="sm-video-poster absolute inset-0 h-full w-full"
            aria-label={item.name ? `Play ${item.name}'s video` : 'Play video testimonial'}
          >
            <Image src={item.poster} alt="" fill sizes="(min-width: 768px) 300px, 70vw" className="object-cover" />
            <span className="sm-play" aria-hidden>
              <Play weight="fill" />
            </span>
          </button>
        )}
      </div>
      {(item.name || item.meta) && (
        <figcaption className="mt-3 text-center">
          {item.name && <span className="block text-[15px] font-bold text-ink">{item.name}</span>}
          {item.meta && <span className="block text-[13px] text-ink-soft">{item.meta}</span>}
        </figcaption>
      )}
    </figure>
  );
}
