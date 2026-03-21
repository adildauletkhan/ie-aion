import {
  BarChart3, Layers, Database, ChevronLeft, ChevronRight, Shield,
  Workflow, CalendarRange, Home, Plug, AlertTriangle, Cuboid,
  TrendingDown, FileBarChart2, ChevronDown, Calendar, Zap,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useWorkspace } from "@/context/WorkspaceContext";
import { useLocation } from "react-router-dom";

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [planningOpen, setPlanningOpen] = useState(false);
  const [eventMgmtOpen, setEventMgmtOpen] = useState(false);
  const [assetsOpen, setAssetsOpen] = useState(false);
  const { t } = useLanguage();
  const { activeWorkspace } = useWorkspace();
  const location = useLocation();

  // auto-expand planning group when a planning route is active
  const isPlanningActive = ["/planning", "/annual-planning", "/scenarios"].some(p =>
    location.pathname.startsWith(p)
  );
  const planningExpanded = planningOpen || isPlanningActive;

  // auto-expand event management group when a relevant route is active
  const isEventMgmtActive = ["/digital-twin", "/crisis-response"].some(p =>
    location.pathname.startsWith(p)
  );
  const eventMgmtExpanded = eventMgmtOpen || isEventMgmtActive;

  // auto-expand assets group when a relevant route is active
  const isAssetsActive = ["/master-data", "/geology"].some(p =>
    location.pathname.startsWith(p)
  );
  const assetsExpanded = assetsOpen || isAssetsActive;

  const topItems = [
    { title: t("navDigitalTwinHome"), url: "/",             icon: Home,         scopes: ["all", "own"] },
    { title: t("navModels"),          url: "/models",       icon: Cuboid,       scopes: ["all", "own"] },
    { title: t("backAllocation"),     url: "/back-allocation", icon: TrendingDown, scopes: ["all", "own"] },
    { title: t("navWellLogs"),        url: "/well-logs",    icon: FileBarChart2,scopes: ["all", "own"] },
  ];

  const planningChildren = [
    { title: t("navAnnualPlanning"),  url: "/planning",  icon: CalendarRange, scopes: ["all", "own"] },
  ];

  const eventChildren = [
    { title: t("navDigitalTwin"),    url: "/digital-twin",   icon: Workflow,      scopes: ["all", "own"] },
    { title: t("navCrisisResponse"), url: "/crisis-response", icon: AlertTriangle, scopes: ["all", "own"] },
  ];

  const assetsChildren = [
    { title: t("navMasterData"), url: "/master-data", icon: Database,  scopes: ["all", "own"] },
    { title: t("navGeology"),    url: "/geology",     icon: BarChart3, scopes: ["all", "own"] },
  ];

  const bottomItems = [
    { title: t("navIntegrations"), url: "/integrations", icon: Plug,     scopes: ["all", "own"] },
  ];

  const currentScope = activeWorkspace?.workspaceScope ?? "all";

  const linkClass = "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors";
  const activeLinkClass = "bg-sidebar-accent text-sidebar-accent-foreground font-medium";

  return (
    <aside
      className={`flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-200 shrink-0 ${
        collapsed ? "w-16" : "w-60"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-sidebar-border">
        <div className="flex items-center gap-2 min-w-0 overflow-hidden">
          <img src="/logo.svg" alt="" className="h-8 w-8 shrink-0" aria-hidden />
          {!collapsed && (
            <span className="text-xs font-bold tracking-wider text-sidebar-primary uppercase leading-tight break-words">
              {t("appTitle")}
            </span>
          )}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded hover:bg-sidebar-accent text-sidebar-foreground shrink-0 ml-1"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
        {/* Top items */}
        {topItems
          .filter(item => item.scopes.includes(currentScope))
          .map(item => (
            <NavLink
              key={item.url}
              to={item.url}
              end={item.url === "/"}
              className={linkClass}
              activeClassName={activeLinkClass}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.title}</span>}
            </NavLink>
          ))}

        {/* ── Планирование group ── */}
        <div>
          <div className="flex items-center">
            <NavLink
              to="/planning"
              className={`flex-1 flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors`}
              activeClassName={activeLinkClass}
            >
              <Calendar className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="flex-1">{t("navPlanning")}</span>}
            </NavLink>
            {!collapsed && (
              <button
                onClick={() => setPlanningOpen(prev => !prev)}
                className="p-2 hover:bg-sidebar-accent rounded-md transition-colors text-sidebar-foreground"
                aria-label="Expand planning"
              >
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${planningExpanded ? "rotate-180" : ""}`}
                />
              </button>
            )}
          </div>

          {/* Children */}
          {planningExpanded && !collapsed && (
            <div className="ml-3 mt-0.5 space-y-0.5 border-l border-sidebar-border pl-3">
              {planningChildren
                .filter(item => item.scopes.includes(currentScope))
                .map(item => (
                  <NavLink
                    key={item.url}
                    to={item.url}
                    className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                    activeClassName={activeLinkClass}
                  >
                    <item.icon className="h-3.5 w-3.5 shrink-0" />
                    <span>{item.title}</span>
                  </NavLink>
                ))}
            </div>
          )}

          {/* Collapsed: show children as normal items */}
          {planningExpanded && collapsed && planningChildren
            .filter(item => item.scopes.includes(currentScope))
            .map(item => (
              <NavLink
                key={item.url}
                to={item.url}
                className={linkClass}
                activeClassName={activeLinkClass}
              >
                <item.icon className="h-4 w-4 shrink-0" />
              </NavLink>
            ))}
        </div>

        {/* ── Event Management group ── */}
        <div>
          <div className="flex items-center">
            <NavLink
              to="/digital-twin"
              className="flex-1 flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
              activeClassName={activeLinkClass}
            >
              <Zap className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="flex-1">{t("navEventManagement")}</span>}
            </NavLink>
            {!collapsed && (
              <button
                onClick={() => setEventMgmtOpen(prev => !prev)}
                className="p-2 hover:bg-sidebar-accent rounded-md transition-colors text-sidebar-foreground"
                aria-label="Expand event management"
              >
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${eventMgmtExpanded ? "rotate-180" : ""}`}
                />
              </button>
            )}
          </div>

          {/* Children expanded */}
          {eventMgmtExpanded && !collapsed && (
            <div className="ml-3 mt-0.5 space-y-0.5 border-l border-sidebar-border pl-3">
              {eventChildren
                .filter(item => item.scopes.includes(currentScope))
                .map(item => (
                  <NavLink
                    key={item.url}
                    to={item.url}
                    className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                    activeClassName={activeLinkClass}
                  >
                    <item.icon className="h-3.5 w-3.5 shrink-0" />
                    <span>{item.title}</span>
                  </NavLink>
                ))}
            </div>
          )}

          {/* Collapsed: show children as icons */}
          {eventMgmtExpanded && collapsed && eventChildren
            .filter(item => item.scopes.includes(currentScope))
            .map(item => (
              <NavLink
                key={item.url}
                to={item.url}
                className={linkClass}
                activeClassName={activeLinkClass}
              >
                <item.icon className="h-4 w-4 shrink-0" />
              </NavLink>
            ))}
        </div>

        {/* ── Assets group ── */}
        <div>
          <div className="flex items-center">
            <NavLink
              to="/master-data"
              className="flex-1 flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
              activeClassName={activeLinkClass}
            >
              <Database className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="flex-1">{t("navData")}</span>}
            </NavLink>
            {!collapsed && (
              <button
                onClick={() => setAssetsOpen(prev => !prev)}
                className="p-2 hover:bg-sidebar-accent rounded-md transition-colors text-sidebar-foreground"
                aria-label="Expand assets"
              >
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${assetsExpanded ? "rotate-180" : ""}`}
                />
              </button>
            )}
          </div>

          {assetsExpanded && !collapsed && (
            <div className="ml-3 mt-0.5 space-y-0.5 border-l border-sidebar-border pl-3">
              {assetsChildren
                .filter(item => item.scopes.includes(currentScope))
                .map(item => (
                  <NavLink
                    key={item.url}
                    to={item.url}
                    className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                    activeClassName={activeLinkClass}
                  >
                    <item.icon className="h-3.5 w-3.5 shrink-0" />
                    <span>{item.title}</span>
                  </NavLink>
                ))}
            </div>
          )}

          {assetsExpanded && collapsed && assetsChildren
            .filter(item => item.scopes.includes(currentScope))
            .map(item => (
              <NavLink
                key={item.url}
                to={item.url}
                className={linkClass}
                activeClassName={activeLinkClass}
              >
                <item.icon className="h-4 w-4 shrink-0" />
              </NavLink>
            ))}
        </div>

        {/* Bottom items */}
        {bottomItems
          .filter(item => item.scopes.includes(currentScope))
          .map(item => (
            <NavLink
              key={item.url}
              to={item.url}
              className={linkClass}
              activeClassName={activeLinkClass}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.title}</span>}
            </NavLink>
          ))}
      </nav>

      {/* Admin */}
      <div className="border-t border-sidebar-border p-2">
        <NavLink
          to="/admin"
          className={`${linkClass} w-full`}
          activeClassName={activeLinkClass}
        >
          <Shield className="h-4 w-4 shrink-0" />
          {!collapsed && <span>{t("navAdmin")}</span>}
        </NavLink>
      </div>

      {/* Footer */}
      {!collapsed && (
        <div className="border-t border-sidebar-border px-4 py-3 space-y-1">
          {activeWorkspace && (
            <p className="text-[10px] text-sidebar-foreground/60 text-center leading-tight truncate font-medium">
              {activeWorkspace.shortName ?? activeWorkspace.name}
            </p>
          )}
          <p className="text-[10px] text-sidebar-foreground/40 text-center leading-tight">
            developed by Adil Dauletkhan
          </p>
        </div>
      )}
    </aside>
  );
}
