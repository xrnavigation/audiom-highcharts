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
 *
 * THEMING / CUSTOMIZATION
 * -----------------------
 * - Override the CSS custom properties declared on `.audiom-hc-root` in
 *   `styles.css` (e.g. `--audiom-hc-accent`) from host CSS to retheme
 *   without writing full rule overrides.
 * - Pass `additionalStyles` to append rules to the same `<style>` tag.
 * - Pass `inject: false` to suppress injection entirely (host owns CSS).
 * - Pass a `ShadowRoot` as the target to inject into a shadow tree.
 */
import css from './styles.css';
import { STYLE_ELEMENT_ID } from './css-classes';

/** Options accepted by {@link ensureStylesInjected}. */
export interface EnsureStylesOptions {
  /**
   * When false, no `<style>` tag is created and no CSS is injected. The
   * host page is expected to ship its own CSS targeting the
   * `.audiom-hc-*` classes.
   */
  inject?: boolean;
  /**
   * Extra CSS appended to the plugin's `<style>` tag. Use for small
   * theme tweaks; for large overrides prefer `inject: false` plus your
   * own stylesheet so you can use the host's bundling pipeline.
   */
  additionalStyles?: string;
}

/**
 * Inject the plugin stylesheet into `target` once. Idempotent per
 * target (deduped via the `audiom-highcharts-styles` id). Subsequent
 * calls with new `additionalStyles` will append the new block (deduped
 * by content hash) so per-chart theme overrides accumulate safely.
 *
 * @param target  The Document (default) or ShadowRoot to receive the
 *                stylesheet. Use a ShadowRoot when the host wraps the
 *                chart in a custom element.
 * @param opts    See {@link EnsureStylesOptions}.
 */
export function ensureStylesInjected(
  target: Document | ShadowRoot = document,
  opts: EnsureStylesOptions = {}
): void {
  if (opts.inject === false) return;

  // Both Document and ShadowRoot expose getElementById.
  const existing = target.getElementById(STYLE_ELEMENT_ID) as HTMLStyleElement | null;
  if (existing) {
    if (opts.additionalStyles && !hasAdditional(existing, opts.additionalStyles)) {
      existing.appendChild(
        makeAdditionalNode(existing.ownerDocument, opts.additionalStyles)
      );
    }
    return;
  }

  // ShadowRoot has no .createElement — use the owning document.
  const doc: Document =
    target instanceof Document ? target : target.ownerDocument;
  const style = doc.createElement('style');
  style.id = STYLE_ELEMENT_ID;
  style.textContent = css;
  if (opts.additionalStyles) {
    style.appendChild(makeAdditionalNode(doc, opts.additionalStyles));
  }

  // Document → head; ShadowRoot → root.
  const parent: Node =
    target instanceof Document
      ? (target.head ?? target.documentElement ?? target)
      : target;
  parent.appendChild(style);
}

/** Marker comment used to detect & dedupe additional CSS blocks. */
const ADDITIONAL_MARKER = 'audiom-hc-additional';

function makeAdditionalNode(doc: Document, additional: string): Text {
  const hash = simpleHash(additional);
  return doc.createTextNode(
    `\n/* ${ADDITIONAL_MARKER}:${hash} */\n${additional}\n`
  );
}

function hasAdditional(styleEl: HTMLStyleElement, additional: string): boolean {
  const hash = simpleHash(additional);
  return styleEl.textContent?.includes(`${ADDITIONAL_MARKER}:${hash}`) ?? false;
}

/** Tiny non-cryptographic hash used only to dedupe additional CSS blocks. */
function simpleHash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}
