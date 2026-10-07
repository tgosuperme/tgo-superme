import Link from 'next/link';

import BrandMark from '@/components/BrandMark';
import { CONTACT_EMAIL, LEGAL_ENTITY, LEGAL_LINKS } from '@/lib/site';

const DISCLAIMER =
  "SuperMe provides movement and yoga education, not medical treatment, and is not a substitute for medical advice. This site is not part of or endorsed by Facebook. FACEBOOK is a trademark of Facebook, Inc. Results mentioned are not typical and depend on your effort, consistency and individual circumstances. This is not a guarantee of any specific outcome. Please consult your doctor before starting if you have a diagnosed condition or have been advised that movement isn't appropriate for you.";

export default function SiteFooter() {
  return (
    <footer className="border-t border-line bg-white px-5 py-12 text-center font-body">
      <div className="mx-auto max-w-[860px]">
        <div className="flex justify-center">
          <BrandMark height={30} />
        </div>
        <p className="mx-auto mt-6 max-w-[760px] text-[12.5px] leading-relaxed text-ink-soft">
          {DISCLAIMER}
        </p>
        <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px] font-medium">
          {LEGAL_LINKS.map(({ href, label }) => (
            <li key={href}>
              <Link href={href} className="text-brand hover:underline">
                {label}
              </Link>
            </li>
          ))}
          <li>
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-brand hover:underline">
              {CONTACT_EMAIL}
            </a>
          </li>
        </ul>
        <p className="mt-5 text-[12px] text-ink-soft">
          © {new Date().getFullYear()} {LEGAL_ENTITY}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
