/**
 * API Client — placeholder layer for Digital Twin backend calls.
 * Replace mock implementations with real API calls when backend is ready.
 */

export interface StageInput {
  stage: "UP" | "MID" | "DOWN" | "EXPORT";
  label: string;
  capacity: number;
  planCorp: number;
  planGov: number;
}

export interface ScenarioResult {
  feasibleVolume: number;
  bottleneckStage: string;
  bottleneckLabel: string;
  gap: number;
  stages: StageResultRow[];
}

export interface StageResultRow {
  stage: string;
  label: string;
  capacity: number;
  planGov: number;
  planCorp: number;
  totalPlan: number;
  utilization: number;
  status: "green" | "yellow" | "red";
  isBottleneck: boolean;
}

function getApiBase(): string {
  // Use relative /api - nginx will proxy to backend via Railway internal network
  return "/api";
}

function getAuthHeader(): string | undefined {
  const user = import.meta.env.VITE_BASIC_AUTH_USER;
  const pass = import.meta.env.VITE_BASIC_AUTH_PASSWORD;
  if (!user || !pass) {
    return undefined;
  }
  return `Basic ${btoa(`${user}:${pass}`)}`;
}

/**
 * Runs a scenario calculation based on stage inputs.
 * Calls POST /api/digital-twin/run.
 */
export async function runScenario(stages: StageInput[]): Promise<ScenarioResult> {
  const authHeader = getAuthHeader();
  const response = await fetch(`${getApiBase()}/digital-twin/run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(authHeader ? { Authorization: authHeader } : {}),
    },
    body: JSON.stringify(stages),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Failed to run scenario");
  }

  return response.json();
}

export async function generateFieldSchemeRecommendation(question: string): Promise<string> {
  const authHeader = getAuthHeader();
  const response = await fetch(`${getApiBase()}/ai/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(authHeader ? { Authorization: authHeader } : {}),
    },
    body: JSON.stringify({
      question,
      sources: { masterData: true, scenarios: false, annualPlans: true, results: true },
      skipDirectAnswer: true,
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "AI request failed");
  }

  const data = await response.json();
  return String(data?.answer ?? "");
}
