'use client';

import { ArrowRight } from '@phosphor-icons/react';
import Link from 'next/link';

import { OPEN_LEAD_EVENT } from '@/lib/lead';
import { BOOK_HREF } from '@/lib/site';

/* Opens the details pop-up; the plain link to booking still works if script fails. */
export default function BookCTA({ label, className = '' }: { label: string; className?: string }) {
  return (
    <Link
      href={BOOK_HREF}
      className={`sm-cta ${className}`}
      onClick={(e) => {
        e.preventDefault();
        window.dispatchEvent(new Event(OPEN_LEAD_EVENT));
      }}
    >
      <span>{label}</span>
      <ArrowRight weight="bold" aria-hidden className="sm-cta-arrow" />
    </Link>
  );
}
