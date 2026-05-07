/**
 * CSS class names and DOM id prefixes for the plugin-rendered chrome.
 *
 * Centralised so they can never drift between the JS that creates DOM
 * nodes and the CSS that styles them ([./styles.css](./styles.css)).
 * Renaming a class is a single-file change here plus the matching rule
 * in `styles.css`.
 *
 * Naming convention: `audiom-hc-<scope>[-<modifier>]`.
 *  - `audiom-hc-` namespace prefix avoids collision with host page CSS.
 *  - `<scope>` matches the structural role (root/tab/panel/pane/iframe…).
 */

/** CSS class names applied to plugin-created elements. */
export const CSS_CLASSES = {
  /** Outer wrapper around chart + Audiom slot pair. */
  ROOT: 'audiom-hc-root',
  /** Wrapper that the chart's `renderTo` is moved into. */
  CHART_SLOT: 'audiom-hc-chart-slot',

  // Tabbed layout
  TABLIST: 'audiom-hc-tablist',
  TAB: 'audiom-hc-tab',
  PANEL: 'audiom-hc-panel',

  // Side-by-side layout
  PANE: 'audiom-hc-pane',
  PANE_CHART: 'audiom-hc-pane-chart',
  PANE_AUDIOM: 'audiom-hc-pane-audiom',

  // Embed iframe + adornments
  IFRAME: 'audiom-hc-iframe',
  IFRAME_WITH_BUTTON: 'audiom-hc-iframe-with-button',
  PREVIEW_BAR: 'audiom-hc-preview-bar',
  PREVIEW_BUTTON: 'audiom-hc-preview-button',
  SOURCE_LINKS: 'audiom-hc-source-links'
} as const;

/**
 * DOM id prefixes for ARIA-related associations. Rendered as
 * `<prefix>-<chartIndex>` so multiple plugin instances on one page do
 * not collide. See {@link mountLayout} in `./layout.ts`.
 */
export const DOM_ID_PREFIX = {
  TAB_CHART: 'audiom-hc-tab-chart-',
  TAB_AUDIOM: 'audiom-hc-tab-audiom-',
  PANEL_CHART: 'audiom-hc-panel-chart-',
  PANEL_AUDIOM: 'audiom-hc-panel-audiom-'
} as const;

/**
 * `<style>` element id used by `ensureStylesInjected()` to dedupe
 * injection — only one stylesheet per Document.
 */
export const STYLE_ELEMENT_ID = 'audiom-highcharts-styles';

/**
 * Discriminator for the two slots of the layout. Used both as a
 * `setActiveTab(...)` argument and (with the matching `DOM_ID_PREFIX.*`)
 * to build per-side element ids.
 */
export const LayoutSide = {
  Chart: 'chart',
  Audiom: 'audiom'
} as const;
export type LayoutSide = (typeof LayoutSide)[keyof typeof LayoutSide];
