import { useState, useEffect, useCallback, useRef } from "react";
import { listMdFiles, watchDirectory, type FileEntry } from "../vault/files.ts";

export function useFileTree(dir: string) {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    const list = await listMdFiles(dir);
    setFiles(list);
  }, [dir]);

  // Initial load + watch
  useEffect(() => {
    refresh();

    abortRef.current = watchDirectory(dir, () => {
      refresh();
    });

    return () => {
      abortRef.current?.abort();
    };
  }, [dir, refresh]);

  const select = useCallback(
    (index: number) => {
      // +1 for the "New Chat" item at index 0
      const maxIndex = files.length;
      setSelectedIndex(Math.max(0, Math.min(index, maxIndex)));
    },
    [files.length]
  );

  const moveUp = useCallback(() => {
    setSelectedIndex((i) => Math.max(0, i - 1));
  }, []);

  const moveDown = useCallback(() => {
    setSelectedIndex((i) => Math.min(files.length, i + 1));
  }, [files.length]);

  // selectedIndex 0 = "New Chat", 1+ = files
  const selectedFile = selectedIndex > 0 ? files[selectedIndex - 1] ?? null : null;
  const isNewChatSelected = selectedIndex === 0;

  return {
    files,
    selectedIndex,
    selectedFile,
    isNewChatSelected,
    select,
    moveUp,
    moveDown,
    refresh,
  };
}
