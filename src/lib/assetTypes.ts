/**
 * Типы активов, общие для основных данных (мастер-данные) и кризисных событий.
 * По типу актива загружаются названия активов для выбора в регистрации события.
 */
export const CRISIS_ASSET_TYPES = [
  { value: "processing_plant", apiKey: "processing-plants", labelKey: "assetTypeProcessingPlant" },
  { value: "transportation_section", apiKey: "transportation-sections", labelKey: "assetTypeTransportationSection" },
  { value: "oil_field", apiKey: "oil-fields", labelKey: "assetTypeOilField" },
  { value: "export_destination", apiKey: "export-destinations", labelKey: "assetTypeExportDestination" },
  { value: "extraction_company", apiKey: "extraction-companies", labelKey: "assetTypeExtractionCompany" },
] as const;

export type CrisisAssetTypeValue = (typeof CRISIS_ASSET_TYPES)[number]["value"];
export type MasterDataAssetKey = (typeof CRISIS_ASSET_TYPES)[number]["apiKey"];

export const crisisAssetTypeToApiKey: Record<string, string> = Object.fromEntries(
  CRISIS_ASSET_TYPES.map((t) => [t.value, t.apiKey])
);

export function getMasterDataKeyByAssetType(assetType: string): string {
  return crisisAssetTypeToApiKey[assetType] ?? "processing-plants";
}
