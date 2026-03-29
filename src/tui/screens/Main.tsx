import React, { useState, useCallback } from "react";
import { Box, Text, useInput, useStdout } from "ink";
import { FileTree } from "../components/FileTree.tsx";
import { useFileTree } from "../../hooks/useFileTree.ts";
import { createNewChat } from "../../vault/files.ts";
import type { Config } from "../../vault/config.ts";

type Panel = "files" | "chat";

interface MainProps {
  config: Config;
}

export function Main({ config }: MainProps) {
  const [activePanel, setActivePanel] = useState<Panel>("files");
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const { stdout } = useStdout();
  const termHeight = stdout?.rows ?? 24;

  const cwd = process.cwd();
  const fileTree = useFileTree(cwd);

  useInput((input, key) => {
    if (key.tab) {
      setActivePanel((p) => (p === "files" ? "chat" : "files"));
    }
  });

  const handleFileSelect = useCallback(async () => {
    if (fileTree.isNewChatSelected) {
      const newPath = await createNewChat(
        cwd,
        config.activeModel,
        config.activeProvider
      );
      await fileTree.refresh();
      setCurrentFile(newPath);
      setActivePanel("chat");
    } else if (fileTree.selectedFile) {
      setCurrentFile(fileTree.selectedFile.path);
      setActivePanel("chat");
    }
  }, [fileTree, cwd, config]);

  return (
    <Box flexDirection="column" height={termHeight}>
      {/* Status bar */}
      <Box paddingX={1} justifyContent="space-between">
        <Text bold color="cyan">
          VaultChat
        </Text>
        <Text dimColor>
          {config.activeProvider}/{config.activeModel} | Tab: switch panels
        </Text>
      </Box>

      {/* Main content */}
      <Box flexGrow={1}>
        <FileTree
          files={fileTree.files}
          selectedIndex={fileTree.selectedIndex}
          focused={activePanel === "files"}
          viewportHeight={termHeight - 3}
          onMoveUp={fileTree.moveUp}
          onMoveDown={fileTree.moveDown}
          onSelect={handleFileSelect}
        />

        {/* Chat panel placeholder — Phase 6 */}
        <Box
          flexDirection="column"
          flexGrow={1}
          borderStyle={activePanel === "chat" ? "bold" : "single"}
          borderColor={activePanel === "chat" ? "cyan" : "gray"}
          paddingX={1}
        >
          {currentFile ? (
            <Box flexDirection="column">
              <Text bold>
                {currentFile.split("/").pop()?.replace(/\.md$/, "")}
              </Text>
              <Text dimColor>Chat view coming in Phase 6...</Text>
            </Box>
          ) : (
            <Box
              flexGrow={1}
              justifyContent="center"
              alignItems="center"
            >
              <Text dimColor>
                Select a file or create a new chat to get started
              </Text>
            </Box>
          )}
        </Box>
      </Box>

      {/* Bottom bar */}
      <Box paddingX={1}>
        <Text dimColor>
          ↑↓/jk: navigate | Enter: open | Tab: switch panel | Ctrl+C: quit
        </Text>
      </Box>
    </Box>
  );
}
