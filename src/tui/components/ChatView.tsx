import React from "react";
import { Box, Text, useInput } from "ink";
import { MessageBubble } from "./MessageBubble.tsx";
import type { Message } from "../../markdown/types.ts";

interface ChatViewProps {
  title: string;
  messages: Message[];
  focused: boolean;
  viewportHeight: number;
}

export function ChatView({
  title,
  messages,
  focused,
  viewportHeight,
}: ChatViewProps) {
  const [scrollOffset, setScrollOffset] = React.useState(0);

  // Auto-scroll to bottom when messages change
  React.useEffect(() => {
    setScrollOffset(Math.max(0, messages.length - Math.max(1, viewportHeight - 4)));
  }, [messages.length, viewportHeight]);

  useInput(
    (input, key) => {
      if (!focused) return;
      if (key.upArrow || input === "k") {
        setScrollOffset((s) => Math.max(0, s - 1));
      }
      if (key.downArrow || input === "j") {
        setScrollOffset((s) => Math.min(messages.length - 1, s + 1));
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

      {messages.length === 0 ? (
        <Box flexGrow={1} justifyContent="center" alignItems="center">
          <Text dimColor>
            Select a file or create a new chat to get started
          </Text>
        </Box>
      ) : (
        <Box flexDirection="column" flexGrow={1}>
          {scrollOffset > 0 && <Text dimColor>  ↑ {scrollOffset} more messages</Text>}
          {visibleMessages.map((msg, i) => (
            <MessageBubble key={scrollOffset + i} message={msg} />
          ))}
        </Box>
      )}
    </Box>
  );
}
