# VaultChat

A TUI (terminal UI) AI chat client that stores conversations as plain markdown files. Designed to live in your [Obsidian](https://obsidian.md/) vault — but works in any directory.

Chat with any LLM from your terminal. Every conversation is a `.md` file with proper frontmatter, `[[wikilinks]]`, and tags. Searchable, linkable, diffable, yours.

## Why

- **Terminal-first** — no browser needed, works over SSH, great in tmux
- **Markdown-native** — conversations are plain `.md` files, not locked in a database
- **Obsidian-friendly** — frontmatter, tags, and `[[wikilinks]]` work as expected
- **Provider-agnostic** — OpenRouter (100+ models), with Ollama and direct OpenAI coming next
- **Vault-aware** — reference other notes with `[[wikilinks]]` and they're included as context
- **Git-friendly** — no binary blobs, easy to diff and version control your conversations

## Install

### With Bun (from source)

```bash
git clone https://github.com/BeamLabEU/vaultchat.git
cd vaultchat
bun install
bun run dev
```

### Download binary (no runtime needed)

Grab the latest binary for your platform from [Releases](https://github.com/BeamLabEU/vaultchat/releases).

**Linux x64:**

```bash
curl -fsSL https://github.com/BeamLabEU/vaultchat/releases/latest/download/vaultchat-linux-x64 -o vaultchat
chmod +x vaultchat
mv vaultchat ~/.local/bin/
```

**macOS Apple Silicon:**

```bash
curl -fsSL https://github.com/BeamLabEU/vaultchat/releases/latest/download/vaultchat-darwin-arm64 -o vaultchat
chmod +x vaultchat
mv vaultchat ~/.local/bin/
```

> If `~/.local/bin` isn't in your PATH, use `sudo mv vaultchat /usr/local/bin/` instead.

Also available: `vaultchat-linux-arm64`, `vaultchat-darwin-x64`

### Homebrew (macOS)

Coming soon — `brew install beamlabeu/tap/vaultchat`

### Updating

Check for new releases:

```bash
vaultchat --check-update
```

VaultChat also checks for updates in the background when you launch the TUI — a subtle notification appears at the top if a newer version is available.

To update manually, download the latest binary from [Releases](https://github.com/BeamLabEU/vaultchat/releases) and replace the old one.

## Setup

On first run, VaultChat launches a setup wizard:

1. Choose your LLM provider (OpenRouter to start)
2. Enter your API key (get one at [openrouter.ai/keys](https://openrouter.ai/keys))
3. Pick your default model from a searchable list

Configuration is saved to `~/.vaultchat/config.json`.

## Usage

Run VaultChat from any directory — ideally your Obsidian vault:

```bash
cd ~/my-vault
vaultchat
```

Or with Bun from the repo:

```bash
cd ~/my-vault
bun run /path/to/vaultchat/src/index.tsx
```

### Keyboard shortcuts

| Key | Action |
|-----|--------|
| `Tab` | Switch between file tree and chat panel |
| `Enter` | Open file / send message |
| `Ctrl+N` | New chat |
| `Ctrl+M` | Switch model |
| `Ctrl+S` | Settings |
| `Ctrl+C` | Cancel streaming / quit |
| `j/k` or `↑/↓` | Navigate |
| `Esc` | Close modal / cancel stream |

### How it works

- **Left panel** shows `.md` files in the current directory
- **Right panel** shows the conversation with rendered markdown
- Select `+ New Chat` or press `Ctrl+N` to start a conversation
- Type your message and press `Enter` to send
- The LLM response streams in real-time
- After the first exchange, VaultChat asks the LLM to name the file

### Wikilink context

Reference other notes in your messages:

```
How do I optimize the setup described in [[Server Infrastructure]]?
```

VaultChat resolves the link, reads the file, and includes its content as context in the API call — without modifying your message.

You can also set permanent context in the frontmatter:

```yaml
---
title: Docker migration
model: anthropic/claude-sonnet-4
provider: openrouter
context:
  - "[[Server Infrastructure]]"
  - "[[Docker Setup Notes]]"
---
```

## Conversation format

Every conversation is a valid markdown file:

```markdown
---
title: Caddy reverse proxy setup
date: 2026-03-28T14:32:00+02:00
model: anthropic/claude-sonnet-4
provider: openrouter
tags:
  - vaultchat
  - infrastructure
---

###### user
I need automatic SSL for a new subdomain pointing to port 8080.

-----

###### assistant
Add this to your Caddyfile:

    newapp.example.com {
      reverse_proxy container:8080
    }

Then reload: `docker exec caddy caddy reload`
```

Files use `###### role` headers (H6 — subtle, won't conflict with content) and `---`/`-----` separators. They look good in any markdown viewer.

## CLI flags

| Flag | Description |
|------|-------------|
| `--version`, `-v` | Print version and exit |
| `--help`, `-h` | Show usage help |
| `--check-update` | Check GitHub for a newer release |
| `--doctor` | Run diagnostic checks (config, API key, provider reachability) |
| `--doctor --json` | Same diagnostics, machine-readable JSON output |

## Diagnostics (developers)

If you're working from source, these scripts help catch environment issues early:

```bash
bun run smoke              # build + startup sanity check
bun run doctor             # validate config, API key, provider reachability
bun run doctor:json        # machine-readable JSON to stdout
bun run doctor:report      # persist diagnostics to reports/doctor.json
bun run hardening          # smoke + doctor
bun run hardening:strict   # typecheck + hardening
```

## Tech stack

- **Runtime:** [Bun](https://bun.sh/)
- **TUI:** [Ink](https://github.com/vadimdemedes/ink) (React for the terminal)
- **Language:** TypeScript
- **Markdown:** [marked](https://github.com/markedjs/marked) + [marked-terminal](https://github.com/mikaelbr/marked-terminal)

## License

MIT
