import React, { useState, useEffect, useRef, useCallback } from "react";
import { Box, Text, useInput } from "ink";
import { TextInput } from "@inkjs/ui";
import { MessageBubble } from "./MessageBubble.tsx";
import { StreamingText } from "./StreamingText.tsx";
import type { Message } from "../../markdown/types.ts";

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
  // displayStart = index of the first message to show
  // -1 means "pinned to bottom" (auto-calculate from end)
  const [displayStart, setDisplayStart] = useState(-1);
  const prevMessageCount = useRef(messages.length);

  const availableHeight = viewportHeight - 5;
  const estimatedVisibleCount = Math.max(1, Math.floor(availableHeight / 3));

  // Calculate the actual start index
  const maxStart = Math.max(0, messages.length - estimatedVisibleCount);
  const pinnedToBottom = displayStart === -1;
  const actualStart = pinnedToBottom ? maxStart : Math.min(displayStart, maxStart);

  const scrollBy = useCallback((delta: number) => {
    setDisplayStart((current) => {
      // If pinned, unpin at the current bottom position first
      const currentStart = current === -1 ? maxStart : Math.min(current, maxStart);
      const next = currentStart + delta;

      // If scrolled to or past the end, re-pin
      if (next >= maxStart) return -1;

      return Math.max(0, next);
    });
  }, [maxStart]);

  // Expose scroll methods via ref
  const getState = useCallback(() => {
    return `ds=${displayStart} actual=${actualStart} maxStart=${maxStart} msgs=${messages.length} vis=${estimatedVisibleCount}`;
  }, [displayStart, actualStart, maxStart, messages.length, estimatedVisibleCount]);

  useEffect(() => {
    if (scrollRef) scrollRef.current = { scrollBy, getState };
  }, [scrollRef, scrollBy, getState]);

  // Re-pin when new messages arrive
  useEffect(() => {
    if (messages.length !== prevMessageCount.current) {
      setDisplayStart(-1);
      prevMessageCount.current = messages.length;
    }
  }, [messages.length]);

  // Pin during streaming
  useEffect(() => {
    if (isStreaming) setDisplayStart(-1);
  }, [isStreaming]);

  useInput(
    (input, key) => {
      if (!focused) return;
      if (key.upArrow) scrollBy(-1);
      if (key.downArrow) scrollBy(1);
      if (key.escape && isStreaming) {
        onCancelStreaming();
      }
    },
  );

  const visibleMessages = messages.slice(actualStart);
  const hasHiddenAbove = actualStart > 0;

  return (
    <Box
      flexDirection="column"
      flexGrow={1}
      borderStyle={focused ? "bold" : "single"}
      borderColor={focused ? "cyan" : "gray"}
      paddingX={1}
      overflowY="hidden"
    >
      <Box marginBottom={1}>
        <Text bold>{title}</Text>
        {messages.length > 0 && (
          <Text dimColor> ({messages.length} messages)</Text>
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
              <Text dimColor>  ↑ {actualStart} earlier messages</Text>
            )}
            {visibleMessages.map((msg, i) => (
              <MessageBubble key={actualStart + i} message={msg} />
            ))}

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
