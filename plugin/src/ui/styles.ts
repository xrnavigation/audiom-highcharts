/**
 * CSS for the plugin-rendered chrome (tabbed + side-by-side layouts).
 * Injected once per document, scoped under `.audiom-hc-root`.
 */

const STYLE_ID = 'audiom-highcharts-styles';

const CSS = `
.audiom-hc-root {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 400px;
  font-family: inherit;
  box-sizing: border-box;
}
.audiom-hc-root *,
.audiom-hc-root *::before,
.audiom-hc-root *::after {
  box-sizing: border-box;
}

/* ---------------- Tabbed layout ---------------- */
.audiom-hc-root[data-mode="tabbed"] {
  gap: 0;
}
.audiom-hc-tablist {
  display: flex;
  gap: 2px;
  border-bottom: 1px solid #d0d4d9;
  background: transparent;
  padding: 0;
  margin: 0;
}
.audiom-hc-tab {
  appearance: none;
  border: 1px solid transparent;
  border-bottom: none;
  background: transparent;
  padding: 0.5rem 1rem;
  font: inherit;
  font-size: 0.9rem;
  color: #555;
  cursor: pointer;
  border-top-left-radius: 6px;
  border-top-right-radius: 6px;
  margin-bottom: -1px;
}
.audiom-hc-tab:hover {
  color: #222;
  background: #eef0f3;
}
.audiom-hc-tab[aria-selected="true"] {
  background: #fff;
  border-color: #d0d4d9;
  color: #222;
  font-weight: 600;
}
.audiom-hc-tab:focus-visible {
  outline: 2px solid #4a90e2;
  outline-offset: -2px;
}
.audiom-hc-panel {
  flex: 1 1 auto;
  min-height: 0;
  display: none;
  background: #fff;
  border: 1px solid #d0d4d9;
  border-top: none;
  border-bottom-left-radius: 6px;
  border-bottom-right-radius: 6px;
  overflow: hidden;
}
.audiom-hc-panel[data-active="true"] {
  display: block;
}
.audiom-hc-panel > .audiom-hc-chart-slot,
.audiom-hc-panel > .audiom-hc-iframe {
  width: 100%;
  height: 100%;
  display: block;
}

/* --------------- Side-by-side layout --------------- */
.audiom-hc-root[data-mode="side-by-side"] {
  flex-direction: row;
  gap: 1rem;
  align-items: stretch;
}
.audiom-hc-root[data-mode="side-by-side"] > .audiom-hc-pane {
  flex: 1 1 0;
  min-width: 0;
  min-height: 0;
  background: #fff;
  border: 1px solid #d0d4d9;
  border-radius: 6px;
  overflow: hidden;
}
.audiom-hc-root[data-mode="side-by-side"] > .audiom-hc-pane > .audiom-hc-chart-slot,
.audiom-hc-root[data-mode="side-by-side"] > .audiom-hc-pane > .audiom-hc-iframe {
  width: 100%;
  height: 100%;
  display: block;
}
@media (max-width: 720px) {
  .audiom-hc-root[data-mode="side-by-side"] {
    flex-direction: column;
  }
}

.audiom-hc-iframe {
  border: 0;
}

/* ---------------- Preview button ---------------- */
.audiom-hc-preview-bar {
  display: flex;
  justify-content: flex-end;
  padding: 0.5rem 0;
}
.audiom-hc-preview-button {
  display: inline-block;
  padding: 0.5rem 1rem;
  font: inherit;
  font-size: 0.9rem;
  color: #fff;
  background: #2c5fa8;
  border: 1px solid #244c87;
  border-radius: 4px;
  text-decoration: none;
  cursor: pointer;
}
.audiom-hc-preview-button:hover {
  background: #244c87;
}
.audiom-hc-preview-button:focus-visible {
  outline: 2px solid #4a90e2;
  outline-offset: 2px;
}
.audiom-hc-preview-button::after {
  content: " \\2197";
  font-size: 0.85em;
}
`;

/** Inject the plugin stylesheet into the document once. */
export function ensureStylesInjected(doc: Document = document): void {
  if (doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement('style');
  style.id = STYLE_ID;
  style.textContent = CSS;
  doc.head.appendChild(style);
}
