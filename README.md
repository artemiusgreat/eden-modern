# Eden Storefront (headless WooCommerce)

Next.js 14 + MDB React UI Kit luxury storefront for https://eden.indemos.com,
with WooCommerce kept as a headless backend via the Store API
(`wp-json/wc/store/v1`). Full storefront + cart. Checkout is the next step.

## Design

NOIR monochrome theme (rebuilt 2026-09-28 from the user's NOIR Interior Studio
reference template): near-black `#0b0a09`, warm white text, stone gray —
champagne gold reserved for ratings and small accents. Playfair Display for
headings + Inter for body (Jost dropped after a font-load console error).
No italics anywhere, no letter-spacing anywhere (per explicit user direction).

- Home: full-bleed hero ("Scents That Inspire."), promise cards
  (Authentic. Curated. Elevated.), Best sellers grid, Featured collections,
  Our Story split panel, 5-step process ("From discovery to your doorstep."),
  testimonials, light stone CTA band with newsletter.
- Navbar: serif Indemos wordmark, links, labeled Search button, bag icon,
  "Shop Sale" outline CTA.
- Footer: brand + Trustpilot + 7 socials / Quick links / Shop / Contact
  columns, bottom bar with Privacy and Refunds & Returns.

## Stack

- Next.js 14 App Router (React 18 — required by `mdb-react-ui-kit@9`)
- MDB React UI Kit for all UI components (design system, not migrated Elementor markup)
- WooCommerce Store API for catalog, search, cart (no API keys needed for these)
- WP REST API (`wp-json/wp/v2`) for blog posts and info pages

## Run

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
```

Env (`.env.local`):

- `WOO_STORE_URL` — WooCommerce backend, default `https://eden.indemos.com`
- `NEXT_PUBLIC_SITE_URL` — public URL, used for metadata

## How it works

- **Catalog** (`lib/woo.ts`): server-side fetchers over the Store API with
  `revalidate: 3600` (ISR). Pages: `/` (hero, categories, bestsellers, sale,
  journal), `/category/[slug]`, `/products/[slug]` (gallery, price, stock,
  accordions, related), `/search?q=` and `/search?on_sale=1` (Private Sale).
  HTML entities from Woo are decoded (`decodeEntities`) — no stray `&amp;`.
  Note: the Store API ignores the `slug` param on `/products/categories`,
  so `getCategoryBySlug` filters client-side.
- **Blog** (`/blog`, `/blog/[slug]`): real WP posts with featured images.
- **Info pages**: `/privacy`, `/refunds-and-returns`, `/contacts` render real
  WP page content; `/account` links to the WP backend sign-in until headless
  auth exists.
- **Images**: `next/image` with `remotePatterns` for the WP uploads domain;
  product images use `object-fit: contain` in a fixed 4:5 frame (no cropping).
- **Cart** (`lib/woo-cart.ts` + `app/api/cart/route.ts`): the Store API
  identifies guest carts via `Cart-Token` and requires a fresh `Nonce` per
  mutation. The route handler keeps the token in an httpOnly cookie and
  refreshes the nonce server-side; the browser only talks to `/api/cart`.
  UI: `CartProvider` context + slide-in drawer, `AddToCartButton`.
- **MDB + App Router gotcha**: `mdb-react-ui-kit` ships no `"use client"`
  directives and runs module-level `createContext`, so *every file that
  imports it must be a client component*. Pages stay async server components
  (data fetching) and render client "View" components
  (`components/*View.tsx`) for all MDB markup.
- **PDP speed**: `loading.tsx` skeletons give instant feedback; in production
  the ISR-cached pages serve fast (dev compiles per request, which is slow).

## Next steps (Phase 2)

1. `/checkout` page posting to the Store API `/checkout` endpoint
   (address form + payment methods advertised by the API).
2. Payment gateway wiring (check which gateways the WP backend has enabled;
   Stripe via the Store API needs Stripe Elements on the frontend).
3. On-demand ISR revalidation via WooCommerce webhooks
   (`product/update` → `revalidatePath`).
4. Move WP to a backend subdomain, lock down theme output, DNS cutover,
   redirect map (`/products/{slug}` permalinks already match).
