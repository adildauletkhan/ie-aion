import { useEffect, useMemo, useState } from "react";
import type { FieldObjectType } from "../types/fieldScheme.types";
import { ObjectIcon } from "../utils/ObjectIcon";
import { useLanguage } from "@/hooks/useLanguage";

interface ObjectToolboxProps {
  types: FieldObjectType[];
}

const categoryLabels: Record<string, string> = {
  well: "fieldSchemeCategoryWell",
  equipment: "fieldSchemeCategoryEquipment",
  storage: "fieldSchemeCategoryStorage",
  infrastructure: "fieldSchemeCategoryInfrastructure",
  pipelines: "fieldSchemeCategoryPipelines",
  valves: "fieldSchemeCategoryValves",
  nodes: "fieldSchemeCategoryNodes",
  water_preparation: "fieldSchemeCategoryWaterPreparation",
  gas_preparation: "fieldSchemeCategoryGasPreparation",
  prep_objects: "fieldSchemeCategoryPrepObjects",
  ppd_system: "fieldSchemeCategoryPpdSystem",
  circulation: "fieldSchemeCategoryCirculation",
  power_supply: "fieldSchemeCategoryPowerSupply",
  heat_supply: "fieldSchemeCategoryHeatSupply",
  oil_heating: "fieldSchemeCategoryOilHeating",
  metering: "fieldSchemeCategoryMetering",
  telemetry: "fieldSchemeCategoryTelemetry",
  ecology: "fieldSchemeCategoryEcology",
  safety: "fieldSchemeCategorySafety",
  transport: "fieldSchemeCategoryTransport",
};

const categoryToSystem: Record<string, string> = {
  well: "production",
  equipment: "production",
  storage: "production",
  pipelines: "production",
  valves: "production",
  nodes: "production",
  water_preparation: "preparation",
  gas_preparation: "preparation",
  prep_objects: "preparation",
  ppd_system: "ppd",
  circulation: "ppd",
  power_supply: "infrastructure",
  heat_supply: "infrastructure",
  oil_heating: "infrastructure",
  metering: "infrastructure",
  telemetry: "infrastructure",
  ecology: "ecology_safety",
  safety: "ecology_safety",
  transport: "transport",
  infrastructure: "infrastructure",
  other: "other",
};

const systemLabels: Record<string, string> = {
  production: "fieldSchemeSystemProduction",
  preparation: "fieldSchemeSystemPreparation",
  ppd: "fieldSchemeSystemPpd",
  infrastructure: "fieldSchemeSystemInfrastructure",
  ecology_safety: "fieldSchemeSystemEcologySafety",
  transport: "fieldSchemeSystemTransport",
  other: "fieldSchemeSystemOther",
};

export function ObjectToolbox({ types }: ObjectToolboxProps) {
  const { t, translateData } = useLanguage();
  const [query, setQuery] = useState("");
  const grouped = useMemo(() => {
    const hiddenCodes = new Set(["heat_exchange_unit", "flare_utilization"]);
    return types
      .filter((item) => !hiddenCodes.has(item.code))
      .reduce<Record<string, FieldObjectType[]>>((acc, item) => {
        const key = item.category ?? "other";
        acc[key] = acc[key] ? [...acc[key], item] : [item];
        return acc;
      }, {});
  }, [types]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [systemCollapsed, setSystemCollapsed] = useState<Record<string, boolean>>({});

  const orderedGroups = useMemo(() => {
    const order = [
      "well",
      "pipelines",
      "valves",
      "nodes",
      "equipment",
      "storage",
      "water_preparation",
      "gas_preparation",
      "prep_objects",
      "ppd_system",
      "circulation",
      "power_supply",
      "heat_supply",
      "oil_heating",
      "metering",
      "telemetry",
      "ecology",
      "safety",
      "transport",
      "infrastructure",
      "other",
    ];
    const keys = Object.keys(grouped);
    return order
      .filter((key) => keys.includes(key))
      .concat(keys.filter((key) => !order.includes(key)));
  }, [grouped]);

  const filteredGrouped = useMemo(() => {
    if (!query.trim()) return grouped;
    const q = query.toLowerCase();
    const next: Record<string, FieldObjectType[]> = {};
    for (const [category, items] of Object.entries(grouped)) {
      const filtered = items.filter((item) => item.name.toLowerCase().includes(q) || item.code.includes(q));
      if (filtered.length > 0) {
        next[category] = filtered;
      }
    }
    return next;
  }, [grouped, query]);

  const filteredGroups = useMemo(
    () => orderedGroups.filter((key) => (filteredGrouped[key] ?? []).length > 0),
    [filteredGrouped, orderedGroups]
  );

  const systemGroups = useMemo(() => {
    const result = new Map<string, string[]>();
    for (const category of filteredGroups) {
      const system = categoryToSystem[category] ?? "other";
      result.set(system, [...(result.get(system) ?? []), category]);
    }
    return result;
  }, [filteredGroups]);

  useEffect(() => {
    setCollapsed((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(grouped)) {
        if (!(key in next)) {
          next[key] = true;
        }
      }
      return next;
    });
  }, [grouped]);

  useEffect(() => {
    setSystemCollapsed((prev) => {
      const next = { ...prev };
      for (const key of systemGroups.keys()) {
        if (!(key in next)) {
          next[key] = true;
        }
      }
      return next;
    });
  }, [systemGroups]);

  /* При наличии поискового запроса и совпадений — раскрыть все группы с результатами */
  useEffect(() => {
    if (!query.trim() || filteredGroups.length === 0) return;
    setSystemCollapsed((prev) => {
      const next = { ...prev };
      for (const systemKey of systemGroups.keys()) {
        next[systemKey] = false;
      }
      return next;
    });
    setCollapsed((prev) => {
      const next = { ...prev };
      for (const category of filteredGroups) {
        next[category] = false;
      }
      return next;
    });
  }, [query, filteredGroups, systemGroups]);

  const onDragStart = (event: React.DragEvent, typeCode: string) => {
    event.dataTransfer.setData("application/reactflow", typeCode);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <div className="object-toolbox">
      <input
        className="toolbox-search"
        placeholder={t("fieldSchemeSearchPlaceholder")}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      {types.length === 0 && (
        <div className="text-xs text-muted-foreground">
          {t("fieldSchemeNoTypes")}
        </div>
      )}
      {[...systemGroups.entries()].map(([systemKey, categories]) => {
        const isSystemCollapsed = systemCollapsed[systemKey] ?? true;
        return (
          <div key={systemKey} className="toolbox-system">
            <button
              type="button"
              className="toolbox-system-toggle"
              onClick={() =>
                setSystemCollapsed((prev) => ({
                  ...prev,
                  [systemKey]: !(prev[systemKey] ?? true),
                }))
              }
            >
              <span>{t(systemLabels[systemKey] ?? systemKey)}</span>
              <span className="text-xs text-muted-foreground">{isSystemCollapsed ? "▸" : "▾"}</span>
            </button>
            {!isSystemCollapsed &&
              categories.map((category) => {
                const items = filteredGrouped[category] ?? [];
                const isCollapsed = collapsed[category] ?? false;
                return (
                  <div key={category} className="toolbox-category">
                    <button
                      type="button"
                      className="toolbox-category-toggle"
                      onClick={() =>
                        setCollapsed((prev) => ({ ...prev, [category]: !(prev[category] ?? false) }))
                      }
                    >
                      <span>{t(categoryLabels[category] ?? category)}</span>
                      <span className="text-xs text-muted-foreground">
                        ({items.length}) {isCollapsed ? "▸" : "▾"}
                      </span>
                    </button>
                    {!isCollapsed &&
                      items.map((type) => (
                        <div
                          key={type.code}
                          className="toolbox-item"
                          draggable
                          onDragStart={(e) => onDragStart(e, type.code)}
                          style={{ borderLeftColor: type.color ?? "#94a3b8" }}
                        >
                          <div className="item-icon">
                            <ObjectIcon code={type.code} />
                          </div>
                          <span>{translateData(type.name)}</span>
                        </div>
                      ))}
                  </div>
                );
              })}
          </div>
        );
      })}
    </div>
  );
}
