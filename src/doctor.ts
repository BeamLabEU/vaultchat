/**
 * VaultChat diagnostic engine.
 *
 * Used by:
 *   - `scripts/doctor.ts` (dev)
 *   - `vaultchat --doctor` (binary users)
 */

import { loadConfig, getConfigDir } from "./vault/config.ts";
import { getProvider, listProviders } from "./providers/registry.ts";
import { getVersion } from "./version.ts";

export interface CheckResult {
  ok: boolean;
  label: string;
  detail?: string;
}

// ── Individual checks ──────────────────────────────────────────────

export function checkBunVersion(): CheckResult {
  const version = typeof Bun !== "undefined" ? Bun.version : null;
  if (!version) {
    return { ok: true, label: "Runtime", detail: "Running as compiled binary" };
  }
  const major = parseInt(version.split(".")[0], 10);
  return major >= 1
    ? { ok: true, label: "Bun version", detail: `v${version}` }
    : { ok: false, label: "Bun version", detail: `v${version} — Bun >= 1.0 required` };
}

export async function checkConfig(): Promise<CheckResult> {
  const config = await loadConfig();
  if (!config) {
    return {
      ok: false,
      label: "Config file",
      detail: `Not found — run vaultchat to create one (expected at ${getConfigDir()}/config.json)`,
    };
  }
  return { ok: true, label: "Config file", detail: `${getConfigDir()}/config.json` };
}

export async function checkActiveProvider(): Promise<CheckResult> {
  const config = await loadConfig();
  if (!config) {
    return { ok: false, label: "Active provider", detail: "No config loaded" };
  }

  const { activeProvider } = config;
  const available = listProviders();
  if (!available.includes(activeProvider)) {
    return {
      ok: false,
      label: "Active provider",
      detail: `"${activeProvider}" is not a registered provider (available: ${available.join(", ")})`,
    };
  }

  return { ok: true, label: "Active provider", detail: activeProvider };
}

export async function checkApiKey(): Promise<CheckResult> {
  const config = await loadConfig();
  if (!config) {
    return { ok: false, label: "API key", detail: "No config loaded" };
  }

  const { activeProvider, providers } = config;
  const providerConfig = providers[activeProvider];

  if (!providerConfig?.apiKey) {
    return {
      ok: false,
      label: "API key",
      detail: `No API key configured for ${activeProvider}`,
    };
  }

  // Report that a key is set without leaking it
  const masked = providerConfig.apiKey.slice(0, 6) + "..." + providerConfig.apiKey.slice(-4);
  return { ok: true, label: "API key", detail: `${activeProvider}: ${masked}` };
}

export async function checkProviderReachability(): Promise<CheckResult> {
  const config = await loadConfig();
  if (!config) {
    return { ok: false, label: "Provider reachability", detail: "No config loaded" };
  }

  const { activeProvider, providers } = config;
  const providerConfig = providers[activeProvider];
  if (!providerConfig?.apiKey) {
    return { ok: false, label: "Provider reachability", detail: "No API key to test with" };
  }

  try {
    const provider = getProvider(activeProvider);
    const valid = await provider.validateKey(providerConfig.apiKey);
    return valid
      ? { ok: true, label: "Provider reachability", detail: `${activeProvider} — key validated` }
      : { ok: false, label: "Provider reachability", detail: `${activeProvider} — key rejected` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, label: "Provider reachability", detail: `${activeProvider} — ${msg}` };
  }
}

export async function checkVaultDirectory(): Promise<CheckResult> {
  const cwd = process.cwd();
  try {
    const entries = await Array.fromAsync(new Bun.Glob("*.md").scan({ cwd, onlyFiles: true }));
    return {
      ok: true,
      label: "Vault directory",
      detail: `${cwd} (${entries.length} markdown file${entries.length !== 1 ? "s" : ""})`,
    };
  } catch {
    return { ok: false, label: "Vault directory", detail: `Cannot read ${cwd}` };
  }
}

// ── Runner ─────────────────────────────────────────────────────────

export async function runAllChecks(): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  results.push(checkBunVersion());
  results.push(await checkConfig());
  results.push(await checkActiveProvider());
  results.push(await checkApiKey());
  results.push(await checkProviderReachability());
  results.push(await checkVaultDirectory());

  return results;
}

export interface DiagnosticReport {
  version: string;
  timestamp: string;
  cwd: string;
  passed: number;
  failed: number;
  results: CheckResult[];
}

export function buildReport(results: CheckResult[]): DiagnosticReport {
  return {
    version: getVersion(),
    timestamp: new Date().toISOString(),
    cwd: process.cwd(),
    passed: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  };
}

export function formatResults(results: CheckResult[]): string {
  const lines = results.map((r) => {
    const icon = r.ok ? "\x1b[32m[PASS]\x1b[0m" : "\x1b[31m[FAIL]\x1b[0m";
    const detail = r.detail ? ` — ${r.detail}` : "";
    return `  ${icon} ${r.label}${detail}`;
  });

  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;

  lines.push("");
  if (failed === 0) {
    lines.push(`\x1b[32mAll ${passed} checks passed.\x1b[0m`);
  } else {
    lines.push(`\x1b[31m${failed} of ${passed + failed} checks failed.\x1b[0m`);
  }

  return lines.join("\n");
}
