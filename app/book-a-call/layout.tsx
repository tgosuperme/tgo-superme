import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Book Your Free Pain Assessment Call | SuperMe',
  description: 'Choose a time for your free 30-minute call with the SuperMe team.',
  robots: { index: false, follow: false },
};

export default function BookLayout({ children }: { children: React.ReactNode }) {
  return children;
}
