import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import { Select, TextInput, Spinner, StatusMessage } from "@inkjs/ui";
import { listProviders, getProvider } from "../../providers/registry.ts";
import { getCachedModels, cacheModels } from "../../providers/model-cache.ts";
import type { ModelInfo } from "../../providers/types.ts";
import type { Config, ProviderConfig } from "../../vault/config.ts";

type Tab = "providers" | "favorites";
type ProviderAction = "list" | "add" | "edit" | "test";

interface SettingsProps {
  config: Config;
  onSave: (config: Config) => void;
  onClose: () => void;
}

export function Settings({ config, onSave, onClose }: SettingsProps) {
  const [activeTab, setActiveTab] = useState<Tab>("providers");

  useInput((input, key) => {
    if (key.escape) onClose();
    if (key.tab) {
      setActiveTab((t) => (t === "providers" ? "favorites" : "providers"));
    }
  });

  return (
    <Box flexDirection="column" paddingX={2} paddingY={1}>
      <Box marginBottom={1} justifyContent="space-between">
        <Text bold color="cyan">
          Settings
        </Text>
        <Text dimColor>Tab: switch tabs | Esc: close</Text>
      </Box>

      {/* Tab bar */}
      <Box marginBottom={1} gap={2}>
        <Text
          bold={activeTab === "providers"}
          color={activeTab === "providers" ? "cyan" : undefined}
          underline={activeTab === "providers"}
        >
          Providers
        </Text>
        <Text
          bold={activeTab === "favorites"}
          color={activeTab === "favorites" ? "cyan" : undefined}
          underline={activeTab === "favorites"}
        >
          Favorites
        </Text>
      </Box>

      {activeTab === "providers" && (
        <ProvidersTab config={config} onSave={onSave} />
      )}
      {activeTab === "favorites" && (
        <FavoritesTab config={config} onSave={onSave} />
      )}
    </Box>
  );
}

// --- Providers Tab ---

function ProvidersTab({
  config,
  onSave,
}: {
  config: Config;
  onSave: (config: Config) => void;
}) {
  const [action, setAction] = useState<ProviderAction>("list");
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  const availableProviders = listProviders();
  const configuredProviders = Object.keys(config.providers);

  if (action === "add") {
    const unconfigured = availableProviders.filter(
      (p) => !configuredProviders.includes(p)
    );

    if (unconfigured.length === 0) {
      return (
        <Box flexDirection="column">
          <Text>All supported providers are already configured.</Text>
          <Box marginTop={1}>
            <Text dimColor>Press Enter to go back...</Text>
            <TextInput placeholder="" onSubmit={() => setAction("list")} />
          </Box>
        </Box>
      );
    }

    return (
      <Box flexDirection="column">
        <Text bold>Add provider:</Text>
        <Box marginTop={1}>
          <Select
            options={unconfigured.map((p) => ({
              label: p.charAt(0).toUpperCase() + p.slice(1),
              value: p,
            }))}
            onChange={(value) => {
              setEditingProvider(value);
              setAction("edit");
            }}
          />
        </Box>
      </Box>
    );
  }

  if (action === "edit") {
    return (
      <EditApiKey
        providerName={editingProvider!}
        currentKey={config.providers[editingProvider!]?.apiKey ?? ""}
        onSave={(key) => {
          const newConfig = {
            ...config,
            providers: {
              ...config.providers,
              [editingProvider!]: { apiKey: key },
            },
          };
          onSave(newConfig);
          setAction("list");
          setEditingProvider(null);
        }}
        onCancel={() => {
          setAction("list");
          setEditingProvider(null);
        }}
      />
    );
  }

  if (action === "test") {
    return (
      <Box flexDirection="column">
        {testing ? (
          <Spinner label={`Testing ${editingProvider} connection...`} />
        ) : (
          <>
            {testResult && (
              <StatusMessage
                variant={testResult === "success" ? "success" : "error"}
              >
                {testResult === "success"
                  ? `${editingProvider} API key is valid!`
                  : `Failed: ${testResult}`}
              </StatusMessage>
            )}
            <Box marginTop={1}>
              <Text dimColor>Press Enter to go back...</Text>
              <TextInput
                placeholder=""
                onSubmit={() => {
                  setAction("list");
                  setTestResult(null);
                }}
              />
            </Box>
          </>
        )}
      </Box>
    );
  }

  // List view
  const options = [
    ...configuredProviders.map((p) => ({
      label: `${p.charAt(0).toUpperCase() + p.slice(1)} ${p === config.activeProvider ? "(active)" : ""}`,
      value: `edit:${p}`,
    })),
    { label: "+ Add provider", value: "add" },
  ];

  // Add test options for configured providers
  const allOptions = configuredProviders.flatMap((p) => [
    {
      label: `${p.charAt(0).toUpperCase() + p.slice(1)} — edit key ${p === config.activeProvider ? "(active)" : ""}`,
      value: `edit:${p}`,
    },
    {
      label: `${p.charAt(0).toUpperCase() + p.slice(1)} — test connection`,
      value: `test:${p}`,
    },
  ]);
  allOptions.push({ label: "+ Add provider", value: "add" });

  return (
    <Box flexDirection="column">
      <Text bold>Configured providers:</Text>
      <Box marginTop={1}>
        <Select
          options={allOptions}
          onChange={(value) => {
            if (value === "add") {
              setAction("add");
            } else if (value.startsWith("edit:")) {
              setEditingProvider(value.slice(5));
              setAction("edit");
            } else if (value.startsWith("test:")) {
              const pName = value.slice(5);
              setEditingProvider(pName);
              setAction("test");
              setTesting(true);
              const provider = getProvider(pName);
              const apiKey = config.providers[pName]?.apiKey ?? "";
              provider
                .validateKey(apiKey)
                .then((valid) => {
                  setTestResult(valid ? "success" : "Invalid API key");
                  setTesting(false);
                })
                .catch((err) => {
                  setTestResult(
                    err instanceof Error ? err.message : "Connection failed"
                  );
                  setTesting(false);
                });
            }
          }}
        />
      </Box>
    </Box>
  );
}

function EditApiKey({
  providerName,
  currentKey,
  onSave,
  onCancel,
}: {
  providerName: string;
  currentKey: string;
  onSave: (key: string) => void;
  onCancel: () => void;
}) {
  useInput((input, key) => {
    if (key.escape) onCancel();
  });

  return (
    <Box flexDirection="column">
      <Text bold>
        API key for {providerName.charAt(0).toUpperCase() + providerName.slice(1)}:
      </Text>
      {currentKey && (
        <Text dimColor>
          Current: {currentKey.slice(0, 8)}...{currentKey.slice(-4)}
        </Text>
      )}
      <Box marginTop={1}>
        <Text>New key: </Text>
        <TextInput
          placeholder="sk-or-..."
          onSubmit={(value) => {
            if (value.trim()) onSave(value.trim());
            else onCancel();
          }}
        />
      </Box>
      <Text dimColor>Enter to save, Esc to cancel, empty to keep current</Text>
    </Box>
  );
}

// --- Favorites Tab ---

function FavoritesTab({
  config,
  onSave,
}: {
  config: Config;
  onSave: (config: Config) => void;
}) {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    (async () => {
      const providerConfig = config.providers[config.activeProvider];
      if (!providerConfig) {
        setLoading(false);
        return;
      }

      let modelList = await getCachedModels(config.activeProvider);
      if (!modelList) {
        const provider = getProvider(config.activeProvider);
        modelList = await provider.listModels(providerConfig.apiKey);
        await cacheModels(config.activeProvider, modelList);
      }
      setModels(modelList);
      setLoading(false);
    })();
  }, [config.activeProvider]);

  if (loading) {
    return <Spinner label="Loading models..." />;
  }

  const favorites = config.favoriteModels ?? [];

  const filtered = models
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

  const options = filtered.slice(0, 25).map((m) => ({
    label: favorites.includes(m.id)
      ? `★ ${m.name} (${m.id}) — remove`
      : `  ${m.name} (${m.id}) — add`
    ,
    value: m.id,
  }));

  return (
    <Box flexDirection="column">
      <Text bold>
        Favorite models ({favorites.length} selected):
      </Text>
      <Text dimColor>Select to toggle favorite status</Text>

      <Box marginTop={1}>
        <Text>Filter: </Text>
        <TextInput placeholder="Type to search..." onChange={setFilter} />
      </Box>

      <Box marginTop={1} flexDirection="column">
        {options.length > 0 ? (
          <Select
            options={options}
            onChange={(modelId) => {
              const newFavorites = favorites.includes(modelId)
                ? favorites.filter((f) => f !== modelId)
                : [...favorites, modelId];
              onSave({ ...config, favoriteModels: newFavorites });
            }}
          />
        ) : (
          <Text dimColor>No models match your filter.</Text>
        )}
      </Box>
    </Box>
  );
}
