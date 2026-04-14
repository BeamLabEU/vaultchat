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

- `dev_docs/SPEC.md` — full product spec and file format definition
- `dev_docs/PLAN.md` — phased implementation plan with checkboxes

## Release Process

Releases are tag-driven via `.github/workflows/release.yml`. To ship a new version:

1. Ask the user what version to bump to (see user feedback on versioning).
2. Update the version in three places, they must stay in sync:
   - `package.json` → `"version"`
   - `src/version.ts` → `VERSION` constant (smoke test reads this)
   - `CHANGELOG.md` → new dated entry at the top
3. Commit, push to `main`.
4. Tag and push: `git tag vX.Y.Z && git push origin vX.Y.Z`.
5. Pushing a `v*` tag triggers the workflow, which runs tests, cross-compiles
   four binaries (`linux-x64`, `linux-arm64`, `darwin-x64`, `darwin-arm64`) via
   `bun build --compile`, and publishes a GitHub Release with auto-generated
   notes. Takes ~3–5 minutes.
