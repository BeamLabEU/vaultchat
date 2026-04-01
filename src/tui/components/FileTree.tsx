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

/** Compute scroll state for the file tree. Shared with Main for mouse click mapping. */
export function computeFileTreeScroll(
  selectedIndex: number,
  totalItems: number,
  viewportHeight: number,
): { scrollOffset: number; maxVisible: number; hasLess: boolean; hasMore: boolean } {
  const baseVisible = Math.max(1, viewportHeight - 3); // border + header

  let scrollOffset = 0;
  if (selectedIndex >= baseVisible) {
    scrollOffset = selectedIndex - baseVisible + 1;
  }

  let hasLess = scrollOffset > 0;
  let hasMore = scrollOffset + baseVisible < totalItems;

  let maxVisible = baseVisible - (hasLess ? 1 : 0) - (hasMore ? 1 : 0);
  maxVisible = Math.max(1, maxVisible);

  // Recompute with final maxVisible
  if (selectedIndex >= scrollOffset + maxVisible) {
    scrollOffset = selectedIndex - maxVisible + 1;
  }
  if (selectedIndex < scrollOffset) {
    scrollOffset = selectedIndex;
  }
  hasLess = scrollOffset > 0;
  hasMore = scrollOffset + maxVisible < totalItems;

  return { scrollOffset, maxVisible, hasLess, hasMore };
}

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

  const { scrollOffset, maxVisible, hasLess, hasMore } = computeFileTreeScroll(
    selectedIndex,
    items.length,
    viewportHeight,
  );

  const visibleItems = items.slice(scrollOffset, scrollOffset + maxVisible);

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
      <Text>
        <Text bold color="cyan">Files</Text>
        {(fileCount > 0 || dirCount > 0) && (
          <Text dimColor> ({dirCount > 0 ? `${dirCount}d, ${fileCount}f` : `${fileCount}`})</Text>
        )}
      </Text>

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
