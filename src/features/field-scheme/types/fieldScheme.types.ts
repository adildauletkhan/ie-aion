export interface FieldObjectType {
  id: string;
  code: string;
  name: string;
  category?: string | null;
  iconName?: string | null;
  color?: string | null;
  defaultProperties?: Record<string, unknown> | null;
}

export interface FieldScheme {
  id: string;
  oilFieldId?: number | null;
  name: string;
  description?: string | null;
  isActive: boolean;
  isBaseline: boolean;
  canvasWidth: number;
  canvasHeight: number;
  zoomLevel: number;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface SchemeObject {
  id: string;
  schemeId: string;
  objectTypeId: string;
  objectCode: string;
  objectName?: string | null;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  properties: Record<string, unknown>;
  color?: string | null;
  rotation: number;
  linkedAssetType?: string | null;
  linkedAssetId?: number | null;
  notes?: string | null;
  objectType: FieldObjectType;
}

export interface SchemeConnection {
  id: string;
  schemeId: string;
  sourceObjectId: string;
  targetObjectId: string;
  connectionType: string;
  flowProperties: Record<string, unknown>;
  color?: string | null;
  lineStyle: string;
  lineWidth: number;
  animated: boolean;
  pathPoints?: Array<{ x: number; y: number }> | null;
}

export interface FieldSchemeFullResponse {
  scheme: FieldScheme;
  objects: SchemeObject[];
  connections: SchemeConnection[];
}
