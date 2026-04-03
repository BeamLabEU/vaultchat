import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Box, Text, useInput } from "ink";
import { PromptInput } from "./PromptInput.tsx";
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

export const ChatView = React.memo(function ChatView({
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

  // Input area: border(2) + status line(1) + up to 5 text lines = 8
  const INPUT_MAX_HEIGHT = 8;
  const INPUT_TEXT_LINES = INPUT_MAX_HEIGHT - 2; // subtract borders
  // Width available for prompt text: panel minus "> " prefix (2 chars)
  const promptTextWidth = Math.max(10, panelWidth - 2);
  // title(1) + title margin(1) + scroll indicator(1) + input area(8) = 11
  const contentHeight = Math.max(1, viewportHeight - 3 - INPUT_MAX_HEIGHT);

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
      // PageUp/PageDown scroll chat history (Up/Down reserved for prompt navigation)
      if (key.pageUp) scrollBy(-contentHeight);
      if (key.pageDown) scrollBy(contentHeight);
      if (key.escape && isStreaming) {
        onCancelStreaming();
      }
    },
  );

  // When streaming, reserve a fixed block for the streaming area so the message
  // text above doesn't jump around as the response grows
  const streamingReserve = isStreaming ? Math.max(3, Math.floor(contentHeight / 3)) : 0;
  const messageHeight = contentHeight - streamingReserve;

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
              <Box flexDirection="column" height={streamingReserve} overflow="hidden">
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

          <Box
            borderStyle="single"
            borderColor={focused && !isStreaming ? "blue" : "gray"}
            paddingX={1}
            flexDirection="column"
            height={INPUT_MAX_HEIGHT}
            overflow="hidden"
          >
            {isStreaming && (
              <Text dimColor>Streaming... (Escape to cancel)</Text>
            )}
            {!focused && !isStreaming && (
              <Text dimColor>Click or Tab to type</Text>
            )}
            <Box>
              <Text color={focused && !isStreaming ? "blue" : "gray"} bold={focused && !isStreaming}>{">"} </Text>
              <PromptInput
                width={promptTextWidth}
                maxLines={INPUT_TEXT_LINES}
                isDisabled={!focused || isStreaming}
                placeholder="Type a message..."
                onSubmit={onSendMessage}
              />
            </Box>
          </Box>
        </>
      )}
    </Box>
  );
});
