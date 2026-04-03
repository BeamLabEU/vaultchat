/**
 * Patch Ink's renderer to fix two issues:
 * 1. Fullscreen flicker: use incremental line-diff instead of clearTerminal
 * 2. Resize handling: always clear on any resize (not just width decrease)
 *
 * See: https://github.com/vadimdemedes/ink/pull/894
 */
const fs = require("fs");
const path = require("path");

const inkPath = path.join(__dirname, "..", "node_modules", "ink", "build", "ink.js");

if (!fs.existsSync(inkPath)) process.exit(0);

let code = fs.readFileSync(inkPath, "utf-8");

// Already patched?
if (code.includes("PATCHED by VaultChat")) process.exit(0);

let patched = false;

// Patch 1: Fullscreen flicker fix
const oldFullscreen = `        if (this.lastOutputHeight >= this.options.stdout.rows) {
            const sync = shouldSynchronize(this.options.stdout);
            if (sync) {
                this.options.stdout.write(bsu);
            }
            this.options.stdout.write(ansiEscapes.clearTerminal + this.fullStaticOutput + output);
            this.lastOutput = output;
            this.lastOutputToRender = outputToRender;
            this.lastOutputHeight = outputHeight;
            this.log.sync(outputToRender);
            if (sync) {
                this.options.stdout.write(esu);
            }
            return;
        }`;

const newFullscreen = `        // [PATCHED by VaultChat] Route fullscreen frames through the incremental
        // renderer instead of clearTerminal + full rewrite (fixes flicker).
        // See: https://github.com/vadimdemedes/ink/pull/894
        if (this.lastOutputHeight >= this.options.stdout.rows) {
            if (output !== this.lastOutput || this.log.isCursorDirty()) {
                this.throttledLog(outputToRender);
            }
            this.lastOutput = output;
            this.lastOutputToRender = outputToRender;
            this.lastOutputHeight = outputHeight;
            return;
        }`;

if (code.includes(oldFullscreen)) {
  code = code.replace(oldFullscreen, newFullscreen);
  patched = true;
  console.log("  Patched ink fullscreen flicker fix");
}

// Patch 2: Resize handler — always clear on any resize
const oldResize = `    resized = () => {
        const currentWidth = this.getTerminalWidth();
        if (currentWidth < this.lastTerminalWidth) {
            // We clear the screen when decreasing terminal width to prevent duplicate overlapping re-renders.
            this.log.clear();
            this.lastOutput = '';
            this.lastOutputToRender = '';
        }
        this.calculateLayout();
        this.onRender();
        this.lastTerminalWidth = currentWidth;
    };`;

const newResize = `    resized = () => {
        // [PATCHED by VaultChat] Full terminal clear on resize to prevent
        // stale content when terminal gets taller (log.clear only erases
        // lines it knows about, missing off-screen content that reappears).
        this.log.clear();
        this.options.stdout.write(ansiEscapes.clearTerminal);
        this.lastOutput = '';
        this.lastOutputToRender = '';
        this.lastOutputHeight = 0;
        this.lastTerminalWidth = this.getTerminalWidth();
        this.calculateLayout();
        this.onRender();
    };`;

if (code.includes(oldResize)) {
  code = code.replace(oldResize, newResize);
  patched = true;
  console.log("  Patched ink resize handler");
}

if (patched) {
  fs.writeFileSync(inkPath, code);
} else {
  console.log("  Ink patch: target code not found (version may have changed)");
}
