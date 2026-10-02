// Explicit loading-indicator signals for async work that is NOT a route
// navigation (account tab loads, saves, sign-out). RouteProgress listens for
// these window events; the gold bar appears only if the work outlasts its
// show-after delay, so fast actions never flash it.
export const PROGRESS_BEGIN = 'eden:progress:begin';
export const PROGRESS_END = 'eden:progress:end';

export function progressBegin() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(PROGRESS_BEGIN));
  }
}

export function progressEnd() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(PROGRESS_END));
  }
}
