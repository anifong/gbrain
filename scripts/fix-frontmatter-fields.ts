#!/usr/bin/env bun
/**
 * Batch-fix frontmatter missing fields (title/type/created) on gbrain repo files.
 *
 * Reads lint output to identify files with frontmatter missing required fields,
 * then adds title/type/created. For placeholder dates in the body (YYYY-MM-DD
 * template literals in markdown content), those are left alone — they are
 * legitimate documentation content, not frontmatter issues.
 *
 * Usage: bun scripts/fix-frontmatter-fields.ts [--dry-run]
 */
import { readFileSync, writeFileSync } from 'fs';
import { execFileSync } from 'child_process';
import { join } from 'path';

const DRY = process.argv.includes('--dry-run');

function gitDate(file: string): string | null {
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%cI', '--', file], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const d = out.trim().split('T')[0];
    return d || null;
  } catch {
    return null;
  }
}

function today(): string {
  return new Date().toISOString().split('T')[0];
}

function titleFromName(file: string): string {
  const base = file.split('/').pop()!.replace(/\.md$/, '');
  return base
    .replace(/[-_]/g, ' ')
    .replace(/v\d+\.?\d*/g, (m) => `v${m.replace('v','')}` )  // keep version prefix
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// Parse the current lint output to find files with missing fields
const lintText = readFileSync('/tmp/lint_after_fix1.txt', 'utf8');
const lines = lintText.split('\n').map((l) => l.replace(/\r$/, ''));

const needsFix: Record<string, Set<string>> = {};
let currentFile = '';

for (const line of lines) {
  const m = line.match(/^([\w/.\-]+\.md):/);
  if (m) {
    currentFile = m[1];
  }
  const issueMatch = line.match(/^  L\d+\s+(missing-title|missing-type|missing-created|no-frontmatter):/);
  if (issueMatch && currentFile) {
    if (!needsFix[currentFile]) needsFix[currentFile] = new Set();
    needsFix[currentFile].add(issueMatch[1]);
  }
}

// Filter: only files that HAVE frontmatter but are missing fields
const toFix: string[] = [];
for (const [file, issues] of Object.entries(needsFix)) {
  if (issues.has('no-frontmatter')) continue; // These need frontmatter added, not just fields
  if (issues.has('missing-title') || issues.has('missing-type') || issues.has('missing-created')) {
    toFix.push(file);
  }
}

console.log(`Found ${toFix.length} files with frontmatter missing required fields`);

let fixed = 0;
let skipped = 0;

for (const file of toFix) {
  let content: string;
  try {
    content = readFileSync(file, 'utf8');
  } catch {
    console.log(`SKIP (missing): ${file}`);
    skipped++;
    continue;
  }

  if (!content.startsWith('---')) {
    console.log(`SKIP (no frontmatter): ${file}`);
    skipped++;
    continue;
  }

  const endFence = content.indexOf('\n---', 4);
  if (endFence === -1) {
    console.log(`SKIP (unterminated): ${file}`);
    skipped++;
    continue;
  }

  const fmRaw = content.slice(4, endFence);
  const body = content.slice(endFence);

  const fmLines = fmRaw.split('\n');
  const hasTitle = fmLines.some((l) => /^title\s*:/.test(l));
  const hasType = fmLines.some((l) => /^type\s*:/.test(l));
  const hasCreated = fmLines.some((l) => /^created\s*:/.test(l));

  if (hasTitle && hasType && hasCreated) {
    console.log(`SKIP (already ok): ${file}`);
    skipped++;
    continue;
  }

  const newLines: string[] = [];
  if (!hasTitle) newLines.push(`title: ${titleFromName(file)}`);
  if (!hasType) newLines.push('type: note');
  if (!hasCreated) {
    const d = gitDate(file) ?? today();
    newLines.push(`created: ${d}`);
  }

  // Keep original frontmatter lines, filtering out any dupes we're adding
  const existing = fmLines.filter((l) => {
    if (!hasTitle && /^title\s*:/.test(l)) return false;
    if (!hasType && /^type\s*:/.test(l)) return false;
    if (!hasCreated && /^created\s*:/.test(l)) return false;
    return true;
  });
  newLines.push(...existing);

  const newFm = newLines.join('\n');
  // Reconstruct: original body starts with "\n---" (the closing fence)
  const newContent = `---\n${newFm}\n---${body.slice(4)}`;

  if (DRY) {
    console.log(`WOULD FIX: ${file}`);
  } else {
    writeFileSync(file, newContent);
    fixed++;
  }
}

console.log(`\nDone. Fixed: ${fixed}, Skipped: ${skipped}${DRY ? ' (dry-run)' : ''}`);
