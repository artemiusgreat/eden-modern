import type { Metadata } from 'next';
import FragranceFinderView from '@/components/FragranceFinderView';

export const metadata: Metadata = {
  title: 'Fragrance Finder',
  description:
    'Describe the scent you want or the occasion — a wedding, the office, a date night — and we will match you with perfumes from our collection.',
};

export default function FragranceFinderPage() {
  return <FragranceFinderView />;
}
