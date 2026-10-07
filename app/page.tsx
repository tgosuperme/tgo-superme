import FunnelTracker from '@/components/FunnelTracker';
import SiteFooter from '@/components/SiteFooter';

import Landing from './_landing/landing';

export default function Page() {
  return (
    <>
      <FunnelTracker />
      <Landing />
      <SiteFooter />
    </>
  );
}
