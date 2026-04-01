#!/usr/bin/env bun
/**
 * Dev-facing doctor script.
 *
 * Usage:
 *   bun run doctor              # human-readable output
 *   bun run doctor:json         # JSON to stdout
 *   bun run doctor:report       # JSON to reports/doctor.json
 */

import { runAllChecks, buildReport, formatResults } from "../src/doctor.ts";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";

const args = process.argv.slice(2);
const jsonFlag = args.includes("--json");
const outIdx = args.indexOf("--out");
const outPath = outIdx !== -1 ? args[outIdx + 1] : null;

const results = await runAllChecks();
const report = buildReport(results);

if (outPath) {
  await mkdir(dirname(outPath), { recursive: true });
  await Bun.write(outPath, JSON.stringify(report, null, 2) + "\n");
  console.log(`Report written to ${outPath}`);
} else if (jsonFlag) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`\nvaultchat doctor v${report.version}\n`);
  console.log(formatResults(results));
  console.log();
}

process.exit(report.failed > 0 ? 1 : 0);
