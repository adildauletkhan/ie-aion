/**
 * Реальный API-клиент строительного домена (backend IE:AION, Фаза 1).
 *
 * Используется для «невидимого» свапа mock→API (см. constructionMockData.ts) и
 * для новых модулей «Бригадиры» / «Суточный журнал».
 *
 * Переключение mock/real — переменная окружения VITE_USE_MOCK_DATA:
 *   - VITE_USE_MOCK_DATA === 'true' → mock;
 *   - иначе (по умолчанию) → реальный API, с graceful-fallback на mock при ошибке.
 *
 * Базовый URL — относительный '/api' (nginx/vite проксируют на backend).
 * Аутентификация — Basic Auth пользователя из localStorage (см. lib/auth).
 */

import { getAuthHeader } from '@/lib/auth'
import type {
  ConstructionProject,
  Deviation,
  DeviationKind,
  DeviationSeverity,
  ProgressCurvePoint,
  ScheduleTask,
  TaskStatus,
  ZonePlanFact,
} from '@/data/constructionMockData'

export const USE_MOCK = import.meta.env.VITE_USE_MOCK_DATA === 'true'

const API_BASE = '/api/construction'

function authHeaders(): Record<string, string> {
  const auth = getAuthHeader()
  return {
    'Content-Type': 'application/json',
    ...(auth ? { Authorization: auth } : {}),
  }
}

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { headers: authHeaders() })
  if (!res.ok) throw new Error(`GET ${path} → HTTP ${res.status}`)
  return (await res.json()) as T
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`POST ${path} → HTTP ${res.status}`)
  return (await res.json()) as T
}

/* ──────────────────────── RAW backend-типы (camelCase) ─────────────────── */

interface ApiProject {
  projectId: string; name: string; developer: string | null; bac: number | null
  dataDate: string | null; planStart: string | null; planFinish: string | null; factStart: string | null
}
interface ApiTask {
  taskId: string; projectId: string; wbsCode: string; name: string; zone: string | null
  phaseId: string | null; plannedProgressPct: number | null; actualProgressPct: number | null
  status: string; responsible: string | null; planStart: string | null; planFinish: string | null
  factStart: string | null; factFinish: string | null; pv: number | null; ev: number | null; ac: number | null
}
interface ApiZonePlanFact {
  id: string; projectId: string; zone: string; date: string
  planPct: number | null; factPct: number | null; lagDays: number | null
}
interface ApiDeviation {
  id: string; projectId: string; taskId: string | null; zone: string | null
  kind: string; severity: string; deltaPct: number | null; description: string | null
  detectedAt: string; resolvedAt: string | null
}
interface ApiCurvePoint { date: string; pv: number | null; ev: number | null; ac: number | null }

/* ──────────────────────── Маппинг backend → mock-TS-типы ───────────────── */

// Статус backend (planned/in_progress/done/blocked) → UI (planned/in_progress/done/late).
const STATUS_MAP: Record<string, TaskStatus> = {
  planned: 'planned', in_progress: 'in_progress', done: 'done', blocked: 'late',
}
// Вид отклонения backend → UI (schedule/cost/quality/safety).
const KIND_MAP: Record<string, DeviationKind> = {
  schedule: 'schedule', resource: 'cost', dependency: 'schedule', quality: 'quality', external: 'schedule',
}
// Severity backend (attention/risk/critical) → UI (low/medium/high/critical).
const SEVERITY_MAP: Record<string, DeviationSeverity> = {
  attention: 'low', risk: 'medium', critical: 'critical',
}

function mapProject(p: ApiProject): ConstructionProject {
  return {
    id: p.projectId,
    code: '',
    name: p.name,
    developer: p.developer ?? '',
    location: '',
    plannedStart: p.planStart ?? '',
    plannedFinish: p.planFinish ?? '',
    actualStart: p.factStart,
    budgetTotal: p.bac ?? 0,
    currency: 'KZT',
    dataDate: p.dataDate ?? '',
  }
}

function mapTask(t: ApiTask): ScheduleTask {
  return {
    id: t.taskId,
    wbs: t.wbsCode,
    name: t.name,
    zone: t.zone ?? '',
    plannedStart: t.planStart ?? '',
    plannedFinish: t.planFinish ?? '',
    actualStart: t.factStart,
    actualFinish: t.factFinish,
    progressPct: t.actualProgressPct ?? 0,
    status: STATUS_MAP[t.status] ?? 'planned',
    plannedValue: t.pv ?? 0,
    earnedValue: t.ev ?? 0,
    actualCost: t.ac ?? 0,
    phaseId: t.phaseId ?? undefined,
    responsibleName: t.responsible ?? undefined,
  }
}

function mapZonePlanFact(z: ApiZonePlanFact): ZonePlanFact {
  return {
    zone: z.zone,
    plannedPct: z.planPct ?? 0,
    factPct: z.factPct ?? 0,
    lagDays: z.lagDays ?? 0,
  }
}

function mapDeviation(d: ApiDeviation): Deviation {
  return {
    id: d.id,
    kind: KIND_MAP[d.kind] ?? 'schedule',
    severity: SEVERITY_MAP[d.severity] ?? 'medium',
    detectedAt: (d.detectedAt || '').slice(0, 10),
    resolvedAt: d.resolvedAt ? d.resolvedAt.slice(0, 10) : null,
    scope: d.zone ?? '',
    description: d.description ?? '',
    delta: d.deltaPct,
  }
}

function mapCurve(c: ApiCurvePoint): ProgressCurvePoint {
  return {
    date: c.date,
    plannedValue: c.pv ?? 0,
    earnedValue: c.ev ?? 0,
    actualCost: c.ac ?? 0,
  }
}

/* ──────────────────────── RAW real-фетчеры (для свапа) ─────────────────── */

export async function apiFetchProject(projectId: string): Promise<ConstructionProject> {
  return mapProject(await apiGet<ApiProject>(`/projects/${projectId}`))
}
export async function apiFetchTasks(projectId: string): Promise<ScheduleTask[]> {
  return (await apiGet<ApiTask[]>(`/projects/${projectId}/tasks`)).map(mapTask)
}
export async function apiFetchZonePlanFact(projectId: string): Promise<ZonePlanFact[]> {
  return (await apiGet<ApiZonePlanFact[]>(`/projects/${projectId}/zone-plan-fact`)).map(mapZonePlanFact)
}
export async function apiFetchDeviations(projectId: string): Promise<Deviation[]> {
  return (await apiGet<ApiDeviation[]>(`/projects/${projectId}/deviations-timeline?limit=100`)).map(mapDeviation)
}
export async function apiFetchProgressCurve(projectId: string): Promise<ProgressCurvePoint[]> {
  return (await apiGet<ApiCurvePoint[]>(`/projects/${projectId}/progress-curve`)).map(mapCurve)
}

/* ──────────────────────── Новые типы: бригадиры / журнал ───────────────── */

export type TelegramLinkStatus = 'not_invited' | 'invited' | 'linked'
export type ForemanRole = 'foreman' | 'brigadier' | 'pto'

export interface Foreman {
  foremanId: string
  projectId: string
  fullName: string
  phone: string | null
  role: string
  crewId: string | null
  crewName: string | null
  contractorName: string | null
  defaultZone: string | null
  telegramUserId: number | null
  telegramLinkStatus: TelegramLinkStatus
  inviteCode: string | null
  active: boolean
  lastReportDate: string | null
  createdAt: string
  updatedAt: string
}

export interface Crew {
  crewId: string
  projectId: string
  name: string
  contractorName: string | null
  specialization: string | null
  plannedHeadcount: number | null
}

export type JournalSource = 'voice' | 'manual' | 'cv'

export interface JournalEntry {
  entryId: string
  projectId: string
  date: string
  zone: string | null
  taskId: string | null
  workType: string | null
  planPct: number | null
  factPct: number | null
  deltaPct: number | null
  source: JournalSource
  authorForemanId: string | null
  authorForemanName: string | null
  authorUserId: number | null
  blockerType: string | null
  blockerDescription: string | null
  riskDelayDays: number | null
  riskSeverity: string | null
  responsible: string | null
  actions: string[]
  rawTranscript: string | null
  photos: string[]
  confirmed: boolean
  matchConfidence: string | null
  createdAt: string
}

export interface DeviationTimelineItem {
  id: string
  projectId: string
  taskId: string | null
  zone: string | null
  kind: string
  severity: string
  deltaPct: number | null
  description: string | null
  detectedAt: string
  resolvedAt: string | null
}

export interface SparklinePoint { date: string; ev: number | null }

export interface ForemanCreateInput {
  fullName: string
  phone?: string | null
  role?: string
  crewId?: string | null
  defaultZone?: string | null
}

export interface ManualJournalInput {
  date: string
  zone?: string | null
  taskId?: string | null
  workType?: string | null
  planPct?: number | null
  factPct?: number | null
  deltaPct?: number | null
  blockerType?: string | null
  blockerDescription?: string | null
  riskDelayDays?: number | null
  riskSeverity?: string | null
  responsible?: string | null
  actions?: string[]
  confirmed?: boolean
}

/* ──────────────────────── Новые эндпоинты (Фаза 1) ─────────────────────── */

export function fetchForemen(projectId: string): Promise<Foreman[]> {
  return apiGet<Foreman[]>(`/projects/${projectId}/foremen`)
}
export function createForeman(projectId: string, input: ForemanCreateInput): Promise<Foreman> {
  return apiPost<Foreman>(`/projects/${projectId}/foremen`, input)
}
export function fetchCrews(projectId: string): Promise<Crew[]> {
  return apiGet<Crew[]>(`/projects/${projectId}/crews`)
}
export function createCrew(
  projectId: string,
  input: { name: string; contractorName?: string; specialization?: string; plannedHeadcount?: number },
): Promise<Crew> {
  return apiPost<Crew>(`/projects/${projectId}/crews`, input)
}

export interface JournalFilters {
  dateFrom?: string
  dateTo?: string
  zone?: string
  foremanId?: string
  confirmedOnly?: boolean
}

export function fetchJournal(projectId: string, filters: JournalFilters = {}): Promise<JournalEntry[]> {
  const q = new URLSearchParams()
  if (filters.dateFrom) q.set('date_from', filters.dateFrom)
  if (filters.dateTo) q.set('date_to', filters.dateTo)
  if (filters.zone) q.set('zone', filters.zone)
  if (filters.foremanId) q.set('foreman_id', filters.foremanId)
  if (filters.confirmedOnly) q.set('confirmed_only', 'true')
  const qs = q.toString()
  return apiGet<JournalEntry[]>(`/projects/${projectId}/journal${qs ? `?${qs}` : ''}`)
}

export function createManualJournalEntry(projectId: string, input: ManualJournalInput): Promise<JournalEntry> {
  return apiPost<JournalEntry>(`/projects/${projectId}/journal-manual`, input)
}

export function fetchDeviationsTimeline(projectId: string, limit = 10): Promise<DeviationTimelineItem[]> {
  return apiGet<DeviationTimelineItem[]>(`/projects/${projectId}/deviations-timeline?limit=${limit}`)
}

export function fetchProgressSparkline(projectId: string, days = 14): Promise<SparklinePoint[]> {
  return apiGet<SparklinePoint[]>(`/projects/${projectId}/progress-sparkline?days=${days}`)
}
