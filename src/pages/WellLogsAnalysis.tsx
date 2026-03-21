import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UploadCloud, BrainCircuit, FileBarChart2, FileDown } from "lucide-react";
import { getAuthHeader } from "@/lib/auth";
import { useLanguage } from "@/hooks/useLanguage";
import { useOilFields } from "@/hooks/useOilFields";

type OilField = { id: number; name: string; shortName?: string | null };
type Well = { id: number; name: string; wellType?: string };
type WellLogMeta = {
  id: number;
  fileName: string;
  fileType: string;
  depthCurve: string;
  createdAt: string;
};

type WellLogDetail = {
  id: number;
  depthCurve: string;
  curveNames: string[];
  curves: Record<string, Array<number | null>>;
};

type ImputeResult = {
  curve: string;
  depthCurve: string;
  depth: Array<number | null>;
  original: Array<number | null>;
  imputed: Array<number | null>;
  wasMissing: boolean[];
  metrics: { missingBefore: number; missingAfter: number; mae: number };
  model: { type: string; [key: string]: any };
};

// Вертикальная визуализация каротажа: глубина по Y (сверху вниз), значения по X
function buildVerticalLogPath(
  depth: Array<number | null>,
  values: Array<number | null>,
  trackWidth: number,
  trackHeight: number,
  leftPadding: number,
  topPadding: number
): { path: string; minDepth: number; maxDepth: number; minVal: number; maxVal: number } {
  const points: Array<[number, number]> = [];
  for (let i = 0; i < depth.length && i < values.length; i += 1) {
    const d = depth[i];
    const v = values[i];
    if (d == null || v == null || Number.isNaN(d) || Number.isNaN(v)) continue;
    points.push([d, v]);
  }
  
  if (points.length < 2) {
    return { path: "", minDepth: 0, maxDepth: 0, minVal: 0, maxVal: 0 };
  }

  const minDepth = Math.min(...points.map((p) => p[0]));
  const maxDepth = Math.max(...points.map((p) => p[0]));
  const minVal = Math.min(...points.map((p) => p[1]));
  const maxVal = Math.max(...points.map((p) => p[1]));
  const depthRange = maxDepth - minDepth || 1;
  const valRange = maxVal - minVal || 1;

  const path = points
    .map(([depth, val], idx) => {
      // X - значение каротажа, Y - глубина (вниз)
      const px = ((val - minVal) / valRange) * trackWidth + leftPadding;
      const py = ((depth - minDepth) / depthRange) * trackHeight + topPadding;
      return `${idx === 0 ? "M" : "L"} ${px.toFixed(2)} ${py.toFixed(2)}`;
    })
    .join(" ");

  return { path, minDepth, maxDepth, minVal, maxVal };
}

export default function WellLogsAnalysis() {
  const { t, translateData } = useLanguage();
  const { oilFields: fields } = useOilFields();
  const [selectedFieldId, setSelectedFieldId] = useState<number | null>(null);
  const [wells, setWells] = useState<Well[]>([]);
  const [selectedWellId, setSelectedWellId] = useState<number | null>(null);
  const [logs, setLogs] = useState<WellLogMeta[]>([]);
  const [selectedLogId, setSelectedLogId] = useState<number | null>(null);
  const [logDetail, setLogDetail] = useState<WellLogDetail | null>(null);
  const [selectedCurve, setSelectedCurve] = useState<string>("");
  const [imputeResult, setImputeResult] = useState<ImputeResult | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [training, setTraining] = useState(false);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string>("");
  const [modelTrained, setModelTrained] = useState(false);

  const authHeader = getAuthHeader();
  const headers: Record<string, string> = authHeader ? { Authorization: authHeader } : {};

  // Auto-select first field when list changes (workspace switch)
  useEffect(() => {
    if (fields.length === 0) {
      setSelectedFieldId(null);
      return;
    }
    if (!fields.find((f) => f.id === selectedFieldId)) {
      setSelectedFieldId(fields[0].id);
    }
  }, [fields]);

  useEffect(() => {
    if (!selectedFieldId) return;
    const loadWells = async () => {
      try {
        const response = await fetch(`/api/wells?oil_field_id=${selectedFieldId}`, { headers });
        if (!response.ok) return;
        const data = (await response.json()) as any[];
        const mapped = data.map((w) => ({ id: w.id, name: w.name, wellType: w.wellType }));
        setWells(mapped);
        setSelectedWellId(null);
        setLogs([]);
        setSelectedLogId(null);
        setLogDetail(null);
        setImputeResult(null);
      } catch {
        setError(t("wellLogsLoadWellsError"));
      }
    };
    loadWells();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFieldId]);

  useEffect(() => {
    if (!selectedWellId) return;
    const loadLogs = async () => {
      try {
        const response = await fetch(`/api/well-logs?well_id=${selectedWellId}`, { headers });
        if (!response.ok) return;
        const data = (await response.json()) as WellLogMeta[];
        setLogs(data);
        setSelectedLogId(null);
        setLogDetail(null);
        setImputeResult(null);
      } catch {
        setError(t("wellLogsLoadLogsError"));
      }
    };
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWellId]);

  useEffect(() => {
    if (!selectedLogId) return;
    const loadLogDetail = async () => {
      try {
        const response = await fetch(`/api/well-logs/${selectedLogId}`, { headers });
        if (!response.ok) return;
        const data = (await response.json()) as WellLogDetail;
        setLogDetail(data);
        const curve = data.curveNames.find((c) => c !== data.depthCurve) || "";
        setSelectedCurve(curve);
        setImputeResult(null);
      } catch {
        setError(t("wellLogsLoadLogDetailError"));
      }
    };
    loadLogDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLogId]);

  const handleUpload = async () => {
    if (!file || !selectedWellId) return;
    setUploading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("well_id", String(selectedWellId));
      if (selectedFieldId) form.append("oil_field_id", String(selectedFieldId));
      const response = await fetch("/api/well-logs/upload", {
        method: "POST",
        headers,
        body: form,
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.detail || t("wellLogsUploadError"));
      setFile(null);
      const refreshed = await fetch(`/api/well-logs?well_id=${selectedWellId}`, { headers });
      if (refreshed.ok) {
        const rows = (await refreshed.json()) as WellLogMeta[];
        setLogs(rows);
      }
    } catch (e: any) {
      setError(e?.message || t("wellLogsUploadError"));
    } finally {
      setUploading(false);
    }
  };

  const handleTrainModel = async () => {
    setTraining(true);
    setError("");
    try {
      const response = await fetch("/api/well-logs/train", {
        method: "POST",
        headers,
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.detail || "Failed to train model");
      setModelTrained(true);
      alert(`✅ Модель успешно обучена на ${payload.model.num_wells} синтетических скважинах!`);
    } catch (e: any) {
      setError(e?.message || "Failed to train model");
    } finally {
      setTraining(false);
    }
  };

  const handleRunImputation = async () => {
    if (!selectedLogId || !selectedCurve) return;
    setAnalyzing(true);
    setError("");
    try {
      const useMl = modelTrained ? "true" : "false";
      const response = await fetch(
        `/api/well-logs/${selectedLogId}/impute?curve=${encodeURIComponent(selectedCurve)}&use_ml=${useMl}`,
        { method: "POST", headers }
      );
      const payload = await response.json();
      console.log("Impute result:", payload);
      if (!response.ok) throw new Error(payload?.detail || t("wellLogsImputeError"));
      
      // Проверяем наличие wasMissing
      if (!payload.wasMissing) {
        console.warn("wasMissing field is missing in response");
      }
      
      setImputeResult(payload);
    } catch (e: any) {
      console.error("Impute error:", e);
      setError(e?.message || t("wellLogsImputeError"));
    } finally {
      setAnalyzing(false);
    }
  };

  const logTracks = useMemo(() => {
    if (!imputeResult) return null;
    
    const trackWidth = 180;
    const trackHeight = 600;
    const leftPadding = 50;
    const topPadding = 40;
    
    const original = buildVerticalLogPath(
      imputeResult.depth,
      imputeResult.original,
      trackWidth,
      trackHeight,
      leftPadding,
      topPadding
    );
    
    const imputed = buildVerticalLogPath(
      imputeResult.depth,
      imputeResult.imputed,
      trackWidth,
      trackHeight,
      leftPadding + trackWidth + 100,
      topPadding
    );
    
    // Создаем сегменты только для заполненных участков
    const imputedSegments: Array<{ path: string; isFilled: boolean }> = [];
    
    // Проверяем наличие wasMissing
    if (!imputeResult.wasMissing || !Array.isArray(imputeResult.wasMissing)) {
      console.warn("wasMissing not available, using full imputed curve");
      // Если wasMissing нет, просто показываем всю кривую синим
      if (imputed.path) {
        imputedSegments.push({ path: imputed.path, isFilled: false });
      }
      return { original, imputed, imputedSegments, trackWidth, trackHeight, leftPadding, topPadding };
    }
    
    // Подсчитываем статистику
    const totalPoints = imputeResult.wasMissing.length;
    const missingCount = imputeResult.wasMissing.filter(m => m).length;
    console.log(`Total points: ${totalPoints}, Missing: ${missingCount} (${((missingCount/totalPoints)*100).toFixed(1)}%)`);
    console.log("wasMissing sample:", imputeResult.wasMissing.slice(0, 20));
    
    try {
      let currentSegment: Array<[number, number]> = [];
      let currentIsFilled = false;
      
      const validDepths = imputeResult.depth.filter(d => d !== null) as number[];
      const validImputed = imputeResult.imputed.filter(v => v !== null) as number[];
      
      if (validDepths.length === 0 || validImputed.length === 0) {
        return { original, imputed, imputedSegments, trackWidth, trackHeight, leftPadding, topPadding };
      }
      
      const minDepth = Math.min(...validDepths);
      const maxDepth = Math.max(...validDepths);
      const minVal = Math.min(...validImputed);
      const maxVal = Math.max(...validImputed);
      const depthRange = maxDepth - minDepth || 1;
      const valRange = maxVal - minVal || 1;
      
      for (let i = 0; i < imputeResult.depth.length; i++) {
        const d = imputeResult.depth[i];
        const v = imputeResult.imputed[i];
        const wasMissing = imputeResult.wasMissing[i] || false;
        
        if (d === null || v === null) continue;
        
        const px = ((v - minVal) / valRange) * trackWidth + leftPadding + trackWidth + 100;
        const py = ((d - minDepth) / depthRange) * trackHeight + topPadding;
        
        if (currentSegment.length === 0) {
          currentSegment.push([px, py]);
          currentIsFilled = wasMissing;
        } else if (currentIsFilled === wasMissing) {
          currentSegment.push([px, py]);
        } else {
          // Завершаем текущий сегмент
          if (currentSegment.length > 1) {
            const path = currentSegment
              .map(([x, y], idx) => `${idx === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`)
              .join(" ");
            imputedSegments.push({ path, isFilled: currentIsFilled });
          }
          currentSegment = [[px, py]];
          currentIsFilled = wasMissing;
        }
      }
      
      // Добавляем последний сегмент
      if (currentSegment.length > 1) {
        const path = currentSegment
          .map(([x, y], idx) => `${idx === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`)
          .join(" ");
        imputedSegments.push({ path, isFilled: currentIsFilled });
      }
      
      console.log(`Created ${imputedSegments.length} segments:`, 
        imputedSegments.map(s => ({ isFilled: s.isFilled, pathLength: s.path.length }))
      );
    } catch (error) {
      console.error("Error building segments:", error);
      // Fallback к полной кривой
      if (imputed.path) {
        imputedSegments.push({ path: imputed.path, isFilled: false });
      }
    }
    
    return { original, imputed, imputedSegments, trackWidth, trackHeight, leftPadding, topPadding };
  }, [imputeResult]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <FileBarChart2 className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{t("wellLogsTitle")}</h1>
          <p className="text-sm text-muted-foreground">{t("wellLogsSubtitle")}</p>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <div className="text-destructive font-semibold">⚠️ Ошибка:</div>
            <div className="text-sm text-destructive">{error}</div>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("wellLogsSelectionTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>{t("wellLogsFieldLabel")}</Label>
            {loading ? (
              <div className="text-sm text-muted-foreground">Загрузка...</div>
            ) : (
              <Select value={selectedFieldId ? String(selectedFieldId) : ""} onValueChange={(v) => setSelectedFieldId(Number(v))}>
                <SelectTrigger>
                  <SelectValue placeholder={t("wellLogsFieldPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {fields.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">Нет данных</div>
                  ) : (
                    fields.map((f) => (
                      <SelectItem key={f.id} value={String(f.id)}>
                        {translateData(f.shortName || f.name)}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label>{t("wellLogsWellLabel")}</Label>
            <Select
              value={selectedWellId ? String(selectedWellId) : ""}
              onValueChange={(v) => setSelectedWellId(Number(v))}
              disabled={!selectedFieldId}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("wellLogsWellPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {wells.map((w) => (
                  <SelectItem key={w.id} value={String(w.id)}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t("wellLogsFileLabel")}</Label>
            <Input type="file" accept=".las,.lis,.csv,.txt" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3 flex-wrap">
        <Button onClick={handleUpload} disabled={!file || !selectedWellId || uploading}>
          <UploadCloud className="h-4 w-4 mr-2" />
          {uploading ? t("wellLogsUploading") : t("wellLogsUpload")}
        </Button>
        <Button 
          onClick={handleTrainModel} 
          disabled={training}
          variant={modelTrained ? "secondary" : "default"}
        >
          <BrainCircuit className="h-4 w-4 mr-2" />
          {training ? "Обучение..." : modelTrained ? "✓ Модель обучена" : "Обучить ML модель (20 скважин)"}
        </Button>
        <Button 
          onClick={async () => {
            try {
              const response = await fetch("/api/well-logs/generate-test-las", { headers });
              const data = await response.json();
              const blob = new Blob([data.content], { type: "text/plain" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = data.filename;
              a.click();
              URL.revokeObjectURL(url);
              alert(`✅ Тестовый файл создан!\n\nПропусков: ${data.missing_points} из ${data.total_points} точек\n${data.info || ''}\n\n📌 Инструкция:\n1. Загрузите скачанный файл\n2. Выберите кривую NPHI\n3. Нажмите "Запустить ML анализ"\n4. Оранжевые участки = ML обогащение`);
            } catch (e) {
              console.error("Failed to generate test file:", e);
            }
          }}
          variant="outline"
        >
          <FileDown className="h-4 w-4 mr-2" />
          Скачать тестовый LAS с пропусками
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("wellLogsListTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("wellLogsNoFiles")}</p>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <button
                  key={log.id}
                  onClick={() => setSelectedLogId(log.id)}
                  className={`w-full text-left border rounded-lg p-3 hover:bg-muted/50 ${
                    selectedLogId === log.id ? "border-primary bg-primary/5" : ""
                  }`}
                >
                  <div className="font-medium">{log.fileName}</div>
                  <div className="text-xs text-muted-foreground">{log.fileType.toUpperCase()}</div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {logDetail && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("wellLogsAnalysisTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{t("wellLogsCurveLabel")}</Label>
                <Select value={selectedCurve} onValueChange={setSelectedCurve}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {logDetail.curveNames
                      .filter((c) => c !== logDetail.depthCurve)
                      .map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("wellLogsDepthCurve")}</Label>
                <Input value={logDetail.depthCurve} disabled />
              </div>
              <div className="flex items-end">
                <Button onClick={handleRunImputation} disabled={!selectedCurve || analyzing}>
                  <BrainCircuit className="h-4 w-4 mr-2" />
                  {analyzing ? t("wellLogsAnalyzing") : t("wellLogsRunMl")}
                </Button>
              </div>
            </div>

            {imputeResult && (
              <>
                <div className="grid grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-xs text-muted-foreground">Пропусков до</p>
                      <p className="text-xl font-semibold">{imputeResult.metrics.missingBefore}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-xs text-muted-foreground">Пропусков после</p>
                      <p className="text-xl font-semibold">{imputeResult.metrics.missingAfter}</p>
                    </CardContent>
                  </Card>
                  <Card className="border-orange-500/50">
                    <CardContent className="pt-4">
                      <p className="text-xs text-muted-foreground">Обогащено точек</p>
                      <p className="text-xl font-semibold text-orange-600 dark:text-orange-400">
                        {imputeResult.wasMissing ? imputeResult.wasMissing.filter(m => m).length : 0}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-xs text-muted-foreground">{t("wellLogsMae")}</p>
                      <p className="text-xl font-semibold">{imputeResult.metrics.mae.toFixed(4)}</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="border rounded-lg p-4 bg-white dark:bg-slate-950">
                  <div className="text-sm font-medium mb-3">{t("wellLogsChartTitle")}</div>
                  {logTracks && (
                    <div className="overflow-auto max-h-[800px] border border-slate-200 dark:border-slate-800 rounded">
                      <svg 
                        width="580" 
                        height="680"
                        className="bg-white dark:bg-slate-900"
                      >
                        {/* Фон */}
                        <rect x="0" y="0" width="580" height="680" fill="currentColor" className="text-slate-50 dark:text-slate-900" />
                        
                        {/* Трек 1: Оригинальные данные */}
                        <g>
                          {/* Рамка трека */}
                          <rect 
                            x={logTracks.leftPadding} 
                            y={logTracks.topPadding} 
                            width={logTracks.trackWidth} 
                            height={logTracks.trackHeight}
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="2"
                            className="text-slate-300 dark:text-slate-700"
                          />
                          
                          {/* Вертикальная сетка трека 1 */}
                          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
                            <line
                              key={`v1-${ratio}`}
                              x1={logTracks.leftPadding + ratio * logTracks.trackWidth}
                              y1={logTracks.topPadding}
                              x2={logTracks.leftPadding + ratio * logTracks.trackWidth}
                              y2={logTracks.topPadding + logTracks.trackHeight}
                              stroke="currentColor"
                              strokeWidth="1"
                              strokeDasharray={ratio === 0.5 ? "none" : "2,2"}
                              className="text-slate-200 dark:text-slate-800"
                            />
                          ))}
                          
                          {/* Горизонтальная сетка трека 1 */}
                          {Array.from({ length: 7 }).map((_, i) => (
                            <line
                              key={`h1-${i}`}
                              x1={logTracks.leftPadding}
                              y1={logTracks.topPadding + (i / 6) * logTracks.trackHeight}
                              x2={logTracks.leftPadding + logTracks.trackWidth}
                              y2={logTracks.topPadding + (i / 6) * logTracks.trackHeight}
                              stroke="currentColor"
                              strokeWidth="1"
                              strokeDasharray="2,2"
                              className="text-slate-200 dark:text-slate-800"
                            />
                          ))}
                          
                          {/* Заголовок трека 1 */}
                          <text
                            x={logTracks.leftPadding + logTracks.trackWidth / 2}
                            y={logTracks.topPadding - 15}
                            textAnchor="middle"
                            className="text-xs font-semibold fill-slate-700 dark:fill-slate-300"
                          >
                            {t("wellLogsOriginal")}
                          </text>
                          
                          {/* Шкала значений трека 1 */}
                          <text
                            x={logTracks.leftPadding - 5}
                            y={logTracks.topPadding}
                            textAnchor="end"
                            className="text-[10px] fill-slate-600 dark:fill-slate-400"
                          >
                            {logTracks.original.maxVal.toFixed(1)}
                          </text>
                          <text
                            x={logTracks.leftPadding - 5}
                            y={logTracks.topPadding + logTracks.trackHeight}
                            textAnchor="end"
                            className="text-[10px] fill-slate-600 dark:fill-slate-400"
                          >
                            {logTracks.original.minVal.toFixed(1)}
                          </text>
                          
                          {/* Кривая оригинальных данных */}
                          {logTracks.original.path && (
                            <path 
                              d={logTracks.original.path} 
                              fill="none" 
                              stroke="#0ea5e9" 
                              strokeWidth="2"
                            />
                          )}
                        </g>
                        
                        {/* Трек 2: Импутированные данные */}
                        <g>
                          {/* Рамка трека */}
                          <rect 
                            x={logTracks.leftPadding + logTracks.trackWidth + 100} 
                            y={logTracks.topPadding} 
                            width={logTracks.trackWidth} 
                            height={logTracks.trackHeight}
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="2"
                            className="text-slate-300 dark:text-slate-700"
                          />
                          
                          {/* Вертикальная сетка трека 2 */}
                          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
                            <line
                              key={`v2-${ratio}`}
                              x1={logTracks.leftPadding + logTracks.trackWidth + 100 + ratio * logTracks.trackWidth}
                              y1={logTracks.topPadding}
                              x2={logTracks.leftPadding + logTracks.trackWidth + 100 + ratio * logTracks.trackWidth}
                              y2={logTracks.topPadding + logTracks.trackHeight}
                              stroke="currentColor"
                              strokeWidth="1"
                              strokeDasharray={ratio === 0.5 ? "none" : "2,2"}
                              className="text-slate-200 dark:text-slate-800"
                            />
                          ))}
                          
                          {/* Горизонтальная сетка трека 2 */}
                          {Array.from({ length: 7 }).map((_, i) => (
                            <line
                              key={`h2-${i}`}
                              x1={logTracks.leftPadding + logTracks.trackWidth + 100}
                              y1={logTracks.topPadding + (i / 6) * logTracks.trackHeight}
                              x2={logTracks.leftPadding + logTracks.trackWidth + 100 + logTracks.trackWidth}
                              y2={logTracks.topPadding + (i / 6) * logTracks.trackHeight}
                              stroke="currentColor"
                              strokeWidth="1"
                              strokeDasharray="2,2"
                              className="text-slate-200 dark:text-slate-800"
                            />
                          ))}
                          
                          {/* Заголовок трека 2 */}
                          <text
                            x={logTracks.leftPadding + logTracks.trackWidth + 100 + logTracks.trackWidth / 2}
                            y={logTracks.topPadding - 15}
                            textAnchor="middle"
                            className="text-xs font-semibold fill-slate-700 dark:fill-slate-300"
                          >
                            {t("wellLogsImputed")}
                          </text>
                          
                          {/* Шкала значений трека 2 */}
                          <text
                            x={logTracks.leftPadding + logTracks.trackWidth + 100 - 5}
                            y={logTracks.topPadding}
                            textAnchor="end"
                            className="text-[10px] fill-slate-600 dark:fill-slate-400"
                          >
                            {logTracks.imputed.maxVal.toFixed(1)}
                          </text>
                          <text
                            x={logTracks.leftPadding + logTracks.trackWidth + 100 - 5}
                            y={logTracks.topPadding + logTracks.trackHeight}
                            textAnchor="end"
                            className="text-[10px] fill-slate-600 dark:fill-slate-400"
                          >
                            {logTracks.imputed.minVal.toFixed(1)}
                          </text>
                          
                          {/* Кривая импутированных данных - по сегментам */}
                          {logTracks.imputedSegments && Array.isArray(logTracks.imputedSegments) && logTracks.imputedSegments.map((segment, idx) => (
                            <g key={`segment-${idx}`}>
                              {segment.isFilled && (
                                <>
                                  {/* Широкая подложка для обогащенного участка */}
                                  <path
                                    d={segment.path}
                                    fill="none"
                                    stroke="#fbbf24"
                                    strokeWidth="16"
                                    opacity="0.2"
                                  />
                                  {/* Средняя подложка */}
                                  <path
                                    d={segment.path}
                                    fill="none"
                                    stroke="#fb923c"
                                    strokeWidth="8"
                                    opacity="0.3"
                                  />
                                  {/* Основная толстая линия обогащенного участка */}
                                  <path
                                    d={segment.path}
                                    fill="none"
                                    stroke="#f97316"
                                    strokeWidth="4"
                                  />
                                </>
                              )}
                              {!segment.isFilled && (
                                /* Обычные данные */
                                <path
                                  d={segment.path}
                                  fill="none"
                                  stroke="#0ea5e9"
                                  strokeWidth="2"
                                />
                              )}
                            </g>
                          ))}
                        </g>
                        
                        {/* Общая шкала глубины (слева) */}
                        <g>
                          <text
                            x={15}
                            y={logTracks.topPadding - 15}
                            className="text-xs font-semibold fill-slate-700 dark:fill-slate-300"
                          >
                            Depth (m)
                          </text>
                          {Array.from({ length: 7 }).map((_, i) => {
                            const depth = logTracks.original.minDepth + 
                              (logTracks.original.maxDepth - logTracks.original.minDepth) * (i / 6);
                            return (
                              <text
                                key={`depth-${i}`}
                                x={38}
                                y={logTracks.topPadding + (i / 6) * logTracks.trackHeight + 4}
                                textAnchor="end"
                                className="text-[11px] fill-slate-600 dark:fill-slate-400"
                              >
                                {depth.toFixed(0)}
                              </text>
                            );
                          })}
                        </g>
                      </svg>
                    </div>
                  )}
                  <div className="mt-3 flex gap-6 text-xs text-muted-foreground justify-center">
                    <span className="inline-flex items-center gap-2">
                      <span className="inline-block w-4 h-0.5 bg-sky-500" />
                      {t("wellLogsOriginal")} / Исходные данные
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <span className="inline-block w-4 h-0.5 bg-orange-500" />
                      Обогащенные ML участки
                    </span>
                  </div>
                  {modelTrained && (
                    <div className="mt-2 text-xs text-green-600 dark:text-green-400 text-center">
                      ✓ Используется ML модель, обученная на 20 синтетических скважинах
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
