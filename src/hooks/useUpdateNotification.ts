import { useState, useEffect } from "react";
import { checkForUpdate, selfUpdate } from "../version.ts";

interface UpdateState {
  status: "checking" | "downloading" | "ready" | "up-to-date" | "failed";
  newVersion?: string;
  error?: string;
}

/** Auto-update on launch: check, download, replace binary, ask user to restart. */
export function useAutoUpdate(): UpdateState | null {
  const [state, setState] = useState<UpdateState | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      let newVersion: string | undefined;

      try {
        const info = await checkForUpdate();
        if (cancelled) return;
        if (!info.updateAvailable) return;

        newVersion = info.latest;
        setState({ status: "downloading", newVersion });

        const result = await selfUpdate(undefined, info.release);
        if (cancelled) return;
        setState({ status: "ready", newVersion: result.newVersion });
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        // Surface failures from both the check phase (DNS/API/rate-limit) and
        // the download phase (permission denied on rename, download timeout).
        // Earlier versions swallowed both: the check phase by design, the
        // download phase by a stale-closure bug.
        setState({ status: "failed", newVersion, error: msg });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
