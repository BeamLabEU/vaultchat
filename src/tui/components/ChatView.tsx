import React, { useState, useEffect, useRef } from "react";
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
  externalScrollDelta?: number; // +N scroll down, -N scroll up (from mouse)
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
  externalScrollDelta,
}: ChatViewProps) {
  // Pin to bottom by default. When user scrolls up, unpin.
  const [pinnedToBottom, setPinnedToBottom] = useState(true);
  const [scrollOffset, setScrollOffset] = useState(0);
  const prevMessageCount = useRef(messages.length);

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

  // Handle external scroll events (mouse wheel)
  useEffect(() => {
    if (!externalScrollDelta) return;
    if (externalScrollDelta < 0) {
      // Scroll up
      setPinnedToBottom(false);
      setScrollOffset((s) => Math.max(0, s + externalScrollDelta));
    } else {
      // Scroll down
      setScrollOffset((s) => {
        const next = s + externalScrollDelta;
        if (next >= messages.length - 1) {
          setPinnedToBottom(true);
        }
        return next;
      });
    }
  }, [externalScrollDelta]);

  useInput(
    (input, key) => {
      if (!focused) return;
      if (key.upArrow) {
        setPinnedToBottom(false);
        setScrollOffset((s) => Math.max(0, s - 3));
      }
      if (key.downArrow) {
        setScrollOffset((s) => {
          const next = s + 3;
          // If scrolled near the end, re-pin
          const totalItems = messages.length + (isStreaming ? 1 : 0);
          if (next >= totalItems - 1) {
            setPinnedToBottom(true);
          }
          return next;
        });
      }
      if (key.escape && isStreaming) {
        onCancelStreaming();
      }
    },
  );

  // When pinned, show the last N messages that fit
  // Simple approach: show last messages, starting from the end
  const totalMessages = messages.length + (isStreaming ? 1 : 0);
  const availableHeight = viewportHeight - 5; // title, input box, borders
  // Rough estimate: each message takes ~3 lines (label + content + margin)
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
          {/* Messages */}
          <Box flexDirection="column" flexGrow={1} overflowY="hidden">
            {hasHiddenAbove && (
              <Text dimColor>  ↑ {displayStart} earlier messages</Text>
            )}
            {visibleMessages.map((msg, i) => (
              <MessageBubble key={displayStart + i} message={msg} />
            ))}

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

            {/* Error display */}
            {error && (
              <Box marginBottom={1}>
                <Text color="red">Error: {error}</Text>
              </Box>
            )}
          </Box>

          {/* Input area */}
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
