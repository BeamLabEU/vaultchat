import React from "react";
import { Text } from "ink";
import { Spinner } from "@inkjs/ui";
import { renderMarkdown } from "../../markdown/render.ts";

interface StreamingTextProps {
  content: string;
  isStreaming: boolean;
}

export function StreamingText({ content, isStreaming }: StreamingTextProps) {
  if (!content && isStreaming) {
    return <Spinner label="Thinking..." />;
  }

  const rendered = content ? renderMarkdown(content) : "";

  return (
    <>
      <Text>{rendered}</Text>
      {isStreaming && <Spinner label="" />}
    </>
  );
}
