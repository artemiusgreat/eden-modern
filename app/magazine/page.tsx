import { getPostsPaged } from '@/lib/woo';
import BlogIndexView from '@/components/BlogIndexView';

export const revalidate = 3600;

export const metadata = {
  title: 'Magazine',
  description: 'Fragrance stories, skincare rituals and beauty notes from Indemos.',
};

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1);
  const { posts, totalPages } = await getPostsPaged(12, page).catch(() => ({
    posts: [],
    totalPages: 1,
  }));
  return <BlogIndexView posts={posts} page={page} totalPages={totalPages} />;
}
