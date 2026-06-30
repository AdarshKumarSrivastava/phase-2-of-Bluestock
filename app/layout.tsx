import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import './globals.css';

const outfit = Outfit({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Village Directory Search',
  description: 'Search for villages across India by name, sub-district, district, and state.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${outfit.className} bg-slate-50 text-slate-900 min-h-screen antialiased`}>
        {children}
      </body>
    </html>
  );
}
