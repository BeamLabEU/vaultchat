import React, { useState, useEffect } from "react";
import { Box, Text } from "ink";
import { Select, TextInput, Spinner, StatusMessage } from "@inkjs/ui";
import { listProviders, getProvider } from "../../providers/registry.ts";
import { getCachedModels, cacheModels } from "../../providers/model-cache.ts";
import type { ModelInfo } from "../../providers/types.ts";
import type { Config } from "../../vault/config.ts";

type WizardStep =
  | "welcome"
  | "provider"
  | "apiKey"
  | "validating"
  | "keyError"
  | "loadingModels"
  | "model"
  | "saving";

interface WizardProps {
  onComplete: (config: Config) => void;
}

// Models to highlight at the top of the list
const RECOMMENDED_MODEL_IDS = [
  "anthropic/claude-sonnet-4",
  "openai/gpt-4.1",
  "google/gemini-2.5-pro-preview",
  "anthropic/claude-haiku-4",
  "openai/gpt-4.1-mini",
  "google/gemini-2.5-flash",
  "meta-llama/llama-4-maverick",
  "deepseek/deepseek-chat-v3-0324",
];

export function Wizard({ onComplete }: WizardProps) {
  const [step, setStep] = useState<WizardStep>("welcome");
  const [selectedProvider, setSelectedProvider] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [keyError, setKeyError] = useState("");
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [modelFilter, setModelFilter] = useState("");

  // Welcome → auto-advance after mount
  useEffect(() => {
    if (step === "welcome") {
      const timer = setTimeout(() => setStep("provider"), 100);
      return () => clearTimeout(timer);
    }
  }, [step]);

  // Validate API key
  useEffect(() => {
    if (step !== "validating") return;

    const provider = getProvider(selectedProvider);
    provider.validateKey(apiKey).then((valid) => {
      if (valid) {
        setStep("loadingModels");
      } else {
        setKeyError("Invalid API key. Please check and try again.");
        setStep("keyError");
      }
    }).catch((err) => {
      setKeyError(`Connection error: ${err instanceof Error ? err.message : String(err)}`);
      setStep("keyError");
    });
  }, [step, selectedProvider, apiKey]);

  // Load models
  useEffect(() => {
    if (step !== "loadingModels") return;

    (async () => {
      const provider = getProvider(selectedProvider);

      // Try cache first
      let modelList = await getCachedModels(selectedProvider);
      if (!modelList) {
        modelList = await provider.listModels(apiKey);
        await cacheModels(selectedProvider, modelList);
      }

      setModels(modelList);
      setStep("model");
    })().catch((err) => {
      setKeyError(`Failed to load models: ${err instanceof Error ? err.message : String(err)}`);
      setStep("keyError");
    });
  }, [step, selectedProvider, apiKey]);

  const providers = listProviders().map((p) => ({
    label: p.charAt(0).toUpperCase() + p.slice(1),
    value: p,
  }));

  // Filter and sort models: recommended first, then alphabetical
  const filteredModels = models
    .filter((m) => {
      if (!modelFilter) return true;
      const q = modelFilter.toLowerCase();
      return (
        m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const aRec = RECOMMENDED_MODEL_IDS.includes(a.id) ? 0 : 1;
      const bRec = RECOMMENDED_MODEL_IDS.includes(b.id) ? 0 : 1;
      if (aRec !== bRec) return aRec - bRec;
      return a.name.localeCompare(b.name);
    });

  const modelOptions = filteredModels.slice(0, 20).map((m) => ({
    label: RECOMMENDED_MODEL_IDS.includes(m.id)
      ? `★ ${m.name} (${m.id})`
      : `  ${m.name} (${m.id})`,
    value: m.id,
  }));

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          VaultChat Setup
        </Text>
      </Box>

      {step === "welcome" && (
        <Text>Welcome to VaultChat! Let's get you set up...</Text>
      )}

      {step === "provider" && (
        <Box flexDirection="column">
          <Text bold>Choose your LLM provider:</Text>
          <Box marginTop={1}>
            <Select
              options={providers}
              onChange={(value) => {
                setSelectedProvider(value);
                setStep("apiKey");
              }}
            />
          </Box>
        </Box>
      )}

      {step === "apiKey" && (
        <Box flexDirection="column">
          <Text bold>
            Enter your {selectedProvider} API key:
          </Text>
          <Text dimColor>
            (Get one at{" "}
            {selectedProvider === "openrouter"
              ? "https://openrouter.ai/keys"
              : "your provider's website"}
            )
          </Text>
          <Box marginTop={1}>
            <Text>API Key: </Text>
            <TextInput
              placeholder="sk-or-..."
              onSubmit={(value) => {
                setApiKey(value);
                setStep("validating");
              }}
            />
          </Box>
        </Box>
      )}

      {step === "validating" && (
        <Box>
          <Spinner label="Validating API key..." />
        </Box>
      )}

      {step === "keyError" && (
        <Box flexDirection="column">
          <StatusMessage variant="error">{keyError}</StatusMessage>
          <Box marginTop={1}>
            <Text dimColor>Press Enter to try again...</Text>
          </Box>
          <TextInput
            placeholder=""
            onSubmit={() => {
              setApiKey("");
              setKeyError("");
              setStep("apiKey");
            }}
          />
        </Box>
      )}

      {step === "loadingModels" && (
        <Box>
          <Spinner label="Loading available models..." />
        </Box>
      )}

      {step === "model" && (
        <Box flexDirection="column">
          <Text bold>Choose your default model:</Text>
          <Text dimColor>
            ({models.length} models available — type to filter, ★ = recommended)
          </Text>
          <Box marginTop={1}>
            <Text>Filter: </Text>
            <TextInput
              placeholder="Type to search models..."
              onChange={setModelFilter}
            />
          </Box>
          <Box marginTop={1} flexDirection="column">
            {modelOptions.length > 0 ? (
              <Select
                options={modelOptions}
                onChange={(modelId) => {
                  const config: Config = {
                    activeProvider: selectedProvider,
                    activeModel: modelId,
                    providers: {
                      [selectedProvider]: { apiKey },
                    },
                    favoriteModels: [],
                  };
                  setStep("saving");
                  onComplete(config);
                }}
              />
            ) : (
              <Text dimColor>No models match your filter.</Text>
            )}
          </Box>
        </Box>
      )}

      {step === "saving" && (
        <Box>
          <Spinner label="Saving configuration..." />
        </Box>
      )}
    </Box>
  );
}
