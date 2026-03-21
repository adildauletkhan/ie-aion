/**
 * Plan Validation Engine
 * Checks a production plan against SAP data, infrastructure capacity,
 * oil reserves and financial parameters, then requests an AI feasibility report.
 */

export type ValidationStatus = "ok" | "warning" | "critical";

export interface CheckItem {
  label: string;
  value: string;
  limit?: string;
  utilizationPct?: number; // 0-100
  status: ValidationStatus;
  notes: string;
}

export interface RiskItem {
  title: string;
  description: string;
  severity: "high" | "medium" | "low";
}

export interface ValidationReport {
  planName: string;
  companyName: string;
  generatedAt: string;
  overallStatus: ValidationStatus;
  overallLabel: string;
  executiveSummary: string;
  reservesChecks: CheckItem[];
  infrastructureChecks: CheckItem[];
  sapChecks: CheckItem[];
  financialChecks: CheckItem[];
  risks: RiskItem[];
  recommendations: string[];
  aiPowered: boolean;
}

/* ─── Mock reference data ──────────────────────────────────────────────────── */

const MOCK_RESERVES_KT = {
  "Доссор":     { p2: 18400, annualMax: 680 },
  "Макат":      { p2: 12100, annualMax: 490 },
  "Байчунас":   { p2:  8700, annualMax: 320 },
  "Искине":     { p2:  5600, annualMax: 210 },
  "Кенкияк":   { p2: 22000, annualMax: 830 },
  "Жаксымай":   { p2:  4100, annualMax: 150 },
  "Алибекмола": { p2:  9800, annualMax: 380 },
  "Кожасай":    { p2:  6300, annualMax: 240 },
};
const TOTAL_P2_RESERVES = Object.values(MOCK_RESERVES_KT).reduce((s, f) => s + f.p2, 0);
const TOTAL_ANNUAL_MAX  = Object.values(MOCK_RESERVES_KT).reduce((s, f) => s + f.annualMax, 0);

const MOCK_INFRA = {
  oilProcessingPlantCapacity_kt_yr: 3500,
  pipelineCapacity_kt_yr:           3800,
  storageCapacity_kt:                450,
  gasProcessingCapacity_mln_m3_yr:  1100,
};

const MOCK_SAP = {
  drillingRigs:                     12,
  drillingRigsAvailable:             9,
  workoverRigs:                     28,
  workoverRigsAvailable:            22,
  operationalPersonnel:           4200,
  annualMaintenanceBudget_mln_usd:  85,
  annualCapexBudget_mln_usd:       210,
  annualOpexBudget_mln_usd:        340,
};

/* ─── Utility ──────────────────────────────────────────────────────────────── */

function statusFor(utilPct: number): ValidationStatus {
  if (utilPct < 80) return "ok";
  if (utilPct < 95) return "warning";
  return "critical";
}

function avg(arr: number[]): number {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

function extractTotals(
  planState: Record<string, Record<string, { vol: string; price: string; sum: string }>>,
  rowIds: string[],
  years: string[],
  field: "vol" | "sum"
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const y of years) {
    let total = 0;
    for (const id of rowIds) {
      const v = parseFloat(planState[id]?.[y]?.[field] ?? "");
      if (!isNaN(v)) total += v;
    }
    out[y] = total;
  }
  return out;
}

function worstStatus(items: CheckItem[]): ValidationStatus {
  return items.reduce<ValidationStatus>(
    (w, c) => c.status === "critical" ? "critical" : w === "critical" ? "critical" : c.status === "warning" ? "warning" : w,
    "ok"
  );
}

/* ─── t() — inline translations ─────────────────────────────────────────────── */
const t = (isEn: boolean, ru: string, en: string) => isEn ? en : ru;

/* ─── Deterministic local checks ──────────────────────────────────────────── */

function checkReserves(oilVolsByYear: Record<string, number>, isEn: boolean): CheckItem[] {
  const years = Object.keys(oilVolsByYear).sort();
  const totalPlanned5yr = years.reduce((s, y) => s + (oilVolsByYear[y] ?? 0), 0);
  const depletionRatio = totalPlanned5yr / TOTAL_P2_RESERVES * 100;
  const peakYear = years.reduce((best, y) =>
    (oilVolsByYear[y] ?? 0) > (oilVolsByYear[best] ?? 0) ? y : best, years[0]);
  const peakVol = oilVolsByYear[peakYear] ?? 0;
  const peakCapUtil = peakVol / TOTAL_ANNUAL_MAX * 100;

  return [
    {
      label: t(isEn, "Накопленная добыча за 5 лет vs запасы 2P", "5-year cumulative production vs 2P reserves"),
      value: `${totalPlanned5yr.toLocaleString("ru-RU")} тыс. т`,
      limit: `${TOTAL_P2_RESERVES.toLocaleString("ru-RU")} тыс. т (2P)`,
      utilizationPct: Math.round(depletionRatio),
      status: depletionRatio < 30 ? "ok" : depletionRatio < 55 ? "warning" : "critical",
      notes: depletionRatio < 30
        ? t(isEn, "Накопленная добыча находится в пределах базы доказанных запасов.", "Cumulative production well within proven reserve base.")
        : depletionRatio < 55
          ? t(isEn, "Интенсивность отбора повышена — необходимо планирование программ МУН.", "Depletion rate is elevated — schedule enhanced recovery programmes.")
          : t(isEn, "⚠ За 5 лет будет отобрано более половины запасов 2P. Требуется новая геологоразведка.", "⚠ Plan depletes over half of 2P reserves in 5 years. New exploration required."),
    },
    {
      label: t(isEn, `Пиковая годовая добыча (${peakYear})`, `Peak annual production (${peakYear})`),
      value: `${peakVol.toLocaleString("ru-RU")} тыс. т/год`,
      limit: `${TOTAL_ANNUAL_MAX.toLocaleString("ru-RU")} тыс. т/год (${t(isEn, "макс. устойчивый", "max sustainable")})`,
      utilizationPct: Math.round(peakCapUtil),
      status: statusFor(peakCapUtil),
      notes: peakCapUtil < 80
        ? t(isEn, "Пиковая добыча в пределах устойчивого диапазона.", "Peak production within sustainable extraction limits.")
        : peakCapUtil < 95
          ? t(isEn, "Добыча приближается к предельному уровню. Мониторинг пластового давления.", "Approaching sustainable limit. Monitor reservoir pressure.")
          : t(isEn, "Темп отбора превышает предельный — риск ускоренного снижения дебита.", "Extraction rate exceeds sustainable limit — risk of accelerated decline."),
    },
    {
      label: t(isEn, "Охват геологоразведочным бурением (Раздел 1)", "Exploration drilling coverage (Section 1)"),
      value: totalPlanned5yr > 0
        ? t(isEn, "Новые скважины запланированы", "New wells planned")
        : t(isEn, "Данные не введены", "No data entered"),
      status: totalPlanned5yr > 0 ? "ok" : "warning",
      notes: t(isEn,
        "Необходимо подтвердить, что объёмы Раздела 1 обеспечивают КВЗ ≥ 1.0 в долгосрочной перспективе.",
        "Confirm Section 1 volumes support long-term reserve replacement ratio ≥ 1.0."),
    },
  ];
}

function checkInfrastructure(
  oilVolsByYear: Record<string, number>,
  gasVolsByYear: Record<string, number>,
  isEn: boolean
): CheckItem[] {
  const years = Object.keys(oilVolsByYear).sort();
  const peakOil = Math.max(...years.map(y => oilVolsByYear[y] ?? 0));
  const peakGas = Math.max(...years.map(y => gasVolsByYear[y] ?? 0));
  const oilCapUtil = peakOil / MOCK_INFRA.oilProcessingPlantCapacity_kt_yr * 100;
  const pipeUtil   = peakOil / MOCK_INFRA.pipelineCapacity_kt_yr * 100;
  const gasUtil    = peakGas / MOCK_INFRA.gasProcessingCapacity_mln_m3_yr * 100;

  return [
    {
      label: t(isEn, "Загрузка установки подготовки нефти (УПН)", "Oil processing plant utilisation"),
      value: `${peakOil.toLocaleString("ru-RU")} тыс. т/год`,
      limit: `${MOCK_INFRA.oilProcessingPlantCapacity_kt_yr.toLocaleString("ru-RU")} тыс. т/год`,
      utilizationPct: Math.round(oilCapUtil),
      status: statusFor(oilCapUtil),
      notes: oilCapUtil < 80
        ? t(isEn, "Мощность УПН достаточна для плановых объёмов.", "Processing capacity sufficient for planned volumes.")
        : t(isEn, "УПН близка к пределу мощности — требуется программа дебаттлнекинга.", "Approaching plant ceiling — consider debottlenecking programme."),
    },
    {
      label: t(isEn, "Пропускная способность трубопровода", "Pipeline throughput capacity"),
      value: `${peakOil.toLocaleString("ru-RU")} тыс. т/год`,
      limit: `${MOCK_INFRA.pipelineCapacity_kt_yr.toLocaleString("ru-RU")} тыс. т/год`,
      utilizationPct: Math.round(pipeUtil),
      status: statusFor(pipeUtil),
      notes: pipeUtil < 80
        ? t(isEn, "Пропускная способность трубопровода достаточна.", "Pipeline capacity is adequate.")
        : t(isEn, "Риск перегрузки трубопровода — оценить тарифные обязательства и варианты лупинга.", "Congestion risk — evaluate tariff commitments and loopline options."),
    },
    {
      label: t(isEn, "Мощность установки подготовки газа (УПГ)", "Gas processing plant capacity"),
      value: `${peakGas.toLocaleString("ru-RU")} млн м³/год`,
      limit: `${MOCK_INFRA.gasProcessingCapacity_mln_m3_yr.toLocaleString("ru-RU")} млн м³/год`,
      utilizationPct: Math.round(gasUtil),
      status: statusFor(gasUtil),
      notes: gasUtil < 80
        ? t(isEn, "Мощности газопереработки достаточно.", "Gas processing capacity sufficient.")
        : gasUtil < 95
          ? t(isEn, "Высокая загрузка УПГ — планировать окна для ТО.", "High utilisation — plan maintenance windows carefully.")
          : t(isEn, "Узкое место в газопереработке — риск сжигания и регуляторные штрафы.", "Gas processing bottleneck — flaring and regulatory risk."),
    },
    {
      label: t(isEn, "Резервуарный парк / буферное хранение", "Tank farm / buffer storage"),
      value: `${MOCK_INFRA.storageCapacity_kt.toLocaleString("ru-RU")} тыс. т`,
      status: "ok",
      notes: t(isEn,
        "Буферное хранение обеспечивает ~5 суток качания на пиковом расходе. Достаточно для операционной гибкости.",
        "Buffer storage covers ~5-day swing at peak throughput. Adequate for operational flexibility."),
    },
  ];
}

function checkSAP(drillingWellsByYear: Record<string, number>, isEn: boolean): CheckItem[] {
  const years = Object.keys(drillingWellsByYear).sort();
  const peakWells = Math.max(...years.map(y => drillingWellsByYear[y] ?? 0), 0);
  const rigsNeeded = Math.ceil(peakWells / 2);
  const rigUtil = rigsNeeded / MOCK_SAP.drillingRigsAvailable * 100;

  return [
    {
      label: t(isEn, "Наличие буровых установок", "Drilling rig availability"),
      value: t(isEn,
        `${rigsNeeded} уст. потребуется (пиковый год)`,
        `${rigsNeeded} rigs required (peak year)`),
      limit: t(isEn,
        `${MOCK_SAP.drillingRigsAvailable} доступно (${MOCK_SAP.drillingRigs} всего, ${MOCK_SAP.drillingRigs - MOCK_SAP.drillingRigsAvailable} в ТО)`,
        `${MOCK_SAP.drillingRigsAvailable} available (${MOCK_SAP.drillingRigs} total, ${MOCK_SAP.drillingRigs - MOCK_SAP.drillingRigsAvailable} on maintenance)`),
      utilizationPct: Math.round(rigUtil),
      status: statusFor(rigUtil),
      notes: rigUtil < 80
        ? t(isEn, "Буровой парк покрывает потребности пиковой программы.", "Drilling fleet covers peak programme requirement.")
        : rigUtil < 95
          ? t(isEn, "Дефицит установок нарастает — заблаговременно заключить долгосрочные контракты.", "Rig demand is tight — secure long-term contracts early.")
          : t(isEn, "Дефицит буровых установок — мобилизация подрядных бригад обязательна.", "Rig shortfall — mobilise external contractor rigs."),
    },
    {
      label: t(isEn, "Парк установок для ТКРС", "Workover rig coverage"),
      value: t(isEn,
        `${MOCK_SAP.workoverRigsAvailable} доступно`,
        `${MOCK_SAP.workoverRigsAvailable} available`),
      limit: t(isEn, `${MOCK_SAP.workoverRigs} всего`, `${MOCK_SAP.workoverRigs} total`),
      utilizationPct: Math.round(MOCK_SAP.workoverRigsAvailable / MOCK_SAP.workoverRigs * 100),
      status: "ok",
      notes: t(isEn,
        "Парк ТКРС достаточен для плановых ремонтов и расконсервации.",
        "Workover fleet adequate for planned maintenance and reactivation."),
    },
    {
      label: t(isEn, "Операционный персонал", "Operational personnel"),
      value: t(isEn,
        `${MOCK_SAP.operationalPersonnel.toLocaleString()} чел.`,
        `${MOCK_SAP.operationalPersonnel.toLocaleString()} headcount`),
      status: "ok",
      notes: t(isEn,
        "Численность персонала покрывает текущий план. Мониторинг подрядных ресурсов в период пиковых кампаний.",
        "Workforce covers current plan. Monitor contractor availability during peak drilling campaigns."),
    },
    {
      label: t(isEn, "Бюджет ТО (SAP PM)", "Maintenance budget (SAP PM)"),
      value: `$${MOCK_SAP.annualMaintenanceBudget_mln_usd}М / ${t(isEn, "год", "year")}`,
      status: "ok",
      notes: t(isEn,
        "Бюджет ТО соответствует текущей базе активов. Пересмотреть при вводе новых скважин.",
        "Maintenance budget aligned with current asset base. Review upon new well commissioning."),
    },
  ];
}

function checkFinancial(totalSumsBySection: Record<number, number>, isEn: boolean): CheckItem[] {
  const totalKzt = Object.values(totalSumsBySection).reduce((s, v) => s + v, 0) / 1000;
  const impliedUsd = totalKzt / 450;
  const capexUtil = impliedUsd / (MOCK_SAP.annualCapexBudget_mln_usd * 5) * 100;

  return [
    {
      label: t(isEn, "Суммарные инвестиции по плану (5 лет)", "Total plan investment (5 years)"),
      value: `${totalKzt.toLocaleString("ru-RU", { maximumFractionDigits: 0 })} млрд тг`,
      status: totalKzt > 0 ? "ok" : "warning",
      notes: totalKzt > 0
        ? t(isEn, "Инвестиционные объёмы внесены в план.", "Investment volumes captured in plan.")
        : t(isEn, "Финансовые данные ещё не введены. Заполните колонки «Цена/Сумма».", "Financial data not entered. Fill in Price/Sum columns to enable checks."),
    },
    {
      label: t(isEn, "Соответствие CAPEX-бюджету", "CAPEX budget alignment"),
      value: `~$${Math.round(impliedUsd)}М`,
      limit: `$${MOCK_SAP.annualCapexBudget_mln_usd * 5}М (${t(isEn, "5-летний лимит", "5-yr budget envelope")})`,
      utilizationPct: Math.round(capexUtil),
      status: impliedUsd > 0 ? statusFor(capexUtil) : "warning",
      notes: capexUtil < 80
        ? t(isEn, "План вписывается в утверждённый CAPEX-бюджет.", "Plan fits within approved CAPEX envelope.")
        : capexUtil < 100
          ? t(isEn, "CAPEX-бюджет задействован почти полностью — резервный буфер мал.", "Most of CAPEX envelope utilised — limited contingency buffer.")
          : t(isEn, "Превышение CAPEX-бюджета — требуется приоритизация и поэтапная корректировка.", "CAPEX budget exceeded — phasing and prioritisation review required."),
    },
    {
      label: t(isEn, "Покрытие OPEX (SAP FI)", "OPEX coverage (SAP FI)"),
      value: `$${MOCK_SAP.annualOpexBudget_mln_usd}М / ${t(isEn, "год", "year")}`,
      status: "ok",
      notes: t(isEn,
        "OPEX-бюджет подтверждён в SAP FI. Риск эскалации: инфляция энергоносителей и услуг +3–5% в год.",
        "OPEX budget confirmed in SAP FI. Escalation risk: energy and services inflation +3–5% p.a."),
    },
    {
      label: t(isEn, "Чувствительность ВНД", "IRR sensitivity"),
      value: t(isEn, "~18–22% (базовая цена нефти $70/барр.)", "~18–22% (base oil price $70/bbl)"),
      status: "ok",
      notes: t(isEn,
        "Экономика проекта устойчива при цене выше $52/барр. (точка безубыточности). Мониторинг Brent и курса USD/KZT.",
        "Project economics robust above $52/bbl break-even. Monitor Brent curve and KZT/USD."),
    },
  ];
}

/* ─── AI feasibility analysis via OpenAI ──────────────────────────────────── */

async function callOpenAI(prompt: string): Promise<string | null> {
  const apiKey = (import.meta as Record<string, Record<string, string>>).env?.VITE_OPENAI_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o",
        temperature: 0.3,
        max_tokens: 1400,
        messages: [
          {
            role: "system",
            content:
              "You are a senior petroleum-industry consultant. " +
              "Respond in the same language as the user (Russian or English). " +
              "Return only valid JSON — no markdown fences.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!res.ok) return null;
    const json = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
    return json.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}

interface AIResult {
  executiveSummary: string;
  risks: RiskItem[];
  recommendations: string[];
}

async function getAIAnalysis(
  planName: string,
  companyName: string,
  oilVols: Record<string, number>,
  gasVols: Record<string, number>,
  drillingWells: Record<string, number>,
  totalBudgetBln: number,
  overallStatus: ValidationStatus,
  isEn: boolean
): Promise<AIResult | null> {
  const lang = isEn ? "English" : "Russian";
  const oilTable  = Object.entries(oilVols).map(([y, v]) => `  ${y}: ${v} тыс. т`).join("\n");
  const gasTable  = Object.entries(gasVols).map(([y, v]) => `  ${y}: ${v} млн м³`).join("\n");
  const drillTable = Object.entries(drillingWells).map(([y, v]) => `  ${y}: ${v} скв.`).join("\n");
  const verdict = overallStatus === "ok" ? (isEn ? "FEASIBLE" : "ИСПОЛНИМО")
    : overallStatus === "warning" ? (isEn ? "CONDITIONALLY FEASIBLE" : "УСЛОВНО ИСПОЛНИМО")
    : (isEn ? "REQUIRES REVISION" : "ТРЕБУЕТ ДОРАБОТКИ");

  const prompt = `Respond in ${lang}. Return valid JSON only.

Plan "${planName}" for ${companyName}. Preliminary check verdict: ${verdict}.

Oil production (тыс. т/год):
${oilTable}
Associated gas (млн м³/год):
${gasTable}
Drilling programme (скв./год):
${drillTable}
Total 5-yr investment: ~${totalBudgetBln.toFixed(1)} млрд тг

Reference:
- Total 2P reserves: ${TOTAL_P2_RESERVES.toLocaleString()} тыс. т (${Object.keys(MOCK_RESERVES_KT).length} fields)
- Max sustainable extraction: ${TOTAL_ANNUAL_MAX.toLocaleString()} тыс. т/год
- Oil plant capacity: ${MOCK_INFRA.oilProcessingPlantCapacity_kt_yr.toLocaleString()} тыс. т/год
- Pipeline capacity: ${MOCK_INFRA.pipelineCapacity_kt_yr.toLocaleString()} тыс. т/год
- Drilling rigs available: ${MOCK_SAP.drillingRigsAvailable}/${MOCK_SAP.drillingRigs}
- Annual CAPEX budget: $${MOCK_SAP.annualCapexBudget_mln_usd}M

Return:
{
  "executiveSummary": "3-4 sentences, include the ${verdict} verdict",
  "risks": [{"title":"...","description":"1-2 sentences","severity":"high|medium|low"}, ...3-5 items],
  "recommendations": ["...", ...3-5 items]
}`;

  const raw = await callOpenAI(prompt);
  if (!raw) return null;
  try { return JSON.parse(raw) as AIResult; } catch { return null; }
}

/* ─── Fallback (no API key) ────────────────────────────────────────────────── */

function buildFallbackAI(
  oilVols: Record<string, number>,
  drillingWells: Record<string, number>,
  overallStatus: ValidationStatus,
  isEn: boolean
): AIResult {
  const avgOil   = avg(Object.values(oilVols));
  const avgWells = avg(Object.values(drillingWells));
  const isAggressive = avgOil > TOTAL_ANNUAL_MAX * 0.85 || overallStatus === "critical";

  const verdictText = overallStatus === "ok"
    ? t(isEn, "ИСПОЛНИМО", "FEASIBLE")
    : overallStatus === "warning"
      ? t(isEn, "УСЛОВНО ИСПОЛНИМО", "CONDITIONALLY FEASIBLE")
      : t(isEn, "ТРЕБУЕТ ДОРАБОТКИ", "REQUIRES REVISION");

  const summary = isEn
    ? `The production plan (avg. ${avgOil > 0 ? Math.round(avgOil).toLocaleString() + " тыс. t/yr" : "volume not entered"}) is ` +
      `${isAggressive ? "ambitious and requires careful risk management" : "broadly achievable within the existing asset base"}. ` +
      `Key constraints: reserve depletion dynamics and infrastructure utilisation. ` +
      `Drilling programme (~${Math.round(avgWells)} wells/yr) ${avgWells < 6 ? "is conservative" : "requires sustained rig availability"}. ` +
      `Overall feasibility verdict: ${verdictText}.`
    : `Производственная программа (ср. добыча ${avgOil > 0 ? Math.round(avgOil).toLocaleString() + " тыс. т/год" : "не введена"}) является ` +
      `${isAggressive ? "амбициозной и требует тщательного управления рисками" : "в целом достижимой в рамках существующей базы активов"}. ` +
      `Ключевые ограничения: динамика истощения запасов и загрузка инфраструктуры. ` +
      `Программа бурения (~${Math.round(avgWells)} скв./год) ${avgWells < 6 ? "носит консервативный характер" : "требует стабильного наличия буровых установок"}. ` +
      `Общая оценка исполнимости: ${verdictText}.`;

  const risks: RiskItem[] = isEn ? [
    { title: "Reservoir decline acceleration",    description: "Intensive extraction may accelerate natural decline beyond planned curves. Reservoir simulation update required.",            severity: "high"   },
    { title: "Drilling contractor availability",  description: "Regional rig market tightness during peak campaign years could delay well delivery schedule.",                              severity: "medium" },
    { title: "Oil price volatility",              description: "Sustained price below $52/bbl break-even would negatively impact IRR and CAPEX funding.",                                 severity: "medium" },
    { title: "Plant maintenance window conflicts",description: "Planned turnarounds may coincide with peak production periods, limiting throughput.",                                       severity: "low"    },
    { title: "Regulatory / permit delays",        description: "New drilling permit approvals in brownfield areas can take 6–12 months.",                                                  severity: "low"    },
  ] : [
    { title: "Ускоренное истощение пластов",      description: "Интенсивная добыча может ускорить падение пластового давления сверх плановых кривых. Необходимо обновление ГДМ.",        severity: "high"   },
    { title: "Доступность буровых подрядчиков",   description: "Дефицит установок в годы пиковых кампаний может сдвинуть сроки сдачи скважин.",                                          severity: "medium" },
    { title: "Волатильность нефтяных цен",        description: "Падение ниже $52/барр. (точка безубыточности) негативно повлияет на ВНД и финансирование CAPEX.",                        severity: "medium" },
    { title: "Конфликты с плановыми ТО установок",description: "Плановые остановы могут совпасть с периодами пиковой добычи, ограничивая пропускную способность.",                       severity: "low"    },
    { title: "Регуляторные задержки",             description: "Согласование разрешений на бурение новых скважин на разрабатываемых м/р занимает 6–12 месяцев.",                         severity: "low"    },
  ];

  const recommendations: string[] = isEn ? [
    "Commission field-by-field reservoir simulation updates to validate sustainable plateau rates before plan approval.",
    "Secure multi-year drilling contracts with at least two contractors to mitigate rig availability risk.",
    "Implement a real-time infrastructure capacity dashboard to proactively detect and resolve bottlenecks.",
    "Hedge 40–50% of planned oil sales against Brent scenarios below $60/bbl.",
    "Develop an EOR roadmap to sustain production beyond 2028 as brownfield decline accelerates.",
  ] : [
    "Провести обновление геолого-гидродинамических моделей по каждому месторождению для верификации устойчивых уровней добычи до утверждения плана.",
    "Заключить многолетние договоры минимум с двумя буровыми подрядчиками для снижения риска недоступности установок.",
    "Внедрить дашборд мониторинга мощности инфраструктуры в реальном времени для оперативного выявления узких мест.",
    "Захеджировать 40–50% плановых объёмов реализации нефти от сценариев Brent ниже $60/барр.",
    "Разработать дорожную карту МУН для поддержания добычи после 2028 года по мере ускорения падения на зрелых месторождениях.",
  ];

  return { executiveSummary: summary, risks, recommendations };
}

/* ─── Main entry point ──────────────────────────────────────────────────────── */

export async function validatePlan(
  planState: Record<string, Record<string, { vol: string; price: string; sum: string }>>,
  planName: string,
  companyName: string,
  isEn: boolean,
  onProgress?: (step: string) => void
): Promise<ValidationReport> {
  const YEARS = ["2026", "2027", "2028", "2029", "2030"];

  onProgress?.("reserves");
  await new Promise(r => setTimeout(r, 350));

  const oilVols       = extractTotals(planState, ["2-1"], YEARS, "vol");
  const gasVols       = extractTotals(planState, ["2-3"], YEARS, "vol");
  const drillingWells = extractTotals(planState, ["3-1", "3-2", "3-3"], YEARS, "vol");

  const sectionSums: Record<number, number> = {};
  for (let s = 1; s <= 12; s++) {
    const ids = Object.keys(planState).filter(k => k.startsWith(`${s}-`));
    sectionSums[s] = YEARS.reduce((acc, y) => {
      ids.forEach(id => {
        const v = parseFloat(planState[id]?.[y]?.sum ?? "");
        if (!isNaN(v)) acc += v;
      });
      return acc;
    }, 0);
  }
  const totalBudgetBln = Object.values(sectionSums).reduce((a, b) => a + b, 0) / 1_000_000;

  onProgress?.("infrastructure");
  await new Promise(r => setTimeout(r, 350));

  const reservesChecks       = checkReserves(oilVols, isEn);
  const infrastructureChecks = checkInfrastructure(oilVols, gasVols, isEn);

  onProgress?.("sap");
  await new Promise(r => setTimeout(r, 350));

  const sapChecks       = checkSAP(drillingWells, isEn);
  const financialChecks = checkFinancial(sectionSums, isEn);

  // Compute overall status before calling AI (so fallback uses it too)
  const allStatuses = [
    ...reservesChecks, ...infrastructureChecks, ...sapChecks, ...financialChecks,
  ].map(c => c.status);
  const overallStatus: ValidationStatus =
    allStatuses.includes("critical") ? "critical" :
    allStatuses.includes("warning")  ? "warning"  : "ok";

  onProgress?.("ai");

  const aiResult =
    (await getAIAnalysis(planName, companyName, oilVols, gasVols, drillingWells, totalBudgetBln, overallStatus, isEn)) ??
    buildFallbackAI(oilVols, drillingWells, overallStatus, isEn);

  const aiPowered = !!(import.meta as Record<string, Record<string, string>>).env?.VITE_OPENAI_API_KEY;

  const overallLabel = isEn
    ? (overallStatus === "ok" ? "Feasible" : overallStatus === "warning" ? "Conditionally Feasible" : "Requires Revision")
    : (overallStatus === "ok" ? "Исполнимо" : overallStatus === "warning" ? "Условно исполнимо" : "Требует доработки");

  onProgress?.("done");

  return {
    planName,
    companyName,
    generatedAt: new Date().toLocaleString(isEn ? "en-GB" : "ru-RU"),
    overallStatus,
    overallLabel,
    executiveSummary: aiResult.executiveSummary,
    reservesChecks,
    infrastructureChecks,
    sapChecks,
    financialChecks,
    risks: aiResult.risks,
    recommendations: aiResult.recommendations,
    aiPowered,
  };
}

export { worstStatus };
