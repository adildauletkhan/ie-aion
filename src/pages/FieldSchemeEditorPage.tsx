import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { FieldSchemeEditor } from "@/features/field-scheme/components/FieldSchemeEditor";
import { fieldSchemeApi } from "@/features/field-scheme/api/fieldSchemeApi";
import { getAuthHeader } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";
import { LayoutList } from "lucide-react";
import type { FieldSchemeEditorHandle } from "@/features/field-scheme/components/FieldSchemeEditor";
import { useOilFields } from "@/hooks/useOilFields";

interface OilFieldRow {
  id: number;
  name: string;
  shortName?: string | null;
}

interface SchemeSummary {
  id: string;
  name: string;
  oilFieldId?: number | null;
}

export default function FieldSchemeEditorPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const oilFieldId = useMemo(() => searchParams.get("oilFieldId") ?? undefined, [searchParams]);
  const { oilFields } = useOilFields();
  const [schemes, setSchemes] = useState<SchemeSummary[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<number | "">("");
  const [isSchemesCollapsed, setIsSchemesCollapsed] = useState(false);
  const [schemeName, setSchemeName] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);
  const [collapsedSchemeGroups, setCollapsedSchemeGroups] = useState<Record<string, boolean>>({});
  const editorRef = useRef<FieldSchemeEditorHandle | null>(null);
  const { toast } = useToast();
  const { t, translateData } = useLanguage();

  // oilFields is now sourced from useOilFields() above (workspace-filtered)

  useEffect(() => {
    fieldSchemeApi
      .listSchemes()
      .then((data) => {
        setSchemes(
          data.map((item) => ({
            id: item.id,
            name: item.name,
            oilFieldId: item.oilFieldId ?? null,
          }))
        );
      })
      .catch(() => {
        setSchemes([]);
      });
  }, []);

  const refreshSchemes = () => {
    fieldSchemeApi
      .listSchemes()
      .then((data) => {
        setSchemes(
          data.map((item) => ({
            id: item.id,
            name: item.name,
            oilFieldId: item.oilFieldId ?? null,
          }))
        );
      })
      .catch(() => {
        setSchemes([]);
      });
  };

  useEffect(() => {
    if (!id) return;
    fieldSchemeApi.getScheme(id).then((data) => {
      if (data.scheme.oilFieldId) {
        setSelectedFieldId(data.scheme.oilFieldId);
      }
    });
  }, [id]);

  useEffect(() => {
    if (!oilFieldId) return;
    const parsed = Number(oilFieldId);
    if (Number.isFinite(parsed)) {
      setSelectedFieldId(parsed);
    }
  }, [oilFieldId]);

  const schemesByField = useMemo(() => {
    const map = new Map<number | "none", SchemeSummary[]>();
    for (const scheme of schemes) {
      const key = scheme.oilFieldId ?? "none";
      map.set(key, [...(map.get(key) ?? []), scheme]);
    }
    return map;
  }, [schemes]);

  useEffect(() => {
    setCollapsedSchemeGroups((prev) => {
      const next = { ...prev };
      for (const key of schemesByField.keys()) {
        const groupKey = String(key);
        if (!(groupKey in next)) {
          next[groupKey] = true;
        }
      }
      return next;
    });
  }, [schemesByField]);

  const currentScheme = useMemo(() => schemes.find((scheme) => scheme.id === id), [schemes, id]);

  useEffect(() => {
    if (!id) {
      setSchemeName("");
      return;
    }
    if (isRenaming) return;
    if (currentScheme?.name) {
      setSchemeName(currentScheme.name);
      return;
    }
    fieldSchemeApi.getScheme(id).then((data) => {
      setSchemeName(data.scheme.name ?? "");
    });
  }, [id, currentScheme, isRenaming]);

  return (
    <div className={`field-scheme-page${isSchemesCollapsed ? " schemes-collapsed" : ""}`}>
      <div className="field-scheme-main">
        <FieldSchemeEditor
          key={id || 'new'}
          ref={editorRef}
          schemeId={id}
          oilFieldId={selectedFieldId ? String(selectedFieldId) : undefined}
          oilFieldName={
            selectedFieldId
              ? (() => {
                  const field = oilFields.find((item) => item.id === selectedFieldId);
                  const displayName = field?.shortName || field?.name;
                  return displayName ? translateData(displayName) : undefined;
                })()
              : undefined
          }
        />
      </div>
      <aside className={`field-scheme-sidebar${isSchemesCollapsed ? " collapsed" : ""}`}>
        <div className="sidebar-card sidebar-header">
          <button
            type="button"
            className="panel-toggle"
            onClick={() => setIsSchemesCollapsed((prev) => !prev)}
          >
            {isSchemesCollapsed ? <LayoutList className="h-4 w-4" /> : `▾ ${t("fieldSchemeListTitle")}`}
          </button>
        </div>
        {!isSchemesCollapsed && (
          <>
            <div className="sidebar-card">
              <h3>{t("fieldSchemeSelectOilFieldLabel")}</h3>
              <select
                value={selectedFieldId}
                onChange={(event) =>
                  setSelectedFieldId(event.target.value ? Number(event.target.value) : "")
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
                onClick={async () => {
                  if (!selectedFieldId) return;
                  if (editorRef.current?.isDirty()) {
                    const shouldSave = window.confirm(t("fieldSchemeSaveCurrentPrompt"));
                    if (shouldSave) {
                      await editorRef.current.save();
                    }
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
                  if (requestedName && requestedName.trim() && requestedName.trim() !== created.name) {
                    try {
                      const updated = await fieldSchemeApi.updateScheme(created.id, {
                        name: requestedName.trim(),
                      });
                      setSchemeName(updated.name ?? requestedName.trim());
                    } catch (error) {
                      toast({ title: t("fieldSchemeRenameFailed"), description: String(error) });
                    }
                  }
                  await refreshSchemes();
                  navigate(`/field-schemes/${created.id}/editor`);
                }}
              >
                {t("fieldSchemeCreateNew")}
              </Button>
              {!selectedFieldId && (
                <div className="text-muted-foreground mt-2" style={{ fontSize: "12px" }}>
                  {t("fieldSchemeCreateNeedsOilField")}
                </div>
              )}
              {id && (
                <div className="mt-4 space-y-2">
                  <div className="text-muted-foreground" style={{ fontSize: "12px" }}>
                    {t("fieldSchemeRenameTitle")}
                  </div>
                  <Input
                    value={schemeName}
                    onChange={(event) => setSchemeName(event.target.value)}
                    onFocus={() => setIsRenaming(true)}
                    onBlur={() => setIsRenaming(false)}
                    placeholder={t("fieldSchemeRenamePlaceholder")}
                    onKeyDown={async (event) => {
                      if (event.key !== "Enter") return;
                      if (!id) return;
                      const trimmed = schemeName.trim();
                      if (!trimmed || trimmed === currentScheme?.name) return;
                      try {
                        const updated = await fieldSchemeApi.updateScheme(id, { name: trimmed });
                        setSchemeName(updated.name ?? trimmed);
                        refreshSchemes();
                        toast({ title: t("fieldSchemeRenameSaved") });
                      } catch (error) {
                        toast({ title: t("fieldSchemeRenameFailed"), description: String(error) });
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full sidebar-btn"
                    onClick={async () => {
                      if (!id) return;
                      const trimmed = schemeName.trim();
                      if (!trimmed) return;
                      try {
                        const updated = await fieldSchemeApi.updateScheme(id, { name: trimmed });
                        setSchemeName(updated.name ?? trimmed);
                        refreshSchemes();
                        toast({ title: t("fieldSchemeRenameSaved") });
                      } catch (error) {
                        toast({ title: t("fieldSchemeRenameFailed"), description: String(error) });
                      }
                    }}
                    disabled={!schemeName.trim() || schemeName.trim() === currentScheme?.name}
                  >
                    {t("fieldSchemeRenameSave")}
                  </Button>
                </div>
              )}
            </div>
            <div className="sidebar-card">
              <h3>{t("fieldSchemeListTitle")}</h3>
              {oilFields.map((field) => {
                const list = schemesByField.get(field.id) ?? [];
                if (list.length === 0) return null;
                return (
                  <div key={field.id} className="scheme-group">
                    <button
                      type="button"
                      className="scheme-group-toggle"
                      onClick={() =>
                        setCollapsedSchemeGroups((prev) => ({
                          ...prev,
                          [String(field.id)]: !prev[String(field.id)],
                        }))
                      }
                    >
                      <span>
                        {field.shortName
                          ? `${translateData(field.shortName)} — ${translateData(field.name)}`
                          : translateData(field.name)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {collapsedSchemeGroups[String(field.id)] ? "▸" : "▾"}
                      </span>
                    </button>
                    {!collapsedSchemeGroups[String(field.id)] &&
                      list.map((scheme) => (
                        <button
                          key={scheme.id}
                          type="button"
                          className={`scheme-link ${scheme.id === id ? "active" : ""}`}
                          onClick={() => navigate(`/field-schemes/${scheme.id}/editor`)}
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
                      setCollapsedSchemeGroups((prev) => ({
                        ...prev,
                        none: !prev.none,
                      }))
                    }
                  >
                    <span>{t("fieldSchemeListNone")}</span>
                    <span className="text-xs text-muted-foreground">
                      {collapsedSchemeGroups.none ? "▸" : "▾"}
                    </span>
                  </button>
                  {!collapsedSchemeGroups.none &&
                    (schemesByField.get("none") ?? []).map((scheme) => (
                      <button
                        key={scheme.id}
                        type="button"
                        className={`scheme-link ${scheme.id === id ? "active" : ""}`}
                        onClick={() => navigate(`/field-schemes/${scheme.id}/editor`)}
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
