import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Play, X, XCircle, Zap } from "lucide-react";
import { ShimmerButton } from "./ShimmerButton";

interface ScenarioSummary {
  id: string;
  name: string;
  status?: string | null;
}

interface ScenarioRunModalProps {
  open: boolean;
  scenarios: ScenarioSummary[];
  selectedId: string;
  onSelectId: (id: string) => void;
  onRun: () => void;
  onClose: () => void;
  isRunning: boolean;
  runStatus: string;
  runOk: boolean | null;
}

type Phase = "select" | "running" | "done";

const MOCK_STEPS = [
  "Инициализация расчётного движка...",
  "Загрузка мастер-данных...",
  "Применение ограничений мощности...",
  "Расчёт пропускной способности...",
  "Балансировка потоков...",
  "Генерация отчёта...",
];

export function ScenarioRunModal({
  open,
  scenarios,
  selectedId,
  onSelectId,
  onRun,
  onClose,
  isRunning,
  runStatus,
  runOk,
}: ScenarioRunModalProps) {
  const [phase, setPhase] = useState<Phase>("select");
  const [progress, setProgress] = useState(0);
  const [stepIdx, setStepIdx] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* Drive fake progress bar while running */
  useEffect(() => {
    if (isRunning) {
      setPhase("running");
      setProgress(0);
      setStepIdx(0);
      let p = 0;
      let s = 0;
      intervalRef.current = setInterval(() => {
        p = Math.min(p + Math.random() * 12 + 3, 95);
        s = Math.min(s + 1, MOCK_STEPS.length - 1);
        setProgress(p);
        setStepIdx(s);
      }, 420);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (runStatus) {
        setProgress(100);
        setPhase("done");
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, runStatus]);

  /* Reset on open */
  useEffect(() => {
    if (open) {
      setPhase("select");
      setProgress(0);
      setStepIdx(0);
    }
  }, [open]);

  const handleClose = () => {
    if (isRunning) return;
    onClose();
  };

  const selected = scenarios.find((s) => s.id === selectedId);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl overflow-hidden"
        style={{
          background: "rgba(10, 14, 26, 0.97)",
          border: "1px solid rgba(0, 240, 255, 0.2)",
          boxShadow: "0 0 60px rgba(0, 240, 255, 0.08), 0 0 120px rgba(139, 92, 246, 0.06)",
          animation: "fade-slide-up 0.3s ease-out both",
        }}
      >
        {/* Top accent line */}
        <div
          className="absolute top-0 left-0 right-0 h-[1px]"
          style={{ background: "linear-gradient(90deg, transparent, #00F0FF80, #8B5CF660, transparent)" }}
        />

        {/* Header */}
        <div
          className="flex items-center gap-3 px-6 py-4 border-b"
          style={{ borderColor: "rgba(0, 240, 255, 0.1)" }}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: "rgba(0, 240, 255, 0.1)",
              border: "1px solid rgba(0, 240, 255, 0.25)",
            }}
          >
            <Zap className="h-4 w-4" style={{ color: "#00F0FF" }} />
          </div>
          <div className="flex-1 min-w-0">
            <h2
              className="text-sm font-bold uppercase tracking-widest"
              style={{ color: "#00F0FF" }}
            >
              Запуск сценария
            </h2>
            <p className="text-[11px] text-white/30 mt-0.5">Расчёт влияния на цепочку создания стоимости</p>
          </div>
          {!isRunning && (
            <button
              onClick={handleClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
              style={{ color: "rgba(255,255,255,0.3)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.7)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.3)"; }}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">

          {/* ── Phase: select ── */}
          {phase === "select" && (
            <>
              <div className="space-y-2">
                <label
                  className="text-[11px] uppercase tracking-[0.15em] font-semibold"
                  style={{ color: "rgba(0, 240, 255, 0.5)" }}
                >
                  Выберите сценарий
                </label>
                <select
                  value={selectedId}
                  onChange={(e) => onSelectId(e.target.value)}
                  className="w-full h-10 rounded-xl px-3 text-sm outline-none"
                  style={{
                    background: "rgba(0, 240, 255, 0.04)",
                    border: "1px solid rgba(0, 240, 255, 0.15)",
                    color: "rgba(255,255,255,0.85)",
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(0,240,255,0.4)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(0,240,255,0.15)"; }}
                >
                  <option value="" style={{ background: "#0A0E1A" }}>— Выберите сценарий —</option>
                  {scenarios.map((s) => (
                    <option key={s.id} value={s.id} style={{ background: "#0A0E1A" }}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {selected && (
                <div
                  className="rounded-xl p-4 space-y-2"
                  style={{
                    background: "rgba(0, 240, 255, 0.04)",
                    border: "1px solid rgba(0, 240, 255, 0.1)",
                  }}
                >
                  <p className="text-[11px] uppercase tracking-widest" style={{ color: "rgba(0, 240, 255, 0.45)" }}>
                    Выбранный сценарий
                  </p>
                  <p className="text-sm font-semibold text-white/90">{selected.name}</p>
                  {selected.status && (
                    <span
                      className="inline-block text-[10px] px-2 py-0.5 rounded-full uppercase tracking-widest"
                      style={{
                        background: "rgba(16,185,129,0.1)",
                        border: "1px solid rgba(16,185,129,0.25)",
                        color: "#10b981",
                      }}
                    >
                      {selected.status}
                    </span>
                  )}
                  <div className="grid grid-cols-3 gap-3 pt-1">
                    {[
                      { label: "Горизонт", value: "5 лет" },
                      { label: "Этапы", value: "4" },
                      { label: "Активы", value: "12" },
                    ].map(({ label, value }) => (
                      <div key={label} className="text-center">
                        <p className="text-xs font-bold" style={{ color: "#00F0FF" }}>{value}</p>
                        <p className="text-[10px] text-white/30 mt-0.5">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  onClick={handleClose}
                  className="flex-1 h-9 rounded-xl text-sm transition-all"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "rgba(255,255,255,0.5)",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}
                >
                  Отмена
                </button>
                <ShimmerButton
                  onClick={onRun}
                  disabled={!selectedId}
                  className="flex-1 h-9 text-sm"
                >
                  <Play className="h-3.5 w-3.5" />
                  Запустить расчёт
                </ShimmerButton>
              </div>
            </>
          )}

          {/* ── Phase: running ── */}
          {phase === "running" && (
            <div className="space-y-5 py-2">
              <div className="text-center space-y-1">
                <p className="text-[11px] uppercase tracking-widest" style={{ color: "rgba(0,240,255,0.5)" }}>
                  Выполняется расчёт
                </p>
                <p className="text-sm font-semibold text-white/80 truncate">{selected?.name}</p>
              </div>

              {/* Progress bar */}
              <div className="space-y-1.5">
                <div
                  className="h-1.5 rounded-full overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.06)" }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${progress}%`,
                      background: "linear-gradient(90deg, #0ea5e9, #00F0FF)",
                      boxShadow: "0 0 8px rgba(0,240,255,0.5)",
                    }}
                  />
                </div>
                <div className="flex justify-between text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                  <span className="truncate max-w-[85%]">{MOCK_STEPS[stepIdx]}</span>
                  <span className="tabular-nums shrink-0">{Math.round(progress)}%</span>
                </div>
              </div>

              {/* Step indicators */}
              <div className="grid grid-cols-6 gap-1.5">
                {MOCK_STEPS.map((_, i) => (
                  <div
                    key={i}
                    className="h-1 rounded-full transition-all duration-300"
                    style={{
                      background: i <= stepIdx
                        ? "rgba(0,240,255,0.8)"
                        : "rgba(255,255,255,0.08)",
                      boxShadow: i <= stepIdx ? "0 0 4px rgba(0,240,255,0.5)" : "none",
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── Phase: done ── */}
          {phase === "done" && (
            <div className="space-y-5 py-2">
              <div className="flex flex-col items-center gap-3 py-2">
                {runOk !== false ? (
                  <>
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center"
                      style={{
                        background: "rgba(16,185,129,0.12)",
                        border: "1px solid rgba(16,185,129,0.3)",
                        boxShadow: "0 0 20px rgba(16,185,129,0.15)",
                      }}
                    >
                      <CheckCircle2 className="h-7 w-7 text-emerald-400" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-emerald-400">Расчёт завершён</p>
                      <p className="text-[12px] text-white/40 mt-1">{runStatus}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center"
                      style={{
                        background: "rgba(239,68,68,0.12)",
                        border: "1px solid rgba(239,68,68,0.3)",
                      }}
                    >
                      <XCircle className="h-7 w-7 text-red-400" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-red-400">Ошибка расчёта</p>
                      <p className="text-[12px] text-white/40 mt-1">{runStatus}</p>
                    </div>
                  </>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleClose}
                  className="flex-1 h-9 rounded-xl text-sm transition-all"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "rgba(255,255,255,0.5)",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}
                >
                  Закрыть
                </button>
                {runOk !== false && (
                  <ShimmerButton
                    onClick={handleClose}
                    className="flex-1 h-9 text-sm"
                  >
                    Просмотреть результаты →
                  </ShimmerButton>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
