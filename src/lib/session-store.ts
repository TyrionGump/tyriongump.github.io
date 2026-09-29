/**
 * Keeps small values for the rest of the browser tab's session, so state can
 * survive a page load. Storage can be full or blocked; then values are simply
 * not kept.
 */

export function readSessionValue(key: string): unknown {
  try {
    const raw = sessionStorage.getItem(key);
    return raw === null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}

export function writeSessionValue(key: string, value: unknown): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Not kept; the page still works.
  }
}
