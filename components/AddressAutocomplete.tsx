'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './AddressAutocomplete.module.css';

/** Parsed address from a Google Places selection, mapped to checkout fields. */
export interface ParsedAddress {
  street: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
}

interface Props {
  id: string;
  onSelect: (addr: ParsedAddress) => void;
}

interface Suggestion {
  placeId: string;
  mainText: string;
  secondaryText: string;
}

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_PLACES_KEY ?? '';
const DEBOUNCE_MS = 300;

type AddressComponent = {
  longText?: string;
  shortText?: string;
  types?: string[];
};

/** Map Google address_components to checkout fields. */
function parseComponents(components: AddressComponent[]): ParsedAddress {
  const get = (type: string) => components.find((c) => c.types?.includes(type));
  const streetNumber = get('street_number')?.longText ?? '';
  const route = get('route')?.longText ?? '';
  const city =
    get('locality')?.longText ??
    get('sublocality')?.longText ??
    get('administrative_area_level_3')?.longText ??
    '';
  // shortText for state/country gives ISO codes ("NJ", "US") matching the
  // checkout's country <select> values.
  const state = get('administrative_area_level_1')?.shortText ?? '';
  const postcode = get('postal_code')?.longText ?? '';
  const country = get('country')?.shortText ?? '';
  const street = [streetNumber, route].filter(Boolean).join(' ');
  return { street, city, state, postcode, country };
}

export default function AddressAutocomplete({ id, onSelect }: Props) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [failed, setFailed] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close on outside click.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const fetchSuggestions = useCallback(async (input: string) => {
    if (!API_KEY || input.trim().length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': API_KEY,
        },
        body: JSON.stringify({
          input,
          includedPrimaryTypes: ['street_address', 'premise', 'subpremise'],
        }),
      });
      if (!res.ok) throw new Error('places api error');
      const data = (await res.json()) as {
        suggestions?: Array<{
          placePrediction?: {
            placeId?: string;
            structuredFormat?: {
              mainText?: { text?: string };
              secondaryText?: { text?: string };
            };
          };
        }>;
      };
      const list: Suggestion[] = (data.suggestions ?? [])
        .map((s) => ({
          placeId: s.placePrediction?.placeId ?? '',
          mainText: s.placePrediction?.structuredFormat?.mainText?.text ?? '',
          secondaryText: s.placePrediction?.structuredFormat?.secondaryText?.text ?? '',
        }))
        .filter((s) => s.placeId && s.mainText);
      setSuggestions(list);
      setOpen(list.length > 0);
      setActiveIndex(-1);
      setFailed(false);
    } catch {
      setSuggestions([]);
      setOpen(false);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const onChange = (value: string) => {
    setQuery(value);
    setFailed(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(value), DEBOUNCE_MS);
  };

  const select = useCallback(
    async (s: Suggestion) => {
      setOpen(false);
      setQuery(s.mainText + (s.secondaryText ? `, ${s.secondaryText}` : ''));
      try {
        const res = await fetch(`https://places.googleapis.com/v1/places/${s.placeId}`, {
          headers: {
            'X-Goog-Api-Key': API_KEY,
            'X-Goog-FieldMask': 'addressComponents',
          },
        });
        if (!res.ok) throw new Error('place details error');
        const data = (await res.json()) as { addressComponents?: AddressComponent[] };
        onSelect(parseComponents(data.addressComponents ?? []));
      } catch {
        // Details fetch failed — leave the typed text; user fills manually.
      }
    },
    [onSelect]
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' && open) {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp' && open) {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter' && open && activeIndex >= 0 && suggestions[activeIndex]) {
      e.preventDefault();
      select(suggestions[activeIndex]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  if (!API_KEY) return null;

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <label htmlFor={id} className={styles.label}>
        Find your address
      </label>
      <input
        id={id}
        type="text"
        className={styles.input}
        placeholder="Start typing your street address…"
        autoComplete="off"
        value={query}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-listbox`}
        aria-activedescendant={activeIndex >= 0 ? `${id}-opt-${activeIndex}` : undefined}
      />
      {loading && <span className={styles.loading} aria-hidden="true" />}
      {open && (
        <ul id={`${id}-listbox`} role="listbox" className={styles.dropdown}>
          {suggestions.map((s, i) => (
            <li
              key={s.placeId}
              id={`${id}-opt-${i}`}
              role="option"
              aria-selected={i === activeIndex}
              className={`${styles.option}${i === activeIndex ? ` ${styles.active}` : ''}`}
              onMouseDown={(e) => {
                // mousedown (not click) so selection beats the blur/close.
                e.preventDefault();
                select(s);
              }}
              onMouseEnter={() => setActiveIndex(i)}>
              <span className={styles.main}>{s.mainText}</span>
              {s.secondaryText && <span className={styles.secondary}>{s.secondaryText}</span>}
            </li>
          ))}
        </ul>
      )}
      {failed && !open && (
        <p className={styles.hint}>Address lookup is unavailable - please fill the fields below.</p>
      )}
    </div>
  );
}
