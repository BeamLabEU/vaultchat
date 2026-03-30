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
    stdout.write("\x1b[?1000h");
    stdout.write("\x1b[?1006h");

    const handleMouse = (button: number, x: number, y: number, isRelease: boolean) => {
      if (button === 64) {
        callbackRef.current({ type: "wheelUp", x, y, button });
      } else if (button === 65) {
        callbackRef.current({ type: "wheelDown", x, y, button });
      } else if (isRelease) {
        callbackRef.current({ type: "release", x, y, button });
      } else {
        callbackRef.current({ type: "press", x, y, button });
      }
    };

    // Intercept stdin.read() to strip mouse sequences before Ink sees them
    const originalRead = stdin.read.bind(stdin);

    (stdin as any).read = function (size?: number): Buffer | string | null {
      const chunk = originalRead(size);
      if (chunk === null) return null;

      const str = typeof chunk === "string" ? chunk : Buffer.isBuffer(chunk) ? chunk.toString() : null;
      if (!str) return chunk;

      if (!SGR_MOUSE_RE.test(str)) return chunk;
      SGR_MOUSE_RE.lastIndex = 0;

      // Parse mouse events
      let match;
      while ((match = SGR_MOUSE_RE.exec(str)) !== null) {
        handleMouse(
          parseInt(match[1]!, 10),
          parseInt(match[2]!, 10),
          parseInt(match[3]!, 10),
          match[4] === "m"
        );
      }

      // Strip mouse sequences, pass remainder to Ink
      const remaining = str.replace(SGR_MOUSE_RE, "");
      if (remaining.length === 0) return null;
      return Buffer.from(remaining);
    };

    return () => {
      (stdin as any).read = originalRead;
      stdout.write("\x1b[?1006l");
      stdout.write("\x1b[?1000l");
    };
  }, [stdin, stdout]);
}
