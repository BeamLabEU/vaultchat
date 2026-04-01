import { getVersion, checkForUpdate, getReleasesUrl } from "./version.ts";

const args = process.argv.slice(2);

if (args.includes("--version") || args.includes("-v")) {
  console.log(`vaultchat ${getVersion()}`);
  process.exit(0);
}

if (args.includes("--help") || args.includes("-h")) {
  console.log(`vaultchat ${getVersion()} — TUI AI chat client for Obsidian vaults

Usage:
  vaultchat              Launch the TUI in the current directory
  vaultchat --version    Print version and exit
  vaultchat --check-update  Check for newer releases on GitHub
  vaultchat --doctor     Run diagnostic checks (config, API key, provider)
  vaultchat --help       Show this help message`);
  process.exit(0);
}

if (args.includes("--doctor")) {
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

if (args.includes("--check-update")) {
  try {
    const info = await checkForUpdate();
    if (info.updateAvailable) {
      console.log(`Update available: v${info.current} → v${info.latest}`);
      console.log(`Download: ${info.releaseUrl}`);
    } else {
      console.log(`You're on the latest version (v${info.current})`);
    }
  } catch {
    console.error(`Could not check for updates. Visit ${getReleasesUrl()}`);
    process.exit(1);
  }
  process.exit(0);
}

// Launch TUI
const { render } = await import("ink");
const { App } = await import("./tui/App.tsx");

const { waitUntilExit } = render(<App />);
await waitUntilExit();
