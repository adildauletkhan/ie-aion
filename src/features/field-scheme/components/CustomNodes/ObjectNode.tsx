import { memo, useMemo, useState } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { ObjectIcon } from "../../utils/ObjectIcon";
import { useLanguage } from "@/hooks/useLanguage";

const keyLabelMap: Record<string, string> = {
  debit_oil: "fieldSchemeProductionDebitOil",
  debit_water: "fieldSchemeProductionDebitWater",
  debit_gas: "fieldSchemeProductionDebitGas",
  capacity: "fieldSchemeCapacity",
  pressure: "fieldSchemePressure",
  temperature: "fieldSchemeTemperature",
  flow_rate: "fieldSchemeFlowRate",
  inputs_count: "fieldSchemeInputsCount",
  diameter_mm: "fieldSchemeDiameterMm",
  length_km: "fieldSchemeLengthKm",
  pressure_atm: "fieldSchemePressureAtm",
  volume: "fieldSchemeVolume",
  current_level: "fieldSchemeCurrentLevel",
  sap_pm_status: "fieldSchemeSapPmStatus",
  reservoir_name: "fieldSchemeReservoirName",
  porosity: "fieldSchemePorosity",
  permeability: "fieldSchemePermeability",
  reservoir_pressure: "fieldSchemeReservoirPressure",
  reservoir_temperature: "fieldSchemeReservoirTemperature",
  recovery_factor: "fieldSchemeRecoveryFactor",
  reserves_geological: "fieldSchemeReservesGeological",
  reserves_recoverable: "fieldSchemeReservesRecoverable",
  reserves_remaining: "fieldSchemeReservesRemaining",
};

function formatKey(key: string, t: (value: string) => string): string {
  return keyLabelMap[key] ? t(keyLabelMap[key]) : key.replace(/_/g, " ").replace(/\b\w/g, (s) => s.toUpperCase());
}

function formatValue(value: unknown, t: (value: string) => string): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "number") return `${value}`;
  if (typeof value === "boolean") return value ? t("fieldSchemeYes") : t("fieldSchemeNo");
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

export const ObjectNode = memo(({ data, selected }: NodeProps) => {
  const [open, setOpen] = useState(false);
  const { t, translateData } = useLanguage();
  const properties = data.properties ?? {};
  const iconCode = data.objectType?.code ?? data.typeCode;

  const previewMetrics = useMemo(() => {
    const entries = Object.entries(properties);
    return entries.slice(0, 2);
  }, [properties]);

  const objectTypeName = data.objectType?.name ? translateData(data.objectType.name) : "";
  const displayLabel = data.label ? translateData(data.label) : "";
  const nodeTitle = `${objectTypeName || t("fieldSchemeObjectLabel")}${displayLabel ? `: ${displayLabel}` : ""}`;

  return (
    <div className={`custom-node object-node ${selected ? "selected" : ""}`} title={nodeTitle}>
      <Handle type="target" position={Position.Top} style={{ background: "#555" }} />
      <div className="node-header">
        <button
          className="node-icon-button"
          onClick={(event) => {
            event.stopPropagation();
            setOpen((prev) => !prev);
          }}
          aria-label={t("fieldSchemeNodeParamsTitle")}
          title={t("fieldSchemeObjectPassport")}
        >
          <ObjectIcon code={iconCode} />
        </button>
        <div className="node-label">
          {displayLabel || objectTypeName || t("fieldSchemeObjectLabel")}
        </div>
      </div>
      <div className="node-body">
        {previewMetrics.length === 0 && <div className="metric">{t("fieldSchemeNoMetrics")}</div>}
        {previewMetrics.map(([key, value]) => (
          <div className="metric" key={key}>
            <span className="metric-label">{formatKey(key, t)}:</span>
            <span className="metric-value">{formatValue(value, t)}</span>
          </div>
        ))}
      </div>
      {open && (
        <div className="node-popover" onClick={(event) => event.stopPropagation()}>
          <div className="node-popover-title">
            {objectTypeName || t("fieldSchemeNodeParamsTitle")}
          </div>
          <div className="node-popover-subtitle">{displayLabel}</div>
          <div className="node-popover-body">
            {Object.keys(properties).length === 0 && (
              <div className="text-xs text-muted-foreground">{t("fieldSchemeNoData")}</div>
            )}
            {Object.entries(properties).map(([key, value]) => (
              <div className="popover-row" key={key}>
                <span>{formatKey(key, t)}</span>
                <span>{formatValue(value, t)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <Handle type="source" position={Position.Bottom} style={{ background: "#555" }} />
    </div>
  );
});

ObjectNode.displayName = "ObjectNode";
