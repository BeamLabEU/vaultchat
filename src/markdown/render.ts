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
 * Breaks at word boundaries (spaces) when possible, falls back to
 * character-level wrap for long unbroken strings.
 */
function wrapLine(line: string, width: number): string[] {
  if (width <= 0) return [line];
  const visible = stripAnsi(line);
  if (visible.length <= width) return [line];

  // Tokenize the line into segments: each is either an ANSI escape or a character
  const tokens: { raw: string; visible: string }[] = [];
  let i = 0;
  while (i < line.length) {
    const ansiMatch = line.slice(i).match(/^(\x1b\[[0-9;]*[a-zA-Z]|\x1b[_\[][^\x1b]*\x1b\\)/);
    if (ansiMatch) {
      tokens.push({ raw: ansiMatch[0], visible: "" });
      i += ansiMatch[0].length;
    } else {
      tokens.push({ raw: line[i]!, visible: line[i]! });
      i++;
    }
  }

  // Build lines with word-boundary wrapping
  const result: string[] = [];
  let currentRaw = "";
  let currentLen = 0;
  let lastSpaceIdx = -1;   // token index of last space on current line
  let rawAtLastSpace = "";  // currentRaw up to and including the space
  let lenAtLastSpace = 0;
  let lineStartToken = 0;

  for (let t = 0; t < tokens.length; t++) {
    const token = tokens[t]!;
    currentRaw += token.raw;
    currentLen += token.visible.length;

    if (token.visible === " ") {
      lastSpaceIdx = t;
      rawAtLastSpace = currentRaw;
      lenAtLastSpace = currentLen;
    }

    if (currentLen >= width) {
      if (lastSpaceIdx >= 0 && lastSpaceIdx > lineStartToken) {
        // Break at last space: push everything up to the space
        result.push(rawAtLastSpace.replace(/ $/, "")); // trim trailing space
        // Rebuild remainder from tokens after the space
        currentRaw = "";
        currentLen = 0;
        lineStartToken = lastSpaceIdx + 1;
        for (let r = lastSpaceIdx + 1; r <= t; r++) {
          currentRaw += tokens[r]!.raw;
          currentLen += tokens[r]!.visible.length;
        }
      } else {
        // No space found — hard break at width
        result.push(currentRaw);
        currentRaw = "";
        currentLen = 0;
        lineStartToken = t + 1;
      }
      lastSpaceIdx = -1;
      rawAtLastSpace = "";
      lenAtLastSpace = 0;
    }
  }

  if (currentRaw) result.push(currentRaw);
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
