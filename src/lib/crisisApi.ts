import { getAuthHeader } from "@/lib/auth";

export type CrisisEventStatus = "open" | "analyzing" | "scenarios_ready" | "executing" | "resolved" | "failed";
export type CrisisSeverity = "low" | "medium" | "critical" | "catastrophic";
export type CrisisEventType = "technical" | "geopolitical" | "climate" | "market" | "logistics";
export type CrisisScenarioStatus = "draft" | "selected" | "archived";
export type CrisisExecutionStatus = "active" | "completed" | "blocked";
export type CrisisActionStatus = "pending" | "in_progress" | "completed" | "blocked";

export interface CrisisEvent {
  id: string;
  eventType: CrisisEventType;
  severity: CrisisSeverity;
  status: CrisisEventStatus;
  title: string;
  description: string;
  affectedAssetType?: string | null;
  affectedAssetId?: string | null;
  affectedStage?: string | null;
  currentCapacity: number;
  impactedCapacity: number;
  capacityLoss: number;
  capacityLossPct: number;
  eventStartDatetime?: string | null;
  estimatedDowntimeMinDays?: number | null;
  estimatedDowntimeMaxDays?: number | null;
  estimatedDowntimeBestDays?: number | null;
  actualRecoveryDatetime?: string | null;
  detectedBy?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CrisisImpactAnalysis {
  id: string;
  crisisEventId: string;
  analysisRunAt: string;
  status: "running" | "done" | "error";
  errorMessage?: string | null;
  directImpact?: Record<string, number | string> | null;
  upstreamImpact?: Record<string, number | string> | null;
  midstreamImpact?: Record<string, number | string> | null;
  downstreamImpact?: Record<string, number | string> | null;
  exportImpact?: Record<string, number | string> | null;
  financialImpact?: Record<string, number | string> | null;
  balanceChainBefore?: Record<string, { capacity: number; plan: number }> | null;
  balanceChainAfter?: Record<string, { capacity: number; plan: number }> | null;
}

export interface CrisisScenario {
  id: string;
  crisisEventId: string;
  scenarioName: string;
  scenarioType: string;
  description: string;
  strategyDetails?: Record<string, unknown> | null;
  baselineFinancialImpact: number;
  mitigatedFinancialImpact: number;
  netSavings: number;
  executionComplexity: "low" | "medium" | "high";
  executionTimelineDays: number;
  dependencies?: string | null;
  risks?: Record<string, unknown> | null;
  aiGenerated: boolean;
  aiConfidenceScore: number;
  aiRanking?: number | null;
  status: CrisisScenarioStatus;
  selectedBy?: string | null;
  selectedAt?: string | null;
}

export interface CrisisExecutionPlan {
  id: string;
  crisisEventId: string;
  selectedScenarioId: string;
  status: CrisisExecutionStatus;
  startDate?: string | null;
  targetCompletionDate?: string | null;
  plannedFinancialImpact: number;
  actualFinancialImpact: number;
  variance: number;
}

export interface CrisisActionItem {
  id: string;
  executionPlanId: string;
  phase: string;
  actionTitle: string;
  actionDescription: string;
  assignedTo?: string | null;
  deadline?: string | null;
  completedAt?: string | null;
  status: CrisisActionStatus;
  progressPct: number;
  dependsOnActionId?: string | null;
  blockingReason?: string | null;
}

export interface CrisisExecutionMonitoring {
  id: string;
  executionPlanId: string;
  recordedAt: string;
  metrics?: Record<string, unknown> | null;
  financialMetrics?: Record<string, unknown> | null;
  alerts?: Array<Record<string, unknown>> | null;
}

export interface CrisisExecutionBundle {
  plan: CrisisExecutionPlan;
  actionItems: CrisisActionItem[];
}

export interface CrisisNotification {
  id: string;
  crisisEventId: string;
  notificationType: string;
  severity: CrisisSeverity;
  title: string;
  message: string;
  sentAt: string;
}

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

export const listCrisisEvents = () => apiFetch<CrisisEvent[]>("/crisis/events");
export const createCrisisEvent = (payload: Partial<CrisisEvent>) =>
  apiFetch<CrisisEvent>("/crisis/events", { method: "POST", body: JSON.stringify(payload) });
export const updateCrisisEvent = (id: string, payload: Partial<CrisisEvent>) =>
  apiFetch<CrisisEvent>(`/crisis/events/${id}`, { method: "PUT", body: JSON.stringify(payload) });
export const analyzeCrisisEvent = (id: string) => apiFetch<{ status: string }>(`/crisis/events/${id}/analyze`, { method: "POST" });
export const getCrisisImpact = (id: string) => apiFetch<CrisisImpactAnalysis>(`/crisis/events/${id}/impact`);
export const generateCrisisScenarios = (id: string) =>
  apiFetch<{ status: string }>(`/crisis/events/${id}/generate-scenarios`, { method: "POST" });
export const listCrisisScenarios = (id: string) => apiFetch<CrisisScenario[]>(`/crisis/events/${id}/scenarios`);
export const selectCrisisScenario = (id: string) => apiFetch<CrisisScenario>(`/crisis/scenarios/${id}/select`, { method: "POST" });
export const executeCrisisScenario = (id: string) => apiFetch<CrisisExecutionBundle>(`/crisis/scenarios/${id}/execute`, { method: "POST" });
export const getCrisisExecution = (id: string) => apiFetch<CrisisExecutionBundle>(`/crisis/events/${id}/execution`);
export const updateCrisisAction = (id: string, payload: Partial<CrisisActionItem>) =>
  apiFetch<CrisisActionItem>(`/crisis/actions/${id}`, { method: "PUT", body: JSON.stringify(payload) });
export const listCrisisMonitoring = (id: string) => apiFetch<CrisisExecutionMonitoring[]>(`/crisis/events/${id}/monitoring`);

export interface MonitoringEntryCreate {
  utilizationRefineries?: number;
  exportVolumes?: number;
  plannedImpact?: number;
  actualImpact?: number;
  variancePct?: number;
  alertMessage?: string;
  alertSeverity?: string;
  note?: string;
}

export const addMonitoringEntry = (eventId: string, payload: MonitoringEntryCreate) =>
  apiFetch<CrisisExecutionMonitoring>(`/crisis/events/${eventId}/monitoring`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const generateCrisisDescription = (question: string) =>
  apiFetch<{ answer: string }>("/ai/chat", {
    method: "POST",
    body: JSON.stringify({
      question,
      sources: { masterData: false, scenarios: false, annualPlans: false, results: false },
    }),
  });
