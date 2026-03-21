/**
 * FieldSchemeEditorEmbed — same functionality as FieldSchemeEditorPage
 * but uses local state instead of URL params, so it can be embedded anywhere.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { FieldSchemeEditor } from "./FieldSchemeEditor";
import { fieldSchemeApi } from "../api/fieldSchemeApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";
import { LayoutList } from "lucide-react";
import type { FieldSchemeEditorHandle } from "./FieldSchemeEditor";
import { useOilFields } from "@/hooks/useOilFields";

interface SchemeSummary {
  id: string;
  name: string;
  oilFieldId?: number | null;
}

export function FieldSchemeEditorEmbed() {
  const { oilFields } = useOilFields();
  const [schemes, setSchemes] = useState<SchemeSummary[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<number | "">("");
  const [activeSchemeId, setActiveSchemeId] = useState<string | undefined>(undefined);
  const [isSchemesCollapsed, setIsSchemesCollapsed] = useState(false);
  const [schemeName, setSchemeName] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const editorRef = useRef<FieldSchemeEditorHandle | null>(null);
  const { toast } = useToast();
  const { t, translateData } = useLanguage();

  const loadSchemes = () =>
    fieldSchemeApi
      .listSchemes()
      .then((data) =>
        setSchemes(
          data.map((item) => ({
            id: item.id,
            name: item.name,
            oilFieldId: item.oilFieldId ?? null,
          }))
        )
      )
      .catch(() => setSchemes([]));

  useEffect(() => {
    loadSchemes();
  }, []);

  // Auto-collapse groups when data loads
  useEffect(() => {
    setCollapsedGroups((prev) => {
      const next = { ...prev };
      for (const scheme of schemes) {
        const key = String(scheme.oilFieldId ?? "none");
        if (!(key in next)) next[key] = true;
      }
      return next;
    });
  }, [schemes]);

  // Sync scheme name from active scheme
  const currentScheme = useMemo(
    () => schemes.find((s) => s.id === activeSchemeId),
    [schemes, activeSchemeId]
  );

  useEffect(() => {
    if (!activeSchemeId) { setSchemeName(""); return; }
    if (isRenaming) return;
    if (currentScheme?.name) { setSchemeName(currentScheme.name); return; }
    fieldSchemeApi.getScheme(activeSchemeId).then((data) => {
      setSchemeName(data.scheme.name ?? "");
    });
  }, [activeSchemeId, currentScheme, isRenaming]);

  const schemesByField = useMemo(() => {
    const map = new Map<number | "none", SchemeSummary[]>();
    for (const s of schemes) {
      const key = s.oilFieldId ?? "none";
      map.set(key, [...(map.get(key) ?? []), s]);
    }
    return map;
  }, [schemes]);

  const handleCreateScheme = async () => {
    if (!selectedFieldId) return;
    if (editorRef.current?.isDirty()) {
      const shouldSave = window.confirm(t("fieldSchemeSaveCurrentPrompt"));
      if (shouldSave) await editorRef.current.save();
    }
    const created = await fieldSchemeApi.createScheme({
      oilFieldId: selectedFieldId,
      name: t("fieldSchemeNewSchemeName"),
      description: "",
      isBaseline: false,
      isActive: true,
      canvasWidth: 2000,
      canvasHeight: 1500,
      zoomLevel: 1,
    });
    const requestedName = window.prompt(t("fieldSchemeRenamePrompt"), created.name);
    if (requestedName?.trim() && requestedName.trim() !== created.name) {
      try {
        const updated = await fieldSchemeApi.updateScheme(created.id, { name: requestedName.trim() });
        setSchemeName(updated.name ?? requestedName.trim());
      } catch (err) {
        toast({ title: t("fieldSchemeRenameFailed"), description: String(err) });
      }
    }
    await loadSchemes();
    setActiveSchemeId(created.id);
  };

  const handleRename = async () => {
    if (!activeSchemeId) return;
    const trimmed = schemeName.trim();
    if (!trimmed) return;
    try {
      const updated = await fieldSchemeApi.updateScheme(activeSchemeId, { name: trimmed });
      setSchemeName(updated.name ?? trimmed);
      loadSchemes();
      toast({ title: t("fieldSchemeRenameSaved") });
    } catch (err) {
      toast({ title: t("fieldSchemeRenameFailed"), description: String(err) });
    }
  };

  const activeFieldId = useMemo(() => {
    if (!activeSchemeId) return selectedFieldId || undefined;
    const scheme = schemes.find((s) => s.id === activeSchemeId);
    return (scheme?.oilFieldId ?? selectedFieldId) || undefined;
  }, [activeSchemeId, schemes, selectedFieldId]);

  const activeFieldName = useMemo(() => {
    if (!activeFieldId) return undefined;
    const field = oilFields.find((f) => f.id === Number(activeFieldId));
    if (!field) return undefined;
    return field.shortName ? translateData(field.shortName) : translateData(field.name);
  }, [activeFieldId, oilFields, translateData]);

  return (
    <div className={`field-scheme-page${isSchemesCollapsed ? " schemes-collapsed" : ""}`}>
      {/* Canvas */}
      <div className="field-scheme-main">
        <FieldSchemeEditor
          key={activeSchemeId || "new"}
          ref={editorRef}
          schemeId={activeSchemeId}
          oilFieldId={activeFieldId ? String(activeFieldId) : undefined}
          oilFieldName={activeFieldName}
        />
      </div>

      {/* Sidebar */}
      <aside className={`field-scheme-sidebar${isSchemesCollapsed ? " collapsed" : ""}`}>
        <div className="sidebar-card sidebar-header">
          <button
            type="button"
            className="panel-toggle"
            onClick={() => setIsSchemesCollapsed((p) => !p)}
          >
            {isSchemesCollapsed
              ? <LayoutList className="h-4 w-4" />
              : `▾ ${t("fieldSchemeListTitle")}`}
          </button>
        </div>

        {!isSchemesCollapsed && (
          <>
            {/* Field selector + Create */}
            <div className="sidebar-card">
              <h3>{t("fieldSchemeSelectOilFieldLabel")}</h3>
              <select
                value={selectedFieldId}
                onChange={(e) =>
                  setSelectedFieldId(e.target.value ? Number(e.target.value) : "")
                }
              >
                <option value="">{t("fieldSchemeSelectOilFieldPlaceholder")}</option>
                {oilFields.map((field) => (
                  <option key={field.id} value={field.id}>
                    {field.shortName
                      ? `${translateData(field.shortName)} — ${translateData(field.name)}`
                      : translateData(field.name)}
                  </option>
                ))}
              </select>
              <Button
                size="sm"
                className="mt-2 w-full sidebar-btn"
                onClick={handleCreateScheme}
              >
                {t("fieldSchemeCreateNew")}
              </Button>
              {!selectedFieldId && (
                <div className="text-muted-foreground mt-2" style={{ fontSize: "12px" }}>
                  {t("fieldSchemeCreateNeedsOilField")}
                </div>
              )}

              {/* Rename active scheme */}
              {activeSchemeId && (
                <div className="mt-4 space-y-2">
                  <div className="text-muted-foreground" style={{ fontSize: "12px" }}>
                    {t("fieldSchemeRenameTitle")}
                  </div>
                  <Input
                    value={schemeName}
                    onChange={(e) => setSchemeName(e.target.value)}
                    onFocus={() => setIsRenaming(true)}
                    onBlur={() => setIsRenaming(false)}
                    placeholder={t("fieldSchemeRenamePlaceholder")}
                    onKeyDown={async (e) => {
                      if (e.key !== "Enter") return;
                      await handleRename();
                    }}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full sidebar-btn"
                    onClick={handleRename}
                    disabled={!schemeName.trim() || schemeName.trim() === currentScheme?.name}
                  >
                    {t("fieldSchemeRenameSave")}
                  </Button>
                </div>
              )}
            </div>

            {/* Scheme list grouped by field */}
            <div className="sidebar-card">
              <h3>{t("fieldSchemeListTitle")}</h3>

              {oilFields.map((field) => {
                const list = schemesByField.get(field.id) ?? [];
                if (list.length === 0) return null;
                const groupKey = String(field.id);
                return (
                  <div key={field.id} className="scheme-group">
                    <button
                      type="button"
                      className="scheme-group-toggle"
                      onClick={() =>
                        setCollapsedGroups((p) => ({ ...p, [groupKey]: !p[groupKey] }))
                      }
                    >
                      <span>
                        {field.shortName
                          ? `${translateData(field.shortName)} — ${translateData(field.name)}`
                          : translateData(field.name)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {collapsedGroups[groupKey] ? "▸" : "▾"}
                      </span>
                    </button>
                    {!collapsedGroups[groupKey] &&
                      list.map((scheme) => (
                        <button
                          key={scheme.id}
                          type="button"
                          className={`scheme-link ${scheme.id === activeSchemeId ? "active" : ""}`}
                          onClick={() => setActiveSchemeId(scheme.id)}
                        >
                          {scheme.name}
                        </button>
                      ))}
                  </div>
                );
              })}

              {(schemesByField.get("none") ?? []).length > 0 && (
                <div className="scheme-group">
                  <button
                    type="button"
                    className="scheme-group-toggle"
                    onClick={() =>
                      setCollapsedGroups((p) => ({ ...p, none: !p.none }))
                    }
                  >
                    <span>{t("fieldSchemeListNone")}</span>
                    <span className="text-xs text-muted-foreground">
                      {collapsedGroups.none ? "▸" : "▾"}
                    </span>
                  </button>
                  {!collapsedGroups.none &&
                    (schemesByField.get("none") ?? []).map((scheme) => (
                      <button
                        key={scheme.id}
                        type="button"
                        className={`scheme-link ${scheme.id === activeSchemeId ? "active" : ""}`}
                        onClick={() => setActiveSchemeId(scheme.id)}
                      >
                        {scheme.name}
                      </button>
                    ))}
                </div>
              )}

              {oilFields.length === 0 && (
                <div className="text-xs text-muted-foreground">{t("fieldSchemeListEmpty")}</div>
              )}
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
