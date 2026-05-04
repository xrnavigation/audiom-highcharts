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
  // `renderTo` is the user-supplied container element. It exists at runtime
  // on every Chart but isn't on the public type.
  const renderTo = (chart as unknown as { renderTo: HTMLElement }).renderTo;
  ensureStylesInjected(renderTo.ownerDocument);

  const originalParent = renderTo.parentNode;
  const originalNextSibling = renderTo.nextSibling;
  if (!originalParent) {
    throw new Error(
      '[audiom-highcharts] chart.renderTo has no parent; cannot mount layout.'
    );
  }

  const doc = renderTo.ownerDocument;
  const root = doc.createElement('div');
  root.className = 'audiom-hc-root';
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
  chartSlot.className = 'audiom-hc-chart-slot';

  // Move the chart's renderTo element into the slot. Stretch it so the
  // chart fills the slot without changing user CSS.
  const prevWidth = renderTo.style.width;
  const prevHeight = renderTo.style.height;
  renderTo.style.width = '100%';
  renderTo.style.height = '100%';
  chartSlot.appendChild(renderTo);

  const audiomElement = opts.audiomElement;

  let setActiveTab: (which: 'chart' | 'audiom') => void = () => {};

  if (opts.mode === AudiomDisplayMode.Tabbed) {
    const chartTabId = `audiom-hc-tab-chart-${chart.index}`;
    const audiomTabId = `audiom-hc-tab-audiom-${chart.index}`;
    const chartPanelId = `audiom-hc-panel-chart-${chart.index}`;
    const audiomPanelId = `audiom-hc-panel-audiom-${chart.index}`;

    const tablist = doc.createElement('div');
    tablist.className = 'audiom-hc-tablist';
    tablist.setAttribute('role', 'tablist');

    const chartTab = doc.createElement('button');
    chartTab.type = 'button';
    chartTab.className = 'audiom-hc-tab';
    chartTab.id = chartTabId;
    chartTab.setAttribute('role', 'tab');
    chartTab.setAttribute('aria-controls', chartPanelId);
    chartTab.textContent = opts.chartLabel;

    const audiomTab = doc.createElement('button');
    audiomTab.type = 'button';
    audiomTab.className = 'audiom-hc-tab';
    audiomTab.id = audiomTabId;
    audiomTab.setAttribute('role', 'tab');
    audiomTab.setAttribute('aria-controls', audiomPanelId);
    audiomTab.textContent = opts.audiomLabel;

    tablist.appendChild(chartTab);
    tablist.appendChild(audiomTab);

    const chartPanel = doc.createElement('div');
    chartPanel.className = 'audiom-hc-panel';
    chartPanel.id = chartPanelId;
    chartPanel.setAttribute('role', 'tabpanel');
    chartPanel.setAttribute('aria-labelledby', chartTabId);
    chartPanel.appendChild(chartSlot);

    const audiomPanel = doc.createElement('div');
    audiomPanel.className = 'audiom-hc-panel';
    audiomPanel.id = audiomPanelId;
    audiomPanel.setAttribute('role', 'tabpanel');
    audiomPanel.setAttribute('aria-labelledby', audiomTabId);
    audiomPanel.appendChild(audiomElement);

    setActiveTab = (which) => {
      const chartActive = which === 'chart';
      chartTab.setAttribute('aria-selected', String(chartActive));
      audiomTab.setAttribute('aria-selected', String(!chartActive));
      chartTab.setAttribute('tabindex', chartActive ? '0' : '-1');
      audiomTab.setAttribute('tabindex', chartActive ? '-1' : '0');
      chartPanel.dataset.active = String(chartActive);
      audiomPanel.dataset.active = String(!chartActive);
      if (chartActive) opts.onChartShown?.();
    };

    chartTab.addEventListener('click', () => setActiveTab('chart'));
    audiomTab.addEventListener('click', () => setActiveTab('audiom'));

    const onKeydown = (ev: KeyboardEvent) => {
      if (ev.key === 'ArrowRight') {
        setActiveTab('audiom');
        audiomTab.focus();
        ev.preventDefault();
      } else if (ev.key === 'ArrowLeft') {
        setActiveTab('chart');
        chartTab.focus();
        ev.preventDefault();
      } else if (ev.key === 'Home') {
        setActiveTab('chart');
        chartTab.focus();
        ev.preventDefault();
      } else if (ev.key === 'End') {
        setActiveTab('audiom');
        audiomTab.focus();
        ev.preventDefault();
      }
    };
    chartTab.addEventListener('keydown', onKeydown);
    audiomTab.addEventListener('keydown', onKeydown);

    root.appendChild(tablist);
    root.appendChild(chartPanel);
    root.appendChild(audiomPanel);

    setActiveTab('chart');
  } else {
    // Side-by-side: two flex panes, both visible.
    const chartPane = doc.createElement('div');
    chartPane.className = 'audiom-hc-pane audiom-hc-pane-chart';
    chartPane.setAttribute('aria-label', opts.chartLabel);
    chartPane.appendChild(chartSlot);

    const audiomPane = doc.createElement('div');
    audiomPane.className = 'audiom-hc-pane audiom-hc-pane-audiom';
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
    showChart() { setActiveTab('chart'); },
    showAudiom() { setActiveTab('audiom'); },
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
