import { useState, useEffect } from "react";
import { checkForUpdate, type UpdateInfo } from "../version.ts";

/** Non-blocking check for updates on mount. Returns UpdateInfo if an update is available, null otherwise. */
export function useUpdateNotification(): UpdateInfo | null {
  const [update, setUpdate] = useState<UpdateInfo | null>(null);

  useEffect(() => {
    checkForUpdate()
      .then((info) => {
        if (info.updateAvailable) setUpdate(info);
      })
      .catch(() => {
        // Silently ignore — network errors shouldn't disrupt the TUI
      });
  }, []);

  return update;
}
