import { useEffect, useState } from "react";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/hooks/useLanguage";

export function StatusBar() {
  const [time, setTime] = useState(() => new Date());
  const [syncMinutes] = useState(() => Math.floor(Math.random() * 8) + 1);
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { t } = useLanguage();

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const pad = (n: number) => String(n).padStart(2, "0");
  const timeStr = `${pad(time.getHours())}:${pad(time.getMinutes())}:${pad(time.getSeconds())}`;

  return (
    <div
      className="flex items-center justify-between px-4 py-2 rounded-lg mb-1 transition-colors duration-300"
      style={{
        background: isDark ? "rgba(12,18,30,0.55)" : "rgba(255,255,255,0.75)",
        border: isDark
          ? "1px solid rgba(92,224,214,0.12)"
          : "1px solid rgba(13,148,136,0.15)",
        backdropFilter: "blur(8px)",
        animation: "fade-slide-up 0.4s ease-out both",
      }}
    >
      {/* Left: online status */}
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5">
          <span
            className="w-1.5 h-1.5 rounded-full animate-blink"
            style={{
              background: isDark ? "#4ADE80" : "#16A34A",
              boxShadow: isDark ? "0 0 6px #4ADE8080" : "none",
            }}
          />
          <span
            className="font-mono text-[11px] uppercase tracking-widest"
            style={{ color: isDark ? "#4ADE80" : "#16A34A" }}
          >
            {t("statusOnline")}
          </span>
        </span>
        <span
          className="w-px h-3"
          style={{ background: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)" }}
        />
        <span
          className="font-mono text-[11px]"
          style={{ color: isDark ? "rgba(255,255,255,0.40)" : "rgba(30,41,59,0.50)" }}
        >
          {t("statusSync")} {syncMinutes} {t("statusMinAgo")}
        </span>
      </div>

      {/* Center: live clock */}
      <span
        className="font-mono text-xs tabular-nums font-semibold"
        style={{
          color: isDark ? "#5CE0D6" : "#0D9488",
          textShadow: isDark ? "0 0 10px #5CE0D640" : "none",
          letterSpacing: "0.12em",
        }}
      >
        {timeStr}
      </span>

      {/* Right: version info */}
      <span
        className="font-mono text-[11px] tracking-widest hidden sm:block"
        style={{ color: isDark ? "rgba(255,255,255,0.25)" : "rgba(30,41,59,0.40)" }}
      >
        IE v2.1.0 · PROD
      </span>
    </div>
  );
}
