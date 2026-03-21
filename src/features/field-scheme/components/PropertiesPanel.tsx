import { useState } from "react";
import type { Node } from "reactflow";
import { useLanguage } from "@/hooks/useLanguage";

interface PropertiesPanelProps {
  node: Node;
  onUpdate: (updates: Partial<Node["data"]>) => void;
}

export function PropertiesPanel({ node, onUpdate }: PropertiesPanelProps) {
  const { t } = useLanguage();
  const properties = node.data.properties || {};
  const typeCode = node.data.objectType?.code ?? node.data.typeCode;
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    base: true,
    location: true,
    sap: true,
    production: true,
    reservoir: true,
    extra: true,
  });

  const handlePropertyChange = (key: string, value: number | string | boolean) => {
    onUpdate({
      properties: {
        ...properties,
        [key]: value,
      },
    });
  };

  const reservedKeys = new Set([
    "oil_field",
    "sap_asset_code",
    "sap_tech_place",
    "sap_pm_status",
    "location",
    "latitude",
    "longitude",
    "debit_oil",
    "debit_water",
    "debit_gas",
    "capacity",
    "pressure",
    "temperature",
    "flow_rate",
    "reservoir_name",
    "porosity",
    "permeability",
    "reservoir_pressure",
    "reservoir_temperature",
    "recovery_factor",
    "reserves_geological",
    "reserves_recoverable",
    "reserves_remaining",
  ]);

  const extraEntries = Object.entries(properties).filter(([key]) => !reservedKeys.has(key));

  return (
    <div className="properties-panel">
      <h3>{t("fieldSchemePropertiesTitle")}</h3>
      <div className="properties-group">
        <button
          type="button"
          className="properties-group-toggle"
          onClick={() => setCollapsed((prev) => ({ ...prev, base: !prev.base }))}
        >
          <span>{t("fieldSchemeGroupBase")}</span>
          <span>{collapsed.base ? "▸" : "▾"}</span>
        </button>
        {!collapsed.base && (
          <>
            <div className="property-group">
              <label>{t("fieldSchemeCode")}</label>
              <input
                type="text"
                value={node.data.label}
                onChange={(e) => onUpdate({ label: e.target.value })}
              />
            </div>
            <div className="property-group">
              <label>{t("fieldSchemeOilField")}</label>
              <input
                type="text"
                value={properties.oil_field ?? ""}
                onChange={(e) => handlePropertyChange("oil_field", e.target.value)}
                placeholder={t("fieldSchemePlaceholderOilField")}
              />
            </div>
          </>
        )}
      </div>

      <div className="properties-group">
        <button
          type="button"
          className="properties-group-toggle"
          onClick={() => setCollapsed((prev) => ({ ...prev, location: !prev.location }))}
        >
          <span>{t("fieldSchemeGroupLocation")}</span>
          <span>{collapsed.location ? "▸" : "▾"}</span>
        </button>
        {!collapsed.location && (
          <>
            <div className="property-group">
              <label>{t("fieldSchemeLocation")}</label>
              <input
                type="text"
                value={properties.location ?? ""}
                onChange={(e) => handlePropertyChange("location", e.target.value)}
                placeholder={t("fieldSchemePlaceholderLocation")}
              />
            </div>
            <div className="property-group">
              <label>{t("fieldSchemeLatitude")}</label>
              <input
                type="number"
                value={properties.latitude ?? 0}
                onChange={(e) => handlePropertyChange("latitude", Number(e.target.value) || 0)}
              />
            </div>
            <div className="property-group">
              <label>{t("fieldSchemeLongitude")}</label>
              <input
                type="number"
                value={properties.longitude ?? 0}
                onChange={(e) => handlePropertyChange("longitude", Number(e.target.value) || 0)}
              />
            </div>
          </>
        )}
      </div>

      <div className="properties-group">
        <button
          type="button"
          className="properties-group-toggle"
          onClick={() => setCollapsed((prev) => ({ ...prev, sap: !prev.sap }))}
        >
          <span>{t("fieldSchemeGroupSap")}</span>
          <span>{collapsed.sap ? "▸" : "▾"}</span>
        </button>
        {!collapsed.sap && (
          <>
            <div className="property-group">
              <label>{t("fieldSchemeSapAssetCode")}</label>
              <input
                type="text"
                value={properties.sap_asset_code ?? ""}
                onChange={(e) => handlePropertyChange("sap_asset_code", e.target.value)}
              />
            </div>
            <div className="property-group">
              <label>{t("fieldSchemeSapTechPlace")}</label>
              <input
                type="text"
                value={properties.sap_tech_place ?? ""}
                onChange={(e) => handlePropertyChange("sap_tech_place", e.target.value)}
              />
            </div>
            <div className="property-group">
              <label>{t("fieldSchemeSapPmStatus")}</label>
              <select
                value={properties.sap_pm_status ?? "в работе"}
                onChange={(e) => handlePropertyChange("sap_pm_status", e.target.value)}
              >
                <option value="в работе">{t("fieldSchemeSapStatusWorking")}</option>
                <option value="в ремонте">{t("fieldSchemeSapStatusRepair")}</option>
                <option value="планируется">{t("fieldSchemeSapStatusPlanned")}</option>
                <option value="отказ">{t("fieldSchemeSapStatusFailure")}</option>
                <option value="остановлен">{t("fieldSchemeSapStatusStopped")}</option>
              </select>
            </div>
          </>
        )}
      </div>

      <div className="properties-group">
        <button
          type="button"
          className="properties-group-toggle"
          onClick={() => setCollapsed((prev) => ({ ...prev, production: !prev.production }))}
        >
          <span>{t("fieldSchemeGroupProduction")}</span>
          <span>{collapsed.production ? "▸" : "▾"}</span>
        </button>
        {!collapsed.production && (
          <>
            {typeCode === "production_well" && (
              <>
                <div className="property-group">
                  <label>{t("fieldSchemeProductionDebitOil")}</label>
                  <input
                    type="number"
                    value={properties.debit_oil ?? 0}
                    onChange={(e) => handlePropertyChange("debit_oil", Number(e.target.value) || 0)}
                  />
                </div>
                <div className="property-group">
                  <label>{t("fieldSchemeProductionDebitWater")}</label>
                  <input
                    type="number"
                    value={properties.debit_water ?? 0}
                    onChange={(e) => handlePropertyChange("debit_water", Number(e.target.value) || 0)}
                  />
                </div>
                <div className="property-group">
                  <label>{t("fieldSchemeProductionDebitGas")}</label>
                  <input
                    type="number"
                    value={properties.debit_gas ?? 0}
                    onChange={(e) => handlePropertyChange("debit_gas", Number(e.target.value) || 0)}
                  />
                </div>
              </>
            )}
            {typeCode !== "production_well" && (
              <>
                <div className="property-group">
                  <label>{t("fieldSchemeCapacity")}</label>
                  <input
                    type="number"
                    value={properties.capacity ?? 0}
                    onChange={(e) => handlePropertyChange("capacity", Number(e.target.value) || 0)}
                  />
                </div>
                <div className="property-group">
                  <label>{t("fieldSchemePressure")}</label>
                  <input
                    type="number"
                    value={properties.pressure ?? 0}
                    onChange={(e) => handlePropertyChange("pressure", Number(e.target.value) || 0)}
                  />
                </div>
                <div className="property-group">
                  <label>{t("fieldSchemeTemperature")}</label>
                  <input
                    type="number"
                    value={properties.temperature ?? 0}
                    onChange={(e) => handlePropertyChange("temperature", Number(e.target.value) || 0)}
                  />
                </div>
                <div className="property-group">
                  <label>{t("fieldSchemeFlowRate")}</label>
                  <input
                    type="number"
                    value={properties.flow_rate ?? 0}
                    onChange={(e) => handlePropertyChange("flow_rate", Number(e.target.value) || 0)}
                  />
                </div>
              </>
            )}
          </>
        )}
      </div>

      <div className="properties-group">
        <button
          type="button"
          className="properties-group-toggle"
          onClick={() => setCollapsed((prev) => ({ ...prev, reservoir: !prev.reservoir }))}
        >
          <span>{t("fieldSchemeGroupReservoir")}</span>
          <span>{collapsed.reservoir ? "▸" : "▾"}</span>
        </button>
        {!collapsed.reservoir && (
          <>
            <div className="property-group">
              <label>{t("fieldSchemeReservoirName")}</label>
              <input
                type="text"
                value={properties.reservoir_name ?? ""}
                onChange={(e) => handlePropertyChange("reservoir_name", e.target.value)}
              />
            </div>
            <div className="property-group">
              <label>{t("fieldSchemePorosity")}</label>
              <input
                type="number"
                value={properties.porosity ?? 0}
                onChange={(e) => handlePropertyChange("porosity", Number(e.target.value) || 0)}
              />
            </div>
            <div className="property-group">
              <label>{t("fieldSchemePermeability")}</label>
              <input
                type="number"
                value={properties.permeability ?? 0}
                onChange={(e) => handlePropertyChange("permeability", Number(e.target.value) || 0)}
              />
            </div>
            <div className="property-group">
              <label>{t("fieldSchemeReservoirPressure")}</label>
              <input
                type="number"
                value={properties.reservoir_pressure ?? 0}
                onChange={(e) => handlePropertyChange("reservoir_pressure", Number(e.target.value) || 0)}
              />
            </div>
            <div className="property-group">
              <label>{t("fieldSchemeReservoirTemperature")}</label>
              <input
                type="number"
                value={properties.reservoir_temperature ?? 0}
                onChange={(e) => handlePropertyChange("reservoir_temperature", Number(e.target.value) || 0)}
              />
            </div>
            <div className="property-group">
              <label>{t("fieldSchemeRecoveryFactor")}</label>
              <input
                type="number"
                value={properties.recovery_factor ?? 0}
                onChange={(e) => handlePropertyChange("recovery_factor", Number(e.target.value) || 0)}
              />
            </div>
            <div className="property-group">
              <label>{t("fieldSchemeReservesGeological")}</label>
              <input
                type="number"
                value={properties.reserves_geological ?? 0}
                onChange={(e) => handlePropertyChange("reserves_geological", Number(e.target.value) || 0)}
              />
            </div>
            <div className="property-group">
              <label>{t("fieldSchemeReservesRecoverable")}</label>
              <input
                type="number"
                value={properties.reserves_recoverable ?? 0}
                onChange={(e) => handlePropertyChange("reserves_recoverable", Number(e.target.value) || 0)}
              />
            </div>
            <div className="property-group">
              <label>{t("fieldSchemeReservesRemaining")}</label>
              <input
                type="number"
                value={properties.reserves_remaining ?? 0}
                onChange={(e) => handlePropertyChange("reserves_remaining", Number(e.target.value) || 0)}
              />
            </div>
          </>
        )}
      </div>

      {extraEntries.length > 0 && (
        <div className="properties-group">
          <button
            type="button"
            className="properties-group-toggle"
            onClick={() => setCollapsed((prev) => ({ ...prev, extra: !prev.extra }))}
          >
            <span>{t("fieldSchemeGroupExtra")}</span>
            <span>{collapsed.extra ? "▸" : "▾"}</span>
          </button>
          {!collapsed.extra && (
            <div className="space-y-2">
              {extraEntries.map(([key, value]) => {
                const inputType =
                  typeof value === "number" ? "number" : typeof value === "boolean" ? "checkbox" : "text";
                if (inputType === "checkbox") {
                  return (
                    <label key={key} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={Boolean(value)}
                        onChange={(e) => handlePropertyChange(key, e.target.checked)}
                      />
                      <span>{key}</span>
                    </label>
                  );
                }
                return (
                  <div key={key} className="property-group">
                    <label>{key}</label>
                    <input
                      type={inputType}
                      value={value ?? ""}
                      onChange={(e) =>
                        handlePropertyChange(
                          key,
                          inputType === "number" ? Number(e.target.value) || 0 : e.target.value
                        )
                      }
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
