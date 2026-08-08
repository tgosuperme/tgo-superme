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
          DEFAULT: '#4FA8C7',
          deep: '#268CB3',
          sky: '#8CCFE3',
          light: '#E8F6FB',
          pale: '#F5FBFE',
          navy: '#183B56',
        },
        /* Accents. Small elements only: badges, pills, icon beds, stat glyphs. */
        mint: { DEFAULT: '#9FDACB', ink: '#32836E' },
        green: { DEFAULT: '#72B77A', ink: '#43844B' },
        coral: { DEFAULT: '#E98B7A', ink: '#D73F24' },
        peach: { DEFAULT: '#F4B28C', ink: '#C45313' },
        yellow: { DEFAULT: '#F2C85B', ink: '#966F0C' },
        lavender: { DEFAULT: '#A99ACB', ink: '#806AB2' },
        rose: { DEFAULT: '#D36C7E', ink: '#C94B61' },
        ink: { DEFAULT: '#183B56', soft: '#526B7A', muted: '#526B7A' },
        line: { DEFAULT: '#DEEFF4', strong: '#C5E2EA' },
      },
      fontFamily: {
        heading: ['var(--font-heading)', 'Georgia', 'serif'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
        editorial: ['var(--font-heading)', 'Georgia', 'serif'],
      },
      borderRadius: { pill: '999px' },
      boxShadow: {
        soft: '0 4px 24px -8px rgba(24, 59, 86, 0.10)',
        card: '0 12px 40px -16px rgba(24, 59, 86, 0.14)',
        glow: '0 14px 30px -12px rgba(38, 140, 179, 0.55)',
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
