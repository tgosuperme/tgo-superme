import BelowFold from './below-fold';
import Hero from './hero';
import StickyCta from './sticky-cta';

export default function Landing() {
  return (
    <main className="bg-white">
      <Hero />
      <BelowFold />
      <StickyCta />
    </main>
  );
}
