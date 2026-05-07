/**
 * Ambient module declaration so TypeScript treats `import css from './foo.css'`
 * as a string. The actual stringification happens at build time via
 * `@rollup/plugin-string` (see rollup.config.js) and at test time via
 * Vitest's CSS-as-string handling configured in vitest.config.ts.
 */
declare module '*.css' {
  const css: string;
  export default css;
}
