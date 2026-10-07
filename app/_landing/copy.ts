/* Verbatim from SuperMe-Call-Booking-Page-Copy.md. Where a heading carries a
   blue accent phrase it is split into [before, accent, after]; the three parts
   join back to the exact line in the doc. */

export const MICROCOPY = 'Free 30-minute call · No obligation · Few spots left this week';

export const HERO = {
  headline: [
    "We Help People Who've Tried Everything for Their Back, Neck or Knee Pain ",
    "Finally Understand What's Actually Causing It",
    ', and Move Freely Again, Without Painkillers or Endless Therapy.',
  ] as const,
  subheadline:
    'Using the Inner Brace Method by SuperMe, the root-cause approach refined over 16 years, backed by 1,000+ people helped and 500+ coaches trained.',
  supporting:
    "A holistic approach built around finding the real source of your pain, supported movement that takes the load off the joint, and simple daily habits that make it last, so you can get out of bed without stiffness, sit and stand without bracing, and return to the things you've quietly stopped doing, without chasing temporary fixes or being told nothing can be done.",
  cta: 'Book Your Free Pain Assessment Call',
  under: MICROCOPY,
};

export const PROOF = {
  label: 'THE PROOF',
  heading: ['Real People. Real Relief. ', 'Lasting Results.', ''] as const,
  line: "These aren't athletes or fitness models. They're professionals, parents and people in their 40s and 50s who'd tried everything, scans, specialists, years of it, and finally understood their pain.",
  cta: 'Book Your Free Assessment Call',
};

export const VIDEOS = {
  heading: ["Don't Take ", 'Our Word', ' For It'] as const,
  sub: 'When the Approach Is Right, the Body Responds.',
  trust: ['1,000+ people.', ' The same method. Real, lasting relief.'],
  cta: 'Book Your Free Assessment Call',
};

export const TEAM = {
  heading: ['The Team Behind the ', 'Inner Brace Method', ''] as const,
  paragraphs: [
    'SuperMe was built on one frustrating truth its founders kept seeing: people with back, neck and knee pain were handed the same advice on repeat, stretch more, rest more, or push through it, and almost none of it held for long.',
    'Founded in Lausanne, Switzerland by Sriram Natarajan and Stephen, SuperMe was built to give people a way to understand and settle their pain at the source, not just quiet the symptom.',
    "At the centre of it is Atul Mishra, Head Coach at SuperMe: a postgraduate diploma from one of India's oldest yoga research institutes, 16+ years of teaching, over 1,000 people guided and 500+ coaches trained. Together they built the Inner Brace Method, a structured, root-cause approach that takes the load off the painful area, wakes up the deep support that's switched off, and retrains the body to move without forcing it.",
    "SuperMe isn't a clinic, and it isn't a quick fix. It's a method, a team, and a way of working that has helped people get back to the life their pain had quietly shrunk. On your call, this is the team that maps where your pain really comes from, and what to do about it.",
  ],
};

export const METHOD = {
  label: 'THE METHOD',
  heading: ['The ', 'Inner Brace', ' Method'] as const,
  phases: [
    {
      letter: 'U',
      name: 'Unload',
      body: "We take the pressure off the area that's doing too much, so it can stop guarding and start to settle.",
    },
    {
      letter: 'B',
      name: 'Brace',
      body: 'We wake up the deep support muscles that switched off, the ones meant to carry the load, using breath and supported movement.',
    },
    {
      letter: 'M',
      name: 'Move',
      body: 'We retrain everyday movement, sitting, standing, bending, walking, so the relief holds instead of fading by the evening.',
    },
  ],
  note: 'Three clear phases. Not stretches. Not a workout. A sequence built around what your body needs first.',
};

export const STEPS = {
  heading: ['Three Steps to ', 'Moving Freely Again', ''] as const,
  steps: [
    {
      n: '01',
      title: 'Pain Assessment & Personal Map',
      body: "We understand your pain, your history, and how you actually move, then map where it's really coming from.",
    },
    {
      n: '02',
      title: 'Guided Coaching & Real-Time Correction',
      body: 'You get supported movement, live correction, and a plan built around your body, with guidance the whole way.',
    },
    {
      n: '03',
      title: 'Make It Last',
      body: 'You learn how to keep the relief through work, travel and daily life, without slipping back into the start-stop cycle.',
    },
  ],
  cta: 'Book Your Free Assessment Call Now',
};

export const FIT = {
  heading: ["This Isn't Another Stretching Routine. ", "It's a Complete Root-Cause Approach.", ''] as const,
  yesLabel: 'This is for you if:',
  yes: [
    'Your back, neck, knee, arthritic or sciatica pain has lasted months or years',
    "You've already spent on physios, scans, specialists and it keeps coming back",
    "You've tried stretches, rest, massages and painkillers that work for a week and fade",
    'You\'re tired of being told "it\'s just age" and want to understand what\'s really going on',
    'You want a real, structured approach, not another quick tip',
    "You're ready to put in 25 minutes a day to finally move freely again",
  ],
  noLabel: 'This is NOT for you if:',
  no: [
    'You want the pain gone overnight',
    "You're not willing to follow a guided process",
    "You're looking for a one-off stretch or a miracle cure",
    "You're not ready to build habits that actually last",
  ],
  cta: 'Book Your Free Assessment Call Now',
  under: MICROCOPY,
};

export const STICKY_CTA = 'Book Your Free Assessment Call';
