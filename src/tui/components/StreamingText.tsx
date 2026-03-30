import React, { useState, useEffect, useRef } from "react";
import { Text } from "ink";
import { Spinner } from "@inkjs/ui";
import { renderMarkdown } from "../../markdown/render.ts";

interface StreamingTextProps {
  content: string;
  isStreaming: boolean;
}

const THROTTLE_MS = 80;

export function StreamingText({ content, isStreaming }: StreamingTextProps) {
  const [renderedContent, setRenderedContent] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestContentRef = useRef(content);

  latestContentRef.current = content;

  // Throttle markdown rendering to avoid flashing
  useEffect(() => {
    if (!content) {
      setRenderedContent("");
      return;
    }

    // Render immediately on first content
    if (!renderedContent && content) {
      setRenderedContent(renderMarkdown(content));
      return;
    }

    if (timerRef.current) return; // Already scheduled

    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setRenderedContent(renderMarkdown(latestContentRef.current));
    }, THROTTLE_MS);
  }, [content]);

  // Final render when streaming stops
  useEffect(() => {
    if (!isStreaming && content) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setRenderedContent(renderMarkdown(content));
    }
  }, [isStreaming]);

  // Cleanup timer
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!content && isStreaming) {
    return <Spinner label="Thinking..." />;
  }

  return (
    <>
      <Text>{renderedContent}</Text>
      {isStreaming && <Spinner label="" />}
    </>
  );
}
