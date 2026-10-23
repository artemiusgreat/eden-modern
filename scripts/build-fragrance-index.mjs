/**
 * Build the fragrance-finder search index.
 *
 *   node scripts/build-fragrance-index.mjs
 *
 * Inputs:
 *   data/fragrance/notes_index.json — scent notes extracted from product
 *     descriptions (offline prototype, ~/workspace/perfume-search).
 *   Live Woo Store API (WC_STORE_URL from .env.local) — catalog fields:
 *     slug, categories, stock, description.
 *
 * Output:
 *   data/fragrance/fragrance-index.json — one entry per fragrance product:
 *     { id, name, gender, families[], occasions[], intensity,
 *       notes[], vec } where vec is a base64 Float32Array (384 dims,
 *     bge-small-en-v1.5, mean-pooled, L2-normalized).
 *
 * Families/occasions are deterministic heuristics over the note list —
 * consistent vocabulary matters more than perfection here, because the
 * query parser (lib/fragrance.ts) maps visitor text onto the same tags.
 * Re-run when the catalog changes materially.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { pipeline } from '@huggingface/transformers';

// ---------- env ----------
const envLocal = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
const WC = (envLocal.match(/^WC_STORE_URL=(.+)$/m)?.[1] ?? '').trim().replace(/\/$/, '');
if (!WC) throw new Error('WC_STORE_URL not found in .env.local');

// ---------- note -> family map (lowercase note names) ----------
const FAMILY_NOTES = {
  citrus: ['bergamot', 'lemon', 'lime', 'orange', 'mandarin orange', 'mandarin', 'grapefruit', 'tangerine', 'yuzu', 'citron', 'blood orange', 'petitgrain', 'clementine', 'pomelo', 'bitter orange', 'sicilian lemon', 'calabrian bergamot', 'citrus'],
  floral: ['rose', 'jasmine', 'lily', 'freesia', 'violet', 'peony', 'orchid', 'tuberose', 'gardenia', 'magnolia', 'orange blossom', 'ylang-ylang', 'carnation', 'hyacinth', 'narcissus', 'lotus', 'mimosa', 'osmanthus', 'honeysuckle', 'cherry blossom', 'iris', 'neroli', 'geranium', 'lily of the valley', 'turkish rose', 'bulgarian rose', 'damask rose', 'may rose', 'sambac jasmine', 'jasmine sambac', 'frangipani', 'tiara flower', 'hibiscus', 'lilac', 'daffodil', 'tulip', 'sunflower', 'poppy', 'daisy', 'lavender blossom'],
  woody: ['sandalwood', 'cedar', 'cedarwood', 'virginia cedar', 'atlas cedar', 'vetiver', 'patchouli', 'oud', 'agarwood', 'guaiac wood', 'cypress', 'pine', 'birch', 'teak wood', 'ebony wood', 'cashmeran', 'papyrus', 'driftwood', 'rosewood', 'mahogany', 'oak', 'hinoki wood', 'palo santo'],
  oriental: ['amber', 'benzoin', 'labdanum', 'myrrh', 'frankincense', 'incense', 'olibanum', 'saffron', 'ambergris', 'grey amber', 'white amber', 'amberwood', 'styrax', 'tolu balsam', 'peru balsam', 'opoponax'],
  gourmand: ['vanilla', 'bourbon vanilla', 'madagascar vanilla', 'tahitian vanilla', 'caramel', 'tonka bean', 'chocolate', 'dark chocolate', 'cacao', 'coffee', 'honey', 'almond', 'praline', 'hazelnut', 'pistachio', 'brown sugar', 'sugar', 'cotton candy', 'marshmallow', 'whipped cream', 'cream', 'milk', 'coconut milk', 'toffee', 'maple', 'rum', 'whiskey', 'cognac', 'wine', 'champagne'],
  fruity: ['apple', 'pear', 'peach', 'plum', 'black currant', 'red currant', 'raspberry', 'strawberry', 'blackberry', 'cherry', 'sour cherry', 'fig', 'coconut', 'mango', 'pineapple', 'melon', 'watermelon', 'passionfruit', 'passion fruit', 'lychee', 'apricot', 'nectarine', 'pomegranate', 'kiwi', 'banana', 'red berries', 'wild berries', 'berries', 'quince', 'rhubarb', 'guava', 'papaya'],
  aquatic: ['sea salt', 'sea notes', 'marine notes', 'aquatic notes', 'water notes', 'ozonic notes', 'salt', 'seaweed', 'driftwood accord', 'water lily', 'lotus'],
  green: ['green tea', 'tea', 'black tea', 'fig leaf', 'violet leaf', 'green notes', 'grass', 'galbanum', 'oakmoss', 'moss', 'tomato leaf', 'eucalyptus', 'green apple', 'bamboo', 'ivy', 'leafy greens', 'matcha'],
  musky: ['musk', 'white musk', 'skin musk', 'ambrette', 'cotton flower', 'cashmere', 'suede musk'],
  spicy: ['cinnamon', 'clove', 'nutmeg', 'cardamom', 'black pepper', 'pepper', 'pink pepper', 'sichuan pepper', 'ginger', 'coriander seed', 'cumin', 'star anise', 'anise', 'bay leaf', 'pimento', 'chili', 'curry'],
  powdery: ['powdery notes', 'iris', 'orris', 'violet', 'mimosa', 'heliotrope', 'rice', 'talc'],
  aromatic: ['lavender', 'rosemary', 'sage', 'clary sage', 'thyme', 'mint', 'peppermint', 'spearmint', 'basil', 'juniper', 'juniper berries', 'artemisia', 'tarragon', 'shiso', 'angelica', 'laurel'],
  leather: ['leather', 'suede', 'tobacco', 'tobacco leaf', 'hay', 'birch tar', 'castoreum'],
};
const NOTE_FAMILY = new Map();
for (const [fam, notes] of Object.entries(FAMILY_NOTES)) {
  for (const n of notes) if (!NOTE_FAMILY.has(n)) NOTE_FAMILY.set(n, fam);
}
function familyOf(note) {
  const n = note.toLowerCase();
  if (NOTE_FAMILY.has(n)) return NOTE_FAMILY.get(n);
  if (n.includes('musk')) return 'musky';
  if (n.includes('amber')) return 'oriental';
  if (n.includes('wood') || n.includes('cedar') || n.includes('sandal')) return 'woody';
  if (n.includes('rose') || n.includes('jasmine') || n.includes('flower') || n.includes('blossom')) return 'floral';
  if (n.includes('vanilla') || n.includes('caramel') || n.includes('sugar') || n.includes('chocolate')) return 'gourmand';
  if (n.includes('pepper') || n.includes('spice')) return 'spicy';
  if (n.includes('leather') || n.includes('suede')) return 'leather';
  if (n.includes('tea') || n.includes('leaf') || n.includes('green')) return 'green';
  if (n.includes('sea') || n.includes('marine') || n.includes('water')) return 'aquatic';
  return null;
}

// occasion rules over the product's family set
const OCCASION_RULES = {
  office: ['citrus', 'green', 'aquatic', 'aromatic'],
  daytime: ['citrus', 'fruity', 'floral', 'green', 'aquatic'],
  evening: ['oriental', 'woody', 'leather', 'spicy', 'gourmand'],
  'date night': ['oriental', 'gourmand', 'musky', 'spicy', 'woody'],
  wedding: ['floral', 'powdery', 'musky'],
  summer: ['citrus', 'aquatic', 'fruity', 'green'],
  winter: ['oriental', 'gourmand', 'woody', 'spicy', 'leather'],
  sport: ['citrus', 'aquatic', 'aromatic', 'green'],
  gift: ['floral', 'fruity', 'citrus', 'musky'],
};
const HEAVY = new Set(['oud', 'agarwood', 'amber', 'patchouli', 'leather', 'tobacco', 'incense', 'frankincense', 'vanilla', 'tonka bean', 'benzoin', 'labdanum', 'saffron']);

function genderOf(name) {
  if (/unisex/i.test(name)) return 'unisex';
  if (/for women|\bwomen\b/i.test(name)) return 'women';
  if (/for men|\bmen\b/i.test(name)) return 'men';
  return 'any';
}

const stripHtml = (s) => (s ?? '').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();

// ---------- load notes index ----------
const notesIndex = JSON.parse(readFileSync(new URL('../data/fragrance/notes_index.json', import.meta.url), 'utf8'));
const notesById = new Map(notesIndex.map((p) => [p.id, p]));

// ---------- pull catalog ----------
const catalog = [];
for (let page = 1; ; page++) {
  const res = await fetch(`${WC}/wp-json/wc/store/v1/products?per_page=100&page=${page}`);
  if (!res.ok) throw new Error(`Store API page ${page}: HTTP ${res.status}`);
  const batch = await res.json();
  catalog.push(...batch);
  if (batch.length < 100) break;
}
console.log(`catalog: ${catalog.length} products`);

// ---------- build entries ----------
const entries = [];
let skipped = 0;
for (const p of catalog) {
  // Home fragrance and non-scent items carry notes in their prose but are
  // not wearable fragrance — they polluted results (candles topping
  // "smells like the sea" queries). Scented body products (lotions, gels,
  // deodorant sprays) stay: they are how the scent is worn.
  if (/\bcandle\b|diffuser|\bsoap\b|shampoo|supplement|magnesium/i.test(p.name)) { skipped++; continue; }
  const rec = notesById.get(p.id);
  const notes = rec?.notes ?? [];
  const catNames = (p.categories ?? []).map((c) => c.name.replace(/&amp;/g, '&'));
  const isFragranceCat = catNames.some((n) => /perfume|cologne|bath/i.test(n));
  if (!notes.length && !isFragranceCat) { skipped++; continue; }

  const famCount = new Map();
  for (const n of notes) {
    const f = familyOf(n);
    if (f) famCount.set(f, (famCount.get(f) ?? 0) + 1);
  }
  const families = [...famCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([f]) => f);
  const famSet = new Set(families);
  const occasions = Object.entries(OCCASION_RULES)
    .filter(([, fams]) => fams.some((f) => famSet.has(f)))
    .map(([occ]) => occ);
  const heavyHits = notes.filter((n) => HEAVY.has(n.toLowerCase())).length;
  const ratio = notes.length ? heavyHits / notes.length : 0;
  const intensity = ratio >= 0.34 ? 'strong' : ratio <= 0.1 && families.some((f) => ['citrus', 'aquatic', 'green'].includes(f)) ? 'light' : 'medium';

  entries.push({
    id: p.id,
    name: p.name.replace(/&amp;/g, '&'),
    gender: genderOf(p.name),
    families,
    occasions,
    intensity,
    notes,
    text: `${p.name}. ${notes.length ? `Scent notes: ${notes.join(', ')}. ` : ''}${stripHtml(p.description).slice(0, 600)}`,
  });
}
console.log(`index entries: ${entries.length} (skipped ${skipped} non-fragrance/noteless)`);

// ---------- embeddings ----------
const extractor = await pipeline('feature-extraction', 'Xenova/bge-small-en-v1.5');
const BATCH = 32;
for (let i = 0; i < entries.length; i += BATCH) {
  const slice = entries.slice(i, i + BATCH);
  const out = await extractor(slice.map((e) => e.text), { pooling: 'mean', normalize: true });
  const dim = out.dims[out.dims.length - 1];
  slice.forEach((e, j) => {
    const vec = out.data.slice(j * dim, (j + 1) * dim);
    e.vec = Buffer.from(new Float32Array(vec).buffer).toString('base64');
    delete e.text;
  });
  if (i % 640 === 0) console.log(`embedded ${Math.min(i + BATCH, entries.length)}/${entries.length}`);
}

const index = {
  version: 1,
  built_at: new Date().toISOString(),
  model: 'Xenova/bge-small-en-v1.5',
  dim: 384,
  count: entries.length,
  products: entries,
};
writeFileSync(new URL('../data/fragrance/fragrance-index.json', import.meta.url), JSON.stringify(index));
console.log(`wrote data/fragrance/fragrance-index.json (${entries.length} products)`);
