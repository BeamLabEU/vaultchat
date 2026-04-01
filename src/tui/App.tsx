import React, { useState, useEffect } from "react";
import { Box } from "ink";
import { Spinner } from "@inkjs/ui";
import { Wizard } from "./screens/Wizard.tsx";
import { Main } from "./screens/Main.tsx";
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

  return <Main config={config!} />;
}
