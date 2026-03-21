import { Link } from "react-router-dom";
import { BarChart3, Database, GitCompare, Layers, Map, Zap } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/hooks/useLanguage";

interface ShortcutItem {
  to: string;
  labelKey: string;
  icon: React.ElementType;
  accentColor: string;
  delay: number;
}

const SHORTCUTS: ShortcutItem[] = [
  { to: "/digital-twin", labelKey: "shortcutDigitalTwin", icon: Zap,        accentColor: "#5CE0D6", delay: 0 },
  { to: "/scenarios",    labelKey: "shortcutScenarios",   icon: Layers,     accentColor: "#FB923C", delay: 80 },
  { to: "/planning",     labelKey: "shortcutPlanning",    icon: GitCompare, accentColor: "#60A5FA", delay: 160 },
  { to: "/geology",      labelKey: "shortcutGeology",     icon: Map,        accentColor: "#4ADE80", delay: 240 },
  { to: "/models",       labelKey: "shortcutModels",      icon: BarChart3,  accentColor: "#FACC15", delay: 320 },
  { to: "/master-data",  labelKey: "shortcutMasterData",  icon: Database,   accentColor: "#FB7185", delay: 400 },
];

interface CommandShortcutsProps {
  animDelay?: number;
}

export function CommandShortcuts({ animDelay = 0 }: CommandShortcutsProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { t } = useLanguage();

  const containerBg     = isDark ? "rgba(12,18,30,0.70)"         : "rgba(255,255,255,0.88)";
  const containerBorder = isDark ? "rgba(92,224,214,0.12)"       : "rgba(13,148,136,0.15)";
  const headerLabelColor= isDark ? "#5CE0D6"                     : "#0D9488";
  const dividerColor    = isDark ? "rgba(92,224,214,0.10)"       : "rgba(13,148,136,0.12)";
  const linkColor       = isDark ? "rgba(255,255,255,0.75)"      : "rgba(15,23,42,0.75)";

  return (
    <div
      className="rounded-xl overflow-hidden transition-colors duration-300"
      style={{
        background: containerBg,
        backdropFilter: "blur(12px)",
        border: `1px solid ${containerBorder}`,
        animation: `fade-slide-right 0.5s ease-out ${animDelay}ms both`,
      }}
    >
      {/* Header */}
      <div
        className="px-5 py-3.5 border-b"
        style={{ borderColor: dividerColor }}
      >
        <p
          className="text-[10px] font-bold uppercase tracking-[0.18em]"
          style={{ color: headerLabelColor }}
        >
          {t("quickAccessTitle")}
        </p>
      </div>

      {/* Shortcut list */}
      <div className="p-2 space-y-1">
        {SHORTCUTS.map(({ to, labelKey, icon: Icon, accentColor, delay }) => (
          <Link
            key={to}
            to={to}
            className="group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200"
            style={{
              borderLeft: `2px solid ${accentColor}40`,
              animation: `fade-slide-right 0.5s ease-out ${animDelay + delay}ms both`,
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.background = isDark ? `${accentColor}15` : `${accentColor}12`;
              el.style.borderLeftColor = accentColor;
              el.style.borderLeftWidth = "3px";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.background = "transparent";
              el.style.borderLeftColor = `${accentColor}40`;
              el.style.borderLeftWidth = "2px";
            }}
          >
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
              style={{ background: `${accentColor}20`, color: accentColor }}
            >
              <Icon className="h-3.5 w-3.5" />
            </div>
            <span
              className="text-sm font-medium transition-colors duration-200"
              style={{ color: linkColor }}
            >
              {t(labelKey)}
            </span>
            <span
              className="ml-auto text-xs opacity-0 group-hover:opacity-70 transition-opacity duration-200"
              style={{ color: accentColor }}
            >
              →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
