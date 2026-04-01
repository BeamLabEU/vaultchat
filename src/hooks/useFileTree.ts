import { useState, useEffect, useCallback, useRef } from "react";
import { listEntries, watchDirectory, type FileEntry } from "../vault/files.ts";
import { dirname } from "node:path";

export function useFileTree(initialDir: string) {
  const [dir, setDir] = useState(initialDir);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    const list = await listEntries(dir);
    setFiles(list);
  }, [dir]);

  // Initial load + watch
  useEffect(() => {
    refresh();

    abortRef.current?.abort();
    abortRef.current = watchDirectory(dir, () => {
      refresh();
    });

    return () => {
      abortRef.current?.abort();
    };
  }, [dir, refresh]);

  const select = useCallback(
    (index: number) => {
      // +2 for "New Chat" at 0 and ".." at 1
      const maxIndex = files.length + 1;
      setSelectedIndex(Math.max(0, Math.min(index, maxIndex)));
    },
    [files.length]
  );

  const moveUp = useCallback(() => {
    setSelectedIndex((i) => Math.max(0, i - 1));
  }, []);

  const moveDown = useCallback(() => {
    // +1 for "New Chat", +1 for ".."
    setSelectedIndex((i) => Math.min(files.length + 1, i + 1));
  }, [files.length]);

  const jumpToStart = useCallback(() => {
    setSelectedIndex(0);
  }, []);

  const jumpToEnd = useCallback(() => {
    setSelectedIndex(files.length + 1);
  }, [files.length]);

  const navigateToDir = useCallback((newDir: string) => {
    setDir(newDir);
    setSelectedIndex(0);
  }, []);

  const navigateUp = useCallback(() => {
    const parent = dirname(dir);
    if (parent !== dir) {
      navigateToDir(parent);
    }
  }, [dir, navigateToDir]);

  // Index layout: 0 = "New Chat", 1 = "..", 2+ = entries
  const selectedEntry = selectedIndex >= 2 ? files[selectedIndex - 2] ?? null : null;
  const selectedFile = selectedEntry && !selectedEntry.isDirectory ? selectedEntry : null;
  const isNewChatSelected = selectedIndex === 0;
  const isParentDirSelected = selectedIndex === 1;

  return {
    dir,
    files,
    selectedIndex,
    selectedFile,
    selectedEntry,
    isNewChatSelected,
    isParentDirSelected,
    select,
    moveUp,
    moveDown,
    jumpToStart,
    jumpToEnd,
    navigateToDir,
    navigateUp,
    refresh,
  };
}
