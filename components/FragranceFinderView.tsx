'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MDBBtn, MDBCol, MDBContainer, MDBRow, MDBSpinner } from 'mdb-react-ui-kit';
import type { StoreProduct } from '@/lib/woo';
import ProductCard from './ProductCard';
import styles from './FragranceFinderView.module.css';

interface SearchResult {
  product: StoreProduct;
  reason: string;
}

const EXAMPLES = [
  'Fresh and light for the office, nothing too strong',
  'A gentle moisturizer for dry skin',
  'Roses and musk for a wedding',
  'A gift set for my dad — something classic',
  'Warm vanilla for a date night',
];

export default function FragranceFinderView() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [mode, setMode] = useState<string>('llm');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState('');

  async function runSearch(q: string) {
    const text = q.trim();
    if (text.length < 3 || loading) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/fragrance-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: text }),
      });
      const data = (await res.json()) as {
        mode?: string;
        results?: SearchResult[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || 'Search failed.');
      setResults(data.results ?? []);
      setMode(data.mode ?? 'llm');
      setSearched(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed — please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <section className={styles.banner}>
        <MDBContainer className={styles.bannerInner}>
          <p className={styles.kicker}>Product Finder</p>
          <h1 className={styles.title}>Describe what you’re looking for</h1>
          <p className={styles.sub}>
            Tell us what you have in mind — “something fresh for the office”, “a gentle
            cream for dry skin”, “a gift for a wedding” — and we will match you with
            products from our collection of nearly three thousand items.
          </p>
          <form
            className={styles.searchForm}
            onSubmit={(e) => {
              e.preventDefault();
              runSearch(query);
            }}
          >
            <input
              type="text"
              className={styles.searchInput}
              placeholder="e.g. something fresh for the office, or a gift for my wife"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              maxLength={300}
              aria-label="Describe what you are looking for"
            />
            <MDBBtn type="submit" color="dark" className={styles.searchBtn} disabled={loading}>
              {loading ? <MDBSpinner size="sm" role="status" /> : 'Find my match'}
            </MDBBtn>
          </form>
          <div className={styles.chips}>
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                className={styles.chip}
                onClick={() => {
                  setQuery(ex);
                  runSearch(ex);
                }}
              >
                {ex}
              </button>
            ))}
          </div>
          {loading && (
            <p className={styles.status}>Finding your matches — this can take a few seconds.</p>
          )}
          {error && <p className={styles.error}>{error}</p>}
        </MDBContainer>
      </section>

      {searched && !loading && (
        <MDBContainer className="py-5">
          {results.length > 0 ? (
            <>
              <div className={styles.resultsHead}>
                <h2 className={styles.resultsTitle}>Your matches</h2>
                {mode !== 'llm' && (
                  <p className={styles.modeNote}>
                    Smart matching is busy right now — these are the closest matches.
                  </p>
                )}
              </div>
              <MDBRow>
                {results.map(({ product, reason }) => (
                  <MDBCol md="4" sm="6" className="mb-4" key={product.id}>
                    <div className={styles.colWrap}>
                      <div className={styles.cardSlot}>
                        <ProductCard product={product} />
                      </div>
                      <p className={styles.reason}>{reason}</p>
                    </div>
                  </MDBCol>
                ))}
              </MDBRow>
            </>
          ) : (
            <div className={styles.empty}>
              <h2 className={styles.resultsTitle}>No close matches yet</h2>
              <p>
                Try describing it differently — a product you want (a cream, a spray, a gift
                set), an ingredient or scent you love, or the occasion. Or{' '}
                <Link href="/catalog">browse the catalog</Link>.
              </p>
            </div>
          )}
        </MDBContainer>
      )}
    </>
  );
}
