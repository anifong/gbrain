#!/usr/bin/env bun
/**
 * Add missing frontmatter (title/type/created) to gbrain repo files that are
 * brain content but lack frontmatter entirely.
 *
 * Files handled:
 *   - skills/migrations/*.md (migration documentation — brain content)
 *   - skills/install/SKILL.md
 *   - skills/conventions/*.md (convention docs — brain content)
 *
 * Usage: bun scripts/add-missing-frontmatter.ts [--dry-run]
 */
import { readFileSync, writeFileSync } from 'fs';
import { execFileSync } from 'child_process';

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

const files = [
  // Migration docs (9 files from lint output)
  'skills/migrations/v0.5.0.md',
  'skills/migrations/v0.7.0.md',
  'skills/migrations/v0.12.1.md',
  'skills/migrations/v0.22.4.md',
  'skills/migrations/v0.29.1.md',
  'skills/migrations/v0.33.0.md',
  'skills/migrations/v0.33.3.0.md',
  'skills/migrations/v0.34.0.0.md',
  'skills/migrations/v0.41.11.0.md',
  // Install SKILL.md
  'skills/install/SKILL.md',
  // Convention docs
  'skills/conventions/brain-first.md',
  'skills/conventions/brain-routing.md',
  'skills/conventions/calibration.md',
  'skills/conventions/cron-via-minions.md',
  'skills/conventions/model-routing.md',
  'skills/conventions/quality.md',
  'skills/conventions/salience-and-recency.md',
  'skills/conventions/schema-evolution.md',
  'skills/conventions/subagent-routing.md',
  'skills/conventions/test-before-bulk.md',
];

let count = 0;
let skipped = 0;

for (const file of files) {
  let content: string;
  try {
    content = readFileSync(file, 'utf8');
  } catch {
    console.log(`SKIP (missing file): ${file}`);
    skipped++;
    continue;
  }

  // Only touch files that DON'T already have frontmatter
  if (content.startsWith('---')) {
    console.log(`SKIP (already has fm): ${file}`);
    skipped++;
    continue;
  }

  const title = file.split('/').pop()!.replace(/\.md$/, '');
  const d = gitDate(file) ?? today();
  const fm = `---\ntitle: ${title}\ntype: note\ncreated: ${d}\n---\n`;
  const newContent = fm + content;

  if (DRY) {
    console.log(`WOULD ADD frontmatter: ${file}`);
  } else {
    writeFileSync(file, newContent);
    count++;
  }
}

console.log(`\nDone. Added: ${count}, Skipped: ${skipped}${DRY ? ' (dry-run)' : ''}`);
