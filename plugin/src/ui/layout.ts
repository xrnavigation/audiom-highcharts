/**
 * Layout primitives for the plugin's two presentational modes:
 *  - Tabbed:    Highcharts on tab 1, Audiom on tab 2.
 *  - SideBySide: Highcharts and Audiom in a flex row (column on narrow viewports).
 *
 * The chart's user-supplied container element (`chart.renderTo`) is
 * non-destructively wrapped: we insert a layout root in its place and move
 * `renderTo` into a slot inside that root. On {@link LayoutHandle.destroy}
 * we put `renderTo` back where it was.
 */
import type Highcharts from 'highcharts';
import { AudiomDisplayMode } from '../types';
import { ensureStylesInjected } from './styles';
import { CSS_CLASSES, DOM_ID_PREFIX, LayoutSide } from './css-classes';
import { chartRenderTo } from '../util/chart';
import { pluginError } from '../constants';

export interface MountLayoutOptions {
  mode: AudiomDisplayMode.Tabbed | AudiomDisplayMode.SideBySide;
  /** Tab/pane label for the chart side. */
  chartLabel: string;
  /** Tab/pane label for the Audiom side. */
  audiomLabel: string;
  /** Element to mount in the Audiom slot (typically an `<iframe>`). */
  audiomElement: HTMLElement;
  /**
   * Called when the layout is resized or the chart panel becomes visible.
   * The chart should reflow to fit the new container size.
   */
  onChartShown?: () => void;
}

export interface LayoutHandle {
  /** The wrapper inserted in place of the original `renderTo`. */
  readonly root: HTMLElement;
  /** Programmatically focus the chart panel/tab. */
  showChart(): void;
  /** Programmatically focus the Audiom panel/tab. */
  showAudiom(): void;
  /** Restore the DOM to its pre-mount state. */
  destroy(): void;
}

/**
 * Wrap `chart.renderTo` in a layout root and mount `audiomElement` alongside
 * it. The chart container is moved into a slot; on destroy it is restored
 * to its original parent at its original position.
 */
export function mountLayout(
  chart: Highcharts.Chart,
  opts: MountLayoutOptions
): LayoutHandle {
  // `renderTo` is the user-supplied container element.
  const renderTo = chartRenderTo(chart);
  ensureStylesInjected(renderTo.ownerDocument);

  const originalParent = renderTo.parentNode;
  const originalNextSibling = renderTo.nextSibling;
  if (!originalParent) {
    throw pluginError('chart.renderTo has no parent; cannot mount layout.');
  }

  const doc = renderTo.ownerDocument;
  const root = doc.createElement('div');
  root.className = CSS_CLASSES.ROOT;
  root.dataset.mode = opts.mode;

  // Inherit the chart container's dimensions so we don't collapse the page
  // layout. The chart slot itself stretches to fill its panel.
  const computed = doc.defaultView?.getComputedStyle(renderTo);
  if (computed) {
    if (renderTo.style.height) root.style.height = renderTo.style.height;
    else if (computed.height && computed.height !== 'auto') root.style.height = computed.height;
    if (renderTo.style.width) root.style.width = renderTo.style.width;
  }

  const chartSlot = doc.createElement('div');
  chartSlot.className = CSS_CLASSES.CHART_SLOT;

  // Move the chart's renderTo element into the slot. Stretch it so the
  // chart fills the slot without changing user CSS.
  const prevWidth = renderTo.style.width;
  const prevHeight = renderTo.style.height;
  renderTo.style.width = '100%';
  renderTo.style.height = '100%';
  chartSlot.appendChild(renderTo);

  const audiomElement = opts.audiomElement;

  let setActiveTab: (which: LayoutSide) => void = () => {};

  if (opts.mode === AudiomDisplayMode.Tabbed) {
    const chartTabId = `${DOM_ID_PREFIX.TAB_CHART}${chart.index}`;
    const audiomTabId = `${DOM_ID_PREFIX.TAB_AUDIOM}${chart.index}`;
    const chartPanelId = `${DOM_ID_PREFIX.PANEL_CHART}${chart.index}`;
    const audiomPanelId = `${DOM_ID_PREFIX.PANEL_AUDIOM}${chart.index}`;

    const tablist = doc.createElement('div');
    tablist.className = CSS_CLASSES.TABLIST;
    tablist.setAttribute('role', 'tablist');

    const chartTab = doc.createElement('button');
    chartTab.type = 'button';
    chartTab.className = CSS_CLASSES.TAB;
    chartTab.id = chartTabId;
    chartTab.setAttribute('role', 'tab');
    chartTab.setAttribute('aria-controls', chartPanelId);
    chartTab.textContent = opts.chartLabel;

    const audiomTab = doc.createElement('button');
    audiomTab.type = 'button';
    audiomTab.className = CSS_CLASSES.TAB;
    audiomTab.id = audiomTabId;
    audiomTab.setAttribute('role', 'tab');
    audiomTab.setAttribute('aria-controls', audiomPanelId);
    audiomTab.textContent = opts.audiomLabel;

    tablist.appendChild(chartTab);
    tablist.appendChild(audiomTab);

    const chartPanel = doc.createElement('div');
    chartPanel.className = CSS_CLASSES.PANEL;
    chartPanel.id = chartPanelId;
    chartPanel.setAttribute('role', 'tabpanel');
    chartPanel.setAttribute('aria-labelledby', chartTabId);
    chartPanel.appendChild(chartSlot);

    const audiomPanel = doc.createElement('div');
    audiomPanel.className = CSS_CLASSES.PANEL;
    audiomPanel.id = audiomPanelId;
    audiomPanel.setAttribute('role', 'tabpanel');
    audiomPanel.setAttribute('aria-labelledby', audiomTabId);
    audiomPanel.appendChild(audiomElement);

    setActiveTab = (which) => {
      const chartActive = which === LayoutSide.Chart;
      chartTab.setAttribute('aria-selected', String(chartActive));
      audiomTab.setAttribute('aria-selected', String(!chartActive));
      chartTab.setAttribute('tabindex', chartActive ? '0' : '-1');
      audiomTab.setAttribute('tabindex', chartActive ? '-1' : '0');
      chartPanel.dataset.active = String(chartActive);
      audiomPanel.dataset.active = String(!chartActive);
      if (chartActive) opts.onChartShown?.();
    };

    chartTab.addEventListener('click', () => setActiveTab(LayoutSide.Chart));
    audiomTab.addEventListener('click', () => setActiveTab(LayoutSide.Audiom));

    const onKeydown = (ev: KeyboardEvent) => {
      if (ev.key === 'ArrowRight') {
        setActiveTab(LayoutSide.Audiom);
        audiomTab.focus();
        ev.preventDefault();
      } else if (ev.key === 'ArrowLeft') {
        setActiveTab(LayoutSide.Chart);
        chartTab.focus();
        ev.preventDefault();
      } else if (ev.key === 'Home') {
        setActiveTab(LayoutSide.Chart);
        chartTab.focus();
        ev.preventDefault();
      } else if (ev.key === 'End') {
        setActiveTab(LayoutSide.Audiom);
        audiomTab.focus();
        ev.preventDefault();
      }
    };
    chartTab.addEventListener('keydown', onKeydown);
    audiomTab.addEventListener('keydown', onKeydown);

    root.appendChild(tablist);
    root.appendChild(chartPanel);
    root.appendChild(audiomPanel);

    setActiveTab(LayoutSide.Chart);
  } else {
    // Side-by-side: two flex panes, both visible.
    const chartPane = doc.createElement('div');
    chartPane.className = `${CSS_CLASSES.PANE} ${CSS_CLASSES.PANE_CHART}`;
    chartPane.setAttribute('aria-label', opts.chartLabel);
    chartPane.appendChild(chartSlot);

    const audiomPane = doc.createElement('div');
    audiomPane.className = `${CSS_CLASSES.PANE} ${CSS_CLASSES.PANE_AUDIOM}`;
    audiomPane.setAttribute('aria-label', opts.audiomLabel);
    audiomPane.appendChild(audiomElement);

    root.appendChild(chartPane);
    root.appendChild(audiomPane);
  }

  // Insert root into the DOM at the chart's old slot.
  originalParent.insertBefore(root, originalNextSibling);

  // Reflow once mounted so Highcharts picks up the new container size.
  // queueMicrotask defers until after layout flush.
  queueMicrotask(() => {
    try { chart.reflow(); } catch { /* chart may already be destroyed */ }
  });

  return {
    root,
    showChart() { setActiveTab(LayoutSide.Chart); },
    showAudiom() { setActiveTab(LayoutSide.Audiom); },
    destroy() {
      // Restore the chart container to its original position.
      renderTo.style.width = prevWidth;
      renderTo.style.height = prevHeight;
      if (root.parentNode) {
        originalParent.insertBefore(renderTo, root);
        root.parentNode.removeChild(root);
      }
    }
  };
}
