import { getProducts, getCategories, getPosts } from '@/lib/woo';
import HomeView from '@/components/HomeView';

export const revalidate = 3600;

export default async function HomePage() {
  const [onSale, newest, categories, posts] = await Promise.all([
    getProducts({ on_sale: true, per_page: 4 }).catch(() => []),
    getProducts({ orderby: 'date', per_page: 8 }).catch(() => []),
    getCategories().catch(() => []),
    getPosts(3).catch(() => []),
  ]);

  const topCats = categories.filter((c) => c.parent === 0).slice(0, 6);
  return <HomeView onSale={onSale} newest={newest} topCats={topCats} posts={posts} />;
}
