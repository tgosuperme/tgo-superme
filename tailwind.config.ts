import type { Config } from 'tailwindcss';

/**
 * SuperMe · 5-Day Pain Reset.
 *
 * White and pale blue are the environment; the accents are the personality.
 * Roughly 70 to 80% white / pale blue, 15 to 20% blue, 5 to 10% accent, and
 * accents only ever land on individual elements, never on a large area.
 */
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#1054C2',  // primary blue: buttons, links, icons
          deep: '#002062',     // deep brand navy: dark sections, footer
          sky: '#2AAAEF',      // bright sky: highlights, selected states
          light: '#E8F3FC',    // pale blue: cards, pills, subtle surfaces
          pale: '#F4F9FE',     // very light blue: section backgrounds
          navy: '#002062',
        },
        /* Accents. Small elements only: badges, pills, icon beds, stat glyphs. */
        mint: { DEFAULT: '#2EC4B6', ink: '#1E8379', bed: '#E6F8F6' },
        green: { DEFAULT: '#22C55E', ink: '#178740', bed: '#E4F8EC' },
        coral: { DEFAULT: '#FF6B6B', ink: '#C15151', bed: '#FFEDED' },
        peach: { DEFAULT: '#FFB26D', ink: '#9B6C42', bed: '#FFF6ED' },
        yellow: { DEFAULT: '#FFC107', ink: '#967104', bed: '#FFF8E1' },
        lavender: { DEFAULT: '#8B7DFF', ink: '#7367D3', bed: '#F1EFFF' },
        rose: { DEFAULT: '#F43F5E', ink: '#D93853', bed: '#FEE8EC' },
        ink: { DEFAULT: '#002062', soft: '#4A5B80', muted: '#4A5B80' },
        line: { DEFAULT: '#DCE9F9', strong: '#C3DCF5' },
      },
      fontFamily: {
        /* All three resolve to Inter. The role names stay so the markup does
           not have to change, and so a second face could be reintroduced in
           one place if the brand ever grows one. */
        heading: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        body: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        editorial: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      borderRadius: { pill: '999px' },
      boxShadow: {
        soft: '0 4px 24px -8px rgba(0, 32, 98, 0.10)',
        card: '0 12px 40px -16px rgba(0, 32, 98, 0.14)',
        glow: '0 14px 30px -12px rgba(16, 84, 194, 0.45)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        float: 'float 3.6s ease-in-out infinite',
        marquee: 'marquee 28s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
