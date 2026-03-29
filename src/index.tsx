import { render, Text, Box } from "ink";

function App() {
  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">
        VaultChat
      </Text>
      <Text dimColor>TUI AI chat client — conversations as markdown files</Text>
    </Box>
  );
}

render(<App />);
