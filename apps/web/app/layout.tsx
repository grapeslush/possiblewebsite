import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Poppins } from 'next/font/google';

import './globals.css';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
});

export const metadata: Metadata = {
  title: 'Tackle Exchange',
  description:
    'Tackle Exchange is the trusted marketplace for buying and selling used fishing gear with escrow-backed protection.',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${poppins.variable} bg-white font-sans text-neutral-900`}>{children}</body>
    </html>
  );
}
