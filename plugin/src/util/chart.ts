/**
 * Small typed accessors for runtime fields on a Highcharts `Chart` that
 * aren't on the public type. Centralised here so the same `unknown` casts
 * don't accumulate across the codebase.
 */
import type Highcharts from 'highcharts';

/** The user-supplied container element the chart was rendered into. */
export function chartRenderTo(chart: Highcharts.Chart): HTMLElement {
  return (chart as unknown as { renderTo: HTMLElement }).renderTo;
}

/**
 * Best-effort title text: the live `chart.title.textStr` first (set after
 * render), then the static `chart.options.title.text`.
 */
export function getChartTitle(chart: Highcharts.Chart): string | undefined {
  const live = (chart.title as unknown as { textStr?: string } | undefined)
    ?.textStr;
  if (live) return live;
  const opt = (chart.options.title as { text?: string } | undefined)?.text;
  return opt || undefined;
}
