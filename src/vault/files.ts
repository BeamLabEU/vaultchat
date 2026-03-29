import { readdir, stat, watch } from "node:fs/promises";
import { join, basename } from "node:path";
import type { Frontmatter } from "../markdown/types.ts";

export interface FileEntry {
  name: string;
  path: string;
  modifiedAt: Date;
}

export async function listMdFiles(dir: string): Promise<FileEntry[]> {
  try {
    const entries = await readdir(dir);
    const files: FileEntry[] = [];

    for (const entry of entries) {
      if (!entry.endsWith(".md")) continue;
      const fullPath = join(dir, entry);
      try {
        const info = await stat(fullPath);
        if (info.isFile()) {
          files.push({
            name: entry.replace(/\.md$/, ""),
            path: fullPath,
            modifiedAt: info.mtime,
          });
        }
      } catch {
        // Skip files we can't stat
      }
    }

    // Sort by modified date, newest first
    return files.sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime());
  } catch {
    return [];
  }
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
