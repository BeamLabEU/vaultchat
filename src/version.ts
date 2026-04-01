const VERSION = "0.2.0";
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

/** Check GitHub Releases API for a newer version. */
export async function checkForUpdate(): Promise<UpdateInfo> {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`;
  const res = await fetch(url, {
    headers: { Accept: "application/vnd.github+json" },
    signal: AbortSignal.timeout(5000),
  });

  if (!res.ok) {
    throw new Error(`GitHub API returned ${res.status}`);
  }

  const data = (await res.json()) as { tag_name: string; html_url: string };
  const latest = data.tag_name.replace(/^v/, "");

  return {
    current: VERSION,
    latest,
    updateAvailable: compareSemver(latest, VERSION) > 0,
    releaseUrl: data.html_url,
  };
}
