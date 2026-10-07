import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Apple HIG Design Tokens & Color Audit', () => {
  const tokensPath = path.resolve(__dirname, '../design/tokens.css');
  const tokensContent = fs.readFileSync(tokensPath, 'utf-8');

  const requiredVariables = [
    '--apple-label',
    '--apple-secondary-label',
    '--apple-background',
    '--apple-grouped-background',
    '--apple-card',
    '--apple-separator',
    '--apple-accent',
    '--apple-accent-subtle',
    '--apple-success',
    '--apple-success-subtle',
    '--apple-warning',
    '--apple-warning-subtle',
    '--apple-danger',
    '--apple-danger-subtle',
    '--apple-neutral',
    '--apple-neutral-subtle',
  ];

  it('defines every required semantic color variable in tokens.css', () => {
    requiredVariables.forEach((variable) => {
      expect(tokensContent).toContain(variable);
    });
  });

  it('has zero raw hex colors (#123456) in src/ components outside tokens.css', () => {
    const srcDir = path.resolve(__dirname, '..');
    const hexRegex = /#[0-9a-fA-F]{6}\b/g;

    function checkDir(dir: string) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          checkDir(fullPath);
        } else if (
          (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts') || entry.name.endsWith('.css')) &&
          !entry.name.endsWith('tokens.css') &&
          !entry.name.includes('.test.')
        ) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const matches = content.match(hexRegex);
          expect(
            matches,
            `Found raw hex color(s) [${matches?.join(', ')}] in ${entry.name}. Use semantic CSS variables instead.`
          ).toBeNull();
        }
      }
    }

    checkDir(srcDir);
  });
});
