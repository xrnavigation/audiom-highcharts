import { AudiomDisplayMode } from 'audiom-highcharts';

/**
 * Read the `?mode=tabbed|side-by-side` query param and render a small
 * `<select>` that lets the user switch modes (reloads the page).
 * Returns the currently-selected display mode.
 */
export function setupDisplayModeToggle(): AudiomDisplayMode {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('mode');
  const mode =
    raw === AudiomDisplayMode.SideBySide
      ? AudiomDisplayMode.SideBySide
      : raw === AudiomDisplayMode.Button
      ? AudiomDisplayMode.Button
      : AudiomDisplayMode.Tabbed;

  const host = document.getElementById('mode-toggle');
  if (host) {
    host.innerHTML = '';

    const label = document.createElement('label');
    label.htmlFor = 'mode-toggle-select';
    label.textContent = 'Display: ';
    label.style.marginRight = '0.5rem';
    label.style.fontSize = '0.875rem';
    label.style.color = '#555';

    const select = document.createElement('select');
    select.id = 'mode-toggle-select';
    select.style.padding = '0.25rem 0.5rem';
    select.style.fontSize = '0.875rem';

    const tabbedOpt = document.createElement('option');
    tabbedOpt.value = AudiomDisplayMode.Tabbed;
    tabbedOpt.textContent = 'Tabbed';

    const sbsOpt = document.createElement('option');
    sbsOpt.value = AudiomDisplayMode.SideBySide;
    sbsOpt.textContent = 'Side-by-side';

    const btnOpt = document.createElement('option');
    btnOpt.value = AudiomDisplayMode.Button;
    btnOpt.textContent = 'Open in Audiom (button)';

    select.appendChild(tabbedOpt);
    select.appendChild(sbsOpt);
    select.appendChild(btnOpt);
    select.value = mode;

    select.addEventListener('change', () => {
      const next = new URLSearchParams(window.location.search);
      next.set('mode', select.value);
      window.location.search = next.toString();
    });

    host.appendChild(label);
    host.appendChild(select);
  }

  return mode;
}
