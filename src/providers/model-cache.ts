import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { getProviderCacheDir } from "../vault/config.ts";
import type { ModelInfo } from "./types.ts";

const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

interface ModelCache {
  timestamp: number;
  models: ModelInfo[];
}

function getCachePath(provider: string): string {
  return join(getProviderCacheDir(provider), "models.json");
}

export async function getCachedModels(
  provider: string
): Promise<ModelInfo[] | null> {
  const path = getCachePath(provider);
  const file = Bun.file(path);

  if (!(await file.exists())) return null;

  try {
    const cache = (await file.json()) as ModelCache;
    const age = Date.now() - cache.timestamp;
    if (age > CACHE_MAX_AGE_MS) return null;
    return cache.models;
  } catch {
    return null;
  }
}

export async function cacheModels(
  provider: string,
  models: ModelInfo[]
): Promise<void> {
  const dir = getProviderCacheDir(provider);
  await mkdir(dir, { recursive: true });

  const cache: ModelCache = {
    timestamp: Date.now(),
    models,
  };

  await Bun.write(getCachePath(provider), JSON.stringify(cache, null, 2));
}
