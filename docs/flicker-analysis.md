# Terminal Flicker Analysis

Last updated: 2026-04-03

## The Problem

VaultChat's TUI flickers during typing and streaming. Every keystroke and every streaming chunk triggers a visible flash of the entire interface.

## Root Cause

Ink (the React-for-CLI framework we use) erases all lines and rewrites everything on every React state change. This is architectural, not a bug.

The render cycle looks like:

```
hide cursor -> erase previous lines -> write new content -> show cursor
```

Even with `incrementalRendering: true`, cursor hide/show thrashing occurs. Worse: **fullscreen mode bypasses incremental rendering entirely** (see [ink#894](https://github.com/vadimdemedes/ink/pull/894)), so the option is effectively broken for our use case.

## Ink GitHub Issues

This is widely reported and acknowledged:

| Issue | Summary | Status |
|-------|---------|--------|
| [#359](https://github.com/vadimdemedes/ink/issues/359) | View longer than screen flickers on updates | Closed (partially addressed) |
| [#450](https://github.com/vadimdemedes/ink/issues/450) | Flickering when height equals `process.stdout.rows` | Closed (workaround: use `rows - 1`) |
| [#513](https://github.com/vadimdemedes/ink/issues/513) | Box blinking at bottom of screen | Closed (duplicate of #450) |
| [#773](https://github.com/vadimdemedes/ink/issues/773) | useLayoutEffect should execute immediately | Open |
| [#765](https://github.com/vadimdemedes/ink/issues/765) | Support scrolling primitives | Open |
| [#809](https://github.com/vadimdemedes/ink/issues/809) | Screen scroll and flicker (mentions Claude Code) | Closed |
| [#907](https://github.com/vadimdemedes/ink/issues/907) | Terminal resize causes rendering artifacts | Acknowledged as known limitation |

### Relevant PRs

| PR | Summary | Status |
|----|---------|--------|
| [#889](https://github.com/vadimdemedes/ink/pull/889) | Fix useLayoutEffect frame flicker | Open (sindresorhus: "not sure about it yet") |
| [#894](https://github.com/vadimdemedes/ink/pull/894) | Fix fullscreen flicker with incrementalRendering | Open |
| [#917](https://github.com/vadimdemedes/ink/pull/917) | Clamp cursor-up to viewport height | Open |
| [#413](https://github.com/vadimdemedes/ink/pull/413) | POC: Incremental rendering | Closed (inspired later option) |

### Maintainer Stance

- **vadimdemedes** (owner): initially characterized flicker as a terminal-specific issue, not Ink's problem
- **sindresorhus** (co-maintainer): more proactive, working on fixes but cautious about regressions
- **Independent analysis** ([atxtechbro/test-ink-flickering](https://github.com/atxtechbro/test-ink-flickering/blob/main/INK-ANALYSIS.md)): concluded flicker is a fundamental architectural limitation

### Anthropic's Experience

Anthropic (Claude Code) hit the same wall and rewrote Ink's renderer from scratch:
> "Ink didn't support the kind of fine-grained incremental updates needed for a long-running interactive UI."

They later added `CLAUDE_CODE_NO_FLICKER=1` mode with a fully virtualized viewport.

## What We've Done So Far

### 1. Synchronized Output (DEC mode 2026) -- IMPLEMENTED

Wraps each render cycle in `\x1b[?2026h` ... `\x1b[?2026l` so the terminal buffers writes and paints atomically.

- Uses microtask scheduling: sync-start on first write, sync-end after all synchronous writes complete
- Should eliminate flicker entirely on supporting terminals
- Non-supporting terminals silently ignore the sequences

**Terminal support:**
| Terminal | Supported |
|----------|-----------|
| Kitty | Yes |
| Ghostty | Yes |
| WezTerm | Yes |
| iTerm2 3.5+ | Yes |
| macOS Terminal | No |
| GNOME Terminal | Partial |
| Windows Terminal | Yes |
| tmux | Patched (recent versions) |

**File:** `src/index.tsx`

### 2. Cursor Show/Hide Suppression -- IMPLEMENTED

Strips `\x1b[?25h` and `\x1b[?25l` from Ink's output. We hide the cursor once at startup and keep it hidden. Ink's per-render cursor thrashing was causing visible flashes.

**File:** `src/index.tsx`

### 3. Streaming Throttle -- IMPLEMENTED

Throttled `setStreamingContent()` to 50ms intervals instead of on every chunk. Reduces render frequency during streaming from potentially hundreds/sec to ~20/sec.

**File:** `src/hooks/useChat.ts`

### 4. React.memo on Components -- IMPLEMENTED

Both `FileTree` and `ChatView` are wrapped in `React.memo` to prevent unnecessary re-renders when parent state changes.

**Files:** `src/tui/components/FileTree.tsx`, `src/tui/components/ChatView.tsx`

## Options If Flicker Persists

### Option A: Custom Renderer (Medium-Large Effort)

Keep React as component model but replace Ink's render pipeline with one that does differential updates. This is what Anthropic did.

**Approach:**
- Maintain a virtual screen buffer (2D character grid)
- On React re-render, diff new output against buffer
- Write only changed cells/lines to stdout
- Wrap in synchronized output for atomic paint

**Pros:** Full control, proven approach (Claude Code), keeps React DX
**Cons:** Significant engineering effort, must handle layout ourselves or keep Yoga

### Option B: OpenTUI (Medium Effort)

New framework by the OpenCode team, built specifically to replace Ink. TypeScript bindings to Zig core. Supports React reconciler.

- Repository: [github.com/anomalyco/opentui](https://github.com/anomalyco/opentui)
- Designed to avoid flicker from the ground up
- Does NOT work in macOS Terminal (pre-macOS 26) or GNOME Terminal

**Pros:** Drop-in React reconciler, fast Zig core, built for this exact problem
**Cons:** Young project, limited terminal support, migration effort

### Option C: terminal-kit (Large Effort)

Low-level terminal library with screen buffer and differential updates. More manual but gives direct control over what gets redrawn.

**Pros:** Mature, fine-grained control
**Cons:** No React, complete rewrite of UI layer

### Option D: blessed / neo-blessed (Large Effort)

Traditional ncurses-style widget system. Has `smartCSR`/`fastCSR` optimization modes.

**Pros:** Rich widget set, mouse support, scrolling built-in
**Cons:** Largely unmaintained, still has its own flicker issues, complete rewrite

### Option E: claude-chill Proxy (Zero Code Change)

External terminal proxy ([github.com/davidbeesley/claude-chill](https://github.com/davidbeesley/claude-chill)) that sits between terminal and Ink apps, runs a VT100 emulator to track screen state, and renders only diffs.

**Pros:** No code changes, works today
**Cons:** Extra dependency, user must install and run separately

## Recommendation

Current mitigations (synchronized output + cursor suppression + throttling + memoization) should handle most cases on modern terminals. If flicker is still unacceptable after testing:

1. **Short term:** Verify synchronized output works on the user's terminal
2. **Medium term:** Evaluate OpenTUI as a drop-in replacement (smallest migration path)
3. **Long term:** Custom renderer if we need full control and maximum compatibility
