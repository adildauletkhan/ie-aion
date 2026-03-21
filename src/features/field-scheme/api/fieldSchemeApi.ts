import { getAuthHeader } from "@/lib/auth";
import type {
  FieldObjectType,
  FieldScheme,
  FieldSchemeFullResponse,
  SchemeConnection,
  SchemeObject,
} from "../types/fieldScheme.types";

function getApiBase(): string {
  // Use relative /api - nginx will proxy to backend
  return "/api";
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const authHeader = getAuthHeader();
  const response = await fetch(`${getApiBase()}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(authHeader ? { Authorization: authHeader } : {}),
      ...(options?.headers ?? {}),
    },
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  if (response.status === 204) {
    return {} as T;
  }
  return response.json();
}

export const fieldSchemeApi = {
  listObjectTypes: () => apiFetch<FieldObjectType[]>("/field-schemes/field-object-types"),
  listSchemes: (oilFieldId?: string) =>
    apiFetch<FieldScheme[]>(oilFieldId ? `/field-schemes?oil_field_id=${oilFieldId}` : "/field-schemes"),
  getScheme: (schemeId: string) => apiFetch<FieldSchemeFullResponse>(`/field-schemes/${schemeId}`),
  createScheme: (payload: Partial<FieldScheme>) =>
    apiFetch<FieldScheme>("/field-schemes", { method: "POST", body: JSON.stringify(payload) }),
  updateScheme: (schemeId: string, payload: Partial<FieldScheme>) =>
    apiFetch<FieldScheme>(`/field-schemes/${schemeId}`, { method: "PUT", body: JSON.stringify(payload) }),
  createObject: (schemeId: string, payload: Partial<SchemeObject>) =>
    apiFetch<SchemeObject>(`/field-schemes/${schemeId}/objects`, { method: "POST", body: JSON.stringify(payload) }),
  updateObject: (schemeId: string, objectId: string, payload: Partial<SchemeObject>) =>
    apiFetch<SchemeObject>(`/field-schemes/${schemeId}/objects/${objectId}`, { method: "PUT", body: JSON.stringify(payload) }),
  createConnection: (schemeId: string, payload: Partial<SchemeConnection>) =>
    apiFetch<SchemeConnection>(`/field-schemes/${schemeId}/connections`, { method: "POST", body: JSON.stringify(payload) }),
  updateConnection: (schemeId: string, connectionId: string, payload: Partial<SchemeConnection>) =>
    apiFetch<SchemeConnection>(
      `/field-schemes/${schemeId}/connections/${connectionId}`,
      { method: "PUT", body: JSON.stringify(payload) }
    ),
  validateScheme: (schemeId: string) => apiFetch<{ status: string; messages: Array<Record<string, unknown>> }>(`/field-schemes/${schemeId}/validate`, { method: "POST" }),
  calculateScheme: (schemeId: string) => apiFetch<{ results: Record<string, unknown> }>(`/field-schemes/${schemeId}/calculate`, { method: "POST" }),
};
