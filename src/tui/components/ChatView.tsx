import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Box, Text, useInput } from "ink";
import { TextInput } from "@inkjs/ui";
import { StreamingText } from "./StreamingText.tsx";
import { renderMarkdown, wrapLines, setRenderWidth } from "../../markdown/render.ts";
import { useTerminalSize } from "../../hooks/useTerminalSize.ts";
import type { Message } from "../../markdown/types.ts";

// ANSI color codes for role headers
const ROLE_ANSI: Record<string, string> = {
  user: "\x1b[1;34m",      // bold blue
  assistant: "\x1b[1;32m",  // bold green
  system: "\x1b[1;33m",     // bold yellow
  context: "\x1b[1;35m",    // bold magenta
};
const ANSI_RESET = "\x1b[0m";

const ROLE_LABELS: Record<string, string> = {
  user: "You",
  assistant: "Assistant",
  system: "System",
  context: "Context",
};

interface ChatViewProps {
  title: string;
  messages: Message[];
  focused: boolean;
  viewportHeight: number;
  isStreaming: boolean;
  streamingContent: string;
  error: string | null;
  hasConversation: boolean;
  originalContent?: string;
  onSendMessage: (text: string) => void;
  onCancelStreaming: () => void;
  scrollRef?: React.MutableRefObject<{ scrollBy: (delta: number) => void } | null>;
}

/**
 * Pre-render all messages into an array of plain text lines.
 * Role headers use ANSI codes directly so the whole thing can be
 * joined into a single string and rendered as one <Text> element.
 */
function renderMessagesToLines(
  messages: Message[],
  panelWidth: number,
  originalContent?: string
): string[] {
  const lines: string[] = [];

  // Show original non-chat content at the top
  if (originalContent) {
    lines.push(`\x1b[1;35mOriginal Note${ANSI_RESET}`);
    const rendered = renderMarkdown(originalContent);
    const contentLines = rendered.split("\n");
    const wrapped = wrapLines(contentLines, panelWidth);
    lines.push(...wrapped);
    lines.push("");
    lines.push(`\x1b[2m${"─".repeat(Math.min(40, panelWidth))}${ANSI_RESET}`);
    lines.push("");
  }

  for (const msg of messages) {
    const ansi = ROLE_ANSI[msg.role] ?? "";
    const label = ROLE_LABELS[msg.role] ?? msg.role;
    lines.push(`${ansi}${label}${ANSI_RESET}`);
    const rendered = msg.content ? renderMarkdown(msg.content) : "";
    const contentLines = rendered.split("\n");
    const wrapped = wrapLines(contentLines, panelWidth);
    lines.push(...wrapped);
    lines.push(""); // blank line between messages
  }
  return lines;
}

export function ChatView({
  title,
  messages,
  focused,
  viewportHeight,
  isStreaming,
  streamingContent,
  error,
  hasConversation,
  originalContent,
  onSendMessage,
  onCancelStreaming,
  scrollRef,
}: ChatViewProps) {
  const { columns: termColumns } = useTerminalSize();
  const [scrollOffset, setScrollOffset] = useState(-1);
  const prevMessageCount = useRef(messages.length);

  // Panel width: terminal width minus file tree (32) minus chat borders (2) + padding (2) + safety margin (2)
  const panelWidth = Math.max(20, termColumns - 32 - 8);

  // title(1) + title margin(1) + scroll indicator(1) + input border(1) + input(1) + input border(1) + bottom border(1) = 7
  const contentHeight = Math.max(1, viewportHeight - 7);

  // Pre-render messages to lines
  const allLines = useMemo(() => {
    setRenderWidth(panelWidth);
    return renderMessagesToLines(messages, panelWidth, originalContent);
  }, [messages, panelWidth, originalContent]);
  const totalLines = allLines.length;

  const maxOffset = Math.max(0, totalLines - contentHeight);
  const pinnedToBottom = scrollOffset === -1;
  const actualOffset = pinnedToBottom ? maxOffset : Math.min(scrollOffset, maxOffset);

  const scrollBy = useCallback((delta: number) => {
    setScrollOffset((current) => {
      const currentOffset = current === -1 ? maxOffset : Math.min(current, maxOffset);
      const next = currentOffset + delta;
      if (next >= maxOffset) return -1;
      return Math.max(0, next);
    });
  }, [maxOffset]);

  useEffect(() => {
    if (scrollRef) scrollRef.current = { scrollBy };
  }, [scrollRef, scrollBy]);

  useEffect(() => {
    if (messages.length !== prevMessageCount.current) {
      setScrollOffset(-1);
      prevMessageCount.current = messages.length;
    }
  }, [messages.length]);

  useEffect(() => {
    if (isStreaming) setScrollOffset(-1);
  }, [isStreaming]);

  useInput(
    (input, key) => {
      if (!focused) return;
      if (key.upArrow) scrollBy(-5);
      if (key.downArrow) scrollBy(5);
      if (key.escape && isStreaming) {
        onCancelStreaming();
      }
    },
  );

  // When streaming, reserve lines for the streaming block (header + content/spinner)
  const streamingLines = isStreaming ? Math.min(
    Math.max(2, (streamingContent ? streamingContent.split("\n").length : 0) + 2),
    Math.floor(contentHeight / 2),
  ) : 0;
  const messageHeight = contentHeight - streamingLines;

  // Join visible lines into a single string for one <Text> render
  const visibleLines = allLines.slice(actualOffset, actualOffset + messageHeight);
  const visibleText = ANSI_RESET + visibleLines.join("\n");
  const hasHiddenAbove = actualOffset > 0;

  return (
    <Box
      flexDirection="column"
      flexGrow={1}
      borderStyle="single"
      borderColor={focused ? "cyan" : "gray"}
      paddingX={1}
    >
      <Box justifyContent="space-between" marginBottom={1}>
        <Box>
          <Text bold>{title}</Text>
          {messages.length > 0 && (
            <Text dimColor> ({messages.length} messages)</Text>
          )}
        </Box>
        {!pinnedToBottom && totalLines > 0 && (
          <Text color="yellow">[{maxOffset - actualOffset}/{maxOffset}]</Text>
        )}
      </Box>

      {!hasConversation ? (
        <Box flexGrow={1} justifyContent="center" alignItems="center">
          <Text dimColor>
            Select a file or create a new chat to get started
          </Text>
        </Box>
      ) : (
        <>
          <Box flexDirection="column" flexGrow={1}>
            {hasHiddenAbove && (
              <Text dimColor>  ↑ scroll up for more</Text>
            )}
            <Text>{visibleText}</Text>

            {isStreaming && (
              <Box flexDirection="column" marginBottom={1}>
                <Text bold color="green">
                  Assistant
                </Text>
                <StreamingText
                  content={streamingContent}
                  isStreaming={isStreaming}
                />
              </Box>
            )}

            {error && (
              <Text color="red">Error: {error}</Text>
            )}
          </Box>

          <Box borderStyle="single" borderColor="gray" paddingX={1}>
            {isStreaming ? (
              <Text dimColor>Streaming... (Escape to cancel)</Text>
            ) : focused ? (
              <Box>
                <Text color="blue" bold>{">"} </Text>
                <TextInput
                  placeholder="Type a message..."
                  onSubmit={(value) => {
                    if (value.trim()) {
                      onSendMessage(value.trim());
                    }
                  }}
                />
              </Box>
            ) : (
              <Text dimColor>Tab to focus and type a message...</Text>
            )}
          </Box>
        </>
      )}
    </Box>
  );
}
