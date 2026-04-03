import fs from "fs";
import path from "path";
import { serializeConversation } from "./markdown/serializer.ts";
import type { Conversation, Message, Frontmatter } from "./markdown/types.ts";

interface OpenWebUIMessage {
  id: string;
  parentId: string | null;
  childrenIds: string[];
  role: "user" | "assistant" | "system";
  content: string;
}

interface OpenWebUIChat {
  id: string;
  title: string;
  chat: {
    title: string;
    models: string[];
    history: {
      messages: Record<string, OpenWebUIMessage>;
    };
  };
  meta?: { tags?: string[] };
  created_at: number;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Walk the linked-list message chain from root to leaf. */
function walkMessageChain(messages: Record<string, OpenWebUIMessage>): OpenWebUIMessage[] {
  const root = Object.values(messages).find((m) => m.parentId === null);
  if (!root) return Object.values(messages);

  const chain: OpenWebUIMessage[] = [];
  let current: OpenWebUIMessage | undefined = root;
  while (current) {
    chain.push(current);
    const nextId = current.childrenIds?.[0];
    current = nextId ? messages[nextId] : undefined;
  }
  return chain;
}

/** Strip <details type="reasoning"> blocks from assistant content. */
function stripReasoning(content: string): string {
  return content.replace(/<details type="reasoning"[^>]*>[\s\S]*?<\/details>\s*/g, "").trim();
}

function convertOpenWebUIJson(raw: string): { slug: string; conversation: Conversation }[] {
  const parsed = JSON.parse(raw);
  const chats: OpenWebUIChat[] = Array.isArray(parsed) ? parsed : [parsed];

  return chats.map((chat) => {
    const rawMessages = walkMessageChain(chat.chat.history.messages);
    const messages: Message[] = rawMessages
      .map((m) => ({
        role: m.role as Message["role"],
        content: m.role === "assistant" ? stripReasoning(m.content) : m.content,
      }))
      .filter((m) => m.content.length > 0);

    const title = chat.title || chat.chat.title || "Imported Chat";
    const model = chat.chat.models?.[0] || "unknown";
    const date = new Date(chat.created_at * 1000).toISOString();
    const tags = ["imported", ...(chat.meta?.tags || [])];

    const frontmatter: Frontmatter = { title, date, model, provider: "open-webui", tags };
    const slug = slugify(title);

    return { slug, conversation: { frontmatter, messages, filePath: "" } };
  });
}

function convertPlainText(raw: string, filename: string): { slug: string; conversation: Conversation } {
  const blocks = raw.split(/^### (USER|ASSISTANT)\s*$/m);
  const messages: Message[] = [];
  for (let i = 1; i < blocks.length; i += 2) {
    const role = blocks[i].toLowerCase() === "user" ? "user" : "assistant";
    const content = (blocks[i + 1] || "").trim();
    if (content) messages.push({ role: role as Message["role"], content });
  }

  const title = path.basename(filename, path.extname(filename)).replace(/[-_]/g, " ");
  const frontmatter: Frontmatter = {
    title,
    date: new Date().toISOString(),
    model: "unknown",
    provider: "open-webui",
    tags: ["imported"],
  };

  const slug = slugify(title);
  return { slug, conversation: { frontmatter, messages, filePath: "" } };
}

function detectFormat(filePath: string, raw: string): "openwebui-json" | "openwebui-txt" | "unknown" {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".json") {
    try {
      const parsed = JSON.parse(raw);
      const obj = Array.isArray(parsed) ? parsed[0] : parsed;
      if (obj?.chat?.history?.messages) return "openwebui-json";
    } catch { /* not valid json */ }
  }
  if (ext === ".txt" && /^### (USER|ASSISTANT)\s*$/m.test(raw)) {
    return "openwebui-txt";
  }
  return "unknown";
}

export async function runConvert(args: string[]): Promise<void> {
  const inputFile = args.find((a) => !a.startsWith("-") && a !== "convert");
  if (!inputFile) {
    console.error("Usage: vaultchat convert <file.json|file.txt> [--output-dir <dir>]");
    process.exit(1);
  }

  if (!fs.existsSync(inputFile)) {
    console.error(`File not found: ${inputFile}`);
    process.exit(1);
  }

  const outputIdx = args.indexOf("--output-dir");
  const outputDir = outputIdx !== -1 ? args[outputIdx + 1] : ".";
  fs.mkdirSync(outputDir, { recursive: true });

  const raw = fs.readFileSync(inputFile, "utf-8");
  const format = detectFormat(inputFile, raw);

  if (format === "unknown") {
    console.error("Could not detect format. Supported: Open WebUI JSON export, Open WebUI TXT export.");
    process.exit(1);
  }

  let results: { slug: string; conversation: Conversation }[];

  if (format === "openwebui-json") {
    results = convertOpenWebUIJson(raw);
  } else {
    results = [convertPlainText(raw, inputFile)];
  }

  for (const { slug, conversation } of results) {
    const outPath = path.join(outputDir, `${slug}.md`);
    const md = serializeConversation(conversation);
    fs.writeFileSync(outPath, md);
    console.log(`  ${outPath}`);
  }

  console.log(`\nConverted ${results.length} chat(s)`);
}
