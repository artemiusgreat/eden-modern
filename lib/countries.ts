/** Shared country list (ISO 3166-1 alpha-2 code → English name). */

export const COUNTRIES: [string, string][] = [
  ['US', 'United States'], ['CA', 'Canada'], ['GB', 'United Kingdom'], ['IE', 'Ireland'],
  ['AU', 'Australia'], ['NZ', 'New Zealand'], ['DE', 'Germany'], ['FR', 'France'],
  ['IT', 'Italy'], ['ES', 'Spain'], ['NL', 'Netherlands'], ['BE', 'Belgium'],
  ['CH', 'Switzerland'], ['AT', 'Austria'], ['SE', 'Sweden'], ['NO', 'Norway'],
  ['DK', 'Denmark'], ['FI', 'Finland'], ['PT', 'Portugal'], ['GR', 'Greece'],
  ['PL', 'Poland'], ['CZ', 'Czechia'], ['HU', 'Hungary'], ['RO', 'Romania'],
  ['IL', 'Israel'], ['AE', 'United Arab Emirates'], ['SA', 'Saudi Arabia'],
  ['IN', 'India'], ['SG', 'Singapore'], ['MY', 'Malaysia'], ['JP', 'Japan'],
  ['KR', 'South Korea'], ['ZA', 'South Africa'], ['BR', 'Brazil'], ['MX', 'Mexico'],
];

const NAME_TO_CODE = new Map(COUNTRIES.map(([code, name]) => [name.toLowerCase(), code]));

/**
 * Normalize a country to its ISO code for the WooCommerce API, which rejects
 * names ("United States" → 400). Already-a-code and unknown values pass
 * through untouched (Woo validates the rest).
 */
export function countryCode(input: string): string {
  const v = input.trim();
  if (/^[A-Za-z]{2}$/.test(v)) return v.toUpperCase();
  return NAME_TO_CODE.get(v.toLowerCase()) ?? v;
}
