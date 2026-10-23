import type { Metadata } from 'next';
import FragranceFinderView from '@/components/FragranceFinderView';

export const metadata: Metadata = {
  title: 'Product Finder',
  description:
    'Describe what you are looking for or the occasion — a wedding, the office, a gift — and we will match you with products from our collection.',
};

export default function FragranceFinderPage() {
  return <FragranceFinderView />;
}
