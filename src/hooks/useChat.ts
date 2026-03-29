import { useState, useCallback, useRef } from "react";
import { parseConversation } from "../markdown/parser.ts";
import { serializeConversation } from "../markdown/serializer.ts";
import { getProvider } from "../providers/registry.ts";
import {
  resolveContextWikilinks,
  resolveInlineWikilinks,
} from "../vault/wikilinks.ts";
import type { Conversation, Message } from "../markdown/types.ts";
import type { Config } from "../vault/config.ts";
import { dirname, join } from "node:path";
import { rename } from "node:fs/promises";

export function useChat(config: Config) {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const messageCountRef = useRef(0);

  const loadConversation = useCallback(async (filePath: string) => {
    const file = Bun.file(filePath);
    if (!(await file.exists())) return;
    const content = await file.text();
    const conv = parseConversation(content, filePath);
    setConversation(conv);
    setError(null);
    messageCountRef.current = conv.messages.filter(
      (m) => m.role === "user"
    ).length;
  }, []);

  const saveConversation = useCallback(async (conv: Conversation) => {
    const content = serializeConversation(conv);
    await Bun.write(conv.filePath, content);
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!conversation || isStreaming) return;

      setError(null);
      const dir = dirname(conversation.filePath);

      // Add user message
      const userMessage: Message = { role: "user", content: text };
      const updatedMessages = [...conversation.messages, userMessage];

      // Resolve wikilink context
      let contextMessages: Message[] = [];

      // Frontmatter context links
      if (conversation.frontmatter.context?.length) {
        const contextContent = await resolveContextWikilinks(
          conversation.frontmatter.context,
          dir
        );
        if (contextContent) {
          contextMessages.push({ role: "context", content: contextContent });
        }
      }

      // Inline wikilinks in the user message
      const inlineContext = await resolveInlineWikilinks(text, dir);
      if (inlineContext) {
        contextMessages.push({
          role: "context",
          content: inlineContext,
        });
      }

      // Build the API message list: context first, then conversation
      const apiMessages: Message[] = [...contextMessages, ...updatedMessages];

      // Update conversation with user message
      const convWithUser: Conversation = {
        ...conversation,
        messages: updatedMessages,
      };
      setConversation(convWithUser);
      await saveConversation(convWithUser);

      // Start streaming
      setIsStreaming(true);
      setStreamingContent("");
      const abortController = new AbortController();
      abortRef.current = abortController;

      let fullContent = "";

      try {
        const providerConfig = config.providers[config.activeProvider];
        if (!providerConfig) {
          throw new Error(`No API key configured for ${config.activeProvider}`);
        }

        const provider = getProvider(config.activeProvider);
        await provider.chat({
          apiKey: providerConfig.apiKey,
          model: config.activeModel,
          messages: apiMessages,
          signal: abortController.signal,
          onChunk: (chunk) => {
            if (chunk.content) {
              fullContent += chunk.content;
              setStreamingContent(fullContent);
            }
          },
        });
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          // User cancelled — save what we have
        } else {
          const msg =
            err instanceof Error ? err.message : "Unknown error occurred";
          setError(msg);
        }
      }

      // Add assistant message and save
      const assistantMessage: Message = {
        role: "assistant",
        content: fullContent,
      };
      const finalMessages = [...updatedMessages, assistantMessage];
      const finalConv: Conversation = {
        ...conversation,
        messages: finalMessages,
      };
      setConversation(finalConv);
      setIsStreaming(false);
      setStreamingContent("");
      abortRef.current = null;
      await saveConversation(finalConv);

      // Auto-rename after first exchange
      messageCountRef.current += 1;
      if (messageCountRef.current === 1 && fullContent) {
        await autoRenameChat(finalConv, config);
      }
    },
    [conversation, isStreaming, config, saveConversation]
  );

  const cancelStreaming = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const messages: Message[] = conversation?.messages ?? [];
  const title = conversation?.frontmatter.title ?? "No Chat Selected";

  return {
    conversation,
    messages,
    title,
    streamingContent,
    isStreaming,
    error,
    loadConversation,
    sendMessage,
    cancelStreaming,
    setConversation,
  };
}

async function autoRenameChat(
  conversation: Conversation,
  config: Config
): Promise<void> {
  try {
    const providerConfig = config.providers[config.activeProvider];
    if (!providerConfig) return;

    const provider = getProvider(config.activeProvider);
    let filename = "";

    await provider.chat({
      apiKey: providerConfig.apiKey,
      model: config.activeModel,
      messages: [
        {
          role: "system",
          content:
            "Generate a short filename (3-5 words, kebab-case, no extension) for this conversation. Reply with ONLY the filename, nothing else.",
        },
        {
          role: "user",
          content: conversation.messages
            .slice(0, 2)
            .map((m) => `${m.role}: ${m.content}`)
            .join("\n\n"),
        },
      ],
      onChunk: (chunk) => {
        if (chunk.content) filename += chunk.content;
      },
    });

    filename = filename.trim().replace(/[^a-z0-9-]/gi, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").toLowerCase();

    if (!filename || filename.length < 3) return;

    const dir = dirname(conversation.filePath);
    const newPath = join(dir, `${filename}.md`);

    // Don't rename if target exists
    const exists = await Bun.file(newPath).exists();
    if (exists) return;

    // Update frontmatter title
    const titleFromFilename = filename.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    conversation.frontmatter.title = titleFromFilename;
    const content = serializeConversation(conversation);
    await Bun.write(conversation.filePath, content);

    // Rename file
    await rename(conversation.filePath, newPath);
    conversation.filePath = newPath;
  } catch {
    // Auto-rename is best-effort — don't crash if it fails
  }
}
