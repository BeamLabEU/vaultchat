import type { LLMProvider } from "./types.ts";
import { OpenRouterProvider } from "./openrouter.ts";

const providers: Record<string, LLMProvider> = {
  openrouter: new OpenRouterProvider(),
};

export function getProvider(name: string): LLMProvider {
  const provider = providers[name];
  if (!provider) {
    throw new Error(`Unknown provider: ${name}. Available: ${listProviders().join(", ")}`);
  }
  return provider;
}

export function listProviders(): string[] {
  return Object.keys(providers);
}
