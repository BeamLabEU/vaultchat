# VaultChat

TUI AI chat client that stores conversations as markdown files. Lives in Obsidian vaults.

## Runtime & Tooling

- **Runtime:** Bun (not Node.js)
- **Language:** TypeScript
- **TUI framework:** Ink (React for terminal)
- **Testing:** `bun test`
- **Package manager:** `bun install`

## Bun Conventions

- Use `bun <file>` instead of `node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun install` instead of `npm install`
- Use `bun run <script>` instead of `npm run <script>`
- Bun automatically loads .env — don't use dotenv
- Prefer `Bun.file()` / `Bun.write()` over `node:fs` readFile/writeFile
- Use `bun:sqlite` if SQLite is needed
- For more info, see `node_modules/bun-types/docs/**.mdx`

## Project Structure

```
src/
  index.tsx          # Entry point
  providers/         # LLM provider integrations
  tui/
    screens/         # Full-screen views (Main, Wizard, Settings)
    components/      # Reusable Ink components
  vault/             # File system, config, wikilink resolution
  markdown/          # Conversation file parser/serializer
  hooks/             # React hooks
```

## Key Files

- `SPEC.md` — full product spec and file format definition
- `PLAN.md` — phased implementation plan with checkboxes
