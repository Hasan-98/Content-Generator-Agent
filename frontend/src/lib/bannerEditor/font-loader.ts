/**
 * Custom font loader (lib/custom-fonts.ts → browser).
 *
 * - Injects a Google Fonts <link> for each registered custom font into <head>.
 * - Mirrors the latest list onto window.__customFonts so listAllFonts() in fonts.ts can see them.
 * - Call refreshCustomFonts() at app boot and after any add/remove.
 */
import {
  listCustomFonts,
  buildGoogleFontsUrl,
  type CustomFont,
} from './custom-fonts';
import type { FontOption } from './fonts';

const LINK_PREFIX = 'cf-link-';

export function refreshCustomFonts(): CustomFont[] {
  if (typeof window === 'undefined') return [];
  const fonts = listCustomFonts();

  // Drop existing links so we don't accumulate
  document.querySelectorAll(`link[id^="${LINK_PREFIX}"]`).forEach((el) => el.remove());

  // Inject fresh <link>s
  for (const f of fonts) {
    const link = document.createElement('link');
    link.id = `${LINK_PREFIX}${f.id}`;
    link.rel = 'stylesheet';
    link.href = buildGoogleFontsUrl(f);
    document.head.appendChild(link);
  }

  // Update window-level mirror so fonts.ts listAllFonts() sees the latest
  const w = window as Window & { __customFonts?: FontOption[] };
  w.__customFonts = fonts.map<FontOption>((f) => ({
    id: f.id,
    label: f.label,
    family: f.family,
    weights: f.weights,
    hint: f.hint,
  }));

  return fonts;
}
