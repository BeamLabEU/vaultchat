import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { Box, Text, useInput, useApp } from "ink";
import { FileTree, computeFileTreeScroll } from "../components/FileTree.tsx";
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
import { useAutoUpdate } from "../../hooks/useUpdateNotification.ts";

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
  const [debug, setDebug] = useState(false);
  const [lastKey, setLastKey] = useState<string>("—");
  const { rows: termHeight } = useTerminalSize();

  const { exit } = useApp();
  const updateState = useAutoUpdate();
  const cwd = process.cwd();
  const fileTree = useFileTree(cwd);
  const chat = useChat(config);

  // Ref-based scroll for ChatView — avoids re-rendering Main on mouse scroll
  const chatScrollRef = useRef<{ scrollBy: (delta: number) => void } | null>(null);

  // Double-click detection for file tree
  const lastClickRef = useRef<{ index: number; time: number }>({ index: -1, time: 0 });

  // Compute file tree scroll state (shared with FileTree component)
  const fileTreeViewportHeight = termHeight - 2;
  const fileTreeTotalItems = fileTree.files.length + 2; // +2 for "New Chat" and ".."
  const fileTreePrevScrollRef = useRef(0);
  const fileTreeScroll = useMemo(() => {
    const result = computeFileTreeScroll(fileTree.selectedIndex, fileTreeTotalItems, fileTreeViewportHeight, fileTreePrevScrollRef.current);
    fileTreePrevScrollRef.current = result.scrollOffset;
    return result;
  }, [fileTree.selectedIndex, fileTreeTotalItems, fileTreeViewportHeight]);

  // Map mouse Y coordinate to file tree item index, or null if not on an item
  const fileTreeItemIndexAtY = useCallback((y: number): number | null => {
    // Layout: y=1 status bar, y=2 top border, y=3 header, y=4+ items (or y=5 if "↑ more")
    const firstItemY = fileTreeScroll.hasLess ? 5 : 4;
    const row = y - firstItemY;
    if (row < 0 || row >= fileTreeScroll.maxVisible) return null;
    const index = fileTreeScroll.scrollOffset + row;
    if (index >= fileTreeTotalItems) return null;
    return index;
  }, [fileTreeScroll, fileTreeTotalItems]);

  // Mouse support: scroll wheel + click to switch panels + click items in tree
  useMouse((event) => {
    if (showModelSwitcher || showSettings) return;

    if (event.type === "press" && event.button === 0) {
      if (event.x <= FILE_TREE_WIDTH) {
        setActivePanel("files");
        const index = fileTreeItemIndexAtY(event.y);
        if (index !== null) {
          const now = Date.now();
          const last = lastClickRef.current;
          if (last.index === index && now - last.time < 400) {
            // Double click — open the item
            fileTree.select(index);
            handleOpenItemAtIndex(index);
            lastClickRef.current = { index: -1, time: 0 };
          } else {
            // Single click — highlight the item
            fileTree.select(index);
            lastClickRef.current = { index, time: now };
          }
        }
      } else {
        setActivePanel("chat");
      }
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
    // Record last keypress for debug overlay (always, even under modals)
    const parts: string[] = [];
    if (key.ctrl) parts.push("ctrl");
    if (key.shift) parts.push("shift");
    if (key.meta) parts.push("meta");
    if (key.upArrow) parts.push("up");
    if (key.downArrow) parts.push("down");
    if (key.leftArrow) parts.push("left");
    if (key.rightArrow) parts.push("right");
    if (key.return) parts.push("return");
    if (key.tab) parts.push("tab");
    if (key.escape) parts.push("esc");
    if (key.pageUp) parts.push("pgup");
    if (key.pageDown) parts.push("pgdn");
    if (key.home) parts.push("home");
    if (key.end) parts.push("end");
    if (key.backspace) parts.push("bksp");
    if (key.delete) parts.push("del");
    if (input && !key.ctrl) parts.push(JSON.stringify(input));
    setLastKey(parts.join("+") || "?");

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
    if (key.ctrl && input === "d") {
      setDebug((d) => !d);
    }
    if (key.ctrl && input === "l") {
      // Full terminal redraw
      process.stdout.write("\x1b[2J\x1b[3J\x1b[H");
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

  // Open/navigate the item at a given index (0=New Chat, 1=.., 2+=entries)
  const handleOpenItemAtIndex = useCallback(async (index: number) => {
    if (index === 0) {
      const newPath = await createNewChat(
        fileTree.dir,
        config.activeModel,
        config.activeProvider
      );
      await fileTree.refresh();
      setCurrentFile(newPath);
      setActivePanel("chat");
    } else if (index === 1) {
      fileTree.navigateUp();
    } else {
      const entry = fileTree.files[index - 2];
      if (!entry) return;
      if (entry.isDirectory) {
        fileTree.navigateToDir(entry.path);
      } else {
        setCurrentFile(entry.path);
        setActivePanel("chat");
      }
    }
  }, [fileTree, config]);

  const handleFileSelect = useCallback(async () => {
    await handleOpenItemAtIndex(fileTree.selectedIndex);
  }, [fileTree.selectedIndex, handleOpenItemAtIndex]);

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
          {updateState?.status === "downloading" && (
            <Text color="yellow"> ↓ downloading v{updateState.newVersion}...</Text>
          )}
          {updateState?.status === "ready" && (
            <Text color="green"> ✓ v{updateState.newVersion} installed — restart to use</Text>
          )}
          {updateState?.status === "failed" && (
            <Text color="red"> ✗ update failed: {updateState.error ?? "unknown error"}</Text>
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
            viewportHeight={termHeight - 2}
            onMoveUp={fileTree.moveUp}
            onMoveDown={fileTree.moveDown}
            onJumpToStart={fileTree.jumpToStart}
            onJumpToEnd={fileTree.jumpToEnd}
            onSelect={handleFileSelect}
          />

          <ChatView
            title={chat.title}
            messages={chat.messages}
            focused={activePanel === "chat"}
            viewportHeight={termHeight - 2}
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

      {/* Debug overlay (Ctrl+D to toggle) */}
      {debug && (
        <Box paddingX={1}>
          <Text color="magenta">
            [dbg] panel={activePanel} dir={fileTree.dir.split("/").pop() || "/"} files={fileTree.files.length} sel={fileTree.selectedIndex} key={lastKey} term={termHeight}
          </Text>
        </Box>
      )}

      {/* Bottom bar */}
      <Box paddingX={1}>
        <Text dimColor>
          {showSettings
            ? "Tab: switch tabs | ↑↓: navigate | Enter: select | Esc: close"
            : showModelSwitcher
              ? "↑↓: navigate | Enter: select | Esc: close"
              : "Tab: panels | PgUp/PgDn: scroll | ^N: new | ^M: model | ^L: redraw | ^D: debug | ^S: settings | ^C: quit"}
        </Text>
      </Box>
    </Box>
  );
}
