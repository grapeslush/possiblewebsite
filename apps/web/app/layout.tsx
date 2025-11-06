import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Poppins } from 'next/font/google';

import './globals.css';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://possiblewebsite.local'),
  title: {
    default: 'Possible Website',
    template: '%s · Possible Website',
  },
  description:
    'A modern web experience powered by Next.js 14, shadcn/ui, and a production-ready full-stack marketplace toolkit.',
  keywords: [
    'Next.js 14',
    'TypeScript',
    'Tailwind CSS',
    'shadcn/ui',
    'marketplace starter',
    'design system',
  ],
  openGraph: {
    title: 'Possible Website',
    description:
      'Launch ambitious digital experiences with a fully typed, observable, and accessible marketplace starter.',
    url: 'https://possiblewebsite.local',
    siteName: 'Possible Website',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Possible Website',
    description:
      'Launch ambitious digital experiences with a fully typed, observable, and accessible marketplace starter.',
  },
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
};

export const viewport: Viewport = {
  themeColor: '#080808',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${poppins.variable} bg-neutral-950 font-sans text-neutral-100 antialiased`}>
        {children}
      </body>
    </html>
  );
}
