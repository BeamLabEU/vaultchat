import React, { useState, useCallback, useEffect } from "react";
import { Box, Text, useInput, useStdout } from "ink";
import { FileTree } from "../components/FileTree.tsx";
import { ChatView } from "../components/ChatView.tsx";
import { useFileTree } from "../../hooks/useFileTree.ts";
import { useChat } from "../../hooks/useChat.ts";
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
  const chat = useChat();

  // Load conversation when file changes
  useEffect(() => {
    if (currentFile) {
      chat.loadConversation(currentFile);
    }
  }, [currentFile]);

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

        <ChatView
          title={chat.title}
          messages={chat.messages}
          focused={activePanel === "chat"}
          viewportHeight={termHeight - 3}
        />
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
