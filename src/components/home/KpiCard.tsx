import type { ReactNode } from "react";
import { useTheme } from "@/hooks/useTheme";
import { CountUpNumber } from "./CountUpNumber";
import { SparklineChart } from "./SparklineChart";

interface KpiCardProps {
  title: string;
  value: number;
  subtitle: string;
  icon: ReactNode;
  color?: string;
  sparkData?: number[];
  animDelay?: number;
  decimals?: number;
}

const PALETTE = {
  cyan:   { dark: "#5CE0D6", light: "#0D9488" },
  green:  { dark: "#4ADE80", light: "#16A34A" },
  blue:   { dark: "#60A5FA", light: "#2563EB" },
  amber:  { dark: "#FACC15", light: "#CA8A04" },
  purple: { dark: "#FB923C", light: "#EA580C" },
};

export function KpiCard({
  title,
  value,
  subtitle,
  icon,
  color = "cyan",
  sparkData,
  animDelay = 0,
  decimals = 0,
}: KpiCardProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const entry = PALETTE[color as keyof typeof PALETTE] ?? PALETTE.cyan;
  const accent = isDark ? entry.dark : entry.light;

  const cardBg    = isDark ? "rgba(12,18,30,0.70)" : "rgba(255,255,255,0.88)";
  const borderDef = isDark ? `${accent}30` : `${accent}40`;
  const borderHov = isDark ? `${accent}70` : `${accent}90`;
  const shadowHov = isDark
    ? `0 0 24px ${accent}30, inset 0 0 24px ${accent}08`
    : `0 4px 20px ${accent}25`;

  return (
    <div
      className="relative group rounded-xl overflow-hidden cursor-default transition-all duration-400"
      style={{
        background: cardBg,
        backdropFilter: "blur(12px)",
        border: `1px solid ${borderDef}`,
        animation: `fade-slide-up 0.6s ease-out ${animDelay}ms both`,
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.border = `1px solid ${borderHov}`;
        el.style.boxShadow = shadowHov;
        el.style.transform = "translateY(-3px)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.border = `1px solid ${borderDef}`;
        el.style.boxShadow = "none";
        el.style.transform = "translateY(0)";
      }}
    >
      {/* Top accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
      />

      <div className="p-4 space-y-3">
        {/* Header: title + icon */}
        <div className="flex items-center justify-between">
          <p
            className="text-[10px] font-bold uppercase tracking-[0.15em]"
            style={{ color: accent }}
          >
            {title}
          </p>
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{
              background: `${accent}20`,
              border: `1px solid ${accent}40`,
              color: accent,
            }}
          >
            {icon}
          </div>
        </div>

        {/* KPI number */}
        <div
          className="text-3xl font-bold tabular-nums leading-none"
          style={{
            color: isDark ? "#FFFFFF" : accent,
            textShadow: isDark ? `0 0 20px ${accent}50` : "none",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          <CountUpNumber
            target={value}
            duration={1400}
            formatter={decimals > 0 ? (v) => v.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : undefined}
          />
        </div>

        {/* Subtitle + sparkline */}
        <div className="flex items-end justify-between gap-2">
          <p
            className="text-[11px] leading-tight"
            style={{ color: isDark ? `${accent}88` : `${accent}aa` }}
          >
            {subtitle}
          </p>
          {sparkData && (
            <SparklineChart
              data={sparkData}
              width={80}
              height={28}
              color={accent}
            />
          )}
        </div>
      </div>
    </div>
  );
}
