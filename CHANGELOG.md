# Changelog

All notable changes to VaultChat are documented here.

## [0.2.5] - 2026-04-01

### Fixed
- File tree scroll position preserved when clicking items (no more jumping)
- Empty row at bottom of file tree removed (viewport height corrected)
- Streaming response no longer pushes message text around (fixed-height reserve area)
- Reduced flicker: `React.memo` on FileTree, overflow clipping on streaming block
- Update status icons: `↓` for downloading, `✓` for installed, `✗` for failed

## [0.2.4] - 2026-04-01

### Fixed
- File tree header no longer overlaps with first item when list is scrollable
- Mouse click now selects the correct item when file tree is scrolled
- Streaming response no longer overlaps with chat messages
- Reduced screen flashing: incremental rendering, alternate screen buffer, hidden cursor
- Removed unnecessary "restart" message from CLI `vaultchat update` command

## [0.2.3] - 2026-04-01

### Added
- Auto-update on launch: binary is downloaded in background, status bar shows "restart to use" when ready
- Subcommand CLI style: `vaultchat update`, `vaultchat doctor`, `vaultchat check-update`, `vaultchat help`

### Fixed
- File tree header rendering bug ("Files" label merging with first item)
- Removed duplicate update banner from App.tsx

### Changed
- Old `--flags` still work alongside new subcommands

## [0.2.2] - 2026-04-01

### Added
- Single click to select items in file tree
- Double click to open files, navigate into directories, or go up with `..`
- Home key (or `g`) jumps to first item in file tree
- End key (or `G`) jumps to last item in file tree

## [0.2.1] - 2026-04-01

### Added
- `--update` flag for self-updating: downloads latest binary and replaces itself in-place
- Safety guard preventing self-update from overwriting the bun/node runtime when running from source
- TUI update notification now shows `(run --update)` hint

### Changed
- `--check-update` output now suggests `vaultchat --update` instead of a download link

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

[0.2.5]: https://github.com/BeamLabEU/vaultchat/releases/tag/v0.2.5
[0.2.4]: https://github.com/BeamLabEU/vaultchat/releases/tag/v0.2.4
[0.2.3]: https://github.com/BeamLabEU/vaultchat/releases/tag/v0.2.3
[0.2.2]: https://github.com/BeamLabEU/vaultchat/releases/tag/v0.2.2
[0.2.1]: https://github.com/BeamLabEU/vaultchat/releases/tag/v0.2.1
[0.2.0]: https://github.com/BeamLabEU/vaultchat/releases/tag/v0.2.0
[0.1.2]: https://github.com/BeamLabEU/vaultchat/releases/tag/v0.1.2
[0.1.1]: https://github.com/BeamLabEU/vaultchat/releases/tag/v0.1.1
[0.1.0]: https://github.com/BeamLabEU/vaultchat/releases/tag/v0.1.0
