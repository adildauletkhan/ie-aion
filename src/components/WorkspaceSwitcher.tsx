import { Building2, ChevronDown, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useWorkspace } from "@/context/WorkspaceContext";

export function WorkspaceSwitcher() {
  const { workspaces, activeWorkspace, setActiveWorkspace, loading } = useWorkspace();

  if (loading || workspaces.length === 0) return null;
  // If user has only one workspace — show label but no switcher
  if (workspaces.length === 1) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md text-sm font-medium text-muted-foreground">
        <Building2 className="h-4 w-4 shrink-0" />
        <span className="hidden sm:block max-w-[200px] truncate">
          {activeWorkspace?.shortName ?? activeWorkspace?.name}
        </span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-muted/40 hover:bg-accent/60 transition-colors text-sm font-medium outline-none focus:ring-2 focus:ring-ring">
          <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="hidden sm:block max-w-[200px] truncate">
            {activeWorkspace?.shortName ?? activeWorkspace?.name ?? "Workspace"}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <div className="px-3 py-2 text-xs text-muted-foreground font-medium uppercase tracking-wide">
          Рабочее пространство
        </div>
        <DropdownMenuSeparator />
        {workspaces.map((ws) => (
          <DropdownMenuItem
            key={ws.id}
            onClick={() => setActiveWorkspace(ws)}
            className="flex items-center gap-2 py-2.5 cursor-pointer"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary font-bold text-xs">
              {(ws.shortName ?? ws.name).slice(0, 3).toUpperCase()}
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-sm font-medium truncate">
                {ws.shortName ?? ws.name}
              </span>
              <span className="text-xs text-muted-foreground truncate">
                {ws.workspaceScope === "all"
                  ? ws.code === "KEGOC"      ? "Системный оператор · НЭС"
                  : ws.code === "KAZGMK"     ? "Головная компания · ГМК"
                  : ws.code === "KTO"        ? "Нефтепроводы · КМГ Группа"
                  : ws.code === "QAZAQGAS"   ? "Газопроводы · Самрук-Казына"
                  : "Полный доступ"
                  : ws.code === "ENERGOINFORM" ? "ИТК · 100% ДЗО"
                  : ws.code === "BATYS"        ? "ЛЭП 500кВ · 20% ДЗО"
                  : ws.code === "ZHEZKAZGAN"   ? "Медь · 100% ДЗО"
                  : ws.code === "SOKOLOV"      ? "Железная руда · 100% ДЗО"
                  : ws.code === "KTO_WEST"     ? "Зап. нефтепроводы · филиал"
                  : ws.code === "KTO_AKTAU"    ? "Мор. терминал Актау"
                  : ws.code === "ICA"          ? "Транзит газа · ДЗО"
                  : ws.code === "KTGAIMAK"     ? "Газораспределение · ДЗО"
                  : "Собственные активы"}
              </span>
            </div>
            {activeWorkspace?.id === ws.id && (
              <Check className="h-4 w-4 text-primary shrink-0" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
