import type { Metadata } from 'next';
import { Playfair_Display, Inter, Milonga } from 'next/font/google';
import localFont from 'next/font/local';
import { Suspense } from 'react';
import 'mdb-react-ui-kit/dist/css/mdb.min.css';
import './globals.css';
import { CartProvider } from '@/components/cart/CartProvider';
import AnnouncementBar from '@/components/AnnouncementBar';
import SiteBackdrop from '@/components/SiteBackdrop';
import SiteNavbar from '@/components/SiteNavbar';
import SiteFooter from '@/components/SiteFooter';
import RouteProgress from '@/components/RouteProgress';
import { getCategories } from '@/lib/woo';

const serif = Playfair_Display({
  weight: ['400', '500', '600', '700'],
  style: ['normal'],
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
});

const sans = Inter({
  weight: ['300', '400', '500', '600'],
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

// Picked 2026-09-29: Milonga for the wordmark logo.
const milonga = Milonga({
  weight: ['400'],
  subsets: ['latin'],
  variable: '--font-logo',
  display: 'swap',
});

// Picked 2026-09-29: Prata for all prices, card headings, and nav links.
// Self-hosted via next/font/local (not /google): the Google Fonts download
// is flaky on some networks, so the critical display font ships with the repo.
const prata = localFont({
  src: './fonts/prata-latin-400.woff2',
  variable: '--font-prata',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Indemos - Luxury Fragrances & Beauty',
    template: '%s - Indemos',
  },
  description:
    'Authentic designer perfumes, skincare, and cosmetics from trusted brands around the world - at competitive prices.',
};

// Bump on every shipped build so we can tell (via View Source) which build is live.
const BUILD_ID = '2026-09-30-acct-search';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const categories = await getCategories().catch(() => []);

  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css"
        />
      </head>
      <body className={`${sans.variable} ${serif.variable} ${milonga.variable} ${prata.variable}`} data-build={BUILD_ID}>
        <Suspense fallback={null}>
          <RouteProgress />
        </Suspense>
        <SiteBackdrop />
        <div className="site-content">
          <CartProvider>
            <AnnouncementBar />
            <SiteNavbar categories={categories} />
            <main>{children}</main>
            <SiteFooter categories={categories} />
          </CartProvider>
        </div>
      </body>
    </html>
  );
}
