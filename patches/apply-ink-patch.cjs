/**
 * Patch Ink's fullscreen renderer to use incremental updates instead of
 * clearTerminal + full rewrite. This eliminates the primary cause of flicker
 * in fullscreen TUI apps.
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

const oldBlock = `        if (this.lastOutputHeight >= this.options.stdout.rows) {
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

const newBlock = `        // [PATCHED by VaultChat] Route fullscreen frames through the incremental
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

if (!code.includes(oldBlock)) {
  console.log("  Ink patch: target code not found (version may have changed)");
  process.exit(0);
}

code = code.replace(oldBlock, newBlock);
fs.writeFileSync(inkPath, code);
console.log("  Patched ink fullscreen flicker fix");
