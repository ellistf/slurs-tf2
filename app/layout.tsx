import type { Metadata } from 'next';
import { Roboto } from 'next/font/google';

import '@/app/globals.css';

const bodyFont = Roboto({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-body'
});

export const metadata: Metadata = {
  title: 'Slurs.tf2',
  description: 'Live player lookup for flagged TF2 chat messages from logs.tf.'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={bodyFont.variable}>{children}</body>
    </html>
  );
}
