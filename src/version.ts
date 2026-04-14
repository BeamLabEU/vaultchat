const VERSION = "0.3.1";
const REPO_OWNER = "BeamLabEU";
const REPO_NAME = "vaultchat";

export function getVersion(): string {
  return VERSION;
}

export function getRepoUrl(): string {
  return `https://github.com/${REPO_OWNER}/${REPO_NAME}`;
}

export function getReleasesUrl(): string {
  return `${getRepoUrl()}/releases`;
}

/** Compare two semver strings. Returns 1 if a > b, -1 if a < b, 0 if equal. */
export function compareSemver(a: string, b: string): number {
  const pa = a.replace(/^v/, "").split(".").map(Number);
  const pb = b.replace(/^v/, "").split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
}

export interface UpdateInfo {
  current: string;
  latest: string;
  updateAvailable: boolean;
  releaseUrl: string;
}

interface ReleaseData {
  tag_name: string;
  html_url: string;
  assets: { name: string; browser_download_url: string }[];
}

/** Check GitHub Releases API for a newer version. */
export async function checkForUpdate(): Promise<UpdateInfo> {
  const data = await fetchLatestRelease();
  const latest = data.tag_name.replace(/^v/, "");

  return {
    current: VERSION,
    latest,
    updateAvailable: compareSemver(latest, VERSION) > 0,
    releaseUrl: data.html_url,
  };
}

async function fetchLatestRelease(): Promise<ReleaseData> {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`;
  const res = await fetch(url, {
    headers: { Accept: "application/vnd.github+json" },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    throw new Error(`GitHub API returned ${res.status}`);
  }

  return (await res.json()) as ReleaseData;
}

function getAssetName(): string {
  const platform = process.platform === "darwin" ? "darwin" : "linux";
  const arch = process.arch === "arm64" ? "arm64" : "x64";
  return `vaultchat-${platform}-${arch}`;
}

/** Download the latest binary and replace the current executable in-place. */
export async function selfUpdate(
  onProgress?: (msg: string) => void,
): Promise<{ oldVersion: string; newVersion: string }> {
  const log = onProgress ?? (() => {});

  log("Checking for updates...");
  const release = await fetchLatestRelease();
  const latest = release.tag_name.replace(/^v/, "");

  if (compareSemver(latest, VERSION) <= 0) {
    throw new Error(`Already on the latest version (v${VERSION})`);
  }

  const assetName = getAssetName();
  const asset = release.assets.find((a) => a.name === assetName);
  if (!asset) {
    throw new Error(
      `No binary found for your platform (${assetName}). Download manually: ${release.html_url}`,
    );
  }

  log(`Downloading v${latest} (${assetName})...`);
  const res = await fetch(asset.browser_download_url, {
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) {
    throw new Error(`Download failed: HTTP ${res.status}`);
  }

  const binary = await res.arrayBuffer();

  // Verify SHA256 against the matching .sha256 asset (published since v0.3.1).
  // If missing, fall through — older releases did not ship checksums.
  const shaAsset = release.assets.find((a) => a.name === `${assetName}.sha256`);
  if (shaAsset) {
    log("Verifying checksum...");
    const shaRes = await fetch(shaAsset.browser_download_url, {
      signal: AbortSignal.timeout(10000),
    });
    if (!shaRes.ok) {
      throw new Error(`Checksum fetch failed: HTTP ${shaRes.status}`);
    }
    const expected = (await shaRes.text()).trim().split(/\s+/)[0];
    const actual = Bun.SHA256.hash(binary, "hex");
    if (expected !== actual) {
      throw new Error(
        `Checksum mismatch: expected ${expected}, got ${actual}. Download corrupted — try again.`,
      );
    }
  }

  // Determine where the current binary lives
  const currentBin = process.execPath;

  // Write to a temp file next to the current binary, then rename (atomic on same fs)
  const { dirname, join, basename } = await import("node:path");
  const { rename, chmod, unlink } = await import("node:fs/promises");

  // Safety: don't overwrite the bun runtime if running from source
  const binName = basename(currentBin);
  if (binName === "bun" || binName === "node") {
    throw new Error(
      "Self-update only works with the compiled binary. Running from source — use git pull instead.",
    );
  }
  const dir = dirname(currentBin);
  const tmpPath = join(dir, `.vaultchat-update-${Date.now()}`);

  try {
    await Bun.write(tmpPath, binary);
    await chmod(tmpPath, 0o755);

    log("Replacing binary...");
    await rename(tmpPath, currentBin);
  } catch (err) {
    // Clean up temp file on failure
    try { await unlink(tmpPath); } catch {}
    throw err;
  }

  return { oldVersion: VERSION, newVersion: latest };
}
