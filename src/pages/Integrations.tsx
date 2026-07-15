import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { useCompanyProfile } from "@/context/CompanyProfileContext";

type SapModuleKey = "PP" | "SD" | "FI" | "MM" | "PM" | "PS" | "FM";

type IntegrationStatus = "active" | "warning" | "paused" | "draft";

interface ConnectionField {
  id: string;
  label: string;
  defaultValue?: string;
  type?: "text" | "password" | "select";
  options?: string[];
}

interface IntegrationCard {
  key: string;
  title: string;
  status: IntegrationStatus;
  subtitle: string;
  /** Поля connection-формы для generic-рендера (не нужны для sap/scada/market/excel — там кастом). */
  connectionFields?: ConnectionField[];
  /** Список подмодулей для отображения в Modules tab (generic-рендер). */
  moduleItems?: string[];
  /** Сущности и их маппинги полей для Mapping tab. */
  mappingEntities?: MappingEntity[];
}

interface MappingRow {
  dt: string;
  external: string;
  transform: "Direct" | "Map" | "Date" | "Custom";
  status: "ok" | "warn";
}

interface MappingEntity {
  id: string;
  label: string;
  rows: MappingRow[];
}

/* ─────────────────── Нефтяной набор (без изменений UI) ────────────────── */

const oilIntegrations: IntegrationCard[] = [
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

/* ─────────────────── Строительный набор (по prompt.md) ────────────────── */

const constructionIntegrations: IntegrationCard[] = [
  {
    key: "bim360",
    title: "Autodesk BIM 360 / ACC",
    status: "active",
    subtitle: "Last sync: 03 Jun 2026, 09:12 | 12 моделей IFC",
    connectionFields: [
      { id: "host", label: "Hub URL", defaultValue: "https://developer.api.autodesk.com" },
      { id: "auth", label: "OAuth 2.0", type: "select", options: ["3-Legged", "2-Legged"] },
      { id: "client_id", label: "Client ID", defaultValue: "ACC_DTWIN_KZ" },
      { id: "client_secret", label: "Client Secret", type: "password", defaultValue: "••••••••" },
      { id: "account_id", label: "Account ID", defaultValue: "b.acc.32a0-…" },
      { id: "project_id", label: "Project ID", defaultValue: "b.proj.highvill" },
    ],
    moduleItems: ["3D-модели (IFC / RVT)", "Issues / RFI", "Документы и папки CDE", "Подписки на события"],
    mappingEntities: [
      {
        id: "models",
        label: "BIM-модели (IFC / RVT)",
        rows: [
          { dt: "element_id",       external: "item.urn",                  transform: "Direct", status: "ok"  },
          { dt: "element_name",     external: "item.displayName",          transform: "Direct", status: "ok"  },
          { dt: "ifc_guid",         external: "properties.IfcGuid",        transform: "Direct", status: "ok"  },
          { dt: "element_type",     external: "properties.Category",       transform: "Map",    status: "ok"  },
          { dt: "level",            external: "properties.Level.Name",     transform: "Direct", status: "ok"  },
          { dt: "version",          external: "item.versionNumber",        transform: "Direct", status: "ok"  },
          { dt: "file_path",        external: "item.relativePath",         transform: "Direct", status: "ok"  },
          { dt: "size_mb",          external: "item.storageSize",          transform: "Custom", status: "warn"},
        ],
      },
      {
        id: "issues",
        label: "Issues / RFI",
        rows: [
          { dt: "issue_id",         external: "issues.id",                 transform: "Direct", status: "ok"  },
          { dt: "title",            external: "issues.title",              transform: "Direct", status: "ok"  },
          { dt: "status",           external: "issues.status",             transform: "Map",    status: "ok"  },
          { dt: "severity",         external: "issues.priority",           transform: "Map",    status: "ok"  },
          { dt: "assignee",         external: "issues.assignedTo.email",   transform: "Direct", status: "ok"  },
          { dt: "location",         external: "issues.location.name",      transform: "Direct", status: "warn"},
          { dt: "created_at",       external: "issues.createdAt",          transform: "Date",   status: "ok"  },
          { dt: "due_date",         external: "issues.dueDate",            transform: "Date",   status: "ok"  },
        ],
      },
      {
        id: "documents",
        label: "Документы и папки CDE",
        rows: [
          { dt: "document_id",      external: "docs.urn",                  transform: "Direct", status: "ok"  },
          { dt: "file_name",        external: "docs.displayName",          transform: "Direct", status: "ok"  },
          { dt: "folder",           external: "docs.folder.path",          transform: "Direct", status: "ok"  },
          { dt: "revision",         external: "docs.versionNumber",        transform: "Direct", status: "ok"  },
          { dt: "approved_at",      external: "docs.approvedAt",           transform: "Date",   status: "warn"},
          { dt: "approver",         external: "docs.approver.email",       transform: "Direct", status: "ok"  },
        ],
      },
    ],
  },
  {
    key: "navisworks",
    title: "Autodesk Navisworks",
    status: "active",
    subtitle: "Last clash run: 02 Jun 2026 | 42 коллизии (4 critical)",
    connectionFields: [
      { id: "exportPath", label: "Папка экспорта NWD", defaultValue: "\\\\file-srv\\bim\\nwd" },
      { id: "nwdVersion", label: "Версия NWD", type: "select", options: ["2024", "2023", "2022"] },
      { id: "clashSchedule", label: "Запуск clash-detection", defaultValue: "Каждую ночь 23:00" },
      { id: "exportFormat", label: "Формат отчёта", type: "select", options: ["XML", "HTML", "PDF"] },
    ],
    moduleItems: ["Clash detection (HARD/CLEAR)", "4D-симуляция (NWD)", "Экспорт отчётов и Issues", "Связь с BIM 360 моделями"],
    mappingEntities: [
      {
        id: "clashes",
        label: "Коллизии (Clash Detective)",
        rows: [
          { dt: "clash_id",         external: "ClashResult.GUID",          transform: "Direct", status: "ok"  },
          { dt: "clash_name",       external: "ClashResult.Name",          transform: "Direct", status: "ok"  },
          { dt: "status",           external: "ClashResult.Status",        transform: "Map",    status: "ok"  },
          { dt: "severity",         external: "ClashResult.Severity",      transform: "Custom", status: "warn"},
          { dt: "distance_m",       external: "ClashResult.Distance",      transform: "Direct", status: "ok"  },
          { dt: "element_a_guid",   external: "ClashResult.Element1.GUID", transform: "Direct", status: "ok"  },
          { dt: "element_b_guid",   external: "ClashResult.Element2.GUID", transform: "Direct", status: "ok"  },
          { dt: "clash_point_xyz",  external: "ClashResult.ClashPoint",    transform: "Custom", status: "warn"},
          { dt: "created_at",       external: "ClashResult.CreatedDate",   transform: "Date",   status: "ok"  },
        ],
      },
      {
        id: "viewpoints",
        label: "Viewpoints / Saved Views",
        rows: [
          { dt: "viewpoint_id",     external: "Viewpoint.GUID",            transform: "Direct", status: "ok"  },
          { dt: "name",             external: "Viewpoint.Name",            transform: "Direct", status: "ok"  },
          { dt: "camera_position",  external: "Viewpoint.Position",        transform: "Custom", status: "ok"  },
          { dt: "comment",          external: "Viewpoint.Comment",         transform: "Direct", status: "warn"},
        ],
      },
      {
        id: "timeliner",
        label: "TimeLiner (4D-задачи)",
        rows: [
          { dt: "task_id",          external: "TimelinerTask.GUID",        transform: "Direct", status: "ok"  },
          { dt: "task_name",        external: "TimelinerTask.Name",        transform: "Direct", status: "ok"  },
          { dt: "planned_start",    external: "TimelinerTask.PlannedStart",transform: "Date",   status: "ok"  },
          { dt: "planned_finish",   external: "TimelinerTask.PlannedEnd",  transform: "Date",   status: "ok"  },
          { dt: "task_type",        external: "TimelinerTask.TaskType",    transform: "Map",    status: "ok"  },
          { dt: "linked_selection", external: "TimelinerTask.SelectionSet",transform: "Custom", status: "warn"},
        ],
      },
    ],
  },
  {
    key: "primavera",
    title: "Oracle Primavera P6",
    status: "warning",
    subtitle: "Last sync: 03 Jun 2026, 06:00 | 4 задачи без предшественников",
    connectionFields: [
      { id: "host", label: "P6 Server", defaultValue: "p6.kto.local" },
      { id: "port", label: "Port", defaultValue: "8206" },
      { id: "user", label: "Username", defaultValue: "DTWIN_RO" },
      { id: "password", label: "Password", type: "password", defaultValue: "••••••••" },
      { id: "dbSchema", label: "DB Schema", defaultValue: "PMDB" },
      { id: "eps", label: "EPS Path", defaultValue: "KTO / Highvill / Korpus-1" },
    ],
    moduleItems: ["WBS и календари", "Задачи / связи (FS, SS, FF)", "Назначения ресурсов и стоимость", "EVM-метрики (PV, EV, AC)"],
    mappingEntities: [
      {
        id: "activities",
        label: "Activities (задачи графика)",
        rows: [
          { dt: "task_id",          external: "TASK.task_id",              transform: "Direct", status: "ok"  },
          { dt: "task_name",        external: "TASK.task_name",            transform: "Direct", status: "ok"  },
          { dt: "wbs_id",           external: "TASK.wbs_id",               transform: "Direct", status: "ok"  },
          { dt: "planned_start",    external: "TASK.target_start_date",    transform: "Date",   status: "ok"  },
          { dt: "planned_finish",   external: "TASK.target_end_date",      transform: "Date",   status: "ok"  },
          { dt: "actual_start",     external: "TASK.act_start_date",       transform: "Date",   status: "ok"  },
          { dt: "actual_finish",    external: "TASK.act_end_date",         transform: "Date",   status: "ok"  },
          { dt: "duration_h",       external: "TASK.target_drtn_hr_cnt",   transform: "Direct", status: "ok"  },
          { dt: "progress_pct",     external: "TASK.phys_complete_pct",    transform: "Direct", status: "ok"  },
          { dt: "planned_value",    external: "TASK.target_cost",          transform: "Direct", status: "ok"  },
          { dt: "earned_value",     external: "TASKACTV.eve_cost",         transform: "Direct", status: "ok"  },
          { dt: "actual_cost",      external: "TASK.act_total_cost",       transform: "Direct", status: "ok"  },
          { dt: "status",           external: "TASK.status_code",          transform: "Map",    status: "warn"},
        ],
      },
      {
        id: "wbs",
        label: "WBS-структура",
        rows: [
          { dt: "wbs_id",           external: "PROJWBS.wbs_id",            transform: "Direct", status: "ok"  },
          { dt: "wbs_short_name",   external: "PROJWBS.wbs_short_name",    transform: "Direct", status: "ok"  },
          { dt: "wbs_full_name",    external: "PROJWBS.wbs_name",          transform: "Direct", status: "ok"  },
          { dt: "parent_wbs_id",    external: "PROJWBS.parent_wbs_id",     transform: "Direct", status: "ok"  },
          { dt: "planned_cost",     external: "PROJWBS.orig_cost",         transform: "Direct", status: "ok"  },
          { dt: "responsible_cc",   external: "PROJWBS.obs_id",            transform: "Custom", status: "warn"},
        ],
      },
      {
        id: "relationships",
        label: "Связи задач (предшественники)",
        rows: [
          { dt: "predecessor_id",   external: "TASKPRED.pred_task_id",     transform: "Direct", status: "ok"  },
          { dt: "successor_id",     external: "TASKPRED.task_id",          transform: "Direct", status: "ok"  },
          { dt: "relation_type",    external: "TASKPRED.pred_type",        transform: "Map",    status: "ok"  },
          { dt: "lag_days",         external: "TASKPRED.lag_hr_cnt",       transform: "Custom", status: "ok"  },
        ],
      },
      {
        id: "resources",
        label: "Ресурсы",
        rows: [
          { dt: "resource_id",      external: "RSRC.rsrc_id",              transform: "Direct", status: "ok"  },
          { dt: "resource_name",    external: "RSRC.rsrc_name",            transform: "Direct", status: "ok"  },
          { dt: "resource_type",    external: "RSRC.rsrc_type",            transform: "Map",    status: "ok"  },
          { dt: "max_units_h",      external: "RSRC.def_qty_per_hr",       transform: "Direct", status: "ok"  },
          { dt: "cost_per_qty",     external: "RSRC.cost_per_qty",         transform: "Direct", status: "warn"},
        ],
      },
      {
        id: "assignments",
        label: "Назначения ресурсов",
        rows: [
          { dt: "assignment_id",    external: "TASKRSRC.taskrsrc_id",      transform: "Direct", status: "ok"  },
          { dt: "task_id",          external: "TASKRSRC.task_id",          transform: "Direct", status: "ok"  },
          { dt: "resource_id",      external: "TASKRSRC.rsrc_id",          transform: "Direct", status: "ok"  },
          { dt: "planned_units",    external: "TASKRSRC.target_qty",       transform: "Direct", status: "ok"  },
          { dt: "actual_units",     external: "TASKRSRC.act_reg_qty",      transform: "Direct", status: "ok"  },
          { dt: "planned_cost",     external: "TASKRSRC.target_cost",      transform: "Direct", status: "ok"  },
          { dt: "actual_cost",      external: "TASKRSRC.act_reg_cost",     transform: "Direct", status: "ok"  },
        ],
      },
    ],
  },
  {
    key: "msproject",
    title: "Microsoft Project",
    status: "active",
    subtitle: "Last sync: 03 Jun 2026, 08:45 | Project Server",
    connectionFields: [
      { id: "server", label: "Project Server URL", defaultValue: "https://psrv.kto.kz/pwa" },
      { id: "site", label: "SharePoint Site", defaultValue: "/sites/projects/highvill" },
      { id: "user", label: "Domain\\User", defaultValue: "KTO\\bim_svc" },
      { id: "password", label: "Password", type: "password", defaultValue: "••••••••" },
      { id: "filter", label: "Фильтр проектов", defaultValue: "Department = 'Construction'" },
    ],
    moduleItems: [".mpp файлы из библиотеки", "Project Server (PWA REST)", "Базовый план / прогресс", "Ресурсы и календари"],
    mappingEntities: [
      {
        id: "tasks",
        label: "Tasks (задачи)",
        rows: [
          { dt: "task_id",          external: "Task.UID",                  transform: "Direct", status: "ok"  },
          { dt: "task_name",        external: "Task.Name",                 transform: "Direct", status: "ok"  },
          { dt: "outline_number",   external: "Task.OutlineNumber",        transform: "Direct", status: "ok"  },
          { dt: "outline_level",    external: "Task.OutlineLevel",         transform: "Direct", status: "ok"  },
          { dt: "planned_start",    external: "Task.BaselineStart",        transform: "Date",   status: "ok"  },
          { dt: "planned_finish",   external: "Task.BaselineFinish",       transform: "Date",   status: "ok"  },
          { dt: "actual_start",     external: "Task.ActualStart",          transform: "Date",   status: "ok"  },
          { dt: "actual_finish",    external: "Task.ActualFinish",         transform: "Date",   status: "ok"  },
          { dt: "duration_min",     external: "Task.Duration",             transform: "Custom", status: "ok"  },
          { dt: "progress_pct",     external: "Task.PercentComplete",      transform: "Direct", status: "ok"  },
          { dt: "planned_value",    external: "Task.BCWS",                 transform: "Direct", status: "ok"  },
          { dt: "earned_value",     external: "Task.BCWP",                 transform: "Direct", status: "ok"  },
          { dt: "actual_cost",      external: "Task.ACWP",                 transform: "Direct", status: "ok"  },
          { dt: "predecessors",     external: "Task.PredecessorLink",      transform: "Custom", status: "warn"},
        ],
      },
      {
        id: "resources",
        label: "Resources",
        rows: [
          { dt: "resource_id",      external: "Resource.UID",              transform: "Direct", status: "ok"  },
          { dt: "resource_name",    external: "Resource.Name",             transform: "Direct", status: "ok"  },
          { dt: "type",             external: "Resource.Type",             transform: "Map",    status: "ok"  },
          { dt: "max_units",        external: "Resource.MaxUnits",         transform: "Direct", status: "ok"  },
          { dt: "std_rate",         external: "Resource.StandardRate",     transform: "Direct", status: "ok"  },
          { dt: "calendar_id",      external: "Resource.CalendarUID",      transform: "Direct", status: "warn"},
        ],
      },
      {
        id: "assignments",
        label: "Assignments (назначения)",
        rows: [
          { dt: "assignment_id",    external: "Assignment.UID",            transform: "Direct", status: "ok"  },
          { dt: "task_id",          external: "Assignment.TaskUID",        transform: "Direct", status: "ok"  },
          { dt: "resource_id",      external: "Assignment.ResourceUID",    transform: "Direct", status: "ok"  },
          { dt: "planned_work_h",   external: "Assignment.BaselineWork",   transform: "Custom", status: "ok"  },
          { dt: "actual_work_h",    external: "Assignment.ActualWork",     transform: "Custom", status: "ok"  },
          { dt: "planned_cost",     external: "Assignment.BaselineCost",   transform: "Direct", status: "ok"  },
          { dt: "actual_cost",      external: "Assignment.ActualCost",     transform: "Direct", status: "ok"  },
        ],
      },
    ],
  },
  {
    key: "erp1c",
    title: "1С:ERP",
    status: "active",
    subtitle: "Last sync: 03 Jun 2026, 08:00 | OData",
    connectionFields: [
      { id: "server", label: "Сервер 1С", defaultValue: "1c-cluster.kto.local" },
      { id: "infobase", label: "Информационная база", defaultValue: "ERP_PROD" },
      { id: "transport", label: "Транспорт", type: "select", options: ["OData /odata/standard.odata", "COM-коннектор", "HTTP-сервис"] },
      { id: "user", label: "Username", defaultValue: "dtwin_integrator" },
      { id: "password", label: "Password", type: "password", defaultValue: "••••••••" },
      { id: "platform", label: "Платформа", type: "select", options: ["8.3.24", "8.3.22", "8.3.20"] },
    ],
    moduleItems: ["Сметы и КС-2 / КС-3", "Закупки и поставщики", "Учёт материалов и склад", "Договоры и взаиморасчёты"],
    mappingEntities: [
      {
        id: "estimates",
        label: "Сметы / КС-2 / КС-3",
        rows: [
          { dt: "cost_item_id",     external: "Document_СтрокаСметы.Ref_Key",        transform: "Direct", status: "ok"  },
          { dt: "cost_item_code",   external: "Document_СтрокаСметы.Код",            transform: "Direct", status: "ok"  },
          { dt: "name",             external: "Document_СтрокаСметы.Наименование",   transform: "Direct", status: "ok"  },
          { dt: "unit",             external: "Catalog_ЕдиницыИзмерения.Код",        transform: "Map",    status: "ok"  },
          { dt: "quantity",         external: "Document_СтрокаСметы.Количество",     transform: "Direct", status: "ok"  },
          { dt: "unit_price",       external: "Document_СтрокаСметы.Цена",           transform: "Direct", status: "ok"  },
          { dt: "planned_value",    external: "Document_СтрокаСметы.СтоимостьПлан",  transform: "Direct", status: "ok"  },
          { dt: "actual_cost",      external: "Document_СтрокаСметы.СтоимостьФакт",  transform: "Direct", status: "ok"  },
          { dt: "contractor",       external: "Catalog_Контрагенты.Наименование",    transform: "Direct", status: "ok"  },
          { dt: "ks2_number",       external: "Document_АктВыполненныхРабот.Номер",  transform: "Custom", status: "warn"},
        ],
      },
      {
        id: "purchases",
        label: "Закупки и поставщики",
        rows: [
          { dt: "po_id",            external: "Document_ЗаказПоставщику.Ref_Key",    transform: "Direct", status: "ok"  },
          { dt: "po_number",        external: "Document_ЗаказПоставщику.Номер",      transform: "Direct", status: "ok"  },
          { dt: "supplier",         external: "Catalog_Контрагенты.Наименование",    transform: "Direct", status: "ok"  },
          { dt: "material_code",    external: "Catalog_Номенклатура.Код",            transform: "Direct", status: "ok"  },
          { dt: "quantity",         external: "Document_ЗаказПоставщику.Количество", transform: "Direct", status: "ok"  },
          { dt: "unit_price",       external: "Document_ЗаказПоставщику.Цена",       transform: "Direct", status: "ok"  },
          { dt: "delivery_date",    external: "Document_ЗаказПоставщику.ДатаПоставки",transform: "Date",  status: "ok"  },
          { dt: "status",           external: "Document_ЗаказПоставщику.Статус",     transform: "Map",    status: "warn"},
        ],
      },
      {
        id: "materials",
        label: "Учёт материалов и склад",
        rows: [
          { dt: "material_id",      external: "Catalog_Номенклатура.Ref_Key",        transform: "Direct", status: "ok"  },
          { dt: "material_code",    external: "Catalog_Номенклатура.Код",            transform: "Direct", status: "ok"  },
          { dt: "material_name",    external: "Catalog_Номенклатура.Наименование",   transform: "Direct", status: "ok"  },
          { dt: "unit",             external: "Catalog_ЕдиницыИзмерения.Код",        transform: "Map",    status: "ok"  },
          { dt: "stock_qty",        external: "AccumulationRegister_ОстаткиТМЦ.Количество", transform: "Direct", status: "ok"  },
          { dt: "warehouse",        external: "Catalog_Склады.Наименование",         transform: "Direct", status: "ok"  },
          { dt: "valuation_price",  external: "AccumulationRegister_ОстаткиТМЦ.Сумма",transform: "Direct", status: "warn"},
        ],
      },
      {
        id: "contracts",
        label: "Договоры и взаиморасчёты",
        rows: [
          { dt: "contract_id",      external: "Catalog_Договоры.Ref_Key",            transform: "Direct", status: "ok"  },
          { dt: "contract_no",      external: "Catalog_Договоры.Номер",              transform: "Direct", status: "ok"  },
          { dt: "contractor",       external: "Catalog_Контрагенты.Наименование",    transform: "Direct", status: "ok"  },
          { dt: "signed_date",      external: "Catalog_Договоры.ДатаДоговора",       transform: "Date",   status: "ok"  },
          { dt: "amount",           external: "Catalog_Договоры.СуммаДоговора",      transform: "Direct", status: "ok"  },
          { dt: "currency",         external: "Catalog_Валюты.Код",                  transform: "Map",    status: "ok"  },
          { dt: "balance",          external: "AccumulationRegister_Взаиморасчёты.Сумма",transform: "Direct",status: "warn"},
        ],
      },
    ],
  },
  {
    key: "upp1c",
    title: "1С:УПП",
    status: "paused",
    subtitle: "Архивная база 2020-2024 | Sync paused",
    connectionFields: [
      { id: "server", label: "Сервер 1С", defaultValue: "1c-legacy.kto.local" },
      { id: "infobase", label: "Информационная база", defaultValue: "UPP_ARCHIVE" },
      { id: "transport", label: "Транспорт", type: "select", options: ["COM-коннектор", "OData", "Внешняя обработка"] },
      { id: "user", label: "Username", defaultValue: "dtwin_legacy" },
      { id: "password", label: "Password", type: "password", defaultValue: "••••••••" },
      { id: "platform", label: "Платформа", defaultValue: "8.3.18" },
    ],
    moduleItems: ["Производственные заявки", "Зарплата подрядчиков", "Регламентированный учёт (исторический)", "Перенос остатков в 1С:ERP"],
    mappingEntities: [
      {
        id: "production_orders",
        label: "Производственные заявки",
        rows: [
          { dt: "production_order_id", external: "Document_ЗаказНаПроизводство.Ref_Key",   transform: "Direct", status: "ok"  },
          { dt: "po_number",           external: "Document_ЗаказНаПроизводство.Номер",     transform: "Direct", status: "ok"  },
          { dt: "product_code",        external: "Catalog_Номенклатура.Код",                transform: "Direct", status: "ok"  },
          { dt: "quantity",            external: "Document_ЗаказНаПроизводство.Количество", transform: "Direct", status: "ok"  },
          { dt: "planned_start",       external: "Document_ЗаказНаПроизводство.ДатаНачала", transform: "Date",   status: "ok"  },
          { dt: "planned_finish",      external: "Document_ЗаказНаПроизводство.ДатаОкончания",transform: "Date", status: "ok"  },
          { dt: "department",          external: "Catalog_Подразделения.Код",               transform: "Direct", status: "ok"  },
          { dt: "status",              external: "Document_ЗаказНаПроизводство.Статус",     transform: "Map",    status: "warn"},
        ],
      },
      {
        id: "payroll",
        label: "Зарплата подрядчиков",
        rows: [
          { dt: "payroll_id",          external: "Document_НачислениеЗП.Ref_Key",           transform: "Direct", status: "ok"  },
          { dt: "employee",            external: "Catalog_Сотрудники.ФИО",                  transform: "Direct", status: "ok"  },
          { dt: "period",              external: "Document_НачислениеЗП.ПериодРегистрации", transform: "Date",   status: "ok"  },
          { dt: "hours",               external: "Document_НачислениеЗП.ОтработаноЧасов",   transform: "Direct", status: "ok"  },
          { dt: "amount",              external: "Document_НачислениеЗП.СуммаНачисления",   transform: "Direct", status: "ok"  },
          { dt: "subcontractor",       external: "Catalog_Подразделения.Наименование",      transform: "Direct", status: "warn"},
        ],
      },
      {
        id: "balances",
        label: "Перенос остатков в 1С:ERP",
        rows: [
          { dt: "account_dt",          external: "AccumulationRegister_Остатки.СчётДт",     transform: "Direct", status: "ok"  },
          { dt: "account_ct",          external: "AccumulationRegister_Остатки.СчётКт",     transform: "Direct", status: "ok"  },
          { dt: "amount",              external: "AccumulationRegister_Остатки.Сумма",      transform: "Direct", status: "ok"  },
          { dt: "currency",            external: "Catalog_Валюты.Код",                       transform: "Map",    status: "ok"  },
          { dt: "transfer_date",       external: "Document_ПереносОстатков.Дата",            transform: "Date",   status: "warn"},
        ],
      },
    ],
  },
  {
    key: "buh1c",
    title: "1С:Бухгалтерия",
    status: "active",
    subtitle: "Last sync: 03 Jun 2026, 07:30 | OData",
    connectionFields: [
      { id: "server", label: "Сервер 1С", defaultValue: "1c-cluster.kto.local" },
      { id: "infobase", label: "Информационная база", defaultValue: "BUH_KZ" },
      { id: "transport", label: "Транспорт", type: "select", options: ["OData", "HTTP-сервис"] },
      { id: "user", label: "Username", defaultValue: "dtwin_buh" },
      { id: "password", label: "Password", type: "password", defaultValue: "••••••••" },
      { id: "edition", label: "Редакция", type: "select", options: ["Бухгалтерия 8 для Казахстана 3.0", "КОРП 3.0"] },
    ],
    moduleItems: ["Журнал проводок", "Контрагенты и договоры", "НДС / акты / счета-фактуры", "Кассовые операции"],
    mappingEntities: [
      {
        id: "postings",
        label: "Журнал проводок",
        rows: [
          { dt: "posting_id",       external: "AccountingRegister_Хозрасчётный.Регистратор", transform: "Direct", status: "ok"  },
          { dt: "dt_account",       external: "AccountingRegister_Хозрасчётный.СчётДт.Код",  transform: "Direct", status: "ok"  },
          { dt: "ct_account",       external: "AccountingRegister_Хозрасчётный.СчётКт.Код",  transform: "Direct", status: "ok"  },
          { dt: "amount",           external: "AccountingRegister_Хозрасчётный.Сумма",       transform: "Direct", status: "ok"  },
          { dt: "currency",         external: "Catalog_Валюты.Код",                          transform: "Map",    status: "ok"  },
          { dt: "posting_date",     external: "AccountingRegister_Хозрасчётный.Период",      transform: "Date",   status: "ok"  },
          { dt: "counterparty",     external: "Catalog_Контрагенты.Наименование",            transform: "Direct", status: "ok"  },
          { dt: "basis_doc",        external: "AccountingRegister_Хозрасчётный.ДокументОснование",transform: "Custom",status: "warn"},
        ],
      },
      {
        id: "counterparties",
        label: "Контрагенты и договоры",
        rows: [
          { dt: "counterparty_id",  external: "Catalog_Контрагенты.Ref_Key",                 transform: "Direct", status: "ok"  },
          { dt: "inn_bin",          external: "Catalog_Контрагенты.ИНН_БИН",                 transform: "Direct", status: "ok"  },
          { dt: "full_name",        external: "Catalog_Контрагенты.НаименованиеПолное",      transform: "Direct", status: "ok"  },
          { dt: "type",             external: "Catalog_Контрагенты.ЮрФизЛицо",               transform: "Map",    status: "ok"  },
          { dt: "contract_no",      external: "Catalog_ДоговорыКонтрагентов.Номер",          transform: "Direct", status: "ok"  },
          { dt: "kpp",              external: "Catalog_Контрагенты.КПП",                     transform: "Direct", status: "warn"},
        ],
      },
      {
        id: "vat_acts",
        label: "НДС / акты / счета-фактуры",
        rows: [
          { dt: "act_id",           external: "Document_АктВыполненныхРабот.Ref_Key",        transform: "Direct", status: "ok"  },
          { dt: "act_no",           external: "Document_АктВыполненныхРабот.Номер",          transform: "Direct", status: "ok"  },
          { dt: "act_date",         external: "Document_АктВыполненныхРабот.Дата",           transform: "Date",   status: "ok"  },
          { dt: "amount_net",       external: "Document_АктВыполненныхРабот.СуммаБезНДС",    transform: "Direct", status: "ok"  },
          { dt: "vat_amount",       external: "Document_АктВыполненныхРабот.СуммаНДС",       transform: "Direct", status: "ok"  },
          { dt: "amount_gross",     external: "Document_АктВыполненныхРабот.СуммаДокумента", transform: "Direct", status: "ok"  },
          { dt: "counterparty",     external: "Catalog_Контрагенты.Наименование",            transform: "Direct", status: "ok"  },
        ],
      },
      {
        id: "cash_ops",
        label: "Кассовые операции",
        rows: [
          { dt: "cash_doc_id",      external: "Document_РасходныйКассовыйОрдер.Ref_Key",     transform: "Direct", status: "ok"  },
          { dt: "doc_no",           external: "Document_РасходныйКассовыйОрдер.Номер",       transform: "Direct", status: "ok"  },
          { dt: "doc_date",         external: "Document_РасходныйКассовыйОрдер.Дата",        transform: "Date",   status: "ok"  },
          { dt: "amount",           external: "Document_РасходныйКассовыйОрдер.Сумма",       transform: "Direct", status: "ok"  },
          { dt: "cash_register",    external: "Catalog_Кассы.Наименование",                  transform: "Direct", status: "warn"},
        ],
      },
    ],
  },
  {
    key: "sap_ps",
    title: "SAP PS (Project System)",
    status: "draft",
    subtitle: "Готовится к подключению | EPC-периметр",
    connectionFields: [
      { id: "host", label: "Host", defaultValue: "sap-ps.kto.local" },
      { id: "systemNumber", label: "System Number", defaultValue: "00" },
      { id: "client", label: "Client", defaultValue: "200" },
      { id: "user", label: "Username", defaultValue: "DTWIN_PS" },
      { id: "password", label: "Password", type: "password", defaultValue: "••••••••" },
      { id: "language", label: "Язык", type: "select", options: ["RU", "EN"] },
    ],
    moduleItems: ["WBS-элементы проекта", "Сетевые графики", "Бюджет / факт проекта", "Закупочные потребности (MM)"],
    mappingEntities: [
      {
        id: "wbs",
        label: "WBS-элементы (PROJ / PRPS)",
        rows: [
          { dt: "project_id",       external: "PROJ.PSPID",                transform: "Direct", status: "ok"  },
          { dt: "wbs_id",           external: "PRPS.POSID",                transform: "Direct", status: "ok"  },
          { dt: "wbs_name",         external: "PRPS.POST1",                transform: "Direct", status: "ok"  },
          { dt: "parent_wbs",       external: "PRPS.PSPHI",                transform: "Direct", status: "ok"  },
          { dt: "cost_center",      external: "PRPS.PRART",                transform: "Direct", status: "ok"  },
          { dt: "responsible_cc",   external: "PRPS.VERNR",                transform: "Custom", status: "warn"},
          { dt: "planned_start",    external: "PRPS.PLFAZ",                transform: "Date",   status: "ok"  },
          { dt: "planned_finish",   external: "PRPS.PLSEZ",                transform: "Date",   status: "ok"  },
          { dt: "status",           external: "JEST.STAT",                 transform: "Map",    status: "warn"},
        ],
      },
      {
        id: "networks",
        label: "Сетевые графики (AFKO / AFVC)",
        rows: [
          { dt: "network_id",       external: "AFKO.AUFNR",                transform: "Direct", status: "ok"  },
          { dt: "activity_id",      external: "AFVC.VORNR",                transform: "Direct", status: "ok"  },
          { dt: "description",      external: "AFVC.LTXA1",                transform: "Direct", status: "ok"  },
          { dt: "early_start",      external: "AFVV.FSAVD",                transform: "Date",   status: "ok"  },
          { dt: "early_finish",     external: "AFVV.FSEDD",                transform: "Date",   status: "ok"  },
          { dt: "duration_h",       external: "AFVC.DAUNO",                transform: "Custom", status: "ok"  },
          { dt: "work_center",      external: "AFVC.ARBID",                transform: "Direct", status: "warn"},
        ],
      },
      {
        id: "budget",
        label: "Бюджет / факт (BPGE / COSP)",
        rows: [
          { dt: "wbs_id",           external: "BPGE.POSNR",                transform: "Direct", status: "ok"  },
          { dt: "fiscal_year",      external: "BPGE.GJAHR",                transform: "Direct", status: "ok"  },
          { dt: "planned_cost",     external: "BPGE.WTGES",                transform: "Direct", status: "ok"  },
          { dt: "actual_cost",      external: "COSP.WOG001",               transform: "Direct", status: "ok"  },
          { dt: "commitment",       external: "COOI.WKGBTR",               transform: "Direct", status: "ok"  },
          { dt: "currency",         external: "BPGE.WAERS",                transform: "Map",    status: "ok"  },
        ],
      },
      {
        id: "mm_demand",
        label: "Закупочные потребности (MM)",
        rows: [
          { dt: "pr_id",            external: "EBAN.BANFN",                transform: "Direct", status: "ok"  },
          { dt: "material",         external: "EBAN.MATNR",                transform: "Direct", status: "ok"  },
          { dt: "qty",              external: "EBAN.MENGE",                transform: "Direct", status: "ok"  },
          { dt: "unit",             external: "EBAN.MEINS",                transform: "Map",    status: "ok"  },
          { dt: "delivery_date",    external: "EBAN.LFDAT",                transform: "Date",   status: "ok"  },
          { dt: "wbs_id",           external: "EBAN.PS_PSP_PNR",           transform: "Direct", status: "warn"},
        ],
      },
    ],
  },
  {
    key: "tekla",
    title: "Trimble Tekla Structures",
    status: "active",
    subtitle: "Last sync: 02 Jun 2026 | 2 модели (Karkas-1, Karkas-2)",
    connectionFields: [
      { id: "exportPath", label: "Папка IFC-экспорта", defaultValue: "\\\\file-srv\\tekla\\ifc" },
      { id: "ifcVersion", label: "Версия IFC", type: "select", options: ["IFC 4.0", "IFC 2x3"] },
      { id: "ncPath", label: "Папка NC-файлов", defaultValue: "\\\\file-srv\\tekla\\nc" },
      { id: "drawingPath", label: "Папка чертежей", defaultValue: "\\\\file-srv\\tekla\\dwg" },
    ],
    moduleItems: ["IFC-экспорт металлоконструкций", "Спецификации металла (NC)", "Чертежи (DWG / PDF)", "Версионность моделей"],
    mappingEntities: [
      {
        id: "parts",
        label: "Сборки металла (Parts / Assemblies)",
        rows: [
          { dt: "part_id",          external: "Part.GUID",                 transform: "Direct", status: "ok"  },
          { dt: "part_mark",        external: "Part.Mark",                 transform: "Direct", status: "ok"  },
          { dt: "assembly_mark",    external: "Assembly.Mark",             transform: "Direct", status: "ok"  },
          { dt: "profile",          external: "Part.Profile",              transform: "Direct", status: "ok"  },
          { dt: "material",         external: "Part.Material",             transform: "Direct", status: "ok"  },
          { dt: "weight_kg",        external: "Part.Weight",               transform: "Direct", status: "ok"  },
          { dt: "length_mm",        external: "Part.Length",               transform: "Direct", status: "ok"  },
          { dt: "finish",           external: "Part.Finish",               transform: "Map",    status: "warn"},
        ],
      },
      {
        id: "ifc",
        label: "IFC-элементы",
        rows: [
          { dt: "ifc_id",           external: "IfcElement.GlobalId",       transform: "Direct", status: "ok"  },
          { dt: "ifc_type",         external: "IfcElement.Class",          transform: "Map",    status: "ok"  },
          { dt: "tekla_guid",       external: "IfcElement.Tag",            transform: "Direct", status: "ok"  },
          { dt: "name",             external: "IfcElement.Name",           transform: "Direct", status: "ok"  },
          { dt: "level",            external: "IfcElement.ContainedInStructure.Name", transform: "Direct", status: "warn"},
        ],
      },
      {
        id: "drawings",
        label: "Чертежи (DWG / PDF)",
        rows: [
          { dt: "drawing_id",       external: "Drawing.UID",               transform: "Direct", status: "ok"  },
          { dt: "drawing_no",       external: "Drawing.Number",            transform: "Direct", status: "ok"  },
          { dt: "title",            external: "Drawing.Title",             transform: "Direct", status: "ok"  },
          { dt: "revision",         external: "Drawing.Revision",          transform: "Direct", status: "ok"  },
          { dt: "issued_at",        external: "Drawing.IssueDate",         transform: "Date",   status: "warn"},
          { dt: "drawn_by",         external: "Drawing.DrawnBy",           transform: "Direct", status: "ok"  },
        ],
      },
    ],
  },
  {
    key: "cde",
    title: "СОД / CDE (общая среда данных)",
    status: "warning",
    subtitle: "Last sync: 03 Jun 2026 | 3 документа на ревью > 5 дней",
    connectionFields: [
      { id: "provider", label: "Провайдер CDE", type: "select", options: ["Autodesk ACC", "Aconex", "Asite", "Trimble Connect", "Собственный"] },
      { id: "url", label: "URL", defaultValue: "https://cde.kto.kz" },
      { id: "apiKey", label: "API Key", type: "password", defaultValue: "••••••••" },
      { id: "project", label: "Проект / каталог", defaultValue: "Highvill-Almaty" },
      { id: "approvalSla", label: "SLA согласования (дней)", defaultValue: "3" },
    ],
    moduleItems: ["Документооборот (RFI / NCR)", "Реестр документов и версий", "Маршруты согласования", "Уведомления и SLA"],
    mappingEntities: [
      {
        id: "documents",
        label: "Документы и версии",
        rows: [
          { dt: "document_id",      external: "doc.id",                    transform: "Direct", status: "ok"  },
          { dt: "file_name",        external: "doc.fileName",              transform: "Direct", status: "ok"  },
          { dt: "folder",           external: "doc.folder.path",           transform: "Direct", status: "ok"  },
          { dt: "revision",         external: "doc.revision",              transform: "Direct", status: "ok"  },
          { dt: "status",           external: "doc.workflowState",         transform: "Map",    status: "ok"  },
          { dt: "author",           external: "doc.uploadedBy.email",      transform: "Direct", status: "ok"  },
          { dt: "approved_at",      external: "doc.approvedAt",            transform: "Date",   status: "warn"},
          { dt: "approver",         external: "doc.approver.email",        transform: "Direct", status: "ok"  },
        ],
      },
      {
        id: "rfi_ncr",
        label: "RFI / NCR (запросы и несоответствия)",
        rows: [
          { dt: "rfi_id",           external: "rfi.id",                    transform: "Direct", status: "ok"  },
          { dt: "subject",          external: "rfi.subject",               transform: "Direct", status: "ok"  },
          { dt: "type",             external: "rfi.type",                  transform: "Map",    status: "ok"  },
          { dt: "status",           external: "rfi.status",                transform: "Map",    status: "ok"  },
          { dt: "severity",         external: "rfi.severity",              transform: "Map",    status: "ok"  },
          { dt: "raised_by",        external: "rfi.raisedBy.email",        transform: "Direct", status: "ok"  },
          { dt: "due_date",         external: "rfi.dueDate",               transform: "Date",   status: "warn"},
          { dt: "linked_doc",       external: "rfi.linkedDocId",           transform: "Direct", status: "ok"  },
        ],
      },
      {
        id: "approvals",
        label: "Маршруты согласования",
        rows: [
          { dt: "approval_id",      external: "approval.id",               transform: "Direct", status: "ok"  },
          { dt: "document_id",      external: "approval.docId",            transform: "Direct", status: "ok"  },
          { dt: "stage",            external: "approval.stage",            transform: "Map",    status: "ok"  },
          { dt: "reviewer",         external: "approval.reviewer.email",   transform: "Direct", status: "ok"  },
          { dt: "decision",         external: "approval.decision",         transform: "Map",    status: "ok"  },
          { dt: "decision_date",    external: "approval.decisionDate",     transform: "Date",   status: "warn"},
          { dt: "sla_days",         external: "approval.slaDays",          transform: "Direct", status: "ok"  },
        ],
      },
    ],
  },
];

const oilKeys = new Set(["sap", "scada", "market", "excel"]);

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
  const { t, language } = useLanguage();
  const { profile } = useCompanyProfile();
  const externalFieldLabel = language === "ru" ? "Внешнее поле" : "External field";

  const integrations = useMemo<IntegrationCard[]>(
    () => (profile?.industry === "construction" ? constructionIntegrations : oilIntegrations),
    [profile?.industry],
  );

  const [active, setActive] = useState<string>(integrations[0]?.key ?? "");
  const [sapModule, setSapModule] = useState<SapModuleKey>("PP");
  const [moduleExpanded, setModuleExpanded] = useState<Record<string, boolean>>({});

  // При смене отрасли фиксируем активную интеграцию на первой из нового набора
  useEffect(() => {
    if (!integrations.find((item) => item.key === active)) {
      setActive(integrations[0]?.key ?? "");
    }
  }, [integrations, active]);

  const activeIntegration = useMemo(() => integrations.find((item) => item.key === active), [active, integrations]);
  const isOilSpecific = oilKeys.has(active);

  // Entity внутри интеграции (для динамического маппинга по сущностям системы)
  const [mappingEntityId, setMappingEntityId] = useState<string | null>(null);
  useEffect(() => {
    const list = activeIntegration?.mappingEntities;
    if (list && list.length > 0) {
      const stillThere = list.find((e) => e.id === mappingEntityId);
      if (!stillThere) setMappingEntityId(list[0].id);
    } else {
      setMappingEntityId(null);
    }
  }, [activeIntegration, mappingEntityId]);

  const activeMappingEntity = useMemo(
    () => activeIntegration?.mappingEntities?.find((e) => e.id === mappingEntityId) ?? null,
    [activeIntegration, mappingEntityId],
  );

  const mappingRows: [string, string, string, "ok" | "warn"][] = useMemo(() => {
    // Приоритет: явные mappingEntities интеграции
    if (activeMappingEntity) {
      return activeMappingEntity.rows.map((r) => [r.dt, r.external, r.transform, r.status]);
    }
    // SAP — таблицы по SAP-модулю
    if (active === "sap") {
      return sapMappingRows[sapModule] ?? defaultMappingRows;
    }
    // Прочие oil-интеграции
    return defaultMappingRows;
  }, [activeMappingEntity, active, sapModule]);

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
                onClick={() => setActive(item.key)}
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
                    {!isOilSpecific && activeIntegration?.connectionFields && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {activeIntegration.connectionFields.map((field) => (
                          <div className="space-y-1" key={field.id}>
                            <label className="text-xs text-muted-foreground">{field.label}</label>
                            {field.type === "select" ? (
                              <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
                                {(field.options ?? []).map((opt) => (
                                  <option key={opt}>{opt}</option>
                                ))}
                              </select>
                            ) : (
                              <Input
                                type={field.type === "password" ? "password" : "text"}
                                defaultValue={field.defaultValue}
                              />
                            )}
                          </div>
                        ))}
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
                    <CardTitle className="text-base">
                      {active === "sap" ? t("modulesConfig") : (activeIntegration?.title ?? t("modulesConfig"))}
                    </CardTitle>
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
                    {!isOilSpecific && activeIntegration?.moduleItems && (
                      <div className="rounded-lg border border-border p-3 space-y-2">
                        <label className="flex items-center gap-2 text-sm font-medium">
                          <Checkbox defaultChecked />
                          {activeIntegration.title}
                        </label>
                        <ul className="text-xs text-muted-foreground list-disc pl-5">
                          {activeIntegration.moduleItems.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
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
                      {activeIntegration?.mappingEntities ? (
                        <select
                          className="h-9 rounded-md border border-input bg-background px-2 text-sm min-w-[260px]"
                          value={mappingEntityId ?? ""}
                          onChange={(e) => setMappingEntityId(e.target.value)}
                        >
                          {activeIntegration.mappingEntities.map((ent) => (
                            <option key={ent.id} value={ent.id}>
                              {ent.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <select className="h-9 rounded-md border border-input bg-background px-2 text-sm">
                          <option>{t("mappingEntityProduction")}</option>
                          <option>{t("mappingEntitySales")}</option>
                          <option>{t("mappingEntityFinance")}</option>
                        </select>
                      )}
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
                      {activeMappingEntity && (
                        <span className="ml-auto text-xs text-muted-foreground self-center">
                          Полей: <b className="text-foreground">{activeMappingEntity.rows.length}</b> ·
                          предупреждений: <b className="text-foreground">{activeMappingEntity.rows.filter((r) => r.status === "warn").length}</b>
                        </span>
                      )}
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border text-muted-foreground">
                            <th className="text-left py-2 px-2">{t("dtField")}</th>
                            <th className="text-left py-2 px-2">{active === "sap" ? t("sapField") : externalFieldLabel}</th>
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
