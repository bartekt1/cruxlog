/// <reference types="node" />
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import en from '../src/i18n/en.json';
import pl from '../src/i18n/pl.json';

const ROOT = join(__dirname, '..');
const PLURAL = /_(zero|one|two|few|many|other)$/;

function keys(obj: object, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) => (v && typeof v === 'object' ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`]));
}
const base = (k: string) => k.replace(PLURAL, '');

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return sources(p);
    return /\.tsx?$/.test(name) ? [p] : [];
  });
}
const files = [...sources(join(ROOT, 'app')), ...sources(join(ROOT, 'src'))].map((p) => ({ path: relative(ROOT, p), text: readFileSync(p, 'utf8') }));

// Text that is intentionally the same in every language.
const ALLOWED_LITERALS = new Set(['Polski', 'English', '★', '·', '›', '‹', '✓']);

describe('i18n', () => {
  const enKeys = keys(en);
  const plKeys = keys(pl);

  it('has the same keys in pl and en (ignoring plural forms)', () => {
    const enBase = new Set(enKeys.map(base));
    const plBase = new Set(plKeys.map(base));
    expect([...enBase].filter((k) => !plBase.has(k))).toEqual([]);
    expect([...plBase].filter((k) => !enBase.has(k))).toEqual([]);
  });

  it('has no empty translations', () => {
    const empty = (obj: object) => keys(obj).filter((k) => String(k.split('.').reduce<any>((o, p) => o[p], obj)).trim() === '');
    expect(empty(en)).toEqual([]);
    expect(empty(pl)).toEqual([]);
  });

  it('defines every static t() key used in the code', () => {
    const known = new Set(enKeys.map(base));
    const missing: string[] = [];
    for (const f of files) {
      for (const m of f.text.matchAll(/\bt\(\s*'([^']+)'/g)) if (!known.has(m[1])) missing.push(`${f.path}: ${m[1]}`);
    }
    expect(missing).toEqual([]);
  });

  it('defines the section of every dynamic t() key used in the code', () => {
    const sections = new Set(enKeys.map((k) => k.slice(0, k.lastIndexOf('.') + 1)));
    const missing: string[] = [];
    for (const f of files) {
      for (const m of f.text.matchAll(/\bt\(\s*`([^`$]*)\$\{/g)) if (!sections.has(m[1])) missing.push(`${f.path}: ${m[1]}`);
    }
    expect(missing).toEqual([]);
  });

  it('has no hard-coded user-visible text in screens', () => {
    const found: string[] = [];
    for (const f of files.filter((x) => x.path.endsWith('.tsx'))) {
      // Text between JSX tags, e.g. <Text>Save</Text>
      for (const m of f.text.matchAll(/>([^<>{}=;]*\p{L}[^<>{}=;]*)<\//gu)) {
        const s = m[1].trim();
        if (!ALLOWED_LITERALS.has(s)) found.push(`${f.path}: ${s}`);
      }
      // Literal strings in user-facing props
      for (const m of f.text.matchAll(/\b(placeholder|title|label|accessibilityLabel|accessibilityHint)="([^"]*)"/g)) {
        if (/\p{L}/u.test(m[2]) && !ALLOWED_LITERALS.has(m[2])) found.push(`${f.path}: ${m[1]}="${m[2]}"`);
      }
    }
    expect(found).toEqual([]);
  });
});
