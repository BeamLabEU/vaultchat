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
  scrollRef?: React.MutableRefObject<{ scrollBy: (delta: number) => void } | null>;
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
  const [pinnedToBottom, setPinnedToBottom] = useState(true);
  const [scrollOffset, setScrollOffset] = useState(0);
  const prevMessageCount = useRef(messages.length);

  const scrollBy = useCallback((delta: number) => {
    if (delta < 0) {
      setPinnedToBottom(false);
      setScrollOffset((s) => Math.max(0, s + delta));
    } else {
      setScrollOffset((s) => {
        const next = s + delta;
        if (next >= messages.length - 1) {
          setPinnedToBottom(true);
        }
        return Math.min(next, Math.max(0, messages.length - 1));
      });
    }
  }, [messages.length]);

  // Expose scroll method via ref (for mouse events from parent)
  useEffect(() => {
    if (scrollRef) scrollRef.current = { scrollBy };
  }, [scrollRef, scrollBy]);

  // Re-pin to bottom when new messages arrive
  useEffect(() => {
    if (messages.length !== prevMessageCount.current) {
      setPinnedToBottom(true);
      prevMessageCount.current = messages.length;
    }
  }, [messages.length]);

  // Always pin during streaming
  useEffect(() => {
    if (isStreaming) setPinnedToBottom(true);
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

  // Calculate visible messages
  const availableHeight = viewportHeight - 5;
  const estimatedVisibleCount = Math.max(1, Math.floor(availableHeight / 3));

  let displayStart: number;
  if (pinnedToBottom) {
    displayStart = Math.max(0, messages.length - estimatedVisibleCount);
  } else {
    displayStart = Math.min(scrollOffset, Math.max(0, messages.length - 1));
  }

  const visibleMessages = messages.slice(displayStart);
  const hasHiddenAbove = displayStart > 0;

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
              <Text dimColor>  ↑ {displayStart} earlier messages</Text>
            )}
            {visibleMessages.map((msg, i) => (
              <MessageBubble key={displayStart + i} message={msg} />
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
