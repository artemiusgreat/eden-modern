import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPostBySlug, getPosts } from '@/lib/woo';
import BlogPostView from '@/components/BlogPostView';

export const revalidate = 3600;

export async function generateStaticParams() {
  const posts = await getPosts(20).catch(() => []);
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await getPostBySlug(params.slug).catch(() => null);
  if (!post) return { title: 'Story not found' };
  return { title: post.title, description: post.excerpt.replace(/<[^>]+>/g, ' ').slice(0, 160) };
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const [post, more] = await Promise.all([
    getPostBySlug(params.slug).catch(() => null),
    getPosts(4).catch(() => []),
  ]);
  if (!post) notFound();
  const related = more.filter((p) => p.slug !== post.slug).slice(0, 3);
  return <BlogPostView post={post} related={related} />;
}
