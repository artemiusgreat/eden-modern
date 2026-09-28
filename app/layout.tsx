import type { Metadata } from 'next';
import { Playfair_Display, Inter } from 'next/font/google';
import 'mdb-react-ui-kit/dist/css/mdb.min.css';
import './globals.css';
import { CartProvider } from '@/components/cart/CartProvider';
import AnnouncementBar from '@/components/AnnouncementBar';
import SiteNavbar from '@/components/SiteNavbar';
import SiteFooter from '@/components/SiteFooter';
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

export const metadata: Metadata = {
  title: {
    default: 'Indemos — Luxury Fragrances & Beauty',
    template: '%s — Indemos',
  },
  description:
    'Authentic designer perfumes, skincare, and cosmetics from trusted brands around the world — at competitive prices.',
};

// Bump on every shipped build so we can tell (via View Source) which build is live.
const BUILD_ID = '2026-09-28-r6-css-modules';

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
      <body className={`${sans.variable} ${serif.variable}`} data-build={BUILD_ID}>
        <CartProvider>
          <AnnouncementBar />
          <SiteNavbar categories={categories} />
          <main>{children}</main>
          <SiteFooter categories={categories} />
        </CartProvider>
      </body>
    </html>
  );
}
