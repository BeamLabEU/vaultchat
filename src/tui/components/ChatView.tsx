import React from "react";
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
}: ChatViewProps) {
  const [scrollOffset, setScrollOffset] = React.useState(0);

  // Auto-scroll to bottom when messages change
  React.useEffect(() => {
    setScrollOffset(Math.max(0, messages.length - Math.max(1, viewportHeight - 6)));
  }, [messages.length, viewportHeight]);

  useInput(
    (input, key) => {
      if (!focused) return;
      if (key.upArrow) {
        setScrollOffset((s) => Math.max(0, s - 1));
      }
      if (key.downArrow) {
        setScrollOffset((s) => Math.min(messages.length - 1, s + 1));
      }
      if (key.escape && isStreaming) {
        onCancelStreaming();
      }
    },
  );

  const visibleMessages = messages.slice(scrollOffset);

  return (
    <Box
      flexDirection="column"
      flexGrow={1}
      borderStyle={focused ? "bold" : "single"}
      borderColor={focused ? "cyan" : "gray"}
      paddingX={1}
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
          <Box flexDirection="column" flexGrow={1}>
            {scrollOffset > 0 && (
              <Text dimColor>  ↑ {scrollOffset} more messages</Text>
            )}
            {visibleMessages.map((msg, i) => (
              <MessageBubble key={scrollOffset + i} message={msg} />
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
