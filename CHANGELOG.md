# Changelog

All notable changes to VaultChat are documented here.

## [0.2.0] - 2026-04-01

### Added
- Directory browsing in file tree with `..` navigation to parent
- Directories shown in yellow above files, sorted alphabetically
- Version number displayed in status bar (`VaultChat v0.2.0`)
- Update-available notification in status bar when a newer release exists

### Fixed
- Long file names are now truncated with `…` instead of wrapping to multiple lines
- File list sorted alphabetically (case-insensitive, natural number ordering) instead of by modification date
- Opening an existing note and chatting no longer renames the file — auto-rename only applies to VaultChat-created chats

### Changed
- Renamed `CLAUDE.md` to `AGENTS.md` for agent-agnostic conventions
- Moved `PLAN.md` and `SPEC.md` into `dev_docs/` directory

## [0.1.2] - 2026-04-01

### Fixed
- Opening a plain Obsidian markdown file no longer discards its content
- Original note text is now preserved on disk through save cycles
- LLM can now reference original note content (sent as context automatically)

### Added
- "Original Note" section displayed at top of chat view when opening non-chat files

## [0.1.1] - 2026-04-01

### Added
- `--version` / `-v` flag to print version
- `--help` / `-h` flag with usage info
- `--check-update` flag to check GitHub for newer releases
- `--doctor` flag to run diagnostic checks (config, API key, provider reachability)
- `--doctor --json` for machine-readable diagnostics
- Non-blocking update notification banner in the TUI on startup
- Developer scripts: `bun run smoke`, `bun run doctor`, `bun run hardening`, `bun run hardening:strict`

### Changed
- README updated with CLI flags, update checking, and diagnostics documentation

## [0.1.0] - 2026-03-29

### Added
- Initial release
- TUI with file tree and chat panels, keyboard and mouse navigation
- OpenRouter provider with streaming responses and 100+ models
- Markdown-native conversation format with `###### role` headers
- First-run setup wizard (provider, API key, model selection)
- `[[Wikilink]]` context resolution (inline and frontmatter-based)
- Model switcher with searchable list and favorites
- Settings panel for provider and model management
- Mouse support (click to focus panels, scroll wheel)
- Auto-naming of chat files after first exchange
- Cross-platform binaries (Linux x64/arm64, macOS x64/arm64)
- GitHub Actions release workflow on version tags

[0.2.0]: https://github.com/BeamLabEU/vaultchat/releases/tag/v0.2.0
[0.1.2]: https://github.com/BeamLabEU/vaultchat/releases/tag/v0.1.2
[0.1.1]: https://github.com/BeamLabEU/vaultchat/releases/tag/v0.1.1
[0.1.0]: https://github.com/BeamLabEU/vaultchat/releases/tag/v0.1.0
