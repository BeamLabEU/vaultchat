import { useEffect, useRef } from "react";
import { useStdin, useStdout } from "ink";

export interface MouseEvent {
  type: "press" | "release" | "wheelUp" | "wheelDown";
  x: number;
  y: number;
  button: number;
}

const SGR_MOUSE_RE = /\x1b\[<(\d+);(\d+);(\d+)([Mm])/g;

function parseMouse(str: string, callback: (event: MouseEvent) => void): boolean {
  SGR_MOUSE_RE.lastIndex = 0;
  let found = false;
  let match;
  while ((match = SGR_MOUSE_RE.exec(str)) !== null) {
    found = true;
    const button = parseInt(match[1]!, 10);
    const x = parseInt(match[2]!, 10);
    const y = parseInt(match[3]!, 10);
    const isRelease = match[4] === "m";

    if (button === 64) {
      callback({ type: "wheelUp", x, y, button });
    } else if (button === 65) {
      callback({ type: "wheelDown", x, y, button });
    } else if (isRelease) {
      callback({ type: "release", x, y, button });
    } else {
      callback({ type: "press", x, y, button });
    }
  }
  return found;
}

export function useMouse(onMouse: (event: MouseEvent) => void) {
  const { stdin } = useStdin();
  const { stdout } = useStdout();
  const callbackRef = useRef(onMouse);
  callbackRef.current = onMouse;

  useEffect(() => {
    if (!stdin || !stdout) return;

    // Enable SGR mouse mode
    stdout.write("\x1b[?1000h"); // Button press/release tracking
    stdout.write("\x1b[?1006h"); // SGR extended coordinates

    // Intercept stdin.read() — this is how Ink v6 reads input.
    // We strip mouse sequences from the returned data so Ink never sees them.
    const originalRead = stdin.read.bind(stdin);

    (stdin as any).read = function (size?: number): Buffer | string | null {
      const chunk = originalRead(size);
      if (chunk === null) return null;

      const str = typeof chunk === "string" ? chunk : Buffer.isBuffer(chunk) ? chunk.toString() : null;
      if (!str) return chunk;

      // Check for mouse sequences
      if (!SGR_MOUSE_RE.test(str)) return chunk;
      SGR_MOUSE_RE.lastIndex = 0;

      // Parse and dispatch mouse events
      parseMouse(str, callbackRef.current);

      // Strip mouse sequences, return remaining data to Ink
      const remaining = str.replace(SGR_MOUSE_RE, "");
      if (remaining.length === 0) {
        // Everything was mouse data — return null so Ink's read loop continues
        return null;
      }
      return Buffer.from(remaining);
    };

    return () => {
      // Restore original read
      (stdin as any).read = originalRead;
      // Disable mouse tracking
      stdout.write("\x1b[?1006l");
      stdout.write("\x1b[?1000l");
    };
  }, [stdin, stdout]);
}
