import { marked } from "marked";
import { markedTerminal } from "marked-terminal";

marked.use(markedTerminal());

export function renderMarkdown(content: string): string {
  const rendered = marked.parse(content);
  if (typeof rendered !== "string") return content;
  // Trim trailing newlines that marked adds
  return rendered.replace(/\n+$/, "");
}
