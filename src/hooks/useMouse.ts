import { useEffect, useRef } from "react";
import { useStdin, useStdout } from "ink";

export interface MouseEvent {
  type: "press" | "release" | "wheelUp" | "wheelDown";
  x: number;
  y: number;
  button: number;
}

const SGR_MOUSE_RE = /\x1b\[<(\d+);(\d+);(\d+)([Mm])/g;

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

    // Monkey-patch stdin.emit to intercept mouse sequences BEFORE Ink sees them.
    // This prevents raw escape codes from appearing as text in the UI.
    const originalEmit = stdin.emit.bind(stdin);

    stdin.emit = function (event: string, ...args: unknown[]): boolean {
      if (event === "data") {
        const data = args[0];
        const str = typeof data === "string" ? data : Buffer.isBuffer(data) ? data.toString() : "";

        if (str && SGR_MOUSE_RE.test(str)) {
          // Parse and dispatch all mouse events in this chunk
          SGR_MOUSE_RE.lastIndex = 0;
          let match;
          while ((match = SGR_MOUSE_RE.exec(str)) !== null) {
            const button = parseInt(match[1]!, 10);
            const x = parseInt(match[2]!, 10);
            const y = parseInt(match[3]!, 10);
            const isRelease = match[4] === "m";

            if (button === 64) {
              callbackRef.current({ type: "wheelUp", x, y, button });
            } else if (button === 65) {
              callbackRef.current({ type: "wheelDown", x, y, button });
            } else if (isRelease) {
              callbackRef.current({ type: "release", x, y, button });
            } else {
              callbackRef.current({ type: "press", x, y, button });
            }
          }

          // Strip mouse sequences from the data, pass remainder to Ink
          const remaining = str.replace(SGR_MOUSE_RE, "");
          if (remaining.length > 0) {
            return originalEmit(event, remaining);
          }
          // Fully consumed — don't pass to Ink
          return true;
        }
      }

      return originalEmit(event, ...args);
    };

    return () => {
      // Restore original emit
      stdin.emit = originalEmit;
      // Disable mouse tracking
      stdout.write("\x1b[?1006l");
      stdout.write("\x1b[?1000l");
    };
  }, [stdin, stdout]);
}
