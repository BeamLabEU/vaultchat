import { homedir } from "node:os";
import { join } from "node:path";
import { mkdir } from "node:fs/promises";

const CONFIG_DIR = join(homedir(), ".vaultchat");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

export interface ProviderConfig {
  apiKey: string;
}

export interface Config {
  activeProvider: string;
  activeModel: string;
  providers: Record<string, ProviderConfig>;
  favoriteModels: string[];
}

export async function ensureConfigDir(): Promise<void> {
  await mkdir(CONFIG_DIR, { recursive: true });
  await mkdir(join(CONFIG_DIR, "providers"), { recursive: true });
}

export async function loadConfig(): Promise<Config | null> {
  const file = Bun.file(CONFIG_FILE);
  if (!(await file.exists())) return null;
  return file.json();
}

export async function saveConfig(config: Config): Promise<void> {
  await ensureConfigDir();
  await Bun.write(CONFIG_FILE, JSON.stringify(config, null, 2) + "\n");
}

export function getConfigDir(): string {
  return CONFIG_DIR;
}

export function getProviderCacheDir(provider: string): string {
  return join(CONFIG_DIR, "providers", provider);
}
