import React from "react";
import { Box, Text } from "ink";
import type { Message } from "../../markdown/types.ts";
import { renderMarkdown } from "../../markdown/render.ts";

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

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const color = ROLE_COLORS[message.role] ?? "white";
  const label = ROLE_LABELS[message.role] ?? message.role;
  const rendered = message.content ? renderMarkdown(message.content) : "";

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text bold color={color}>
        {label}
      </Text>
      <Text>{rendered}</Text>
    </Box>
  );
}
