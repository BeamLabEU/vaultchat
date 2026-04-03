import { getVersion, checkForUpdate, getReleasesUrl, selfUpdate } from "./version.ts";

const args = process.argv.slice(2);
const cmd = args[0] ?? "";

if (args.includes("--version") || args.includes("-v") || cmd === "version") {
  console.log(`vaultchat ${getVersion()}`);
  process.exit(0);
}

if (args.includes("--help") || args.includes("-h") || cmd === "help") {
  console.log(`vaultchat ${getVersion()} — TUI AI chat client for Obsidian vaults

Usage:
  vaultchat              Launch the TUI in the current directory
  vaultchat update       Download and install the latest version
  vaultchat check-update Check for newer releases on GitHub
  vaultchat doctor       Run diagnostic checks (config, API key, provider)
  vaultchat convert      Convert exported chats to VaultChat markdown
  vaultchat version      Print version and exit
  vaultchat help         Show this help message`);
  process.exit(0);
}

if (args.includes("--convert") || cmd === "convert") {
  const { runConvert } = await import("./convert.ts");
  await runConvert(args);
  process.exit(0);
}

if (args.includes("--doctor") || cmd === "doctor") {
  const { runAllChecks, buildReport, formatResults } = await import("./doctor.ts");
  const results = await runAllChecks();
  const report = buildReport(results);
  if (args.includes("--json")) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`\nvaultchat doctor v${report.version}\n`);
    console.log(formatResults(results));
    console.log();
  }
  process.exit(report.failed > 0 ? 1 : 0);
}

if (args.includes("--check-update") || cmd === "check-update") {
  try {
    const info = await checkForUpdate();
    if (info.updateAvailable) {
      console.log(`Update available: v${info.current} → v${info.latest}`);
      console.log(`Run: vaultchat update`);
    } else {
      console.log(`You're on the latest version (v${info.current})`);
    }
  } catch {
    console.error(`Could not check for updates. Visit ${getReleasesUrl()}`);
    process.exit(1);
  }
  process.exit(0);
}

if (args.includes("--update") || cmd === "update") {
  try {
    const result = await selfUpdate((msg) => console.log(msg));
    console.log(`\n✓ Updated: v${result.oldVersion} → v${result.newVersion}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Update failed";
    console.error(msg);
    process.exit(1);
  }
  process.exit(0);
}

// Launch TUI
const { render } = await import("ink");
const { App } = await import("./tui/App.tsx");

// Hide cursor and enter alternate screen buffer for clean rendering
process.stdout.write("\x1b[?25l");   // hide cursor
process.stdout.write("\x1b[?1049h"); // alternate screen buffer

const { waitUntilExit } = render(<App />, {
  exitOnCtrlC: false,       // we handle Ctrl+C ourselves
  incrementalRendering: true, // only redraw changed lines to reduce flicker
});

await waitUntilExit();

// Restore terminal
process.stdout.write("\x1b[?1049l"); // leave alternate screen buffer
process.stdout.write("\x1b[?25h");   // show cursor
