/** Format a Store API minor-units price string, e.g. "3683" -> "$36.83". */
export function formatPrice(minorUnits: string, minorUnit = 2, symbol = '$'): string {
  const value = Number(minorUnits) / Math.pow(10, minorUnit);
  return `${symbol}${value.toFixed(minorUnit)}`;
}

/** Strip HTML tags for meta descriptions. */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Decode HTML entities in API strings, e.g. "A &#8211; B" -> "A – B".
 *  WooCommerce escapes product names; rendering them raw shows the entity
 *  literally. Handles numeric (decimal/hex) and common named entities. */
export function decodeEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ');
}
