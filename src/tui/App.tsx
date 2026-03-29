import React, { useState, useEffect } from "react";
import { Box, Text } from "ink";
import { Spinner } from "@inkjs/ui";
import { Wizard } from "./screens/Wizard.tsx";
import { loadConfig, saveConfig, type Config } from "../vault/config.ts";

type Screen = "loading" | "wizard" | "main";

export function App() {
  const [screen, setScreen] = useState<Screen>("loading");
  const [config, setConfig] = useState<Config | null>(null);

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

  // Placeholder for main screen — Phase 5/6
  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">
        VaultChat
      </Text>
      <Text>
        Provider: {config?.activeProvider} | Model: {config?.activeModel}
      </Text>
      <Text dimColor>Main TUI coming in Phase 5/6...</Text>
    </Box>
  );
}
