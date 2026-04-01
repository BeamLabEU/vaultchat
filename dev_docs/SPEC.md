# VaultChat — Conversation File Format Spec

## Original Idea and Motivation

We are heavy users of [Open WebUI](https://github.com/open-webui/open-webui), and it allows us chatting with many different models in one place, but works only via browser, UI is pretty slow and heavy for mobile use, and idea cane to create something similar but tui based, so we can use it from the terminal from any device. After some internal brainstorming and chatting with AI, new idea came to store all ai dialogs in md files (and in [Obsidian](https://obsidian.md/) and under git if needed). We want it to be completely provider-agnostic — so we can chat with Ollama, OpenAI, Anthropic, or anything OpenAI-compatible. And of course we want to be able to point it at [OpenRouter](https://openrouter.ai/) or run local models via [Ollama](https://ollama.com/) side by side.

The most important for us was to able to run it in the terminal, so we started to look around and look for other tui llm chat clients, and we found these solutions:

- [Elia](https://github.com/darrenburns/elia) — probably the closest to "Open WebUI for the terminal." It's keyboard-centric, stores conversations in SQLite, supports ChatGPT, Claude, and local models via Ollama. GitHub Built with Textual (Python), has an inline mode so it doesn't go fullscreen, and feels very polished. Would play nicely with your tmux workflow. Last commit was 2 years ago (at least to main branch), and last release 1.10.0 was on Sep 14, 2024, also 2 years ago, 7 prs are pending since 2025, looks like abandoned project. It is written in Python.

- [Parllama](https://github.com/paulrobello/parllama) — It says that PAR LLAMA is a TUI (Text UI) application designed for easy management and use of Ollama based LLMs, very close to what we want. It says that it supports OpenAI, Groq, Anthropic, Gemini, xAI, OpenRouter, DeepSeek, LiteLLM, and Ollama. Has dark/light modes, custom themes, prompt library, chat history, chat tabs for multiple models, and you can discover and download Ollama models from within the TUI. The application is built with [Textual](https://textual.textualize.io/) and [Rich](https://github.com/Textualize/rich). Textual is a Rapid Application Development framework for Python, and Rich is a Python library for rich text and beautiful formatting in the terminal. 

- [tenere](https://github.com/pythops/tenere) — Tenere is pretty cool, pretty lean and Rust-based, it also has Vim-style keybindings, supports ChatGPT, llama.cpp, and Ollama backends, their GitHub Very minimal, very fast. Latest release is v0.11.3 which was released on Sep 1, 2025. 

- [oatmeal](https://github.com/dustinblackman/oatmeal) — Another Rust-based solution, with direct Neovim integration and support for Ollama, OpenAI, Claude, and Gemini backends, they have nice chat bubbles UI. Latest release is v0.13.0, which was on Mar 16, 2024, couple of years ago, so, also abandoned project. Looks like author decided to use fantastic library in the Rust ecosystem [Ratatui](https://ratatui.rs/). 4 pending PRs from 2024 and 2025, so project got abandoned.

Unfortunatelly none of these projects we found were using Markdown for storing ai chats.

Essentially we want an LLM TUI that’s vault-native — you run it from within your Obsidian vault, conversations get saved as .md files with proper frontmatter, and they instantly become part of our knowledge graph. Searchable, linkable, taggable. This should open up some powerful possibilities: we could [[link]] to other notes as context, the AI responses become permanent knowledge artifacts, and we could even use Obsidian’s dataview or search to query across all your past conversations. 

## Obsidian plugins

Did some research about existing Obsidian plugins, which store conversations in md files, and turns out there's a lot happening here, and the closest matches to our idea were:

- **[ChatGPT MD](https://github.com/bramses/chatgpt-md)** - It says that it is "a (nearly) seamless integration of ChatGPT into Obsidian". 1.4k stars on github, and with very recent commits, so looks like it is active and not abandoned. 

- **[LLM docs](https://github.com/shane-lamb/obsidian-llm-docs)** — conversations happen directly in plain markdown files that you can freely edit. It can follow links to other Obsidian documents included in the prompt for additional context. Works with OpenAI-compatible APIs (so OpenRouter works). This is probably the purest version of what we were thinking about.

- **[Caret](https://github.com/jcollingj/caret)** — stores chat logs as markdown files and integrates with Obsidian Canvas for non-linear visual workflows. Compatible with OpenAI, Anthropic, and custom models, with all data staying in the vault. Last release 0.2.80 was on Oct 23, 2025. 199 stars on github, and last commit 5 months ago. 

- **[Obsidian Copilot](https://github.com/logancyang/obsidian-copilot)** — the most feature-rich option. Supports OpenRouter, Gemini, OpenAI, Anthropic, Cohere as providers. Has vault-wide RAG search, long-term memory, and their philosophy is explicitly anti-lock-in: data is always yours, use whatever LLM you like. Though it has a paid "Plus" tier for some features.

- **[BMO Chatbot](https://www.obsidianstats.com/tags/llm)** — supports multiple LLMs from OpenAI, Anthropic, and self-hosted APIs like Ollama. Users can save conversations in markdown format.

So the Obsidian plugin ecosystem actually actually covers this idea pretty well — especially **LLM docs** for the "conversations as plain markdown" philosophy, and **Copilot** for the full-featured vault-aware approach.

Does any of these great plugins scratch the itch, or is there still a gap these plugins don't cover? The TUI angle specifically — running it headless from terminal without Obsidian open — **that's the piece none of them do**.

## Techstack brainstorming and deciding what frameworks to use

We are Elixir shop, so we try to do all our projects in Elixir, and it is great for servers and web apps, but for a CLI tool that people brew install or grab a binary — it’s friction. Ratatouille exists but the TUI ecosystem is thin, and Burrito for packaging binaries is still rough. Looks like realistic options for this kind of project:

- [Go](https://go.dev) + [Bubble Tea](https://github.com/charmbracelet/bubbletea) — probably the sweet spot for our usecase. The Charm ecosystem is incredible for TUIs (bubbletea, glamour for markdown rendering, lipgloss for styling). Single static binary, cross-compile trivially, brew install ready. This is what most modern TUI tools are built with.

- [Rust](https://rust-lang.org/) + [Ratatui](https://ratatui.rs/) — same single-binary advantage, slightly steeper curve, but tenere proves it works well for LLM TUIs.

- [Python](https://www.python.org/) + [Textual](https://textual.textualize.io/) — what parllama uses. Easiest to prototype, pip install works, but you know the Python dependency hell story.

- [TypeScript](https://www.typescriptlang.org/) + [Ink](https://github.com/vadimdemedes/ink) - Ink’s ecosystem is impressive — it’s basically React for the terminal, so the mental model is familiar to a huge number of developers. And the fact that both Claude Code and Gemini CLI chose it independently is a strong signal. It also has a practical advantage for vaultchat specifically: since OpenRouter and all the LLM APIs have first-class TypeScript/JS SDKs, you’d have zero friction on the provider integration side. Markdown rendering in the terminal is also well-solved in the JS ecosystem (marked, marked-terminal, etc.).

First AI's take is to use **Go + Bubble Tea** combination, which gives the best balance of developer experience, distribution simplicity, and a rich TUI ecosystem. The Charm libs even have built-in markdown rendering which is perfect for displaying LLM responses inside the vault context. But after futher research it was decided to use **TypeScript + Ink**, and this combination won because:
- Richer component model (it’s literally React)
- Better LLM SDK support out of the box
- LLMs can help write more of the code
- Huge ecosystem (markdown rendering, syntax highlighting, etc.)
- Claude Code and Gemini CLI prove it works at scale

There are some downsides of course for Ink/TypeScript - like it needs Node.js runtime (though Bun is lighter), heavier than a single Go binary, and of course the dependency tree can get messy, this is common node.js problem. 

Since our VaultChat will be a tool that’s primarily about chat, markdown, and API calls — not sandboxing or filesystem security like Codex needed — **TypeScript + Ink** feels like the right call.​​​​​​​​​​​​​​​​

## Tech Stack (Decided)

| Choice | Decision | Rationale |
|--------|----------|-----------|
| **Runtime** | [Bun](https://bun.sh/) | 3-5x faster cold start than Node, native TS execution, built-in bundler, faster file I/O (`Bun.file()`, `Bun.write()`) for heavy .md read/write, built-in SQLite for future metadata indexing |
| **Language** | TypeScript | First-class LLM SDK support, LLMs can help write more code, huge ecosystem |
| **TUI framework** | [Ink](https://github.com/vadimdemedes/ink) | React for the terminal — rich component model, proven at scale by Claude Code and Gemini CLI |
| **Package manager** | bun | Native to the runtime |
| **Testing** | `bun test` | Built-in, fast, Jest-compatible API — no extra dependencies |
| **Distribution** | Compiled binary + `bun install -g` | Bun's compile-to-binary produces ~60MB self-contained binaries for macOS/Linux/Windows, no Node.js required (inspired by Tigris CLI's successful migration) |

### Project Structure

Monorepo with clear module boundaries inside `src/`:

```
src/
  providers/    # LLM provider integrations (OpenRouter, Ollama, OpenAI-compatible)
  tui/          # Ink components and screens
  vault/        # File system operations, vault discovery, .md file management
  markdown/     # Parser/serializer for the conversation file format
```

-----

## Design Principles

1. **Keep everything local** — no cloud storage or third-party services beyond LLM providers
1. **No external services except LLM providers** — no external APIs, DBs, RAG providers etc.
1. **All conversations stored as markdown files** — works in Obsidian vaults but also any directory
1. **Plain markdown first** — must look good in any markdown viewer, not just Obsidian
1. **Obsidian-native** — frontmatter, tags, `[[wikilinks]]` work as expected
1. **Parseable** — vaultchat can reliably round-trip (read/write) without losing data
1. **Editable** — user can freely edit any part of the conversation and re-submit
1. **Diffable** — git-friendly, no binary blobs
1. **Directory-agnostic** — works in any directory, not just Obsidian vaults
1. **The filesystem is the database** — file paths are identity, no synthetic IDs needed

-----

## Configuration & Settings

All configuration lives in `~/.vaultchat/`:

```
~/.vaultchat/
  config.json                    # Main config (active provider, active model, favorites, etc.)
  providers/
    openrouter/
      models.json                # Cached model list (refreshed when stale)
    ollama/
      models.json
```

### First-Run Wizard (TUI)

If no config exists at `~/.vaultchat/config.json`, vaultchat launches an interactive setup wizard:

1. **Choose provider** — show list of supported providers (start with OpenRouter)
2. **Enter API key** — prompt for the key
3. **Validate key** — make a test API request; show error if invalid, continue if valid
4. **Choose model** — fetch model list from provider, show searchable/filterable list with recommended models highlighted at the top
5. **Save config** — write to `~/.vaultchat/config.json`

### Model List Caching

- On first use (or when cache is stale), fetch full model list from provider API
- Cache per provider: `~/.vaultchat/providers/<provider>/models.json`
- Provide a way to refresh (e.g., in settings panel, or automatically after N days)
- Models are many — the list needs filter/search functionality

### Settings Panel (TUI)

Accessible from the main TUI via a settings button/shortcut:

- **Providers** — add/remove/edit providers and API keys
- **Favorite models** — mark models as favorites, shown first in the model dropdown
- Provider/model switching available from the main chat view via a dropdown

-----

## MVP — What We're Building First

1. **First-run wizard** — provider setup, API key validation, model selection (see Configuration section)
2. **Main TUI layout** — file/directory tree on the left showing current directory's `.md` files, chat view on the right
3. **New chat** — `[New Chat]` button creates a new conversation file; default filename initially, renamed after first message by asking the LLM for a good name
4. **Open existing chat** — click/select any `.md` file in the tree to open it
5. **Send & stream** — type a message, send it, stream the LLM response back with markdown rendering
6. **Provider/model switcher** — dropdown to change provider and model mid-session
7. **Settings panel** — configure providers, manage favorites
8. **Save to disk** — all conversations persisted as `.md` files in the spec'd format

Start with OpenRouter as the first provider, but architect the provider layer so adding Ollama and OpenAI-compatible providers is straightforward.

-----

## File Location

Any Obsidian file should be able to be used for LLM conversations, no special file format, we can have extra info in the file when vaultchat creates/updates the conversation file, but any file should be fine. User should be able to rename and organize files freely.

-----

## Frontmatter

```yaml
---
title: Server migration to ARM64
date: 2026-03-28T14:32:00+02:00
model: anthropic/claude-sonnet-4
provider: openrouter
tags:
  - vaultchat
  - servers
  - docker
context:
  - "[[Server Infrastructure]]"
  - "[[Docker Setup Notes]]"
params:
  temperature: 0.7
  max_tokens: 4096
---
```

> **Note:** No synthetic IDs. The filesystem is the database — the file path is the identity. If branching ever needs a parent reference, a `[[wikilink]]` to the parent file is more Obsidian-native than a synthetic ID.

|Field     |Required|Description                                         |
|----------|--------|----------------------------------------------------|
|`title`   |yes     |Auto-generated from first message, user can edit    |
|`date`    |yes     |ISO 8601 creation timestamp                         |
|`model`   |yes     |Model identifier (OpenRouter-style `provider/model`)|
|`provider`|yes     |Backend: `openrouter`, `ollama`, `openai`, etc.     |
|`tags`    |no      |Always includes `vaultchat`, user can add more      |
|`context` |no      |List of `[[wikilinks]]` fed as context at start     |
|`params`  |no      |LLM parameters override for this conversation       |

-----

## Message Format

Messages are separated by horizontal rules (`---`) and use H6 headers (`######`) as role markers. H6 is chosen deliberately — it’s the lowest heading level, unlikely to conflict with content, and renders small/subtle in Obsidian.

```markdown
###### user
How do I migrate my Docker containers from x86 to ARM64?

I have about 100 containers running on Ubuntu. See [[Docker Setup Notes]] for current config.

---

###### assistant
Here's a migration strategy for your setup...

1. **Audit your images** — check which ones have multi-arch support:

   ```bash
   docker manifest inspect <image> | jq '.[].platform'
```

1. **Build ARM64 variants** for custom images using buildx:
   
   ```bash
   docker buildx build --platform linux/arm64 -t myapp:arm64 .
   ```

-----

###### user

What about the database containers? PostgreSQL should be fine but I’m worried about Redis.

-----

###### assistant

Both PostgreSQL and Redis have official ARM64 images…

```
### Role Types

| Role        | Marker               | Description                              |
|-------------|----------------------|------------------------------------------|
| `user`      | `###### user`        | Human message                            |
| `assistant` | `###### assistant`   | LLM response                             |
| `system`    | `###### system`      | System prompt (if present, must be first)|
| `context`   | `###### context`     | Injected vault content (auto-generated)  |

### System Prompt (Optional)

If present, appears as the first message before any user/assistant exchange:

```markdown
---
title: ...
date: ...
---

###### system
You are a senior DevOps engineer. Be concise. Prefer Docker Compose examples.

---

###### user
How do I set up Grafana with Loki?
```

### Context Injection

When `context` field lists wikilinks, vaultchat resolves them and injects content
as a `###### context` block. This block is auto-generated and marked as such:

```markdown
###### context
<!-- vaultchat:auto-context — do not edit, regenerated on each send -->

**From [[Docker Setup Notes]]:**
Currently running 108 containers across 3 servers...

**From [[Server Infrastructure]]:**
Primary: Hetzner ARM64, Ubuntu 24.04...

---

###### user
Given my current setup, what's the best way to add monitoring?
```

-----

## Inline Context References

Users can reference vault notes inline using standard wikilinks.
Vaultchat resolves these at send-time:

```markdown
###### user
I want to refactor the payment module described in [[PhoenixKit Payments]]
to support Stripe and LemonSqueezy. What's the best approach?
```

Vaultchat will:

1. Resolve `[[PhoenixKit Payments]]` to the actual note
1. Include its content in the API call as additional context
1. **Not modify** the user’s message in the file — the link stays as-is

-----

## Continuation & Editing

### Editing a message

User can edit any message in the file. When vaultchat detects an edit
above the last assistant response, it can re-generate from that point
(with confirmation).

### Continuing a conversation

User opens the file in vaultchat (or uses `vaultchat continue <file>`).
New messages are appended.

### Branching (future)

For conversation branching, a new file is created with a `parent` field
in frontmatter pointing to the original via wikilink:

```yaml
---
title: Server migration (alt approach)
parent: "[[Server migration to ARM64]]"
branch_from: 3  # message index where branch started
---
```

-----

## Complete Example

```markdown
---
title: Caddy reverse proxy setup
date: 2026-03-28T14:32:00+02:00
model: anthropic/claude-sonnet-4
provider: openrouter
tags:
  - vaultchat
  - caddy
  - infrastructure
context:
  - "[[Server Infrastructure]]"
---

###### context
<!-- vaultchat:auto-context — do not edit, regenerated on each send -->

**From [[Server Infrastructure]]:**
Primary server: Hetzner CAX41 ARM64, Ubuntu 24.04
Reverse proxy: Caddy 2.7
Docker network: caddy_net (bridge)

---

###### user
I need to add automatic SSL for a new subdomain pointing to a Docker container on port 8080.

---

###### assistant
Add this to your Caddyfile:
```

newapp.don.ee {
reverse_proxy container_name:8080 {
transport http {
versions 1.1 2
}
}
}

```
Then reload:

```bash
docker exec -w /etc/caddy caddy caddy reload
```

Since you’re using Caddy with Docker, make sure the container is on the `caddy_net` network.

-----

###### user

Can I add rate limiting to this?

-----

###### assistant

Yes, using the `rate_limit` directive…

```
---

## File Format Rules Summary

1. Frontmatter is standard YAML between `---` fences
2. Messages are separated by `---` (horizontal rules)
3. Each message starts with `###### role` on its own line
4. Everything between the role marker and the next `---` is message content
5. Standard markdown is used inside messages (code blocks, links, lists, etc.)
6. `[[wikilinks]]` in user messages are resolved but not modified
7. The file is always valid markdown, viewable anywhere
8. The `vaultchat` tag is always present for easy Obsidian filtering
```
