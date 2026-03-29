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
  onSelect: () => void;
}

export function FileTree({
  files,
  selectedIndex,
  focused,
  viewportHeight,
  onMoveUp,
  onMoveDown,
  onSelect,
}: FileTreeProps) {
  useInput(
    (input, key) => {
      if (!focused) return;
      if (key.upArrow || input === "k") onMoveUp();
      if (key.downArrow || input === "j") onMoveDown();
      if (key.return) onSelect();
    },
  );

  // All items: "New Chat" + files
  const items: { label: string; isNewChat: boolean; dimColor?: boolean }[] = [
    { label: "+ New Chat", isNewChat: true },
    ...files.map((f) => ({ label: f.name, isNewChat: false })),
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

  return (
    <Box
      flexDirection="column"
      width={32}
      borderStyle={focused ? "bold" : "single"}
      borderColor={focused ? "cyan" : "gray"}
      paddingX={1}
    >
      <Box marginBottom={0}>
        <Text bold color="cyan">
          Files
        </Text>
        {files.length > 0 && (
          <Text dimColor> ({files.length})</Text>
        )}
      </Box>

      {hasLess && <Text dimColor>  ↑ more</Text>}

      {visibleItems.map((item, i) => {
        const actualIndex = scrollOffset + i;
        const isSelected = actualIndex === selectedIndex;

        if (item.isNewChat) {
          return (
            <Text
              key="__new_chat__"
              color={isSelected && focused ? "cyan" : "green"}
              bold={isSelected && focused}
              inverse={isSelected && focused}
            >
              {isSelected && focused ? " " : " "}{item.label}
            </Text>
          );
        }

        return (
          <Text
            key={item.label}
            color={isSelected && focused ? "cyan" : undefined}
            bold={isSelected && focused}
            inverse={isSelected && focused}
          >
            {isSelected && focused ? " " : " "}{item.label}
          </Text>
        );
      })}

      {hasMore && <Text dimColor>  ↓ more</Text>}

      {files.length === 0 && (
        <Text dimColor italic>
          No .md files found
        </Text>
      )}
    </Box>
  );
}
