import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Calculator, Download, TrendingDown, AlertCircle,
  ChevronDown, ChevronRight, Network, Brain, Layers, BarChart3, Gauge,
  PieChart, ArrowLeftRight, SlidersHorizontal, Trophy, Target
} from "lucide-react";
import { getAuthHeader } from "@/lib/auth";
import { useLanguage } from "@/hooks/useLanguage";
import { useWorkspace } from "@/context/WorkspaceContext";

// ─── Types ───────────────────────────────────────────────────────────────────

type OilField = { id: number; name: string; shortName?: string | null };

type Well = {
  id: number;
  name: string;
  formationId: number;
  formationName: string;
  zoneId?: number;
  zoneName?: string;
  status: string;
};

type WellTestData = {
  wellId: number;
  qTest: number;
  tOnstream: number;
  qMin: number;
  qMax: number;
};

type NetworkNodeData = {
  wellId: number;
  reservoirPressure: number;
  nodePressure: number;
  pipeResistance: number;
  separatorCapacity: number;
};

type MLPrediction = {
  wellId: number;
  predictedRate: number;
  confidence: number;
};

type LayerData = {
  layerName: string;
  kh: number;
  pi: number;
  pltFraction: number;
};

type WellLayerData = {
  wellId: number;
  layers: LayerData[];
};

type LayerAllocationResult = {
  layerName: string;
  allocatedVolume: number;
  percentage: number;
  kh?: number;
  pi?: number;
  pltFraction?: number;
};

type AllocationResult = {
  wellId: number;
  wellName: string;
  formationName: string;
  zoneName?: string;
  allocatedVolume: number;
  percentage: number;
  coefficient: number;
  method: string;
  qTest?: number;
  tOnstream?: number;
  isConstrained?: boolean;
  pressureResidual?: number;
  flowResidual?: number;
  volumeP10?: number;
  volumeP90?: number;
  mlPredicted?: number;
  mlDeviation?: number;
  layers?: LayerAllocationResult[];
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function gaussianRandom(mean: number, stdDev: number): number {
  const u1 = Math.random();
  const u2 = Math.random();
  return mean + stdDev * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function percentile(arr: number[], p: number): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

// ─── Mock data generators ────────────────────────────────────────────────────

function generateWellTestData(wells: Well[]): WellTestData[] {
  return wells.map((w) => {
    const qTest = 10 + Math.random() * 90;
    return {
      wellId: w.id,
      qTest: Math.round(qTest * 10) / 10,
      tOnstream: Math.round((500 + Math.random() * 300) * 10) / 10,
      qMin: Math.round(qTest * 0.3 * 10) / 10,
      qMax: Math.round(qTest * 1.8 * 10) / 10,
    };
  });
}

function generateNetworkData(wells: Well[]): NetworkNodeData[] {
  return wells.map((w) => ({
    wellId: w.id,
    reservoirPressure: Math.round((150 + Math.random() * 100) * 10) / 10,
    nodePressure: Math.round((30 + Math.random() * 40) * 10) / 10,
    pipeResistance: Math.round((0.5 + Math.random() * 2) * 100) / 100,
    separatorCapacity: Math.round((50 + Math.random() * 150) * 10) / 10,
  }));
}

function generateMLPredictions(wells: Well[]): MLPrediction[] {
  return wells.map((w) => ({
    wellId: w.id,
    predictedRate: Math.round((15 + Math.random() * 80) * 10) / 10,
    confidence: Math.round((0.6 + Math.random() * 0.35) * 100) / 100,
  }));
}

function generateLayerData(wells: Well[]): WellLayerData[] {
  const layerNames = ["Ю-I", "Ю-II", "Ю-III", "КТ-I", "КТ-II", "ПК"];
  return wells.map((w) => {
    const numLayers = 2 + Math.floor(Math.random() * 3);
    const selectedLayers = layerNames.slice(0, numLayers);
    const totalPlt = 1;
    let pltLeft = totalPlt;
    const layers = selectedLayers.map((name, i) => {
      const fraction = i < numLayers - 1
        ? Math.round((pltLeft * (0.2 + Math.random() * 0.5)) * 1000) / 1000
        : Math.round(pltLeft * 1000) / 1000;
      pltLeft -= fraction;
      if (pltLeft < 0) pltLeft = 0;
      return {
        layerName: name,
        kh: Math.round((50 + Math.random() * 500) * 10) / 10,
        pi: Math.round((0.5 + Math.random() * 5) * 100) / 100,
        pltFraction: fraction,
      };
    });
    return { wellId: w.id, layers };
  });
}

// ─── Allocation algorithms ───────────────────────────────────────────────────

function allocateWellTestProportional(
  wells: Well[],
  totalVolume: number,
  wtData: WellTestData[],
): AllocationResult[] {
  const dataMap = new Map(wtData.map((d) => [d.wellId, d]));
  const items = wells.map((w) => {
    const d = dataMap.get(w.id);
    const qTest = d?.qTest ?? 30;
    const tOnstream = d?.tOnstream ?? 600;
    const qMin = d?.qMin ?? 0;
    const qMax = d?.qMax ?? Infinity;
    return { well: w, qTest, tOnstream, qMin, qMax, weight: qTest * tOnstream };
  });

  const totalWeight = items.reduce((s, i) => s + i.weight, 0);
  let allocated = items.map((i) => ({
    ...i,
    raw: totalWeight > 0 ? (totalVolume * i.weight) / totalWeight : totalVolume / items.length,
    final: 0,
    constrained: false,
  }));

  // Iterative constraint satisfaction (max 10 passes)
  for (let pass = 0; pass < 10; pass++) {
    let excess = 0;
    let unconstrainedWeight = 0;
    allocated.forEach((a) => {
      if (a.raw < a.qMin) { excess += a.qMin - a.raw; a.final = a.qMin; a.constrained = true; }
      else if (a.raw > a.qMax) { excess -= a.raw - a.qMax; a.final = a.qMax; a.constrained = true; }
      else { a.constrained = false; unconstrainedWeight += a.weight; }
    });
    if (Math.abs(excess) < 0.01) break;
    allocated.forEach((a) => {
      if (!a.constrained && unconstrainedWeight > 0) {
        a.raw += (excess * a.weight) / unconstrainedWeight;
      }
    });
  }
  allocated.forEach((a) => { if (!a.constrained) a.final = a.raw; });

  return allocated.map((a) => ({
    wellId: a.well.id,
    wellName: a.well.name,
    formationName: a.well.formationName,
    zoneName: a.well.zoneName,
    allocatedVolume: a.final,
    percentage: totalVolume > 0 ? (a.final / totalVolume) * 100 : 0,
    coefficient: a.weight,
    method: "Well-test",
    qTest: a.qTest,
    tOnstream: a.tOnstream,
    isConstrained: a.constrained,
  }));
}

function allocateNetwork(
  wells: Well[],
  totalVolume: number,
  netData: NetworkNodeData[],
): AllocationResult[] {
  const dataMap = new Map(netData.map((d) => [d.wellId, d]));

  // Simplified nodal analysis: Q_i = (P_res - P_node) / R_pipe
  // Then scale to match totalVolume, respecting separator limits
  const items = wells.map((w) => {
    const d = dataMap.get(w.id);
    const pRes = d?.reservoirPressure ?? 200;
    const pNode = d?.nodePressure ?? 40;
    const R = d?.pipeResistance ?? 1;
    const sepCap = d?.separatorCapacity ?? 200;
    const rawQ = Math.max(0, (pRes - pNode) / R);
    return { well: w, pRes, pNode, R, sepCap, rawQ, q: rawQ, ...d };
  });

  // Iterative optimization (pressure-flow matching with separator constraints)
  const maxIter = 20;
  for (let iter = 0; iter < maxIter; iter++) {
    const totalRawQ = items.reduce((s, i) => s + i.q, 0);
    if (totalRawQ <= 0) break;
    const scale = totalVolume / totalRawQ;
    items.forEach((i) => {
      i.q = Math.min(i.q * scale, i.sepCap);
    });
    const currentTotal = items.reduce((s, i) => s + i.q, 0);
    if (Math.abs(currentTotal - totalVolume) / totalVolume < 0.001) break;

    // Redistribute deficit among uncapped wells
    const deficit = totalVolume - currentTotal;
    const uncapped = items.filter((i) => i.q < i.sepCap);
    const uncappedTotal = uncapped.reduce((s, i) => s + i.q, 0);
    if (uncappedTotal > 0 && uncapped.length > 0) {
      uncapped.forEach((i) => { i.q += (deficit * i.q) / uncappedTotal; });
    }
  }

  return items.map((i) => {
    const calculatedP = i.pNode + i.q * i.R;
    return {
      wellId: i.well.id,
      wellName: i.well.name,
      formationName: i.well.formationName,
      zoneName: i.well.zoneName,
      allocatedVolume: i.q,
      percentage: totalVolume > 0 ? (i.q / totalVolume) * 100 : 0,
      coefficient: i.rawQ,
      method: "Network",
      pressureResidual: Math.round(Math.abs(calculatedP - i.pRes) * 100) / 100,
      flowResidual: Math.round(Math.abs(i.q - i.rawQ) * 100) / 100,
    };
  });
}

function allocateUncertainty(
  wells: Well[],
  totalVolume: number,
  wtData: WellTestData[],
  meterErr: number,
  testErr: number,
  nSim: number,
): AllocationResult[] {
  const dataMap = new Map(wtData.map((d) => [d.wellId, d]));

  // Run Monte Carlo
  const allAllocations: number[][] = wells.map(() => []);

  for (let sim = 0; sim < nSim; sim++) {
    const perturbedWeights = wells.map((w) => {
      const d = dataMap.get(w.id);
      const qBase = d?.qTest ?? 30;
      const tBase = d?.tOnstream ?? 600;
      const qPerturbed = gaussianRandom(qBase, qBase * meterErr / 100);
      const tPerturbed = gaussianRandom(tBase, tBase * testErr / 100);
      return Math.max(0, qPerturbed) * Math.max(0, tPerturbed);
    });
    const totalW = perturbedWeights.reduce((s, w) => s + w, 0);
    perturbedWeights.forEach((w, i) => {
      allAllocations[i].push(totalW > 0 ? (totalVolume * w) / totalW : totalVolume / wells.length);
    });
  }

  return wells.map((w, i) => {
    const p10 = percentile(allAllocations[i], 10);
    const p50 = percentile(allAllocations[i], 50);
    const p90 = percentile(allAllocations[i], 90);
    const d = dataMap.get(w.id);
    const weight = (d?.qTest ?? 30) * (d?.tOnstream ?? 600);
    return {
      wellId: w.id,
      wellName: w.name,
      formationName: w.formationName,
      zoneName: w.zoneName,
      allocatedVolume: p50,
      percentage: totalVolume > 0 ? (p50 / totalVolume) * 100 : 0,
      coefficient: weight,
      method: "Uncertainty",
      volumeP10: p10,
      volumeP90: p90,
    };
  });
}

function allocateML(
  wells: Well[],
  totalVolume: number,
  mlPreds: MLPrediction[],
  blendPct: number,
): AllocationResult[] {
  const predMap = new Map(mlPreds.map((p) => [p.wellId, p]));
  const equalWeight = 1 / wells.length;

  const items = wells.map((w, i) => {
    const pred = predMap.get(w.id);
    const mlWeight = pred ? pred.predictedRate * pred.confidence : 0;
    const engWeight = 1 + (wells.length - i) * 0.1;
    const blend = blendPct / 100;
    const finalWeight = mlWeight * blend + engWeight * (1 - blend);
    return { well: w, pred, engWeight, mlWeight, finalWeight };
  });

  const totalWeight = items.reduce((s, i) => s + i.finalWeight, 0);

  return items.map((item) => {
    const allocated = totalWeight > 0
      ? (totalVolume * item.finalWeight) / totalWeight
      : totalVolume * equalWeight;
    const mlRate = item.pred?.predictedRate ?? 0;
    const actualRate = allocated;
    const deviation = mlRate > 0 ? ((actualRate - mlRate) / mlRate) * 100 : 0;

    return {
      wellId: item.well.id,
      wellName: item.well.name,
      formationName: item.well.formationName,
      zoneName: item.well.zoneName,
      allocatedVolume: allocated,
      percentage: totalVolume > 0 ? (allocated / totalVolume) * 100 : 0,
      coefficient: item.finalWeight,
      method: "ML",
      mlPredicted: item.pred?.predictedRate,
      mlDeviation: Math.round(deviation * 100) / 100,
    };
  });
}

function allocateMultiLayer(
  wells: Well[],
  totalVolume: number,
  layerDataMap: WellLayerData[],
  layerMethod: string,
  interWellMethod: string,
): AllocationResult[] {
  // Inter-well allocation (proportional or equal)
  let wellVolumes: number[];
  if (interWellMethod === "equal") {
    wellVolumes = wells.map(() => totalVolume / wells.length);
  } else {
    const weights = wells.map(() => 1);
    const totalW = weights.reduce((s, w) => s + w, 0);
    wellVolumes = weights.map((w) => (totalVolume * w) / totalW);
  }

  const ldMap = new Map(layerDataMap.map((d) => [d.wellId, d]));

  return wells.map((w, idx) => {
    const wellVol = wellVolumes[idx];
    const ld = ldMap.get(w.id);
    let layerResults: LayerAllocationResult[] = [];

    if (ld && ld.layers.length > 0) {
      let layerWeights: number[];
      if (layerMethod === "kh") {
        layerWeights = ld.layers.map((l) => l.kh);
      } else if (layerMethod === "pi") {
        layerWeights = ld.layers.map((l) => l.pi);
      } else {
        layerWeights = ld.layers.map((l) => l.pltFraction);
      }
      const totalLW = layerWeights.reduce((s, w) => s + w, 0);

      layerResults = ld.layers.map((layer, li) => {
        const share = totalLW > 0 ? layerWeights[li] / totalLW : 1 / ld.layers.length;
        return {
          layerName: layer.layerName,
          allocatedVolume: wellVol * share,
          percentage: share * 100,
          kh: layer.kh,
          pi: layer.pi,
          pltFraction: layer.pltFraction,
        };
      });
    }

    return {
      wellId: w.id,
      wellName: w.name,
      formationName: w.formationName,
      zoneName: w.zoneName,
      allocatedVolume: wellVol,
      percentage: totalVolume > 0 ? (wellVol / totalVolume) * 100 : 0,
      coefficient: 1,
      method: "Multi-layer",
      layers: layerResults,
    };
  });
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function BackAllocation() {
  const { t } = useLanguage();
  const { activeCompanyId, isGlobalScope } = useWorkspace();

  // Core state
  const [fields, setFields] = useState<OilField[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<number | null>(null);
  const [totalVolume, setTotalVolume] = useState<string>("1000");
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [allocationMethod, setAllocationMethod] = useState<string>("proportional");
  const [wells, setWells] = useState<Well[]>([]);
  const [results, setResults] = useState<AllocationResult[]>([]);
  const [loading, setLoading] = useState(false);

  // Well-test method state
  const [wellTestData, setWellTestData] = useState<WellTestData[]>([]);

  // Network method state
  const [networkData, setNetworkData] = useState<NetworkNodeData[]>([]);

  // Uncertainty method state
  const [meterErrorPct, setMeterErrorPct] = useState<string>("5");
  const [testErrorPct, setTestErrorPct] = useState<string>("10");
  const [numSimulations, setNumSimulations] = useState<string>("1000");

  // ML method state
  const [mlPredictions, setMlPredictions] = useState<MLPrediction[]>([]);
  const [mlBlendWeight, setMlBlendWeight] = useState<string>("50");

  // Multi-layer method state
  const [wellLayerData, setWellLayerData] = useState<WellLayerData[]>([]);
  const [layerMethod, setLayerMethod] = useState<string>("kh");
  const [interWellMethod, setInterWellMethod] = useState<string>("proportional");

  // UI state
  const [expandedWells, setExpandedWells] = useState<Set<number>>(new Set());

  // ─── Data fetching ───────────────────────────────────────────────────────

  useEffect(() => {
    const fetchFields = async () => {
      try {
        const authHeader = getAuthHeader();
        const headers: Record<string, string> = {};
        if (authHeader) headers["Authorization"] = authHeader;

        let url = "/api/master-data/oil-fields";
        if (!isGlobalScope && activeCompanyId !== null) {
          url += `?extractionCompanyId=${activeCompanyId}`;
        }

        const response = await fetch(url, { headers });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        setFields(data);
        setSelectedFieldId(data.length > 0 ? data[0].id : null);
      } catch (error) {
        console.error("Error fetching fields:", error);
      }
    };
    fetchFields();
  }, [activeCompanyId, isGlobalScope]);

  useEffect(() => {
    if (!selectedFieldId) return;
    const fetchWells = async () => {
      setLoading(true);
      try {
        const authHeader = getAuthHeader();
        const headers: Record<string, string> = {};
        if (authHeader) headers["Authorization"] = authHeader;

        const wellsResponse = await fetch(`/api/wells?oil_field_id=${selectedFieldId}`, { headers });
        if (!wellsResponse.ok) throw new Error(`Failed to fetch wells: ${wellsResponse.status}`);
        const wellsData = await wellsResponse.json();

        const mappedWells: Well[] = wellsData
          .filter((w: any) => w.wellType === "production")
          .map((w: any) => ({
            id: w.id,
            name: w.name,
            formationId: w.formationId,
            formationName: w.formationName || "Неизвестный пласт",
            zoneId: w.zoneId,
            zoneName: w.zoneName || "Неизвестная зона",
            status: w.status,
          }));

        setWells(mappedWells);
        setResults([]);
        setWellTestData([]);
        setNetworkData([]);
        setMlPredictions([]);
        setWellLayerData([]);
      } catch (error) {
        console.error("Error fetching wells:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchWells();
  }, [selectedFieldId]);

  // ─── Data generators (on button click) ───────────────────────────────────

  const handleGenerateWellTestData = useCallback(() => {
    setWellTestData(generateWellTestData(wells));
  }, [wells]);

  const handleGenerateNetworkData = useCallback(() => {
    setNetworkData(generateNetworkData(wells));
  }, [wells]);

  const handleGenerateMLPredictions = useCallback(() => {
    setMlPredictions(generateMLPredictions(wells));
  }, [wells]);

  const handleGenerateLayerData = useCallback(() => {
    setWellLayerData(generateLayerData(wells));
  }, [wells]);

  // ─── Calculation ─────────────────────────────────────────────────────────

  const calculateAllocation = () => {
    if (!totalVolume || wells.length === 0) return;
    const volume = parseFloat(totalVolume);

    let calculatedResults: AllocationResult[] = [];

    switch (allocationMethod) {
      case "proportional": {
        const totalCoefficient = wells.length;
        calculatedResults = wells.map((well) => {
          const coefficient = 1;
          const allocatedVolume = (volume * coefficient) / totalCoefficient;
          return {
            wellId: well.id, wellName: well.name,
            formationName: well.formationName, zoneName: well.zoneName,
            allocatedVolume, percentage: (allocatedVolume / volume) * 100,
            coefficient, method: "Пропорциональное",
          };
        });
        break;
      }
      case "equal": {
        const volumePerWell = volume / wells.length;
        calculatedResults = wells.map((well) => ({
          wellId: well.id, wellName: well.name,
          formationName: well.formationName, zoneName: well.zoneName,
          allocatedVolume: volumePerWell, percentage: 100 / wells.length,
          coefficient: 1, method: "Равномерное",
        }));
        break;
      }
      case "weighted": {
        const weights = wells.map((_, i) => 1 + (wells.length - i) * 0.1);
        const totalWeight = weights.reduce((sum, w) => sum + w, 0);
        calculatedResults = wells.map((well, index) => {
          const weight = weights[index];
          const allocatedVolume = (volume * weight) / totalWeight;
          return {
            wellId: well.id, wellName: well.name,
            formationName: well.formationName, zoneName: well.zoneName,
            allocatedVolume, percentage: (allocatedVolume / volume) * 100,
            coefficient: weight, method: "Взвешенное",
          };
        });
        break;
      }
      case "welltest": {
        if (wellTestData.length === 0) {
          setWellTestData(generateWellTestData(wells));
        }
        const wt = wellTestData.length > 0 ? wellTestData : generateWellTestData(wells);
        calculatedResults = allocateWellTestProportional(wells, volume, wt);
        break;
      }
      case "network": {
        if (networkData.length === 0) {
          setNetworkData(generateNetworkData(wells));
        }
        const nd = networkData.length > 0 ? networkData : generateNetworkData(wells);
        calculatedResults = allocateNetwork(wells, volume, nd);
        break;
      }
      case "uncertainty": {
        if (wellTestData.length === 0) {
          setWellTestData(generateWellTestData(wells));
        }
        const wt = wellTestData.length > 0 ? wellTestData : generateWellTestData(wells);
        calculatedResults = allocateUncertainty(
          wells, volume, wt,
          parseFloat(meterErrorPct) || 5,
          parseFloat(testErrorPct) || 10,
          parseInt(numSimulations) || 500,
        );
        break;
      }
      case "ml": {
        if (mlPredictions.length === 0) {
          setMlPredictions(generateMLPredictions(wells));
        }
        const preds = mlPredictions.length > 0 ? mlPredictions : generateMLPredictions(wells);
        calculatedResults = allocateML(wells, volume, preds, parseFloat(mlBlendWeight) || 50);
        break;
      }
      case "multilayer": {
        if (wellLayerData.length === 0) {
          setWellLayerData(generateLayerData(wells));
        }
        const ld = wellLayerData.length > 0 ? wellLayerData : generateLayerData(wells);
        calculatedResults = allocateMultiLayer(wells, volume, ld, layerMethod, interWellMethod);
        break;
      }
    }

    setResults(calculatedResults);
  };

  // ─── Export ──────────────────────────────────────────────────────────────

  const exportResults = () => {
    if (results.length === 0) return;
    const isUncertainty = allocationMethod === "uncertainty";
    const isMultiLayer = allocationMethod === "multilayer";
    const isML = allocationMethod === "ml";
    const isNetwork = allocationMethod === "network";

    let header = "Скважина,Пласт,Зона,Объём (т),Доля (%),Коэффициент,Метод";
    if (isUncertainty) header += ",P10,P90";
    if (isML) header += ",ML Прогноз,Откл. от ML (%)";
    if (isNetwork) header += ",Невязка давл.,Невязка дебита";

    const rows = results.flatMap((r) => {
      let row = `${r.wellName},${r.formationName},${r.zoneName || "N/A"},${r.allocatedVolume.toFixed(2)},${r.percentage.toFixed(2)},${r.coefficient.toFixed(3)},${r.method}`;
      if (isUncertainty) row += `,${r.volumeP10?.toFixed(2) ?? ""},${r.volumeP90?.toFixed(2) ?? ""}`;
      if (isML) row += `,${r.mlPredicted?.toFixed(2) ?? ""},${r.mlDeviation?.toFixed(2) ?? ""}`;
      if (isNetwork) row += `,${r.pressureResidual?.toFixed(2) ?? ""},${r.flowResidual?.toFixed(2) ?? ""}`;

      const lines = [row];
      if (isMultiLayer && r.layers) {
        r.layers.forEach((l) => {
          lines.push(`  → ${l.layerName},,,"${l.allocatedVolume.toFixed(2)}",${l.percentage.toFixed(2)},,Пласт`);
        });
      }
      return lines;
    });

    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `back_allocation_${allocationMethod}_${startDate}_${endDate}.csv`;
    link.click();
  };

  // ─── Toggles ─────────────────────────────────────────────────────────────

  const toggleWellExpand = (wellId: number) => {
    setExpandedWells((prev) => {
      const next = new Set(prev);
      next.has(wellId) ? next.delete(wellId) : next.add(wellId);
      return next;
    });
  };

  // ─── Derived ─────────────────────────────────────────────────────────────

  const totalAllocated = results.reduce((sum, r) => sum + r.allocatedVolume, 0);
  const variance = totalAllocated - parseFloat(totalVolume || "0");

  // ─── Well-test data editor helper ────────────────────────────────────────

  const updateWellTestField = (wellId: number, field: keyof WellTestData, value: string) => {
    setWellTestData((prev) =>
      prev.map((d) => d.wellId === wellId ? { ...d, [field]: parseFloat(value) || 0 } : d)
    );
  };

  const updateNetworkField = (wellId: number, field: keyof NetworkNodeData, value: string) => {
    setNetworkData((prev) =>
      prev.map((d) => d.wellId === wellId ? { ...d, [field]: parseFloat(value) || 0 } : d)
    );
  };

  // ─── Render: method-specific config panel ────────────────────────────────

  const renderMethodConfig = () => {
    switch (allocationMethod) {
      case "welltest":
        return (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Gauge className="h-4 w-4" />
                  {t("backAllocationWellTestConfig")}
                </CardTitle>
                <Button size="sm" variant="outline" onClick={handleGenerateWellTestData} disabled={wells.length === 0}>
                  {t("backAllocationGenerateTestData")}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {wellTestData.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("backAllocationGenerateTestData")}</p>
              ) : (
                <div className="max-h-[250px] overflow-y-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="text-left p-2 font-medium">{t("backAllocationWellName")}</th>
                        <th className="text-right p-2 font-medium">{t("backAllocationQTest")}</th>
                        <th className="text-right p-2 font-medium">{t("backAllocationTOnstream")}</th>
                        <th className="text-right p-2 font-medium">{t("backAllocationQMin")}</th>
                        <th className="text-right p-2 font-medium">{t("backAllocationQMax")}</th>
                        <th className="text-right p-2 font-medium">{t("backAllocationWellTestWeight")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {wellTestData.map((d) => {
                        const well = wells.find((w) => w.id === d.wellId);
                        return (
                          <tr key={d.wellId} className="border-t">
                            <td className="p-2 font-mono text-xs">{well?.name}</td>
                            <td className="p-2">
                              <Input type="number" className="h-7 w-20 text-xs text-right ml-auto"
                                value={d.qTest} onChange={(e) => updateWellTestField(d.wellId, "qTest", e.target.value)} />
                            </td>
                            <td className="p-2">
                              <Input type="number" className="h-7 w-20 text-xs text-right ml-auto"
                                value={d.tOnstream} onChange={(e) => updateWellTestField(d.wellId, "tOnstream", e.target.value)} />
                            </td>
                            <td className="p-2">
                              <Input type="number" className="h-7 w-20 text-xs text-right ml-auto"
                                value={d.qMin} onChange={(e) => updateWellTestField(d.wellId, "qMin", e.target.value)} />
                            </td>
                            <td className="p-2">
                              <Input type="number" className="h-7 w-20 text-xs text-right ml-auto"
                                value={d.qMax} onChange={(e) => updateWellTestField(d.wellId, "qMax", e.target.value)} />
                            </td>
                            <td className="p-2 text-right font-mono text-xs text-muted-foreground">
                              {(d.qTest * d.tOnstream).toFixed(0)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        );

      case "network":
        return (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Network className="h-4 w-4" />
                  {t("backAllocationNetworkConfig")}
                </CardTitle>
                <Button size="sm" variant="outline" onClick={handleGenerateNetworkData} disabled={wells.length === 0}>
                  {t("backAllocationGenerateTestData")}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {networkData.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("backAllocationGenerateTestData")}</p>
              ) : (
                <div className="max-h-[250px] overflow-y-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="text-left p-2 font-medium">{t("backAllocationWellName")}</th>
                        <th className="text-right p-2 font-medium">{t("backAllocationResPressure")}</th>
                        <th className="text-right p-2 font-medium">{t("backAllocationNodePressure")}</th>
                        <th className="text-right p-2 font-medium">{t("backAllocationPipeResistance")}</th>
                        <th className="text-right p-2 font-medium">{t("backAllocationSepCapacity")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {networkData.map((d) => {
                        const well = wells.find((w) => w.id === d.wellId);
                        return (
                          <tr key={d.wellId} className="border-t">
                            <td className="p-2 font-mono text-xs">{well?.name}</td>
                            <td className="p-2">
                              <Input type="number" className="h-7 w-20 text-xs text-right ml-auto"
                                value={d.reservoirPressure} onChange={(e) => updateNetworkField(d.wellId, "reservoirPressure", e.target.value)} />
                            </td>
                            <td className="p-2">
                              <Input type="number" className="h-7 w-20 text-xs text-right ml-auto"
                                value={d.nodePressure} onChange={(e) => updateNetworkField(d.wellId, "nodePressure", e.target.value)} />
                            </td>
                            <td className="p-2">
                              <Input type="number" className="h-7 w-20 text-xs text-right ml-auto"
                                value={d.pipeResistance} onChange={(e) => updateNetworkField(d.wellId, "pipeResistance", e.target.value)} />
                            </td>
                            <td className="p-2">
                              <Input type="number" className="h-7 w-20 text-xs text-right ml-auto"
                                value={d.separatorCapacity} onChange={(e) => updateNetworkField(d.wellId, "separatorCapacity", e.target.value)} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        );

      case "uncertainty":
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                {t("backAllocationUncertaintyConfig")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">{t("backAllocationMeterError")}</Label>
                  <Input type="number" value={meterErrorPct} onChange={(e) => setMeterErrorPct(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t("backAllocationTestError")}</Label>
                  <Input type="number" value={testErrorPct} onChange={(e) => setTestErrorPct(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t("backAllocationNumSimulations")}</Label>
                  <Input type="number" value={numSimulations} onChange={(e) => setNumSimulations(e.target.value)} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("backAllocationBaseMethod")}: Well-test proportional
              </p>
              {wellTestData.length === 0 && (
                <Button size="sm" variant="outline" onClick={handleGenerateWellTestData} disabled={wells.length === 0}>
                  {t("backAllocationGenerateTestData")}
                </Button>
              )}
            </CardContent>
          </Card>
        );

      case "ml":
        return (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  {t("backAllocationMLConfig")}
                </CardTitle>
                <Button size="sm" variant="outline" onClick={handleGenerateMLPredictions} disabled={wells.length === 0}>
                  {t("backAllocationMLGeneratePredictions")}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">{t("backAllocationMLBlendWeight")}</Label>
                  <Input type="number" min="0" max="100"
                    value={mlBlendWeight} onChange={(e) => setMlBlendWeight(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t("backAllocationMLStatus")}</Label>
                  <p className="text-sm font-medium text-green-600 pt-2">
                    {mlPredictions.length > 0 ? `${t("backAllocationMLTrained")} (${mlPredictions.length})` : "—"}
                  </p>
                </div>
              </div>
              {mlPredictions.length > 0 && (
                <div className="max-h-[200px] overflow-y-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="text-left p-2 font-medium">{t("backAllocationWellName")}</th>
                        <th className="text-right p-2 font-medium">{t("backAllocationMLPredicted")}</th>
                        <th className="text-right p-2 font-medium">{t("backAllocationMLConfidence")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mlPredictions.map((p) => {
                        const well = wells.find((w) => w.id === p.wellId);
                        return (
                          <tr key={p.wellId} className="border-t">
                            <td className="p-2 font-mono text-xs">{well?.name}</td>
                            <td className="p-2 text-right">{p.predictedRate.toFixed(1)}</td>
                            <td className="p-2 text-right">
                              <span className={`px-1.5 py-0.5 rounded text-xs ${p.confidence >= 0.8 ? "bg-green-500/10 text-green-700" : p.confidence >= 0.6 ? "bg-yellow-500/10 text-yellow-700" : "bg-red-500/10 text-red-700"}`}>
                                {(p.confidence * 100).toFixed(0)}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        );

      case "multilayer":
        return (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  {t("backAllocationMultiLayerConfig")}
                </CardTitle>
                <Button size="sm" variant="outline" onClick={handleGenerateLayerData} disabled={wells.length === 0}>
                  {t("backAllocationGenerateLayerData")}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">{t("backAllocationLayerMethod")}</Label>
                  <Select value={layerMethod} onValueChange={setLayerMethod}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kh">{t("backAllocationLayerMethodKH")}</SelectItem>
                      <SelectItem value="pi">{t("backAllocationLayerMethodPI")}</SelectItem>
                      <SelectItem value="plt">{t("backAllocationLayerMethodPLT")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t("backAllocationInterWellMethod")}</Label>
                  <Select value={interWellMethod} onValueChange={setInterWellMethod}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="proportional">
                        <span className="flex items-center gap-1.5"><PieChart className="h-3.5 w-3.5" />{t("backAllocationMethodProportional")}</span>
                      </SelectItem>
                      <SelectItem value="equal">
                        <span className="flex items-center gap-1.5"><ArrowLeftRight className="h-3.5 w-3.5" />{t("backAllocationMethodEqual")}</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {wellLayerData.length > 0 && (
                <div className="max-h-[250px] overflow-y-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="text-left p-2 font-medium">{t("backAllocationWellName")}</th>
                        <th className="text-left p-2 font-medium">{t("backAllocationLayerName")}</th>
                        <th className="text-right p-2 font-medium">{t("backAllocationKH")}</th>
                        <th className="text-right p-2 font-medium">{t("backAllocationPI")}</th>
                        <th className="text-right p-2 font-medium">{t("backAllocationPLTFraction")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {wellLayerData.flatMap((wd) => {
                        const well = wells.find((w) => w.id === wd.wellId);
                        return wd.layers.map((l, li) => (
                          <tr key={`${wd.wellId}-${li}`} className="border-t">
                            <td className="p-2 font-mono text-xs">{li === 0 ? well?.name : ""}</td>
                            <td className="p-2 text-xs">{l.layerName}</td>
                            <td className="p-2 text-right text-xs">{l.kh.toFixed(1)}</td>
                            <td className="p-2 text-right text-xs">{l.pi.toFixed(2)}</td>
                            <td className="p-2 text-right text-xs">{(l.pltFraction * 100).toFixed(1)}%</td>
                          </tr>
                        ));
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  // ─── Render: method description ──────────────────────────────────────────

  const getMethodDescription = () => {
    switch (allocationMethod) {
      case "proportional": return t("backAllocationMethodProportionalDesc");
      case "equal": return t("backAllocationMethodEqualDesc");
      case "weighted": return t("backAllocationMethodWeightedDesc");
      case "welltest": return t("backAllocationMethodWellTestDesc");
      case "network": return t("backAllocationMethodNetworkDesc");
      case "uncertainty": return t("backAllocationMethodUncertaintyDesc");
      case "ml": return t("backAllocationMethodMLDesc");
      case "multilayer": return t("backAllocationMethodMultiLayerDesc");
      default: return "";
    }
  };

  // ─── Render: extra columns in results table ──────────────────────────────

  const renderExtraHeaders = () => {
    switch (allocationMethod) {
      case "welltest":
        return (
          <>
            <th className="text-right p-3 font-medium">{t("backAllocationQTest")}</th>
            <th className="text-right p-3 font-medium">{t("backAllocationTOnstream")}</th>
            <th className="text-center p-3 font-medium">{t("backAllocationConstrained")}</th>
          </>
        );
      case "network":
        return (
          <>
            <th className="text-right p-3 font-medium">{t("backAllocationPressureResidual")}</th>
            <th className="text-right p-3 font-medium">{t("backAllocationFlowResidual")}</th>
          </>
        );
      case "uncertainty":
        return (
          <>
            <th className="text-right p-3 font-medium">{t("backAllocationP10")}</th>
            <th className="text-right p-3 font-medium">{t("backAllocationP90")}</th>
            <th className="text-right p-3 font-medium">{t("backAllocationRange")}</th>
          </>
        );
      case "ml":
        return (
          <>
            <th className="text-right p-3 font-medium">{t("backAllocationMLPredicted")}</th>
            <th className="text-right p-3 font-medium">{t("backAllocationMLDeviation")}</th>
          </>
        );
      case "multilayer":
        return <th className="text-center p-3 font-medium">{t("backAllocationLayerAllocation")}</th>;
      default:
        return null;
    }
  };

  const renderExtraCells = (r: AllocationResult) => {
    switch (allocationMethod) {
      case "welltest":
        return (
          <>
            <td className="p-3 text-right text-xs">{r.qTest?.toFixed(1)}</td>
            <td className="p-3 text-right text-xs">{r.tOnstream?.toFixed(0)}</td>
            <td className="p-3 text-center">
              {r.isConstrained && (
                <span className="px-1.5 py-0.5 bg-orange-500/10 text-orange-700 rounded text-xs">
                  {t("backAllocationConstrained")}
                </span>
              )}
            </td>
          </>
        );
      case "network":
        return (
          <>
            <td className="p-3 text-right text-xs font-mono">{r.pressureResidual?.toFixed(2)}</td>
            <td className="p-3 text-right text-xs font-mono">{r.flowResidual?.toFixed(2)}</td>
          </>
        );
      case "uncertainty":
        return (
          <>
            <td className="p-3 text-right text-xs font-mono">{r.volumeP10?.toFixed(2)}</td>
            <td className="p-3 text-right text-xs font-mono">{r.volumeP90?.toFixed(2)}</td>
            <td className="p-3 text-right text-xs">
              <span className="px-1.5 py-0.5 bg-purple-500/10 text-purple-700 rounded">
                {((r.volumeP90 ?? 0) - (r.volumeP10 ?? 0)).toFixed(1)}
              </span>
            </td>
          </>
        );
      case "ml": {
        const devAbs = Math.abs(r.mlDeviation ?? 0);
        const devColor = devAbs < 10 ? "text-green-700" : devAbs < 25 ? "text-yellow-700" : "text-red-700";
        return (
          <>
            <td className="p-3 text-right text-xs font-mono">{r.mlPredicted?.toFixed(1)}</td>
            <td className={`p-3 text-right text-xs font-mono ${devColor}`}>
              {r.mlDeviation !== undefined ? `${r.mlDeviation > 0 ? "+" : ""}${r.mlDeviation.toFixed(1)}%` : "—"}
            </td>
          </>
        );
      }
      case "multilayer":
        return (
          <td className="p-3 text-center">
            {r.layers && r.layers.length > 0 && (
              <Button size="sm" variant="ghost" className="h-6 text-xs px-2"
                onClick={() => toggleWellExpand(r.wellId)}>
                {expandedWells.has(r.wellId) ? (
                  <><ChevronDown className="h-3 w-3 mr-1" />{t("backAllocationCollapseLayers")}</>
                ) : (
                  <><ChevronRight className="h-3 w-3 mr-1" />{r.layers.length} {t("backAllocationExpandLayers")}</>
                )}
              </Button>
            )}
          </td>
        );
      default:
        return null;
    }
  };

  const renderLayerRows = (r: AllocationResult) => {
    if (allocationMethod !== "multilayer" || !expandedWells.has(r.wellId) || !r.layers) return null;
    const extraColCount =
      allocationMethod === "welltest" ? 3 :
      allocationMethod === "network" ? 2 :
      allocationMethod === "uncertainty" ? 3 :
      allocationMethod === "ml" ? 2 :
      allocationMethod === "multilayer" ? 1 : 0;

    return r.layers.map((l, li) => (
      <tr key={`${r.wellId}-layer-${li}`} className="bg-muted/30">
        <td className="p-2 pl-8 text-xs text-muted-foreground">↳ {l.layerName}</td>
        <td className="p-2 text-xs text-muted-foreground" colSpan={2}></td>
        <td className="p-2 text-right text-xs">{l.allocatedVolume.toFixed(2)}</td>
        <td className="p-2 text-right">
          <span className="px-1.5 py-0.5 bg-indigo-500/10 text-indigo-700 rounded text-xs">
            {l.percentage.toFixed(1)}%
          </span>
        </td>
        <td className="p-2 text-right text-xs font-mono">
          {layerMethod === "kh" && l.kh?.toFixed(1)}
          {layerMethod === "pi" && l.pi?.toFixed(2)}
          {layerMethod === "plt" && `${((l.pltFraction ?? 0) * 100).toFixed(1)}%`}
        </td>
        <td colSpan={1 + extraColCount}></td>
      </tr>
    ));
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <TrendingDown className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{t("backAllocationTitle")}</h1>
            <p className="text-sm text-muted-foreground">{t("backAllocationSubtitle")}</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="setup" className="space-y-4">
        <TabsList>
          <TabsTrigger value="setup">{t("backAllocationSetup")}</TabsTrigger>
          <TabsTrigger value="results">{t("backAllocationResults")}</TabsTrigger>
          <TabsTrigger value="analysis">{t("backAllocationAnalysis")}</TabsTrigger>
        </TabsList>

        {/* ── Setup Tab ────────────────────────────────────────────────────── */}
        <TabsContent value="setup" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("backAllocationParams")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("backAllocationOilField")}</Label>
                  <Select value={selectedFieldId?.toString()} onValueChange={(v) => setSelectedFieldId(parseInt(v))}>
                    <SelectTrigger><SelectValue placeholder={t("backAllocationSelectField")} /></SelectTrigger>
                    <SelectContent>
                      {fields.map((field) => (
                        <SelectItem key={field.id} value={field.id.toString()}>{field.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("backAllocationTotalVolume")}</Label>
                  <Input type="number" value={totalVolume} onChange={(e) => setTotalVolume(e.target.value)} placeholder="1000" />
                </div>
                <div className="space-y-2">
                  <Label>{t("backAllocationStartDate")}</Label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{t("backAllocationEndDate")}</Label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t("backAllocationMethod")}</Label>
                <Select value={allocationMethod} onValueChange={setAllocationMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="proportional">
                      <span className="flex items-center gap-1.5"><PieChart className="h-3.5 w-3.5" />{t("backAllocationMethodProportional")}</span>
                    </SelectItem>
                    <SelectItem value="equal">
                      <span className="flex items-center gap-1.5"><ArrowLeftRight className="h-3.5 w-3.5" />{t("backAllocationMethodEqual")}</span>
                    </SelectItem>
                    <SelectItem value="weighted">
                      <span className="flex items-center gap-1.5"><SlidersHorizontal className="h-3.5 w-3.5" />{t("backAllocationMethodWeighted")}</span>
                    </SelectItem>
                    <SelectItem value="welltest">
                      <span className="flex items-center gap-1.5"><Gauge className="h-3.5 w-3.5" />{t("backAllocationMethodWellTest")}</span>
                    </SelectItem>
                    <SelectItem value="network">
                      <span className="flex items-center gap-1.5"><Network className="h-3.5 w-3.5" />{t("backAllocationMethodNetwork")}</span>
                    </SelectItem>
                    <SelectItem value="uncertainty">
                      <span className="flex items-center gap-1.5"><BarChart3 className="h-3.5 w-3.5" />{t("backAllocationMethodUncertainty")}</span>
                    </SelectItem>
                    <SelectItem value="ml">
                      <span className="flex items-center gap-1.5"><Brain className="h-3.5 w-3.5" />{t("backAllocationMethodML")}</span>
                    </SelectItem>
                    <SelectItem value="multilayer">
                      <span className="flex items-center gap-1.5"><Layers className="h-3.5 w-3.5" />{t("backAllocationMethodMultiLayer")}</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">{getMethodDescription()}</p>
              </div>

              <Button onClick={calculateAllocation} className="w-full" disabled={!selectedFieldId || !totalVolume}>
                <Calculator className="h-4 w-4 mr-2" />
                {t("backAllocationCalculate")}
              </Button>
            </CardContent>
          </Card>

          {/* Method-specific configuration panel */}
          {renderMethodConfig()}

          {/* Wells table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("backAllocationWellsTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground">{t("backAllocationLoadingWells")}</p>
              ) : wells.length === 0 ? (
                <div className="flex items-center gap-2 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  <p className="text-sm">{t("backAllocationNoWells")}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground mb-3">
                    {t("backAllocationWellsFound")} <span className="font-bold">{wells.length}</span>
                  </p>
                  <div className="max-h-[300px] overflow-y-auto border rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-muted sticky top-0">
                        <tr>
                          <th className="text-left p-3 font-medium">{t("backAllocationWellName")}</th>
                          <th className="text-left p-3 font-medium">{t("backAllocationFormation")}</th>
                          <th className="text-left p-3 font-medium">{t("backAllocationZone")}</th>
                          <th className="text-center p-3 font-medium">{t("backAllocationStatus")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {wells.map((well) => (
                          <tr key={well.id} className="border-t hover:bg-muted/50">
                            <td className="p-3 font-mono font-medium">{well.name}</td>
                            <td className="p-3">{well.formationName}</td>
                            <td className="p-3 text-muted-foreground">{well.zoneName || "—"}</td>
                            <td className="p-3 text-center">
                              <span className="px-2 py-1 bg-green-500/10 text-green-700 rounded text-xs">
                                {t("backAllocationStatusActive")}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Results Tab ──────────────────────────────────────────────────── */}
        <TabsContent value="results" className="space-y-4">
          {results.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calculator className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground">{t("backAllocationRunCalculation")}</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {t("backAllocationTotalVolumeCard")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{parseFloat(totalVolume).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t("backAllocationTons")}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {t("backAllocationAllocatedCard")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{totalAllocated.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t("backAllocationTons")}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {t("backAllocationVarianceCard")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className={`text-2xl font-bold ${Math.abs(variance) < 0.01 ? "text-green-600" : "text-orange-600"}`}>
                      {variance.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{t("backAllocationTons")}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {t("backAllocationWellsCard")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{results.length}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t("backAllocationAllocated")}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Network-specific: total residual */}
              {allocationMethod === "network" && (
                <Card>
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{t("backAllocationTotalResidual")}</span>
                      <span className="font-mono">
                        {t("backAllocationPressureResidual")}: {results.reduce((s, r) => s + (r.pressureResidual ?? 0), 0).toFixed(2)} | {t("backAllocationFlowResidual")}: {results.reduce((s, r) => s + (r.flowResidual ?? 0), 0).toFixed(2)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Results table */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{t("backAllocationResultsTitle")}</CardTitle>
                    <Button size="sm" variant="outline" onClick={exportResults}>
                      <Download className="h-4 w-4 mr-2" />
                      {t("backAllocationExportCsv")}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg overflow-hidden">
                    <div className="max-h-[500px] overflow-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted sticky top-0 z-10">
                          <tr>
                            <th className="text-left p-3 font-medium">{t("backAllocationWellName")}</th>
                            <th className="text-left p-3 font-medium">{t("backAllocationFormation")}</th>
                            <th className="text-left p-3 font-medium">{t("backAllocationZone")}</th>
                            <th className="text-right p-3 font-medium">{t("backAllocationVolume")}</th>
                            <th className="text-right p-3 font-medium">{t("backAllocationShare")}</th>
                            <th className="text-right p-3 font-medium">{t("backAllocationCoeff")}</th>
                            <th className="text-center p-3 font-medium">{t("backAllocationMethodColumn")}</th>
                            {renderExtraHeaders()}
                          </tr>
                        </thead>
                        <tbody>
                          {results.map((result) => (
                            <>
                              <tr key={result.wellId} className="border-t hover:bg-muted/50">
                                <td className="p-3 font-mono font-bold">{result.wellName}</td>
                                <td className="p-3">{result.formationName}</td>
                                <td className="p-3 text-muted-foreground">{result.zoneName || "—"}</td>
                                <td className="p-3 text-right font-medium">{result.allocatedVolume.toFixed(2)}</td>
                                <td className="p-3 text-right">
                                  <span className="px-2 py-1 bg-blue-500/10 text-blue-700 rounded text-xs font-medium">
                                    {result.percentage.toFixed(2)}%
                                  </span>
                                </td>
                                <td className="p-3 text-right font-mono text-xs">{result.coefficient.toFixed(3)}</td>
                                <td className="p-3 text-center text-xs text-muted-foreground">{result.method}</td>
                                {renderExtraCells(result)}
                              </tr>
                              {renderLayerRows(result)}
                            </>
                          ))}
                        </tbody>
                        <tfoot className="bg-muted/50 font-bold">
                          <tr>
                            <td colSpan={3} className="p-3">{t("backAllocationTotal")}</td>
                            <td className="p-3 text-right">{totalAllocated.toFixed(2)}</td>
                            <td className="p-3 text-right">100.00%</td>
                            <td colSpan={2 + (
                              allocationMethod === "welltest" ? 3 :
                              allocationMethod === "network" ? 2 :
                              allocationMethod === "uncertainty" ? 3 :
                              allocationMethod === "ml" ? 2 :
                              allocationMethod === "multilayer" ? 1 : 0
                            )}></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ── Analysis Tab ─────────────────────────────────────────────────── */}
        <TabsContent value="analysis" className="space-y-4">
          {results.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calculator className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground">{t("backAllocationRunCalculation")}</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Formation distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t("backAllocationFormationDist")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(
                      results.reduce((acc, r) => {
                        acc[r.formationName] = (acc[r.formationName] || 0) + r.allocatedVolume;
                        return acc;
                      }, {} as Record<string, number>)
                    ).map(([formation, volume]) => {
                      const pct = (volume / totalAllocated) * 100;
                      return (
                        <div key={formation} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">{formation}</span>
                            <span className="text-muted-foreground">
                              {volume.toFixed(2)} т ({pct.toFixed(1)}%)
                            </span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Well ranking bar chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-amber-500" />
                    {t("backAllocationWellRanking")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1.5">
                    {[...results]
                      .sort((a, b) => b.allocatedVolume - a.allocatedVolume)
                      .map((r, idx) => {
                        const maxVol = Math.max(...results.map((x) => x.allocatedVolume));
                        const barPct = maxVol > 0 ? (r.allocatedVolume / maxVol) * 100 : 0;
                        const medal = idx === 0 ? "text-amber-500" : idx === 1 ? "text-zinc-400" : idx === 2 ? "text-orange-600" : "text-muted-foreground";
                        return (
                          <div key={r.wellId} className="flex items-center gap-2">
                            <span className={`text-xs font-bold w-5 text-right ${medal}`}>{idx + 1}</span>
                            <span className="text-xs font-mono w-24 truncate">{r.wellName}</span>
                            <div className="flex-1 relative h-5 bg-muted rounded overflow-hidden">
                              <div
                                className={`h-full rounded transition-all ${idx === 0 ? "bg-amber-400/70" : idx === 1 ? "bg-zinc-300/70" : idx === 2 ? "bg-orange-300/70" : "bg-primary/30"}`}
                                style={{ width: `${barPct}%` }}
                              />
                              <span className="absolute inset-y-0 right-2 flex items-center text-[10px] font-medium">
                                {r.allocatedVolume.toFixed(1)} т
                              </span>
                            </div>
                            <span className="text-xs text-muted-foreground w-14 text-right">
                              {r.percentage.toFixed(1)}%
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>

              {/* Concentration metrics */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="h-4 w-4 text-indigo-500" />
                    {t("backAllocationConcentration")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const sorted = [...results].sort((a, b) => b.allocatedVolume - a.allocatedVolume);
                    const n = sorted.length;
                    const mean = totalAllocated / n;
                    const stdDev = Math.sqrt(sorted.reduce((s, r) => s + Math.pow(r.allocatedVolume - mean, 2), 0) / n);
                    const cv = mean > 0 ? (stdDev / mean) * 100 : 0;
                    const sortedAsc = [...results.map((r) => r.allocatedVolume)].sort((a, b) => a - b);
                    const medianVal = n % 2 === 0
                      ? (sortedAsc[n / 2 - 1] + sortedAsc[n / 2]) / 2
                      : sortedAsc[Math.floor(n / 2)];

                    // Gini coefficient
                    let giniSum = 0;
                    for (let i = 0; i < n; i++) {
                      for (let j = 0; j < n; j++) {
                        giniSum += Math.abs(sortedAsc[i] - sortedAsc[j]);
                      }
                    }
                    const gini = totalAllocated > 0 && n > 1
                      ? giniSum / (2 * n * totalAllocated)
                      : 0;

                    const top3 = sorted.slice(0, Math.min(3, n)).reduce((s, r) => s + r.allocatedVolume, 0);
                    const top5 = sorted.slice(0, Math.min(5, n)).reduce((s, r) => s + r.allocatedVolume, 0);
                    const top3Pct = totalAllocated > 0 ? (top3 / totalAllocated) * 100 : 0;
                    const top5Pct = totalAllocated > 0 ? (top5 / totalAllocated) * 100 : 0;

                    const giniColor = gini < 0.2 ? "text-green-600" : gini < 0.4 ? "text-yellow-600" : "text-red-600";
                    const giniBarColor = gini < 0.2 ? "bg-green-500" : gini < 0.4 ? "bg-yellow-500" : "bg-red-500";

                    return (
                      <div className="space-y-5">
                        {/* Gini gauge */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{t("backAllocationGini")}</span>
                            <span className={`text-xl font-bold font-mono ${giniColor}`}>{gini.toFixed(3)}</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-3 relative">
                            <div className={`${giniBarColor} h-3 rounded-full transition-all`} style={{ width: `${gini * 100}%` }} />
                            <div className="absolute inset-0 flex items-center justify-between px-2">
                              <span className="text-[9px] text-muted-foreground">{t("backAllocationGiniPerfect")}</span>
                              <span className="text-[9px] text-muted-foreground">{t("backAllocationGiniMax")}</span>
                            </div>
                          </div>
                        </div>

                        {/* Metrics grid */}
                        <div className="grid grid-cols-3 gap-4">
                          <div className="p-3 bg-muted/50 rounded-lg space-y-1">
                            <p className="text-xs text-muted-foreground">{t("backAllocationTop3Share")}</p>
                            <p className="text-lg font-bold">{top3Pct.toFixed(1)}%</p>
                            <div className="w-full bg-muted rounded-full h-1.5">
                              <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${top3Pct}%` }} />
                            </div>
                          </div>
                          <div className="p-3 bg-muted/50 rounded-lg space-y-1">
                            <p className="text-xs text-muted-foreground">{t("backAllocationTop5Share")}</p>
                            <p className="text-lg font-bold">{top5Pct.toFixed(1)}%</p>
                            <div className="w-full bg-muted rounded-full h-1.5">
                              <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${top5Pct}%` }} />
                            </div>
                          </div>
                          <div className="p-3 bg-muted/50 rounded-lg space-y-1">
                            <p className="text-xs text-muted-foreground">{t("backAllocationMedianVolume")}</p>
                            <p className="text-lg font-bold">{medianVal.toFixed(1)}</p>
                            <p className="text-[10px] text-muted-foreground">т</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-3 bg-muted/50 rounded-lg space-y-1">
                            <p className="text-xs text-muted-foreground">{t("backAllocationStdDev")}</p>
                            <p className="text-lg font-bold font-mono">{stdDev.toFixed(2)}</p>
                            <p className="text-[10px] text-muted-foreground">т</p>
                          </div>
                          <div className="p-3 bg-muted/50 rounded-lg space-y-1">
                            <p className="text-xs text-muted-foreground">{t("backAllocationCV")}</p>
                            <p className={`text-lg font-bold font-mono ${cv < 30 ? "text-green-600" : cv < 60 ? "text-yellow-600" : "text-red-600"}`}>
                              {cv.toFixed(1)}%
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {cv < 30 ? t("backAllocationEvenDist") : t("backAllocationConcentratedDist")}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* Uncertainty-specific: P10/P50/P90 range chart */}
              {allocationMethod === "uncertainty" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">{t("backAllocationRange")} (P10 — P50 — P90)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {results.map((r) => {
                        const maxVal = Math.max(...results.map((x) => x.volumeP90 ?? 0));
                        const p10Pct = maxVal > 0 ? ((r.volumeP10 ?? 0) / maxVal) * 100 : 0;
                        const p50Pct = maxVal > 0 ? (r.allocatedVolume / maxVal) * 100 : 0;
                        const p90Pct = maxVal > 0 ? ((r.volumeP90 ?? 0) / maxVal) * 100 : 0;
                        return (
                          <div key={r.wellId} className="flex items-center gap-3">
                            <span className="text-xs font-mono w-24 truncate">{r.wellName}</span>
                            <div className="flex-1 relative h-5 bg-muted rounded">
                              <div className="absolute h-full bg-purple-200 rounded"
                                style={{ left: `${p10Pct}%`, width: `${p90Pct - p10Pct}%` }} />
                              <div className="absolute h-full w-0.5 bg-purple-600"
                                style={{ left: `${p50Pct}%` }} />
                            </div>
                            <span className="text-xs text-muted-foreground w-36 text-right">
                              {r.volumeP10?.toFixed(1)} — <strong>{r.allocatedVolume.toFixed(1)}</strong> — {r.volumeP90?.toFixed(1)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* ML-specific: deviation analysis */}
              {allocationMethod === "ml" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">{t("backAllocationMLDeviation")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {results.map((r) => {
                        const dev = r.mlDeviation ?? 0;
                        const absMax = Math.max(...results.map((x) => Math.abs(x.mlDeviation ?? 0)), 1);
                        const barWidth = Math.abs(dev) / absMax * 50;
                        const isPositive = dev >= 0;
                        return (
                          <div key={r.wellId} className="flex items-center gap-3">
                            <span className="text-xs font-mono w-24 truncate">{r.wellName}</span>
                            <div className="flex-1 flex items-center h-5">
                              <div className="w-1/2 flex justify-end">
                                {!isPositive && (
                                  <div className="h-4 bg-red-400/60 rounded-l" style={{ width: `${barWidth}%` }} />
                                )}
                              </div>
                              <div className="w-px h-5 bg-border" />
                              <div className="w-1/2">
                                {isPositive && (
                                  <div className="h-4 bg-green-400/60 rounded-r" style={{ width: `${barWidth}%` }} />
                                )}
                              </div>
                            </div>
                            <span className={`text-xs font-mono w-16 text-right ${dev >= 0 ? "text-green-700" : "text-red-700"}`}>
                              {dev > 0 ? "+" : ""}{dev.toFixed(1)}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Multi-layer: layer contribution summary */}
              {allocationMethod === "multilayer" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">{t("backAllocationLayerAllocation")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {(() => {
                        const layerTotals: Record<string, number> = {};
                        results.forEach((r) => {
                          r.layers?.forEach((l) => {
                            layerTotals[l.layerName] = (layerTotals[l.layerName] || 0) + l.allocatedVolume;
                          });
                        });
                        return Object.entries(layerTotals).map(([name, vol]) => {
                          const pct = (vol / totalAllocated) * 100;
                          return (
                            <div key={name} className="space-y-1">
                              <div className="flex items-center justify-between text-sm">
                                <span className="font-medium">{name}</span>
                                <span className="text-muted-foreground">
                                  {vol.toFixed(2)} т ({pct.toFixed(1)}%)
                                </span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-2">
                                <div className="bg-indigo-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Statistics */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t("backAllocationStats")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">{t("backAllocationAvgVolume")}</p>
                      <p className="text-lg font-bold">{(totalAllocated / results.length).toFixed(2)} т</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">{t("backAllocationMaxVolume")}</p>
                      <p className="text-lg font-bold">{Math.max(...results.map((r) => r.allocatedVolume)).toFixed(2)} т</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">{t("backAllocationMinVolume")}</p>
                      <p className="text-lg font-bold">{Math.min(...results.map((r) => r.allocatedVolume)).toFixed(2)} т</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">{t("backAllocationAccuracy")}</p>
                      <p className={`text-lg font-bold ${Math.abs(variance) < 0.01 ? "text-green-600" : "text-orange-600"}`}>
                        {Math.abs(variance) < 0.01 ? "100%" : `${(100 - Math.abs((variance / parseFloat(totalVolume)) * 100)).toFixed(2)}%`}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
