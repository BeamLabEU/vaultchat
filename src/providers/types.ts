import type { Message } from "../markdown/types.ts";

export interface StreamChunk {
  content: string;
  done: boolean;
}

export interface ModelInfo {
  id: string; // e.g. "anthropic/claude-sonnet-4"
  name: string; // e.g. "Claude Sonnet 4"
  provider: string; // e.g. "openrouter"
  contextLength?: number;
  pricing?: { prompt: number; completion: number };
}

export interface ChatParams {
  apiKey: string;
  model: string;
  messages: Message[];
  onChunk: (chunk: StreamChunk) => void;
  signal?: AbortSignal;
  params?: Record<string, unknown>;
}

export interface LLMProvider {
  name: string;
  validateKey(apiKey: string): Promise<boolean>;
  listModels(apiKey: string): Promise<ModelInfo[]>;
  chat(params: ChatParams): Promise<void>;
}
