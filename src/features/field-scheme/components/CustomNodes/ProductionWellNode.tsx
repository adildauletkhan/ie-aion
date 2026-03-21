import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { useLanguage } from "@/hooks/useLanguage";

export const ProductionWellNode = memo(({ data, selected }: NodeProps) => {
  const { t } = useLanguage();
  const debitOil = data.properties?.debit_oil ?? 0;
  const debitWater = data.properties?.debit_water ?? 0;
  const status = data.properties?.status ?? "active";

  return (
    <div className={`custom-node production-well ${selected ? "selected" : ""} status-${status}`}>
      <Handle type="target" position={Position.Top} style={{ background: "#555" }} />
      <div className="node-header">
        <div className="node-icon">🛢️</div>
        <div className="node-label">{data.label}</div>
      </div>
      <div className="node-body">
        <div className="metric">
          <span className="metric-label">{t("fieldSchemeOil")}:</span>
          <span className="metric-value">
            {debitOil} {t("fieldSchemeAiUnitsTonsPerDay")}
          </span>
        </div>
        <div className="metric">
          <span className="metric-label">{t("fieldSchemeWater")}:</span>
          <span className="metric-value">
            {debitWater} {t("fieldSchemeAiUnitsTonsPerDay")}
          </span>
        </div>
      </div>
      <div className={`node-status status-${status}`}>
        {status === "active" ? t("fieldSchemeStatusActive") : status}
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: "#555" }} />
    </div>
  );
});

ProductionWellNode.displayName = "ProductionWellNode";
