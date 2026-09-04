/* i18n runtime.
 *
 * Every user-facing string in the map has a key like `body.warren.name` or
 * `sys.rin.tag`. Values are looked up via t(key) against the active LANG.
 *
 * Locales:
 *   'sv'   Swedish (default; matches the curated corpus)
 *   'en'   English
 *   'debug' every value is its own key — makes missing keys visible on-page
 */

import { STRINGS } from './i18n/strings.js';

const KEY = 'procyon.lang';
export const LANGS = ['sv', 'en', 'debug'];

// Persist across reloads.
let LANG = (typeof localStorage !== 'undefined' && localStorage.getItem(KEY)) || 'sv';
if (!LANGS.includes(LANG)) LANG = 'sv';

export function getLang() { return LANG; }
export function setLang(l) {
  if (!LANGS.includes(l)) return;
  LANG = l;
  try { localStorage.setItem(KEY, l); } catch {}
  window.dispatchEvent(new CustomEvent('langchange', { detail: l }));
}

/** Look up a key. Falls back to the key itself so missing keys show up
    obviously (matching the debug-locale behaviour). */
export function t(key) {
  if (LANG === 'debug') return key;
  const entry = STRINGS[key];
  if (!entry) return `⟨${key}⟩`;                 // key exists nowhere
  const v = entry[LANG] ?? entry.sv ?? entry.en; // fall through if missing
  return v ?? `⟨${key}⟩`;
}

/** True if the key has an entry for the current LANG (not the fallback). */
export function has(key) {
  const e = STRINGS[key];
  return !!e && (LANG === 'debug' ? true : !!e[LANG]);
}
