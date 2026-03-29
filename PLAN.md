# VaultChat MVP — Implementation Plan

## Phase 1: Project Scaffolding
- [ ] `bun init`, `tsconfig.json`, `bunfig.toml`
- [ ] Install core deps: `ink`, `react`, `@inkjs/ui`, `typescript`, `@types/react`, `bun-types`
- [ ] Create directory structure: `src/providers/`, `src/tui/screens/`, `src/tui/components/`, `src/vault/`, `src/markdown/`, `src/hooks/`
- [ ] Minimal `src/index.tsx` — renders "VaultChat" to terminal
- [ ] `bun run dev` works

## Phase 2: Core Types + Config + Markdown Parser
- [ ] Define types: `Message`, `Conversation`, `Frontmatter` in `src/markdown/types.ts`
- [ ] Define provider types: `LLMProvider`, `ModelInfo`, `StreamChunk` in `src/providers/types.ts`
- [ ] Config management in `src/vault/config.ts` — read/write `~/.vaultchat/config.json`
- [ ] Markdown parser in `src/markdown/parser.ts` — code-fence-aware `---` splitting
- [ ] Markdown serializer in `src/markdown/serializer.ts`
- [ ] Tests: round-trip parse/serialize the spec example

## Phase 3: OpenRouter Provider
- [ ] Implement `LLMProvider` interface in `src/providers/openrouter.ts`
- [ ] `validateKey()` — test API request
- [ ] `listModels()` — fetch and map to `ModelInfo[]`
- [ ] `chat()` — streaming completions via SSE
- [ ] Provider registry in `src/providers/registry.ts`
- [ ] Model caching to `~/.vaultchat/providers/openrouter/models.json`

## Phase 4: First-Run Wizard
- [ ] `src/tui/screens/Wizard.tsx` — multi-step setup
- [ ] Step: choose provider (Select)
- [ ] Step: enter API key (PasswordInput)
- [ ] Step: validate key (Spinner + test request)
- [ ] Step: choose model (searchable/filterable list)
- [ ] Step: save config
- [ ] Routing in `App.tsx`: no config → wizard, config found → main app

## Phase 5: File Tree (Left Panel)
- [ ] `src/vault/files.ts` — list `.md` files, watch for changes
- [ ] `src/hooks/useFileTree.ts` — file listing + watcher state
- [ ] `src/tui/components/FileTree.tsx` — bordered list, keyboard nav, `[New Chat]` at top
- [ ] Scrollable when files exceed viewport

## Phase 6: Chat View (Right Panel)
- [ ] `src/tui/components/MessageBubble.tsx` — rendered markdown per message
- [ ] `src/tui/components/ChatView.tsx` — scrollable message list
- [ ] `src/tui/screens/Main.tsx` — horizontal layout: FileTree | ChatView
- [ ] `src/hooks/useChat.ts` — load conversation from file
- [ ] Markdown rendering with `marked` + `marked-terminal` + `cli-highlight`
- [ ] Tab to switch focus between panels
- [ ] Status bar at bottom

## Phase 7: Send Messages + Stream Responses + Wikilink Context
- [ ] Text input at bottom of ChatView
- [ ] `useChat.sendMessage()` — append user msg, stream assistant response
- [ ] `src/tui/components/StreamingText.tsx` — real-time chunk rendering
- [ ] Save conversation to disk after each message
- [ ] Auto-rename file after first exchange (ask LLM for filename)
- [ ] `src/vault/files.ts` — `createNewChat()` with default filename
- [ ] `src/vault/wikilinks.ts` — resolve `[[wikilinks]]` to file contents at send-time
- [ ] Inject resolved context into API call (frontmatter `context` field + inline wikilinks)

## Phase 8: Provider/Model Switcher
- [ ] `src/tui/components/ModelSwitcher.tsx` — modal overlay
- [ ] `Ctrl+M` to open
- [ ] Searchable/filterable model list
- [ ] Favorite models shown first
- [ ] Updates config + current conversation frontmatter

## Phase 9: Settings Panel
- [ ] `src/tui/screens/Settings.tsx`
- [ ] Providers tab: add/remove/edit providers + API keys + test connection
- [ ] Favorites tab: toggle favorite models
- [ ] `Ctrl+S` to open, `Escape` to close

## Phase 10: Polish & Edge Cases
- [ ] Error handling: network errors, invalid API key, file write failures
- [ ] Graceful shutdown: abort streaming on Ctrl+C, save partial response
- [ ] Non-VaultChat `.md` files: display read-only or offer to convert
- [ ] Keyboard shortcuts reference in status bar

## Key Packages

| Package | Purpose |
|---------|---------|
| `ink` | TUI framework (React for terminal) |
| `react` | Ink peer dependency |
| `@inkjs/ui` | Pre-built components: Select, TextInput, Spinner, etc. |
| `gray-matter` | YAML frontmatter parsing/serialization |
| `marked` + `marked-terminal` | Markdown-to-terminal rendering |
| `cli-highlight` | Syntax highlighting in code blocks |
| `@openrouter/sdk` | OpenRouter API client |
| `zustand` | State management (add later if needed) |

## Key Design Decisions

- **Parser:** Line-by-line scan tracking code fence state — never splits `---` inside code blocks
- **Provider interface:** 3 methods (`validateKey`, `listModels`, `chat`) — easy to add Ollama later
- **State:** Start with React `useState`, add `zustand` only if prop drilling hurts
- **New chats:** Start as `new-chat-YYYY-MM-DD-HHMMSS.md`, renamed after first LLM response
- **Scrolling:** Custom hook tracking viewport height, render visible slice only
- **Streaming:** Re-render markdown on each chunk (throttle to ~60ms if needed)
