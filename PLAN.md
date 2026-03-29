# VaultChat MVP — Implementation Plan

## Phase 1: Project Scaffolding
- [x] `bun init`, `tsconfig.json`
- [x] Install core deps: `ink`, `react`, `@inkjs/ui`, `@types/react`, `bun-types`
- [x] Create directory structure: `src/providers/`, `src/tui/screens/`, `src/tui/components/`, `src/vault/`, `src/markdown/`, `src/hooks/`
- [x] Minimal `src/index.tsx` — renders "VaultChat" to terminal
- [x] `bun run dev` works

## Phase 2: Core Types + Config + Markdown Parser
- [x] Define types: `Message`, `Conversation`, `Frontmatter` in `src/markdown/types.ts`
- [x] Define provider types: `LLMProvider`, `ModelInfo`, `StreamChunk` in `src/providers/types.ts`
- [x] Config management in `src/vault/config.ts` — read/write `~/.vaultchat/config.json`
- [x] Markdown parser in `src/markdown/parser.ts` — code-fence-aware `---` splitting
- [x] Markdown serializer in `src/markdown/serializer.ts`
- [x] Tests: round-trip parse/serialize the spec example (11 tests passing)

## Phase 3: OpenRouter Provider
- [x] Implement `LLMProvider` interface in `src/providers/openrouter.ts`
- [x] `validateKey()` — via `/api/v1/auth/key` endpoint
- [x] `listModels()` — fetch and map to `ModelInfo[]`
- [x] `chat()` — streaming completions via SSE with raw fetch
- [x] Provider registry in `src/providers/registry.ts`
- [x] Model caching to `~/.vaultchat/providers/<provider>/models.json`

## Phase 4: First-Run Wizard
- [x] `src/tui/screens/Wizard.tsx` — multi-step setup
- [x] Step: choose provider (Select)
- [x] Step: enter API key (TextInput with placeholder)
- [x] Step: validate key (Spinner + /auth/key request)
- [x] Step: choose model (searchable/filterable list, ★ recommended models first)
- [x] Step: save config
- [x] Routing in `src/tui/App.tsx`: no config → wizard, config found → main app

## Phase 5: File Tree (Left Panel)
- [x] `src/vault/files.ts` — list `.md` files, watch for changes (Bun native fs.watch), create new chat files
- [x] `src/hooks/useFileTree.ts` — file listing + watcher state, j/k and arrow nav
- [x] `src/tui/components/FileTree.tsx` — bordered list, keyboard nav, `+ New Chat` at top, scroll indicators
- [x] `src/tui/screens/Main.tsx` — horizontal layout with FileTree + chat placeholder, Tab to switch panels
- [x] Scrollable when files exceed viewport

## Phase 6: Chat View (Right Panel)
- [x] `src/tui/components/MessageBubble.tsx` — rendered markdown per message, color-coded roles
- [x] `src/tui/components/ChatView.tsx` — scrollable message list, auto-scroll to bottom
- [x] `src/tui/screens/Main.tsx` — wired up FileTree + ChatView, loads conversation on file select
- [x] `src/hooks/useChat.ts` — load conversation from file via parser
- [x] `src/markdown/render.ts` — markdown rendering with `marked@9` + `marked-terminal@6`
- [x] Tab to switch focus between panels
- [x] Status bar at bottom

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
