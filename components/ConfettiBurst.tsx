'use client';

import { useEffect, useRef } from 'react';

import { C } from '@/app/_landing/shared';

/**
 * The confirmation-page celebration: a confetti burst on arrival.
 *
 * Hand-rolled on a canvas rather than pulling in canvas-confetti. The whole
 * effect is ~120 lines, it needs no runtime dependency on a page whose job is
 * to load fast after a payment, and it lets the palette come from `C` so the
 * colours cannot drift from the brand when the palette changes.
 *
 * ── THE PALETTE ─────────────────────────────────────────────────────────────
 * Weighted, not uniform. The system's rule is roughly 70-80% white/pale blue,
 * 15-20% blue, 5-10% accent, and confetti is the one place a burst of accent
 * is earned — but it still reads as SuperMe rather than as a party-shop
 * default, so the blues carry it and the accents sparkle on top.
 *
 * Coral and rose are deliberately ABSENT. In this system they are the error
 * tones (coralBed carries every failed-validation message on the checkout),
 * and celebrating in the colour of an error is the kind of thing nobody can
 * name but everybody feels.
 *
 * ── ACCESSIBILITY ───────────────────────────────────────────────────────────
 * Renders nothing at all under `prefers-reduced-motion: reduce`. A full-screen
 * particle storm is exactly what that setting exists to prevent, and the page
 * says "Confirmed" perfectly well without it.
 *
 * The canvas is inert: aria-hidden, pointer-events-none, and it removes itself
 * from the paint loop once the last particle has fallen out of frame.
 */

/* Weighted by repetition — the brand blues appear more often than the accents. */
const COLORS = [
  C.blue, C.blue, C.blue,
  C.sky, C.sky, C.sky,
  C.navy,
  C.mint, C.mint,
  C.green, C.green,
  C.yellow,
  C.lavender,
  C.peach,
];

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  color: string;
  round: boolean;
  rot: number;
  vrot: number;
  life: number;
  ttl: number;
};

const GRAVITY = 0.22;
const DRAG = 0.994;

function burst(
  list: Particle[],
  originX: number,
  originY: number,
  count: number,
  /** Radians. Where the cannon points. */
  angle: number,
  spread: number,
  power: number,
) {
  for (let i = 0; i < count; i += 1) {
    const a = angle + (Math.random() - 0.5) * spread;
    const speed = power * (0.55 + Math.random() * 0.75);
    const round = Math.random() < 0.35;
    const size = 5 + Math.random() * 5;
    list.push({
      x: originX,
      y: originY,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      w: size,
      /* Rectangles are taller than wide, so the spin reads as a tumbling
         paper strip rather than a rotating square. */
      h: round ? size : size * (1.3 + Math.random() * 0.7),
      color: COLORS[(Math.random() * COLORS.length) | 0],
      round,
      rot: Math.random() * Math.PI * 2,
      vrot: (Math.random() - 0.5) * 0.28,
      life: 0,
      ttl: 190 + Math.random() * 90,
    });
  }
}

export default function ConfettiBurst() {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    /* Checked in the effect, not at render, so the server and the first client
       render agree and there is no hydration mismatch. */
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    function size() {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas!.width = width * dpr;
      canvas!.height = height * dpr;
      canvas!.style.width = `${width}px`;
      canvas!.style.height = `${height}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    size();
    window.addEventListener('resize', size);

    const particles: Particle[] = [];
    const UP = -Math.PI / 2;

    /* One centre burst, then the two side cannons a beat later, which is what
       stops it reading as a single symmetrical pop. */
    burst(particles, width / 2, height * 0.34, 90, UP, Math.PI * 1.1, 11);
    const t1 = window.setTimeout(() => {
      burst(particles, 0, height * 0.72, 55, UP + 0.55, Math.PI * 0.5, 15);
    }, 160);
    const t2 = window.setTimeout(() => {
      burst(particles, width, height * 0.72, 55, UP - 0.55, Math.PI * 0.5, 15);
    }, 300);

    let raf = 0;
    function frame() {
      ctx!.clearRect(0, 0, width, height);

      for (let i = particles.length - 1; i >= 0; i -= 1) {
        const p = particles[i];
        p.life += 1;
        p.vx *= DRAG;
        p.vy = p.vy * DRAG + GRAVITY;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vrot;

        /* Fade over the last third of the life, so nothing vanishes mid-air. */
        const fade = Math.max(0, Math.min(1, (p.ttl - p.life) / (p.ttl * 0.34)));
        if (p.life > p.ttl || p.y - p.h > height) {
          particles.splice(i, 1);
          continue;
        }

        ctx!.save();
        ctx!.globalAlpha = fade;
        ctx!.translate(p.x, p.y);
        ctx!.rotate(p.rot);
        ctx!.fillStyle = p.color;
        if (p.round) {
          ctx!.beginPath();
          ctx!.arc(0, 0, p.w / 2, 0, Math.PI * 2);
          ctx!.fill();
        } else {
          /* Squashed on the x axis as it spins, which fakes the paper turning
             edge-on far more cheaply than any 3D transform. */
          ctx!.scale(Math.abs(Math.cos(p.rot * 1.4)) * 0.7 + 0.3, 1);
          ctx!.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        }
        ctx!.restore();
      }

      /* The timed side cannons have not necessarily fired yet on the first few
         frames, so an empty list is only really empty after they have. */
      if (particles.length === 0 && performance.now() > startedAt + 700) {
        ctx!.clearRect(0, 0, width, height);
        return;
      }
      raf = window.requestAnimationFrame(frame);
    }

    const startedAt = performance.now();
    raf = window.requestAnimationFrame(frame);

    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener('resize', size);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[60]"
    />
  );
}
