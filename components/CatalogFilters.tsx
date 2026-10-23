'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
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

interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

/**
 * Multiselect dropdown filter. Selections are STAGED locally while the
 * panel is open and committed via onApply only on Done; closing any
 * other way (outside click, Escape, the toggle button) discards them.
 * Opening re-stages from the applied selection, and Done clears the
 * search box.
 */
function FilterDropdown({
  name,
  options,
  appliedValues,
  onApply,
}: {
  name: string;
  options: FilterOption[];
  appliedValues: string[];
  onApply: (values: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [staged, setStaged] = useState<string[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);

  const appliedOptions = options.filter((o) => appliedValues.includes(o.value));

  const openPanel = () => {
    setStaged(appliedValues);
    setQuery('');
    setOpen(true);
  };
  const closePanel = () => {
    setOpen(false);
    setQuery('');
  };

  // Outside click / Escape close WITHOUT applying the staged selection.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) closePanel();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePanel();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open ]);

  const applyStaged = () => {
    onApply(staged);
    setQuery('');
    setOpen(false);
  };

  const toggleStaged = (value: string) =>
    setStaged((prev) =>
      prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value]
    );

  const q = query.trim().toLowerCase();
  const visible = options
    .filter((o) => !q || o.label.toLowerCase().includes(q))
    // Staged selections pin to the top so chosen options stay reachable.
    .sort((a, b) => Number(staged.includes(b.value)) - Number(staged.includes(a.value)));

  const summary =
    appliedOptions.length === 0
      ? `All ${name.toLowerCase()}`
      : appliedOptions.length <= 2
        ? appliedOptions.map((o) => o.label).join(', ')
        : `${appliedOptions[0].label}, +${appliedOptions.length - 1} more`;

  return (
    <div className={styles.ddWrap} ref={wrapRef}>
      <button
        type="button"
        className={styles.ddBtn}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => (open ? closePanel() : openPanel())}>
        <span className={styles.ddBtnText}>{summary}</span>
        <MDBIcon fas icon={open ? 'chevron-up' : 'chevron-down'} className={styles.ddChevron} />
      </button>
      {open && (
        <div className={styles.ddPanel}>
          {options.length > 8 && (
            <input
              type="text"
              className={styles.ddSearch}
              placeholder={`Search ${name.toLowerCase()}…`}
              aria-label={`Search ${name}`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          )}
          <div className={styles.ddList}>
            {visible.map((o) => (
              <label className={styles.check} key={o.value}>
                <input
                  type="checkbox"
                  checked={staged.includes(o.value)}
                  onChange={() => toggleStaged(o.value)}
                />
                <span className={styles.checkLabel}>{o.label}</span>
                {o.count !== undefined && <span className={styles.checkCount}>{o.count}</span>}
              </label>
            ))}
            {visible.length === 0 && <p className={styles.ddEmpty}>No matches for “{query}”.</p>}
          </div>
          <div className={styles.ddFoot}>
            <button type="button" className={styles.ddDone} onClick={applyStaged}>
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Attribute group backed by one comma-separated URL param of term slugs. */
function AttributeDropdown({
  attr,
  params,
  router,
}: {
  attr: CatalogAttribute;
  params: Record<string, string>;
  router: Router;
}) {
  return (
    <FilterDropdown
      name={attr.name}
      options={attr.terms.map((t) => ({ value: t.slug, label: t.name, count: t.count }))}
      appliedValues={(params[attr.taxonomy] ?? '').split(',').filter(Boolean)}
      onApply={(values) =>
        pushUrl(router, params, {
          [attr.taxonomy]: values.length ? values.join(',') : undefined,
        })
      }
    />
  );
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

  // The category param may hold IDs, slugs, or a mix (inbound links use
  // slugs; this sidebar writes IDs). Toggling must work in every form:
  // unchecking strips both the ID and the slug spelling of the category,
  // checking appends the ID. A naive ID-only toggle could never
  // uncheck a slug-valued selection.
  const onToggleCat = (cat: StoreCategory) => {
    const entries = (params.category ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const next = selectedCategoryIds.includes(cat.id)
      ? entries.filter(
          (e) => e !== String(cat.id) && e.toLowerCase() !== cat.slug.toLowerCase()
        )
      : [...entries, String(cat.id)];
    pushUrl(router, params, { category: next.length ? next.join(',') : undefined });
  };

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
              <input type="checkbox" checked={checked} onChange={() => onToggleCat(n.cat)} />
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
          <h3 className={styles.groupTitle}>Category</h3>
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
            <AttributeDropdown attr={attr} params={params} router={router} />
          </div>
        ))}

        <div className={styles.group}>
          <h3 className={styles.groupTitle}>Availability</h3>
          <FilterDropdown
            name="Availability"
            options={[
              { value: 'in_stock', label: 'In stock' },
              { value: 'on_sale', label: 'On sale' },
            ]}
            appliedValues={[
              ...(inStock ? ['in_stock'] : []),
              ...(onSale ? ['on_sale'] : []),
            ]}
            onApply={(values) =>
              pushUrl(router, params, {
                in_stock: values.includes('in_stock') ? '1' : undefined,
                on_sale: values.includes('on_sale') ? '1' : undefined,
              })
            }
          />
        </div>
      </div>
    </aside>
  );
}
