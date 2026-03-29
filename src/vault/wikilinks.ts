import { readdir } from "node:fs/promises";
import { join } from "node:path";

const WIKILINK_PATTERN = /\[\[([^\]]+)\]\]/g;

/**
 * Extract all [[wikilinks]] from a string.
 */
export function extractWikilinks(text: string): string[] {
  const links: string[] = [];
  let match;
  while ((match = WIKILINK_PATTERN.exec(text)) !== null) {
    links.push(match[1]!);
  }
  return links;
}

/**
 * Resolve a wikilink name to a file path by searching the directory.
 * Matches "Name" to "Name.md" (case-insensitive).
 */
async function resolveWikilink(
  name: string,
  dir: string
): Promise<string | null> {
  try {
    const entries = await readdir(dir);
    const target = name.toLowerCase();

    for (const entry of entries) {
      const withoutExt = entry.replace(/\.md$/i, "").toLowerCase();
      if (withoutExt === target) {
        return join(dir, entry);
      }
    }
  } catch {
    // Directory not readable
  }
  return null;
}

/**
 * Resolve wikilinks from frontmatter context field and inline message content.
 * Returns the resolved content to inject into the API call.
 */
export async function resolveContextWikilinks(
  contextLinks: string[],
  dir: string
): Promise<string> {
  const parts: string[] = [];

  for (const link of contextLinks) {
    // Strip [[ and ]] if present
    const name = link.replace(/^\[\[|\]\]$/g, "");
    const filePath = await resolveWikilink(name, dir);

    if (filePath) {
      const file = Bun.file(filePath);
      if (await file.exists()) {
        const content = await file.text();
        // Strip frontmatter from the resolved file
        const body = content.replace(/^---[\s\S]*?---\n*/, "").trim();
        if (body) {
          parts.push(`**From [[${name}]]:**\n${body}`);
        }
      }
    }
  }

  return parts.join("\n\n");
}

/**
 * Find and resolve all [[wikilinks]] in a user message.
 * Returns resolved content for each link found.
 */
export async function resolveInlineWikilinks(
  messageContent: string,
  dir: string
): Promise<string> {
  const links = extractWikilinks(messageContent);
  if (links.length === 0) return "";
  return resolveContextWikilinks(links, dir);
}
