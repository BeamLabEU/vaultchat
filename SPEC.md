# VaultChat — Conversation File Format Spec

## Original Idea and Motivation

We are heavy users of [Open WebUI](https://github.com/open-webui/open-webui), and it allows us chatting with many different models in one place, but works only via browser, UI is pretty slow and heavy for mobile use, and idea cane to create something similar but tui based, so we can use it from the terminal from any device. After some internal brainstorming and chatting with AI, new idea came to store all ai dialogs in md files (and in [Obsidian](https://obsidian.md/) and under git if needed). We want it to be completely provider-agnostic — so we can chat with Ollama, OpenAI, Anthropic, or anything OpenAI-compatible. And of course we want to be able to point it at [OpenRouter](https://openrouter.ai/) or run local models via [Ollama](https://ollama.com/) side by side.

The most important for us was to able to run it in the terminal, so we started to look around and look for other tui llm chat clients, and we found these solutions:

- [Elia](https://github.com/darrenburns/elia) — probably the closest to "Open WebUI for the terminal." It's keyboard-centric, stores conversations in SQLite, supports ChatGPT, Claude, and local models via Ollama. GitHub Built with Textual (Python), has an inline mode so it doesn't go fullscreen, and feels very polished. Would play nicely with your tmux workflow. Last commit was 2 years ago (at least to main branch), and last release 1.10.0 was on Sep 14, 2024, also 2 years ago, 7 prs are pending since 2025, looks like abandoned project. It is written in Python.

- [Parllama](https://github.com/paulrobello/parllama) — It says that PAR LLAMA is a TUI (Text UI) application designed for easy management and use of Ollama based LLMs, very close to what we want. It says that it supports OpenAI, Groq, Anthropic, Gemini, xAI, OpenRouter, DeepSeek, LiteLLM, and Ollama. Has dark/light modes, custom themes, prompt library, chat history, chat tabs for multiple models, and you can discover and download Ollama models from within the TUI. The application is built with [Textual](https://textual.textualize.io/) and [Rich](https://github.com/Textualize/rich). Textual is a Rapid Application Development framework for Python, and Rich is a Python library for rich text and beautiful formatting in the terminal. 

- [tenere](https://github.com/pythops/tenere) — Tenere is pretty cool, pretty lean and Rust-based, it also has Vim-style keybindings, supports ChatGPT, llama.cpp, and Ollama backends, their GitHub Very minimal, very fast.

- oatmeal — also Rust-based, with direct Neovim integration and support for Ollama, OpenAI, Claude, and Gemini backends. GitHub Nice chat bubbles UI.


## Design Principles

1. **Plain markdown first** — must look good in any markdown viewer, not just Obsidian
1. **Obsidian-native** — frontmatter, tags, `[[wikilinks]]` work as expected
1. **Parseable** — vaultchat can reliably round-trip (read/write) without losing data
1. **Editable** — user can freely edit any part of the conversation and re-submit
1. **Diffable** — git-friendly, no binary blobs

-----

## File Location

```
my-vault/
├── vaultchat/                    # default conversations directory
│   ├── 2026-03-28-server-migration.md
│   ├── 2026-03-27-elixir-genserver-question.md
│   └── ...
├── vaultchat.toml                # config file (vault-level)
└── ... (rest of vault)
```

- Default directory: `vaultchat/` in vault root (configurable)
- Filename: `{date}-{slug}.md` auto-generated from first user message
- User can rename files freely — vaultchat uses frontmatter `id` for tracking

-----

## Frontmatter

```yaml
---
id: 01JQXK5V7G3M8N2P4R6T9W1Y
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

|Field     |Required|Description                                         |
|----------|--------|----------------------------------------------------|
|`id`      |yes     |ULIDv7 or UUIDv7 — unique conversation identifier   |
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
id: ...
title: ...
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
in frontmatter pointing to the original:

```yaml
---
id: 01JQXM8...
title: Server migration (alt approach)
parent: 01JQXK5V7G3M8N2P4R6T9W1Y
branch_from: 3  # message index where branch started
---
```

-----

## Complete Example

```markdown
---
id: 01JQXK5V7G3M8N2P4R6T9W1Y
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
