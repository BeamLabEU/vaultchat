import React, { useState, useCallback, useEffect, useRef } from "react";
import { Box, Text, useInput, useApp } from "ink";
import { FileTree } from "../components/FileTree.tsx";
import { ChatView } from "../components/ChatView.tsx";
import { ModelSwitcher } from "../components/ModelSwitcher.tsx";
import { Settings } from "./Settings.tsx";
import { useFileTree } from "../../hooks/useFileTree.ts";
import { useChat } from "../../hooks/useChat.ts";
import { useMouse } from "../../hooks/useMouse.ts";
import { useTerminalSize } from "../../hooks/useTerminalSize.ts";
import { createNewChat } from "../../vault/files.ts";
import { saveConfig, type Config } from "../../vault/config.ts";
import { getVersion } from "../../version.ts";
import { useUpdateNotification } from "../../hooks/useUpdateNotification.ts";

const FILE_TREE_WIDTH = 32;

type Panel = "files" | "chat";

interface MainProps {
  config: Config;
}

export function Main({ config: initialConfig }: MainProps) {
  const [config, setConfig] = useState(initialConfig);
  const [activePanel, setActivePanel] = useState<Panel>("files");
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [showModelSwitcher, setShowModelSwitcher] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const { rows: termHeight } = useTerminalSize();

  const { exit } = useApp();
  const updateInfo = useUpdateNotification();
  const cwd = process.cwd();
  const fileTree = useFileTree(cwd);
  const chat = useChat(config);

  // Ref-based scroll for ChatView — avoids re-rendering Main on mouse scroll
  const chatScrollRef = useRef<{ scrollBy: (delta: number) => void } | null>(null);

  // Mouse support: scroll wheel + click to switch panels
  useMouse((event) => {
    if (showModelSwitcher || showSettings) return;

    if (event.type === "press" && event.button === 0) {
      setActivePanel(event.x <= FILE_TREE_WIDTH ? "files" : "chat");
    }

    if (event.type === "wheelUp") {
      if (event.x <= FILE_TREE_WIDTH) {
        fileTree.moveUp();
      } else {
        chatScrollRef.current?.scrollBy(-5);
      }
    }

    if (event.type === "wheelDown") {
      if (event.x <= FILE_TREE_WIDTH) {
        fileTree.moveDown();
      } else {
        chatScrollRef.current?.scrollBy(5);
      }
    }
  });

  // Load conversation when file changes
  useEffect(() => {
    if (currentFile) {
      chat.loadConversation(currentFile);
    }
  }, [currentFile]);

  useInput((input, key) => {
    if (showModelSwitcher || showSettings) return;
    if (key.tab) {
      setActivePanel((p) => (p === "files" ? "chat" : "files"));
    }
    if (key.ctrl && input === "m") {
      setShowModelSwitcher(true);
    }
    if (key.ctrl && input === "s") {
      setShowSettings(true);
    }
    if (key.ctrl && input === "n") {
      handleNewChat();
    }
    if (key.ctrl && input === "c") {
      if (chat.isStreaming) {
        chat.cancelStreaming();
      } else {
        exit();
      }
    }
  });

  const handleNewChat = useCallback(async () => {
    const newPath = await createNewChat(
      fileTree.dir,
      config.activeModel,
      config.activeProvider
    );
    await fileTree.refresh();
    setCurrentFile(newPath);
    setActivePanel("chat");
  }, [fileTree.dir, config, fileTree]);

  const handleFileSelect = useCallback(async () => {
    if (fileTree.isNewChatSelected) {
      const newPath = await createNewChat(
        fileTree.dir,
        config.activeModel,
        config.activeProvider
      );
      await fileTree.refresh();
      setCurrentFile(newPath);
      setActivePanel("chat");
    } else if (fileTree.isParentDirSelected) {
      fileTree.navigateUp();
    } else if (fileTree.selectedEntry?.isDirectory) {
      fileTree.navigateToDir(fileTree.selectedEntry.path);
    } else if (fileTree.selectedFile) {
      setCurrentFile(fileTree.selectedFile.path);
      setActivePanel("chat");
    }
  }, [fileTree, config]);

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
        <Box>
          <Text bold color="cyan">
            VaultChat
          </Text>
          <Text dimColor> v{getVersion()}</Text>
          {updateInfo && (
            <Text color="yellow"> ↑ v{updateInfo.latest} available (run --update)</Text>
          )}
        </Box>
        <Text dimColor>
          {config.activeModel}{chat.isStreaming ? " (streaming...)" : ""}
        </Text>
      </Box>

      {/* Modal overlays */}
      {showSettings ? (
        <Box flexGrow={1}>
          <Settings
            config={config}
            onSave={async (newConfig) => {
              setConfig(newConfig);
              await saveConfig(newConfig);
            }}
            onClose={() => setShowSettings(false)}
          />
        </Box>
      ) : showModelSwitcher ? (
        <Box flexGrow={1} justifyContent="center" alignItems="center">
          <ModelSwitcher
            config={config}
            onSelect={handleModelSelect}
            onClose={() => setShowModelSwitcher(false)}
          />
        </Box>
      ) : (
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
            originalContent={chat.conversation?.originalContent}
            onSendMessage={handleSendMessage}
            onCancelStreaming={chat.cancelStreaming}
            scrollRef={chatScrollRef}
          />
        </Box>
      )}

      {/* Bottom bar */}
      <Box paddingX={1}>
        <Text dimColor>
          {showSettings
            ? "Tab: switch tabs | ↑↓: navigate | Enter: select | Esc: close"
            : showModelSwitcher
              ? "↑↓: navigate | Enter: select | Esc: close"
              : "Tab: panels | Ctrl+N: new chat | Ctrl+M: model | Ctrl+S: settings | Ctrl+C: quit"}
        </Text>
      </Box>
    </Box>
  );
}
