/** Format a Store API minor-units price string, e.g. "3683" -> "$36.83". */
export function formatPrice(minorUnits: string, minorUnit = 2, symbol = '$'): string {
  const value = Number(minorUnits) / Math.pow(10, minorUnit);
  return `${symbol}${value.toFixed(minorUnit)}`;
}

/** Strip HTML tags for meta descriptions. */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}
