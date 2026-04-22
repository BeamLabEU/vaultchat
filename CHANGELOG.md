# Changelog

All notable changes to VaultChat are documented here.

## [0.3.8] - 2026-04-22

### Changed
- Navigating up with `..` now highlights the directory you just came from in the parent listing, instead of leaving the selection on `..`. Makes browsing deep trees feel stateful.

## [0.3.7] - 2026-04-22

### Changed
- Entering a subdirectory now lands the selection on `..` instead of the `+ New Chat` row, so a second Enter immediately pops back up the tree.

## [0.3.6] - 2026-04-22

### Fixed
- Enter on a directory or file silently did nothing after v0.3.5 stopped it from routing to "New Chat". `handleOpenItemAtIndex` read `fileTree.files[index-2]` from a stale closure where `files` was still `[]`, so the lookup returned `undefined` and early-returned. Same root cause as previous Enter/DOWN bugs — Ink's `useInput` holding a first-render closure past `React.memo` boundaries. `useFileTree` now exposes `filesRef` and `dirRef`, and `handleOpenItemAtIndex`/`navigateUp` read through them.

## [0.3.5] - 2026-04-22

### Fixed
- Enter on a directory or file always created a new chat instead of entering the directory / opening the file. Same stale-closure pattern as v0.3.4: `handleFileSelect` read `selectedIndex` through a `useCallback` closure that Ink's `useInput` kept pinned to the first render (where `selectedIndex=0`, the "+ New Chat" row). Now reads via a ref exported from `useFileTree`.

## [0.3.4] - 2026-04-22

### Fixed
- File tree DOWN/END navigation clamped at index 1 (`..`) when entries existed. Stale `files.length` captured in `useCallback` closures made Ink's `useInput` handler keep reading `0` even after the directory loaded. `moveDown`, `jumpToEnd`, and `select` now read the count via a ref, so they always use the current value without re-creating the callback.

## [0.3.3] - 2026-04-22

### Added
- Debug overlay toggle (`Ctrl+D`) in the main view — shows active panel, current directory, file count, selected index, last keypress, and terminal height. Useful for diagnosing file-tree navigation issues.

## [0.3.2] - 2026-04-21

### Fixed
- Auto-update path no longer hits the GitHub releases API twice per launch — `checkForUpdate` now passes the release payload directly to `selfUpdate`, halving API load and rate-limit risk.
- SHA256 checksum string from the `.sha256` asset is validated as 64-char hex before comparison, with a clearer error when the response is empty, HTML, or malformed.
- Removed dead `phase` variable in `useAutoUpdate` (the `cancelled` flag already handles the race it was meant to guard).

### Changed
- Ink 7.0.0 → 7.0.1 (restores `useApp().exit` typing; Escape now respects `disableFocus()`).
- marked 9 → 18 and marked-terminal 6 → 7 (usage unchanged; no behavior difference for our `marked.use() + marked.parse()` pattern).
- TypeScript peer range `^5` → `^6`.
- Bumped documented Bun runtime target to 1.3.13 (CI uses `bun-version: latest`).

## [0.3.1] - 2026-04-14

### Fixed
- macOS binaries are now ad-hoc signed in CI. v0.3.0 shipped unsigned, which caused Apple Silicon to SIGKILL the binary at launch with no error.
- Self-update now surfaces errors in the status bar (previously a stale-closure bug left the UI stuck on "downloading..." forever when rename or download failed).

### Added
- Release workflow publishes `.sha256` files alongside each binary.
- `selfUpdate()` verifies the downloaded binary's SHA256 against the release checksum before replacing the running binary. Older releases without checksums are accepted unchanged.

### Note
- If you are on v0.3.0 for macOS and can't launch it, self-update is unreachable. Re-install manually:
  ```
  curl -L -o ~/.local/bin/vaultchat \
    https://github.com/BeamLabEU/vaultchat/releases/download/v0.3.1/vaultchat-darwin-arm64
  chmod +x ~/.local/bin/vaultchat
  ```

## [0.3.0] - 2026-04-14

### Changed
- Upgraded Ink 6.8.0 → 7.0.0 (major): requires Node 22+ and React 19.2+
- Upgraded React 19.2.4 → 19.2.5
- Upgraded @types/bun 1.3.11 → 1.3.12 (pairs with Bun runtime 1.3.12)

### Removed
- `patches/ink-fullscreen-flicker.patch` and the `postinstall` patcher — Ink 7's new `shouldClearTerminalForFrame` heuristic makes the steady-state fullscreen flicker patch obsolete. Resize patch dropped pending real-world testing; Ctrl+L (added in 0.2.10) remains as the manual redraw escape hatch.

## [0.2.10] - 2026-04-03

### Added
- Ctrl+L shortcut to force full terminal redraw (fixes resize artifacts)

## [0.2.9] - 2026-04-03

### Fixed
- Resize no longer leaves stale content (full terminal clear instead of partial line erase)

## [0.2.8] - 2026-04-03

### Fixed
- Terminal resize now properly clears and redraws the entire screen
- Previously only handled width decrease; now handles all resize events

## [0.2.7] - 2026-04-03

### Fixed
- Patched Ink's fullscreen renderer: incremental line-diff instead of clearTerminal + full rewrite (root cause of flicker)
- Removed redundant sync output wrapper (Ink handles DEC 2026 natively)
- Patch auto-applied via postinstall script, survives `bun install`

## [0.2.6] - 2026-04-03

### Added
- `vaultchat convert` command — import Open WebUI chat exports (JSON and TXT)
- Custom `PromptInput` component with Up/Down cursor navigation across wrapped lines
- Synchronized Output (DEC mode 2026) for flicker-free rendering on modern terminals
- Flicker analysis doc (`docs/flicker-analysis.md`) with root cause and future options

### Fixed
- Typed text no longer lost when clicking file tree or pressing Tab (input stays mounted)
- Up/Down arrows now navigate within the prompt instead of scrolling chat
- Chat history scrolling moved to PageUp/PageDown
- Input area capped at 6 visible lines with scroll-to-cursor
- Streaming state updates throttled to ~50ms to reduce render churn
- Cursor show/hide thrashing from Ink suppressed

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

[0.2.10]: https://github.com/BeamLabEU/vaultchat/releases/tag/v0.2.10
[0.2.9]: https://github.com/BeamLabEU/vaultchat/releases/tag/v0.2.9
[0.2.8]: https://github.com/BeamLabEU/vaultchat/releases/tag/v0.2.8
[0.2.7]: https://github.com/BeamLabEU/vaultchat/releases/tag/v0.2.7
[0.2.6]: https://github.com/BeamLabEU/vaultchat/releases/tag/v0.2.6
[0.2.5]: https://github.com/BeamLabEU/vaultchat/releases/tag/v0.2.5
[0.2.4]: https://github.com/BeamLabEU/vaultchat/releases/tag/v0.2.4
[0.2.3]: https://github.com/BeamLabEU/vaultchat/releases/tag/v0.2.3
[0.2.2]: https://github.com/BeamLabEU/vaultchat/releases/tag/v0.2.2
[0.2.1]: https://github.com/BeamLabEU/vaultchat/releases/tag/v0.2.1
[0.2.0]: https://github.com/BeamLabEU/vaultchat/releases/tag/v0.2.0
[0.1.2]: https://github.com/BeamLabEU/vaultchat/releases/tag/v0.1.2
[0.1.1]: https://github.com/BeamLabEU/vaultchat/releases/tag/v0.1.1
[0.1.0]: https://github.com/BeamLabEU/vaultchat/releases/tag/v0.1.0
