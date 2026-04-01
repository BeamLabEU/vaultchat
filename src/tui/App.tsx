import React, { useState, useEffect } from "react";
import { Box, Text } from "ink";
import { Spinner } from "@inkjs/ui";
import { Wizard } from "./screens/Wizard.tsx";
import { Main } from "./screens/Main.tsx";
import { loadConfig, saveConfig, type Config } from "../vault/config.ts";
import { useUpdateNotification } from "../hooks/useUpdateNotification.ts";

type Screen = "loading" | "wizard" | "main";

export function App() {
  const [screen, setScreen] = useState<Screen>("loading");
  const [config, setConfig] = useState<Config | null>(null);
  const updateInfo = useUpdateNotification();

  useEffect(() => {
    loadConfig().then((loaded) => {
      if (loaded) {
        setConfig(loaded);
        setScreen("main");
      } else {
        setScreen("wizard");
      }
    });
  }, []);

  const handleWizardComplete = async (newConfig: Config) => {
    await saveConfig(newConfig);
    setConfig(newConfig);
    setScreen("main");
  };

  if (screen === "loading") {
    return (
      <Box padding={1}>
        <Spinner label="Loading VaultChat..." />
      </Box>
    );
  }

  if (screen === "wizard") {
    return <Wizard onComplete={handleWizardComplete} />;
  }

  return (
    <Box flexDirection="column" height="100%">
      {updateInfo && (
        <Box>
          <Text dimColor>
            Update available: v{updateInfo.current} → v{updateInfo.latest} — {updateInfo.releaseUrl}
          </Text>
        </Box>
      )}
      <Box flexGrow={1}>
        <Main config={config!} />
      </Box>
    </Box>
  );
}
