import { defineConfig } from 'vitest/config';
import { readFileSync } from 'node:fs';

/**
 * Tiny inline plugin so `import css from './foo.css'` returns the file's
 * contents as a string in tests — mirrors the production build's
 * `rollup-plugin-string` step. Without this Vite would try to inject the
 * stylesheet as a side effect, which makes no sense in a Node/jsdom test.
 */
function cssAsString() {
  return {
    name: 'audiom-css-as-string',
    enforce: 'pre' as const,
    transform(_code: string, id: string) {
      if (!id.endsWith('.css')) return null;
      const source = readFileSync(id, 'utf8');
      return {
        code: `export default ${JSON.stringify(source)};`,
        map: null
      };
    }
  };
}

export default defineConfig({
  plugins: [cssAsString()],
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/dev/**', 'src/**/*.d.ts']
    }
  }
});
