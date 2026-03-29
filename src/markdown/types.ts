export type MessageRole = "user" | "assistant" | "system" | "context";

export interface Message {
  role: MessageRole;
  content: string;
}

export interface Frontmatter {
  title: string;
  date: string;
  model: string;
  provider: string;
  tags?: string[];
  context?: string[];
  params?: Record<string, unknown>;
  [key: string]: unknown; // allow extra fields (e.g. parent, branch_from)
}

export interface Conversation {
  frontmatter: Frontmatter;
  messages: Message[];
  filePath: string;
}
