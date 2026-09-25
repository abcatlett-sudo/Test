#!/usr/bin/env node
// Checks every HTML file for non-deferred <script src> tags in pages that
// also use deferred scripts. A non-deferred script runs before defer/auth.js
// loads, making any call to `sb` or other deferred globals crash silently.

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const dir   = new URL('.', import.meta.url).pathname;
const files = readdirSync(dir).filter(f => f.endsWith('.html'));

const DEFERRED_SRC   = /<script\s+defer\s+src=/gi;
const BLOCKING_SRC   = /<script\s+src="(?!https:\/\/www\.googletagmanager)/gi;
const ASYNC_SRC      = /<script\s+async\s+src=/gi;
const MODULE_SCRIPT  = /<script\s+type="module"/gi;

let errors = 0;

for (const file of files) {
  const html         = readFileSync(join(dir, file), 'utf8');
  const hasDeferred  = DEFERRED_SRC.test(html);

  // Reset lastIndex after .test()
  DEFERRED_SRC.lastIndex  = 0;
  BLOCKING_SRC.lastIndex  = 0;

  const blockingMatches = [...html.matchAll(/<script\b([^>]*)>/gi)]
    .filter(m => {
      const attrs = m[1];
      const hasSrc     = /\bsrc\s*=/i.test(attrs);
      const hasDefer   = /\bdefer\b/i.test(attrs);
      const hasAsync   = /\basync\b/i.test(attrs);
      const isModule   = /\btype\s*=\s*["']module["']/i.test(attrs);
      const isGA       = /googletagmanager|gtag/i.test(attrs);
      return hasSrc && !hasDefer && !hasAsync && !isModule && !isGA;
    });

  if (hasDeferred && blockingMatches.length > 0) {
    for (const match of blockingMatches) {
      console.error(`\nERROR: ${file}`);
      console.error(`  Non-deferred <script src> found in a page that uses deferred scripts.`);
      console.error(`  Tag: <script${match[1]}>`);
      console.error(`  Fix: add "defer" attribute.`);
    }
    errors += blockingMatches.length;
  }
}

if (errors === 0) {
  console.log(`✓ Script loading check passed (${files.length} HTML files checked)`);
  process.exit(0);
} else {
  console.error(`\n✗ ${errors} issue${errors > 1 ? 's' : ''} found. Fix before committing.`);
  process.exit(1);
}
