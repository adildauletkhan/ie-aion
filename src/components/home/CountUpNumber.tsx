import { useEffect, useRef, useState } from "react";

interface CountUpNumberProps {
  target: number;
  duration?: number;
  formatter?: (value: number) => string;
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

export function CountUpNumber({ target, duration = 1500, formatter }: CountUpNumberProps) {
  const [display, setDisplay] = useState("0");
  const rafRef = useRef<number>(0);
  const startRef = useRef<number | null>(null);
  const prevTargetRef = useRef(0);

  useEffect(() => {
    if (target === prevTargetRef.current) return;
    const from = prevTargetRef.current;
    prevTargetRef.current = target;
    startRef.current = null;

    const tick = (now: number) => {
      if (!startRef.current) startRef.current = now;
      const elapsed = now - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progress);
      const current = from + (target - from) * eased;
      const rounded = Number.isInteger(target) ? Math.round(current) : current;
      setDisplay(formatter ? formatter(current) : rounded.toLocaleString());
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration, formatter]);

  return <>{display}</>;
}
