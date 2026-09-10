import type { Metadata } from 'next';

import LegalPage, { type LegalSection } from '../_landing/legal-page';

/**
 * /important-information · the medical and results notice.
 *
 * It used to be a full-width block near the bottom of the landing page. On a
 * phone that was several screens of small legal type between the FAQ and the
 * footer, at the point in the scroll where a reader is deciding — so it moved
 * here and the landing page carries one line and this link instead.
 *
 * THE TEXT IS UNCHANGED. It is the wording the UK compliance review was run
 * against, so it was moved verbatim and must not be re-voiced or shortened.
 * Moving it does not make it optional: the footer line that replaced it links
 * here from every page.
 */

export const metadata: Metadata = {
  title: 'Important information | SuperMe',
  description:
    'Important information about the 5-Day Pain Reset Challenge: what this service is, who teaches it, and what the results on our pages do and do not mean.',
};

const SECTIONS: LegalSection[] = [
  {
    heading: 'Before you start',
    paragraphs: [
      'SuperMe is a yoga and movement education service. It is not a medical service and is not a substitute for medical care. Nothing on this page is medical advice, a diagnosis, or a treatment plan.',
      'The 5-Day Pain Reset is designed to provide guided movement, breath work, mobility and strengthening education. It is not intended to diagnose, treat or manage a diagnosed medical condition.',
      'Atul Mishra is a yoga teacher with a postgraduate diploma in Yoga Education from Kaivalyadhama and an E-RYT 500 certification with Yoga Alliance. He is not a doctor, physiotherapist or registered clinician. The 5-Day Pain Reset is therefore not a replacement for physiotherapy or any medical care you are currently receiving.',
      'Please speak with your GP or clinician before starting, particularly if you are recovering from an acute injury or surgery, have not been cleared to exercise, or have been advised that movement is not appropriate for you. See your GP for persistent or severe pain.',
      'During any session, do not push through pain. If something hurts, stop the movement and tell the teacher.',
    ],
  },
  {
    heading: 'About the results you see on our pages',
    paragraphs: [
      'Any timelines or outcomes mentioned on our pages come from individual client case files and experiences. They are not typical results, predictive of what you will experience, or guaranteed. Your body, history, movement patterns and circumstances are different, so your experience may be different too.',
      'Results vary from person to person.',
    ],
  },
];

export default function ImportantInformationPage() {
  return (
    <LegalPage
      eyebrow="Please read"
      title="Important"
      titleAccent="Information"
      intro="What this service is, who teaches it, and what the results on our pages do and do not mean."
      updated="September 2026"
      sections={SECTIONS}
    />
  );
}
