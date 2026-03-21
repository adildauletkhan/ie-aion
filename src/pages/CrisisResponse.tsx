import { useEffect, useMemo, useState, type ComponentType } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  ChevronDown,
  Wrench,
  Globe,
  CloudRain,
  TrendingDown,
  Package,
  AlertCircle,
  AlertTriangle,
  AlertOctagon,
  Mountain,
  Truck,
  Factory,
  Ship,
  Copy,
  Plus,
  Save,
  Star,
  Loader2,
  Play,
  CheckCircle2,
  Clock,
  XCircle,
  Ban,
  Activity,
  TrendingUp,
  BarChart3,
  RefreshCw,
  PlusCircle,
  X,
  CalendarDays,
  DollarSign,
  Target,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCrisisWebSocket } from "@/hooks/useCrisisWebSocket";
import { useLanguage } from "@/hooks/useLanguage";
import { getAuthHeader } from "@/lib/auth";
import { CRISIS_ASSET_TYPES } from "@/lib/assetTypes";
import {
  analyzeCrisisEvent,
  createCrisisEvent,
  executeCrisisScenario,
  generateCrisisDescription,
  generateCrisisScenarios,
  getCrisisExecution,
  getCrisisImpact,
  listCrisisEvents,
  listCrisisMonitoring,
  listCrisisScenarios,
  selectCrisisScenario,
  updateCrisisAction,
  updateCrisisEvent,
  addMonitoringEntry,
  type CrisisActionItem,
  type CrisisEvent,
  type CrisisScenario,
  type MonitoringEntryCreate,
} from "@/lib/crisisApi";

const severityStyles: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-warning/20 text-warning",
  critical: "bg-destructive/20 text-destructive",
  catastrophic: "bg-destructive text-destructive-foreground",
};

const statusStyles: Record<string, string> = {
  open: "bg-warning/20 text-warning",
  analyzing: "bg-primary/20 text-primary",
  scenarios_ready: "bg-success/20 text-success",
  executing: "bg-primary/20 text-primary",
  resolved: "bg-muted border border-border text-muted-foreground",
  failed: "bg-destructive/20 text-destructive",
};

const statusLabelKeys: Record<string, string> = {
  open: "crisisStatusDraft",
  analyzing: "crisisStatusInProgress",
  scenarios_ready: "crisisStatusActive",
  executing: "crisisStatusInProgress",
  resolved: "crisisStatusClosed",
  failed: "crisisStatusFailed",
};

export default function CrisisResponse() {
  const { t, translateData, language } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("impact");
  const [formState, setFormState] = useState({
    eventType: "technical",
    severity: "critical",
    title: "",
    description: "",
    affectedStage: "DOWN",
    affectedAssetType: "processing_plant",
    affectedAssetId: "",
    currentCapacity: "1200",
    impactedCapacity: "0",
    estimatedDowntimeMinDays: "30",
    estimatedDowntimeBestDays: "75",
    estimatedDowntimeMaxDays: "90",
  });
  // Те же типы активов, что в основных данных: по типу подгружаем названия активов для выбора
  const masterDataQueries = useQuery({
    queryKey: ["crisis-master-data"],
    queryFn: async () => {
      const authHeader = getAuthHeader();
      const getList = async (key: string) => {
        const response = await fetch(`/api/master-data/${key}`, {
          headers: {
            "Content-Type": "application/json",
            ...(authHeader ? { Authorization: authHeader } : {}),
          },
        });
        if (!response.ok) {
          return [];
        }
        return response.json();
      };
      const results = await Promise.all(CRISIS_ASSET_TYPES.map((a) => getList(a.apiKey)));
      return Object.fromEntries(CRISIS_ASSET_TYPES.map((a, i) => [a.value, results[i]])) as Record<
        string,
        Array<{ id: number; code?: string; name?: string; shortName?: string | null }>
      >;
    },
  });

  const assetOptions = useMemo(() => {
    const data = masterDataQueries.data;
    if (!data) return [];
    return data[formState.affectedAssetType as keyof typeof data] ?? [];
  }, [masterDataQueries.data, formState.affectedAssetType]);

  const selectedAsset = useMemo(
    () => assetOptions.find((item: any) => String(item.id) === formState.affectedAssetId),
    [assetOptions, formState.affectedAssetId]
  );
  const hasAssetOptions = assetOptions.length > 0;

  // Название актива для отображения (в поле под выбором актива показываем название, а не код)
  const assetDisplayName = useMemo(() => {
    if (selectedAsset) return translateData(selectedAsset.name);
    if (!formState.affectedAssetId || assetOptions.length === 0) return formState.affectedAssetId;
    const byCode = assetOptions.find((item: any) => (item as { code?: string }).code === formState.affectedAssetId);
    if (byCode) return translateData(byCode.name);
    return formState.affectedAssetId;
  }, [selectedAsset, formState.affectedAssetId, assetOptions, translateData]);

  const isAssetNameResolved = selectedAsset || (formState.affectedAssetId && assetOptions.some((o: any) => (o as { code?: string }).code === formState.affectedAssetId));

  useEffect(() => {
    if (!formState.affectedAssetId) return;
    const selected = assetOptions.find((item: any) => String(item.id) === formState.affectedAssetId);
    if (!selected) return;
    setFormState((prev) => ({
      ...prev,
      currentCapacity: String(selected.capacity ?? prev.currentCapacity),
    }));
  }, [assetOptions, formState.affectedAssetId]);

  useCrisisWebSocket((payload) => {
    toast({ title: payload.title, description: payload.message });
    if (payload.severity === "critical" && "Notification" in window) {
      if (Notification.permission === "granted") {
        new Notification(payload.title, { body: payload.message });
      }
    }
  });

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const eventsQuery = useQuery({ queryKey: ["crisis-events"], queryFn: listCrisisEvents });

  useEffect(() => {
    if (!selectedEventId && eventsQuery.data?.length) {
      setSelectedEventId(eventsQuery.data[0].id);
    }
  }, [eventsQuery.data, selectedEventId]);

  const selectedEvent = useMemo(
    () => eventsQuery.data?.find((event) => event.id === selectedEventId),
    [eventsQuery.data, selectedEventId]
  );

  // Старые коды из сида → полные коды master data (чтобы «Актив» подставлялся и для уже сохранённых событий)
  const LEGACY_ASSET_CODE_MAP: Record<string, string> = {
    PAV: "KZ-REF-PVL",
    TCO: "KZ-OF-TEN",
    KAS: "KZ-OF-KAS",
    ATY: "KZ-REF-ATY",
    CPC: "KZ-TS-KTK-01",
  };

  // При выборе события подставляем его данные в форму «Регистрация кризисного события»
  useEffect(() => {
    if (!selectedEvent) return;
    const data = masterDataQueries.data;
    const assetType = selectedEvent.affectedAssetType ?? "processing_plant";
    const options: Array<{ id: number; code?: string; name?: string }> = data ? (data[assetType as keyof typeof data] ?? []) : [];
    let resolvedAssetId = (selectedEvent.affectedAssetId ?? "").trim();
    // Поддержка старых кодов (CPC, PAV и т.д.) в уже сохранённых событиях
    if (resolvedAssetId && LEGACY_ASSET_CODE_MAP[resolvedAssetId]) {
      resolvedAssetId = LEGACY_ASSET_CODE_MAP[resolvedAssetId];
    }
    if (resolvedAssetId && options.length > 0) {
      const byId = options.find((o: { id: number }) => String(o.id) === resolvedAssetId);
      const byCode = options.find((o: { code?: string }) => (o as { code?: string }).code === resolvedAssetId);
      if (byId) resolvedAssetId = String(byId.id);
      else if (byCode) resolvedAssetId = String(byCode.id);
    }
    setFormState({
      eventType: selectedEvent.eventType ?? "technical",
      severity: selectedEvent.severity ?? "critical",
      title: selectedEvent.title ?? "",
      description: selectedEvent.description ?? "",
      affectedStage: selectedEvent.affectedStage ?? "DOWN",
      affectedAssetType: assetType,
      affectedAssetId: resolvedAssetId,
      currentCapacity: String(selectedEvent.currentCapacity ?? 0),
      impactedCapacity: String(selectedEvent.impactedCapacity ?? 0),
      estimatedDowntimeMinDays: String(selectedEvent.estimatedDowntimeMinDays ?? ""),
      estimatedDowntimeBestDays: String(selectedEvent.estimatedDowntimeBestDays ?? ""),
      estimatedDowntimeMaxDays: String(selectedEvent.estimatedDowntimeMaxDays ?? ""),
    });
  }, [selectedEvent?.id, masterDataQueries.data]);

  const impactQuery = useQuery({
    queryKey: ["crisis-impact", selectedEventId],
    queryFn: () => getCrisisImpact(selectedEventId),
    enabled: Boolean(selectedEventId),
    refetchInterval: (data) => (data?.status === "running" ? 5000 : false),
  });

  const scenariosQuery = useQuery({
    queryKey: ["crisis-scenarios", selectedEventId],
    queryFn: () => listCrisisScenarios(selectedEventId),
    enabled: Boolean(selectedEventId),
  });

  const executionQuery = useQuery({
    queryKey: ["crisis-execution", selectedEventId],
    queryFn: () => getCrisisExecution(selectedEventId),
    enabled: Boolean(selectedEventId),
  });

  const monitoringQuery = useQuery({
    queryKey: ["crisis-monitoring", selectedEventId],
    queryFn: () => listCrisisMonitoring(selectedEventId),
    enabled: Boolean(selectedEventId),
    refetchInterval: 30000,
  });

  const createEventMutation = useMutation({
    mutationFn: createCrisisEvent,
    onSuccess: (event) => {
      queryClient.invalidateQueries({ queryKey: ["crisis-events"] });
      setSelectedEventId(event.id);
      toast({ title: t("crisisToastEventCreated"), description: event.title });
    },
    onError: (error: Error) => {
      toast({ title: t("crisisToastCreateFailed"), description: error.message });
    },
  });

  const generateDescriptionMutation = useMutation({
    mutationFn: (question: string) => generateCrisisDescription(question),
    onSuccess: (data) => {
      const raw = data.answer || "";
      const normalized = raw.replace(/\r/g, "");
      const lower = normalized.toLowerCase();
      let text = normalized;
      const shortLabel = language === "en" ? "short answer" : "краткий ответ";
      const shortIndex = lower.indexOf(shortLabel);
      if (shortIndex >= 0) {
        text = normalized.slice(shortIndex + shortLabel.length).trim();
      }
      const detailsLabel = language === "en" ? "details" : "детали";
      const detailsIndex = text.toLowerCase().indexOf(detailsLabel);
      if (detailsIndex >= 0) {
        text = text.slice(0, detailsIndex).trim();
      }
      setFormState((prev) => ({ ...prev, description: text || prev.description }));
    },
    onError: () => {
      setFormState((prev) => ({ ...prev, description: buildFallbackDescription() }));
      toast({
        title: t("crisisToastAiUnavailable"),
        description: t("crisisToastDescriptionFallback"),
      });
    },
  });

  const analyzeMutation = useMutation({
    mutationFn: () => analyzeCrisisEvent(selectedEventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crisis-impact", selectedEventId] });
      toast({ title: t("crisisToastAnalysisStarted"), description: t("crisisToastAnalysisRunning") });
    },
    onError: (error: Error) => {
      toast({ title: t("crisisToastAnalysisFailed"), description: error.message });
    },
  });

  const generateMutation = useMutation({
    mutationFn: () => generateCrisisScenarios(selectedEventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crisis-scenarios", selectedEventId] });
      toast({ title: t("crisisGeneratingTitle"), description: t("crisisGeneratingDesc") });
    },
    onError: (error: Error) => {
      toast({ title: t("crisisGenerateFailed"), description: error.message });
    },
  });

  const selectScenarioMutation = useMutation({
    mutationFn: (scenarioId: string) => selectCrisisScenario(scenarioId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crisis-scenarios", selectedEventId] });
      toast({ title: language === "en" ? "Scenario selected" : "Сценарий выбран", description: language === "en" ? "The scenario has been marked as selected." : "Сценарий отмечен как выбранный." });
    },
    onError: (error: Error) => {
      toast({ title: language === "en" ? "Error" : "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  const executeScenarioMutation = useMutation({
    mutationFn: (scenarioId: string) => executeCrisisScenario(scenarioId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crisis-execution", selectedEventId] });
      queryClient.invalidateQueries({ queryKey: ["crisis-monitoring", selectedEventId] });
      setActiveTab("execution");
      toast({ title: language === "en" ? "Scenario launched" : "Сценарий запущен", description: language === "en" ? "Execution plan created. Switching to Execution tab." : "План выполнения создан. Переход на вкладку Выполнение." });
    },
    onError: (error: Error) => {
      toast({ title: language === "en" ? "Error" : "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  const [showMonitoringForm, setShowMonitoringForm] = useState(false);
  const [monitoringForm, setMonitoringForm] = useState<MonitoringEntryCreate>({
    utilizationRefineries: undefined,
    exportVolumes: undefined,
    plannedImpact: undefined,
    actualImpact: undefined,
    variancePct: undefined,
    alertMessage: "",
    alertSeverity: "warning",
    note: "",
  });

  const updateActionMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CrisisActionItem> }) =>
      updateCrisisAction(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crisis-execution", selectedEventId] });
    },
  });

  const addMonitoringMutation = useMutation({
    mutationFn: (payload: MonitoringEntryCreate) => addMonitoringEntry(selectedEventId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crisis-monitoring", selectedEventId] });
      setShowMonitoringForm(false);
      setMonitoringForm({ utilizationRefineries: undefined, exportVolumes: undefined, plannedImpact: undefined, actualImpact: undefined, variancePct: undefined, alertMessage: "", alertSeverity: "warning", note: "" });
      toast({ title: language === "en" ? "Metrics recorded" : "Метрики записаны" });
    },
    onError: (error: Error) => {
      toast({ title: language === "en" ? "Error" : "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CrisisEvent> }) =>
      updateCrisisEvent(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crisis-events"] });
      toast({ title: t("crisisToastEventUpdated") });
    },
    onError: (error: Error) => {
      toast({ title: t("crisisToastUpdateFailed"), description: error.message, variant: "destructive" });
    },
  });

  const copyEventMutation = useMutation({
    mutationFn: createCrisisEvent,
    onSuccess: (newEvent) => {
      queryClient.invalidateQueries({ queryKey: ["crisis-events"] });
      setSelectedEventId(newEvent.id);
      toast({ title: t("crisisToastEventCopied"), description: newEvent.title });
    },
    onError: (error: Error) => {
      toast({ title: t("crisisToastCopyFailed"), description: error.message, variant: "destructive" });
    },
  });

  const handleCreateEvent = () => {
    createEventMutation.mutate({
      eventType: formState.eventType as CrisisEvent["eventType"],
      severity: formState.severity as CrisisEvent["severity"],
      status: "analyzing",
      title: formState.title,
      description: formState.description,
      affectedStage: formState.affectedStage,
      affectedAssetType: formState.affectedAssetType,
      affectedAssetId: formState.affectedAssetId,
      currentCapacity: Number(formState.currentCapacity) || 0,
      impactedCapacity: Number(formState.impactedCapacity) || 0,
      estimatedDowntimeMinDays: Number(formState.estimatedDowntimeMinDays) || 0,
      estimatedDowntimeBestDays: Number(formState.estimatedDowntimeBestDays) || 0,
      estimatedDowntimeMaxDays: Number(formState.estimatedDowntimeMaxDays) || 0,
    });
  };

  const groupedActions = useMemo(() => {
    const items = executionQuery.data?.actionItems ?? [];
    return items.reduce<Record<string, CrisisActionItem[]>>((acc, item) => {
      acc[item.phase] = acc[item.phase] ? [...acc[item.phase], item] : [item];
      return acc;
    }, {});
  }, [executionQuery.data?.actionItems]);

  const renderFinancialValue = (value?: number) => {
    if (value === undefined || value === null) return "—";
    const sign = value > 0 ? "+" : "";
    return `${sign}${Math.round(value).toLocaleString()} $`;
  };

  const eventTypeLabelKeys: Record<string, string> = {
    technical: "crisisEventTypeTechnical",
    geopolitical: "crisisEventTypeGeopolitical",
    climate: "crisisEventTypeClimate",
    market: "crisisEventTypeMarket",
    logistics: "crisisEventTypeLogistics",
  };
  const severityLabelKeys: Record<string, string> = {
    low: "crisisSeverityLow",
    medium: "crisisSeverityMedium",
    critical: "crisisSeverityCritical",
    catastrophic: "crisisSeverityCatastrophic",
  };
  const stageLabelKeys: Record<string, string> = {
    UP: "crisisStageUp",
    MID: "crisisStageMid",
    DOWN: "crisisStageDown",
    EXPORT: "crisisStageExport",
  };
  const eventTypeLabels: Record<string, string> = Object.fromEntries(
    Object.entries(eventTypeLabelKeys).map(([k, key]) => [k, t(key)])
  );
  const severityLabels: Record<string, string> = Object.fromEntries(
    Object.entries(severityLabelKeys).map(([k, key]) => [k, t(key)])
  );
  const stageLabels: Record<string, string> = Object.fromEntries(
    Object.entries(stageLabelKeys).map(([k, key]) => [k, t(key)])
  );

  const eventTypeIcons: Record<string, ComponentType<{ className?: string }>> = {
    technical: Wrench,
    geopolitical: Globe,
    climate: CloudRain,
    market: TrendingDown,
    logistics: Package,
  };
  const severityIcons: Record<string, ComponentType<{ className?: string }>> = {
    low: AlertCircle,
    medium: AlertTriangle,
    critical: AlertTriangle,
    catastrophic: AlertOctagon,
  };
  const stageIcons: Record<string, ComponentType<{ className?: string }>> = {
    UP: Mountain,
    MID: Truck,
    DOWN: Factory,
    EXPORT: Ship,
  };

  const passportStatusOptions: { value: CrisisEvent["status"]; labelKey: string }[] = [
    { value: "open", labelKey: "crisisStatusDraft" },
    { value: "scenarios_ready", labelKey: "crisisStatusActive" },
    { value: "executing", labelKey: "crisisStatusInProgress" },
    { value: "resolved", labelKey: "crisisStatusClosed" },
  ];
  const passportStatusDisplayValue = (status: string | undefined): CrisisEvent["status"] => {
    if (status === "analyzing" || status === "executing") return "executing";
    if (status === "failed") return "resolved";
    return (status as CrisisEvent["status"]) ?? "open";
  };

  const buildFallbackDescription = () => {
    const type = eventTypeLabels[formState.eventType] ?? t("crisisEventTypeDefault");
    const severity = severityLabels[formState.severity] ?? t("crisisSeverityMedium");
    const stage = stageLabels[formState.affectedStage] ?? formState.affectedStage;
    const assetName = selectedAsset ? translateData(selectedAsset.name) : formState.affectedAssetId || t("crisisAssetLabel");
    const current = Number(formState.currentCapacity) || 0;
    const impacted = Number(formState.impactedCapacity) || 0;
    const loss = Math.max(current - impacted, 0);
    const min = formState.estimatedDowntimeMinDays;
    const best = formState.estimatedDowntimeBestDays;
    const max = formState.estimatedDowntimeMaxDays;
    return t("crisisFallbackDescTemplate")
      .replace("{type}", type)
      .replace("{severity}", severity)
      .replace("{stage}", stage)
      .replace("{asset}", assetName)
      .replace("{current}", String(current))
      .replace("{impacted}", String(impacted))
      .replace("{loss}", String(loss))
      .replace("{min}", min)
      .replace("{best}", best)
      .replace("{max}", max);
  };

  const handleGenerateDescription = () => {
    const type = eventTypeLabels[formState.eventType] ?? formState.eventType;
    const severity = severityLabels[formState.severity] ?? formState.severity;
    const stage = stageLabels[formState.affectedStage] ?? formState.affectedStage;
    const assetName = selectedAsset ? translateData(selectedAsset.name) : formState.affectedAssetId || t("crisisAssetLabel");
    const current = Number(formState.currentCapacity) || 0;
    const impacted = Number(formState.impactedCapacity) || 0;
    const loss = Math.max(current - impacted, 0);
    const min = formState.estimatedDowntimeMinDays;
    const best = formState.estimatedDowntimeBestDays;
    const max = formState.estimatedDowntimeMaxDays;
    const question = t("crisisGeneratePromptTemplate")
      .replace("{type}", type)
      .replace("{severity}", severity)
      .replace("{stage}", stage)
      .replace("{asset}", assetName)
      .replace("{current}", String(current))
      .replace("{impacted}", String(impacted))
      .replace("{loss}", String(loss))
      .replace("{min}", min)
      .replace("{best}", best)
      .replace("{max}", max);
    generateDescriptionMutation.mutate(question);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("crisisPageTitle")}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t("crisisPageSubtitle")}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">{t("crisisEventsTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(eventsQuery.data ?? []).map((event) => (
              <Collapsible
                key={event.id}
                open={expandedEventId === event.id}
                onOpenChange={(open) => setExpandedEventId(open ? event.id : null)}
              >
                <div
                  className={`w-full rounded-lg border overflow-hidden transition-colors ${
                    selectedEventId === event.id ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setSelectedEventId(event.id)}
                      className="w-full px-3 py-2.5 text-left flex items-center gap-2 hover:bg-muted/50"
                    >
                      <div className="font-medium text-sm truncate flex-1 min-w-0">{event.title}</div>
                      <div className="flex items-center gap-1.5 shrink-0" title={`${eventTypeLabels[event.eventType] ?? ""} · ${severityLabels[event.severity] ?? ""} · ${stageLabels[event.affectedStage ?? ""] ?? event.affectedStage ?? ""}`}>
                        {(() => {
                          const TypeIcon = eventTypeIcons[event.eventType] ?? Wrench;
                          const SeverityIcon = severityIcons[event.severity] ?? AlertTriangle;
                          const StageIcon = event.affectedStage ? (stageIcons[event.affectedStage] ?? Factory) : null;
                          return (
                            <>
                              <TypeIcon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                              <SeverityIcon
                                className={`h-3.5 w-3.5 ${
                                  event.severity === "catastrophic"
                                    ? "text-destructive"
                                    : event.severity === "critical"
                                      ? "text-destructive/80"
                                      : event.severity === "medium"
                                        ? "text-warning"
                                        : "text-muted-foreground"
                                }`}
                                aria-hidden
                              />
                              {StageIcon && (
                                <StageIcon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                              )}
                            </>
                          );
                        })()}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge className={statusStyles[event.status] ?? ""} variant="secondary">
                          {t(statusLabelKeys[event.status] ?? "crisisStatusDraft")}
                        </Badge>
                        <ChevronDown
                          className={`h-4 w-4 text-muted-foreground transition-transform ${
                            expandedEventId === event.id ? "rotate-180" : ""
                          }`}
                          aria-hidden
                        />
                      </div>
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-3 pb-3 pt-0 border-t border-border/50">
                      <div className="text-xs text-muted-foreground mt-2">{event.description || "—"}</div>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className={severityStyles[event.severity] ?? ""} variant="secondary">
                          {event.severity}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">{event.affectedStage}</span>
                      </div>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ))}
            {!eventsQuery.data?.length && <div className="text-xs text-muted-foreground">{t("crisisNoEvents")}</div>}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
            <CardTitle className="text-base">{t("crisisEventPassportTitle")}</CardTitle>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {selectedEventId && selectedEvent && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title={t("crisisSaveTooltip")}
                    onClick={() => {
                      updateEventMutation.mutate({
                        id: selectedEventId,
                        payload: {
                          eventType: formState.eventType as CrisisEvent["eventType"],
                          severity: formState.severity as CrisisEvent["severity"],
                          title: formState.title,
                          description: formState.description,
                          affectedStage: formState.affectedStage,
                          affectedAssetType: formState.affectedAssetType,
                          affectedAssetId: formState.affectedAssetId,
                          currentCapacity: Number(formState.currentCapacity) || 0,
                          impactedCapacity: Number(formState.impactedCapacity) || 0,
                          estimatedDowntimeMinDays: Number(formState.estimatedDowntimeMinDays) || undefined,
                          estimatedDowntimeBestDays: Number(formState.estimatedDowntimeBestDays) || undefined,
                          estimatedDowntimeMaxDays: Number(formState.estimatedDowntimeMaxDays) || undefined,
                        },
                      });
                    }}
                    disabled={updateEventMutation.isPending}
                  >
                    <Save className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title={t("crisisCopyEventTooltip")}
                    onClick={() => {
                      copyEventMutation.mutate({
                        eventType: selectedEvent.eventType,
                        severity: selectedEvent.severity,
                        status: "open",
                        title: `${t("crisisCopyTitlePrefix")}${selectedEvent.title}`,
                        description: selectedEvent.description ?? undefined,
                        affectedStage: selectedEvent.affectedStage ?? undefined,
                        affectedAssetType: selectedEvent.affectedAssetType ?? undefined,
                        affectedAssetId: selectedEvent.affectedAssetId ?? undefined,
                        currentCapacity: selectedEvent.currentCapacity,
                        impactedCapacity: selectedEvent.impactedCapacity,
                        estimatedDowntimeMinDays: selectedEvent.estimatedDowntimeMinDays ?? undefined,
                        estimatedDowntimeBestDays: selectedEvent.estimatedDowntimeBestDays ?? undefined,
                        estimatedDowntimeMaxDays: selectedEvent.estimatedDowntimeMaxDays ?? undefined,
                      });
                    }}
                    disabled={copyEventMutation.isPending}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <select
                    className="h-8 rounded-md border border-input bg-background px-2 text-xs min-w-[7rem]"
                    value={selectedEvent.severity}
                    onChange={(e) => {
                      const v = e.target.value as CrisisEvent["severity"];
                      updateEventMutation.mutate({ id: selectedEventId, payload: { severity: v } });
                    }}
                    onClick={(e) => e.stopPropagation()}
                    disabled={updateEventMutation.isPending}
                  >
                    <option value="low">{severityLabels.low}</option>
                    <option value="medium">{severityLabels.medium}</option>
                    <option value="critical">{severityLabels.critical}</option>
                    <option value="catastrophic">{severityLabels.catastrophic}</option>
                  </select>
                  <select
                    className="h-8 rounded-md border border-input bg-background px-2 text-xs min-w-[6.5rem]"
                    value={passportStatusDisplayValue(selectedEvent.status)}
                    onChange={(e) => {
                      const v = e.target.value as CrisisEvent["status"];
                      updateEventMutation.mutate({ id: selectedEventId, payload: { status: v } });
                    }}
                    onClick={(e) => e.stopPropagation()}
                    disabled={updateEventMutation.isPending}
                  >
                    {passportStatusOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {t(opt.labelKey)}
                      </option>
                    ))}
                  </select>
                </>
              )}
              <Button
                size="sm"
                className="h-8 gap-1.5"
                onClick={handleCreateEvent}
                disabled={createEventMutation.isPending}
              >
                <Plus className="h-4 w-4" />
                {t("crisisCreateEventButton")}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">{t("crisisLabelEventType")}</label>
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  value={formState.eventType}
                  onChange={(e) => setFormState((prev) => ({ ...prev, eventType: e.target.value }))}
                >
                  <option value="technical">{t("crisisEventTypeOptionTechnical")}</option>
                  <option value="geopolitical">{t("crisisEventTypeOptionGeopolitical")}</option>
                  <option value="climate">{t("crisisEventTypeOptionClimate")}</option>
                  <option value="market">{t("crisisEventTypeOptionMarket")}</option>
                  <option value="logistics">{t("crisisEventTypeOptionLogistics")}</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">{t("crisisLabelSeverity")}</label>
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  value={formState.severity}
                  onChange={(e) => setFormState((prev) => ({ ...prev, severity: e.target.value }))}
                >
                  <option value="low">{t("crisisSeverityOptionLow")}</option>
                  <option value="medium">{t("crisisSeverityOptionMedium")}</option>
                  <option value="critical">{t("crisisSeverityOptionCritical")}</option>
                  <option value="catastrophic">{t("crisisSeverityOptionCatastrophic")}</option>
                </select>
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs text-muted-foreground">{t("crisisLabelTitle")}</label>
                <Input
                  value={formState.title}
                  onChange={(e) => setFormState((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder={t("crisisTitlePlaceholder")}
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-muted-foreground">{t("crisisLabelDescription")}</label>
                  <Button size="sm" variant="outline" onClick={handleGenerateDescription}>
                    {t("crisisGenerateBtn")}
                  </Button>
                </div>
                <Textarea
                  value={formState.description}
                  onChange={(e) => setFormState((prev) => ({ ...prev, description: e.target.value }))}
                  className="min-h-[72px]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">{t("crisisLabelStage")}</label>
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  value={formState.affectedStage}
                  onChange={(e) => setFormState((prev) => ({ ...prev, affectedStage: e.target.value }))}
                >
                  <option value="UP">{t("crisisStageOptionUp")}</option>
                  <option value="MID">{t("crisisStageOptionMid")}</option>
                  <option value="DOWN">{t("crisisStageOptionDown")}</option>
                  <option value="EXPORT">{t("crisisStageOptionExport")}</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">{t("crisisLabelAssetType")}</label>
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  value={formState.affectedAssetType}
                  onChange={(e) =>
                    setFormState((prev) => ({ ...prev, affectedAssetType: e.target.value, affectedAssetId: "" }))
                  }
                >
                  {CRISIS_ASSET_TYPES.map((asset) => (
                    <option key={asset.value} value={asset.value}>
                      {t(asset.labelKey)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">{t("crisisLabelAsset")}</label>
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  value={formState.affectedAssetId}
                  onChange={(e) => setFormState((prev) => ({ ...prev, affectedAssetId: e.target.value }))}
                >
                  <option value="">{masterDataQueries.isLoading ? t("crisisLoading") : t("crisisSelectAsset")}</option>
                  {!masterDataQueries.isLoading && !hasAssetOptions && (
                    <option value="" disabled>
                      {t("crisisNoMasterData")}
                    </option>
                  )}
                  {assetOptions.map((item: any) => (
                    <option key={item.id} value={String(item.id)}>
                      {translateData(item.name)} {item.shortName ? `(${item.shortName})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              {(formState.affectedAssetId || !hasAssetOptions) && !masterDataQueries.isLoading && (
                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs text-muted-foreground">
                    {isAssetNameResolved ? t("crisisAssetName") : t("crisisAssetManual")}
                  </label>
                  <Input
                    value={assetDisplayName}
                    onChange={isAssetNameResolved ? undefined : (e) => setFormState((prev) => ({ ...prev, affectedAssetId: e.target.value }))}
                    readOnly={!!isAssetNameResolved}
                    placeholder={t("crisisAssetPlaceholder")}
                    className={isAssetNameResolved ? "bg-muted" : ""}
                  />
                </div>
              )}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">{t("crisisLabelCurrentCapacity")}</label>
                <Input
                  type="number"
                  value={formState.currentCapacity}
                  onChange={(e) => setFormState((prev) => ({ ...prev, currentCapacity: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">{t("crisisLabelImpactedCapacity")}</label>
                <Input
                  type="number"
                  value={formState.impactedCapacity}
                  onChange={(e) => setFormState((prev) => ({ ...prev, impactedCapacity: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">{t("crisisLabelDowntimeMin")}</label>
                <Input
                  type="number"
                  value={formState.estimatedDowntimeMinDays}
                  onChange={(e) => setFormState((prev) => ({ ...prev, estimatedDowntimeMinDays: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">{t("crisisLabelDowntimeBest")}</label>
                <Input
                  type="number"
                  value={formState.estimatedDowntimeBestDays}
                  onChange={(e) => setFormState((prev) => ({ ...prev, estimatedDowntimeBestDays: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">{t("crisisLabelDowntimeMax")}</label>
                <Input
                  type="number"
                  value={formState.estimatedDowntimeMaxDays}
                  onChange={(e) => setFormState((prev) => ({ ...prev, estimatedDowntimeMaxDays: e.target.value }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-2">
          <TabsTrigger value="impact">{t("crisisTabImpact")}</TabsTrigger>
          <TabsTrigger value="scenarios">{t("crisisScenariosTab")}</TabsTrigger>
          <TabsTrigger value="execution">{t("crisisTabExecution")}</TabsTrigger>
          <TabsTrigger value="monitoring">{t("crisisTabMonitoring")}</TabsTrigger>
        </TabsList>

        <TabsContent value="impact" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">{t("crisisImpactTitle")}</CardTitle>
              <Button variant="outline" onClick={() => analyzeMutation.mutate()} disabled={!selectedEventId}>
                {t("crisisRerunAnalysis")}
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {impactQuery.data ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="rounded-md border p-3">
                      <div className="text-xs text-muted-foreground">{t("crisisImpactStatus")}</div>
                      <div className="text-sm font-medium">{impactQuery.data.status}</div>
                    </div>
                    <div className="rounded-md border p-3">
                      <div className="text-xs text-muted-foreground">{t("crisisImpactDowntimeMonths")}</div>
                      <div className="text-sm font-medium">{impactQuery.data.directImpact?.downtime_months ?? "—"}</div>
                    </div>
                    <div className="rounded-md border p-3">
                      <div className="text-xs text-muted-foreground">{t("crisisImpactFinancial")}</div>
                      <div className="text-sm font-medium">
                        {renderFinancialValue(Number(impactQuery.data.financialImpact?.total))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="rounded-md border p-3 space-y-2">
                      <div className="text-xs text-muted-foreground">{t("crisisBalanceBefore")}</div>
                      {impactQuery.data.balanceChainBefore &&
                        Object.entries(impactQuery.data.balanceChainBefore).map(([stage, values]) => (
                          <div key={stage} className="flex justify-between text-xs">
                            <span>{stage}</span>
                            <span>
                              {values.plan.toFixed(0)} / {values.capacity.toFixed(0)}
                            </span>
                          </div>
                        ))}
                    </div>
                    <div className="rounded-md border p-3 space-y-2">
                      <div className="text-xs text-muted-foreground">{t("crisisBalanceAfter")}</div>
                      {impactQuery.data.balanceChainAfter &&
                        Object.entries(impactQuery.data.balanceChainAfter).map(([stage, values]) => (
                          <div key={stage} className="flex justify-between text-xs">
                            <span>{stage}</span>
                            <span>
                              {values.plan.toFixed(0)} / {values.capacity.toFixed(0)}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="rounded-md border p-3">
                      <div className="text-xs text-muted-foreground">{t("crisisSurplusUpstream")}</div>
                      <div className="text-sm font-medium">{impactQuery.data.upstreamImpact?.surplus ?? "—"}</div>
                    </div>
                    <div className="rounded-md border p-3">
                      <div className="text-xs text-muted-foreground">{t("crisisDropMidstream")}</div>
                      <div className="text-sm font-medium">
                        {impactQuery.data.midstreamImpact?.utilization_drop ?? "—"}%
                      </div>
                    </div>
                    <div className="rounded-md border p-3">
                      <div className="text-xs text-muted-foreground">{t("crisisDeficitDownstream")}</div>
                      <div className="text-sm font-medium">{impactQuery.data.downstreamImpact?.deficit ?? "—"}</div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-xs text-muted-foreground">{t("crisisNoImpactData")}</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scenarios" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">{t("crisisScenariosTitle")}</CardTitle>
              <Button variant="outline" onClick={() => generateMutation.mutate()} disabled={!selectedEventId}>
                {t("crisisGenerateScenarios")}
              </Button>
            </CardHeader>
            <CardContent className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              {(scenariosQuery.data ?? []).map((scenario) => (
                <div key={scenario.id} className="rounded-md border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-sm">{scenario.scenarioName}</div>
                    <Badge variant="secondary">{scenario.executionComplexity}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">{scenario.description}</div>
                  <div className="text-xs">
                    <span className="text-muted-foreground">{t("crisisSavings")}:</span>{" "}
                    <span className="font-semibold">{renderFinancialValue(scenario.netSavings)}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t("crisisTimelineDays")}: {scenario.executionTimelineDays}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-0.5">
                    <span className="text-muted-foreground">{t("crisisAiRating")}:</span>
                    <span className="inline-flex text-primary">
                      {Array.from({ length: Math.max(1, 4 - (scenario.aiRanking ?? 1)) }, (_, i) => (
                        <Star key={i} className="h-3.5 w-3.5 fill-current" />
                      ))}
                    </span>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant={scenario.status === "selected" ? "default" : "outline"}
                      disabled={selectScenarioMutation.isPending || executeScenarioMutation.isPending}
                      onClick={() => selectScenarioMutation.mutate(scenario.id)}
                    >
                      {selectScenarioMutation.isPending && selectScenarioMutation.variables === scenario.id
                        ? <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        : scenario.status === "selected" ? <CheckCircle2 className="h-3 w-3 mr-1" /> : null}
                      {t("crisisSelect")}
                    </Button>
                    <Button
                      size="sm"
                      disabled={selectScenarioMutation.isPending || executeScenarioMutation.isPending}
                      onClick={() => executeScenarioMutation.mutate(scenario.id)}
                    >
                      {executeScenarioMutation.isPending && executeScenarioMutation.variables === scenario.id
                        ? <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        : <Play className="h-3 w-3 mr-1" />}
                      {t("crisisExecute")}
                    </Button>
                  </div>
                </div>
              ))}
              {!scenariosQuery.data?.length && <div className="text-xs text-muted-foreground">{t("crisisNoScenarios")}</div>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── EXECUTION TAB ── */}
        <TabsContent value="execution" className="mt-4 space-y-4">
          {!executionQuery.data ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground text-sm">
                <Target className="h-8 w-8 mx-auto mb-3 opacity-30" />
                {t("crisisNoExecutionPlan")}
              </CardContent>
            </Card>
          ) : (() => {
            const plan = executionQuery.data.plan;
            const allItems = executionQuery.data.actionItems;
            const totalItems = allItems.length;
            const completedItems = allItems.filter(i => i.status === "completed").length;
            const blockedItems = allItems.filter(i => i.status === "blocked").length;
            const inProgressItems = allItems.filter(i => i.status === "in_progress").length;
            const overallPct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
            const variance = plan.variance ?? 0;
            const planStatusStyles: Record<string, string> = {
              active: "bg-primary/10 text-primary border-primary/30",
              completed: "bg-success/10 text-success border-success/30",
              blocked: "bg-destructive/10 text-destructive border-destructive/30",
            };
            const actionStatusIcon = (s: string) => {
              if (s === "completed") return <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />;
              if (s === "in_progress") return <Loader2 className="h-3.5 w-3.5 text-primary animate-spin shrink-0" />;
              if (s === "blocked") return <Ban className="h-3.5 w-3.5 text-destructive shrink-0" />;
              return <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />;
            };
            return (
              <div className="space-y-4">
                {/* Summary KPIs */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Card className={`border ${planStatusStyles[plan.status] ?? ""}`}>
                    <CardContent className="p-3">
                      <div className="text-[10px] uppercase tracking-wide opacity-70 mb-1">{language === "en" ? "Plan status" : "Статус плана"}</div>
                      <div className="text-sm font-semibold capitalize">{plan.status}</div>
                      {plan.startDate && <div className="text-[10px] opacity-60 mt-0.5">{language === "en" ? "Start:" : "Начало:"} {plan.startDate}</div>}
                      {plan.targetCompletionDate && <div className="text-[10px] opacity-60">{language === "en" ? "Target:" : "Цель:"} {plan.targetCompletionDate}</div>}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3">
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">{language === "en" ? "Overall progress" : "Общий прогресс"}</div>
                      <div className="text-2xl font-bold text-primary">{overallPct}%</div>
                      <div className="w-full bg-muted rounded-full h-1.5 mt-1.5">
                        <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${overallPct}%` }} />
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-1">{completedItems}/{totalItems} {language === "en" ? "tasks" : "задач"}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3">
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">{language === "en" ? "Financial impact" : "Финансовый эффект"}</div>
                      <div className="text-sm font-semibold">{renderFinancialValue(plan.plannedFinancialImpact)}</div>
                      <div className="text-[10px] text-muted-foreground">{language === "en" ? "Planned" : "Плановый"}</div>
                      <div className={`text-sm font-semibold mt-1 ${variance >= 0 ? "text-destructive" : "text-success"}`}>
                        {renderFinancialValue(plan.actualFinancialImpact)}
                      </div>
                      <div className="text-[10px] text-muted-foreground">{language === "en" ? "Actual" : "Фактический"}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3">
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">{language === "en" ? "Task breakdown" : "Статус задач"}</div>
                      <div className="space-y-1 mt-1">
                        <div className="flex justify-between text-xs"><span className="text-success">{language === "en" ? "Completed" : "Выполнено"}</span><span className="font-medium">{completedItems}</span></div>
                        <div className="flex justify-between text-xs"><span className="text-primary">{language === "en" ? "In progress" : "В работе"}</span><span className="font-medium">{inProgressItems}</span></div>
                        <div className="flex justify-between text-xs"><span className="text-destructive">{language === "en" ? "Blocked" : "Заблокировано"}</span><span className="font-medium">{blockedItems}</span></div>
                        <div className="flex justify-between text-xs"><span className="text-muted-foreground">{language === "en" ? "Pending" : "Ожидает"}</span><span className="font-medium">{totalItems - completedItems - inProgressItems - blockedItems}</span></div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Action items by phase */}
                {Object.entries(groupedActions).map(([phase, items]) => {
                  const phaseCompleted = items.filter(i => i.status === "completed").length;
                  const phasePct = items.length > 0 ? Math.round((phaseCompleted / items.length) * 100) : 0;
                  return (
                    <Card key={phase}>
                      <CardHeader className="py-3 px-4">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-semibold">{phase}</CardTitle>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{phaseCompleted}/{items.length}</span>
                            <div className="w-20 bg-muted rounded-full h-1.5">
                              <div className="bg-primary h-1.5 rounded-full" style={{ width: `${phasePct}%` }} />
                            </div>
                            <span className="text-xs font-medium text-primary">{phasePct}%</span>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="px-0 pb-0">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-t border-b bg-muted/40">
                              <th className="text-left px-4 py-2 font-medium text-muted-foreground w-6"></th>
                              <th className="text-left px-4 py-2 font-medium text-muted-foreground">{language === "en" ? "Action" : "Действие"}</th>
                              <th className="text-left px-4 py-2 font-medium text-muted-foreground hidden md:table-cell">{language === "en" ? "Assigned" : "Исполнитель"}</th>
                              <th className="text-left px-4 py-2 font-medium text-muted-foreground hidden md:table-cell"><CalendarDays className="h-3 w-3 inline mr-1" />{language === "en" ? "Deadline" : "Срок"}</th>
                              <th className="text-left px-4 py-2 font-medium text-muted-foreground w-36">{language === "en" ? "Status" : "Статус"}</th>
                              <th className="text-left px-4 py-2 font-medium text-muted-foreground w-32">{language === "en" ? "Progress" : "Прогресс"}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.map((item, idx) => {
                              const isOverdue = item.deadline && item.status !== "completed" && new Date(item.deadline) < new Date();
                              return (
                                <tr key={item.id} className={`border-b last:border-b-0 hover:bg-muted/20 ${idx % 2 === 0 ? "" : "bg-muted/10"}`}>
                                  <td className="px-4 py-2">{actionStatusIcon(item.status)}</td>
                                  <td className="px-4 py-2">
                                    <div className="font-medium">{item.actionTitle}</div>
                                    {item.actionDescription && <div className="text-muted-foreground text-[10px] mt-0.5 max-w-xs truncate">{item.actionDescription}</div>}
                                    {item.blockingReason && <div className="text-destructive text-[10px] mt-0.5">{language === "en" ? "Blocked:" : "Блокировка:"} {item.blockingReason}</div>}
                                  </td>
                                  <td className="px-4 py-2 text-muted-foreground hidden md:table-cell">{item.assignedTo ?? "—"}</td>
                                  <td className={`px-4 py-2 hidden md:table-cell ${isOverdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                                    {item.deadline ?? "—"}
                                    {isOverdue && <span className="ml-1 text-[10px] bg-destructive/10 text-destructive px-1 rounded">{language === "en" ? "overdue" : "просрочено"}</span>}
                                  </td>
                                  <td className="px-4 py-2">
                                    <select
                                      className="h-7 w-full rounded border border-input bg-background px-1.5 text-xs"
                                      value={item.status}
                                      onChange={(e) => updateActionMutation.mutate({ id: item.id, payload: { status: e.target.value as CrisisActionItem["status"] } })}
                                    >
                                      <option value="pending">{t("crisisActionPending")}</option>
                                      <option value="in_progress">{t("crisisActionInProgress")}</option>
                                      <option value="completed">{t("crisisActionCompleted")}</option>
                                      <option value="blocked">{t("crisisActionBlocked")}</option>
                                    </select>
                                  </td>
                                  <td className="px-4 py-2">
                                    <div className="flex items-center gap-1.5">
                                      <div className="flex-1 bg-muted rounded-full h-1.5">
                                        <div className={`h-1.5 rounded-full transition-all ${item.status === "completed" ? "bg-success" : item.status === "blocked" ? "bg-destructive" : "bg-primary"}`} style={{ width: `${item.progressPct}%` }} />
                                      </div>
                                      <Input
                                        type="number"
                                        min={0} max={100}
                                        className="h-6 w-14 text-xs text-center px-1"
                                        value={item.progressPct}
                                        onChange={(e) => updateActionMutation.mutate({ id: item.id, payload: { progressPct: Math.min(100, Math.max(0, Number(e.target.value) || 0)) } })}
                                      />
                                      <span className="text-muted-foreground text-[10px]">%</span>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            );
          })()}
        </TabsContent>

        {/* ── MONITORING TAB ── */}
        <TabsContent value="monitoring" className="mt-4 space-y-4">
          {/* Latest snapshot KPIs */}
          {(() => {
            const latest = monitoringQuery.data?.[0];
            const variancePct = Number(latest?.financialMetrics?.variance_pct ?? 0);
            const utilization = Number(latest?.metrics?.utilization_refineries ?? 0);
            const exportVol = Number(latest?.metrics?.export_volumes ?? 0);
            const allAlerts = (monitoringQuery.data ?? []).flatMap(r => r.alerts ?? []);
            return (
              <div className="space-y-4">
                {/* Top KPI strip */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Card>
                    <CardContent className="p-3 flex items-start gap-2">
                      <div className="rounded-full bg-primary/10 p-1.5 mt-0.5"><BarChart3 className="h-4 w-4 text-primary" /></div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{language === "en" ? "Refinery load" : "Загрузка НПЗ"}</div>
                        <div className="text-xl font-bold text-primary">{latest ? `${(utilization * 100).toFixed(0)}%` : "—"}</div>
                        <div className="w-full bg-muted rounded-full h-1.5 mt-1">
                          <div className="bg-primary h-1.5 rounded-full" style={{ width: `${utilization * 100}%` }} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 flex items-start gap-2">
                      <div className="rounded-full bg-success/10 p-1.5 mt-0.5"><TrendingUp className="h-4 w-4 text-success" /></div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{language === "en" ? "Export volumes" : "Объёмы экспорта"}</div>
                        <div className="text-xl font-bold text-success">{latest ? `${(exportVol * 100).toFixed(0)}%` : "—"}</div>
                        <div className="w-full bg-muted rounded-full h-1.5 mt-1">
                          <div className="bg-success h-1.5 rounded-full" style={{ width: `${exportVol * 100}%` }} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 flex items-start gap-2">
                      <div className={`rounded-full p-1.5 mt-0.5 ${Math.abs(variancePct) > 10 ? "bg-destructive/10" : "bg-warning/10"}`}>
                        <DollarSign className={`h-4 w-4 ${Math.abs(variancePct) > 10 ? "text-destructive" : "text-warning"}`} />
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{language === "en" ? "Financial variance" : "Отклонение, финансы"}</div>
                        <div className={`text-xl font-bold ${Math.abs(variancePct) > 10 ? "text-destructive" : "text-warning"}`}>
                          {latest ? `${variancePct > 0 ? "+" : ""}${variancePct}%` : "—"}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">{language === "en" ? "vs plan" : "к плану"}</div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 flex items-start gap-2">
                      <div className={`rounded-full p-1.5 mt-0.5 ${allAlerts.length > 0 ? "bg-warning/10" : "bg-success/10"}`}>
                        <AlertTriangle className={`h-4 w-4 ${allAlerts.length > 0 ? "text-warning" : "text-success"}`} />
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{language === "en" ? "Active alerts" : "Активные алерты"}</div>
                        <div className={`text-xl font-bold ${allAlerts.length > 0 ? "text-warning" : "text-success"}`}>{allAlerts.length}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {monitoringQuery.isRefetching ? <span className="flex items-center gap-1"><RefreshCw className="h-2.5 w-2.5 animate-spin" />{language === "en" ? "updating…" : "обновляется…"}</span>
                            : language === "en" ? "auto-refresh 30s" : "авто-обновление 30с"}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Active alerts */}
                {allAlerts.length > 0 && (
                  <Card className="border-warning/30">
                    <CardHeader className="py-3 px-4">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-warning" />
                        {language === "en" ? "Alerts" : "Алерты"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-3 space-y-2">
                      {allAlerts.map((alert, i) => {
                        const sev = String(alert.severity ?? "info");
                        const sevStyle = sev === "critical" ? "border-destructive/40 bg-destructive/5 text-destructive" : sev === "warning" ? "border-warning/40 bg-warning/5 text-warning" : "border-border bg-muted/30 text-muted-foreground";
                        return (
                          <div key={i} className={`flex items-start gap-2 rounded-md border px-3 py-2 text-xs ${sevStyle}`}>
                            {sev === "critical" ? <AlertOctagon className="h-3.5 w-3.5 shrink-0 mt-0.5" /> : sev === "warning" ? <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" /> : <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />}
                            <div>
                              <span className="font-medium capitalize">{sev}</span>
                              {alert.type && <span className="ml-1 opacity-60">({String(alert.type)})</span>}
                              <p className="mt-0.5 opacity-90">{String(alert.message ?? "")}</p>
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                )}

                {/* Record new metrics form */}
                <Card>
                  <CardHeader className="py-3 px-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Activity className="h-4 w-4 text-primary" />
                        {language === "en" ? "Monitoring log" : "Журнал мониторинга"}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => queryClient.invalidateQueries({ queryKey: ["crisis-monitoring", selectedEventId] })}>
                          <RefreshCw className="h-3 w-3" />{language === "en" ? "Refresh" : "Обновить"}
                        </Button>
                        <Button size="sm" className="h-7 gap-1 text-xs" onClick={() => setShowMonitoringForm(v => !v)}>
                          {showMonitoringForm ? <X className="h-3 w-3" /> : <PlusCircle className="h-3 w-3" />}
                          {language === "en" ? "Record metrics" : "Записать метрики"}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  {showMonitoringForm && (
                    <div className="mx-4 mb-4 rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-3">
                      <p className="text-xs font-medium text-primary">{language === "en" ? "New monitoring entry" : "Новая запись мониторинга"}</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] text-muted-foreground block mb-0.5">{language === "en" ? "Refinery utilization (0–1)" : "Загрузка НПЗ (0–1)"}</label>
                          <Input type="number" step="0.01" min={0} max={1} className="h-7 text-xs" placeholder="0.83"
                            value={monitoringForm.utilizationRefineries ?? ""}
                            onChange={e => setMonitoringForm(f => ({ ...f, utilizationRefineries: e.target.value ? Number(e.target.value) : undefined }))} />
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground block mb-0.5">{language === "en" ? "Export volumes (0–1)" : "Объёмы экспорта (0–1)"}</label>
                          <Input type="number" step="0.01" min={0} max={1} className="h-7 text-xs" placeholder="0.92"
                            value={monitoringForm.exportVolumes ?? ""}
                            onChange={e => setMonitoringForm(f => ({ ...f, exportVolumes: e.target.value ? Number(e.target.value) : undefined }))} />
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground block mb-0.5">{language === "en" ? "Variance %" : "Отклонение %"}</label>
                          <Input type="number" step="0.1" className="h-7 text-xs" placeholder="5.0"
                            value={monitoringForm.variancePct ?? ""}
                            onChange={e => setMonitoringForm(f => ({ ...f, variancePct: e.target.value ? Number(e.target.value) : undefined }))} />
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground block mb-0.5">{language === "en" ? "Planned impact ($)" : "Плановый эффект ($)"}</label>
                          <Input type="number" className="h-7 text-xs" placeholder="-240000000"
                            value={monitoringForm.plannedImpact ?? ""}
                            onChange={e => setMonitoringForm(f => ({ ...f, plannedImpact: e.target.value ? Number(e.target.value) : undefined }))} />
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground block mb-0.5">{language === "en" ? "Actual impact ($)" : "Фактический эффект ($)"}</label>
                          <Input type="number" className="h-7 text-xs" placeholder="-252000000"
                            value={monitoringForm.actualImpact ?? ""}
                            onChange={e => setMonitoringForm(f => ({ ...f, actualImpact: e.target.value ? Number(e.target.value) : undefined }))} />
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground block mb-0.5">{language === "en" ? "Alert severity" : "Уровень алерта"}</label>
                          <select className="h-7 w-full rounded border border-input bg-background px-1.5 text-xs"
                            value={monitoringForm.alertSeverity ?? "warning"}
                            onChange={e => setMonitoringForm(f => ({ ...f, alertSeverity: e.target.value }))}>
                            <option value="info">Info</option>
                            <option value="warning">Warning</option>
                            <option value="critical">Critical</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground block mb-0.5">{language === "en" ? "Alert message (optional)" : "Сообщение алерта (необязательно)"}</label>
                        <Input className="h-7 text-xs" placeholder={language === "en" ? "e.g. Variance exceeds threshold" : "напр. Отклонение превышает порог"}
                          value={monitoringForm.alertMessage ?? ""}
                          onChange={e => setMonitoringForm(f => ({ ...f, alertMessage: e.target.value }))} />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground block mb-0.5">{language === "en" ? "Note" : "Примечание"}</label>
                        <Input className="h-7 text-xs" placeholder={language === "en" ? "Optional note..." : "Необязательное примечание..."}
                          value={monitoringForm.note ?? ""}
                          onChange={e => setMonitoringForm(f => ({ ...f, note: e.target.value }))} />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowMonitoringForm(false)}>{language === "en" ? "Cancel" : "Отмена"}</Button>
                        <Button size="sm" className="h-7 text-xs" disabled={addMonitoringMutation.isPending} onClick={() => addMonitoringMutation.mutate(monitoringForm)}>
                          {addMonitoringMutation.isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
                          {language === "en" ? "Save record" : "Сохранить"}
                        </Button>
                      </div>
                    </div>
                  )}
                  <CardContent className="px-0 pb-0">
                    {(monitoringQuery.data ?? []).length === 0 ? (
                      <div className="py-8 text-center text-muted-foreground text-xs">{t("crisisNoMonitoring")}</div>
                    ) : (
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-t border-b bg-muted/40">
                            <th className="text-left px-4 py-2 font-medium text-muted-foreground">{language === "en" ? "Date" : "Дата"}</th>
                            <th className="text-left px-4 py-2 font-medium text-muted-foreground">{language === "en" ? "Refinery" : "НПЗ"}</th>
                            <th className="text-left px-4 py-2 font-medium text-muted-foreground">{language === "en" ? "Export" : "Экспорт"}</th>
                            <th className="text-left px-4 py-2 font-medium text-muted-foreground">{language === "en" ? "Planned $" : "План $"}</th>
                            <th className="text-left px-4 py-2 font-medium text-muted-foreground">{language === "en" ? "Actual $" : "Факт $"}</th>
                            <th className="text-left px-4 py-2 font-medium text-muted-foreground">{language === "en" ? "Variance" : "Откл."}</th>
                            <th className="text-left px-4 py-2 font-medium text-muted-foreground">{language === "en" ? "Alerts" : "Алерты"}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(monitoringQuery.data ?? []).map((record, idx) => {
                            const vPct = Number(record.financialMetrics?.variance_pct ?? 0);
                            const alertCount = record.alerts?.length ?? 0;
                            const hasWarning = (record.alerts ?? []).some(a => a.severity === "warning" || a.severity === "critical");
                            return (
                              <tr key={record.id} className={`border-b last:border-b-0 hover:bg-muted/20 ${idx % 2 === 0 ? "" : "bg-muted/10"}`}>
                                <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">
                                  {new Date(record.recordedAt).toLocaleString(language === "en" ? "en-GB" : "ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                                </td>
                                <td className="px-4 py-2">
                                  {record.metrics?.utilization_refineries != null
                                    ? <><div className="font-medium">{(Number(record.metrics.utilization_refineries) * 100).toFixed(0)}%</div><div className="w-16 bg-muted rounded-full h-1 mt-0.5"><div className="bg-primary h-1 rounded-full" style={{ width: `${Number(record.metrics.utilization_refineries) * 100}%` }} /></div></>
                                    : "—"}
                                </td>
                                <td className="px-4 py-2">
                                  {record.metrics?.export_volumes != null
                                    ? <><div className="font-medium">{(Number(record.metrics.export_volumes) * 100).toFixed(0)}%</div><div className="w-16 bg-muted rounded-full h-1 mt-0.5"><div className="bg-success h-1 rounded-full" style={{ width: `${Number(record.metrics.export_volumes) * 100}%` }} /></div></>
                                    : "—"}
                                </td>
                                <td className="px-4 py-2 text-muted-foreground">{record.financialMetrics?.planned_impact != null ? renderFinancialValue(Number(record.financialMetrics.planned_impact)) : "—"}</td>
                                <td className="px-4 py-2">{record.financialMetrics?.actual_impact != null ? renderFinancialValue(Number(record.financialMetrics.actual_impact)) : "—"}</td>
                                <td className={`px-4 py-2 font-medium ${Math.abs(vPct) > 10 ? "text-destructive" : vPct !== 0 ? "text-warning" : "text-muted-foreground"}`}>
                                  {record.financialMetrics?.variance_pct != null ? `${vPct > 0 ? "+" : ""}${vPct}%` : "—"}
                                </td>
                                <td className="px-4 py-2">
                                  {alertCount > 0
                                    ? <span className={`flex items-center gap-1 ${hasWarning ? "text-warning" : "text-muted-foreground"}`}><AlertTriangle className="h-3 w-3" />{alertCount}</span>
                                    : <span className="text-success flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /></span>}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </CardContent>
                </Card>
              </div>
            );
          })()}
        </TabsContent>
      </Tabs>
    </div>
  );
}
