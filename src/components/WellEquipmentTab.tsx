import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { getAuthHeader } from "@/lib/auth";
import { WellEquipment3DViewer, type WellPumpType } from "./WellEquipment3DViewer";
import { WellSchemeEditor } from "@/features/well-scheme";
import { WellRightPanel } from "@/features/well-scheme/components/WellRightPanel";
import { WellVRViewer } from "./WellVRViewer";
import { useLanguage } from "@/hooks/useLanguage";
import { Glasses } from "lucide-react";

interface SchemeObject {
  id: string;
  objectCode: string;
  objectName?: string | null;
  positionX: number;
  positionY: number;
  objectType: {
    code: string;
    name: string;
  };
}

interface FieldScheme {
  id: string;
  name: string;
}

interface WellRow {
  id: number;
  name: string;
  wellType: string;
  status: string;
  formationName?: string | null;
}

interface Props {
  fieldId: string;
  fieldName: string;
}

export function WellEquipmentTab({ fieldId, fieldName }: Props) {
  const { t } = useLanguage();
  const [schemes, setSchemes] = useState<FieldScheme[]>([]);
  const [wells, setWells] = useState<SchemeObject[]>([]);
  const [directWells, setDirectWells] = useState<WellRow[]>([]);
  const [selectedWellId, setSelectedWellId] = useState("");
  const [selectedPumpType, setSelectedPumpType] = useState<WellPumpType>("sgn");
  const [appliedWellId, setAppliedWellId] = useState("");
  const [appliedPumpType, setAppliedPumpType] = useState<WellPumpType>("sgn");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [vrOpen, setVrOpen] = useState(false);

  /* ── load schemes + direct wells when field changes ── */
  useEffect(() => {
    if (!fieldId) return;
    setWells([]);
    setDirectWells([]);
    setSelectedWellId("");
    setAppliedWellId("");

    const authHeader = getAuthHeader();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(authHeader ? { Authorization: authHeader } : {}),
    };

    // Load field schemes
    fetch(`/api/field-schemes?oil_field_id=${fieldId}`, { headers })
      .then((res) => (res.ok ? res.json() : []))
      .then((data: FieldScheme[]) => setSchemes(data))
      .catch(() => {});

    // Also load wells directly from the wells table (fallback)
    fetch(`/api/wells?oil_field_id=${fieldId}`, { headers })
      .then((res) => (res.ok ? res.json() : []))
      .then((data: WellRow[]) => setDirectWells(data))
      .catch(() => {});
  }, [fieldId]);

  /* ── load objects from all schemes ── */
  useEffect(() => {
    if (schemes.length === 0) return;
    setLoading(true);

    const authHeader = getAuthHeader();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(authHeader ? { Authorization: authHeader } : {}),
    };

    Promise.all(
      schemes.map((s) =>
        fetch(`/api/field-schemes/${s.id}`, { headers }).then((r) =>
          r.ok ? r.json() : null
        )
      )
    )
      .then((results) => {
        const wellCodes = new Set(["production_well", "injection_well", "well"]);
        const collected: SchemeObject[] = [];
        for (const result of results) {
          if (!result?.objects) continue;
          for (const obj of result.objects as SchemeObject[]) {
            const code = obj.objectType?.code ?? "";
            if (wellCodes.has(code) || code.includes("well")) {
              collected.push(obj);
            }
          }
        }
        /* fallback: if no typed wells found, take all objects */
        const finalList =
          collected.length > 0 ? collected : results.flatMap((r) => r?.objects ?? []);
        setWells(finalList);
        if (finalList.length > 0) setSelectedWellId(finalList[0].id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [schemes]);

  /* ── if no scheme objects, use direct wells as synthetic SchemeObjects ── */
  const effectiveWells: SchemeObject[] = wells.length > 0
    ? wells
    : directWells.map((w) => ({
        id: String(w.id),
        objectCode: w.name,
        objectName: `Скв. ${w.name}${w.formationName ? ` (${w.formationName})` : ""}`,
        positionX: 0,
        positionY: 0,
        objectType: { code: w.wellType ?? "well", name: w.wellType ?? "well" },
      }));

  // auto-select first when direct wells load and nothing selected yet
  useEffect(() => {
    if (effectiveWells.length > 0 && !selectedWellId) {
      setSelectedWellId(effectiveWells[0].id);
    }
  }, [effectiveWells.length]);

  const handleApply = () => {
    setAppliedWellId(selectedWellId);
    setAppliedPumpType(selectedPumpType);
  };

  const appliedWell = effectiveWells.find((w) => w.id === appliedWellId);

  return (
    <div className="space-y-5">
      {/* ── selection panel ── */}
      <div className="rounded-lg border bg-muted/20 p-4 space-y-4">
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {t("wellEquip_displayParams")}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* well */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t("wellEquip_wellObject")}</label>
            {loading ? (
              <p className="text-xs text-muted-foreground py-2">{t("wellEquip_loading")}</p>
            ) : (
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={selectedWellId}
                onChange={(e) => setSelectedWellId(e.target.value)}
                disabled={effectiveWells.length === 0}
              >
                {effectiveWells.length === 0 ? (
                  <option value="">{t("wellEquip_noObjects")}</option>
                ) : (
                  effectiveWells.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.objectName ?? w.objectCode}
                    </option>
                  ))
                )}
              </select>
            )}
          </div>

          {/* pump type */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t("wellEquip_pumpType")}</label>
            <select
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={selectedPumpType}
              onChange={(e) => setSelectedPumpType(e.target.value as WellPumpType)}
            >
              <option value="sgn">{t("wellEquip_sgn")}</option>
              <option value="ecn">{t("wellEquip_ecn")}</option>
              <option value="evn">{t("wellEquip_evn")}</option>
            </select>
          </div>

          {/* apply */}
          <div className="flex items-end gap-2">
            <Button
              onClick={handleApply}
              disabled={!selectedWellId || loading || effectiveWells.length === 0}
              className="flex-1"
            >
              {t("wellEquip_apply")}
            </Button>
            {appliedWellId && (
              <div className="flex items-center gap-2">
                <div className="flex rounded-md overflow-hidden border text-sm">
                  <button
                    type="button"
                    onClick={() => setMode("view")}
                    className={`px-3 py-1.5 ${mode === "view" ? "bg-muted font-medium" : "bg-background hover:bg-muted/50"}`}
                  >
                    {t("wellEquip_view")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("edit")}
                    className={`px-3 py-1.5 border-l ${mode === "edit" ? "bg-muted font-medium" : "bg-background hover:bg-muted/50"}`}
                  >
                    {t("wellEquip_editor")}
                  </button>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setVrOpen(true)}
                  className="gap-1.5 border-violet-500/40 text-violet-600 hover:bg-violet-500/10 hover:text-violet-600 dark:text-violet-400 dark:border-violet-400/30"
                  title="Открыть иммерсивный VR-вид ствола скважины"
                >
                  <Glasses className="h-4 w-4" />
                  VR
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* scheme info chips */}
        {schemes.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {t("wellEquip_techSchemes")} {schemes.map((s) => s.name).join(" · ")}
          </p>
        )}
      </div>

      {/* ── viewer or editor ── */}
      {appliedWellId && appliedWell ? (
        mode === "edit" ? (
          <WellSchemeEditor
            wellName={appliedWell.objectName ?? appliedWell.objectCode}
            fieldName={fieldName}
            initialPumpType={appliedPumpType}
          />
        ) : (
          <div className="flex gap-0 rounded-xl border overflow-hidden" style={{ minHeight: 640 }}>
            <div className="flex-1 min-w-0 overflow-auto">
              <WellEquipment3DViewer
                wellName={appliedWell.objectName ?? appliedWell.objectCode}
                fieldName={fieldName}
                defaultPumpType={appliedPumpType}
              />
            </div>
            <WellRightPanel
              wellName={appliedWell.objectName ?? appliedWell.objectCode}
              pumpType={appliedPumpType}
            />
          </div>
        )
      ) : (
        <div className="flex flex-col items-center justify-center h-56 rounded-xl border-2 border-dashed border-muted-foreground/25 bg-muted/10 gap-2">
          <svg
            className="w-10 h-10 text-muted-foreground/40"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5"
            />
          </svg>
          <p className="text-sm text-muted-foreground text-center px-6">
            {t("wellEquip_selectHint")}
            <br />
            <span className="text-xs opacity-60">{t("wellEquip_selectHint2")}</span>
          </p>
        </div>
      )}

      {/* ── VR Viewer ── */}
      {vrOpen && appliedWell && (
        <WellVRViewer
          wellName={appliedWell.objectName ?? appliedWell.objectCode}
          pumpType={appliedPumpType}
          onClose={() => setVrOpen(false)}
        />
      )}
    </div>
  );
}
