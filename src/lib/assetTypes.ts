/**
 * Типы активов, общие для основных данных (мастер-данные) и кризисных событий.
 * По типу актива загружаются названия активов для выбора в регистрации события.
 */

/* ── Oil & Gas (upstream) ──────────────────────────────────────── */
export const CRISIS_ASSET_TYPES_UPSTREAM = [
  { value: "processing_plant", apiKey: "processing-plants", labelKey: "assetTypeProcessingPlant" },
  { value: "transportation_section", apiKey: "transportation-sections", labelKey: "assetTypeTransportationSection" },
  { value: "oil_field", apiKey: "oil-fields", labelKey: "assetTypeOilField" },
  { value: "export_destination", apiKey: "export-destinations", labelKey: "assetTypeExportDestination" },
  { value: "extraction_company", apiKey: "extraction-companies", labelKey: "assetTypeExtractionCompany" },
] as const;

/* ── Energy / KEGOC ────────────────────────────────────────────── */
export const CRISIS_ASSET_TYPES_ENERGY = [
  { value: "power_plant",     apiKey: "extraction-companies",      labelKey: "assetTypePowerPlant"     },
  { value: "substation_500",  apiKey: "processing-plants",         labelKey: "assetTypeSubstation500"  },
  { value: "transmission_line", apiKey: "transportation-sections", labelKey: "assetTypeTransmissionLine" },
  { value: "distribution_zone", apiKey: "export-destinations",     labelKey: "assetTypeDistributionZone" },
] as const;

export const CRISIS_ASSET_TYPES = CRISIS_ASSET_TYPES_UPSTREAM;

export type CrisisAssetTypeValue = (typeof CRISIS_ASSET_TYPES_UPSTREAM)[number]["value"] | (typeof CRISIS_ASSET_TYPES_ENERGY)[number]["value"];
export type MasterDataAssetKey = (typeof CRISIS_ASSET_TYPES_UPSTREAM)[number]["apiKey"];

export const crisisAssetTypeToApiKey: Record<string, string> = Object.fromEntries(
  [...CRISIS_ASSET_TYPES_UPSTREAM, ...CRISIS_ASSET_TYPES_ENERGY].map((t) => [t.value, t.apiKey])
);

export function getMasterDataKeyByAssetType(assetType: string): string {
  return crisisAssetTypeToApiKey[assetType] ?? "processing-plants";
}
