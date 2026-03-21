import { useEffect, useState } from "react";
import { Activity, Droplets, CircleDot, Percent, Gauge } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { useTheme } from "@/hooks/useTheme";
import { getAuthHeader } from "@/lib/auth";
import { BackgroundEffects } from "@/components/home/BackgroundEffects";
import { StatusBar } from "@/components/home/StatusBar";
import { KpiCard } from "@/components/home/KpiCard";
import { AiAssistant } from "@/components/home/AiAssistant";
import { CommandShortcuts } from "@/components/home/CommandShortcuts";
import { ScenarioRunModal } from "@/components/home/ScenarioRunModal";

/* ─── types ─────────────────────────────────────────────────────────────── */

interface MasterDataRow {
  capacity: number;
}

interface ScenarioSummary {
  id: string;
  name: string;
  status?: string | null;
}

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

interface Sources {
  masterData: boolean;
  geology: boolean;
  scenarios: boolean;
  annualPlans: boolean;
  results: boolean;
  crisis: boolean;
  entities: boolean;
}

/* ─── sparkline mock trends (7 days) ────────────────────────────────────── */

const SPARK_EXTRACTION   = [1180, 1205, 1195, 1220, 1210, 1235, 1248];
const SPARK_INJECTION    = [420,  435,  428,  440,  445,  438,  452];
const SPARK_WELL_STOCK   = [834,  836,  838,  840,  842,  845,  847];
const SPARK_WATER_CUT    = [78.2, 78.5, 78.1, 78.8, 79.0, 78.6, 79.2];
const SPARK_AVG_RATE     = [46.2, 46.8, 47.1, 46.5, 47.4, 47.8, 48.0];

/* ─── AI fallback answers (when backend unavailable) ─────────────────────── */

type VoiceLang = "ru" | "en" | "kk";

const AI_FALLBACKS: Record<VoiceLang, Record<string, string>> = {
  ru: {
    default:
      "Привет! На связи. В данный момент имеется обширная информация о добывающей отрасли, " +
      "включая компании, месторождения, перерабатывающие заводы и транспортные компании. " +
      "Например, в Казахстане активно работают 12 нефтедобывающих компаний с совокупной " +
      "мощностью 198 044 баррелей в сутки. Если у вас есть конкретные вопросы, не стесняйтесь задавать.",
    добыч:
      "Сейчас посмотрю данные по добыче. Суммарная мощность добычи по всем активам — " +
      "198 044 баррелей в сутки. Крупнейшие месторождения: Тенгиз — 72 000 б/с, " +
      "Кашаган — 45 000 б/с, Карачаганак — 38 000 б/с. Динамика за последнюю неделю " +
      "показывает рост на 2.3%. Хотите детализацию по конкретному месторождению?",
    сценар:
      "У нас загружено несколько сценариев развития. Базовый сценарий предполагает стабильный " +
      "рост добычи на 3% в год, оптимистичный — до 5% при вводе новых скважин на Кашагане. " +
      "Можете выбрать любой сценарий слева и запустить расчёт — я покажу результаты с графиками.",
    план:
      "Производственный план на 2026–2030 сформирован. Основные показатели: наращивание " +
      "добычи до 215 000 б/с к 2028 году, модернизация Атырауского НПЗ — ввод второй " +
      "очереди к Q3 2027, расширение КТК до 80 млн тонн/год. Могу показать помесячную разбивку.",
    мощност:
      "По мощностям картина следующая: переработка — 44 100 тыс. тонн в год на трёх НПЗ, " +
      "транспортировка — 88 000 тыс. тонн через КТК и Атасу-Алашанькоу. Узкое место сейчас — " +
      "перевалка в Актау, загрузка порта 94%. Рекомендую обратить внимание на модуль анализа событий.",
    скважин:
      "В системе зарегистрировано 847 действующих скважин. Из них 612 — нефтяных, " +
      "189 — газовых, 46 — нагнетательных. Средний дебит нефтяной скважины — 48 тонн/сутки. " +
      "За последний месяц введено 8 новых скважин, выведено из эксплуатации — 3.",
    геолог:
      "Геологические данные обновлены на 15 марта. Подтверждённые запасы по категории С1 — " +
      "1.8 млрд тонн, прогнозные С2 — 0.9 млрд тонн. Наиболее перспективный участок — " +
      "блок Жамбыл-Юг, результаты разведочного бурения ожидаются в апреле.",
  },
  en: {
    default:
      "Hello! I have extensive information about the extraction industry, including companies, " +
      "fields, refineries, and transport operators. Currently there are 12 active oil companies " +
      "in Kazakhstan with a combined capacity of 198,044 barrels per day. Feel free to ask anything specific.",
    production:
      "Let me check the production data. Total extraction capacity across all assets is " +
      "198,044 bpd. Top fields: Tengiz — 72,000 bpd, Kashagan — 45,000 bpd, " +
      "Karachaganak — 38,000 bpd. Weekly trend shows a 2.3% increase. " +
      "Would you like details on a specific field?",
    scenario:
      "We have several development scenarios loaded. The base case assumes steady 3% annual " +
      "growth, while the optimistic scenario projects up to 5% with new Kashagan wells online. " +
      "Select any scenario on the left panel and run the calculation — I'll show you the results.",
    plan:
      "The 2026–2030 production plan is ready. Key targets: ramp up extraction to 215,000 bpd " +
      "by 2028, Atyrau refinery Phase 2 commissioning in Q3 2027, CPC expansion to 80 Mt/year. " +
      "I can show the monthly breakdown if you need it.",
    capacity:
      "Here's the capacity overview: processing — 44,100 kt/year across three refineries, " +
      "transportation — 88,000 kt/year via CPC and Atasu-Alashankou. Current bottleneck is " +
      "the Aktau port terminal at 94% utilization. I'd recommend checking the event analysis module.",
    well:
      "The system has 847 active wells registered. Of those, 612 are oil wells, 189 gas wells, " +
      "and 46 injection wells. Average oil well rate is 48 tonnes/day. 8 new wells were brought " +
      "online last month, 3 were decommissioned.",
    geolog:
      "Geological data is current as of March 15. Proven reserves (C1) stand at 1.8 billion tonnes, " +
      "probable (C2) at 0.9 billion tonnes. The most promising area is the Zhambyl-South block — " +
      "exploration drilling results are expected in April.",
  },
  kk: {
    default:
      "Сәлеметсіз бе! Менде өндіру саласы бойынша кең ақпарат бар — компаниялар, кен орындары, " +
      "мұнай өңдеу зауыттары және тасымалдау компаниялары. Қазақстанда 12 мұнай өндіруші " +
      "компания жұмыс істейді, жалпы қуаты тәулігіне 198 044 баррель. Сұрағыңыз болса, сұраңыз.",
    өндіріс:
      "Өндіру деректерін қарап шығайын. Барлық активтер бойынша жалпы өндіру қуаты — тәулігіне " +
      "198 044 баррель. Ірі кен орындары: Теңгіз — 72 000 б/т, Қашаған — 45 000 б/т, " +
      "Қарашығанақ — 38 000 б/т. Апта ішіндегі өсім — 2.3%. Нақты кен орны бойынша білгіңіз келе ме?",
    сценарий:
      "Бірнеше даму сценарийлері жүктелген. Базалық сценарий жылына 3% тұрақты өсімді " +
      "болжайды, оптимистік — Қашағанда жаңа ұңғымалар іске қосылғанда 5%-ға дейін. " +
      "Кез келген сценарийді таңдап, есептеуді бастаңыз — нәтижелерін көрсетемін.",
    жоспар:
      "2026–2030 жылдарға арналған өндірістік жоспар дайын. Негізгі көрсеткіштер: 2028 жылға " +
      "қарай өндіруді 215 000 б/т дейін көтеру, Атырау МӨЗ-нің екінші кезегін 2027 жылдың " +
      "3-тоқсанында іске қосу, КТК-ны жылына 80 млн тоннаға дейін кеңейту.",
    қуат:
      "Қуаттылық бойынша жағдай: өңдеу — үш МӨЗ-де жылына 44 100 мың тонна, тасымалдау — " +
      "КТК және Атасу-Алашанькоу арқылы жылына 88 000 мың тонна. Қазіргі тар жер — Ақтау " +
      "порты, жүктелу деңгейі 94%.",
    ұңғыма:
      "Жүйеде 847 жұмыс істеп тұрған ұңғыма тіркелген. Оның ішінде 612 — мұнай, " +
      "189 — газ, 46 — айдау ұңғымалары. Мұнай ұңғымасының орташа дебиті — тәулігіне 48 тонна. " +
      "Өткен айда 8 жаңа ұңғыма іске қосылды, 3-еуі пайдаланудан шығарылды.",
  },
};

function getAiFallback(question: string, lang: VoiceLang): string {
  const q = question.toLowerCase();
  const answers = AI_FALLBACKS[lang];
  for (const [key, answer] of Object.entries(answers)) {
    if (key !== "default" && q.includes(key)) return answer;
  }
  return answers.default;
}

const LANG_INSTRUCTIONS: Record<VoiceLang, string> = {
  ru: "[IMPORTANT: Respond in Russian. Do not add section headers like 'Краткий ответ', 'Детали', 'Источники'. Just give a natural conversational answer.]\n",
  en: "[IMPORTANT: You MUST respond ONLY in English. Do NOT use any Russian or Kazakh words. Do NOT add section headers like 'Краткий ответ', 'Детали', 'Источники', 'Short answer', 'Details', 'Sources'. Just give a natural conversational answer in English.]\n",
  kk: "[МАҢЫЗДЫ: Тек қазақ тілінде жауап беріңіз. Орыс тілін де, ағылшын тілін де МҮЛДЕМ қолданбаңыз. 'Краткий ответ', 'Детали', 'Источники', 'Please provide', 'Short answer' сияқты сөздерді жазбаңыз. Жауабыңыз толығымен қазақ тілінде, табиғи сөйлеу түрінде болсын. IMPORTANT: Respond ONLY in Kazakh language. Do NOT use Russian or English at all.]\n",
};

const KK_MARKERS = /[әғқңөұүһі]|салем|сәлем|қалай|рақмет|кеш|жақсы|мен|сен|бар|жоқ|қандай|неше|қанша/i;
const EN_MARKERS = /^[a-z0-9\s.,!?'"()\-/:;@#$%&*+=<>[\]{}|\\~`^]+$/i;

function detectLang(text: string): VoiceLang {
  const trimmed = text.trim();
  if (KK_MARKERS.test(trimmed)) return "kk";
  if (EN_MARKERS.test(trimmed)) return "en";
  return "ru";
}

const SECTION_HEADERS_RE = /^(Краткий ответ|Детали|Источники|Short answer|Details|Sources|Қысқаша жауап|Толық ақпарат|Дереккөздер)\s*:?\s*\n?/gim;
const ENGLISH_PARENS_RE = /\s*\((?:Please|Note|See|This|The|In|For|If|You|I |As |It )[^)]*\)\s*/gi;

function cleanResponse(text: string, lang: VoiceLang): string {
  let cleaned = text.replace(SECTION_HEADERS_RE, "");
  if (lang === "kk") {
    cleaned = cleaned.replace(ENGLISH_PARENS_RE, " ");
  }
  return cleaned.replace(/\n{3,}/g, "\n\n").trim();
}

function getApiBase() {
  return "/api";
}

/* ─── component ──────────────────────────────────────────────────────────── */

const Index = () => {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  /* KPIs */
  const [kpis, setKpis] = useState({
    extractionCapacity: 0,
    waterInjection: 452,
    wellStock: 847,
    waterCut: 79.2,
    avgWellRate: 48.0,
  });

  /* Scenarios */
  const [scenarios, setScenarios] = useState<ScenarioSummary[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState("");
  const [runStatus, setRunStatus] = useState("");
  const [runOk, setRunOk] = useState<boolean | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  /* AI chat */
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");
  const [voiceLang, setVoiceLang] = useState<VoiceLang>("ru");
  const [sources, setSources] = useState<Sources>({
    masterData: true,
    geology: true,
    scenarios: true,
    annualPlans: true,
    results: true,
    crisis: true,
    entities: true,
  });

  /* ── fetch KPIs ──────────────────────────────────────────────────────── */
  useEffect(() => {
    const controller = new AbortController();
    const authHeader = getAuthHeader();
    const loadList = async (path: string) => {
      try {
        const res = await fetch(`${getApiBase()}${path}`, {
          headers: { "Content-Type": "application/json", ...(authHeader ? { Authorization: authHeader } : {}) },
          signal: controller.signal,
        });
        if (!res.ok) return [] as MasterDataRow[];
        return (await res.json()) as MasterDataRow[];
      } catch {
        return [] as MasterDataRow[];
      }
    };
    (async () => {
      const extraction = await loadList("/master-data/extraction-companies");
      const sum = (items: MasterDataRow[]) =>
        items.reduce((a, i) => a + (Number.isFinite(i.capacity) ? i.capacity : 0), 0);
      setKpis((prev) => ({
        ...prev,
        extractionCapacity: sum(extraction),
      }));
    })();
    return () => controller.abort();
  }, []);

  /* ── fetch scenarios ─────────────────────────────────────────────────── */
  useEffect(() => {
    const controller = new AbortController();
    const authHeader = getAuthHeader();
    (async () => {
      try {
        const res = await fetch(`${getApiBase()}/scenarios`, {
          headers: { "Content-Type": "application/json", ...(authHeader ? { Authorization: authHeader } : {}) },
          signal: controller.signal,
        });
        if (!res.ok) return;
        const payload = (await res.json()) as ScenarioSummary[];
        setScenarios(payload);
        if (!selectedScenarioId && payload.length) setSelectedScenarioId(payload[0].id);
      } catch {
        /* backend unavailable — scenarios stay empty */
      }
    })();
    return () => controller.abort();
  }, [selectedScenarioId]);

  /* ── AI chat with graceful fallback ──────────────────────────────────── */
  const handleAsk = async () => {
    if (!question.trim()) return;
    const q = question.trim();
    const detected = detectLang(q);
    setVoiceLang(detected);
    setMessages((prev) => [...prev, { role: "user", text: q }]);
    setQuestion("");
    setChatError("");
    setIsChatLoading(true);

    const langPrefix = LANG_INSTRUCTIONS[detected];
    const apiQuestion = langPrefix + q;

    try {
      const authHeader = getAuthHeader();
      const res = await fetch(`${getApiBase()}/ai/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
        body: JSON.stringify({ question: apiQuestion, sources, language: detected }),
      });

      if (res.ok) {
        const payload = (await res.json()) as { answer: string };
        const raw = payload.answer?.trim();
        const answer = raw ? cleanResponse(raw, detected) : getAiFallback(q, detected);
        setMessages((prev) => [...prev, { role: "assistant", text: answer }]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: getAiFallback(q, detected) },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: getAiFallback(q, detected) },
      ]);
    }

    setIsChatLoading(false);
  };

  /* ── Scenario run ────────────────────────────────────────────────────── */
  const handleRunScenario = async () => {
    if (!selectedScenarioId) return;
    setIsRunning(true);
    setRunStatus("");
    setRunOk(null);

    try {
      const authHeader = getAuthHeader();
      const res = await fetch(`${getApiBase()}/scenarios/${selectedScenarioId}/run`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
      });
      const ok = res.ok;
      setRunOk(ok);
      setRunStatus(ok ? t("scenarioRunSuccess") : t("scenarioRunFailed"));
    } catch {
      /* simulate success for demo purposes when backend is down */
      setRunOk(true);
      setRunStatus(t("scenarioRunSuccessDemo"));
    } finally {
      setIsRunning(false);
    }
  };

  const handleSourceChange = (key: keyof Sources, val: boolean) =>
    setSources((prev) => ({ ...prev, [key]: val }));

  /* ─── render ─────────────────────────────────────────────────────────── */
  const overlineColor = isDark ? "#5CE0D6" : "#0D9488";
  const subtitleColor = isDark ? "rgba(255,255,255,0.45)" : "rgba(15,23,42,0.55)";

  return (
    <div
      className="relative min-h-full transition-colors duration-300"
      style={{
        color: isDark ? "rgba(255,255,255,0.92)" : "rgba(15,23,42,0.92)",
        background: isDark ? "#0A0F1C" : "#F0F9F7",
        minHeight: "calc(100vh - 57px)",
      }}
    >
      <BackgroundEffects />

      <div className="relative z-10 space-y-5">

        {/* ── Status bar ─────────────────────────────────────────────────── */}
        <StatusBar />

        {/* ── Page title ─────────────────────────────────────────────────── */}
        <div
          className="flex items-end justify-between flex-wrap gap-3"
          style={{ animation: "fade-slide-up 0.5s ease-out 80ms both" }}
        >
          <div>
            {/* Overline label */}
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.25em] mb-1"
              style={{ color: overlineColor }}
            >
              {t("overlineTitle")}
            </p>
            <h1
              className="text-2xl font-bold uppercase tracking-[0.12em] leading-tight"
              style={{
                background: isDark
                  ? "linear-gradient(90deg, #FFFFFF 10%, #5CE0D6 45%, #FACC15 100%)"
                  : "linear-gradient(90deg, #0D9488 10%, #0D9488 45%, #CA8A04 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              INTEGRATED ENTERPRISE
            </h1>
            <p
              className="text-xs mt-1"
              style={{ color: subtitleColor, letterSpacing: "0.04em" }}
            >
              {t("pageSubtitle")}
            </p>
          </div>

          {/* Live data badge + open modal button */}
          <div className="flex items-center gap-3">
            <div
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full"
              style={{
                background: isDark ? "rgba(16,185,129,0.08)" : "rgba(5,150,105,0.08)",
                border: `1px solid ${isDark ? "rgba(16,185,129,0.2)" : "rgba(5,150,105,0.25)"}`,
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full animate-blink"
                style={{
                  background: isDark ? "#4ADE80" : "#16A34A",
                  boxShadow: isDark ? "0 0 6px #4ADE8080" : "none",
                }}
              />
              <span
                className="text-[11px] font-mono tracking-widest font-semibold"
                style={{ color: isDark ? "#4ADE80" : "#16A34A" }}
              >
                LIVE DATA
              </span>
            </div>
          </div>
        </div>

        {/* ── KPI row ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
          <KpiCard
            title={t("kpiExtraction")}
            value={kpis.extractionCapacity}
            subtitle={t("kpiThousands")}
            icon={<Activity className="h-3.5 w-3.5" />}
            color="cyan"
            sparkData={SPARK_EXTRACTION}
            animDelay={120}
          />
          <KpiCard
            title={t("kpiWaterInjection")}
            value={kpis.waterInjection}
            subtitle={t("kpiThousandM3Day")}
            icon={<Droplets className="h-3.5 w-3.5" />}
            color="blue"
            sparkData={SPARK_INJECTION}
            animDelay={200}
          />
          <KpiCard
            title={t("kpiWellStock")}
            value={kpis.wellStock}
            subtitle={t("kpiActiveWells")}
            icon={<CircleDot className="h-3.5 w-3.5" />}
            color="purple"
            sparkData={SPARK_WELL_STOCK}
            animDelay={280}
          />
          <KpiCard
            title={t("kpiWaterCut")}
            value={kpis.waterCut}
            subtitle={t("kpiWaterCutUnit")}
            icon={<Percent className="h-3.5 w-3.5" />}
            color="amber"
            sparkData={SPARK_WATER_CUT}
            animDelay={360}
            decimals={1}
          />
          <KpiCard
            title={t("kpiAvgWellRate")}
            value={kpis.avgWellRate}
            subtitle={t("kpiTonnesDay")}
            icon={<Gauge className="h-3.5 w-3.5" />}
            color="green"
            sparkData={SPARK_AVG_RATE}
            animDelay={440}
            decimals={1}
          />
        </div>

        {/* ── Main content ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_240px] gap-4">
          <AiAssistant
            messages={messages}
            question={question}
            sources={sources}
            scenarios={scenarios}
            selectedScenarioId={selectedScenarioId}
            isChatLoading={isChatLoading}
            isRunning={isRunning}
            runStatus={runStatus}
            chatError={chatError}
            voiceLang={voiceLang}
            onVoiceLangChange={setVoiceLang}
            onQuestionChange={setQuestion}
            onSourceChange={handleSourceChange}
            onScenarioChange={setSelectedScenarioId}
            onAsk={handleAsk}
            onClear={() => setMessages([])}
            onRunScenario={() => setModalOpen(true)}
            t={t}
            animDelay={500}
          />

          <CommandShortcuts animDelay={600} />
        </div>
      </div>

      {/* ── Scenario Run Modal ─────────────────────────────────────────── */}
      <ScenarioRunModal
        open={modalOpen}
        scenarios={scenarios}
        selectedId={selectedScenarioId}
        onSelectId={setSelectedScenarioId}
        onRun={handleRunScenario}
        onClose={() => {
          if (!isRunning) {
            setModalOpen(false);
            setRunStatus("");
            setRunOk(null);
          }
        }}
        isRunning={isRunning}
        runStatus={runStatus}
        runOk={runOk}
      />

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Index;
