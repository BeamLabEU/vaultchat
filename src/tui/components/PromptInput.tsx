import React, { useState, useMemo, useCallback } from "react";
import { Text, useInput } from "ink";

interface PromptInputProps {
  /** Available character width for text (excluding prefix, borders, padding) */
  width: number;
  /** Max visible text lines before scrolling */
  maxLines: number;
  /** When true, input ignores keystrokes */
  isDisabled: boolean;
  placeholder?: string;
  onSubmit: (value: string) => void;
}

/**
 * Multi-line-aware text input with Up/Down cursor navigation across
 * visually wrapped lines. Text wraps at `width` characters (terminal
 * hard-wrap). Enter submits; all editing stays single-"logical"-line
 * but the cursor can move vertically across visual lines.
 */
export const PromptInput = React.memo(function PromptInput({
  width,
  maxLines,
  isDisabled,
  placeholder = "",
  onSubmit,
}: PromptInputProps) {
  const [value, setValue] = useState("");
  const [cursor, setCursor] = useState(0);

  const reset = useCallback(() => {
    setValue("");
    setCursor(0);
  }, []);

  // Wrap text into visual lines at `width` characters
  const visualLines = useMemo(() => {
    if (value.length === 0) return [""];
    const lines: string[] = [];
    for (let i = 0; i < value.length; i += width) {
      lines.push(value.slice(i, i + width));
    }
    // If cursor sits exactly at the end of a full line, add empty line for it
    if (value.length > 0 && value.length % width === 0) lines.push("");
    return lines;
  }, [value, width]);

  const cursorRow = width > 0 ? Math.floor(cursor / width) : 0;
  const cursorCol = width > 0 ? cursor % width : 0;

  // Keep cursor row visible
  const scrollOffset = useMemo(() => {
    if (visualLines.length <= maxLines) return 0;
    if (cursorRow < maxLines) return 0;
    return Math.min(cursorRow - maxLines + 1, visualLines.length - maxLines);
  }, [visualLines.length, maxLines, cursorRow]);

  useInput(
    (input, key) => {
      if (key.return) {
        if (value.trim()) {
          onSubmit(value.trim());
          reset();
        }
        return;
      }

      if (key.leftArrow) {
        setCursor((c) => Math.max(0, c - 1));
        return;
      }
      if (key.rightArrow) {
        setCursor((c) => Math.min(value.length, c + 1));
        return;
      }
      if (key.upArrow) {
        setCursor((c) => Math.max(0, c - width));
        return;
      }
      if (key.downArrow) {
        setCursor((c) => Math.min(value.length, c + width));
        return;
      }
      if (key.home) {
        // Start of current visual line
        setCursor((c) => Math.floor(c / width) * width);
        return;
      }
      if (key.end) {
        // End of current visual line (or end of text)
        setCursor((c) => Math.min(value.length, Math.floor(c / width) * width + width));
        return;
      }

      if (key.backspace || key.delete) {
        if (cursor > 0) {
          setValue((v) => v.slice(0, cursor - 1) + v.slice(cursor));
          setCursor((c) => c - 1);
        }
        return;
      }

      // Ignore control sequences so they don't get inserted as text
      if (key.tab || key.escape || key.ctrl || key.meta) return;

      // Insert printable text
      if (input) {
        setValue((v) => v.slice(0, cursor) + input + v.slice(cursor));
        setCursor((c) => c + input.length);
      }
    },
    { isActive: !isDisabled },
  );

  // Render visible lines with cursor highlight
  if (value.length === 0) {
    // Placeholder
    if (isDisabled) {
      return <Text dimColor>{placeholder}</Text>;
    }
    // Show cursor on first char of placeholder
    if (placeholder.length > 0) {
      return (
        <Text>
          {"\x1b[7m"}{placeholder[0]}{"\x1b[27m"}
          <Text dimColor>{placeholder.slice(1)}</Text>
        </Text>
      );
    }
    return <Text>{"\x1b[7m"} {"\x1b[27m"}</Text>;
  }

  const visible = visualLines.slice(scrollOffset, scrollOffset + maxLines);
  const rendered = visible.map((line, i) => {
    const row = scrollOffset + i;
    if (!isDisabled && row === cursorRow) {
      const before = line.slice(0, cursorCol);
      const cursorChar = cursorCol < line.length ? line[cursorCol]! : " ";
      const after = cursorCol < line.length ? line.slice(cursorCol + 1) : "";
      return `${before}\x1b[7m${cursorChar}\x1b[27m${after}`;
    }
    return line;
  });

  return <Text>{rendered.join("\n")}</Text>;
});
