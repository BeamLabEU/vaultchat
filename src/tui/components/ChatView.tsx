import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Box, Text, useInput } from "ink";
import { TextInput } from "@inkjs/ui";
import { StreamingText } from "./StreamingText.tsx";
import { renderMarkdown } from "../../markdown/render.ts";
import type { Message } from "../../markdown/types.ts";

const ROLE_COLORS: Record<string, string> = {
  user: "blue",
  assistant: "green",
  system: "yellow",
  context: "magenta",
};

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
  onSendMessage: (text: string) => void;
  onCancelStreaming: () => void;
  scrollRef?: React.MutableRefObject<{ scrollBy: (delta: number) => void; getState: () => string } | null>;
}

/**
 * Pre-render all messages into an array of lines for line-based scrolling.
 */
function renderMessagesToLines(messages: Message[]): string[] {
  const lines: string[] = [];
  for (const msg of messages) {
    const color = ROLE_COLORS[msg.role] ?? "white";
    const label = ROLE_LABELS[msg.role] ?? msg.role;
    // Role header as a special tagged line
    lines.push(`\x1b_ROLE:${color}:${label}\x1b\\`);
    const rendered = msg.content ? renderMarkdown(msg.content) : "";
    const contentLines = rendered.split("\n");
    lines.push(...contentLines);
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
  onSendMessage,
  onCancelStreaming,
  scrollRef,
}: ChatViewProps) {
  // scrollOffset = -1 means pinned to bottom
  const [scrollOffset, setScrollOffset] = useState(-1);
  const prevMessageCount = useRef(messages.length);

  // Available lines for message content (minus title, input box, borders)
  const contentHeight = Math.max(1, viewportHeight - 6);

  // Pre-render messages to lines
  const allLines = useMemo(() => renderMessagesToLines(messages), [messages]);
  const totalLines = allLines.length;

  const maxOffset = Math.max(0, totalLines - contentHeight);
  const pinnedToBottom = scrollOffset === -1;
  const actualOffset = pinnedToBottom ? maxOffset : Math.min(scrollOffset, maxOffset);

  const scrollBy = useCallback((delta: number) => {
    setScrollOffset((current) => {
      const currentOffset = current === -1 ? maxOffset : Math.min(current, maxOffset);
      const next = currentOffset + delta;
      if (next >= maxOffset) return -1; // re-pin
      return Math.max(0, next);
    });
  }, [maxOffset]);

  const getState = useCallback(() => {
    return `off=${scrollOffset} actual=${actualOffset} max=${maxOffset} lines=${totalLines} vh=${contentHeight}`;
  }, [scrollOffset, actualOffset, maxOffset, totalLines, contentHeight]);

  useEffect(() => {
    if (scrollRef) scrollRef.current = { scrollBy, getState };
  }, [scrollRef, scrollBy, getState]);

  // Re-pin when new messages arrive
  useEffect(() => {
    if (messages.length !== prevMessageCount.current) {
      setScrollOffset(-1);
      prevMessageCount.current = messages.length;
    }
  }, [messages.length]);

  // Pin during streaming
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

  // Get visible slice of lines
  const visibleLines = allLines.slice(actualOffset, actualOffset + contentHeight);
  const hasHiddenAbove = actualOffset > 0;

  return (
    <Box
      flexDirection="column"
      flexGrow={1}
      borderStyle={focused ? "bold" : "single"}
      borderColor={focused ? "cyan" : "gray"}
      paddingX={1}
      overflowY="hidden"
    >
      <Box marginBottom={1} justifyContent="space-between">
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
          <Box flexDirection="column" flexGrow={1} overflowY="hidden">
            {hasHiddenAbove && (
              <Text dimColor>  ↑ scroll up for more</Text>
            )}
            {visibleLines.map((line, i) => {
              // Check for role header tag
              const roleMatch = line.match(/^\x1b_ROLE:(\w+):(.+)\x1b\\$/);
              if (roleMatch) {
                return (
                  <Text key={actualOffset + i} bold color={roleMatch[1]}>
                    {roleMatch[2]}
                  </Text>
                );
              }
              return <Text key={actualOffset + i}>{line}</Text>;
            })}

            {/* Streaming response */}
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
              <Box marginBottom={1}>
                <Text color="red">Error: {error}</Text>
              </Box>
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
