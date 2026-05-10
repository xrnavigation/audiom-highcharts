/**
 * Home-page entry script: renders the sample card list from the
 * registry. Adding a sample to `./sample-registry.ts` automatically
 * adds a card here.
 */
import { SAMPLES } from './sample-registry';

const list = document.getElementById('sample-list');
if (list) {
  list.innerHTML = '';
  for (const sample of SAMPLES) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = `${sample.slug}.html`;

    const title = document.createElement('strong');
    title.textContent = sample.title;
    a.appendChild(title);

    const desc = document.createElement('span');
    desc.textContent = sample.description;
    a.appendChild(desc);

    li.appendChild(a);
    list.appendChild(li);
  }
}
