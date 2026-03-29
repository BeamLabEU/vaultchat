import { test, expect, describe } from "bun:test";
import { getProvider, listProviders } from "../registry.ts";

describe("provider registry", () => {
  test("lists available providers", () => {
    const providers = listProviders();
    expect(providers).toContain("openrouter");
  });

  test("returns openrouter provider", () => {
    const provider = getProvider("openrouter");
    expect(provider.name).toBe("openrouter");
  });

  test("throws for unknown provider", () => {
    expect(() => getProvider("nonexistent")).toThrow("Unknown provider");
  });
});

describe("openrouter provider", () => {
  const provider = getProvider("openrouter");

  test("rejects invalid API key", async () => {
    const valid = await provider.validateKey("sk-invalid-key-12345");
    expect(valid).toBe(false);
  });

  test("rejects empty API key", async () => {
    const valid = await provider.validateKey("");
    expect(valid).toBe(false);
  });
});

// Integration tests — only run when OPENROUTER_API_KEY is set
const apiKey = process.env["OPENROUTER_API_KEY"];

describe.if(!!apiKey)("openrouter integration", () => {
  const provider = getProvider("openrouter");

  test("validates a real API key", async () => {
    const valid = await provider.validateKey(apiKey!);
    expect(valid).toBe(true);
  });

  test("lists models", async () => {
    const models = await provider.listModels(apiKey!);
    expect(models.length).toBeGreaterThan(0);
    expect(models[0]!.id).toBeDefined();
    expect(models[0]!.name).toBeDefined();
    expect(models[0]!.provider).toBe("openrouter");
  });

  test("streams a chat response", async () => {
    const chunks: string[] = [];
    let isDone = false;

    await provider.chat({
      apiKey: apiKey!,
      model: "openai/gpt-4.1-nano",
      messages: [{ role: "user", content: "Say hello in exactly 3 words." }],
      onChunk: (chunk) => {
        if (chunk.content) chunks.push(chunk.content);
        if (chunk.done) isDone = true;
      },
    });

    expect(isDone).toBe(true);
    expect(chunks.length).toBeGreaterThan(0);
    const fullResponse = chunks.join("");
    expect(fullResponse.length).toBeGreaterThan(0);
  });
});
