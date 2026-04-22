import { useState, useEffect, useCallback, useRef } from "react";
import { listEntries, watchDirectory, type FileEntry } from "../vault/files.ts";
import { dirname } from "node:path";

export function useFileTree(initialDir: string) {
  const [dir, setDir] = useState(initialDir);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  // Ref mirrors so stable useCallbacks always read the latest values without
  // re-creating (and relying on Ink's useInput closure to update, which can
  // miss updates when a React.memo'd consumer short-circuits re-renders).
  const filesLenRef = useRef(0);
  filesLenRef.current = files.length;
  const selectedIndexRef = useRef(0);
  selectedIndexRef.current = selectedIndex;
  const filesRef = useRef<FileEntry[]>(files);
  filesRef.current = files;
  const dirRef = useRef(initialDir);
  dirRef.current = dir;

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

  const select = useCallback((index: number) => {
    // +2 for "New Chat" at 0 and ".." at 1
    const maxIndex = filesLenRef.current + 1;
    setSelectedIndex(Math.max(0, Math.min(index, maxIndex)));
  }, []);

  const moveUp = useCallback(() => {
    setSelectedIndex((i) => Math.max(0, i - 1));
  }, []);

  const moveDown = useCallback(() => {
    // +1 for "New Chat", +1 for ".."
    setSelectedIndex((i) => Math.min(filesLenRef.current + 1, i + 1));
  }, []);

  const jumpToStart = useCallback(() => {
    setSelectedIndex(0);
  }, []);

  const jumpToEnd = useCallback(() => {
    setSelectedIndex(filesLenRef.current + 1);
  }, []);

  const navigateToDir = useCallback((newDir: string) => {
    setDir(newDir);
    setSelectedIndex(0);
  }, []);

  const navigateUp = useCallback(() => {
    const current = dirRef.current;
    const parent = dirname(current);
    if (parent !== current) {
      navigateToDir(parent);
    }
  }, [navigateToDir]);

  // Index layout: 0 = "New Chat", 1 = "..", 2+ = entries
  const selectedEntry = selectedIndex >= 2 ? files[selectedIndex - 2] ?? null : null;
  const selectedFile = selectedEntry && !selectedEntry.isDirectory ? selectedEntry : null;
  const isNewChatSelected = selectedIndex === 0;
  const isParentDirSelected = selectedIndex === 1;

  return {
    dir,
    files,
    selectedIndex,
    selectedIndexRef,
    filesRef,
    dirRef,
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
