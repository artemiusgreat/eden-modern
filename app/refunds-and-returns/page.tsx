import { notFound } from 'next/navigation';
import { getWpPage } from '@/lib/woo';
import InfoPageView from '@/components/InfoPageView';

export const revalidate = 86400;

export async function generateMetadata() {
  const page = await getWpPage('refunds-and-returns').catch(() => null);
  return { title: page?.title ?? 'Refunds and Returns' };
}

export default async function RefundsPage() {
  const page = await getWpPage('refunds-and-returns').catch(() => null);
  if (!page) notFound();
  return <InfoPageView title={page.title} content={page.content} />;
}
