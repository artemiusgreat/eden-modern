import { getPosts } from '@/lib/woo';
import BlogIndexView from '@/components/BlogIndexView';

export const revalidate = 3600;

export const metadata = {
  title: 'Magazine',
  description: 'Fragrance stories, skincare rituals and beauty notes from Indemos.',
};

export default async function BlogPage() {
  const posts = await getPosts(12).catch(() => []);
  return <BlogIndexView posts={posts} />;
}
