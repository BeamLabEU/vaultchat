import { useEffect, useRef } from "react";
import { useStdin, useStdout } from "ink";

export interface MouseEvent {
  type: "press" | "release" | "wheelUp" | "wheelDown";
  x: number;
  y: number;
  button: number;
}

export function useMouse(onMouse: (event: MouseEvent) => void) {
  const { stdin, setRawMode } = useStdin();
  const { stdout } = useStdout();
  const callbackRef = useRef(onMouse);
  callbackRef.current = onMouse;

  useEffect(() => {
    if (!stdin || !stdout) return;

    // Enable SGR mouse mode (1006) for better coordinate support
    // 1000 = button tracking, 1003 = any-event tracking, 1006 = SGR format
    stdout.write("\x1b[?1000h"); // Enable button press/release
    stdout.write("\x1b[?1006h"); // Enable SGR extended coordinates

    const handler = (data: Buffer) => {
      const str = data.toString();

      // SGR mouse format: \x1b[<button;x;y(M|m)
      // M = press, m = release
      const sgrMatch = str.match(/\x1b\[<(\d+);(\d+);(\d+)([Mm])/);
      if (sgrMatch) {
        const button = parseInt(sgrMatch[1]!, 10);
        const x = parseInt(sgrMatch[2]!, 10);
        const y = parseInt(sgrMatch[3]!, 10);
        const isRelease = sgrMatch[4] === "m";

        // Button 64 = wheel up, 65 = wheel down
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
    };

    stdin.on("data", handler);

    return () => {
      stdin.off("data", handler);
      // Disable mouse tracking
      stdout.write("\x1b[?1006l");
      stdout.write("\x1b[?1000l");
    };
  }, [stdin, stdout]);
}
