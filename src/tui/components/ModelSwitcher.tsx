import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import { Select, TextInput, Spinner } from "@inkjs/ui";
import { listProviders, getProvider } from "../../providers/registry.ts";
import { getCachedModels, cacheModels } from "../../providers/model-cache.ts";
import type { ModelInfo } from "../../providers/types.ts";
import type { Config } from "../../vault/config.ts";

interface ModelSwitcherProps {
  config: Config;
  onSelect: (provider: string, model: string) => void;
  onClose: () => void;
}

type Step = "provider" | "loading" | "model";

export function ModelSwitcher({ config, onSelect, onClose }: ModelSwitcherProps) {
  const providers = listProviders();
  const hasMultipleProviders = providers.length > 1;

  const [step, setStep] = useState<Step>(hasMultipleProviders ? "provider" : "loading");
  const [selectedProvider, setSelectedProvider] = useState(config.activeProvider);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [filter, setFilter] = useState("");

  useInput((input, key) => {
    if (key.escape) onClose();
  });

  // Load models for selected provider
  useEffect(() => {
    if (step !== "loading") return;

    (async () => {
      const providerConfig = config.providers[selectedProvider];
      if (!providerConfig) {
        setStep("provider");
        return;
      }

      let modelList = await getCachedModels(selectedProvider);
      if (!modelList) {
        const provider = getProvider(selectedProvider);
        modelList = await provider.listModels(providerConfig.apiKey);
        await cacheModels(selectedProvider, modelList);
      }

      setModels(modelList);
      setStep("model");
    })().catch(() => {
      setStep("provider");
    });
  }, [step, selectedProvider, config]);

  // Auto-load if single provider
  useEffect(() => {
    if (!hasMultipleProviders && step === "loading") return; // already loading
    if (!hasMultipleProviders) setStep("loading");
  }, []);

  const favorites = config.favoriteModels ?? [];

  const filteredModels = models
    .filter((m) => {
      if (!filter) return true;
      const q = filter.toLowerCase();
      return m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      const aFav = favorites.includes(a.id) ? 0 : 1;
      const bFav = favorites.includes(b.id) ? 0 : 1;
      if (aFav !== bFav) return aFav - bFav;
      return a.name.localeCompare(b.name);
    });

  const modelOptions = filteredModels.slice(0, 20).map((m) => ({
    label: favorites.includes(m.id)
      ? `★ ${m.name} (${m.id})`
      : `  ${m.name} (${m.id})`,
    value: m.id,
  }));

  const providerOptions = providers
    .filter((p) => !!config.providers[p])
    .map((p) => ({
      label: p.charAt(0).toUpperCase() + p.slice(1),
      value: p,
    }));

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor="cyan"
      paddingX={2}
      paddingY={1}
    >
      <Box marginBottom={1} justifyContent="space-between">
        <Text bold color="cyan">
          Switch Model
        </Text>
        <Text dimColor>Esc to close</Text>
      </Box>

      {step === "provider" && (
        <Box flexDirection="column">
          <Text bold>Choose provider:</Text>
          <Box marginTop={1}>
            <Select
              options={providerOptions}
              onChange={(value) => {
                setSelectedProvider(value);
                setStep("loading");
              }}
            />
          </Box>
        </Box>
      )}

      {step === "loading" && (
        <Spinner label="Loading models..." />
      )}

      {step === "model" && (
        <Box flexDirection="column">
          <Text dimColor>
            {models.length} models | Provider: {selectedProvider} | ★ = favorite
          </Text>
          <Box marginTop={1}>
            <Text>Filter: </Text>
            <TextInput
              placeholder="Type to search..."
              onChange={setFilter}
            />
          </Box>
          <Box marginTop={1} flexDirection="column">
            {modelOptions.length > 0 ? (
              <Select
                options={modelOptions}
                onChange={(modelId) => {
                  onSelect(selectedProvider, modelId);
                }}
              />
            ) : (
              <Text dimColor>No models match your filter.</Text>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
}
