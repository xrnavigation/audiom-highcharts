/**
 * Stylesheet loader for the plugin chrome.
 *
 * The CSS body lives in `./styles.css` so it can be edited with proper
 * tooling (syntax highlighting, formatter, linters). Build/test toolchain
 * inlines that file as a string at bundle time:
 *   - Rollup: `@rollup/plugin-string` (see rollup.config.js)
 *   - Vitest: server.transformMode in vitest.config.ts treats *.css as text
 * so consumers still get a single self-contained ESM bundle with no
 * external CSS file to ship.
 */
import css from './styles.css';
import { STYLE_ELEMENT_ID } from './css-classes';

/** Inject the plugin stylesheet into the document once. */
export function ensureStylesInjected(doc: Document = document): void {
  if (doc.getElementById(STYLE_ELEMENT_ID)) return;
  const style = doc.createElement('style');
  style.id = STYLE_ELEMENT_ID;
  style.textContent = css;
  doc.head.appendChild(style);
}
