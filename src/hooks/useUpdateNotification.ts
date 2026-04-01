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
    (async () => {
      try {
        const info = await checkForUpdate();
        if (!info.updateAvailable) {
          return; // Don't set state — nothing to show
        }

        setState({ status: "downloading", newVersion: info.latest });

        const result = await selfUpdate();
        setState({ status: "ready", newVersion: result.newVersion });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Update failed";
        // Only show error if we got past the check phase (i.e., there was an update)
        if (state?.status === "downloading") {
          setState((s) => s ? { ...s, status: "failed", error: msg } : null);
        }
        // Silently ignore check failures or "already latest"
      }
    })();
  }, []);

  return state;
}
