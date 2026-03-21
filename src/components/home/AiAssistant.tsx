import { useCallback, useEffect, useRef, useState } from "react";
import { Send, Trash2, Volume2, VolumeX, Zap, Globe, Mic, MicOff, Square, X } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { ShimmerButton } from "./ShimmerButton";

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

interface ScenarioSummary {
  id: string;
  name: string;
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

interface AiAssistantProps {
  messages: ChatMessage[];
  question: string;
  sources: Sources;
  scenarios: ScenarioSummary[];
  selectedScenarioId: string;
  isChatLoading: boolean;
  isRunning: boolean;
  runStatus: string;
  chatError: string;
  voiceLang: VoiceLang;
  onVoiceLangChange: (lang: VoiceLang) => void;
  onQuestionChange: (q: string) => void;
  onSourceChange: (key: keyof Sources, val: boolean) => void;
  onScenarioChange: (id: string) => void;
  onAsk: () => void;
  onClear: () => void;
  onRunScenario: () => void;
  t: (key: string) => string;
  animDelay?: number;
}

type VoiceLang = "ru" | "en" | "kk";

const VOICE_LANG_MAP: Record<VoiceLang, string> = {
  ru: "ru-RU",
  en: "en-US",
  kk: "kk-KZ",
};

const VOICE_LABELS: Record<VoiceLang, string> = {
  ru: "RU",
  en: "EN",
  kk: "KZ",
};

function useSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const speakViaOpenAI = useCallback(async (text: string, _lang: string): Promise<boolean> => {
    try {
      abortRef.current = new AbortController();
      const res = await fetch("/api/ai/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice: "nova" }),
        signal: abortRef.current.signal,
      });
      if (!res.ok) return false;

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onplay = () => setIsSpeaking(true);
      audio.onended = () => { setIsSpeaking(false); URL.revokeObjectURL(url); };
      audio.onerror = () => { setIsSpeaking(false); URL.revokeObjectURL(url); };
      await audio.play();
      return true;
    } catch {
      return false;
    }
  }, []);

  const speakViaBrowser = useCallback((text: string, lang: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang;
    utter.rate = 0.95;
    utter.pitch = 1.1;

    const voices = window.speechSynthesis.getVoices();
    const match = voices.find((v) => v.lang.startsWith(lang.split("-")[0]));
    if (match) utter.voice = match;

    utter.onstart = () => setIsSpeaking(true);
    utter.onend = () => setIsSpeaking(false);
    utter.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utter);
  }, []);

  const speak = useCallback(async (text: string, lang: string) => {
    const ok = await speakViaOpenAI(text, lang);
    if (!ok) speakViaBrowser(text, lang);
  }, [speakViaOpenAI, speakViaBrowser]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  }, []);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      audioRef.current?.pause();
      window.speechSynthesis?.cancel();
    };
  }, []);

  return { isSpeaking, speak, stop };
}

function useVoiceRecorder(onResult: (text: string) => void) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      recorderRef.current = recorder;
      chunksRef.current = [];
      setElapsed(0);

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (blob.size < 100) return;
        setIsTranscribing(true);
        try {
          const fd = new FormData();
          fd.append("file", blob, "recording.webm");
          const res = await fetch("/api/ai/stt", { method: "POST", body: fd });
          if (res.ok) {
            const data = await res.json();
            if (data.text?.trim()) onResult(data.text.trim());
          }
        } finally {
          setIsTranscribing(false);
        }
      };

      recorder.start();
      setIsRecording(true);
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } catch {
      setIsRecording(false);
    }
  }, [onResult]);

  const stop = useCallback(() => {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setIsRecording(false);
  }, []);

  const cancel = useCallback(() => {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.ondataavailable = null;
      recorderRef.current.onstop = () => {
        recorderRef.current?.stream?.getTracks().forEach((t) => t.stop());
      };
      recorderRef.current.stop();
    }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    chunksRef.current = [];
    setIsRecording(false);
    setElapsed(0);
  }, []);

  return { isRecording, isTranscribing, elapsed, start, stop, cancel };
}

function AvatarIdle({ isDark, isSpeaking, isRecording = false }: { isDark: boolean; isSpeaking: boolean; isRecording?: boolean }) {
  const tiffany = isDark ? "#5CE0D6" : "#0D9488";
  const yellow = isDark ? "#FACC15" : "#CA8A04";
  const blue = isDark ? "#60A5FA" : "#2563EB";
  const orange = isDark ? "#FB923C" : "#EA580C";
  const green = isDark ? "#4ADE80" : "#16A34A";
  const red = "#EF4444";
  const activeAudio = isSpeaking || isRecording;
  const waveColor = isRecording ? red : tiffany;
  const borderColor = isRecording ? red : tiffany;

  const DATA_NODES = [
    { label: "198K", sub: "bpd", x: -68, y: -28, color: yellow, delay: 0 },
    { label: "847", sub: "wells", x: 64, y: -36, color: blue, delay: 0.4 },
    { label: "94%", sub: "load", x: 72, y: 32, color: orange, delay: 0.8 },
    { label: "12", sub: "assets", x: -72, y: 38, color: green, delay: 1.2 },
  ];

  return (
    <div className="flex flex-col items-center justify-center gap-2 py-2">
      <div
        className="relative flex items-center justify-center"
        style={{ width: 200, height: 180 }}
      >
        {/* Hex grid background */}
        <svg
          className="absolute inset-0"
          width="200"
          height="180"
          viewBox="0 0 200 180"
          fill="none"
          style={{ opacity: isDark ? 0.15 : 0.08 }}
        >
          {[
            [40, 20], [80, 20], [120, 20], [160, 20],
            [20, 50], [60, 50], [100, 50], [140, 50], [180, 50],
            [40, 80], [80, 80], [120, 80], [160, 80],
            [20, 110], [60, 110], [100, 110], [140, 110], [180, 110],
            [40, 140], [80, 140], [120, 140], [160, 140],
          ].map(([cx, cy], i) => (
            <polygon
              key={i}
              points={hexPoints(cx, cy, 14)}
              stroke={tiffany}
              strokeWidth="0.5"
              fill="none"
            />
          ))}
        </svg>

        {/* Large outer glow */}
        <div
          className="absolute rounded-full"
          style={{
            width: 160,
            height: 160,
            background: isDark
              ? `radial-gradient(circle, ${activeAudio ? waveColor : tiffany}0c 0%, transparent 65%)`
              : `radial-gradient(circle, ${activeAudio ? waveColor : tiffany}08 0%, transparent 65%)`,
            animation: activeAudio
              ? "orb-breathe 1s ease-in-out infinite"
              : "orb-breathe 3s ease-in-out infinite",
          }}
        />

        {/* Dashed orbit ring */}
        <svg
          className="absolute animate-orb-spin"
          width="148"
          height="148"
          viewBox="0 0 148 148"
          fill="none"
          style={{ top: 16, left: 26, transformStyle: "preserve-3d" }}
        >
          <circle
            cx="74" cy="74" r="70"
            stroke={tiffany}
            strokeWidth="1"
            strokeDasharray="6 4"
            opacity="0.35"
          />
        </svg>

        {/* Orbital ring 2 — yellow reverse */}
        <svg
          className="absolute animate-orb-spin-reverse"
          width="126"
          height="126"
          viewBox="0 0 126 126"
          fill="none"
          style={{ top: 27, left: 37, transformStyle: "preserve-3d" }}
        >
          <circle
            cx="63" cy="63" r="60"
            stroke={yellow}
            strokeWidth="0.8"
            strokeDasharray="4 6"
            opacity="0.25"
          />
        </svg>

        {/* Orbital ring 3 — blue Y-axis */}
        <svg
          className="absolute animate-orb-spin-y"
          width="164"
          height="164"
          viewBox="0 0 164 164"
          fill="none"
          style={{ top: 8, left: 18, transformStyle: "preserve-3d" }}
        >
          <circle
            cx="82" cy="82" r="78"
            stroke={blue}
            strokeWidth="0.7"
            strokeDasharray="3 8"
            opacity="0.2"
          />
        </svg>

        {/* Orbiting dots */}
        {[
          { size: 5, color: tiffany, orbit: 70, speed: 4, dir: 1 },
          { size: 4, color: yellow, orbit: 58, speed: 5, dir: -1 },
          { size: 3.5, color: blue, orbit: 78, speed: 6, dir: 1 },
        ].map((dot, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              width: dot.size,
              height: dot.size,
              borderRadius: "50%",
              background: dot.color,
              boxShadow: `0 0 6px ${dot.color}`,
              top: "50%",
              left: "50%",
              marginTop: -dot.size / 2,
              marginLeft: -dot.size / 2,
              animation: `orb-dot ${dot.speed}s linear infinite ${dot.dir < 0 ? "reverse" : "normal"}`,
              // @ts-expect-error CSS custom property for orbit radius
              "--orbit-r": `${dot.orbit}px`,
            }}
          />
        ))}

        {/* Speaking / Recording rings */}
        {activeAudio && [0, 1, 2].map((i) => (
          <span
            key={i}
            className="absolute rounded-full"
            style={{
              width: 100 + i * 16,
              height: 100 + i * 16,
              border: `1.5px solid ${waveColor}`,
              opacity: 0.45 - i * 0.12,
              animation: `concentric ${isRecording ? "1.2s" : "1.6s"} ease-out ${i * 0.25}s infinite`,
            }}
          />
        ))}

        {/* Avatar circle */}
        <div
          className="relative rounded-full overflow-hidden z-10"
          style={{
            width: 92,
            height: 92,
            border: `2.5px solid ${borderColor}`,
            boxShadow: activeAudio
              ? `0 0 24px ${waveColor}60, 0 0 48px ${waveColor}20`
              : `0 0 16px ${tiffany}30, 0 0 32px ${tiffany}10`,
            transition: "box-shadow 0.3s ease, border-color 0.3s ease",
          }}
        >
          <img
            src="/ai-assistant-avatar.png"
            alt="AI Assistant"
            className="w-full h-full object-cover object-top"
          />
        </div>

        {/* Online indicator */}
        <div
          className="absolute z-20 rounded-full"
          style={{
            width: 13,
            height: 13,
            bottom: 36,
            right: 46,
            background: isRecording ? red : green,
            border: isDark ? "2.5px solid #0A0F1C" : "2.5px solid #F0F9F7",
            boxShadow: `0 0 8px ${isRecording ? red : green}80`,
            animation: activeAudio ? "orb-breathe 0.8s ease-in-out infinite" : "none",
          }}
        />

        {/* Floating data nodes */}
        {DATA_NODES.map((node, i) => (
          <div
            key={i}
            className="absolute z-20 flex flex-col items-center"
            style={{
              top: `calc(50% + ${node.y}px)`,
              left: `calc(50% + ${node.x}px)`,
              animation: `float ${3.5 + i * 0.5}s ease-in-out ${node.delay}s infinite`,
            }}
          >
            <span
              className="text-[11px] font-bold tabular-nums"
              style={{ color: node.color, textShadow: isDark ? `0 0 8px ${node.color}40` : "none" }}
            >
              {node.label}
            </span>
            <span
              className="text-[8px] uppercase tracking-wider"
              style={{ color: isDark ? `${node.color}80` : `${node.color}aa`, marginTop: -1 }}
            >
              {node.sub}
            </span>
          </div>
        ))}

        {/* Connecting lines from nodes to avatar */}
        <svg
          className="absolute inset-0 z-[5]"
          width="200"
          height="180"
          viewBox="0 0 200 180"
          fill="none"
        >
          {DATA_NODES.map((node, i) => {
            const cx = 100 + node.x;
            const cy = 90 + node.y;
            return (
              <line
                key={i}
                x1={100}
                y1={90}
                x2={cx}
                y2={cy}
                stroke={node.color}
                strokeWidth="0.5"
                strokeDasharray="2 3"
                opacity={isDark ? 0.25 : 0.15}
              />
            );
          })}
        </svg>
      </div>

      {/* Equalizer / label */}
      {activeAudio ? (
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-end gap-[3px] h-5">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div
                key={i}
                style={{
                  width: 3,
                  borderRadius: 1.5,
                  background: isRecording
                    ? (i % 2 === 0 ? red : "#FCA5A5")
                    : (i % 2 === 0 ? tiffany : yellow),
                  animation: `eq-bar ${isRecording ? "0.35s" : "0.5s"} ease-in-out ${i * 0.06}s infinite alternate`,
                }}
              />
            ))}
          </div>
          <span className="text-[10px] font-medium" style={{ color: isRecording ? red : tiffany, opacity: 0.7 }}>
            {isRecording ? "Recording..." : "Speaking..."}
          </span>
        </div>
      ) : (
        <p
          className="text-xs font-semibold tracking-wide"
          style={{
            background: `linear-gradient(90deg, ${tiffany}, ${yellow})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          AIgul — AI Operator
        </p>
      )}
    </div>
  );
}

function hexPoints(cx: number, cy: number, r: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
  }).join(" ");
}

const SOURCE_ITEMS: { key: keyof Sources; labelKey: string }[] = [
  { key: "masterData",  labelKey: "srcMasterData" },
  { key: "geology",     labelKey: "srcGeology" },
  { key: "entities",    labelKey: "srcEntities" },
  { key: "scenarios",   labelKey: "srcScenarios" },
  { key: "annualPlans", labelKey: "srcAnnualPlans" },
  { key: "results",     labelKey: "srcResults" },
  { key: "crisis",      labelKey: "srcCrisis" },
];

export function AiAssistant({
  messages,
  question,
  sources,
  scenarios,
  selectedScenarioId,
  isChatLoading,
  isRunning,
  runStatus,
  chatError,
  voiceLang,
  onVoiceLangChange,
  onQuestionChange,
  onSourceChange,
  onScenarioChange,
  onAsk,
  onClear,
  onRunScenario,
  t,
  animDelay = 0,
}: AiAssistantProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { isSpeaking, speak, stop } = useSpeech();
  const handleVoiceResult = useCallback((text: string) => {
    onQuestionChange(question ? question + " " + text : text);
  }, [onQuestionChange, question]);
  const { isRecording, isTranscribing, elapsed: recSeconds, start: startMic, stop: stopMic, cancel: cancelMic } = useVoiceRecorder(handleVoiceResult);
  const prevMsgCountRef = useRef(messages.length);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    window.speechSynthesis?.getVoices();
  }, []);

  useEffect(() => {
    prevMsgCountRef.current = messages.length;
  }, [messages]);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onAsk();
    }
  };

  const handleSpeak = (text: string) => {
    if (isSpeaking) {
      stop();
    } else {
      speak(text, VOICE_LANG_MAP[voiceLang]);
    }
  };

  const tiffany = isDark ? "#5CE0D6" : "#0D9488";
  const panelBg     = isDark ? "rgba(12,18,30,0.75)"        : "rgba(255,255,255,0.88)";
  const panelBorder = isDark ? "rgba(92,224,214,0.15)"      : "rgba(13,148,136,0.18)";
  const dividerColor= isDark ? "rgba(92,224,214,0.10)"      : "rgba(13,148,136,0.10)";
  const sidebarBg   = isDark ? "rgba(255,255,255,0.03)"     : "rgba(240,253,250,0.6)";
  const labelColor  = isDark ? "#5CE0D6"                    : "#0D9488";
  const inputBg     = isDark ? "rgba(92,224,214,0.06)"      : "rgba(13,148,136,0.04)";
  const inputBorder = isDark ? "rgba(92,224,214,0.15)"      : "rgba(13,148,136,0.18)";
  const inputColor  = isDark ? "rgba(255,255,255,0.90)"     : "rgba(15,23,42,0.90)";
  const hintColor   = isDark ? "rgba(255,255,255,0.25)"     : "rgba(15,23,42,0.35)";

  const userMsgStyle = isDark
    ? { background: "linear-gradient(135deg,rgba(96,165,250,0.18),rgba(59,130,246,0.12))", border: "1px solid rgba(96,165,250,0.30)", color: "rgba(255,255,255,0.92)" }
    : { background: "linear-gradient(135deg,rgba(37,99,235,0.10),rgba(59,130,246,0.06))", border: "1px solid rgba(37,99,235,0.25)", color: "rgba(15,23,42,0.92)" };
  const asMsgStyle = isDark
    ? { background: "rgba(92,224,214,0.10)", border: "1px solid rgba(92,224,214,0.20)", color: "rgba(255,255,255,0.90)" }
    : { background: "rgba(13,148,136,0.06)", border: "1px solid rgba(13,148,136,0.18)", color: "rgba(15,23,42,0.90)" };
  const userLabelColor = isDark ? "#60A5FA" : "#2563EB";
  const asLabelColor   = isDark ? "#5CE0D6" : "#0D9488";

  const chipActive = isDark
    ? { background: "rgba(92,224,214,0.15)", border: "1px solid rgba(92,224,214,0.40)", color: "#5CE0D6", boxShadow: "0 0 8px rgba(92,224,214,0.15)" }
    : { background: "rgba(13,148,136,0.10)", border: "1px solid rgba(13,148,136,0.40)", color: "#0D9488", boxShadow: "none" };
  const chipInactive = isDark
    ? { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.40)" }
    : { background: "rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.10)", color: "rgba(15,23,42,0.45)" };

  const scenarioPreviewStyle = isDark
    ? { background: "rgba(92,224,214,0.06)", border: "1px solid rgba(92,224,214,0.15)", color: "rgba(255,255,255,0.65)" }
    : { background: "rgba(13,148,136,0.06)", border: "1px solid rgba(13,148,136,0.18)", color: "rgba(15,23,42,0.65)" };
  const scenarioEmptyStyle = isDark
    ? { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.28)" }
    : { background: "rgba(0,0,0,0.02)", border: "1px solid rgba(0,0,0,0.08)", color: "rgba(15,23,42,0.30)" };

  return (
    <div
      className="flex flex-col rounded-xl overflow-hidden transition-colors duration-300"
      style={{
        background: panelBg,
        backdropFilter: "blur(16px)",
        border: `1px solid ${panelBorder}`,
        animation: `fade-slide-up 0.6s ease-out ${animDelay}ms both`,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-5 py-3 border-b"
        style={{ borderColor: dividerColor }}
      >
        {/* Avatar mini */}
        <div
          className="w-9 h-9 rounded-full overflow-hidden shrink-0"
          style={{
            border: `1.5px solid ${tiffany}`,
            boxShadow: isSpeaking ? `0 0 10px ${tiffany}50` : "none",
          }}
        >
          <img
            src="/ai-assistant-avatar.png"
            alt="AI"
            className="w-full h-full object-cover object-top"
          />
        </div>
        <div className="flex-1 min-w-0">
          <h2
            className="text-sm font-bold tracking-wide truncate"
            style={{
              background: isDark
                ? "linear-gradient(90deg, #5CE0D6, #FACC15)"
                : "linear-gradient(90deg, #0D9488, #CA8A04)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {t("aiAssistantName")}
          </h2>
          <p
            className="text-[10px] tracking-wider"
            style={{ color: isDark ? "rgba(255,255,255,0.35)" : "rgba(15,23,42,0.40)" }}
          >
            {t("aiAssistantSubtitle")}
          </p>
        </div>

        {/* Auto-detected language badge */}
        <div className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold"
          style={{
            background: isDark ? "rgba(92,224,214,0.08)" : "rgba(13,148,136,0.06)",
            border: `1px solid ${isDark ? "rgba(92,224,214,0.15)" : "rgba(13,148,136,0.12)"}`,
            color: isDark ? "rgba(92,224,214,0.6)" : "rgba(13,148,136,0.5)",
          }}>
          <Globe className="h-3 w-3" />
          {VOICE_LABELS[voiceLang]}
        </div>

        {messages.length > 0 && (
          <button
            onClick={onClear}
            className="flex items-center gap-1 text-[11px] transition-colors"
            style={{ color: isDark ? "rgba(255,255,255,0.35)" : "rgba(15,23,42,0.40)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = isDark ? "#FB7185" : "#E11D48")}
            onMouseLeave={(e) => (e.currentTarget.style.color = isDark ? "rgba(255,255,255,0.35)" : "rgba(15,23,42,0.40)")}
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-0 flex-1">
        {/* Left: controls */}
        <div
          className="md:w-56 shrink-0 p-4 space-y-4 border-r"
          style={{ borderColor: dividerColor, background: sidebarBg }}
        >
          {/* Sources */}
          <div>
            <p
              className="text-[10px] uppercase tracking-[0.15em] mb-2.5 font-semibold"
              style={{ color: labelColor }}
            >
              {t("ragSources")}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {SOURCE_ITEMS.map(({ key, labelKey }) => {
                const active = sources[key];
                return (
                  <button
                    key={key}
                    onClick={() => onSourceChange(key, !active)}
                    className="px-2.5 py-1 rounded-full text-[11px] font-medium transition-all duration-200"
                    style={active ? chipActive : chipInactive}
                  >
                    {t(labelKey)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scenario runner */}
          <div>
            <p
              className="text-[10px] uppercase tracking-[0.15em] mb-2.5 font-semibold"
              style={{ color: labelColor }}
            >
              {t("ragScenarioRun")}
            </p>
            {selectedScenarioId && scenarios.length > 0 ? (
              <div
                className="rounded-lg px-3 py-2 mb-2 text-[11px] truncate"
                style={scenarioPreviewStyle}
              >
                {scenarios.find((s) => s.id === selectedScenarioId)?.name ?? "—"}
              </div>
            ) : (
              <div
                className="rounded-lg px-3 py-2 mb-2 text-[11px]"
                style={scenarioEmptyStyle}
              >
                {t("scenarioNotSelected")}
              </div>
            )}
            <ShimmerButton onClick={onRunScenario} className="w-full text-xs">
              <Zap className="h-3 w-3" />
              {t("runScenarioBtn")}
            </ShimmerButton>
          </div>
        </div>

        {/* Right: chat */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Messages area */}
          <div
            className="flex-1 overflow-y-auto p-4 space-y-3"
            style={{ minHeight: "180px", maxHeight: "280px" }}
          >
            {messages.length === 0 ? (
              <AvatarIdle isDark={isDark} isSpeaking={isSpeaking} isRecording={isRecording} />
            ) : (
              messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"} max-w-[92%]`}>
                    {/* Avatar for assistant messages */}
                    {msg.role === "assistant" && (
                      <div
                        className="w-7 h-7 rounded-full overflow-hidden shrink-0 mt-0.5"
                        style={{
                          border: `1px solid ${tiffany}60`,
                        }}
                      >
                        <img
                          src="/ai-assistant-avatar.png"
                          alt="AI"
                          className="w-full h-full object-cover object-top"
                        />
                      </div>
                    )}
                    <div>
                      <div
                        className="rounded-xl px-4 py-2.5 text-sm whitespace-pre-line"
                        style={msg.role === "user" ? userMsgStyle : asMsgStyle}
                      >
                        <div
                          className="text-[9px] uppercase tracking-widest mb-1 font-semibold"
                          style={{ color: msg.role === "user" ? userLabelColor : asLabelColor }}
                        >
                          {msg.role === "user" ? t("chatUser") : "AIgul"}
                        </div>
                        {msg.text}
                      </div>
                      {/* TTS button for assistant messages */}
                      {msg.role === "assistant" && (
                        <button
                          onClick={() => handleSpeak(msg.text)}
                          className="mt-1 flex items-center gap-1 text-[10px] font-medium transition-colors duration-200"
                          style={{ color: isSpeaking ? "#FB923C" : `${tiffany}99` }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = isSpeaking ? "#FB923C" : tiffany)}
                          onMouseLeave={(e) => (e.currentTarget.style.color = isSpeaking ? "#FB923C" : `${tiffany}99`)}
                        >
                          {isSpeaking ? (
                            <><VolumeX className="h-3 w-3" /> {t("aiStopSpeech")}</>
                          ) : (
                            <><Volume2 className="h-3 w-3" /> {t("aiReadAloud")}</>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div
            className="p-4 border-t space-y-2"
            style={{ borderColor: dividerColor }}
          >
            {isRecording ? (
              /* ── Recording UI ── */
              <div className="flex items-center gap-3 rounded-lg px-4 py-3"
                style={{ background: isDark ? "rgba(239,68,68,0.08)" : "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.25)" }}>
                {/* Red pulsing dot + timer */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="w-3 h-3 rounded-full" style={{ background: "#EF4444", animation: "pulse 1s ease-in-out infinite", boxShadow: "0 0 8px rgba(239,68,68,0.6)" }} />
                  <span className="text-sm font-mono font-semibold tabular-nums" style={{ color: "#EF4444" }}>
                    {String(Math.floor(recSeconds / 60)).padStart(2, "0")}:{String(recSeconds % 60).padStart(2, "0")}
                  </span>
                </div>

                {/* Live waveform bars */}
                <div className="flex items-end gap-[2px] h-6 flex-1 justify-center">
                  {Array.from({ length: 20 }, (_, i) => (
                    <div key={i} style={{
                      width: 3, borderRadius: 1.5, background: "#EF4444",
                      opacity: 0.4 + Math.random() * 0.4,
                      animation: `eq-bar ${0.3 + (i % 5) * 0.08}s ease-in-out ${i * 0.04}s infinite alternate`,
                    }} />
                  ))}
                </div>

                {/* Cancel */}
                <button onClick={cancelMic}
                  className="flex items-center justify-center w-8 h-8 rounded-full transition-colors"
                  style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)", color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)" }}
                  title="Cancel">
                  <X className="h-4 w-4" />
                </button>

                {/* Stop & Send */}
                <button onClick={stopMic}
                  className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all"
                  style={{ background: "#EF4444", color: "#fff", boxShadow: "0 2px 12px rgba(239,68,68,0.4)" }}>
                  <Square className="h-3.5 w-3.5" fill="#fff" />
                  Stop
                </button>
              </div>
            ) : isTranscribing ? (
              /* ── Transcribing UI ── */
              <div className="flex items-center justify-center gap-3 rounded-lg px-4 py-4"
                style={{ background: isDark ? "rgba(250,204,21,0.06)" : "rgba(250,204,21,0.04)", border: "1px solid rgba(250,204,21,0.2)" }}>
                <span className="w-5 h-5 rounded-full border-2 border-yellow-400/30 border-t-yellow-400" style={{ animation: "spin 0.7s linear infinite" }} />
                <span className="text-sm font-medium" style={{ color: "#FACC15" }}>Распознаю речь...</span>
              </div>
            ) : (
              /* ── Normal input ── */
              <div className="flex gap-2">
                <textarea
                  value={question}
                  onChange={(e) => onQuestionChange(e.target.value)}
                  onKeyDown={handleKey}
                  rows={2}
                  className="flex-1 resize-none rounded-lg text-sm px-3 py-2 outline-none transition-all duration-200"
                  style={{
                    background: inputBg,
                    border: `1px solid ${inputBorder}`,
                    color: inputColor,
                    caretColor: tiffany,
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = isDark ? "rgba(92,224,214,0.40)" : "rgba(13,148,136,0.40)";
                    e.currentTarget.style.boxShadow = isDark
                      ? "0 0 12px rgba(92,224,214,0.12)"
                      : "0 0 10px rgba(13,148,136,0.08)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = inputBorder;
                    e.currentTarget.style.boxShadow = "none";
                  }}
                  placeholder=""
                />
                <div className="flex flex-col gap-1">
                  <button
                    onClick={startMic}
                    className="flex items-center justify-center rounded-lg px-3 py-2 transition-all"
                    style={{
                      background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                      border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
                      color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)",
                    }}
                    title="Voice input"
                  >
                    <Mic className="h-4 w-4" />
                  </button>
                  <ShimmerButton
                    onClick={onAsk}
                    disabled={isChatLoading || !question.trim()}
                    className="flex-1 px-3"
                  >
                    {isChatLoading ? (
                      <span
                        className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white"
                        style={{ animation: "spin 0.7s linear infinite" }}
                      />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </ShimmerButton>
                </div>
              </div>
            )}
            {!isRecording && !isTranscribing && (
              <p className="text-[10px]" style={{ color: hintColor }}>
                {t("inputHint")}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Equalizer animation keyframes */}
      <style>{`
        @keyframes eq-bar {
          0% { height: 3px; }
          100% { height: 14px; }
        }
      `}</style>
    </div>
  );
}
