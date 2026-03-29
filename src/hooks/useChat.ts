import { useState, useCallback } from "react";
import { parseConversation } from "../markdown/parser.ts";
import type { Conversation, Message } from "../markdown/types.ts";

export function useChat() {
  const [conversation, setConversation] = useState<Conversation | null>(null);

  const loadConversation = useCallback(async (filePath: string) => {
    const file = Bun.file(filePath);
    if (!(await file.exists())) return;
    const content = await file.text();
    const conv = parseConversation(content, filePath);
    setConversation(conv);
  }, []);

  const messages: Message[] = conversation?.messages ?? [];
  const title = conversation?.frontmatter.title ?? "No Chat Selected";

  return {
    conversation,
    messages,
    title,
    loadConversation,
    setConversation,
  };
}
