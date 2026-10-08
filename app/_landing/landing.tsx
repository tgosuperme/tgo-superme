import BelowFold from './below-fold';
import Hero from './hero';
import LeadModal from './lead-modal';
import StickyCta from './sticky-cta';

export default function Landing() {
  return (
    <main className="bg-white">
      <Hero />
      <BelowFold />
      <StickyCta />
      <LeadModal />
    </main>
  );
}
