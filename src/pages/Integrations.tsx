import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

type IntegrationKey = "sap" | "scada" | "market" | "excel";
type SapModuleKey = "PP" | "SD" | "FI" | "MM" | "PM" | "PS" | "FM";

const integrations = [
  {
    key: "sap",
    title: "SAP S/4HANA Integration",
    status: "active",
    subtitle: "Last sync: 10 Jan 2027, 08:35 | Next: 10 Jan, 12:00",
  },
  {
    key: "scada",
    title: "SCADA/MES Integration",
    status: "warning",
    subtitle: "Last sync: 10 Jan 2027, 08:30 | 3 assets offline",
  },
  {
    key: "market",
    title: "Bloomberg Market Data",
    status: "paused",
    subtitle: "Last sync: 9 Jan 2027, 18:00 | Subscription expired",
  },
  {
    key: "excel",
    title: "Excel/CSV Import",
    status: "draft",
    subtitle: "Manual import | Ready for configuration",
  },
];

const sapModuleOptions: { key: SapModuleKey; label: string }[] = [
  { key: "PP", label: "PP (Production Planning)" },
  { key: "SD", label: "SD (Sales & Distribution)" },
  { key: "FI", label: "FI (Financial Accounting)" },
  { key: "MM", label: "MM (Materials Management)" },
  { key: "PM", label: "PM (Plant Maintenance)" },
  { key: "PS", label: "PS (Project System)" },
  { key: "FM", label: "FM (Funds Management)" },
];

const sapMappingRows: Record<SapModuleKey, [string, string, string, "ok" | "warn"][]> = {
  PP: [
    ["production_order_id", "AUFNR", "Direct", "ok"],
    ["plant_code", "WERKS", "Direct", "ok"],
    ["material_code", "MATNR", "Direct", "ok"],
    ["planned_start", "GSTRP", "Date", "ok"],
    ["planned_finish", "GLTRP", "Date", "ok"],
    ["planned_volume", "BDMNG", "Direct", "ok"],
    ["volume_unit", "MEINS", "Map", "ok"],
    ["routing_id", "PLNNR", "Direct", "ok"],
    ["version_id", "VERID", "Direct", "warn"],
  ],
  SD: [
    ["sales_order_id", "VBELN", "Direct", "ok"],
    ["sales_item", "POSNR", "Direct", "ok"],
    ["customer_id", "KUNNR", "Direct", "ok"],
    ["material_code", "MATNR", "Direct", "ok"],
    ["order_qty", "KWMENG", "Direct", "ok"],
    ["qty_unit", "VRKME", "Map", "ok"],
    ["net_value", "NETWR", "Direct", "ok"],
    ["currency", "WAERK", "Map", "ok"],
    ["requested_date", "EDATU", "Date", "ok"],
    ["billing_date", "FKDAT", "Date", "warn"],
  ],
  FI: [
    ["document_id", "BELNR", "Direct", "ok"],
    ["fiscal_year", "GJAHR", "Direct", "ok"],
    ["company_code", "BUKRS", "Direct", "ok"],
    ["gl_account", "HKONT", "Direct", "ok"],
    ["amount_local", "DMBTR", "Direct", "ok"],
    ["amount_doc", "WRBTR", "Direct", "ok"],
    ["currency", "WAERS", "Map", "ok"],
    ["document_date", "BLDAT", "Date", "ok"],
    ["posting_date", "BUDAT", "Date", "ok"],
    ["assignment", "ZUONR", "Direct", "warn"],
  ],
  MM: [
    ["material_code", "MATNR", "Direct", "ok"],
    ["material_type", "MTART", "Direct", "ok"],
    ["plant_code", "WERKS", "Direct", "ok"],
    ["storage_location", "LGORT", "Direct", "ok"],
    ["unrestricted_stock", "LABST", "Direct", "ok"],
    ["stock_unit", "MEINS", "Map", "ok"],
    ["valuation_price", "STPRS", "Direct", "ok"],
    ["currency", "WAERS", "Map", "ok"],
    ["last_movement", "LBKUM", "Date", "warn"],
  ],
  PM: [
    ["order_id", "AUFNR", "Direct", "ok"],
    ["equipment_id", "EQUNR", "Direct", "ok"],
    ["functional_location", "TPLNR", "Direct", "ok"],
    ["order_type", "AUART", "Direct", "ok"],
    ["priority", "PRIOK", "Direct", "ok"],
    ["planned_start", "GSTRP", "Date", "ok"],
    ["planned_finish", "GLTRP", "Date", "ok"],
    ["actual_start", "GSTRI", "Date", "ok"],
    ["actual_finish", "GETRI", "Date", "ok"],
    ["order_status", "STTXT", "Custom", "warn"],
  ],
  PS: [
    ["project_id", "PSPID", "Direct", "ok"],
    ["wbs_element", "POSID", "Direct", "ok"],
    ["project_name", "POST1", "Direct", "ok"],
    ["responsible_cc", "KOSTL", "Direct", "ok"],
    ["planned_start", "PLFAZ", "Date", "ok"],
    ["planned_finish", "PLSEZ", "Date", "ok"],
    ["planned_cost", "PSMNG", "Direct", "ok"],
    ["actual_cost", "ISM01", "Direct", "ok"],
    ["currency", "WAERS", "Map", "warn"],
  ],
  FM: [
    ["fund_center", "FISTL", "Direct", "ok"],
    ["fund", "GEBER", "Direct", "ok"],
    ["commitment_item", "FIPOS", "Direct", "ok"],
    ["budget_period", "BDGPD", "Direct", "ok"],
    ["budget_amount", "WTBTR", "Direct", "ok"],
    ["actual_amount", "WTGES", "Direct", "ok"],
    ["commitment_amount", "WKBTR", "Direct", "ok"],
    ["currency", "WAERS", "Map", "ok"],
    ["fiscal_year", "GJAHR", "Direct", "warn"],
  ],
};

const defaultMappingRows: [string, string, string, "ok" | "warn"][] = [
  ["asset_id", "WERKS", "Direct", "ok"],
  ["asset_name", "NAME1", "Direct", "ok"],
  ["planned_volume", "BDMNG", "Direct", "ok"],
  ["planned_volume_unit", "MEINS", "Map", "ok"],
  ["period_start", "GSTRP", "Date", "ok"],
  ["status", "STTXT", "Custom", "warn"],
];

export default function Integrations() {
  const { t } = useLanguage();
  const [active, setActive] = useState<IntegrationKey>("sap");
  const [sapModule, setSapModule] = useState<SapModuleKey>("PP");
  const [moduleExpanded, setModuleExpanded] = useState<Record<string, boolean>>({});
  const activeIntegration = useMemo(() => integrations.find((item) => item.key === active), [active]);
  const mappingRows = useMemo(() => {
    if (active !== "sap") {
      return defaultMappingRows;
    }
    return sapMappingRows[sapModule] ?? defaultMappingRows;
  }, [active, sapModule]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("integrationsTitle")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("integrationsSubtitle")}</p>
        </div>
        <Button>{t("addIntegration")}</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">{t("integrationsList")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {integrations.map((item) => (
              <button
                key={item.key}
                onClick={() => setActive(item.key as IntegrationKey)}
                className={`w-full text-left rounded-lg border px-3 py-3 transition-colors ${
                  active === item.key ? "border-primary bg-primary/5" : "border-border"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium text-sm">{item.title}</div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full ${
                      item.status === "active"
                        ? "bg-success/20 text-success"
                        : item.status === "warning"
                          ? "bg-warning/20 text-warning"
                          : item.status === "paused"
                            ? "bg-muted text-muted-foreground"
                            : "bg-accent/20 text-accent"
                    }`}
                  >
                    {t(`integrationStatus_${item.status}`)}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">{item.subtitle}</div>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Button size="sm" variant="outline">
                    {t("configure")}
                  </Button>
                  <Button size="sm" variant="outline">
                    {t("testConnection")}
                  </Button>
                  <Button size="sm" variant="outline">
                    {t("viewLogs")}
                  </Button>
                  <Button size="sm" variant="outline">
                    {item.status === "paused" ? t("enable") : t("disable")}
                  </Button>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">
              {activeIntegration?.title ?? t("integrationDetail")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="connection">
              <TabsList className="flex flex-wrap h-auto gap-2">
                <TabsTrigger value="connection">{t("integrationTabConnection")}</TabsTrigger>
                <TabsTrigger value="modules">{t("integrationTabModules")}</TabsTrigger>
                <TabsTrigger value="mapping">{t("integrationTabMapping")}</TabsTrigger>
                <TabsTrigger value="schedule">{t("integrationTabSchedule")}</TabsTrigger>
                <TabsTrigger value="logs">{t("integrationTabLogs")}</TabsTrigger>
              </TabsList>

              <TabsContent value="connection" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">{t("connectionSettings")}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {active === "sap" && (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">{t("environmentType")}</label>
                            <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
                              <option>{t("envProduction")}</option>
                              <option>{t("envTest")}</option>
                              <option>{t("envDev")}</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">{t("authMethod")}</label>
                            <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
                              <option>Basic Auth</option>
                              <option>OAuth 2.0</option>
                              <option>SSO</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">{t("sapHost")}</label>
                            <Input defaultValue="sap-prod.company.com" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">{t("sapSystemNumber")}</label>
                            <Input defaultValue="00" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">{t("sapClient")}</label>
                            <Input defaultValue="100" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">{t("sapPort")}</label>
                            <Input defaultValue="8000" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">{t("username")}</label>
                            <Input defaultValue="DTWIN_USER" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">{t("password")}</label>
                            <Input type="password" defaultValue="••••••••" />
                          </div>
                        </div>
                        <label className="flex items-center gap-2 text-sm">
                          <Checkbox defaultChecked />
                          {t("useSecureConnection")}
                        </label>
                      </>
                    )}
                    {active === "scada" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">{t("scadaProtocol")}</label>
                          <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
                            <option>OPC UA</option>
                            <option>MQTT</option>
                            <option>REST</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">{t("scadaEndpoint")}</label>
                          <Input defaultValue="opc.tcp://scada-hub.local:4840" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">{t("scadaHistorian")}</label>
                          <Input defaultValue="pi-server.company.com" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">{t("scadaPoll")}</label>
                          <Input defaultValue="10 сек" />
                        </div>
                        <div className="space-y-1 md:col-span-2">
                          <label className="text-xs text-muted-foreground">{t("scadaTags")}</label>
                          <Input defaultValue="flow_rate.*, pressure.*, tank_level.*" />
                        </div>
                        <div className="space-y-1 md:col-span-2">
                          <label className="text-xs text-muted-foreground">{t("scadaSecurity")}</label>
                          <Input defaultValue="mTLS + VPN" />
                        </div>
                      </div>
                    )}
                    {active === "market" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">{t("marketProvider")}</label>
                          <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
                            <option>Bloomberg</option>
                            <option>Reuters</option>
                            <option>ICE</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">{t("marketApiKey")}</label>
                          <Input type="password" defaultValue="••••••••" />
                        </div>
                        <div className="space-y-1 md:col-span-2">
                          <label className="text-xs text-muted-foreground">{t("marketInstruments")}</label>
                          <Input defaultValue="Brent, Urals, KZ-Blend, USDKZT" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">{t("marketRefresh")}</label>
                          <Input defaultValue="15 мин" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">{t("marketFallback")}</label>
                          <Input defaultValue="30 мин" />
                        </div>
                      </div>
                    )}
                    {active === "excel" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">{t("excelTemplate")}</label>
                          <Input defaultValue="digital_twin_template.xlsx" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">{t("excelPath")}</label>
                          <Input defaultValue="/imports/sap/" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">{t("excelDelimiter")}</label>
                          <Input defaultValue=";" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">{t("excelEncoding")}</label>
                          <Input defaultValue="UTF-8" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">{t("excelDateFormat")}</label>
                          <Input defaultValue="YYYY-MM-DD" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">{t("excelImportMode")}</label>
                          <Input defaultValue="Upsert by code" />
                        </div>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button variant="outline">{t("testConnection")}</Button>
                      <Button>{t("saveSettings")}</Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="modules" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">{t("modulesConfig")}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {active === "sap" && (
                      <>
                        {["PP", "SD", "FI", "MM", "PM", "PS", "FM"].map((module) => {
                          const isOpen = moduleExpanded[module] ?? false;
                          return (
                            <Collapsible
                              key={module}
                              open={isOpen}
                              onOpenChange={(open) =>
                                setModuleExpanded((prev) => ({ ...prev, [module]: open }))
                              }
                              className="rounded-lg border border-border"
                            >
                              <CollapsibleTrigger asChild>
                                <div className="flex items-center justify-between px-3 py-2.5 cursor-pointer select-none hover:bg-muted/40 transition-colors rounded-lg">
                                  <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                                    <Checkbox
                                      defaultChecked
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                    {t(`sapModule_${module}`)}
                                  </label>
                                  <ChevronDown
                                    className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                                  />
                                </div>
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <div className="px-3 pb-3 space-y-2 border-t border-border pt-2">
                                  <div className="text-xs text-muted-foreground">{t("moduleDataToSync")}</div>
                                  <ul className="text-xs text-muted-foreground list-disc pl-5">
                                    <li>{t("moduleItemOrders")}</li>
                                    <li>{t("moduleItemVolumes")}</li>
                                    <li>{t("moduleItemActuals")}</li>
                                    <li>{t("moduleItemMasterData")}</li>
                                  </ul>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    {t("syncFrequency")}{" "}
                                    <select className="h-7 rounded-md border border-input bg-background px-2">
                                      <option>{t("syncEvery4h")}</option>
                                      <option>{t("syncEvery6h")}</option>
                                      <option>{t("syncDaily")}</option>
                                    </select>
                                  </div>
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          );
                        })}
                      </>
                    )}
                    {active === "scada" && (
                      <div className="rounded-lg border border-border p-3 space-y-2">
                        <label className="flex items-center gap-2 text-sm font-medium">
                          <Checkbox defaultChecked />
                          {t("scadaModulesTelemetry")}
                        </label>
                        <div className="text-xs text-muted-foreground">{t("scadaModulesDesc")}</div>
                        <ul className="text-xs text-muted-foreground list-disc pl-5">
                          <li>{t("scadaModuleFlow")}</li>
                          <li>{t("scadaModulePressure")}</li>
                          <li>{t("scadaModuleTank")}</li>
                          <li>{t("scadaModuleAlerts")}</li>
                        </ul>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {t("syncFrequency")}{" "}
                          <select className="h-7 rounded-md border border-input bg-background px-2">
                            <option>10 сек</option>
                            <option>30 сек</option>
                            <option>1 мин</option>
                          </select>
                        </div>
                      </div>
                    )}
                    {active === "market" && (
                      <div className="rounded-lg border border-border p-3 space-y-2">
                        <label className="flex items-center gap-2 text-sm font-medium">
                          <Checkbox defaultChecked />
                          {t("marketModulesCore")}
                        </label>
                        <div className="text-xs text-muted-foreground">{t("marketModulesDesc")}</div>
                        <ul className="text-xs text-muted-foreground list-disc pl-5">
                          <li>{t("marketModulePrices")}</li>
                          <li>{t("marketModuleFx")}</li>
                          <li>{t("marketModuleCurves")}</li>
                        </ul>
                      </div>
                    )}
                    {active === "excel" && (
                      <div className="rounded-lg border border-border p-3 space-y-2">
                        <label className="flex items-center gap-2 text-sm font-medium">
                          <Checkbox defaultChecked />
                          {t("excelModulesImport")}
                        </label>
                        <div className="text-xs text-muted-foreground">{t("excelModulesDesc")}</div>
                        <ul className="text-xs text-muted-foreground list-disc pl-5">
                          <li>{t("excelModuleMasterData")}</li>
                          <li>{t("excelModuleScenarios")}</li>
                          <li>{t("excelModulePlans")}</li>
                        </ul>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button>{t("saveModuleSettings")}</Button>
                      <Button variant="outline">{t("runFullSync")}</Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="mapping" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">{t("fieldMapping")}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <select className="h-9 rounded-md border border-input bg-background px-2 text-sm">
                        <option>{t("mappingEntityProduction")}</option>
                        <option>{t("mappingEntitySales")}</option>
                        <option>{t("mappingEntityFinance")}</option>
                      </select>
                    {active === "sap" && (
                      <select
                        className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                        value={sapModule}
                        onChange={(e) => setSapModule(e.target.value as SapModuleKey)}
                      >
                        {sapModuleOptions.map((item) => (
                          <option key={item.key} value={item.key}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    )}
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border text-muted-foreground">
                            <th className="text-left py-2 px-2">{t("dtField")}</th>
                            <th className="text-left py-2 px-2">{t("sapField")}</th>
                            <th className="text-left py-2 px-2">{t("transform")}</th>
                            <th className="text-left py-2 px-2">✓</th>
                          </tr>
                        </thead>
                        <tbody>
                          {mappingRows.map((row) => (
                            <tr key={row[0]} className="border-b border-border/50">
                              <td className="py-2 px-2">{row[0]}</td>
                              <td className="py-2 px-2">{row[1]}</td>
                              <td className="py-2 px-2">{row[2]}</td>
                              <td className="py-2 px-2">
                                <span
                                  className={`text-[10px] px-2 py-0.5 rounded-full ${
                                    row[3] === "ok" ? "bg-success/15 text-success" : "bg-warning/15 text-warning"
                                  }`}
                                >
                                  {row[3] === "ok" ? "OK" : "WARN"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex gap-2">
                      <Button>{t("saveMapping")}</Button>
                      <Button variant="outline">{t("testMapping")}</Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="schedule" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">{t("syncSchedule")}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">{t("scheduleMode")}</label>
                        <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
                          <option>{t("scheduled")}</option>
                          <option>{t("onDemand")}</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">{t("scheduleRule")}</label>
                        <Input defaultValue="Every 4 hours" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">{t("timeWindow")}</label>
                        <Input defaultValue="00:00 - 23:59" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">{t("nextRun")}</label>
                        <Input defaultValue="10 Jan 2027, 12:00" />
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox defaultChecked />
                      {t("retryFailed")}
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox defaultChecked />
                      {t("alertOnFail")}
                    </label>
                    <div className="flex gap-2">
                      <Button>{t("saveSchedule")}</Button>
                      <Button variant="outline">{t("runManualSync")}</Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="logs" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">{t("syncLogs")}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <select className="h-9 rounded-md border border-input bg-background px-2 text-sm">
                        <option>{t("filterAllModules")}</option>
                      </select>
                      <select className="h-9 rounded-md border border-input bg-background px-2 text-sm">
                        <option>{t("filterAllStatus")}</option>
                      </select>
                      <select className="h-9 rounded-md border border-input bg-background px-2 text-sm">
                        <option>{t("filterLast7Days")}</option>
                      </select>
                      <Input placeholder={t("searchLogs")} className="max-w-xs" />
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border text-muted-foreground">
                            <th className="text-left py-2 px-2">{t("logTimestamp")}</th>
                            <th className="text-left py-2 px-2">{t("logModule")}</th>
                            <th className="text-left py-2 px-2">{t("logStatus")}</th>
                            <th className="text-left py-2 px-2">{t("logRecords")}</th>
                            <th className="text-left py-2 px-2">{t("logDuration")}</th>
                            <th className="text-left py-2 px-2">{t("logDetails")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            ["10 Jan, 08:35", "PP", "OK", "1,247", "45s", "[View]"],
                            ["10 Jan, 06:00", "SD", "OK", "432", "28s", "[View]"],
                            ["9 Jan, 20:00", "PP", "FAIL", "0", "15s", "[View]"],
                          ].map((row, idx) => (
                            <tr key={idx} className="border-b border-border/50">
                              <td className="py-2 px-2">{row[0]}</td>
                              <td className="py-2 px-2">{row[1]}</td>
                              <td className="py-2 px-2">
                                <span
                                  className={`text-[10px] px-2 py-0.5 rounded-full ${
                                    row[2] === "OK"
                                      ? "bg-success/15 text-success"
                                      : row[2] === "FAIL"
                                        ? "bg-destructive/15 text-destructive"
                                        : "bg-warning/15 text-warning"
                                  }`}
                                >
                                  {row[2]}
                                </span>
                              </td>
                              <td className="py-2 px-2">{row[3]}</td>
                              <td className="py-2 px-2">{row[4]}</td>
                              <td className="py-2 px-2">{row[5]}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline">{t("exportLogs")}</Button>
                      <Button variant="outline">{t("clearLogs")}</Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
