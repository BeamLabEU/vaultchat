import { readdir, stat, watch } from "node:fs/promises";
import { join, basename } from "node:path";
import type { Frontmatter } from "../markdown/types.ts";

export interface FileEntry {
  name: string;
  path: string;
  modifiedAt: Date;
  isDirectory: boolean;
}

export async function listEntries(dir: string): Promise<FileEntry[]> {
  try {
    const entries = await readdir(dir);
    const dirs: FileEntry[] = [];
    const files: FileEntry[] = [];

    for (const entry of entries) {
      if (entry.startsWith(".")) continue;
      const fullPath = join(dir, entry);
      try {
        const info = await stat(fullPath);
        if (info.isDirectory()) {
          dirs.push({
            name: entry,
            path: fullPath,
            modifiedAt: info.mtime,
            isDirectory: true,
          });
        } else if (entry.endsWith(".md") && info.isFile()) {
          files.push({
            name: entry.replace(/\.md$/, ""),
            path: fullPath,
            modifiedAt: info.mtime,
            isDirectory: false,
          });
        }
      } catch {
        // Skip entries we can't stat
      }
    }

    const collator = new Intl.Collator(undefined, { sensitivity: "base", numeric: true });
    dirs.sort((a, b) => collator.compare(a.name, b.name));
    files.sort((a, b) => collator.compare(a.name, b.name));

    return [...dirs, ...files];
  } catch {
    return [];
  }
}

/** @deprecated Use listEntries instead */
export async function listMdFiles(dir: string): Promise<FileEntry[]> {
  const entries = await listEntries(dir);
  return entries.filter((e) => !e.isDirectory);
}

export function watchDirectory(
  dir: string,
  onChange: () => void
): AbortController {
  const ac = new AbortController();

  (async () => {
    try {
      const watcher = watch(dir, { signal: ac.signal });
      for await (const event of watcher) {
        if (event.filename?.endsWith(".md")) {
          onChange();
        }
      }
    } catch (err: unknown) {
      // AbortError is expected on cleanup
      if (err instanceof Error && err.name !== "AbortError") {
        console.error("Watch error:", err);
      }
    }
  })();

  return ac;
}

function generateFilename(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `new-chat-${date}-${time}.md`;
}

export async function createNewChat(
  dir: string,
  model: string,
  provider: string
): Promise<string> {
  const filename = generateFilename();
  const filePath = join(dir, filename);

  const frontmatter: Frontmatter = {
    title: "New Chat",
    date: new Date().toISOString(),
    model,
    provider,
    tags: ["vaultchat"],
  };

  const content =
    `---\ntitle: ${frontmatter.title}\ndate: ${frontmatter.date}\nmodel: ${frontmatter.model}\nprovider: ${frontmatter.provider}\ntags:\n  - vaultchat\n---\n`;

  await Bun.write(filePath, content);
  return filePath;
}
