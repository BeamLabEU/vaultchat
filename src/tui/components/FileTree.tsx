import React from "react";
import { Box, Text, useInput } from "ink";
import type { FileEntry } from "../../vault/files.ts";

interface FileTreeProps {
  files: FileEntry[];
  selectedIndex: number;
  focused: boolean;
  viewportHeight: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onJumpToStart: () => void;
  onJumpToEnd: () => void;
  onSelect: () => void;
}

// Sidebar width=32, border=2, paddingX=2, leading space=1 → 27 chars for label
const MAX_LABEL_WIDTH = 27;

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + "…";
}

export function FileTree({
  files,
  selectedIndex,
  focused,
  viewportHeight,
  onMoveUp,
  onMoveDown,
  onJumpToStart,
  onJumpToEnd,
  onSelect,
}: FileTreeProps) {
  useInput(
    (input, key) => {
      if (!focused) return;
      if (key.upArrow || input === "k") onMoveUp();
      if (key.downArrow || input === "j") onMoveDown();
      if (key.home || input === "g") onJumpToStart();
      if (key.end || input === "G") onJumpToEnd();
      if (key.return) onSelect();
    },
  );

  const dirs = files.filter((f) => f.isDirectory);
  const mdFiles = files.filter((f) => !f.isDirectory);

  // All items: "New Chat", "..", directories, then files
  const items: { label: string; key: string; type: "newchat" | "parent" | "dir" | "file" }[] = [
    { label: "+ New Chat", key: "__new_chat__", type: "newchat" },
    { label: "..", key: "__parent__", type: "parent" },
    ...dirs.map((f) => ({ label: f.name + "/", key: "d:" + f.path, type: "dir" as const })),
    ...mdFiles.map((f) => ({ label: f.name, key: "f:" + f.path, type: "file" as const })),
  ];

  // Scrolling: keep selected item visible
  const totalItems = items.length;
  const maxVisible = Math.max(1, viewportHeight - 2); // account for border
  let scrollOffset = 0;
  if (selectedIndex >= scrollOffset + maxVisible) {
    scrollOffset = selectedIndex - maxVisible + 1;
  }
  if (selectedIndex < scrollOffset) {
    scrollOffset = selectedIndex;
  }

  const visibleItems = items.slice(scrollOffset, scrollOffset + maxVisible);
  const hasMore = scrollOffset + maxVisible < totalItems;
  const hasLess = scrollOffset > 0;

  const fileCount = mdFiles.length;
  const dirCount = dirs.length;

  return (
    <Box
      flexDirection="column"
      width={32}
      flexShrink={0}
      borderStyle="single"
      borderColor={focused ? "cyan" : "gray"}
      paddingX={1}
    >
      <Box marginBottom={0}>
        <Text bold color="cyan">
          Files
        </Text>
        {(fileCount > 0 || dirCount > 0) && (
          <Text dimColor> ({dirCount > 0 ? `${dirCount}d, ${fileCount}f` : `${fileCount}`})</Text>
        )}
      </Box>

      {hasLess && <Text dimColor>  ↑ more</Text>}

      {visibleItems.map((item, i) => {
        const actualIndex = scrollOffset + i;
        const isSelected = actualIndex === selectedIndex;
        const sel = isSelected && focused;
        const displayLabel = truncate(item.label, MAX_LABEL_WIDTH);

        if (item.type === "newchat") {
          return (
            <Text
              key={item.key}
              color={sel ? "cyan" : "green"}
              bold={sel}
              inverse={sel}
            >
              {" "}{displayLabel}
            </Text>
          );
        }

        if (item.type === "parent" || item.type === "dir") {
          return (
            <Text
              key={item.key}
              color={sel ? "cyan" : "yellow"}
              bold={sel}
              inverse={sel}
            >
              {" "}{displayLabel}
            </Text>
          );
        }

        return (
          <Text
            key={item.key}
            color={sel ? "cyan" : undefined}
            bold={sel}
            inverse={sel}
          >
            {" "}{displayLabel}
          </Text>
        );
      })}

      {hasMore && <Text dimColor>  ↓ more</Text>}

      {files.length === 0 && (
        <Text dimColor italic>
          No entries found
        </Text>
      )}
    </Box>
  );
}
