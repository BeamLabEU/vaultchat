import React, { useState, useCallback, useEffect } from "react";
import { Box, Text, useInput, useStdout } from "ink";
import { FileTree } from "../components/FileTree.tsx";
import { ChatView } from "../components/ChatView.tsx";
import { ModelSwitcher } from "../components/ModelSwitcher.tsx";
import { useFileTree } from "../../hooks/useFileTree.ts";
import { useChat } from "../../hooks/useChat.ts";
import { createNewChat } from "../../vault/files.ts";
import { saveConfig, type Config } from "../../vault/config.ts";

type Panel = "files" | "chat";

interface MainProps {
  config: Config;
}

export function Main({ config: initialConfig }: MainProps) {
  const [config, setConfig] = useState(initialConfig);
  const [activePanel, setActivePanel] = useState<Panel>("files");
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [showModelSwitcher, setShowModelSwitcher] = useState(false);
  const { stdout } = useStdout();
  const termHeight = stdout?.rows ?? 24;

  const cwd = process.cwd();
  const fileTree = useFileTree(cwd);
  const chat = useChat(config);

  // Load conversation when file changes
  useEffect(() => {
    if (currentFile) {
      chat.loadConversation(currentFile);
    }
  }, [currentFile]);

  useInput((input, key) => {
    if (showModelSwitcher) return; // ModelSwitcher handles its own input
    if (key.tab) {
      setActivePanel((p) => (p === "files" ? "chat" : "files"));
    }
    if (key.ctrl && input === "m") {
      setShowModelSwitcher(true);
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

  const handleSendMessage = useCallback(
    (text: string) => {
      chat.sendMessage(text);
    },
    [chat.sendMessage]
  );

  const handleModelSelect = useCallback(
    async (provider: string, model: string) => {
      const newConfig = { ...config, activeProvider: provider, activeModel: model };
      setConfig(newConfig);
      await saveConfig(newConfig);

      // Update current conversation's frontmatter if one is open
      if (chat.conversation) {
        const updated = {
          ...chat.conversation,
          frontmatter: {
            ...chat.conversation.frontmatter,
            model,
            provider,
          },
        };
        chat.setConversation(updated);
      }

      setShowModelSwitcher(false);
    },
    [config, chat]
  );

  return (
    <Box flexDirection="column" height={termHeight}>
      {/* Status bar */}
      <Box paddingX={1} justifyContent="space-between">
        <Text bold color="cyan">
          VaultChat
        </Text>
        <Text dimColor>
          {config.activeModel} | Tab: panels | Ctrl+M: model
        </Text>
      </Box>

      {/* Modal overlay */}
      {showModelSwitcher ? (
        <Box flexGrow={1} justifyContent="center" alignItems="center">
          <ModelSwitcher
            config={config}
            onSelect={handleModelSelect}
            onClose={() => setShowModelSwitcher(false)}
          />
        </Box>
      ) : (
        /* Main content */
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
            isStreaming={chat.isStreaming}
            streamingContent={chat.streamingContent}
            error={chat.error}
            hasConversation={!!chat.conversation}
            onSendMessage={handleSendMessage}
            onCancelStreaming={chat.cancelStreaming}
          />
        </Box>
      )}

      {/* Bottom bar */}
      <Box paddingX={1}>
        <Text dimColor>
          {showModelSwitcher
            ? "↑↓: navigate | Enter: select | Esc: close"
            : "↑↓: scroll | Enter: send/open | Tab: panels | Ctrl+M: model | Ctrl+C: quit"}
        </Text>
      </Box>
    </Box>
  );
}
