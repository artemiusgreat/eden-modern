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
  'Fresh citrus for the office, nothing too sweet',
  'Roses and musk for a wedding',
  'Warm vanilla and oud for a date night',
  'A gift for my dad — classic woody, nothing fruity',
  'Something light and clean for summer days',
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
          <p className={styles.kicker}>Fragrance Finder</p>
          <h1 className={styles.title}>Describe your scent</h1>
          <p className={styles.sub}>
            Tell us the occasion or the scent you have in mind — “something fresh for the
            office”, “roses for a wedding” — and we will match you with perfumes from our
            collection of nearly three thousand fragrances.
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
              placeholder="e.g. warm vanilla for a date night, nothing too heavy"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              maxLength={300}
              aria-label="Describe the scent or occasion"
            />
            <MDBBtn type="submit" color="dark" className={styles.searchBtn} disabled={loading}>
              {loading ? <MDBSpinner size="sm" role="status" /> : 'Find my scent'}
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
                    Smart matching is busy right now — these are the closest scent matches.
                  </p>
                )}
              </div>
              <MDBRow>
                {results.map(({ product, reason }) => (
                  <MDBCol md="4" sm="6" className="mb-4" key={product.id}>
                    <ProductCard product={product} />
                    <p className={styles.reason}>{reason}</p>
                  </MDBCol>
                ))}
              </MDBRow>
            </>
          ) : (
            <div className={styles.empty}>
              <h2 className={styles.resultsTitle}>No close matches yet</h2>
              <p>
                Try describing the scent differently — a note you love (vanilla, rose, cedar),
                a mood (fresh, warm, clean), or the occasion. Or{' '}
                <Link href="/catalog?category=perfumes-colognes">browse all perfumes</Link>.
              </p>
            </div>
          )}
        </MDBContainer>
      )}
    </>
  );
}
