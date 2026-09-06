import type { Metadata } from 'next';

import LegalPage, { type LegalSection } from '../_landing/legal-page';

/**
 * /important-information
 *
 * The medical and results disclaimers, moved off the landing page.
 *
 * ── WHY IT MOVED, AND WHY NOT A WORD OF IT CHANGED ──────────────────────────
 * On the landing page this was a nine-paragraph block sitting between the FAQ
 * and the footer. On a phone that is most of a screen of small grey type in
 * the last position before the final CTA, and it pushed the CTA below the
 * point most readers stop.
 *
 * So the block moved here and the page carries a one-line summary linking to
 * it. What did NOT happen is any softening: this is the same copy, in full,
 * one tap away and linked from the footer of every page. Shortening a medical
 * disclaimer to make a sales page flow better is the version of this change
 * that would be indefensible, and the reason the wording below is byte-for-byte
 * what the compliance review saw.
 */

export const metadata: Metadata = {
  title: 'Important Information | SuperMe',
  description:
    'What the 5-Day Pain Reset is and is not, who teaches it, and what to check before you take part.',
  robots: { index: true, follow: true },
};

const SECTIONS: LegalSection[] = [
  {
    heading: 'This is education, not medical care',
    paragraphs: [
      'SuperMe is a yoga and movement education service. It is not a medical service and is not a substitute for medical care. Nothing on this page is medical advice, a diagnosis, or a treatment plan.',
      'The 5-Day Pain Reset is designed to provide guided movement, breath work, mobility and strengthening education. It is not intended to diagnose, treat or manage a diagnosed medical condition.',
    ],
  },
  {
    heading: 'Who teaches it',
    paragraphs: [
      'Atul Mishra is a yoga teacher with a postgraduate diploma in Yoga Education from Kaivalyadhama and an E-RYT 500 certification with Yoga Alliance. He is not a doctor, physiotherapist or registered clinician.',
      'The 5-Day Pain Reset is therefore not a replacement for physiotherapy or any medical care you are currently receiving.',
    ],
  },
  {
    heading: 'Before you start',
    paragraphs: [
      'Please speak with your doctor or physiotherapist before starting, particularly if you are recovering from an acute injury or surgery, have not been cleared to exercise, or have been advised that movement is not appropriate for you.',
      'During any session, do not push through pain. If something hurts, stop the movement and tell the teacher.',
    ],
  },
  {
    heading: 'About the results you see on our pages',
    paragraphs: [
      'Any timelines or outcomes mentioned on our pages come from individual client case files and experiences. They are not typical results, predictive of what you will experience, or guaranteed. Your body, history, movement patterns and circumstances are different, so your experience may be different too.',
    ],
  },
];

export default function ImportantInformationPage() {
  return (
    <LegalPage
      eyebrow="Important Information"
      title="What this is,"
      titleAccent="and what it is not"
      intro="Please read this before you take part. It is short, and it is the honest version rather than the reassuring one."
      updated="September 2026"
      sections={SECTIONS}
    />
  );
}
