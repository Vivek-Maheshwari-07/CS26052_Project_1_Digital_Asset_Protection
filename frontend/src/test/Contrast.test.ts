/// <reference types="node" />
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// Computes WCAG contrast straight from tokens.css, so the reported ratios can never
// drift from the real colours.
const css = readFileSync(resolve(__dirname, "../design/tokens.css"), "utf8");

function block(selectorStart: string): Record<string, string> {
  const start = css.indexOf(selectorStart);
  const body = css.slice(css.indexOf("{", start) + 1, css.indexOf("}", start));
  const vars: Record<string, string> = {};
  for (const m of body.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) vars[m[1]] = m[2];
  return vars;
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const TEXT_TOKENS = ["ink", "ink-soft", "cobalt-text", "ochre-text", "vermilion-text", "sage-text"];
const THEMES = {
  paper: block(":root {"),
  ink: block('[data-theme="ink"] {'),
  "os-dark": block(':root:not([data-theme="paper"])'),
};

describe("WCAG AA contrast for text tokens (computed from tokens.css)", () => {
  for (const [theme, vars] of Object.entries(THEMES)) {
    for (const token of TEXT_TOKENS) {
      for (const bg of ["paper", "paper-2"]) {
        it(`${theme}: --${token} on --${bg} >= 4.5:1`, () => {
          expect(vars[token], `--${token} missing in ${theme}`).toBeDefined();
          expect(vars[bg], `--${bg} missing in ${theme}`).toBeDefined();
          expect(contrast(vars[token], vars[bg])).toBeGreaterThanOrEqual(4.5);
        });
      }
    }
  }
});
