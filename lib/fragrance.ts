/**
 * Fragrance finder — natural-language perfume search over a prebuilt index
 * (data/fragrance/fragrance-index.json, built by
 * scripts/build-fragrance-index.mjs: notes + family/occasion tags +
 * bge-small embeddings per product).
 *
 * Three tiers, degrading gracefully:
 *   1. LLM intent parse (OpenRouter free-model chain) — understands
 *      occasions, negations ("nothing too sweet") and recipients
 *      ("for my wife"). Ranked against notes/tags, blended with the
 *      query embedding.
 *   2. Embedding-only — cosine similarity of the raw query against the
 *      product vectors (local model, no API, no quota).
 *   3. Keyword — note-vocabulary overlap with the query text.
 * A tier is used only when the one above it is unavailable or fails;
 * the response reports which tier answered (`mode`).
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { env } from './env';

export interface FragranceIntent {
  liked_notes: string[];
  disliked_notes: string[];
  occasions: string[];
  families: string[];
  intensity: 'light' | 'medium' | 'strong' | 'any';
  gender: 'women' | 'men' | 'unisex' | 'any';
  free_terms: string[];
}

export interface FragranceHit {
  id: number;
  reason: string;
}

export type FragranceMode = 'llm' | 'embedding' | 'keyword';

interface IndexProduct {
  id: number;
  name: string;
  gender: string;
  families: string[];
  occasions: string[];
  intensity: string;
  notes: string[];
  notesLower: string[];
  vec: Float32Array;
}

const FAMILIES = [
  'citrus', 'floral', 'woody', 'oriental', 'gourmand', 'fruity', 'aquatic',
  'green', 'musky', 'spicy', 'powdery', 'aromatic', 'leather',
] as const;

// Generic query words -> families they imply.
const TERM_FAMILIES: Record<string, string[]> = {
  fresh: ['citrus', 'aquatic', 'green'],
  sweet: ['gourmand'],
  woody: ['woody'],
  floral: ['floral'],
  citrus: ['citrus'],
  citrusy: ['citrus'],
  musky: ['musky'],
  spicy: ['spicy'],
  fruity: ['fruity'],
  powdery: ['powdery'],
  green: ['green'],
  aquatic: ['aquatic'],
  marine: ['aquatic'],
  oriental: ['oriental'],
  leathery: ['leather'],
  herbal: ['aromatic', 'green'],
  aromatic: ['aromatic'],
  gourmand: ['gourmand'],
  vanilla: ['gourmand'],
  clean: ['citrus', 'aquatic', 'musky'],
};

// ---------- index ----------

let INDEX: IndexProduct[] | null = null;

function loadIndex(): IndexProduct[] {
  if (INDEX) return INDEX;
  const file = path.join(process.cwd(), 'data', 'fragrance', 'fragrance-index.json');
  const raw = JSON.parse(readFileSync(file, 'utf8')) as {
    dim: number;
    products: { id: number; name: string; gender: string; families: string[]; occasions: string[]; intensity: string; notes: string[]; vec: string }[];
  };
  INDEX = raw.products.map((p) => {
    const buf = Buffer.from(p.vec, 'base64');
    const vec = new Float32Array(buf.byteLength / 4);
    vec.set(new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4));
    return { ...p, notesLower: p.notes.map((n) => n.toLowerCase()), vec };
  });
  return INDEX;
}

// ---------- embeddings (local model, tier 2 + blend signal for tier 1) ----------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let embedderPromise: Promise<any> | null = null;

function getEmbedder() {
  if (!embedderPromise) {
    embedderPromise = (async () => {
      const { pipeline } = await import('@huggingface/transformers');
      return pipeline('feature-extraction', 'Xenova/bge-small-en-v1.5');
    })();
  }
  return embedderPromise;
}

async function embedText(text: string): Promise<Float32Array | null> {
  try {
    const extractor = await getEmbedder();
    const out = await extractor(text, { pooling: 'mean', normalize: true });
    return new Float32Array(out.data as ArrayLike<number>);
  } catch {
    embedderPromise = null; // allow a later retry
    return null;
  }
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    p,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]).catch(() => null);
}

function cosine(a: Float32Array, b: Float32Array): number {
  // Index vectors and query vectors are L2-normalized: dot == cosine.
  let s = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) s += a[i] * b[i];
  return s;
}

// ---------- tier 1: LLM intent parse via OpenRouter ----------

const PARSE_MODELS = [
  'google/gemma-4-31b-it:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'nvidia/nemotron-3-ultra-550b-a55b:free',
];

const PARSE_SYSTEM = `You parse perfume search queries into JSON. Reply with ONLY a JSON object, no markdown: {"liked_notes":[string],"disliked_notes":[string],"occasions":[string],"families":[string],"intensity":"light|medium|strong|any","gender":"women|men|unisex|any","free_terms":[string]}. Occasions vocabulary: office, date night, wedding, evening, daytime, summer, winter, sport, gift. Families vocabulary: citrus, floral, woody, oriental, gourmand, fruity, aquatic, green, musky, spicy, powdery, aromatic. Things the user does NOT want go in disliked_notes, including rejected qualities like sweetness (map to gourmand family and notes vanilla, caramel, tonka bean). Infer gender from recipients (wife/girlfriend/mom -> women; husband/boyfriend/dad -> men) and from phrases like "for her"/"for him".`;

function extractJson(text: string): unknown | null {
  const start = text.indexOf('{');
  if (start < 0) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(text.slice(start, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function strList(v: unknown, cap = 12): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === 'string')
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, cap);
}

function coerceIntent(raw: unknown): FragranceIntent | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const intensity = ['light', 'medium', 'strong'].includes(r.intensity as string)
    ? (r.intensity as FragranceIntent['intensity'])
    : 'any';
  const gender = ['women', 'men', 'unisex'].includes(r.gender as string)
    ? (r.gender as FragranceIntent['gender'])
    : 'any';
  const intent: FragranceIntent = {
    liked_notes: strList(r.liked_notes),
    disliked_notes: strList(r.disliked_notes),
    occasions: strList(r.occasions, 4),
    families: strList(r.families, 6).filter((f) => (FAMILIES as readonly string[]).includes(f)),
    intensity,
    gender,
    free_terms: strList(r.free_terms, 6),
  };
  // A parse that extracted nothing is a failure — let the fallback answer.
  if (!intent.liked_notes.length && !intent.families.length && !intent.occasions.length && !intent.free_terms.length) {
    return null;
  }
  return intent;
}

async function parseIntent(query: string): Promise<FragranceIntent | null> {
  const key = env.OPENROUTER_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        'X-Title': 'Eden Fragrance Finder',
      },
      body: JSON.stringify({
        models: PARSE_MODELS,
        messages: [
          { role: 'system', content: PARSE_SYSTEM },
          { role: 'user', content: query },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 500,
        temperature: 0,
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      choices?: { message?: { content?: string | null } }[];
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;
    return coerceIntent(extractJson(content));
  } catch {
    return null;
  }
}

// ---------- ranking ----------

function noteMatch(product: IndexProduct, term: string): string | null {
  for (let i = 0; i < product.notesLower.length; i++) {
    const n = product.notesLower[i];
    if (n === term || n.includes(term) || term.includes(n)) return product.notes[i];
  }
  return null;
}

function termFamilies(term: string): string[] {
  if ((FAMILIES as readonly string[]).includes(term)) return [term];
  return TERM_FAMILIES[term] ?? [];
}

function rankByIntent(
  products: IndexProduct[],
  intent: FragranceIntent,
  qvec: Float32Array | null,
  limit: number,
): FragranceHit[] {
  const scored: { p: IndexProduct; score: number; reasons: string[] }[] = [];
  for (const p of products) {
    // Gender is the one hard filter: a specific-gender product that
    // contradicts the request never ranks. Unisex/unspecified always pass.
    if (
      intent.gender !== 'any' &&
      p.gender !== 'any' &&
      p.gender !== 'unisex' &&
      p.gender !== intent.gender
    ) {
      continue;
    }
    let score = 0;
    const reasons: string[] = [];
    for (const term of intent.liked_notes) {
      const hit = noteMatch(p, term);
      if (hit) {
        score += 3;
        if (!reasons.includes(hit)) reasons.push(hit);
      } else {
        for (const f of termFamilies(term)) {
          if (p.families.includes(f)) score += 1.5;
        }
      }
    }
    for (const f of intent.families) {
      if (p.families.includes(f)) {
        score += 2;
        const label = f[0].toUpperCase() + f.slice(1);
        if (!reasons.includes(label)) reasons.push(label);
      }
    }
    for (const occ of intent.occasions) {
      if (p.occasions.includes(occ)) {
        score += 2.5;
        const label = 'Good for ' + occ;
        if (!reasons.includes(label)) reasons.push(label);
      }
    }
    for (const term of intent.disliked_notes) {
      if (noteMatch(p, term)) score -= 7;
      for (const f of termFamilies(term)) {
        if (p.families.includes(f)) score -= 5;
      }
    }
    if (intent.intensity !== 'any') {
      if (p.intensity === intent.intensity) score += 1;
      else if (
        (intent.intensity === 'light' && p.intensity === 'strong') ||
        (intent.intensity === 'strong' && p.intensity === 'light')
      ) {
        score -= 1.5;
      }
    }
    if (qvec) score += cosine(qvec, p.vec) * 3;
    if (score >= 3) scored.push({ p, score, reasons });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(({ p, reasons }) => ({
    id: p.id,
    reason: reasons.slice(0, 3).join(' · ') || fallbackReason(p),
  }));
}

function fallbackReason(p: IndexProduct): string {
  if (p.notes.length) return 'Notes: ' + p.notes.slice(0, 3).join(', ');
  if (p.families.length) return 'Profile: ' + p.families.slice(0, 2).join(', ');
  return 'Scent match';
}

function rankByEmbedding(
  products: IndexProduct[],
  qvec: Float32Array,
  gender: string,
  limit: number,
): FragranceHit[] {
  const scored: { p: IndexProduct; score: number }[] = [];
  for (const p of products) {
    if (gender !== 'any' && p.gender !== 'any' && p.gender !== 'unisex' && p.gender !== gender) continue;
    scored.push({ p, score: cosine(qvec, p.vec) });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(({ p }) => ({ id: p.id, reason: fallbackReason(p) }));
}

function sniffGender(query: string): string {
  const q = query.toLowerCase();
  if (/\b(wife|girlfriend|mom|mother|her|women|woman|female|lady|ladies)\b/.test(q)) return 'women';
  if (/\b(husband|boyfriend|dad|father|him|men|man|male|gentleman)\b/.test(q)) return 'men';
  return 'any';
}

function rankByKeyword(products: IndexProduct[], query: string, limit: number): FragranceHit[] {
  const q = ' ' + query.toLowerCase() + ' ';
  const gender = sniffGender(query);
  const scored: { p: IndexProduct; score: number; matched: string[] }[] = [];
  for (const p of products) {
    if (gender !== 'any' && p.gender !== 'any' && p.gender !== 'unisex' && p.gender !== gender) continue;
    let score = 0;
    const matched: string[] = [];
    for (let i = 0; i < p.notesLower.length; i++) {
      if (q.includes(' ' + p.notesLower[i]) || q.includes(p.notesLower[i] + ' ') || q.includes(p.notesLower[i] + ',')) {
        score += 2;
        matched.push(p.notes[i]);
      }
    }
    for (const f of p.families) if (q.includes(' ' + f + ' ') || q.includes(' ' + f + ',')) score += 1.5;
    for (const occ of p.occasions) if (q.includes(occ)) score += 1.5;
    if (score > 0) scored.push({ p, score, matched });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(({ p, matched }) => ({
    id: p.id,
    reason: matched.length ? 'Notes: ' + matched.slice(0, 3).join(', ') : fallbackReason(p),
  }));
}

// ---------- orchestration ----------

export async function searchFragrances(
  rawQuery: string,
  limit = 12,
): Promise<{ mode: FragranceMode; intent: FragranceIntent | null; hits: FragranceHit[] }> {
  const query = rawQuery.trim().slice(0, 300);
  const products = loadIndex();

  const intent = await parseIntent(query);
  if (intent) {
    // Blend in the query embedding when it is quick; the parse result
    // must not wait on a cold model download.
    const qvec = await withTimeout(embedText(query), 8_000);
    return { mode: 'llm', intent, hits: rankByIntent(products, intent, qvec, limit) };
  }

  const qvec = await embedText(query);
  if (qvec) {
    return { mode: 'embedding', intent: null, hits: rankByEmbedding(products, qvec, sniffGender(query), limit) };
  }

  return { mode: 'keyword', intent: null, hits: rankByKeyword(products, query, limit) };
}
