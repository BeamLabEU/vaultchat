import { render } from "ink";
import { App } from "./tui/App.tsx";

const { waitUntilExit } = render(<App />);
await waitUntilExit();
