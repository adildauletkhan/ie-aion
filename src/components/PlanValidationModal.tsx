/**
 * Plan Validation Modal
 * AI-powered feasibility report — styled to match the system design system.
 */
import { useState, useEffect, useCallback } from "react";
import {
  ShieldCheck, ShieldAlert, ShieldX, Loader2, ChevronDown, ChevronUp,
  Database, Cpu, BarChart2, DollarSign, AlertTriangle, Sparkles,
  CheckCircle2, XCircle, X, Printer, RefreshCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  validatePlan, worstStatus,
  type ValidationReport, type ValidationStatus, type CheckItem, type RiskItem,
} from "@/lib/planValidation";

/* ─── Props ──────────────────────────────────────────────────────────────── */
interface Props {
  isOpen: boolean;
  onClose: () => void;
  isEn: boolean;
  planName: string;
  companyName: string;
  planState: Record<string, Record<string, { vol: string; price: string; sum: string }>>;
}

/* ─── Loading steps ──────────────────────────────────────────────────────── */
const STEPS = (isEn: boolean) => [
  { id: "reserves",       icon: Database,    label: isEn ? "Loading reserves database…"         : "Загрузка данных по запасам…" },
  { id: "infrastructure", icon: BarChart2,   label: isEn ? "Checking infrastructure capacity…"  : "Проверка мощности инфраструктуры…" },
  { id: "sap",            icon: Cpu,         label: isEn ? "Querying SAP ERP resources…"         : "Запрос ресурсов SAP (ERP)…" },
  { id: "ai",             icon: Sparkles,    label: isEn ? "AI feasibility analysis…"            : "ИИ-анализ исполнимости…" },
  { id: "done",           icon: CheckCircle2,label: isEn ? "Report ready"                        : "Отчёт сформирован" },
];

/* ─── Status helpers — only system design tokens ─────────────────────────── */
function statusCls(s: ValidationStatus) {
  if (s === "ok")      return { text: "text-success",     bg: "bg-success/10",     border: "border-success/40",     bar: "bg-success",     dot: "bg-success"     };
  if (s === "warning") return { text: "text-warning",     bg: "bg-warning/10",     border: "border-warning/40",     bar: "bg-warning",     dot: "bg-warning"     };
  return                      { text: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/40", bar: "bg-destructive", dot: "bg-destructive" };
}
function severityCls(s: RiskItem["severity"]) {
  if (s === "high")   return { wrap: "border-destructive/30 bg-destructive/8", text: "text-destructive", badge: "bg-destructive/15 text-destructive" };
  if (s === "medium") return { wrap: "border-warning/30 bg-warning/8",         text: "text-warning",     badge: "bg-warning/15 text-warning"         };
  return                     { wrap: "border-primary/30 bg-primary/8",         text: "text-primary",     badge: "bg-primary/15 text-primary"         };
}
function statusBadgeLabel(s: ValidationStatus, isEn: boolean) {
  if (s === "ok")      return isEn ? "OK" : "ОК";
  if (s === "warning") return isEn ? "ВНИМАНИЕ" : "ВНИМАНИЕ";
  return isEn ? "КРИТИЧНО" : "КРИТИЧНО";
}
function severityLabel(s: RiskItem["severity"], isEn: boolean) {
  if (s === "high")   return isEn ? "ВЫСОКИЙ" : "ВЫСОКИЙ";
  if (s === "medium") return isEn ? "СРЕДНИЙ" : "СРЕДНИЙ";
  return isEn ? "НИЗКИЙ" : "НИЗКИЙ";
}
function overallIcon(s: ValidationStatus) {
  if (s === "ok")      return <ShieldCheck className="h-9 w-9 text-success shrink-0" />;
  if (s === "warning") return <ShieldAlert className="h-9 w-9 text-warning shrink-0" />;
  return                      <ShieldX     className="h-9 w-9 text-destructive shrink-0" />;
}

/* ─── Check row ──────────────────────────────────────────────────────────── */
function CheckRow({ item }: { item: CheckItem }) {
  const c = statusCls(item.status);
  return (
    <div className={`rounded-lg border ${c.border} ${c.bg} px-3 py-2.5`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`h-1.5 w-1.5 rounded-full shrink-0 mt-px ${c.dot}`} />
            <span className="text-xs font-semibold text-foreground leading-snug">{item.label}</span>
          </div>
          {(item.value || item.limit) && (
            <div className="mt-1 pl-3.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              {item.value && <span className={`text-xs font-mono font-bold ${c.text}`}>{item.value}</span>}
              {item.limit && <span className="text-[11px] text-muted-foreground">/ {item.limit}</span>}
            </div>
          )}
          {item.notes && (
            <p className="text-[11px] text-muted-foreground mt-0.5 pl-3.5 leading-relaxed">{item.notes}</p>
          )}
        </div>
        {item.utilizationPct !== undefined && (
          <div className="shrink-0 text-right w-16">
            <span className={`text-sm font-bold tabular-nums ${c.text}`}>{item.utilizationPct}%</span>
            <div className="h-1 rounded-full bg-border mt-1 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${c.bar}`}
                style={{ width: `${Math.min(item.utilizationPct, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Collapsible section block ──────────────────────────────────────────── */
function SectionBlock({
  icon: Icon, title, status, isEn, children,
}: { icon: React.ElementType; title: string; status: ValidationStatus; isEn: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  const c = statusCls(status);
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 shrink-0 ${c.text}`} />
          <span className="text-sm font-semibold">{title}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide border ${c.bg} ${c.border} ${c.text}`}>
            {statusBadgeLabel(status, isEn)}
          </span>
        </div>
        {open
          ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
          : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
      </button>
      {open && <div className="p-3 space-y-2">{children}</div>}
    </div>
  );
}

/* ─── Main modal ─────────────────────────────────────────────────────────── */
export function PlanValidationModal({ isOpen, onClose, isEn, planName, companyName, planState }: Props) {
  const [phase, setPhase] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [currentStep, setCurrentStep] = useState("");
  const [report, setReport] = useState<ValidationReport | null>(null);
  const steps = STEPS(isEn);

  const run = useCallback(async () => {
    setPhase("loading");
    setCurrentStep("reserves");
    setReport(null);
    try {
      const r = await validatePlan(planState, planName, companyName, isEn, s => setCurrentStep(s));
      setReport(r);
      setPhase("done");
    } catch {
      setPhase("error");
    }
  }, [planState, planName, companyName, isEn]);

  useEffect(() => { if (isOpen && phase === "idle") void run(); }, [isOpen, phase, run]);
  useEffect(() => { if (!isOpen) setPhase("idle"); }, [isOpen]);

  if (!isOpen) return null;

  const handlePrint = () => {
    if (!report) return;
    const win = window.open("", "_blank", "width=1000,height=700");
    if (!win) return;
    win.document.write(buildPrintHtml(report, isEn));
    win.document.close();
    win.onload = () => { win.focus(); win.print(); };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative bg-background rounded-2xl shadow-2xl border border-border w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-sm leading-snug">
                {isEn ? "AI Plan Validation" : "ИИ-проверка производственного плана"}
              </h2>
              <p className="text-[11px] text-muted-foreground">{planName} · {companyName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {phase === "done" && report && (
              <>
                <Button variant="outline" size="sm" onClick={handlePrint} className="h-8 gap-1.5 text-xs">
                  <Printer className="h-3.5 w-3.5" />
                  {isEn ? "Print" : "Печать"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPhase("idle")} className="h-8 gap-1.5 text-xs">
                  <RefreshCcw className="h-3.5 w-3.5" />
                  {isEn ? "Re-run" : "Перезапустить"}
                </Button>
              </>
            )}
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto">

          {/* Loading */}
          {phase === "loading" && (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-8 px-8">
              <div className="relative">
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-6 w-6 text-primary animate-pulse" />
                </div>
                <Loader2 className="absolute -inset-1 h-[60px] w-[60px] text-primary/20 animate-spin" />
              </div>
              <div className="w-full max-w-xs space-y-3">
                {steps.map((step) => {
                  const idx    = steps.findIndex(s => s.id === step.id);
                  const cur    = steps.findIndex(s => s.id === currentStep);
                  const done   = idx < cur;
                  const active = step.id === currentStep;
                  return (
                    <div key={step.id} className="flex items-center gap-3">
                      <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 transition-all ${
                        done   ? "bg-success text-success-foreground" :
                        active ? "bg-primary text-primary-foreground" :
                                 "bg-muted text-muted-foreground"
                      }`}>
                        {done   ? <CheckCircle2 className="h-3.5 w-3.5" />
                        : active ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <step.icon className="h-3.5 w-3.5" />}
                      </div>
                      <span className={`text-sm transition-colors ${
                        active ? "text-foreground font-medium" :
                        done   ? "text-muted-foreground/60 line-through" :
                                 "text-muted-foreground/40"
                      }`}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Error */}
          {phase === "error" && (
            <div className="flex flex-col items-center justify-center min-h-[300px] gap-4 text-center px-8">
              <XCircle className="h-10 w-10 text-destructive" />
              <p className="text-sm text-muted-foreground">
                {isEn ? "Validation failed. Please try again." : "Ошибка проверки. Попробуйте снова."}
              </p>
              <Button size="sm" onClick={() => setPhase("idle")}>
                {isEn ? "Retry" : "Повторить"}
              </Button>
            </div>
          )}

          {/* Report */}
          {phase === "done" && report && (
            <div className="p-5 space-y-4">

              {/* Overall verdict banner */}
              <div className={`rounded-xl border-2 p-4 flex items-start gap-4 ${
                report.overallStatus === "ok"
                  ? "border-success/40 bg-success/5"
                  : report.overallStatus === "warning"
                    ? "border-warning/40 bg-warning/5"
                    : "border-destructive/40 bg-destructive/5"
              }`}>
                {overallIcon(report.overallStatus)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center flex-wrap gap-2 mb-1.5">
                    <span className="text-base font-bold">{report.overallLabel}</span>
                    {report.aiPowered
                      ? (
                        <Badge variant="outline" className="text-[10px] gap-1 border-primary/30 text-primary bg-primary/5">
                          <Sparkles className="h-2.5 w-2.5" /> GPT-4o
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">
                          {isEn ? "Simulated AI" : "Имитация ИИ"}
                        </Badge>
                      )
                    }
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{report.executiveSummary}</p>
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    <span className="text-[11px] text-muted-foreground/60">
                      {isEn ? "Generated" : "Сформировано"}: {report.generatedAt}
                    </span>
                    {!report.aiPowered && (
                      <span className="text-[11px] text-amber-600 dark:text-amber-400">
                        {isEn
                          ? "Set VITE_OPENAI_API_KEY in .env for live GPT-4o analysis"
                          : "Укажите VITE_OPENAI_API_KEY в .env для подключения GPT-4o"}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Check sections */}
              <SectionBlock
                icon={Database}
                title={isEn ? "Reserves & Geology" : "Запасы и геология"}
                status={worstStatus(report.reservesChecks)}
                isEn={isEn}
              >
                {report.reservesChecks.map((c, i) => <CheckRow key={i} item={c} />)}
              </SectionBlock>

              <SectionBlock
                icon={BarChart2}
                title={isEn ? "Infrastructure Capacity" : "Мощность инфраструктуры"}
                status={worstStatus(report.infrastructureChecks)}
                isEn={isEn}
              >
                {report.infrastructureChecks.map((c, i) => <CheckRow key={i} item={c} />)}
              </SectionBlock>

              <SectionBlock
                icon={Cpu}
                title={isEn ? "SAP Resources & Equipment" : "Ресурсы и оборудование (SAP)"}
                status={worstStatus(report.sapChecks)}
                isEn={isEn}
              >
                {report.sapChecks.map((c, i) => <CheckRow key={i} item={c} />)}
              </SectionBlock>

              <SectionBlock
                icon={DollarSign}
                title={isEn ? "Financial Feasibility" : "Финансовая исполнимость"}
                status={worstStatus(report.financialChecks)}
                isEn={isEn}
              >
                {report.financialChecks.map((c, i) => <CheckRow key={i} item={c} />)}
              </SectionBlock>

              {/* Risks */}
              <div className="border border-border rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 bg-muted/30 border-b">
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                  <span className="text-sm font-semibold">{isEn ? "Key Risks" : "Ключевые риски"}</span>
                  <span className="ml-auto text-[11px] text-muted-foreground">{report.risks.length}</span>
                </div>
                <div className="p-3 space-y-2">
                  {report.risks.map((r, i) => {
                    const c = severityCls(r.severity);
                    return (
                      <div key={i} className={`rounded-lg border px-3 py-2.5 ${c.wrap}`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-xs font-semibold ${c.text}`}>{r.title}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase shrink-0 ${c.badge}`}>
                            {severityLabel(r.severity, isEn)}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{r.description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recommendations */}
              <div className="border border-primary/25 rounded-xl overflow-hidden bg-primary/5">
                <div className="flex items-center gap-2 px-4 py-3 bg-primary/10 border-b border-primary/20">
                  <Sparkles className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-sm font-semibold text-primary">
                    {isEn ? "Recommendations" : "Рекомендации"}
                  </span>
                </div>
                <ol className="p-3 space-y-2">
                  {report.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="shrink-0 h-5 w-5 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center mt-0.5">
                        {i + 1}
                      </span>
                      <p className="text-xs leading-relaxed text-foreground/90">{rec}</p>
                    </li>
                  ))}
                </ol>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Print HTML ─────────────────────────────────────────────────────────── */
function buildPrintHtml(r: ValidationReport, isEn: boolean): string {
  const sBg  = (s: ValidationStatus) => s === "ok" ? "#d1fae5" : s === "warning" ? "#fef3c7" : "#fee2e2";
  const sFg  = (s: ValidationStatus) => s === "ok" ? "#065f46" : s === "warning" ? "#92400e" : "#991b1b";
  const svBg = (s: string) => s === "high" ? "#fee2e2" : s === "medium" ? "#fef3c7" : "#dbeafe";
  const svFg = (s: string) => s === "high" ? "#991b1b" : s === "medium" ? "#92400e" : "#1e40af";
  const sLabel = (s: ValidationStatus) => s === "ok" ? (isEn ? "OK" : "ОК") : s === "warning" ? (isEn ? "WARNING" : "ВНИМАНИЕ") : (isEn ? "CRITICAL" : "КРИТИЧНО");

  const checksTable = (items: CheckItem[], title: string) => `
    <h3 style="font-size:11px;font-weight:700;color:#1e293b;margin:14px 0 5px;text-transform:uppercase;letter-spacing:.04em;">${title}</h3>
    <table style="width:100%;border-collapse:collapse;font-size:10px;margin-bottom:6px;">
      <thead><tr style="background:#f8fafc;">
        <th style="text-align:left;padding:4px 7px;border:1px solid #e2e8f0;">${isEn ? "Check" : "Проверка"}</th>
        <th style="text-align:left;padding:4px 7px;border:1px solid #e2e8f0;">${isEn ? "Value" : "Значение"}</th>
        <th style="text-align:left;padding:4px 7px;border:1px solid #e2e8f0;">${isEn ? "Limit" : "Предел"}</th>
        <th style="text-align:center;padding:4px 7px;border:1px solid #e2e8f0;width:48px;">${isEn ? "Load %" : "Нагр.%"}</th>
        <th style="text-align:center;padding:4px 7px;border:1px solid #e2e8f0;width:70px;">${isEn ? "Status" : "Статус"}</th>
      </tr></thead>
      <tbody>
        ${items.map(c => `<tr>
          <td style="padding:4px 7px;border:1px solid #e2e8f0;">${c.label}<br/>
            <span style="font-size:8.5px;color:#64748b;">${c.notes}</span></td>
          <td style="padding:4px 7px;border:1px solid #e2e8f0;font-weight:600;">${c.value}</td>
          <td style="padding:4px 7px;border:1px solid #e2e8f0;color:#64748b;">${c.limit ?? "—"}</td>
          <td style="padding:4px 7px;border:1px solid #e2e8f0;text-align:center;">${c.utilizationPct !== undefined ? c.utilizationPct + "%" : "—"}</td>
          <td style="padding:4px 7px;border:1px solid #e2e8f0;text-align:center;background:${sBg(c.status)};color:${sFg(c.status)};font-weight:700;font-size:9px;">${sLabel(c.status)}</td>
        </tr>`).join("")}
      </tbody>
    </table>`;

  return `<!DOCTYPE html><html lang="${isEn ? "en" : "ru"}">
<head><meta charset="UTF-8"/><title>${isEn ? "Plan Validation Report" : "Отчёт о проверке плана"} — ${r.planName}</title>
<style>
  @page { size: A4; margin: 14mm 12mm; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10px; color: #1e293b; margin: 0; line-height: 1.4; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head>
<body>
  <div style="border-bottom:2px solid #1e3a8a;padding-bottom:10px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:flex-end;">
    <div>
      <div style="font-size:15px;font-weight:800;color:#1e3a8a;">${r.companyName}</div>
      <div style="font-size:11px;font-weight:600;color:#475569;margin-top:1px;">${isEn ? "Production Plan Validation Report" : "Отчёт о проверке производственного плана"}</div>
      <div style="font-size:9.5px;color:#94a3b8;margin-top:2px;">${isEn ? "Plan" : "План"}: <b>${r.planName}</b></div>
    </div>
    <div style="text-align:right;">
      <div style="display:inline-block;padding:5px 14px;border-radius:5px;background:${sBg(r.overallStatus)};color:${sFg(r.overallStatus)};font-weight:800;font-size:12px;">${r.overallLabel}</div>
      <div style="font-size:8.5px;color:#94a3b8;margin-top:3px;">${isEn ? "Generated" : "Сформировано"}: ${r.generatedAt} · ${r.aiPowered ? "GPT-4o" : (isEn ? "Simulated AI" : "Имитация ИИ")}</div>
    </div>
  </div>

  <div style="background:#f1f5f9;border-left:3px solid #1e3a8a;padding:7px 10px;margin-bottom:12px;font-size:10px;line-height:1.6;border-radius:0 4px 4px 0;">
    <b>${isEn ? "Summary:" : "Заключение:"}</b> ${r.executiveSummary}
  </div>

  ${checksTable(r.reservesChecks, isEn ? "Reserves & Geology" : "Запасы и геология")}
  ${checksTable(r.infrastructureChecks, isEn ? "Infrastructure Capacity" : "Мощность инфраструктуры")}
  ${checksTable(r.sapChecks, isEn ? "SAP Resources & Equipment" : "Ресурсы и оборудование (SAP)")}
  ${checksTable(r.financialChecks, isEn ? "Financial Feasibility" : "Финансовая исполнимость")}

  <h3 style="font-size:11px;font-weight:700;color:#1e293b;margin:14px 0 6px;text-transform:uppercase;">${isEn ? "Key Risks" : "Ключевые риски"}</h3>
  ${r.risks.map(risk => `
    <div style="margin-bottom:5px;padding:5px 9px;border-left:3px solid ${svFg(risk.severity)};background:${svBg(risk.severity)};border-radius:0 4px 4px 0;">
      <span style="font-weight:700;font-size:10px;">${risk.title}</span>
      <span style="float:right;font-size:8.5px;font-weight:700;color:${svFg(risk.severity)};text-transform:uppercase;">${risk.severity}</span>
      <p style="margin:2px 0 0;font-size:9px;color:#475569;">${risk.description}</p>
    </div>`).join("")}

  <h3 style="font-size:11px;font-weight:700;color:#1e3a8a;margin:14px 0 6px;text-transform:uppercase;">${isEn ? "Recommendations" : "Рекомендации"}</h3>
  <ol style="margin:0;padding-left:16px;">
    ${r.recommendations.map(rec => `<li style="margin-bottom:4px;font-size:10px;line-height:1.5;">${rec}</li>`).join("")}
  </ol>
</body></html>`;
}
