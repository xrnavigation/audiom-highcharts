/**
 * Minimal types for the Audiom rules JSON v2 format. Kept local to the
 * sample so we don't depend on internals of the embedder package.
 *
 * See rules-file-format.md for the canonical reference.
 */

/** A Mapbox-GL-style filter expression. We don't constrain it tightly. */
export type RuleExpression = unknown;

export interface AudiomRule {
  id?: string;
  priority?: number;
  filter: RuleExpression;
  output: {
    ruleName?: RuleExpression | string;
    ruleType?: string;
    name?: RuleExpression | string;
    passable?: boolean | RuleExpression;
    width?: number | RuleExpression;
    exclude?: boolean | RuleExpression;
    fill?: string | RuleExpression;
    stroke?: string | RuleExpression;
    [key: string]: unknown;
  };
}

export interface AudiomRulesFile {
  version: 2;
  rules: AudiomRule[];
  augmenters?: unknown[];
}
