import matter from "gray-matter";
import type { Conversation, Message, Frontmatter } from "./types.ts";

/**
 * Serialize a Conversation back to a markdown string.
 * Original non-chat content is preserved between frontmatter and messages.
 */
export function serializeConversation(conversation: Conversation): string {
  const frontmatterStr = serializeFrontmatter(conversation.frontmatter);
  const messagesStr = serializeMessages(conversation.messages);

  if (conversation.originalContent) {
    const separator = conversation.messages.length > 0 ? "\n\n-----\n" : "";
    return frontmatterStr + "\n" + conversation.originalContent + "\n" + separator + messagesStr;
  }

  return frontmatterStr + "\n" + messagesStr;
}

function serializeFrontmatter(frontmatter: Frontmatter): string {
  // gray-matter.stringify takes content and data, returns frontmatter + content
  // We pass empty content since we handle messages separately
  return matter.stringify("", frontmatter).trim() + "\n";
}

function serializeMessages(messages: Message[]): string {
  if (messages.length === 0) return "";

  const parts = messages.map((msg) => {
    const header = `###### ${msg.role}`;
    if (msg.content) {
      return `${header}\n${msg.content}`;
    }
    return header;
  });

  return "\n" + parts.join("\n\n-----\n\n") + "\n";
}
