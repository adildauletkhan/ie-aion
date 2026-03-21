/**
 * Shared localStorage store for Production Program plans.
 * Used by both ProductionProgram (editor) and AnnualPlanning (baseline selector).
 */

export const PLANS_LIST_KEY = "prodplan_plans_list_v1";
export const PLAN_DATA_PREFIX = "prodplan_data_v2_";

export interface ProdPlanMeta {
  id: string;
  name: string;
  createdAt: string;   // ISO date string
  updatedAt: string;
  year?: string;       // e.g. "2026-2030"
}

export function loadPlansList(): ProdPlanMeta[] {
  try {
    const s = localStorage.getItem(PLANS_LIST_KEY);
    if (s) return JSON.parse(s) as ProdPlanMeta[];
  } catch { /* ignore */ }
  return [];
}

export function savePlansList(list: ProdPlanMeta[]): void {
  localStorage.setItem(PLANS_LIST_KEY, JSON.stringify(list));
}

export function loadPlanData(planId: string): Record<string, unknown> | null {
  try {
    const s = localStorage.getItem(PLAN_DATA_PREFIX + planId);
    if (s) return JSON.parse(s);
  } catch { /* ignore */ }
  return null;
}

export function savePlanData(planId: string, data: unknown): void {
  localStorage.setItem(PLAN_DATA_PREFIX + planId, JSON.stringify(data));
}

export function deletePlan(planId: string): void {
  localStorage.removeItem(PLAN_DATA_PREFIX + planId);
}

export function createPlan(name: string): ProdPlanMeta {
  const id = `plan_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();
  return { id, name, createdAt: now, updatedAt: now, year: "2026–2030" };
}

/* ─── Approval Workflow ─────────────────────────────────────────────────── */

export const APPROVAL_PREFIX = "prodplan_approval_";

export type ApprovalStepStatus = "waiting" | "pending" | "approved" | "rejected";
export type WorkflowStatus = "draft" | "in_review" | "approved" | "rejected";

export interface ApprovalStep {
  id: string;
  sectionId: number;
  sectionTitleRu: string;
  sectionTitleEn: string;
  roleRu: string;
  roleEn: string;
  person: string;
  status: ApprovalStepStatus;
  comment: string;
  timestamp: string | null;
}

export interface ApprovalWorkflow {
  planId: string;
  status: WorkflowStatus;
  submittedAt: string | null;
  submittedBy: string;
  steps: ApprovalStep[];
}

/** 12 parallel approval steps — one per production program section */
const DEFAULT_STEPS: Omit<ApprovalStep, "status" | "person" | "comment" | "timestamp">[] = [
  { id: "s1",  sectionId: 1,  sectionTitleRu: "Геологоразведочные работы",         sectionTitleEn: "Geological Exploration",            roleRu: "Главный геолог",                        roleEn: "Chief Geologist" },
  { id: "s2",  sectionId: 2,  sectionTitleRu: "Добыча нефти и газа",                sectionTitleEn: "Oil & Gas Production",              roleRu: "Зам. директора по производству",        roleEn: "Deputy Director, Production" },
  { id: "s3",  sectionId: 3,  sectionTitleRu: "Эксплуатационное бурение",           sectionTitleEn: "Development Drilling",              roleRu: "Директор по бурению",                   roleEn: "Drilling Director" },
  { id: "s4",  sectionId: 4,  sectionTitleRu: "ОТМ по добыче",                      sectionTitleEn: "Production Tech Measures",          roleRu: "Главный технолог",                      roleEn: "Chief Technologist" },
  { id: "s5",  sectionId: 5,  sectionTitleRu: "Контроль разработки / ГТМ",          sectionTitleEn: "Field Monitoring & GTM",            roleRu: "Начальник геологического отдела",       roleEn: "Head of Geology Dept" },
  { id: "s6",  sectionId: 6,  sectionTitleRu: "Капремонт и ТО основных средств",    sectionTitleEn: "Capital Repair & Maintenance",      roleRu: "Главный механик",                       roleEn: "Chief Mechanical Engineer" },
  { id: "s7",  sectionId: 7,  sectionTitleRu: "Капитальное строительство",          sectionTitleEn: "Capital Construction",              roleRu: "Директор по капстроительству",          roleEn: "Capital Construction Director" },
  { id: "s8",  sectionId: 8,  sectionTitleRu: "Автоматизация и ИТ",                 sectionTitleEn: "Automation & IT",                   roleRu: "ИТ-директор",                           roleEn: "IT Director" },
  { id: "s9",  sectionId: 9,  sectionTitleRu: "НИР и НИОКР",                        sectionTitleEn: "R&D and Applied Research",          roleRu: "Начальник отдела НИР",                  roleEn: "Head of R&D Dept" },
  { id: "s10", sectionId: 10, sectionTitleRu: "ОПР / МУН",                          sectionTitleEn: "Pilot Works / EOR",                 roleRu: "Технический директор",                  roleEn: "Technical Director" },
  { id: "s11", sectionId: 11, sectionTitleRu: "Экология, ОТ и ПБ",                  sectionTitleEn: "Ecology, HSE",                      roleRu: "Руководитель ОТ и ПБ",                  roleEn: "HSE Director" },
  { id: "s12", sectionId: 12, sectionTitleRu: "Потребность в ТМЦ",                  sectionTitleEn: "MTR Supply Plan",                   roleRu: "Директор по МТО",                       roleEn: "Supply Chain Director" },
];

export function createDefaultApproval(planId: string): ApprovalWorkflow {
  return {
    planId,
    status: "draft",
    submittedAt: null,
    submittedBy: "",
    steps: DEFAULT_STEPS.map(s => ({ ...s, status: "waiting", person: "", comment: "", timestamp: null })),
  };
}

export function loadApproval(planId: string): ApprovalWorkflow {
  try {
    const s = localStorage.getItem(APPROVAL_PREFIX + planId);
    if (s) return JSON.parse(s) as ApprovalWorkflow;
  } catch { /* ignore */ }
  return createDefaultApproval(planId);
}

export function saveApproval(workflow: ApprovalWorkflow): void {
  localStorage.setItem(APPROVAL_PREFIX + workflow.planId, JSON.stringify(workflow));
}

export function deleteApproval(planId: string): void {
  localStorage.removeItem(APPROVAL_PREFIX + planId);
}

/** Extract summary metrics (oil production row) from plan data for display */
export interface ProdPlanSummary {
  id: string;
  name: string;
  updatedAt: string;
  oilByYear: Record<string, string>; // year → тыс.тонн
}

export function extractPlanSummary(meta: ProdPlanMeta): ProdPlanSummary {
  const data = loadPlanData(meta.id) as Record<string, Record<string, { vol: string; price: string; sum: string }>> | null;
  const oilByYear: Record<string, string> = {};
  if (data) {
    // Row "2-1" is oil production (Добыча нефти) in Section 2
    const oilRow = data["2-1"];
    if (oilRow) {
      for (const year of ["2026", "2027", "2028", "2029", "2030"]) {
        const val = oilRow[year]?.vol ?? "";
        if (val) oilByYear[year] = val;
      }
    }
  }
  return { id: meta.id, name: meta.name, updatedAt: meta.updatedAt, oilByYear };
}
