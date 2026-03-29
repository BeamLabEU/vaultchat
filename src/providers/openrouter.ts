import type { LLMProvider, ModelInfo, ChatParams } from "./types.ts";
import type { Message } from "../markdown/types.ts";

const BASE_URL = "https://openrouter.ai/api/v1";

interface OpenRouterModel {
  id: string;
  name: string;
  context_length?: number;
  pricing?: { prompt: string; completion: string };
}

interface OpenRouterModelsResponse {
  data: OpenRouterModel[];
}

interface SSEDelta {
  content?: string;
}

interface SSEChoice {
  delta: SSEDelta;
  finish_reason?: string | null;
}

interface SSEChunk {
  choices: SSEChoice[];
}

function formatMessages(messages: Message[]) {
  return messages.map((m) => ({
    role: m.role === "context" ? "system" : m.role,
    content: m.content,
  }));
}

export class OpenRouterProvider implements LLMProvider {
  name = "openrouter";

  async validateKey(apiKey: string): Promise<boolean> {
    try {
      const res = await fetch(`${BASE_URL}/auth/key`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async listModels(apiKey: string): Promise<ModelInfo[]> {
    const res = await fetch(`${BASE_URL}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch models: ${res.status} ${res.statusText}`);
    }

    const data = (await res.json()) as OpenRouterModelsResponse;

    return data.data.map((m) => ({
      id: m.id,
      name: m.name,
      provider: "openrouter",
      contextLength: m.context_length,
      pricing: m.pricing
        ? {
            prompt: parseFloat(m.pricing.prompt),
            completion: parseFloat(m.pricing.completion),
          }
        : undefined,
    }));
  }

  async chat(params: ChatParams): Promise<void> {
    const { apiKey, model, messages, onChunk, signal, params: llmParams } = params;

    const body: Record<string, unknown> = {
      model,
      messages: formatMessages(messages),
      stream: true,
      ...llmParams,
    };

    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://github.com/BeamLabEU/vaultchat",
        "X-Title": "VaultChat",
      },
      body: JSON.stringify(body),
      signal,
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Chat request failed: ${res.status} ${err}`);
    }

    if (!res.body) {
      throw new Error("No response body");
    }

    await this.processSSEStream(res.body, onChunk);
  }

  private async processSSEStream(
    body: ReadableStream<Uint8Array>,
    onChunk: ChatParams["onChunk"]
  ): Promise<void> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        // Keep the last incomplete line in the buffer
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;

          const data = trimmed.slice(6);
          if (data === "[DONE]") {
            onChunk({ content: "", done: true });
            return;
          }

          try {
            const chunk = JSON.parse(data) as SSEChunk;
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              onChunk({ content, done: false });
            }
          } catch {
            // Skip malformed JSON lines
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    // Stream ended without [DONE]
    onChunk({ content: "", done: true });
  }
}
