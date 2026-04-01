#!/usr/bin/env bun
/**
 * Quick startup sanity check.
 * Builds the binary for the current platform, runs --version, verifies exit 0.
 */

import { $ } from "bun";

console.log("smoke: building...");
await $`bun run build`.quiet();

console.log("smoke: running --version...");
const result = await $`./dist/vaultchat --version`.quiet();
const output = result.text().trim();

if (!output.startsWith("vaultchat ")) {
  console.error(`smoke: unexpected output: ${output}`);
  process.exit(1);
}

console.log(`smoke: ${output}`);
console.log("\x1b[32msmoke: passed\x1b[0m");
