import matter from "gray-matter";
import type { Conversation, Frontmatter, Message, MessageRole } from "./types.ts";

const ROLE_PATTERN = /^######\s+(user|assistant|system|context)\s*$/;
const FENCE_PATTERN = /^(`{3,}|~{3,})/;
const SEPARATOR = /^-{3,}\s*$/;

/**
 * Parse a VaultChat markdown file into a Conversation.
 *
 * Key challenge: `---` appears as both message separators AND inside fenced
 * code blocks. We track code fence state line-by-line to avoid false splits.
 */
export function parseConversation(
  content: string,
  filePath: string
): Conversation {
  const { data, content: body } = matter(content);
  const frontmatter = data as Frontmatter;
  const messages = parseMessages(body);

  return { frontmatter, messages, filePath };
}

function parseMessages(body: string): Message[] {
  const sections = splitOnSeparators(body);
  const messages: Message[] = [];

  for (const section of sections) {
    const trimmed = section.trim();
    if (!trimmed) continue;

    const lines = trimmed.split("\n");
    const firstLine = lines[0]!.trim();
    const roleMatch = firstLine.match(ROLE_PATTERN);

    if (roleMatch) {
      const role = roleMatch[1] as MessageRole;
      const content = lines.slice(1).join("\n").trim();
      messages.push({ role, content });
    }
    // Skip sections that don't start with a role marker
  }

  return messages;
}

/**
 * Split the body on `---` lines, but only when outside fenced code blocks.
 */
function splitOnSeparators(body: string): string[] {
  const lines = body.split("\n");
  const sections: string[] = [];
  let current: string[] = [];
  let inFence = false;
  let fenceChar = "";
  let fenceLen = 0;

  for (const line of lines) {
    if (inFence) {
      // Check if this line closes the fence
      const match = line.match(FENCE_PATTERN);
      if (match && match[1]![0] === fenceChar && match[1]!.length >= fenceLen) {
        inFence = false;
      }
      current.push(line);
    } else {
      // Check if this line opens a fence
      const match = line.match(FENCE_PATTERN);
      if (match) {
        inFence = true;
        fenceChar = match[1]![0]!;
        fenceLen = match[1]!.length;
        current.push(line);
      } else if (SEPARATOR.test(line.trim())) {
        // This is a message separator
        sections.push(current.join("\n"));
        current = [];
      } else {
        current.push(line);
      }
    }
  }

  // Don't forget the last section
  if (current.length > 0) {
    sections.push(current.join("\n"));
  }

  return sections;
}
