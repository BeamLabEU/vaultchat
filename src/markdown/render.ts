import { marked } from "marked";
import { markedTerminal } from "marked-terminal";

let configuredWidth = 80;

export function setRenderWidth(width: number) {
  configuredWidth = width;
  marked.setOptions({});
  marked.use(markedTerminal({ width: configuredWidth }));
}

// Initial setup
marked.use(markedTerminal({ width: configuredWidth }));

export function renderMarkdown(content: string): string {
  const rendered = marked.parse(content);
  if (typeof rendered !== "string") return content;
  return rendered.replace(/\n+$/, "");
}

/**
 * Strip ANSI escape codes to get the visible character length of a string.
 */
function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "").replace(/\x1b[_\[][^\x1b]*\x1b\\/g, "");
}

/**
 * Wrap a line to fit within the given width, accounting for ANSI codes.
 * Returns multiple lines if the visible content exceeds width.
 */
function wrapLine(line: string, width: number): string[] {
  if (width <= 0) return [line];
  const visible = stripAnsi(line);
  if (visible.length <= width) return [line];

  // Simple character-level wrap preserving ANSI sequences
  const result: string[] = [];
  let current = "";
  let visibleLen = 0;
  let i = 0;

  while (i < line.length) {
    // Check for ANSI escape sequence
    const ansiMatch = line.slice(i).match(/^(\x1b\[[0-9;]*[a-zA-Z]|\x1b[_\[][^\x1b]*\x1b\\)/);
    if (ansiMatch) {
      current += ansiMatch[0];
      i += ansiMatch[0].length;
      continue;
    }

    current += line[i];
    visibleLen++;
    i++;

    if (visibleLen >= width) {
      result.push(current);
      current = "";
      visibleLen = 0;
    }
  }

  if (current) result.push(current);
  return result.length > 0 ? result : [""];
}

/**
 * Wrap all lines to fit the given terminal width.
 */
export function wrapLines(lines: string[], width: number): string[] {
  const result: string[] = [];
  for (const line of lines) {
    result.push(...wrapLine(line, width));
  }
  return result;
}
