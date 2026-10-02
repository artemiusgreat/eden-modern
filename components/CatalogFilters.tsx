'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { MDBIcon } from 'mdb-react-ui-kit';
import { progressBegin } from '@/lib/progress';
import type { CatalogAttribute, StoreCategory } from '@/lib/woo';
import { decodeEntities } from '@/lib/woo';
import styles from './Catalog.module.css';

interface Props {
  params: Record<string, string>;
  categories: StoreCategory[];
  attributes: CatalogAttribute[];
  selectedCategoryIds: number[];
  minPrice: number | null;
  maxPrice: number | null;
  rating: number | null;
  onSale: boolean;
  inStock: boolean;
}

type Router = ReturnType<typeof useRouter>;

function pushUrl(router: Router, params: Record<string, string>, updates: Record<string, string | undefined>) {
  const p = new URLSearchParams(params);
  for (const [k, v] of Object.entries(updates)) {
    if (v === undefined || v === '') p.delete(k);
    else p.set(k, v);
  }
  p.delete('page'); // any filter change restarts at page 1
  const s = p.toString();
  progressBegin(); // checkboxes/radios navigate via router.push — no anchor click for RouteProgress to see
  router.push(s ? `/catalog?${s}` : '/catalog', { scroll: false });
}

function toggleList(current: string | undefined, value: string): string | undefined {
  const vals = (current ?? '').split(',').filter(Boolean);
  const i = vals.indexOf(value);
  if (i >= 0) vals.splice(i, 1);
  else vals.push(value);
  return vals.length ? vals.join(',') : undefined;
}

interface CatNode {
  cat: StoreCategory;
  children: CatNode[];
}

function buildTree(categories: StoreCategory[]): CatNode[] {
  const byParent = new Map<number, StoreCategory[]>();
  for (const c of categories) {
    const list = byParent.get(c.parent) ?? [];
    list.push(c);
    byParent.set(c.parent, list);
  }
  const build = (parent: number): CatNode[] =>
    (byParent.get(parent) ?? []).map((cat) => ({ cat, children: build(cat.id) }));
  return build(0);
}

const RATING_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: 'Any rating' },
  { value: 5, label: '5 stars' },
  { value: 4, label: '4 stars & up' },
  { value: 3, label: '3 stars & up' },
];

export default function CatalogFilters(props: Props) {
  const { params, attributes, selectedCategoryIds, rating, onSale, inStock } = props;
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const [minInput, setMinInput] = useState(props.minPrice !== null ? String(props.minPrice) : '');
  const [maxInput, setMaxInput] = useState(props.maxPrice !== null ? String(props.maxPrice) : '');
  useEffect(() => {
    setMinInput(props.minPrice !== null ? String(props.minPrice) : '');
    setMaxInput(props.maxPrice !== null ? String(props.maxPrice) : '');
  }, [props.minPrice, props.maxPrice]);

  const tree = buildTree(props.categories);

  // Subcategories start collapsed; ancestors of URL-selected categories auto-expand
  // so shared links like ?category=84 still reveal the checked child.
  const parentOf = new Map<number, number>(props.categories.map((c) => [c.id, c.parent]));
  const ancestorsOf = (ids: number[]): Set<number> => {
    const out = new Set<number>();
    for (const id of ids) {
      let p = parentOf.get(id);
      while (p && p !== 0) {
        out.add(p);
        p = parentOf.get(p);
      }
    }
    return out;
  };
  const [expanded, setExpanded] = useState<Set<number>>(() => ancestorsOf(selectedCategoryIds));
  const selectedKey = selectedCategoryIds.join(',');
  useEffect(() => {
    setExpanded((prev) => new Set([...prev, ...ancestorsOf(selectedCategoryIds)]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKey]);

  const toggleExpand = (id: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const onToggleCat = (id: number) =>
    pushUrl(router, params, { category: toggleList(params.category, String(id)) });

  // Tooltip for each category: its description when set in WP,
  // otherwise name + product count.
  const catTip = (c: StoreCategory): string => {
    const d = decodeEntities(c.description).trim();
    return d || `${c.name} - ${c.count} products`;
  };

  const renderCats = (nodes: CatNode[], depth: number): ReactNode =>
    nodes.map((n) => {
      const hasKids = n.children.length > 0;
      const isOpen = expanded.has(n.cat.id);
      const checked = selectedCategoryIds.includes(n.cat.id);
      return (
        <div key={n.cat.id} className={depth === 0 ? styles.catGroup : undefined}>
          <div
            className={depth === 0 ? `${styles.catBtn} ${checked ? styles.catBtnSelected : ''}` : styles.subRow}
            style={depth > 0 ? { paddingLeft: `${depth * 1}rem` } : undefined}>
            {hasKids ? (
              <button
                type="button"
                className={depth === 0 ? styles.catExpander : styles.subExpander}
                aria-expanded={isOpen}
                aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${n.cat.name} subcategories`}
                onClick={() => toggleExpand(n.cat.id)}>
                <MDBIcon fas icon={isOpen ? 'minus' : 'plus'} />
              </button>
            ) : (
              <span
                className={depth === 0 ? styles.catExpanderSpacer : styles.subExpanderSpacer}
                aria-hidden="true"
              />
            )}
            <label className={depth === 0 ? styles.catBtnLabel : styles.check} title={catTip(n.cat)}>
              <input type="checkbox" checked={checked} onChange={() => onToggleCat(n.cat.id)} />
              <span className={styles.checkLabel}>{n.cat.name}</span>
              <span className={styles.checkCount}>{n.cat.count}</span>
            </label>
          </div>
          {hasKids && isOpen && (
            <div className={depth === 0 ? styles.catKids : undefined}>{renderCats(n.children, depth + 1)}</div>
          )}
        </div>
      );
    });

  const applyPrice = () => {
    const clean = (s: string) => {
      const n = parseFloat(s);
      return s.trim() !== '' && Number.isFinite(n) && n >= 0 ? String(Math.round(n * 100) / 100) : undefined;
    };
    pushUrl(router, params, { min_price: clean(minInput), max_price: clean(maxInput) });
  };

  return (
    <aside className={styles.side}>
      <button
        type="button"
        className={styles.filtersToggle}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}>
        <MDBIcon fas icon="sliders" className="me-2" />
        Filters
        <MDBIcon fas icon={open ? 'chevron-up' : 'chevron-down'} className="ms-2" />
      </button>

      <div className={`${styles.sideBody} ${open ? styles.sideOpen : ''}`}>
        <div className={styles.group}>
          <h3 className={`${styles.groupTitle} text-uppercase`}>Category</h3>
          {renderCats(tree, 0)}
        </div>

        <div className={styles.group}>
          <h3 className={styles.groupTitle}>Price</h3>
          <div className={styles.priceRow}>
            <input
              type="number"
              min={0}
              step="any"
              placeholder="$ min"
              aria-label="Minimum price"
              value={minInput}
              onChange={(e) => setMinInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyPrice()}
            />
            <span className={styles.priceDash}>–</span>
            <input
              type="number"
              min={0}
              step="any"
              placeholder="$ max"
              aria-label="Maximum price"
              value={maxInput}
              onChange={(e) => setMaxInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyPrice()}
            />
          </div>
          <button type="button" className={styles.applyBtn} onClick={applyPrice}>
            Apply
          </button>
        </div>

        <div className={styles.group}>
          <h3 className={styles.groupTitle}>Rating</h3>
          {RATING_OPTIONS.map((o) => (
            <label className={styles.check} key={String(o.value)}>
              <input
                type="radio"
                name="catalog-rating"
                checked={rating === o.value}
                onChange={() =>
                  pushUrl(router, params, { rating: o.value === null ? undefined : String(o.value) })
                }
              />
              <span className={styles.checkLabel}>{o.label}</span>
            </label>
          ))}
        </div>

        {attributes.map((attr) => (
          <div className={styles.group} key={attr.taxonomy}>
            <h3 className={styles.groupTitle}>{attr.name}</h3>
            {attr.terms.map((t) => {
              const selected = (params[attr.taxonomy] ?? '').split(',').includes(t.slug);
              return (
                <label className={styles.check} key={t.id}>
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() =>
                      pushUrl(router, params, {
                        [attr.taxonomy]: toggleList(params[attr.taxonomy], t.slug),
                      })
                    }
                  />
                  <span className={styles.checkLabel}>{t.name}</span>
                  <span className={styles.checkCount}>{t.count}</span>
                </label>
              );
            })}
          </div>
        ))}

        <div className={styles.group}>
          <h3 className={styles.groupTitle}>Availability</h3>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={inStock}
              onChange={() => pushUrl(router, params, { in_stock: inStock ? undefined : '1' })}
            />
            <span className={styles.checkLabel}>In stock</span>
          </label>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={onSale}
              onChange={() => pushUrl(router, params, { on_sale: onSale ? undefined : '1' })}
            />
            <span className={styles.checkLabel}>On sale</span>
          </label>
        </div>
      </div>
    </aside>
  );
}
