import { useEffect, useRef } from "react";
import { useStdin, useStdout } from "ink";

export interface MouseEvent {
  type: "press" | "release" | "wheelUp" | "wheelDown";
  x: number;
  y: number;
  button: number;
}

const SGR_MOUSE_RE = /\x1b\[<(\d+);(\d+);(\d+)([Mm])/g;

const SCROLL_THROTTLE_MS = 50;

export function useMouse(onMouse: (event: MouseEvent) => void) {
  const { stdin } = useStdin();
  const { stdout } = useStdout();
  const callbackRef = useRef(onMouse);
  callbackRef.current = onMouse;

  // Accumulate scroll ticks and flush on a timer
  const scrollAccum = useRef(0);
  const scrollX = useRef(0);
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!stdin || !stdout) return;

    // Enable SGR mouse mode
    stdout.write("\x1b[?1000h");
    stdout.write("\x1b[?1006h");

    const flushScroll = () => {
      scrollTimer.current = null;
      const delta = scrollAccum.current;
      const x = scrollX.current;
      scrollAccum.current = 0;
      if (delta !== 0) {
        callbackRef.current({
          type: delta < 0 ? "wheelUp" : "wheelDown",
          x,
          y: 0,
          button: delta < 0 ? 64 : 65,
        });
      }
    };

    const handleMouse = (button: number, x: number, y: number, isRelease: boolean) => {
      // Wheel events: accumulate and throttle
      if (button === 64 || button === 65) {
        const dir = button === 64 ? -1 : 1;
        scrollAccum.current += dir;
        scrollX.current = x;
        if (!scrollTimer.current) {
          scrollTimer.current = setTimeout(flushScroll, SCROLL_THROTTLE_MS);
        }
        return;
      }

      // Click events: dispatch immediately
      if (isRelease) {
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
      if (scrollTimer.current) clearTimeout(scrollTimer.current);
      stdout.write("\x1b[?1006l");
      stdout.write("\x1b[?1000l");
    };
  }, [stdin, stdout]);
}
