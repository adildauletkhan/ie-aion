import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type Node,
  type OnSelectionChangeParams,
  useEdgesState,
  useNodesState,
} from "reactflow";
import "reactflow/dist/style.css";
import { ObjectToolbox } from "./ObjectToolbox";
import { PropertiesPanel } from "./PropertiesPanel";
import { TopToolbar } from "./TopToolbar";
import { ObjectNode } from "./CustomNodes/ObjectNode";
import { fieldSchemeApi } from "../api/fieldSchemeApi";
import type { FieldObjectType } from "../types/fieldScheme.types";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, BarChart3, Boxes, Cpu, Database, FileDown, Settings, Sparkles } from "lucide-react";
import "../FieldSchemeEditor.css";
import { generateFieldSchemeRecommendation } from "@/lib/digitalTwinApi";

const nodeTypes = {
  object: ObjectNode,
};

type AiBlock =
  | { type: "heading"; label: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] };

function parseAiRecommendations(text: string): AiBlock[] {
  if (!text?.trim()) return [];
  const blocks: AiBlock[] = [];
  const sectionHeadRe = /^(Краткий ответ|Детали|Источники|Brief answer|Details|Sources)\s*$/im;
  const rawChunks = text.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
  for (const chunk of rawChunks) {
    const lines = chunk.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;
    const first = lines[0];
    if (sectionHeadRe.test(first)) {
      blocks.push({ type: "heading", label: first });
      if (lines.length > 1) {
        const rest = lines.slice(1);
        const listStartIdx = rest.findIndex((l) => /^[\d]+\.\s+/.test(l) || /^-\s+/.test(l));
        if (listStartIdx > 0) {
          const intro = rest.slice(0, listStartIdx).join(" ").trim();
          if (intro) blocks.push({ type: "paragraph", text: intro });
        }
        const listLines = listStartIdx >= 0 ? rest.slice(listStartIdx) : [];
        const listItems = listLines
          .map((l) => (/^[\d]+\.\s+/.test(l) || /^-\s+/.test(l) ? l.replace(/^[\d]+\.\s*/, "").replace(/^-\s*/, "").trim() : null))
          .filter((x): x is string => Boolean(x));
        if (listItems.length > 0) {
          blocks.push({ type: "list", items: listItems });
        } else if (listStartIdx < 0) {
          blocks.push({ type: "paragraph", text: rest.join(" ") });
        }
      }
      continue;
    }
    const listItems = lines
      .map((l) => (/^[\d]+\.\s+/.test(l) || /^-\s+/.test(l) ? l.replace(/^[\d]+\.\s*/, "").replace(/^-\s*/, "").trim() : null))
      .filter((x): x is string => Boolean(x));
    if (listItems.length >= 2 || (listItems.length === 1 && lines.length === 1)) {
      blocks.push({ type: "list", items: listItems });
    } else {
      blocks.push({ type: "paragraph", text: chunk });
    }
  }
  return blocks;
}

/* ─── Auto-layout helpers ─────────────────────────────────────────────────── */

const NODE_W = 140;
const NODE_H = 90;
const COL_GAP = 80;   // horizontal gap between nodes in the same column
const ROW_GAP = 60;   // vertical gap between nodes in the same column
const GROUP_GAP = 120; // horizontal gap between category columns

/** Returns true if any two nodes are within THRESHOLD px of each other */
function hasOverlappingNodes(nodes: Node[], threshold = 20): boolean {
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = Math.abs(nodes[i].position.x - nodes[j].position.x);
      const dy = Math.abs(nodes[i].position.y - nodes[j].position.y);
      if (dx < threshold && dy < threshold) return true;
    }
  }
  return false;
}

/**
 * Horizontal left-to-right layout.
 * Each category becomes a column; categories flow in pipeline order:
 *   Wells → Gathering → Separation → Processing → Transport → Utilities
 * Within each column nodes are stacked vertically and centered.
 */
function autoLayoutNodes(nodes: Node[]): Node[] {
  if (nodes.length === 0) return nodes;

  // Pipeline order: left = upstream, right = downstream
  const CATEGORY_ORDER = [
    "well", "well_pad",
    "gathering", "agzu", "separator",
    "processing", "dns", "ups", "cps",
    "pump_station", "transport",
    "storage", "export",
    "utilities", "other",
  ];

  const groups = new Map<string, Node[]>();
  for (const node of nodes) {
    const cat = (node.data?.objectType?.category as string | undefined)?.toLowerCase() ?? "other";
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat)!.push(node);
  }

  // Sort groups left-to-right by pipeline order
  const sortedGroups = [...groups.entries()].sort(([a], [b]) => {
    const ai = CATEGORY_ORDER.findIndex((c) => a.includes(c));
    const bi = CATEGORY_ORDER.findIndex((c) => b.includes(c));
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  // Max nodes in any single column — sets the canvas height
  const maxInGroup = Math.max(...sortedGroups.map(([, g]) => g.length), 1);

  // Wells get 2 sub-columns to halve the column height
  const WELL_COLS = 2;

  // Recalculate maxInGroup accounting for 2-column well groups
  const effectiveRows = (cat: string, count: number) =>
    cat.includes("well") ? Math.ceil(count / WELL_COLS) : count;

  const maxRows = Math.max(
    ...sortedGroups.map(([cat, g]) => effectiveRows(cat, g.length)),
    1,
  );

  const result: Node[] = [];
  let startX = 60;

  for (const [cat, catNodes] of sortedGroups) {
    const isWell = cat.includes("well");
    const subCols = isWell ? WELL_COLS : 1;
    const subColW = NODE_W + COL_GAP; // width of each sub-column slot

    const rows = Math.ceil(catNodes.length / subCols);
    const colHeight = rows * (NODE_H + ROW_GAP) - ROW_GAP;
    const maxHeight = maxRows * (NODE_H + ROW_GAP) - ROW_GAP;
    const topOffset = 60 + Math.round((maxHeight - colHeight) / 2);

    catNodes.forEach((node, i) => {
      const subCol = i % subCols;
      const row    = Math.floor(i / subCols);
      result.push({
        ...node,
        position: {
          x: startX + subCol * subColW,
          y: topOffset + row * (NODE_H + ROW_GAP),
        },
      });
    });

    // Advance startX by the total width this category occupies
    startX += subCols * subColW - COL_GAP + GROUP_GAP;
  }

  return result;
}

/* ─────────────────────────────────────────────────────────────────────────── */

interface FieldSchemeEditorProps {
  schemeId?: string;
  oilFieldId?: string;
  oilFieldName?: string;
}

export interface FieldSchemeEditorHandle {
  save: () => Promise<void>;
  isDirty: () => boolean;
}

export const FieldSchemeEditor = forwardRef<FieldSchemeEditorHandle, FieldSchemeEditorProps>(
  ({ schemeId, oilFieldId, oilFieldName }, ref) => {
  const { toast } = useToast();
  const { t, translateData } = useLanguage();
  const reactFlowInstanceRef = useRef<any>(null);
  const [nodes, setNodes] = useNodesState<Node>([]);
  const [edges, setEdges] = useEdgesState<Edge>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [objectTypes, setObjectTypes] = useState<FieldObjectType[]>([]);
  const [activeSchemeId, setActiveSchemeId] = useState<string | undefined>(schemeId);
  const [isToolboxCollapsed, setIsToolboxCollapsed] = useState(false);
  const [copiedNodes, setCopiedNodes] = useState<Node[]>([]);
  const [isPropsOpen, setIsPropsOpen] = useState(false);
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [analysisText, setAnalysisText] = useState("");
  const [analysisDetails, setAnalysisDetails] = useState<{
    oilPlan: number;
    waterPlan: number;
    gasPlan: number;
    totalPlan: number;
    bottleneck: number;
    blockedCount: number;
    bottlenecks: Array<{
      id: string;
      label: string;
      typeName: string;
      capacity: number;
      status: string;
      gap: number;
      isBlocked: boolean;
    }>;
    reserves: {
      geological: number;
      recoverable: number;
      remaining: number;
    };
    digitalTwinCoverage: {
      reservoirPressure: number;
      porosity: number;
      permeability: number;
      reserves: number;
    };
    nodeCount: number;
    edgeCount: number;
  } | null>(null);
  const [analysisAiText, setAnalysisAiText] = useState("");
  const [analysisAiLoading, setAnalysisAiLoading] = useState(false);
  const [analysisAiError, setAnalysisAiError] = useState("");
  const [history, setHistory] = useState<Array<{ nodes: Node[]; edges: Edge[] }>>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isRestoringRef = useRef(false);
  const historyIndexRef = useRef(-1);
  const lastSavedRef = useRef<string>("");
  const [isDirty, setIsDirty] = useState(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const oilFieldIdValue = useMemo(() => {
    if (!oilFieldId) return undefined;
    const parsed = Number(oilFieldId);
    return Number.isFinite(parsed) ? parsed : undefined;
  }, [oilFieldId]);

  const objectTypeMap = useMemo(
    () => Object.fromEntries(objectTypes.map((item) => [item.code, item])),
    [objectTypes]
  );

  useEffect(() => {
    fieldSchemeApi
      .listObjectTypes()
      .then(setObjectTypes)
      .catch(() => {
        toast({ title: t("fieldSchemeLoadTypesFailed") });
      });
  }, [toast, t]);

  useEffect(() => {
    if (!schemeId) {
      setNodes([]);
      setEdges([]);
      setActiveSchemeId(undefined);
      setHistory([{ nodes: [], edges: [] }]);
      setHistoryIndex(0);
      lastSavedRef.current = JSON.stringify({ nodes: [], edges: [] });
      setIsDirty(false);
      return;
    }
    
    // Очищаем предыдущие данные перед загрузкой новой схемы
    setNodes([]);
    setEdges([]);
    
    // Используем флаг для предотвращения race condition
    let isCancelled = false;
    
    fieldSchemeApi.getScheme(schemeId).then((data) => {
      // Если компонент размонтирован или schemeId изменился, игнорируем результат
      if (isCancelled) return;
      
      const flowNodes = data.objects.map((obj) => {
        const typeCode = obj.objectType.code;
        const type = "object";
        return {
          id: obj.id,
          type,
          position: { x: obj.positionX, y: obj.positionY },
          data: {
            label: obj.objectCode,
            properties: obj.properties,
            objectType: obj.objectType,
            typeCode,
          },
        };
      });
      const flowEdges = data.connections.map((conn) => ({
        id: conn.id,
        source: conn.sourceObjectId,
        target: conn.targetObjectId,
        type: "smoothstep",
        data: {
          flowProperties: conn.flowProperties,
          connectionType: conn.connectionType,
        },
        animated: conn.animated,
      }));
      // Auto-spread nodes if they overlap (e.g. all at (0,0))
      const layoutedNodes = hasOverlappingNodes(flowNodes) ? autoLayoutNodes(flowNodes) : flowNodes;

      setNodes(layoutedNodes);
      setEdges(flowEdges);
      setActiveSchemeId(data.scheme.id);
      setHistory([{ nodes: layoutedNodes, edges: flowEdges }]);
      setHistoryIndex(0);
      lastSavedRef.current = JSON.stringify({ nodes: layoutedNodes, edges: flowEdges });
      setIsDirty(false);

      // Wait for React to render nodes, then fit viewport
      setTimeout(() => {
        if (!isCancelled) {
          reactFlowInstanceRef.current?.fitView({ padding: 0.1, duration: 300 });
        }
      }, 50);
    }).catch((error) => {
      if (!isCancelled) {
        console.error("Failed to load scheme:", error);
      }
    });
    
    // Cleanup function - вызывается при размонтировании или перед следующим вызовом эффекта
    return () => {
      isCancelled = true;
    };
  }, [schemeId, setNodes, setEdges]);

  useEffect(() => {
    historyIndexRef.current = historyIndex;
    if (historyIndex >= 0 && historyIndex < history.length) {
      isRestoringRef.current = true;
      const state = history[historyIndex];
      setNodes(state.nodes);
      setEdges(state.edges);
      isRestoringRef.current = false;
    }
  }, [historyIndex, history, setNodes, setEdges]);

  const pushHistory = useCallback(
    (nextNodes: Node[], nextEdges: Edge[]) => {
      if (isRestoringRef.current) return;
      setHistory((prev) => {
        const trimmed = prev.slice(0, historyIndexRef.current + 1);
        return [...trimmed, { nodes: nextNodes, edges: nextEdges }];
      });
      setHistoryIndex((prev) => prev + 1);
      setIsDirty(JSON.stringify({ nodes: nextNodes, edges: nextEdges }) !== lastSavedRef.current);
    },
    []
  );

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const typeCode = event.dataTransfer.getData("application/reactflow");
      if (!typeCode) return;
      const type = "object";
      const objectType = objectTypeMap[typeCode];
      if (!objectType) {
        toast({ title: t("fieldSchemeObjectTypeNotLoaded") });
        return;
      }
      const instance = reactFlowInstanceRef.current;
      const position =
        instance && "screenToFlowPosition" in instance
          ? instance.screenToFlowPosition({ x: event.clientX, y: event.clientY })
          : instance
          ? instance.project({ x: event.clientX, y: event.clientY })
          : { x: event.clientX, y: event.clientY };
      const defaultProps = objectType?.defaultProperties ?? {};
      const newNode: Node = {
        id: `local-${typeCode}-${Date.now()}`,
        type,
        position,
        data: {
          label: `${translateData(objectType?.name ?? typeCode)}-${nodes.length + 1}`,
          properties: { ...defaultProps },
          objectType,
        },
      };
      const nextNodes = nodes.concat(newNode);
      setNodes(nextNodes);
      pushHistory(nextNodes, edges);
    },
    [nodes, edges, objectTypeMap, pushHistory, setNodes, toast, t, translateData]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onConnect = useCallback(
    (params: Connection) => {
      const edge: Edge = {
        ...params,
        id: `local-e-${params.source}-${params.target}-${Date.now()}`,
        type: "smoothstep",
        data: {
          flowProperties: { flow_rate: 0, pressure: 0 },
          connectionType: "oil_flow",
        },
      };
      const nextEdges = addEdge(edge, edges);
      setEdges(nextEdges);
      pushHistory(nodes, nextEdges);
    },
    [edges, nodes, pushHistory, setEdges]
  );

  const handleSelectionChange = useCallback((params: OnSelectionChangeParams) => {
    const node = params.nodes[0] ?? null;
    setSelectedNode(node);
  }, []);

  const handleSave = async () => {
    let schemeIdToUse = activeSchemeId;
    if (!schemeIdToUse) {
      if (!oilFieldIdValue) {
        toast({ title: t("fieldSchemeSelectOilField") });
        return;
      }
      const created = await fieldSchemeApi.createScheme({
        oilFieldId: oilFieldIdValue,
        name: t("fieldSchemeNewSchemeName"),
        description: "",
        isBaseline: false,
        isActive: true,
        canvasWidth: 2000,
        canvasHeight: 1500,
        zoomLevel: 1,
      });
      schemeIdToUse = created.id;
      setActiveSchemeId(created.id);
    }

    const idMap = new Map<string, string>();
    for (const node of nodes) {
      const objectType = node.data.objectType || objectTypeMap[node.type as string];
      if (!objectType) {
        toast({ title: t("fieldSchemeUnknownObjectType"), description: node.data.label });
        continue;
      }
      if (node.id.startsWith("local-")) {
        const createdObj = await fieldSchemeApi.createObject(schemeIdToUse, {
          objectTypeId: objectType?.id,
          objectCode: node.data.label,
          positionX: Math.round(node.position.x),
          positionY: Math.round(node.position.y),
          width: 120,
          height: 80,
          properties: node.data.properties ?? {},
        });
        idMap.set(node.id, createdObj.id);
      } else {
        await fieldSchemeApi.updateObject(schemeIdToUse, node.id, {
          objectCode: node.data.label,
          positionX: Math.round(node.position.x),
          positionY: Math.round(node.position.y),
          properties: node.data.properties ?? {},
        });
      }
    }

    for (const edge of edges) {
      const sourceId = idMap.get(edge.source) ?? edge.source;
      const targetId = idMap.get(edge.target) ?? edge.target;
      const connectionType = (edge.data as { connectionType?: string } | undefined)?.connectionType;
      if (edge.id.startsWith("local-")) {
        await fieldSchemeApi.createConnection(schemeIdToUse, {
          sourceObjectId: sourceId,
          targetObjectId: targetId,
          connectionType: connectionType ?? edge.type ?? "oil_flow",
          flowProperties: edge.data?.flowProperties ?? {},
          animated: edge.animated ?? false,
        });
      } else {
        await fieldSchemeApi.updateConnection(schemeIdToUse, edge.id, {
          connectionType: connectionType ?? edge.type ?? "oil_flow",
          flowProperties: edge.data?.flowProperties ?? {},
          animated: edge.animated ?? false,
        });
      }
    }

    lastSavedRef.current = JSON.stringify({ nodes, edges });
    setIsDirty(false);
    toast({ title: t("fieldSchemeSaved") });
  };

  const handleValidate = async () => {
    if (!activeSchemeId) {
      toast({ title: t("fieldSchemeSaveFirst") });
      return;
    }
    const result = await fieldSchemeApi.validateScheme(activeSchemeId);
    toast({
      title: t("fieldSchemeValidationTitle"),
      description:
        result.status === "valid" ? t("fieldSchemeValidationOk") : t("fieldSchemeValidationIssues"),
    });
  };

  const handleCalculate = async () => {
    if (!activeSchemeId) {
      toast({ title: t("fieldSchemeSaveFirst") });
      return;
    }
    await fieldSchemeApi.calculateScheme(activeSchemeId);

    const productionWells = nodes.filter((node) => node.data?.typeCode === "production_well");
    const oilPlan = productionWells.reduce(
      (sum, node) => sum + Number(node.data?.properties?.debit_oil ?? 0),
      0
    );
    const waterPlan = productionWells.reduce(
      (sum, node) => sum + Number(node.data?.properties?.debit_water ?? 0),
      0
    );
    const gasPlan = productionWells.reduce(
      (sum, node) => sum + Number(node.data?.properties?.debit_gas ?? 0),
      0
    );
    const totalPlan = oilPlan + waterPlan + gasPlan;

    const equipmentNodes = nodes.filter(
      (node) =>
        ["agzu", "uppn", "ppn", "vpn", "kun", "dns", "cps", "separator", "gcs", "bpv", "kns_ppd"].includes(
          node.data?.typeCode
        )
    );
    const capacityNodes = nodes.filter((node) => {
      const props = node.data?.properties ?? {};
      return (
        Number(props.capacity ?? 0) > 0 ||
        Number(props.capacity_m3_per_day ?? 0) > 0 ||
        Number(props.flow_rate ?? 0) > 0
      );
    });
    const capacities = equipmentNodes
      .map((node) => Number(node.data?.properties?.capacity ?? node.data?.properties?.capacity_m3_per_day ?? 0))
      .filter((value) => value > 0);
    const bottleneck = capacities.length ? Math.min(...capacities) : 0;

    const repairStatuses = new Map<string, number>();
    const blockedNodes = equipmentNodes.filter((node) => {
      const status = String(node.data?.properties?.sap_pm_status ?? "в работе").toLowerCase();
      repairStatuses.set(status, (repairStatuses.get(status) ?? 0) + 1);
      return ["в ремонте", "отказ", "остановлен"].includes(status);
    });

    const feasible = bottleneck === 0 ? false : oilPlan <= bottleneck && blockedNodes.length === 0;
    const demandBasis = oilPlan || totalPlan;
    const bottlenecks = capacityNodes
      .map((node) => {
        const props = node.data?.properties ?? {};
        const capacity =
          Number(props.capacity ?? 0) || Number(props.capacity_m3_per_day ?? 0) || Number(props.flow_rate ?? 0);
        const status = String(props.sap_pm_status ?? "в работе").toLowerCase();
        const gap = capacity > 0 ? demandBasis - capacity : 0;
        return {
          id: node.id,
          label: String(
            translateData(node.data?.label ?? node.data?.objectType?.name ?? t("fieldSchemeObjectLabel"))
          ),
          typeName: String(node.data?.objectType?.name ?? ""),
          capacity,
          status,
          gap,
          isBlocked: ["в ремонте", "отказ", "остановлен"].includes(status),
        };
      })
      .filter((item) => item.isBlocked || item.gap > 0)
      .sort((a, b) => Number(b.isBlocked) - Number(a.isBlocked) || b.gap - a.gap)
      .slice(0, 5);

    const reservesGeological = nodes.reduce(
      (sum, node) => sum + Number(node.data?.properties?.reserves_geological ?? 0),
      0
    );
    const reservesRecoverable = nodes.reduce(
      (sum, node) => sum + Number(node.data?.properties?.reserves_recoverable ?? 0),
      0
    );
    const reservesRemaining = nodes.reduce(
      (sum, node) => sum + Number(node.data?.properties?.reserves_remaining ?? 0),
      0
    );

    const digitalTwinCoverage = {
      reservoirPressure: nodes.filter((node) => Number(node.data?.properties?.reservoir_pressure ?? 0) > 0).length,
      porosity: nodes.filter((node) => Number(node.data?.properties?.porosity ?? 0) > 0).length,
      permeability: nodes.filter((node) => Number(node.data?.properties?.permeability ?? 0) > 0).length,
      reserves: nodes.filter((node) => Number(node.data?.properties?.reserves_recoverable ?? 0) > 0).length,
    };

    const lines = [
      `${t("fieldSchemeAnalysisPlanOil")}: ${oilPlan.toFixed(1)} ${t("fieldSchemeAiUnitsTonsPerDay")}`,
      `${t("fieldSchemeAnalysisPlanWater")}: ${waterPlan.toFixed(1)} ${t("fieldSchemeAiUnitsTonsPerDay")}`,
      `${t("fieldSchemeAnalysisPlanGas")}: ${gasPlan.toFixed(1)} ${t("fieldSchemeAiUnitsTonsPerDay")}`,
      `${t("fieldSchemeAnalysisPlanTotal")}: ${totalPlan.toFixed(1)} ${t("fieldSchemeAiUnitsTonsPerDay")}`,
      `${t("fieldSchemeAnalysisMinCapacityLine")}: ${bottleneck.toFixed(1)} ${t(
        "fieldSchemeAiUnitsCubicPerDay"
      )}`,
      `${t("fieldSchemeAnalysisEquipmentDownLine")}: ${blockedNodes.length}`,
    ];

    if (repairStatuses.size > 0) {
      const statusLine = Array.from(repairStatuses.entries())
        .map(([status, count]) => `${status}: ${count}`)
        .join(", ");
      lines.push(`${t("fieldSchemeAnalysisSapStatuses")}: ${statusLine}`);
    }

    lines.push(
      feasible
        ? t("fieldSchemeAnalysisConclusionOk")
        : t("fieldSchemeAnalysisConclusionBad")
    );

    setAnalysisText(lines.join("\n"));
    setAnalysisDetails({
      oilPlan,
      waterPlan,
      gasPlan,
      totalPlan,
      bottleneck,
      blockedCount: blockedNodes.length,
      bottlenecks,
      reserves: {
        geological: reservesGeological,
        recoverable: reservesRecoverable,
        remaining: reservesRemaining,
      },
      digitalTwinCoverage,
      nodeCount: nodes.length,
      edgeCount: edges.length,
    });
    setAnalysisAiText("");
    setAnalysisAiError("");
    setAnalysisAiLoading(true);
    setAnalysisOpen(true);

    const question = [
      t("fieldSchemeAiRequest"),
      `${t("fieldSchemeAiContextPrefix")}${oilFieldName ?? t("fieldSchemeAiContextUnknown")}.`,
      `${t("fieldSchemeAiPlanPrefix")} ${t("fieldSchemeAiOil")} ${oilPlan.toFixed(1)} ${t(
        "fieldSchemeAiUnitsTonsPerDay"
      )}, ${t("fieldSchemeAiWater")} ${waterPlan.toFixed(1)} ${t(
        "fieldSchemeAiUnitsTonsPerDay"
      )}, ${t("fieldSchemeAiGas")} ${gasPlan.toFixed(1)} ${t("fieldSchemeAiUnitsTonsPerDay")}.`,
      `${t("fieldSchemeAiMinCapacityPrefix")} ${bottleneck.toFixed(1)} ${t("fieldSchemeAiUnitsCubicPerDay")}.`,
      `${t("fieldSchemeAiEquipmentDownPrefix")} ${blockedNodes.length}.`,
      bottlenecks.length
        ? `${t("fieldSchemeAiBottlenecksPrefix")} ${bottlenecks
            .map(
              (item) =>
                `${item.label} (${item.typeName || t("fieldSchemeObjectLabel")}), ${t(
                  "fieldSchemeAiCapacityWord"
                )} ${item.capacity}`
            )
            .join("; ")}.`
        : t("fieldSchemeAiNoBottlenecks"),
      `${t("fieldSchemeAiReservesPrefix")} ${t("fieldSchemeAiReservesGeologicalWord")} ${reservesGeological.toFixed(1)} ${t(
        "fieldSchemeAiUnitsMlnTons"
      )}, ${t("fieldSchemeAiReservesRecoverableWord")} ${reservesRecoverable.toFixed(1)} ${t(
        "fieldSchemeAiUnitsMlnTons"
      )}, ${t("fieldSchemeAiReservesRemainingWord")} ${reservesRemaining.toFixed(1)} ${t(
        "fieldSchemeAiUnitsMlnTons"
      )}.`,
      `${t("fieldSchemeAiCoveragePrefix")} ${t("fieldSchemeAiCoveragePressure")} ${
        digitalTwinCoverage.reservoirPressure
      } ${t("fieldSchemeAiUnitsCount")}, ${t("fieldSchemeAiCoveragePorosity")} ${
        digitalTwinCoverage.porosity
      }, ${t("fieldSchemeAiCoveragePermeability")} ${digitalTwinCoverage.permeability}, ${t(
        "fieldSchemeAiCoverageReserves"
      )} ${digitalTwinCoverage.reserves}.`,
      t("fieldSchemeAiNeeds"),
    ].join(" ");

    try {
      const aiAnswer = await generateFieldSchemeRecommendation(question);
      setAnalysisAiText(aiAnswer || t("fieldSchemeAnalysisAiNoAnswer"));
    } catch (error) {
      setAnalysisAiError(t("fieldSchemeAnalysisAiUnavailable"));
    } finally {
      setAnalysisAiLoading(false);
    }
  };

  const handleDelete = () => {
    const selectedIds = new Set(nodes.filter((node) => node.selected).map((node) => node.id));
    if (selectedIds.size === 0 && selectedNode) {
      selectedIds.add(selectedNode.id);
    }
    if (selectedIds.size === 0) {
      toast({ title: t("fieldSchemeSelectToDelete") });
      return;
    }
    const nextNodes = nodes.filter((node) => !selectedIds.has(node.id));
    const nextEdges = edges.filter((edge) => !selectedIds.has(edge.source) && !selectedIds.has(edge.target));
    setNodes(nextNodes);
    setEdges(nextEdges);
    pushHistory(nextNodes, nextEdges);
    setSelectedNode(null);
    setIsPropsOpen(false);
  };

  const handleCopy = () => {
    const selected = nodes.filter((node) => node.selected);
    if (selected.length === 0 && selectedNode) {
      setCopiedNodes([selectedNode]);
      toast({ title: t("fieldSchemeCopiedOne") });
      return;
    }
    if (selected.length === 0) {
      toast({ title: t("fieldSchemeSelectToCopy") });
      return;
    }
    setCopiedNodes(selected);
    toast({
      title: t("fieldSchemeCopiedMany"),
      description: `${t("fieldSchemeCopiedCount")}: ${selected.length}`,
    });
  };

  const handleCut = () => {
    const selected = nodes.filter((node) => node.selected);
    if (selected.length === 0 && selectedNode) {
      setCopiedNodes([selectedNode]);
      handleDelete();
      return;
    }
    if (selected.length === 0) {
      toast({ title: t("fieldSchemeSelectToCut") });
      return;
    }
    setCopiedNodes(selected);
    handleDelete();
  };

  const handlePaste = () => {
    if (copiedNodes.length === 0) {
      toast({ title: t("fieldSchemeNoCopied") });
      return;
    }
    const now = Date.now();
    const newNodes = copiedNodes.map((node, idx) => ({
      ...node,
      id: `local-${node.type}-${now}-${idx}`,
      position: {
        x: node.position.x + 40,
        y: node.position.y + 40,
      },
      data: {
        ...node.data,
        label: `${node.data.label ?? t("fieldSchemeObjectLabel")} ${t("fieldSchemeCopySuffix")}`,
      },
      selected: false,
    }));
    const nextNodes = nodes.concat(newNodes);
    setNodes(nextNodes);
    pushHistory(nextNodes, edges);
    setSelectedNode(newNodes[0] ?? null);
  };

  const handleUndo = () => {
    setHistoryIndex((idx) => Math.max(0, idx - 1));
  };

  const handleRedo = () => {
    setHistoryIndex((idx) => Math.min(history.length - 1, idx + 1));
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || target?.isContentEditable) return;

      const key = event.key.toLowerCase();
      const ctrl = event.ctrlKey || event.metaKey;

      if (ctrl && key === "a") {
        event.preventDefault();
        const nextNodes = nodes.map((node) => ({ ...node, selected: true }));
        setNodes(nextNodes);
        pushHistory(nextNodes, edges);
        return;
      }
      if (ctrl && key === "z") {
        event.preventDefault();
        handleUndo();
        return;
      }
      if (ctrl && (key === "y" || (event.shiftKey && key === "z"))) {
        event.preventDefault();
        handleRedo();
        return;
      }
      if (ctrl && key === "c") {
        event.preventDefault();
        handleCopy();
        return;
      }
      if (ctrl && key === "x") {
        event.preventDefault();
        handleCut();
        return;
      }
      if (ctrl && key === "v") {
        event.preventDefault();
        handlePaste();
        return;
      }
      if (key === "delete" || key === "backspace") {
        event.preventDefault();
        handleDelete();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    edges,
    nodes,
    pushHistory,
    setNodes,
    handleCopy,
    handleCut,
    handlePaste,
    handleDelete,
    handleUndo,
    handleRedo,
  ]);

  const handleExportPdf = () => {
    toast({ title: t("fieldSchemeExportPdfTitle"), description: t("fieldSchemeExportPdfDesc") });
    document.body.classList.add("print-scheme");
    const instance = reactFlowInstanceRef.current;
    if (instance?.fitView) {
      instance.fitView({ padding: 0.1, duration: 200 });
    }
    const cleanup = () => {
      document.body.classList.remove("print-scheme");
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    setTimeout(() => window.print(), 300);
  };

  const handleExportXml = () => {
    const doc = document.implementation.createDocument("", "scheme", null);
    const root = doc.documentElement;
    const nodesEl = doc.createElement("nodes");
    const edgesEl = doc.createElement("edges");
    root.appendChild(nodesEl);
    root.appendChild(edgesEl);

    nodes.forEach((node) => {
      const nodeEl = doc.createElement("node");
      nodeEl.setAttribute("id", node.id);
      nodeEl.setAttribute("type", node.type ?? "object");
      nodeEl.setAttribute("x", String(node.position.x));
      nodeEl.setAttribute("y", String(node.position.y));
      const dataEl = doc.createElement("data");
      dataEl.textContent = JSON.stringify(node.data ?? {});
      nodeEl.appendChild(dataEl);
      nodesEl.appendChild(nodeEl);
    });

    edges.forEach((edge) => {
      const edgeEl = doc.createElement("edge");
      edgeEl.setAttribute("id", edge.id);
      edgeEl.setAttribute("source", edge.source);
      edgeEl.setAttribute("target", edge.target);
      edgeEl.setAttribute("type", edge.type ?? "oil_flow");
      const dataEl = doc.createElement("data");
      dataEl.textContent = JSON.stringify(edge.data ?? {});
      edgeEl.appendChild(dataEl);
      edgesEl.appendChild(edgeEl);
    });

    const xml = new XMLSerializer().serializeToString(doc);
    const blob = new Blob([xml], { type: "application/xml" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `scheme-${activeSchemeId ?? "new"}.xml`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleImportXml = (file?: File) => {
    const targetFile = file ?? importInputRef.current?.files?.[0];
    if (!targetFile) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parser = new DOMParser();
        const xml = parser.parseFromString(String(reader.result), "application/xml");
        const nodeEls = Array.from(xml.getElementsByTagName("node"));
        const edgeEls = Array.from(xml.getElementsByTagName("edge"));
        const importedNodes: Node[] = nodeEls.map((el) => {
          const dataText = el.getElementsByTagName("data")[0]?.textContent ?? "{}";
          const data = JSON.parse(dataText);
          const typeCode = data.typeCode ?? data.objectType?.code;
          return {
            id: el.getAttribute("id") ?? `local-${Date.now()}`,
            type: (el.getAttribute("type") ?? "object") as string,
            position: {
              x: Number(el.getAttribute("x") ?? 0),
              y: Number(el.getAttribute("y") ?? 0),
            },
            data: {
              ...data,
              objectType: data.objectType ?? objectTypeMap[typeCode],
              typeCode: typeCode ?? data.typeCode,
            },
          } as Node;
        });
        const importedEdges: Edge[] = edgeEls.map((el) => {
          const dataText = el.getElementsByTagName("data")[0]?.textContent ?? "{}";
          const data = JSON.parse(dataText);
          return {
            id: el.getAttribute("id") ?? `local-${Date.now()}`,
            source: el.getAttribute("source") ?? "",
            target: el.getAttribute("target") ?? "",
            type: el.getAttribute("type") ?? "oil_flow",
            data,
          } as Edge;
        });
        setNodes(importedNodes);
        setEdges(importedEdges);
        pushHistory(importedNodes, importedEdges);
        toast({ title: t("fieldSchemeXmlImported") });
      } catch (error) {
        toast({ title: t("fieldSchemeXmlImportError") });
      }
    };
    reader.readAsText(targetFile);
  };

  const handleAutoLayout = useCallback(() => {
    const laid = autoLayoutNodes(nodes);
    setNodes(laid);
    pushHistory(laid, edges);
    setTimeout(() => reactFlowInstanceRef.current?.fitView({ padding: 0.12, duration: 400 }), 50);
    toast({ title: t("fieldSchemeAutoLayoutDone") });
  }, [nodes, edges, pushHistory, setNodes, toast, t]);

  useImperativeHandle(ref, () => ({
    save: handleSave,
    isDirty: () => isDirty,
  }));

  return (
    <div className="field-scheme-editor" data-print-title={t("fieldSchemeTitle")}>
      <TopToolbar
        onSave={handleSave}
        onValidate={handleValidate}
        onCalculate={handleCalculate}
        onDelete={handleDelete}
        onCopy={handleCopy}
        onPaste={handlePaste}
        onExportPdf={handleExportPdf}
        onExportXml={handleExportXml}
        onImportXml={() => importInputRef.current?.click()}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onAutoLayout={handleAutoLayout}
        oilFieldName={oilFieldName}
      />
      <input
        ref={importInputRef}
        type="file"
        accept=".xml"
        onChange={(event) => handleImportXml(event.target.files?.[0])}
        style={{ display: "none" }}
      />
      <div className={`editor-layout${isToolboxCollapsed ? " toolbox-collapsed" : ""}`}>
        <div className={`side-panel left${isToolboxCollapsed ? " collapsed" : ""}`}>
          <div className="side-panel-header">
            <button
              type="button"
              className="panel-toggle"
              onClick={() => setIsToolboxCollapsed((prev) => !prev)}
            >
              {isToolboxCollapsed ? <Boxes className="h-4 w-4" /> : `▾ ${t("fieldSchemeObjects")}`}
            </button>
          </div>
          {!isToolboxCollapsed && <ObjectToolbox types={objectTypes} />}
        </div>
        <div className="canvas-container" onDrop={onDrop} onDragOver={onDragOver}>
          <ReactFlow
            key={schemeId || 'empty'}
            nodes={nodes}
            edges={edges}
            onInit={(instance) => {
              reactFlowInstanceRef.current = instance;
            }}
            selectionOnDrag
            selectionMode="partial"
            panOnDrag={false}
            onNodesChange={(changes) => {
              const nextNodes = applyNodeChanges(changes, nodes);
              setNodes(nextNodes);
              pushHistory(nextNodes, edges);
            }}
            onEdgesChange={(changes) => {
              const nextEdges = applyEdgeChanges(changes, edges);
              setEdges(nextEdges);
              pushHistory(nodes, nextEdges);
            }}
            onConnect={onConnect}
            onNodeDoubleClick={(_, node) => {
              setSelectedNode(node);
              setIsPropsOpen(true);
            }}
            onSelectionChange={handleSelectionChange}
            onPaneClick={() => {
              setSelectedNode(null);
              setIsPropsOpen(false);
            }}
            nodeTypes={nodeTypes}
          >
            <Background />
            <Controls />
            <MiniMap zoomable pannable className="mini-map" />
          </ReactFlow>
        </div>
      </div>
      <Dialog
        open={isPropsOpen && Boolean(selectedNode)}
        onOpenChange={(open) => {
          setIsPropsOpen(open);
          if (!open) {
            setSelectedNode(null);
          }
        }}
      >
        <DialogContent className="properties-dialog">
          <DialogHeader>
          <DialogTitle>{t("fieldSchemeObjectPassport")}</DialogTitle>
          </DialogHeader>
          {selectedNode && (
            <PropertiesPanel
              node={selectedNode}
              onUpdate={(updates) => {
                setNodes((nds) =>
                  nds.map((node) =>
                    node.id === selectedNode.id
                      ? {
                          ...node,
                          data: {
                            ...node.data,
                            ...updates,
                          },
                        }
                      : node
                  )
                );
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={analysisOpen} onOpenChange={setAnalysisOpen}>
        <DialogContent
          className="analysis-dialog max-w-[min(1200px,95vw)] w-[min(1200px,95vw)] max-h-[90vh] flex flex-col gap-0 overflow-hidden"
          style={{ maxHeight: "90vh" }}
        >
          <DialogHeader className="flex flex-row items-center justify-between gap-4 shrink-0 pr-8">
            <DialogTitle className="text-lg font-semibold">{t("fieldSchemeAnalysisTitle")}</DialogTitle>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => {
                const sections: string[] = [];
                sections.push(
                  `<h2 style="font-size:14px;font-weight:600;margin:0 0 8px">${t("fieldSchemeAnalysisSummary")}</h2>`,
                  `<pre style="white-space:pre-wrap;font-size:12px;margin:0 0 16px">${analysisText.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>`
                );
                if (analysisDetails) {
                  sections.push(
                    `<h2 style="font-size:14px;font-weight:600;margin:0 0 8px">${t("fieldSchemeAnalysisParameters")}</h2>`,
                    `<p style="font-size:12px;margin:0 0 16px">${t("fieldSchemeAnalysisNodes")}: ${analysisDetails.nodeCount}, ${t("fieldSchemeAnalysisEdges")}: ${analysisDetails.edgeCount}, ${t("fieldSchemeAnalysisMinCapacity")}: ${analysisDetails.bottleneck.toFixed(1)}, ${t("fieldSchemeAnalysisEquipmentDown")}: ${analysisDetails.blockedCount}</p>`,
                    `<h2 style="font-size:14px;font-weight:600;margin:0 0 8px">${t("fieldSchemeAnalysisBottlenecks")}</h2>`,
                    analysisDetails.bottlenecks.length === 0
                      ? `<p style="font-size:12px;margin:0 0 16px">${t("fieldSchemeAnalysisNoBottlenecks")}</p>`
                      : `<ul style="font-size:12px;margin:0 0 16px;padding-left:20px">${analysisDetails.bottlenecks
                          .map(
                            (b) =>
                              `<li>${b.label}${b.typeName ? ` · ${b.typeName}` : ""} — ${t("fieldSchemeAnalysisCapacityLabel")}: ${b.capacity.toFixed(1)}, ${t("fieldSchemeAnalysisStatusLabel")}: ${b.status}${b.gap > 0 ? `, ${t("fieldSchemeAnalysisGapLabel")}: ${b.gap.toFixed(1)}` : ""}</li>`
                          )
                          .join("")}</ul>`,
                    `<h2 style="font-size:14px;font-weight:600;margin:0 0 8px">${t("fieldSchemeAnalysisReserves")}</h2>`,
                    `<p style="font-size:12px;margin:0 0 16px">${t("fieldSchemeAnalysisReservesGeological")}: ${analysisDetails.reserves.geological.toFixed(1)} ${t("fieldSchemeAiUnitsMlnTons")}, ${t("fieldSchemeAnalysisReservesRecoverable")}: ${analysisDetails.reserves.recoverable.toFixed(1)} ${t("fieldSchemeAiUnitsMlnTons")}, ${t("fieldSchemeAnalysisReservesRemaining")}: ${analysisDetails.reserves.remaining.toFixed(1)} ${t("fieldSchemeAiUnitsMlnTons")}</p>`,
                    `<h2 style="font-size:14px;font-weight:600;margin:0 0 8px">${t("fieldSchemeAnalysisTwinReadiness")}</h2>`,
                    `<p style="font-size:12px;margin:0 0 16px">${t("fieldSchemeAnalysisTwinPressure")}: ${analysisDetails.digitalTwinCoverage.reservoirPressure}, ${t("fieldSchemeAnalysisTwinPorosity")}: ${analysisDetails.digitalTwinCoverage.porosity}, ${t("fieldSchemeAnalysisTwinPermeability")}: ${analysisDetails.digitalTwinCoverage.permeability}, ${t("fieldSchemeAnalysisTwinReserves")}: ${analysisDetails.digitalTwinCoverage.reserves}</p>`
                  );
                }
                sections.push(
                  `<h2 style="font-size:14px;font-weight:600;margin:0 0 8px">${t("fieldSchemeAnalysisAiTitle")}</h2>`,
                  `<pre style="white-space:pre-wrap;font-size:12px;margin:0">${(analysisAiText || t("fieldSchemeAnalysisAiNoData")).replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>`
                );
                const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${t("fieldSchemeAnalysisTitle")}</title></head><body style="font-family:system-ui,sans-serif;padding:24px;max-width:900px;margin:0 auto">${`<h1 style="font-size:18px;margin:0 0 20px">${t("fieldSchemeAnalysisTitle")}</h1>`}${sections.join("")}</body></html>`;
                const w = window.open("", "_blank");
                if (w) {
                  w.document.write(html);
                  w.document.close();
                  w.focus();
                  setTimeout(() => w.print(), 300);
                } else {
                  toast({ title: t("fieldSchemeExportPdfTitle"), description: t("fieldSchemeExportPdfDesc") });
                }
              }}
            >
              <FileDown className="h-4 w-4 mr-2" />
              {t("fieldSchemeExportPdf")}
            </Button>
          </DialogHeader>
          <div className="analysis-report-wrap flex-1 min-h-0 overflow-y-auto pr-1">
            <div className="analysis-report">
              <section className="analysis-zone">
                <div className="analysis-zone-header">
                  <div className="analysis-zone-icon">
                    <BarChart3 className="h-4 w-4" />
                  </div>
                  <h2 className="analysis-zone-title">{t("fieldSchemeAnalysisSummary")}</h2>
                </div>
                <pre className="analysis-output">{analysisText}</pre>
              </section>
              {analysisDetails && (
                <>
                  <section className="analysis-zone">
                    <div className="analysis-zone-header">
                      <div className="analysis-zone-icon">
                        <Settings className="h-4 w-4" />
                      </div>
                      <h2 className="analysis-zone-title">{t("fieldSchemeAnalysisParameters")}</h2>
                    </div>
                    <div className="analysis-grid">
                      <div className="analysis-grid-item">
                        <div className="analysis-label">{t("fieldSchemeAnalysisNodes")}</div>
                        <div className="analysis-value">{analysisDetails.nodeCount}</div>
                      </div>
                      <div className="analysis-grid-item">
                        <div className="analysis-label">{t("fieldSchemeAnalysisEdges")}</div>
                        <div className="analysis-value">{analysisDetails.edgeCount}</div>
                      </div>
                      <div className="analysis-grid-item">
                        <div className="analysis-label">{t("fieldSchemeAnalysisMinCapacity")}</div>
                        <div className="analysis-value">
                          {analysisDetails.bottleneck.toFixed(1)} {t("fieldSchemeAiUnitsCubicPerDay")}
                        </div>
                      </div>
                      <div className="analysis-grid-item">
                        <div className="analysis-label">{t("fieldSchemeAnalysisEquipmentDown")}</div>
                        <div className="analysis-value">{analysisDetails.blockedCount}</div>
                      </div>
                    </div>
                  </section>
                  <section className="analysis-zone">
                    <div className="analysis-zone-header">
                      <div className="analysis-zone-icon">
                        <AlertTriangle className="h-4 w-4" />
                      </div>
                      <h2 className="analysis-zone-title">{t("fieldSchemeAnalysisBottlenecks")}</h2>
                    </div>
                    {analysisDetails.bottlenecks.length === 0 && (
                      <div className="analysis-muted">{t("fieldSchemeAnalysisNoBottlenecks")}</div>
                    )}
                    {analysisDetails.bottlenecks.length > 0 && (
                      <div className="analysis-list">
                        {analysisDetails.bottlenecks.map((item) => (
                          <div key={item.id} className="analysis-list-item">
                            <div className="analysis-item-title">
                              {item.label}
                              {item.typeName ? ` · ${item.typeName}` : ""}
                            </div>
                            <div className="analysis-item-meta">
                              {t("fieldSchemeAnalysisCapacityLabel")}: {item.capacity.toFixed(1)} · {t(
                                "fieldSchemeAnalysisStatusLabel"
                              )}
                              : {item.status}
                              {item.gap > 0
                                ? ` · ${t("fieldSchemeAnalysisGapLabel")}: ${item.gap.toFixed(1)}`
                                : ""}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                  <section className="analysis-zone">
                    <div className="analysis-zone-header">
                      <div className="analysis-zone-icon">
                        <Database className="h-4 w-4" />
                      </div>
                      <h2 className="analysis-zone-title">{t("fieldSchemeAnalysisReserves")}</h2>
                    </div>
                    <div className="analysis-grid">
                      <div className="analysis-grid-item">
                        <div className="analysis-label">{t("fieldSchemeAnalysisReservesGeological")}</div>
                        <div className="analysis-value">
                          {analysisDetails.reserves.geological.toFixed(1)} {t("fieldSchemeAiUnitsMlnTons")}
                        </div>
                      </div>
                      <div className="analysis-grid-item">
                        <div className="analysis-label">{t("fieldSchemeAnalysisReservesRecoverable")}</div>
                        <div className="analysis-value">
                          {analysisDetails.reserves.recoverable.toFixed(1)} {t("fieldSchemeAiUnitsMlnTons")}
                        </div>
                      </div>
                      <div className="analysis-grid-item">
                        <div className="analysis-label">{t("fieldSchemeAnalysisReservesRemaining")}</div>
                        <div className="analysis-value">
                          {analysisDetails.reserves.remaining.toFixed(1)} {t("fieldSchemeAiUnitsMlnTons")}
                        </div>
                      </div>
                    </div>
                  </section>
                  <section className="analysis-zone">
                    <div className="analysis-zone-header">
                      <div className="analysis-zone-icon">
                        <Cpu className="h-4 w-4" />
                      </div>
                      <h2 className="analysis-zone-title">{t("fieldSchemeAnalysisTwinReadiness")}</h2>
                    </div>
                    <div className="analysis-grid">
                      <div className="analysis-grid-item">
                        <div className="analysis-label">{t("fieldSchemeAnalysisTwinPressure")}</div>
                        <div className="analysis-value">{analysisDetails.digitalTwinCoverage.reservoirPressure}</div>
                      </div>
                      <div className="analysis-grid-item">
                        <div className="analysis-label">{t("fieldSchemeAnalysisTwinPorosity")}</div>
                        <div className="analysis-value">{analysisDetails.digitalTwinCoverage.porosity}</div>
                      </div>
                      <div className="analysis-grid-item">
                        <div className="analysis-label">{t("fieldSchemeAnalysisTwinPermeability")}</div>
                        <div className="analysis-value">{analysisDetails.digitalTwinCoverage.permeability}</div>
                      </div>
                      <div className="analysis-grid-item">
                        <div className="analysis-label">{t("fieldSchemeAnalysisTwinReserves")}</div>
                        <div className="analysis-value">{analysisDetails.digitalTwinCoverage.reserves}</div>
                      </div>
                    </div>
                  </section>
                </>
              )}
              <section className="analysis-zone analysis-zone-ai">
                <div className="analysis-zone-header">
                  <div className="analysis-zone-icon">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <h2 className="analysis-zone-title">{t("fieldSchemeAnalysisAiTitle")}</h2>
                </div>
                {analysisAiLoading && <div className="analysis-muted">{t("fieldSchemeAnalysisAiLoading")}</div>}
                {!analysisAiLoading && analysisAiError && (
                  <div className="analysis-muted">{analysisAiError}</div>
                )}
                {!analysisAiLoading && !analysisAiError && (() => {
                  const raw = analysisAiText || t("fieldSchemeAnalysisAiNoData");
                  const parsed = parseAiRecommendations(raw);
                  if (parsed.length === 0) {
                    return <pre className="analysis-output">{raw}</pre>;
                  }
                  return (
                    <div className="analysis-ai-body">
                      {parsed.map((block, i) => (
                        <div key={i} className="analysis-ai-block">
                          {block.type === "heading" && (
                            <div className="analysis-ai-heading">{block.label}</div>
                          )}
                          {block.type === "paragraph" && (
                            <p className="analysis-ai-paragraph">{block.text}</p>
                          )}
                          {block.type === "list" && (
                            <ul className="analysis-ai-list">
                              {block.items.map((item, j) => (
                                <li key={j}>{item}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </section>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
});

FieldSchemeEditor.displayName = "FieldSchemeEditor";
