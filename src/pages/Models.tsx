import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { FormationMapViewer } from '@/components/FormationMapViewer';
import { Formation3DViewer } from '@/components/Formation3DViewer';
import { WellEquipmentTab } from '@/components/WellEquipmentTab';
import { EquipmentSchemesTab } from '@/components/EquipmentSchemesTab';
import { FieldSchemeEditorEmbed } from '@/features/field-scheme/components/FieldSchemeEditorEmbed';
import { IntegratedModelTab } from '@/components/IntegratedModelTab';
import { getAuthHeader } from "@/lib/auth";
import { Plus } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { useOilFields } from "@/hooks/useOilFields";

type OilFieldRow = {
  id: number;
  name: string;
  shortName?: string | null;
};

type Horizon = {
  id: number;
  name: string;
  code: string;
  depthTop: number;
  depthBottom: number;
};

type Formation = {
  id: number;
  horizonId: number;
  code: string;
  name: string;
  area: number;
  effectiveThickness: number;
};

type DrainageZone = {
  id: number;
  formationId: number;
  code: string;
  name: string;
  geometryType: string;
  currentKin: number;
};

export default function Models() {
  const { t } = useLanguage();
  const { oilFields: fields } = useOilFields();
  const [selectedFieldId, setSelectedFieldId] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()));
  
  // Applied values - used only after clicking "Apply" button
  const [appliedFieldId, setAppliedFieldId] = useState<string>("");
  const [appliedYear, setAppliedYear] = useState<string>("");
  
  const [horizons, setHorizons] = useState<Horizon[]>([]);
  const [formations, setFormations] = useState<Formation[]>([]);
  const [drainageZones, setDrainageZones] = useState<DrainageZone[]>([]);
  const [loading, setLoading] = useState(false);

  // Auto-select first field when list changes (workspace switch)
  useEffect(() => {
    if (fields.length > 0 && !fields.find((f) => String(f.id) === selectedFieldId)) {
      setSelectedFieldId(String(fields[0].id));
    }
  }, [fields]);

  useEffect(() => {
    if (!appliedFieldId) return;
    
    const controller = new AbortController();
    const loadGeologyData = async () => {
      setLoading(true);
      try {
        const authHeader = getAuthHeader();
        const headers = {
          "Content-Type": "application/json",
          ...(authHeader ? { Authorization: authHeader } : {}),
        };

        // Load Horizons
        const horizonsRes = await fetch(
          `/api/reservoir-twin/horizons?oil_field_id=${appliedFieldId}`,
          { headers, signal: controller.signal }
        );
        if (horizonsRes.ok) {
          const horizonsData = await horizonsRes.json();
          setHorizons(horizonsData);
        }

        // Load Formations
        const formationsRes = await fetch(
          `/api/reservoir-twin/formations?oil_field_id=${appliedFieldId}`,
          { headers, signal: controller.signal }
        );
        if (formationsRes.ok) {
          const formationsData = await formationsRes.json();
          setFormations(formationsData);
        }

        // Load Drainage Zones
        const zonesRes = await fetch(
          `/api/reservoir-twin/zones?oil_field_id=${appliedFieldId}`,
          { headers, signal: controller.signal }
        );
        if (zonesRes.ok) {
          const zonesData = await zonesRes.json();
          setDrainageZones(zonesData);
        }
      } catch (err) {
        console.error("Failed to load geology data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadGeologyData();
    return () => controller.abort();
  }, [appliedFieldId]);

  const years = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: 11 }, (_, idx) => String(current - idx));
  }, []);

  const handleApply = () => {
    setAppliedFieldId(selectedFieldId);
    setAppliedYear(selectedYear);
  };

  const isApplied = appliedFieldId === selectedFieldId && appliedYear === selectedYear;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('modelsTitle')}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t('modelsSubtitle')}
        </p>
      </div>

      <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-2.5">
        <span className="text-xs font-medium text-muted-foreground shrink-0">{t('modelsOilField')}:</span>
        <select
          id="models-field"
          className="h-8 rounded-md border border-input bg-background px-2 py-1 text-sm flex-1 min-w-0"
          value={selectedFieldId}
          onChange={(e) => setSelectedFieldId(e.target.value)}
        >
          {fields.length === 0 && <option value="">{t('modelsNoFields')}</option>}
          {fields.map((field) => (
            <option key={field.id} value={String(field.id)}>
              {field.shortName || field.name}
            </option>
          ))}
        </select>
        <span className="text-xs font-medium text-muted-foreground shrink-0">{t('modelsDataPeriod')}:</span>
        <select
          id="models-year"
          className="h-8 rounded-md border border-input bg-background px-2 py-1 text-sm w-24 shrink-0"
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
        >
          {years.map((year) => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
        <Button
          size="sm"
          onClick={handleApply}
          disabled={!selectedFieldId || isApplied}
          className="shrink-0 h-8 px-4"
        >
          {t('modelsApply')}
        </Button>
      </div>

      <Tabs defaultValue="geology">
        <TabsList className="flex flex-wrap h-auto gap-2">
          <TabsTrigger value="geology">{t('modelsTabGeology')}</TabsTrigger>
          <TabsTrigger value="technology">{t('modelsTabTechnology')}</TabsTrigger>
          <TabsTrigger value="integrated">{t('modelsTabIntegrated')}</TabsTrigger>
        </TabsList>

        <TabsContent value="geology" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('modelsTabGeology')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="horizons">
                <TabsList className="flex flex-wrap h-auto gap-2">
                  <TabsTrigger value="horizons">{t('modelsTabHorizons')}</TabsTrigger>
                  <TabsTrigger value="map">{t('modelsTabMap')}</TabsTrigger>
                  <TabsTrigger value="3d">{t('modelsTab3D')}</TabsTrigger>
                  <TabsTrigger value="drainage">{t('modelsTabDrainage')}</TabsTrigger>
                </TabsList>

                <TabsContent value="horizons" className="mt-4">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-medium">{t('modelsHorizonsTitle')}</h3>
                      <Button size="sm" variant="outline">
                        <Plus className="h-4 w-4 mr-2" />
                        {t('modelsAddHorizon')}
                      </Button>
                    </div>
                    {!appliedFieldId ? (
                      <p className="text-sm text-muted-foreground">
                        {t('modelsSelectPrompt')}
                      </p>
                    ) : loading ? (
                      <p className="text-sm text-muted-foreground">{t('modelsLoading')}</p>
                    ) : horizons.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        {t('modelsNoHorizons')}
                      </p>
                    ) : (
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-muted">
                            <tr>
                              <th className="text-left p-3 font-medium">{t('modelsHorizonName')}</th>
                              <th className="text-left p-3 font-medium">{t('modelsHorizonCode')}</th>
                              <th className="text-right p-3 font-medium">{t('modelsDepthTop')}</th>
                              <th className="text-right p-3 font-medium">{t('modelsDepthBottom')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {horizons.map((horizon) => (
                              <tr key={horizon.id} className="border-t hover:bg-muted/50">
                                <td className="p-3">{horizon.name}</td>
                                <td className="p-3 font-mono text-xs">{horizon.code}</td>
                                <td className="p-3 text-right">{horizon.depthTop}</td>
                                <td className="p-3 text-right">{horizon.depthBottom}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    <div className="mt-8 pt-6 border-t">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-medium">{t('modelsFormationsTitle')}</h3>
                        <Button size="sm" variant="outline">
                          <Plus className="h-4 w-4 mr-2" />
                          {t('modelsAddFormation')}
                        </Button>
                      </div>
                      {!appliedFieldId ? (
                        <p className="text-sm text-muted-foreground">
                          {t('modelsSelectPrompt')}
                        </p>
                      ) : loading ? (
                        <p className="text-sm text-muted-foreground">{t('modelsLoading')}</p>
                      ) : formations.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          {t('modelsNoFormations')}
                        </p>
                      ) : (
                        <div className="border rounded-lg overflow-hidden">
                          <table className="w-full text-sm">
                            <thead className="bg-muted">
                              <tr>
                                <th className="text-left p-3 font-medium">{t('modelsFormationCode')}</th>
                                <th className="text-left p-3 font-medium">{t('modelsFormationName')}</th>
                                <th className="text-right p-3 font-medium">{t('modelsFormationArea')}</th>
                                <th className="text-right p-3 font-medium">{t('modelsFormationThickness')}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {formations.map((formation) => (
                                <tr key={formation.id} className="border-t hover:bg-muted/50">
                                  <td className="p-3 font-mono text-xs">{formation.code}</td>
                                  <td className="p-3">{formation.name}</td>
                                  <td className="p-3 text-right">{formation.area}</td>
                                  <td className="p-3 text-right">{formation.effectiveThickness}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="map" className="mt-4">
                  {!appliedFieldId ? (
                    <p className="text-sm text-muted-foreground">
                      {t('modelsSelectPrompt')}
                    </p>
                  ) : (
                    <FormationMapViewer 
                      oilFieldId={Number(appliedFieldId)}
                      fieldName={fields.find(f => String(f.id) === appliedFieldId)?.name || ''}
                    />
                  )}
                </TabsContent>

                <TabsContent value="drainage" className="mt-4">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-medium">{t('modelsDrainageTitle')}</h3>
                      <Button size="sm" variant="outline">
                        <Plus className="h-4 w-4 mr-2" />
                        {t('modelsAddZone')}
                      </Button>
                    </div>
                    {!appliedFieldId ? (
                      <p className="text-sm text-muted-foreground">
                        {t('modelsSelectPrompt')}
                      </p>
                    ) : loading ? (
                      <p className="text-sm text-muted-foreground">{t('modelsLoading')}</p>
                    ) : drainageZones.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        {t('modelsNoDrainage')}
                      </p>
                    ) : (
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-muted">
                            <tr>
                              <th className="text-left p-3 font-medium">{t('modelsDrainageCode')}</th>
                              <th className="text-left p-3 font-medium">{t('modelsDrainageName')}</th>
                              <th className="text-left p-3 font-medium">{t('modelsDrainageGeometry')}</th>
                              <th className="text-right p-3 font-medium">{t('modelsDrainageKin')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {drainageZones.map((zone) => (
                              <tr key={zone.id} className="border-t hover:bg-muted/50">
                                <td className="p-3 font-mono text-xs">{zone.code}</td>
                                <td className="p-3">{zone.name}</td>
                                <td className="p-3">{zone.geometryType}</td>
                                <td className="p-3 text-right">{zone.currentKin.toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="3d" className="mt-4">
                  {!appliedFieldId ? (
                    <p className="text-sm text-muted-foreground">
                      {t('modelsSelectPrompt')}
                    </p>
                  ) : (
                    <Formation3DViewer 
                      oilFieldId={Number(appliedFieldId)}
                      fieldName={fields.find(f => String(f.id) === appliedFieldId)?.name || ''}
                    />
                  )}
                </TabsContent>

                </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="technology" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('modelsTabTechnology')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="field-scheme">
                <TabsList className="flex flex-wrap h-auto gap-2">
                  <TabsTrigger value="field-scheme">{t('modelsTechFieldScheme')}</TabsTrigger>
                  <TabsTrigger value="wells">{t('modelsTechWells')}</TabsTrigger>
                  <TabsTrigger value="equipment">{t('modelsTechEquipment')}</TabsTrigger>
                </TabsList>

                <TabsContent value="field-scheme" className="mt-4">
                  <FieldSchemeEditorEmbed />
                </TabsContent>

                <TabsContent value="wells" className="mt-4">
                  {!appliedFieldId ? (
                    <p className="text-sm text-muted-foreground">{t('modelsSelectPrompt')}</p>
                  ) : (
                    <WellEquipmentTab
                      fieldId={appliedFieldId}
                      fieldName={fields.find((f) => String(f.id) === appliedFieldId)?.shortName
                        ?? fields.find((f) => String(f.id) === appliedFieldId)?.name
                        ?? ""}
                    />
                  )}
                </TabsContent>

                <TabsContent value="equipment" className="mt-4">
                  <EquipmentSchemesTab />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrated" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('modelsTabIntegrated')}</CardTitle>
            </CardHeader>
            <CardContent>
              {!appliedFieldId ? (
                <p className="text-sm text-muted-foreground">
                  {t('modelsSelectPrompt')}
                </p>
              ) : (
                <IntegratedModelTab fieldId={appliedFieldId} year={appliedYear} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
