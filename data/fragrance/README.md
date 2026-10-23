# Fragrance Finder data

- `notes_index.json`, `note_vocab.json` — scent notes extracted from product
  descriptions (offline prototype, 2026-10-22; source of truth for notes).
- `fragrance-index.json` — GENERATED. Do not edit by hand. Rebuild with:

  ```
  node scripts/build-fragrance-index.mjs
  ```

  Pulls the live catalog from the Store API (WC_STORE_URL in .env.local),
  merges the extracted notes, tags each product with scent families /
  occasions / intensity / gender, and embeds name+notes+description with
  Xenova/bge-small-en-v1.5 (384-dim, base64 Float32 in `vec`).

Runtime: `lib/fragrance.ts` loads the index once per server process and
answers `/api/fragrance-search` in three tiers — OpenRouter free-model
intent parse (`OPENROUTER_API_KEY`, optional) → local embedding search →
keyword overlap. Rebuild the index when the catalog changes materially.
