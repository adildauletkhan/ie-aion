/**
 * Production Program – АО «Эмбамунайгаз» 2026-2030
 * 12 sections matching the Excel template.
 * All cells are editable; data persists to localStorage.
 * "Export Excel" generates a multi-year workbook.
 */
import { useState, useCallback, useEffect, useRef } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useWorkspace } from "@/context/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Save, Download, ChevronRight, AlertCircle, CheckCircle2, Plus, Trash2, FileText,
  GitBranch, Send, CheckCheck, XCircle, Clock, MessageSquare, RotateCcw, ChevronDown, User, Printer, ShieldCheck,
} from "lucide-react";
import { PlanValidationModal } from "@/components/PlanValidationModal";
import ExcelJS from "exceljs";
import {
  PLANS_LIST_KEY,
  PLAN_DATA_PREFIX,
  loadPlansList,
  savePlansList,
  savePlanData,
  deletePlan,
  createPlan,
  loadApproval,
  saveApproval,
  createDefaultApproval,
  type ProdPlanMeta,
  type ApprovalWorkflow,
  type ApprovalStep,
  type WorkflowStatus,
} from "@/lib/prodPlanStore";

/* ─── Types ─────────────────────────────────────────────── */
type YearKey = "2026" | "2027" | "2028" | "2029" | "2030";
const YEARS: YearKey[] = ["2026", "2027", "2028", "2029", "2030"];

interface CellData { vol: string; price: string; sum: string }
type RowData = Record<YearKey, CellData>;

interface PlanRow {
  id: string;
  num: string;
  nameRu: string;
  nameEn: string;
  unit: string;
  isSection?: boolean;
  isSubHeader?: boolean;
  isTotal?: boolean;
  dept?: string;
  data: RowData;
}

interface Section {
  id: number;
  titleRu: string;
  titleEn: string;
  color: string;
  icon: string;
  rows: PlanRow[];
}

/* ─── Helpers ─────────────────────────────────────────────── */
function emptyCell(): CellData { return { vol: "", price: "", sum: "" }; }
function emptyRow(years = YEARS): RowData {
  return Object.fromEntries(years.map(y => [y, emptyCell()])) as RowData;
}
function makeRow(
  id: string, num: string, nameRu: string, nameEn: string, unit: string,
  vals: Partial<Record<YearKey, Partial<CellData>>> = {},
  opts: { isSection?: boolean; isSubHeader?: boolean; isTotal?: boolean; dept?: string } = {}
): PlanRow {
  const data = emptyRow();
  for (const [y, v] of Object.entries(vals) as [YearKey, Partial<CellData>][]) {
    data[y] = { ...emptyCell(), ...v };
  }
  return { id, num, nameRu, nameEn, unit, data, ...opts };
}
function totalRow(id: string, nameRu: string, nameEn: string): PlanRow {
  return makeRow(id, "", nameRu, nameEn, "", {}, { isTotal: true });
}

/* ─── Sections data ───────────────────────────────────────── */
const SECTIONS: Section[] = [
  {
    id: 1, icon: "🔍",
    color: "text-amber-600 bg-amber-500/10 border-amber-500/30",
    titleRu: "Раздел 1. Объёмы и направления геологоразведочных работ по восполнению запасов нефти и газа",
    titleEn: "Section 1. Scope and Directions of Geological Exploration for Oil & Gas Reserve Replenishment",
    rows: [
      makeRow("1-1","1.1","Сейсмические исследования 2Д","2D Seismic Survey","п.км.",
        { "2026":{vol:"",price:"",sum:""}, "2027":{vol:"",price:"",sum:""} }),
      makeRow("1-2","1.2","Сейсмические исследования 3Д","3D Seismic Survey","кв.км.",
        { "2026":{vol:"58",price:"5093",sum:"295391"} }),
      makeRow("1-3","1.3","Обработка и интерпретация данных 2Д/3Д","Processing & Interpretation 2D/3D","п.км./кв.км."),
      makeRow("1-4","1.4","Научно-исследовательские работы","Scientific Research Works","отчет",
        { "2026":{vol:"7",price:"31443",sum:"220100"}, "2027":{vol:"6",price:"20306",sum:"121836"},
          "2028":{vol:"2",price:"3250",sum:"6500"}, "2029":{vol:"3",price:"20397",sum:"61192"},
          "2030":{vol:"3",price:"20397",sum:"61192"} }),
      makeRow("1-5","1.5","Сейсморазведка (ранее законсервированные объекты)","Seismic survey (suspended objects)","кв.км.",
        { "2026":{vol:"58",price:"5093",sum:"295391"} }),
      makeRow("1-6","1.6","Ремонт скважин (расконсервация и испытание)","Well Repair (re-activation & testing)","скв.",
        { "2026":{vol:"5",price:"70000",sum:"350000"}, "2027":{vol:"5",price:"70000",sum:"350000"},
          "2028":{vol:"5",price:"70000",sum:"350000"}, "2029":{vol:"5",price:"70000",sum:"350000"},
          "2030":{vol:"5",price:"70000",sum:"350000"} }),
      makeRow("1-7","2.1","Бурение разведочных скважин","Exploration Well Drilling","скв/м",
        { "2026":{vol:"1",price:"773450",sum:"773450"}, "2027":{vol:"1",price:"",sum:"501682"} }),
      makeRow("1-8","2.5","ГИС, ГТИ, ГДИС, ГРП, ВСП","GIS, GTI, GDIS, HF, VSP","скв.",
        { "2026":{vol:"1",price:"213749",sum:"213749"} }),
      makeRow("1-9","2.6","Испытания скважин","Well Testing","тыс.тг",
        { "2026":{vol:"5",price:"57504",sum:"287520"} }),
      totalRow("1-T","ИТОГО ПО РАЗДЕЛУ 1","TOTAL SECTION 1"),
    ],
  },
  {
    id: 2, icon: "🛢️",
    color: "text-blue-600 bg-blue-500/10 border-blue-500/30",
    titleRu: "Раздел 2. Объёмы добычи нефти и газа",
    titleEn: "Section 2. Oil and Gas Production Volumes",
    rows: [
      makeRow("2-1","1","Добыча нефти","Oil Production","тыс.тонн",
        { "2026":{vol:"2870",price:"",sum:""}, "2027":{vol:"2910",price:"",sum:""},
          "2028":{vol:"2905",price:"",sum:""}, "2029":{vol:"2885",price:"",sum:""},
          "2030":{vol:"2850",price:"",sum:""} }),
      makeRow("2-2","2","Сдача нефти","Oil Delivery","тыс.тонн",
        { "2026":{vol:"2842",price:"",sum:""}, "2027":{vol:"2929",price:"",sum:""},
          "2028":{vol:"2924",price:"",sum:""}, "2029":{vol:"2904",price:"",sum:""},
          "2030":{vol:"2869",price:"",sum:""} }),
      makeRow("2-3","3","Добыча попутно-нефтяного газа","Associated Gas Production","млн.м³",
        { "2026":{vol:"451.5",price:"",sum:""}, "2027":{vol:"962.3",price:"",sum:""},
          "2028":{vol:"961.8",price:"",sum:""}, "2029":{vol:"966.6",price:"",sum:""},
          "2030":{vol:"963.5",price:"",sum:""} }),
      makeRow("2-4","4","Добыча свободного газа","Free Gas Production","млн.м³"),
      totalRow("2-T","ИТОГО ПО РАЗДЕЛУ 2","TOTAL SECTION 2"),
    ],
  },
  {
    id: 3, icon: "⛏️",
    color: "text-orange-600 bg-orange-500/10 border-orange-500/30",
    titleRu: "Раздел 3. Объёмы эксплуатационного бурения",
    titleEn: "Section 3. Development Drilling Volumes",
    rows: [
      makeRow("3-1","1","Бурение вертикальных скважин","Vertical Well Drilling","скв.",
        { "2026":{vol:"5",price:"462491",sum:"2312453"}, "2027":{vol:"8",price:"457291",sum:"3658324"},
          "2028":{vol:"7",price:"531136",sum:"3717954"}, "2029":{vol:"3",price:"338212",sum:"1014635"},
          "2030":{vol:"5",price:"471812",sum:"2359059"} }),
      makeRow("3-1m","","  в том числе метраж","  incl. metrage","м",
        { "2026":{vol:"5870",price:"",sum:""}, "2027":{vol:"9650",price:"",sum:""},
          "2028":{vol:"9600",price:"",sum:""}, "2029":{vol:"2500",price:"",sum:""},
          "2030":{vol:"6200",price:"",sum:""} }),
      makeRow("3-2","2","Бурение горизонтальных скважин","Horizontal Well Drilling","скв.",
        { "2026":{vol:"15",price:"956837",sum:"14352553"}, "2027":{vol:"14",price:"908193",sum:"12714701"},
          "2028":{vol:"10",price:"1314284",sum:"13142844"}, "2029":{vol:"8",price:"1442038",sum:"11536302"},
          "2030":{vol:"6",price:"1734272",sum:"10405634"} }),
      makeRow("3-2m","","  в том числе метраж","  incl. metrage","м",
        { "2026":{vol:"21377",price:"",sum:""}, "2027":{vol:"20960",price:"",sum:""},
          "2028":{vol:"22200",price:"",sum:""}, "2029":{vol:"8860",price:"",sum:""},
          "2030":{vol:"7640",price:"",sum:""} }),
      makeRow("3-3","3","Бурение наклонно-направленных скважин","Directional Well Drilling","скв."),
      makeRow("3-4","4","Проектно-изыскательские работы","Design & Survey Works","скв.",
        { "2026":{vol:"23",price:"8000",sum:"184000"}, "2027":{vol:"",price:"8000",sum:""},
          "2028":{vol:"",price:"",sum:""} }),
      makeRow("3-5","5","Супервайзерство при строительстве скважин","Drilling Supervision","тыс.тг",
        { "2026":{vol:"20",price:"3989",sum:"79786"}, "2027":{vol:"22",price:"8206",sum:"180528"},
          "2028":{vol:"17",price:"11301",sum:"192124"}, "2029":{vol:"11",price:"12342",sum:"135762"},
          "2030":{vol:"11",price:"9072",sum:"99788"} }),
      makeRow("3-6","6","Отбор керна","Core Sampling","м",
        { "2026":{vol:"",price:"",sum:""} }),
      makeRow("3-7","7","НИР по бурению","Drilling R&D","тыс.тг"),
      totalRow("3-T","ИТОГО ПО РАЗДЕЛУ 3","TOTAL SECTION 3"),
    ],
  },
  {
    id: 4, icon: "⚙️",
    color: "text-violet-600 bg-violet-500/10 border-violet-500/30",
    titleRu: "Раздел 4. Организационно-технические мероприятия по добыче нефти и газа",
    titleEn: "Section 4. Organizational & Technical Measures for Oil and Gas Production",
    rows: [
      makeRow("4-1","1","Эксплуатационный фонд нефтяных скважин","Oil Well Operating Fund","скв.",
        { "2026":{vol:"2172",price:"",sum:""}, "2027":{vol:"2178",price:"",sum:""},
          "2028":{vol:"2173",price:"",sum:""}, "2029":{vol:"2167",price:"",sum:""},
          "2030":{vol:"2147",price:"",sum:""} }),
      makeRow("4-2","2","Эксплуатационный фонд нагнетательных скважин","Injection Well Operating Fund","скв.",
        { "2026":{vol:"331",price:"",sum:""} }),
      makeRow("4-3","3","Ввод новых скважин","New Wells Commissioned","скв.",
        { "2026":{vol:"20",price:"",sum:""}, "2027":{vol:"22",price:"",sum:""},
          "2028":{vol:"17",price:"",sum:""}, "2029":{vol:"11",price:"",sum:""},
          "2030":{vol:"11",price:"",sum:""} }),
      makeRow("4-4","3.1","Добыча от ввода новых скважин","Production from New Wells","тыс.тонн",
        { "2026":{vol:"47.4",price:"",sum:""} }),
      makeRow("4-5","4","Углубление скважин","Well Deepening","скв.",
        { "2026":{vol:"3",price:"",sum:"505502"} }),
      makeRow("4-6","5","Закачка воды для ППД","Water Injection for RPM","тыс.м³",
        { "2026":{vol:"13384",price:"",sum:""}, "2027":{vol:"",price:"",sum:""},
          "2028":{vol:"",price:"",sum:""}, "2029":{vol:"",price:"",sum:""},
          "2030":{vol:"",price:"",sum:""} }),
      makeRow("4-7","6","Перевод скважин на ШГН","Well Conversion to SRP","скв.",
        { "2026":{vol:"9",price:"",sum:""} }),
      makeRow("4-8","7","Перевод скважин на ЭВН","Well Conversion to EVP","скв.",
        { "2026":{vol:"2",price:"",sum:""} }),
      makeRow("4-9","8","Капитальный ремонт скважин (КРС)","Major Well Workover (MWO)","скв.",
        { "2026":{vol:"159",price:"",sum:"7011190"}, "2027":{vol:"",price:"",sum:""},
          "2028":{vol:"",price:"",sum:""}, "2029":{vol:"",price:"",sum:""},
          "2030":{vol:"",price:"",sum:""} }),
      makeRow("4-10","9","Зарезка бокового горизонтального ствола (ЗБГС)","Sidetrack Horizontal Drilling","скв.",
        { "2026":{vol:"10",price:"",sum:"8771655"}, "2027":{vol:"",price:"",sum:""},
          "2028":{vol:"",price:"",sum:""}, "2029":{vol:"",price:"",sum:""},
          "2030":{vol:"",price:"",sum:""} }),
      makeRow("4-11","9.1","Дополнительная добыча за счёт ЗБГС","Incremental Production from Sidetrack","тыс.тонн",
        { "2026":{vol:"23.3",price:"",sum:""} }),
      makeRow("4-12","10","Подземный ремонт скважин (ПРС)","Well Intervention (PRS)","скв.",
        { "2026":{vol:"2371",price:"",sum:""} }),
      makeRow("4-13","11","МРП добывающих скважин","MTBF of Production Wells","сут.",
        { "2026":{vol:"410",price:"",sum:""} }),
      makeRow("4-14","12","Воздействие на ПЗС нефтяных скважин","Well Stimulation (Oil Wells)","скв.",
        { "2026":{vol:"265",price:"",sum:""} }),
      makeRow("4-15","13","Гидроразрыв пласта (ГРП)","Hydraulic Fracturing (HF)","скв/опер.",
        { "2026":{vol:"69",price:"",sum:"2001373"} }),
      makeRow("4-16","13.1","Дополнительная добыча за счёт ГРП","Incremental Production from HF","тыс.тонн",
        { "2026":{vol:"28.1",price:"",sum:""} }),
      makeRow("4-17","14","Воздействие на ПЗС нагнетательных скважин","Stimulation of Injection Wells","скв.",
        { "2026":{vol:"22",price:"",sum:""} }),
      makeRow("4-18","15","Ввод нефтяных скважин из консервации","Oil Wells from Conservation","скв.",
        { "2026":{vol:"16",price:"",sum:""} }),
      makeRow("4-19","16","Ввод нефтяных скважин из бездействия","Oil Wells from Idle","скв.",
        { "2026":{vol:"11",price:"",sum:""} }),
      makeRow("4-20","19","Переликвидация скважин","Well Re-abandonment","скв.",
        { "2026":{vol:"39",price:"",sum:"621475"} }),
      makeRow("4-21","20","Обслуживание и предоставление глубинных насосов","Downhole Pump Service","скв.сут.",
        { "2026":{vol:"761808",price:"",sum:"1838090"} }),
      makeRow("4-22","21","Потребность в волжской воде","Volga Water Requirement","м³",
        { "2026":{vol:"423495",price:"",sum:"1282689"} }),
      makeRow("4-23","22","Предоставление во временное пользование УЭЦН","ESP Rental","скв.сут.",
        { "2026":{vol:"16529",price:"",sum:"1570255"} }),
      makeRow("4-24","23","Обслуживание и предоставление винтовых насосных пар","PCP Pump Service","сутки",
        { "2026":{vol:"216797",price:"",sum:"1195202"} }),
      makeRow("4-25","24","Обслуживание нижнего привода ЭВН","EVP Bottom Drive Service","скв.сут.",
        { "2026":{vol:"3650",price:"",sum:"248200"} }),
      makeRow("4-26","29","Потребность в товарном газе","Commercial Gas Requirement","тыс.м³",
        { "2026":{vol:"22725",price:"",sum:"597121"} }),
      makeRow("4-27","30","Очистка РВС и ёмкостей","Tank Cleaning","м³",
        { "2026":{vol:"5022",price:"",sum:"379161"} }),
      makeRow("4-28","31","Услуги охраны","Security Services","тыс.тг",
        { "2026":{vol:"",price:"",sum:"2280681"} }),
      totalRow("4-T","ИТОГО ПО РАЗДЕЛУ 4","TOTAL SECTION 4"),
    ],
  },
  {
    id: 5, icon: "📊",
    color: "text-sky-600 bg-sky-500/10 border-sky-500/30",
    titleRu: "Раздел 5. Объёмы и виды исследований по контролю за разработкой месторождений и созданию геолого-технических моделей",
    titleEn: "Section 5. Scope & Types of Field Development Monitoring and Geological-Technical Modeling",
    rows: [
      makeRow("5-1","1","Промыслово-геофизические работы","Production Geophysical Works","скв.",
        { "2026":{vol:"336",price:"",sum:"438100"} }),
      makeRow("5-2","2","Геофизические исследования в горизонтальных скважинах","GIS in Horizontal Wells","скв.",
        { "2026":{vol:"",price:"",sum:""} }),
      totalRow("5-T","ИТОГО ПО РАЗДЕЛУ 5","TOTAL SECTION 5"),
    ],
  },
  {
    id: 6, icon: "🔧",
    color: "text-slate-600 bg-slate-500/10 border-slate-500/30",
    titleRu: "Раздел 6. Капитальный ремонт, техническое обслуживание и содержание основных средств",
    titleEn: "Section 6. Capital Repair, Maintenance and Upkeep of Fixed Assets",
    rows: [
      makeRow("6-0","","НГДУ Жайыкмунайгаз","NGDU Zhaikmunaigaz","тыс.тг",
        { "2026":{vol:"",price:"",sum:"670406"} }, { isSubHeader: true }),
      makeRow("6-1","1","Капремонт и содержание автодорог (НГДУ Жайык)","Road Maintenance (NGDU Zhaik)","тыс.тг",
        { "2026":{vol:"",price:"",sum:"120000"} }),
      makeRow("6-2","2","Капремонт зданий и сооружений (НГДУ Жайык)","Buildings & Structures Repair (NGDU Zhaik)","тыс.тг",
        { "2026":{vol:"",price:"",sum:"550406"} }),
      makeRow("6-3","","НГДУ Жылыоймунайгаз","NGDU Zhylyoimunaigaz","тыс.тг",
        { "2026":{vol:"",price:"",sum:"1469671"} }, { isSubHeader: true }),
      makeRow("6-4","1","Капремонт и содержание автодорог (НГДУ Жылыой)","Road Maintenance (NGDU Zhyloy)","тыс.тг",
        { "2026":{vol:"",price:"",sum:"573000"} }),
      makeRow("6-5","2","Капремонт зданий и сооружений (НГДУ Жылыой)","Buildings & Structures Repair (NGDU Zhyloy)","тыс.тг",
        { "2026":{vol:"",price:"",sum:"896671"} }),
      makeRow("6-6","","НГДУ Доссормунайгаз","NGDU Dossormunaigas","тыс.тг",
        { "2026":{vol:"",price:"",sum:"501000"} }, { isSubHeader: true }),
      makeRow("6-7","","НГДУ Кайнармунайгаз","NGDU Kaynarmunaigas","тыс.тг",
        { "2026":{vol:"",price:"",sum:"465955"} }, { isSubHeader: true }),
      makeRow("6-8","2","Капремонт нефтепромыслового оборудования","Oilfield Equipment Overhaul","тыс.тг",
        { "2026":{vol:"",price:"",sum:"1202963"} }),
      makeRow("6-9","3","Работы и услуги по обеспечению надёжности оборудования","Equipment Reliability Works","тыс.тг",
        { "2026":{vol:"16238",price:"",sum:"285389"} }),
      makeRow("6-10","4","Капремонт энергооборудования","Energy Equipment Overhaul","тыс.тг",
        { "2026":{vol:"",price:"",sum:"9165147"} }),
      makeRow("6-11","4.5","Потребление электроэнергии","Electricity Consumption","тыс.кВт.ч.",
        { "2026":{vol:"186574",price:"",sum:"7484680"} }),
      makeRow("6-12","5","Автотранспортные услуги","Transport Services","тыс.тг",
        { "2026":{vol:"",price:"",sum:"11972530"} }),
      makeRow("6-13","6","Обслуживание объектов подготовки газа","Gas Treatment Facility Maintenance","тыс.тг",
        { "2026":{vol:"",price:"",sum:"1146176"} }),
      makeRow("6-14","7","Работы по процессингу сырого газа","Gas Processing Works","тыс.тг",
        { "2026":{vol:"",price:"",sum:"1902372"} }),
      totalRow("6-T","ИТОГО ПО РАЗДЕЛУ 6","TOTAL SECTION 6"),
    ],
  },
  {
    id: 7, icon: "🏗️",
    color: "text-rose-600 bg-rose-500/10 border-rose-500/30",
    titleRu: "Раздел 7. Объёмы капитального строительства",
    titleEn: "Section 7. Capital Construction Volumes",
    rows: [
      makeRow("7-1","1","Капитальное строительство","Capital Construction","тыс.тг",
        { "2026":{vol:"172",price:"",sum:"21211132"}, "2027":{vol:"",price:"",sum:"20410678"},
          "2028":{vol:"",price:"",sum:"15208556"} }),
      makeRow("7-2","","  по капитальному строительству","  capital construction works","тыс.тг",
        { "2026":{vol:"172",price:"",sum:"14345200"} }),
      makeRow("7-3","","  по газовому проекту","  gas project","тыс.тг",
        { "2026":{vol:"",price:"",sum:"3546731"} }),
      makeRow("7-4","","  по направлению автоматизации","  automation direction","тыс.тг",
        { "2026":{vol:"",price:"",sum:"3319201"} }),
      makeRow("7-5","2","Модернизация","Modernization","тыс.тг",
        { "2026":{vol:"",price:"",sum:"0"} }),
      makeRow("7-6","3","Проектно-изыскательские работы","Design & Survey Works","тыс.тг",
        { "2026":{vol:"94",price:"",sum:"515211"} }),
      makeRow("7-7","4","Маркшейдерские геодезические работы","Surveying & Geodetic Works","тыс.тг",
        { "2026":{vol:"106",price:"",sum:"122250"} }),
      totalRow("7-T","ИТОГО ПО РАЗДЕЛУ 7","TOTAL SECTION 7"),
    ],
  },
  {
    id: 8, icon: "💻",
    color: "text-indigo-600 bg-indigo-500/10 border-indigo-500/30",
    titleRu: "Раздел 8. Организационно-технические мероприятия по развитию автоматизации производственных процессов, телекоммуникации, информационных технологий",
    titleEn: "Section 8. Organizational & Technical Measures for Production Automation, Telecom & IT",
    rows: [
      makeRow("8-1","1","АСУТП — организационные мероприятия","SCADA/DCS — Organizational Measures","тыс.тг",
        { "2026":{vol:"",price:"",sum:"2384613"} }),
      makeRow("8-2","2","ИТ — организационные мероприятия","IT — Organizational Measures","тыс.тг",
        { "2026":{vol:"",price:"",sum:"2401356"} }),
      makeRow("8-3","3","SAP — сопровождение и развитие","SAP — Support & Development","тыс.тг",
        { "2026":{vol:"",price:"",sum:"217325"} }),
      makeRow("8-4","3.2","SAP — аренда и техподдержка ЛПО","SAP — License & Support","тыс.тг",
        { "2026":{vol:"",price:"",sum:"21418"} }),
      makeRow("8-5","3.3","SAP — аренда облачных серверов","SAP — Cloud Server Rental","тыс.тг",
        { "2026":{vol:"",price:"",sum:"53737"} }),
      makeRow("8-6","4","Сопровождение АСУ НСИ","NSI Management System Support","тыс.тг",
        { "2026":{vol:"",price:"",sum:"26914"} }),
      totalRow("8-T","ИТОГО ПО РАЗДЕЛУ 8","TOTAL SECTION 8"),
    ],
  },
  {
    id: 9, icon: "🔬",
    color: "text-teal-600 bg-teal-500/10 border-teal-500/30",
    titleRu: "Раздел 9. Планы НИР и НИОКР",
    titleEn: "Section 9. R&D and Applied Research Plans",
    rows: [
      makeRow("9-1","1","НИР в части техники и технологии","Technology & Technique R&D","тыс.тг",
        { "2026":{vol:"",price:"",sum:"453296"} }),
      makeRow("9-2","2","НИР в части разработки месторождений","Reservoir Development R&D","тыс.тг",
        { "2026":{vol:"612",price:"",sum:"2003152"} }),
      makeRow("9-3","3","НИР в части утилизации газа","Gas Utilization R&D","тыс.тг",
        { "2026":{vol:"",price:"",sum:"135955"} }),
      makeRow("9-4","4","НИР по бурению","Drilling R&D","тыс.тг"),
      totalRow("9-T","ИТОГО ПО РАЗДЕЛУ 9","TOTAL SECTION 9"),
    ],
  },
  {
    id: 10, icon: "🧪",
    color: "text-lime-600 bg-lime-500/10 border-lime-500/30",
    titleRu: "Раздел 10. Опытно-промышленные работы по внедрению новой техники и технологий повышения нефтеотдачи пластов",
    titleEn: "Section 10. Pilot Works on New Technology Implementation for Enhanced Oil Recovery",
    rows: [
      makeRow("10-1","1","Автоматическое устройство по очистке нефтяных скважин от парафина","Automatic Paraffin Cleaning Device for Oil Wells","тыс.тг",
        { "2027":{vol:"",price:"",sum:"72000"} }),
      makeRow("10-2","2","Иные опытно-промышленные работы по МУН","Other EOR Pilot Works","тыс.тг"),
      totalRow("10-T","ИТОГО ПО РАЗДЕЛУ 10","TOTAL SECTION 10"),
    ],
  },
  {
    id: 11, icon: "🛡️",
    color: "text-green-600 bg-green-500/10 border-green-500/30",
    titleRu: "Раздел 11. Экология, охрана труда и техника безопасности",
    titleEn: "Section 11. Ecology, Occupational Health & Safety",
    rows: [
      makeRow("11-1","1","Мероприятия по безопасности и охране труда","HSE Measures","тыс.тг",
        { "2026":{vol:"",price:"",sum:"3994"} }),
      makeRow("11-2","2","Мероприятия по производственной безопасности","Industrial Safety Measures","тыс.тг",
        { "2026":{vol:"",price:"",sum:"3076"} }),
      makeRow("11-3","3","Охрана окружающей среды и рациональное использование природных ресурсов","Environmental Protection & Resource Use","тыс.тг",
        { "2026":{vol:"",price:"",sum:"1086"} }),
      makeRow("11-4","4","Аренда пожарного депо (2 выезда)","Fire Station Rental (2 exits)","тыс.тг"),
      makeRow("11-5","5","Аренда пожарного поста (1 выезд)","Fire Post Rental (1 exit)","тыс.тг"),
      totalRow("11-T","ИТОГО ПО РАЗДЕЛУ 11","TOTAL SECTION 11"),
    ],
  },
  {
    id: 12, icon: "📦",
    color: "text-purple-600 bg-purple-500/10 border-purple-500/30",
    titleRu: "Раздел 12. План потребности ТМЦ",
    titleEn: "Section 12. Material & Technical Resources (MTR) Supply Plan",
    rows: [
      makeRow("12-0","","Закуп нематериальных активов (НМА)","Intangible Asset Procurement","тыс.тг",
        { "2026":{vol:"",price:"",sum:"3350400"} }, { isSubHeader: true }),
      makeRow("12-1","2","Внедрение учётной системы SAP S4/HANA","SAP S4/HANA Implementation","тыс.тг",
        { "2026":{vol:"",price:"",sum:"3350400"} }),
      makeRow("12-2","1","Департамент промысловой геологии и разработки","Dept. of Reservoir Geology & Development","тыс.тг",
        { "2026":{vol:"",price:"",sum:"321088"} }),
      makeRow("12-3","2","Департамент капитального строительства","Dept. of Capital Construction","тыс.тг",
        { "2026":{vol:"",price:"",sum:"168593"} }),
      makeRow("12-4","3","Департамент охраны труда и окр. среды","Dept. of OHS & Environment","тыс.тг",
        { "2026":{vol:"",price:"",sum:"45848"} }),
      makeRow("12-5","4","Департамент социальной политики и адм. обеспечения","Dept. of Social Policy & Admin","тыс.тг",
        { "2026":{vol:"",price:"",sum:"1187204"} }),
      makeRow("12-6","5","Отдел информационных технологий","IT Department","тыс.тг",
        { "2026":{vol:"",price:"",sum:"250186"} }),
      makeRow("12-7","6","Отдел маркетинга и сбыта","Marketing & Sales Dept.","тыс.тг",
        { "2026":{vol:"",price:"",sum:"980232"} }),
      makeRow("12-8","7","Группа учёта и подготовки газа","Gas Accounting & Treatment Group","тыс.тг",
        { "2026":{vol:"",price:"",sum:"1794852"} }),
      makeRow("12-9","8","Отдел автоматизации производства","Production Automation Dept.","тыс.тг",
        { "2026":{vol:"",price:"",sum:"328878"} }),
      makeRow("12-10","9","Служба бурения и КРС","Drilling & Well Workover Service","тыс.тг",
        { "2026":{vol:"",price:"",sum:"0"} }),
      makeRow("12-11","10","Отдел главного механика","Chief Mechanical Engineer Dept.","тыс.тг",
        { "2026":{vol:"",price:"",sum:"4054049"} }),
      makeRow("12-12","11","Отдел главного энергетика","Chief Power Engineer Dept.","тыс.тг",
        { "2026":{vol:"",price:"",sum:"2258299"} }),
      makeRow("12-13","12","Отдел добычи нефти и газа","Oil & Gas Production Dept.","тыс.тг",
        { "2026":{vol:"",price:"",sum:"6662618"} }),
      makeRow("12-14","13","Отдел подземного ремонта скважин","Well Intervention Dept.","тыс.тг",
        { "2026":{vol:"",price:"",sum:"1515430"} }),
      makeRow("12-15","14","Транспортный отдел","Transport Department","тыс.тг",
        { "2026":{vol:"",price:"",sum:"1322889"} }),
      totalRow("12-T","ИТОГО ПО РАЗДЕЛУ 12","TOTAL SECTION 12"),
    ],
  },
];

/* ─── Plan state ──────────────────────────────────────────── */
type PlanState = Record<string, RowData>; // rowId → RowData

function defaultPlanState(): PlanState {
  const state: PlanState = {};
  SECTIONS.forEach(sec =>
    sec.rows.forEach(r => { state[r.id] = JSON.parse(JSON.stringify(r.data)); })
  );
  return state;
}

function loadStateForPlan(planId: string): PlanState {
  try {
    const s = localStorage.getItem(PLAN_DATA_PREFIX + planId);
    if (s) return JSON.parse(s);
  } catch { /* ignore */ }
  // also try old single-key migration
  try {
    const old = localStorage.getItem("prodplan_data_v2");
    if (old) return JSON.parse(old);
  } catch { /* ignore */ }
  return defaultPlanState();
}

/** Ensure at least one default plan exists; return list + active id */
function initPlans(): { list: ProdPlanMeta[]; activeId: string } {
  let list = loadPlansList();
  if (list.length === 0) {
    const defaultPlan = createPlan("Базовый план 2026–2030");
    list = [defaultPlan];
    savePlansList(list);
    // migrate old data if present
    const old = localStorage.getItem("prodplan_data_v2");
    if (old) savePlanData(defaultPlan.id, JSON.parse(old));
  }
  return { list, activeId: list[0].id };
}

/* ─── Excel export ─────────────────────────────────────────── */

// Section accent colors (ARGB, no alpha prefix needed for ExcelJS)
const SECTION_COLORS: Record<number, { bg: string; font: string }> = {
  1:  { bg: "FFFEF3C7", font: "FF92400E" }, // amber
  2:  { bg: "FFDBEAFE", font: "FF1E3A8A" }, // blue
  3:  { bg: "FFFED7AA", font: "FF9A3412" }, // orange
  4:  { bg: "FFEDE9FE", font: "FF4C1D95" }, // violet
  5:  { bg: "FFE0F2FE", font: "FF0C4A6E" }, // sky
  6:  { bg: "FFF1F5F9", font: "FF334155" }, // slate
  7:  { bg: "FFFCE7F3", font: "FF9D174D" }, // rose
  8:  { bg: "FFE0E7FF", font: "FF312E81" }, // indigo
  9:  { bg: "FFCCFBF1", font: "FF134E4A" }, // teal
  10: { bg: "FFECFCCB", font: "FF365314" }, // lime
  11: { bg: "FFDCFCE7", font: "FF14532D" }, // green
  12: { bg: "FFF3E8FF", font: "FF581C87" }, // purple
};

async function exportToExcel(planState: PlanState, isEn: boolean, companyName: string) {
  const wb = new ExcelJS.Workbook();
  wb.creator = `Digital Twin — ${companyName}`;
  wb.created = new Date();

  const ws = wb.addWorksheet("2026-2030", {
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1 },
    views: [{ state: "frozen", xSplit: 4, ySplit: 4 }],
  });

  const TOTAL_COLS = 4 + YEARS.length * 3; // №, name, unit, + 3 per year

  /* ── column widths ── */
  ws.getColumn(1).width = 6;   // №
  ws.getColumn(2).width = 58;  // Name
  ws.getColumn(3).width = 13;  // Unit
  ws.getColumn(4).width = 8;   // Dept (hidden, narrow)
  let col = 5;
  for (const _y of YEARS) {
    ws.getColumn(col).width = 13; col++;
    ws.getColumn(col).width = 14; col++;
    ws.getColumn(col).width = 16; col++;
  }

  /* ── helper: apply border to a cell ── */
  const borderThin: ExcelJS.Border = { style: "thin", color: { argb: "FFCBD5E1" } };
  const borderMed: ExcelJS.Border = { style: "medium", color: { argb: "FF94A3B8" } };
  function applyBorders(cell: ExcelJS.Cell, medium = false) {
    const b = medium ? borderMed : borderThin;
    cell.border = { top: b, left: b, bottom: b, right: b };
  }

  /* ── Row 1: main title ── */
  const titleText = isEn
    ? `PRODUCTION PLAN — ${companyName.toUpperCase()} FOR THE PERIOD 2026–2030`
    : `ПРОИЗВОДСТВЕННЫЙ ПЛАН ${companyName.toUpperCase()} НА ПЕРИОД 2026–2030 гг.`;
  const r1 = ws.getRow(1);
  r1.height = 36;
  const titleCell = ws.getCell("A1");
  titleCell.value = titleText;
  titleCell.font = { name: "Calibri", bold: true, size: 14, color: { argb: "FF1E293B" } };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
  titleCell.font = { name: "Calibri", bold: true, size: 13, color: { argb: "FFFFFFFF" } };
  titleCell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  ws.mergeCells(1, 1, 1, TOTAL_COLS);

  /* ── Row 2: generated date ── */
  const r2 = ws.getRow(2);
  r2.height = 18;
  const dateCell = ws.getCell("A2");
  dateCell.value = isEn
    ? `Generated: ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}`
    : `Сформировано: ${new Date().toLocaleDateString("ru-RU", { day: "2-digit", month: "long", year: "numeric" })}`;
  dateCell.font = { name: "Calibri", italic: true, size: 9, color: { argb: "FF64748B" } };
  dateCell.alignment = { horizontal: "right" };
  ws.mergeCells(2, 1, 2, TOTAL_COLS);

  /* ── Row 3: year group headers ── */
  const r3 = ws.getRow(3);
  r3.height = 22;
  // fixed labels
  [
    [1, isEn ? "No." : "№", "FFF1F5F9"],
    [2, isEn ? "Name of Works" : "Наименование работ", "FFF1F5F9"],
    [3, isEn ? "Unit" : "Ед.изм.", "FFF1F5F9"],
    [4, isEn ? "Dept." : "Отв.", "FFF1F5F9"],
  ].forEach(([c, v, bg]) => {
    const cell = ws.getCell(3, c as number);
    cell.value = v as string;
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg as string } };
    cell.font = { name: "Calibri", bold: true, size: 9, color: { argb: "FF475569" } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    applyBorders(cell, true);
    ws.mergeCells(3, c as number, 4, c as number); // merge rows 3-4 for fixed cols
  });

  const YEAR_BG = ["FF1E3A8A","FF1E4D8A","FF155E75","FF164E63","FF134E4A"];
  col = 5;
  YEARS.forEach((y, i) => {
    ws.mergeCells(3, col, 3, col + 2);
    const yCell = ws.getCell(3, col);
    yCell.value = `${y} ${isEn ? "year" : "год"}`;
    yCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: YEAR_BG[i] } };
    yCell.font = { name: "Calibri", bold: true, size: 10, color: { argb: "FFFFFFFF" } };
    yCell.alignment = { horizontal: "center", vertical: "middle" };
    applyBorders(yCell, true);
    col += 3;
  });

  /* ── Row 4: sub-headers (Vol / Price / Sum) ── */
  const r4 = ws.getRow(4);
  r4.height = 30;
  col = 5;
  YEARS.forEach((_, i) => {
    const subBg = ["FFE0E7FF","FFDBEAFE","FFE0F2FE","FFE0FDF4","FFECFDF5"][i];
    const labels = isEn
      ? ["Vol.", "Unit Price\ntKZT", "Amount\ntKZT"]
      : ["Физ.\nобъём", "Цена,\nтыс.тг", "Сумма,\nтыс.тг"];
    labels.forEach((lbl) => {
      const cell = ws.getCell(4, col);
      cell.value = lbl;
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: subBg } };
      cell.font = { name: "Calibri", bold: true, size: 8, color: { argb: "FF1E293B" } };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      applyBorders(cell, true);
      col++;
    });
  });

  /* ── Data rows ── */
  let rowIdx = 5;

  for (const sec of SECTIONS) {
    const sc = SECTION_COLORS[sec.id] ?? { bg: "FFF8FAFC", font: "FF334155" };

    /* Section header row */
    const secRow = ws.getRow(rowIdx);
    secRow.height = 28;
    const secCell = ws.getCell(rowIdx, 1);
    secCell.value = isEn ? sec.titleEn : sec.titleRu;
    secCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: sc.bg } };
    secCell.font = { name: "Calibri", bold: true, size: 10, color: { argb: sc.font } };
    secCell.alignment = { vertical: "middle", horizontal: "left", wrapText: true, indent: 1 };
    ws.mergeCells(rowIdx, 1, rowIdx, TOTAL_COLS);
    applyBorders(secCell, true);
    rowIdx++;

    for (const row of sec.rows) {
      const rd = planState[row.id] ?? row.data;
      const dataRow = ws.getRow(rowIdx);
      dataRow.height = row.isTotal ? 20 : row.isSubHeader ? 18 : 16;

      const isTotal = row.isTotal;
      const isSub = row.isSubHeader;
      const rowBg = isTotal ? "FFE2E8F0" : isSub ? "FFF8FAFC" : "FFFFFFFF";
      const altBg = "FFFAFAFA";
      const useBg = (rowIdx % 2 === 0 && !isTotal && !isSub) ? altBg : rowBg;

      // № col
      const numCell = ws.getCell(rowIdx, 1);
      numCell.value = row.num;
      numCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: useBg } };
      numCell.font = { name: "Calibri", size: 8, color: { argb: "FF64748B" } };
      numCell.alignment = { horizontal: "center", vertical: "middle" };
      applyBorders(numCell);

      // Name col
      const nameCell = ws.getCell(rowIdx, 2);
      nameCell.value = isEn ? row.nameEn : row.nameRu;
      nameCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: isTotal ? "FFE2E8F0" : useBg } };
      nameCell.font = {
        name: "Calibri", size: 9,
        bold: isTotal || isSub,
        color: { argb: isTotal ? "FF0F172A" : isSub ? sc.font : "FF1E293B" },
        italic: row.nameRu.startsWith("  "),
      };
      nameCell.alignment = { vertical: "middle", wrapText: true, indent: row.nameRu.startsWith("  ") ? 2 : 0 };
      applyBorders(nameCell);

      // Unit col
      const unitCell = ws.getCell(rowIdx, 3);
      unitCell.value = row.unit;
      unitCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: useBg } };
      unitCell.font = { name: "Calibri", size: 8, color: { argb: "FF64748B" }, italic: true };
      unitCell.alignment = { horizontal: "center", vertical: "middle" };
      applyBorders(unitCell);

      // Dept col
      const deptCell = ws.getCell(rowIdx, 4);
      deptCell.value = row.dept ?? "";
      deptCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: useBg } };
      deptCell.font = { name: "Calibri", size: 7, color: { argb: "FF94A3B8" } };
      deptCell.alignment = { horizontal: "center", vertical: "middle" };
      applyBorders(deptCell);

      // Year data cols
      col = 5;
      const NUM_BG = ["FFF0F9FF","FFF0FDF4","FFFEFCE8","FFF5F3FF","FFF0FDF4"];
      YEARS.forEach((y, yi) => {
        const d = (isTotal ? computeTotalData(sec, planState)[y] : rd[y]) ?? emptyCell();

        // Vol
        const vCell = ws.getCell(rowIdx, col);
        vCell.value = d.vol !== "" ? (isNaN(Number(d.vol)) ? d.vol : Number(d.vol)) : null;
        vCell.numFmt = '#,##0.##';
        vCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: isTotal ? "FFE2E8F0" : useBg } };
        vCell.font = { name: "Calibri", size: 9, bold: isTotal, color: { argb: isTotal ? "FF1E293B" : "FF475569" } };
        vCell.alignment = { horizontal: "right", vertical: "middle" };
        applyBorders(vCell);

        // Price
        const pCell = ws.getCell(rowIdx, col + 1);
        pCell.value = d.price !== "" ? (isNaN(Number(d.price)) ? d.price : Number(d.price)) : null;
        pCell.numFmt = '#,##0.00';
        pCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: isTotal ? "FFE2E8F0" : useBg } };
        pCell.font = { name: "Calibri", size: 9, color: { argb: "FF64748B" } };
        pCell.alignment = { horizontal: "right", vertical: "middle" };
        applyBorders(pCell);

        // Sum
        const sCell = ws.getCell(rowIdx, col + 2);
        const sumVal = d.sum !== "" ? (isNaN(Number(d.sum)) ? d.sum : Number(d.sum)) : null;
        sCell.value = sumVal;
        sCell.numFmt = '#,##0.00';
        const sumBg = isTotal ? sc.bg : NUM_BG[yi];
        sCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: isTotal ? sc.bg : sumBg } };
        sCell.font = {
          name: "Calibri", size: 9,
          bold: isTotal,
          color: { argb: isTotal ? sc.font : "FF1E293B" },
        };
        sCell.alignment = { horizontal: "right", vertical: "middle" };
        applyBorders(sCell, isTotal);

        col += 3;
      });

      rowIdx++;
    }

    // blank separator row
    const blankRow = ws.getRow(rowIdx);
    blankRow.height = 6;
    for (let c = 1; c <= TOTAL_COLS; c++) {
      ws.getCell(rowIdx, c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
    }
    rowIdx++;
  }

  /* ── Download ── */
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Production_Plan_2026-2030_${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Compute totals for a section's total row */
function computeTotalData(sec: Section, planState: PlanState): RowData {
  const result = emptyRow();
  for (const y of YEARS) {
    let total = 0;
    sec.rows.forEach(r => {
      if (r.isTotal || r.isSection || r.isSubHeader) return;
      const d = (planState[r.id] ?? r.data)[y];
      const v = parseFloat(d?.sum ?? "");
      if (!isNaN(v)) total += v;
    });
    result[y] = { vol: "", price: "", sum: total > 0 ? String(Math.round(total)) : "" };
  }
  return result;
}

/* ─── EditableCell ─────────────────────────────────────────── */
interface EditableCellProps {
  value: string;
  onChange: (v: string) => void;
  numeric?: boolean;
}
function EditableCell({ value, onChange, numeric }: EditableCellProps) {
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState(value);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => { setLocal(value); }, [value]);

  const commit = () => {
    setEditing(false);
    onChange(local.trim());
  };

  if (!editing) {
    return (
      <div
        className="min-h-[28px] px-2 py-1 cursor-pointer hover:bg-primary/5 rounded text-right text-sm tabular-nums"
        onClick={() => { setEditing(true); setTimeout(() => ref.current?.select(), 0); }}
      >
        {value !== "" ? (numeric ? Number(value).toLocaleString("ru-RU") : value) : (
          <span className="text-muted-foreground/30">—</span>
        )}
      </div>
    );
  }
  return (
    <input
      ref={ref}
      className="w-full min-h-[28px] px-2 py-1 text-right text-sm tabular-nums bg-primary/5 border border-primary/30 rounded outline-none"
      value={local}
      onChange={e => setLocal(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setLocal(value); setEditing(false); } }}
      inputMode={numeric ? "decimal" : "text"}
      autoFocus
    />
  );
}

/* ─── Main Component ──────────────────────────────────────── */
export function ProductionProgram() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const { activeWorkspace } = useWorkspace();
  const companyName = activeWorkspace?.name ?? (isEn ? "Company" : "Компания");

  // ── Plan list state ──
  const [plansList, setPlansList] = useState<ProdPlanMeta[]>(() => initPlans().list);
  const [activePlanId, setActivePlanId] = useState<string>(() => initPlans().activeId);
  const [planState, setPlanState] = useState<PlanState>(() => loadStateForPlan(initPlans().activeId));
  const [newPlanName, setNewPlanName] = useState("");
  const [showNewPlan, setShowNewPlan] = useState(false);

  const [activeSection, setActiveSection] = useState(1);
  const [activeYear, setActiveYear] = useState<YearKey>("2026");
  const [saved, setSaved] = useState(false);

  // ── Approval workflow state ──
  const [showApproval, setShowApproval] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [approval, setApproval] = useState<ApprovalWorkflow>(() => loadApproval(initPlans().activeId));
  // Per-step inputs: { [stepId]: { person, comment } }
  const [approvalInputs, setApprovalInputs] = useState<Record<string, { person: string; comment: string }>>({});
  const [submitterName, setSubmitterName] = useState("");

  const section = SECTIONS.find(s => s.id === activeSection)!;
  const activePlan = plansList.find(p => p.id === activePlanId);

  // Switch plan
  const switchPlan = useCallback((id: string) => {
    setActivePlanId(id);
    setPlanState(loadStateForPlan(id));
    setApproval(loadApproval(id));
    setApprovalInputs({});
  }, []);

  // ── Approval handlers (parallel — all steps active simultaneously) ──
  const handleSubmitForReview = useCallback(() => {
    const updated: ApprovalWorkflow = {
      ...approval,
      status: "in_review",
      submittedAt: new Date().toISOString(),
      submittedBy: submitterName.trim(),
      steps: approval.steps.map(s => ({ ...s, status: "pending" as const })),
    };
    saveApproval(updated);
    setApproval(updated);
    setSubmitterName("");
  }, [approval, submitterName]);

  const handleApproveStep = useCallback((stepId: string) => {
    const input = approvalInputs[stepId] ?? { person: "", comment: "" };
    const now = new Date().toISOString();
    const steps = approval.steps.map(s =>
      s.id === stepId
        ? { ...s, status: "approved" as const, person: input.person.trim(), comment: input.comment.trim(), timestamp: now }
        : s
    );
    const allApproved = steps.every(s => s.status === "approved");
    const anyRejected = steps.some(s => s.status === "rejected");
    const updated: ApprovalWorkflow = {
      ...approval,
      status: allApproved ? "approved" : anyRejected ? "rejected" : "in_review",
      steps,
    };
    saveApproval(updated);
    setApproval(updated);
    setApprovalInputs(prev => {
      const next = { ...prev };
      delete next[stepId];
      return next;
    });
  }, [approval, approvalInputs]);

  const handleRejectStep = useCallback((stepId: string) => {
    const input = approvalInputs[stepId] ?? { person: "", comment: "" };
    const now = new Date().toISOString();
    const steps = approval.steps.map(s =>
      s.id === stepId
        ? { ...s, status: "rejected" as const, person: input.person.trim(), comment: input.comment.trim(), timestamp: now }
        : s
    );
    const updated: ApprovalWorkflow = { ...approval, status: "rejected", steps };
    saveApproval(updated);
    setApproval(updated);
    setApprovalInputs(prev => {
      const next = { ...prev };
      delete next[stepId];
      return next;
    });
  }, [approval, approvalInputs]);

  const handleResetApproval = useCallback(() => {
    const fresh = createDefaultApproval(activePlanId);
    saveApproval(fresh);
    setApproval(fresh);
    setApprovalInputs({});
  }, [activePlanId]);

  const handleApprovalInputChange = useCallback((stepId: string, field: "person" | "comment", value: string) => {
    setApprovalInputs(prev => ({
      ...prev,
      [stepId]: { ...(prev[stepId] ?? { person: "", comment: "" }), [field]: value },
    }));
  }, []);

  // Create new plan
  const handleCreatePlan = useCallback(() => {
    const name = newPlanName.trim() || (isEn ? `Plan ${plansList.length + 1}` : `План ${plansList.length + 1}`);
    const meta = createPlan(name);
    const newList = [meta, ...plansList];
    savePlansList(newList);
    setPlansList(newList);
    setActivePlanId(meta.id);
    setPlanState(defaultPlanState());
    setNewPlanName("");
    setShowNewPlan(false);
  }, [newPlanName, plansList, isEn]);

  // Delete plan
  const handleDeletePlan = useCallback((id: string) => {
    if (plansList.length <= 1) return; // keep at least one
    deletePlan(id);
    const newList = plansList.filter(p => p.id !== id);
    savePlansList(newList);
    setPlansList(newList);
    if (activePlanId === id) {
      setActivePlanId(newList[0].id);
      setPlanState(loadStateForPlan(newList[0].id));
    }
  }, [plansList, activePlanId]);

  const updateCell = useCallback((rowId: string, year: YearKey, field: keyof CellData, value: string) => {
    setPlanState(prev => {
      const row = { ...prev[rowId] } ?? emptyRow();
      const yr: CellData = { ...(row[year] ?? emptyCell()) };
      yr[field] = value;
      if (field === "vol" || field === "price") {
        const vol = parseFloat(field === "vol" ? value : yr.vol);
        const price = parseFloat(field === "price" ? value : yr.price);
        if (!isNaN(vol) && !isNaN(price)) yr.sum = String(Math.round(vol * price));
      }
      return { ...prev, [rowId]: { ...row, [year]: yr } };
    });
  }, []);

  const saveData = useCallback(() => {
    savePlanData(activePlanId, planState);
    const now = new Date().toISOString();
    const newList = plansList.map(p => p.id === activePlanId ? { ...p, updatedAt: now } : p);
    savePlansList(newList);
    setPlansList(newList);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [activePlanId, planState, plansList]);

  const handlePrint = useCallback(() => {
    const planName = plansList.find(p => p.id === activePlanId)?.name ?? "";
    const generatedDate = new Date().toLocaleDateString(isEn ? "en-GB" : "ru-RU", {
      day: "2-digit", month: "long", year: "numeric",
    });
    const yearCols = YEARS.map(y =>
      `<th colspan="3" style="background:#1e3a8a;color:#fff;text-align:center;padding:6px 4px;font-size:11px;">${y}</th>`
    ).join("");
    const subCols = YEARS.map(() =>
      `<th style="background:#1e40af;color:#93c5fd;text-align:center;padding:4px 2px;font-size:9px;white-space:nowrap;">${isEn?"Vol":"Физ.объём"}</th>` +
      `<th style="background:#1e40af;color:#93c5fd;text-align:center;padding:4px 2px;font-size:9px;white-space:nowrap;">${isEn?"Price":"Цена"}</th>` +
      `<th style="background:#1e40af;color:#93c5fd;text-align:center;padding:4px 2px;font-size:9px;white-space:nowrap;">${isEn?"Sum":"Сумма"}</th>`
    ).join("");

    const sectionsHtml = SECTIONS.map(sec => {
      const title = isEn ? sec.titleEn : sec.titleRu;
      const rowsHtml = sec.rows.map(row => {
        if (row.isSection) return "";
        const bg = row.isTotal ? "#f0f9ff" : row.isSubHeader ? "#f8fafc" : "#fff";
        const fw = row.isTotal ? "700" : row.isSubHeader ? "600" : "400";
        const cells = YEARS.map(y => {
          const d = (planState[row.id] ?? row.data)[y] ?? { vol: "", price: "", sum: "" };
          if (row.isTotal) {
            let total = 0;
            sec.rows.forEach(r => {
              if (r.isTotal || r.isSection || r.isSubHeader) return;
              const rd = (planState[r.id] ?? r.data)[y];
              const v = parseFloat(rd?.sum ?? "");
              if (!isNaN(v)) total += v;
            });
            return `<td style="text-align:right;padding:3px 4px;font-size:9px;"></td><td style="text-align:right;padding:3px 4px;font-size:9px;"></td><td style="text-align:right;padding:3px 4px;font-size:9px;font-weight:700;color:#1e3a8a;">${total > 0 ? total.toLocaleString("ru-RU") : "—"}</td>`;
          }
          return `<td style="text-align:right;padding:3px 4px;font-size:9px;">${d.vol||"—"}</td><td style="text-align:right;padding:3px 4px;font-size:9px;">${d.price||"—"}</td><td style="text-align:right;padding:3px 4px;font-size:9px;">${d.sum ? Number(d.sum).toLocaleString("ru-RU") : "—"}</td>`;
        }).join("");
        const name = isEn ? row.nameEn : row.nameRu;
        return `<tr style="background:${bg};border-bottom:1px solid #e2e8f0;">
          <td style="padding:3px 4px;font-size:9px;color:#64748b;">${row.num}</td>
          <td style="padding:3px 6px;font-size:9px;font-weight:${fw};">${name}</td>
          <td style="padding:3px 4px;font-size:9px;color:#64748b;">${row.unit}</td>
          ${cells}
        </tr>`;
      }).join("");
      return `
        <div style="break-inside:avoid;margin-bottom:16px;">
          <div style="background:#1e3a8a;color:#fff;padding:8px 12px;font-size:11px;font-weight:700;border-radius:4px 4px 0 0;">
            ${title}
          </div>
          <table style="width:100%;border-collapse:collapse;border:1px solid #cbd5e1;">
            <thead>
              <tr><th rowspan="2" style="text-align:left;padding:4px;font-size:9px;background:#f1f5f9;width:30px;">№</th>
                  <th rowspan="2" style="text-align:left;padding:4px;font-size:9px;background:#f1f5f9;">${isEn?"Indicator":"Показатель"}</th>
                  <th rowspan="2" style="text-align:left;padding:4px;font-size:9px;background:#f1f5f9;width:60px;">${isEn?"Unit":"Ед."}</th>
                  ${yearCols}</tr>
              <tr>${subCols}</tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </div>`;
    }).join("");

    const html = `<!DOCTYPE html><html lang="${isEn?"en":"ru"}">
<head>
  <meta charset="UTF-8"/>
  <title>${isEn?"Production Program":"Производственная программа"} — ${companyName}</title>
  <style>
    @page { size: A3 landscape; margin: 15mm 12mm; }
    body { font-family: Arial, sans-serif; font-size: 10px; color: #1e293b; margin: 0; }
    .cover { margin-bottom: 20px; padding-bottom: 12px; border-bottom: 2px solid #1e3a8a; }
    .cover h1 { font-size: 18px; font-weight: 800; color: #1e3a8a; margin: 0 0 4px; }
    .cover h2 { font-size: 13px; font-weight: 600; color: #475569; margin: 0 0 4px; }
    .cover p  { font-size: 10px; color: #94a3b8; margin: 0; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="cover">
    <h1>${companyName}</h1>
    <h2>${isEn ? "Production Program 2026–2030" : "Производственная программа 2026–2030"}</h2>
    <p>${isEn ? "Plan" : "План"}: <b>${planName}</b> &nbsp;·&nbsp; ${isEn ? "Generated" : "Сформировано"}: ${generatedDate}</p>
  </div>
  ${sectionsHtml}
</body></html>`;

    const win = window.open("", "_blank", "width=1200,height=800");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.onload = () => { win.focus(); win.print(); };
  }, [activePlanId, plansList, planState, isEn, companyName]);

  const getRowData = (row: PlanRow): RowData => {
    if (!row.isTotal) return planState[row.id] ?? row.data;
    const result = emptyRow();
    for (const y of YEARS) {
      let total = 0;
      section.rows.forEach(r => {
        if (r.isTotal || r.isSection || r.isSubHeader) return;
        const d = (planState[r.id] ?? r.data)[y];
        const v = parseFloat(d?.sum ?? "");
        if (!isNaN(v)) total += v;
      });
      result[y] = { vol: "", price: "", sum: total > 0 ? String(Math.round(total)) : "" };
    }
    return result;
  };

  return (
    <div className="flex flex-col h-full min-h-0">

      {/* ══ Full-width top toolbar ══ */}
      <div className="shrink-0 border-b bg-background px-4 py-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="h-4 w-4 text-primary shrink-0" />
          <span className="text-sm font-semibold truncate">
            {activePlan?.name ?? (isEn ? "Production Program" : "Производственная программа")}
          </span>
          <span className="text-xs text-muted-foreground hidden sm:block">· 2026–2030</span>
          {companyName && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium shrink-0">
              {companyName}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={saveData} className="h-8 gap-1.5">
            {saved
              ? <><CheckCircle2 className="h-3.5 w-3.5 text-green-500" />{isEn ? "Saved!" : "Сохранено!"}</>
              : <><Save className="h-3.5 w-3.5" />{isEn ? "Save" : "Сохранить"}</>}
          </Button>
          <Button size="sm" variant="outline" onClick={() => void exportToExcel(planState, isEn, companyName)} className="h-8 gap-1.5">
            <Download className="h-3.5 w-3.5" />
            {isEn ? "Export Excel" : "Экспорт Excel"}
          </Button>
          <Button size="sm" variant="outline" onClick={handlePrint} className="h-8 gap-1.5">
            <Printer className="h-3.5 w-3.5" />
            {isEn ? "Print" : "Печать"}
          </Button>
          <Button
            size="sm"
            variant={showApproval ? "default" : "outline"}
            onClick={() => setShowApproval(v => !v)}
            className="h-8 gap-1.5"
          >
            <GitBranch className="h-3.5 w-3.5" />
            {isEn ? "Approval" : "Согласование"}
            {approval.status !== "draft" && <ApprovalStatusDot status={approval.status} />}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowValidation(true)}
            className="h-8 gap-1.5 border-primary/40 text-primary hover:bg-primary/10"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            {isEn ? "Validate Plan" : "Проверка плана"}
          </Button>
        </div>
      </div>

      {/* ══ Main content row ══ */}
      <div className="flex flex-1 min-h-0">

      {/* ── Left navigation ── */}
      <div className="w-64 shrink-0 border-r bg-muted/20 flex flex-col overflow-hidden">

        {/* ── Plans list (compact) ── */}
        <div className="shrink-0 border-b">
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {isEn ? "Plans" : "Планы"}
            </span>
            <button
              onClick={() => setShowNewPlan(v => !v)}
              className="h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
              title={isEn ? "New plan" : "Новый план"}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          {showNewPlan && (
            <div className="px-3 pb-2 flex gap-1">
              <input
                autoFocus
                value={newPlanName}
                onChange={e => setNewPlanName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleCreatePlan(); if (e.key === "Escape") setShowNewPlan(false); }}
                placeholder={isEn ? "Plan name…" : "Название плана…"}
                className="flex-1 text-xs px-2 py-1 rounded border border-border bg-background outline-none focus:border-primary min-w-0"
              />
              <button
                onClick={handleCreatePlan}
                className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground font-medium shrink-0"
              >
                {isEn ? "Add" : "Создать"}
              </button>
            </div>
          )}

          <div className="max-h-36 overflow-y-auto">
            {plansList.map(plan => (
              <div
                key={plan.id}
                className={`flex items-center gap-1.5 px-3 py-1.5 cursor-pointer group transition-colors ${
                  plan.id === activePlanId
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
                onClick={() => switchPlan(plan.id)}
              >
                <FileText className={`h-3 w-3 shrink-0 ${plan.id === activePlanId ? "text-primary" : "text-muted-foreground/50"}`} />
                <span className="text-xs truncate flex-1 leading-none py-0.5">{plan.name}</span>
                {plan.id === activePlanId && (
                  <span className="text-[10px] text-primary/60 shrink-0">✓</span>
                )}
                {plansList.length > 1 && (
                  <button
                    onClick={e => { e.stopPropagation(); handleDeletePlan(plan.id); }}
                    className="opacity-0 group-hover:opacity-100 h-4 w-4 flex items-center justify-center rounded text-destructive hover:bg-destructive/10 transition-all"
                  >
                    <Trash2 className="h-2.5 w-2.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Sections list ── */}
        <div className="flex-1 overflow-y-auto py-1">
          <div className="px-3 py-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
              {isEn ? "Sections" : "Разделы"} · {activePlan?.name ?? ""}
            </p>
          </div>
          {SECTIONS.map(sec => (
            <button
              key={sec.id}
              onClick={() => setActiveSection(sec.id)}
              className={`w-full text-left px-3 py-2 flex items-start gap-1.5 text-xs transition-colors ${
                activeSection === sec.id
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <span className="leading-snug line-clamp-2 flex-1">
                <span className="font-semibold">{sec.id}.</span>
                {" "}
                {isEn
                  ? sec.titleEn.replace(/^Section \d+\. /, "").slice(0, 55)
                  : sec.titleRu.replace(/^Раздел \d+\. /, "").slice(0, 55)}
                {(isEn
                  ? sec.titleEn.replace(/^Section \d+\. /, "")
                  : sec.titleRu.replace(/^Раздел \d+\. /, "")
                ).length > 55 ? "…" : ""}
              </span>
              {activeSection === sec.id && <ChevronRight className="h-3 w-3 shrink-0 mt-0.5" />}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main content + bottom approval ── */}
      <div className="flex-1 min-w-0 flex flex-col min-h-0">
        {/* Section header bar (no buttons) */}
        <div className="shrink-0 px-5 py-2.5 border-b bg-background">
          <h2 className="font-semibold text-sm leading-snug">
            {isEn ? section.titleEn : section.titleRu}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isEn
              ? "Click any cell to edit. Sum auto-calculates from Vol × Price."
              : "Нажмите на ячейку для редактирования. Сумма рассчитывается автоматически."}
          </p>
        </div>

        {/* Year tabs */}
        <div className="shrink-0 px-5 pt-3 pb-0 border-b bg-background flex items-center gap-1">
          {YEARS.map(y => (
            <button
              key={y}
              onClick={() => setActiveYear(y)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeYear === y
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {y}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur-sm">
              <tr>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground w-12 border-b">#</th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground border-b">
                  {isEn ? "Name" : "Наименование"}
                </th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground w-24 border-b">
                  {isEn ? "Unit" : "Ед.изм."}
                </th>
                <th className="text-right px-3 py-2.5 font-medium text-muted-foreground w-32 border-b">
                  {isEn ? "Vol." : "Физ.объём"}
                </th>
                <th className="text-right px-3 py-2.5 font-medium text-muted-foreground w-36 border-b">
                  {isEn ? "Unit Price, tKZT" : "Цена, тыс.тг"}
                </th>
                <th className="text-right px-3 py-2.5 font-medium text-muted-foreground w-40 border-b">
                  {isEn ? "Amount, tKZT" : "Сумма, тыс.тг"}
                </th>
              </tr>
            </thead>
            <tbody>
              {section.rows.map((row) => {
                const rd = getRowData(row);
                const d = rd[activeYear] ?? emptyCell();

                if (row.isTotal) {
                  return (
                    <tr key={row.id} className="bg-muted/50 font-semibold">
                      <td className="px-3 py-2 border-t-2 border-border" />
                      <td className="px-3 py-2 border-t-2 border-border">
                        {isEn ? row.nameEn : row.nameRu}
                      </td>
                      <td className="px-3 py-2 border-t-2 border-border" />
                      <td className="px-3 py-2 text-right tabular-nums border-t-2 border-border" />
                      <td className="px-3 py-2 text-right tabular-nums border-t-2 border-border" />
                      <td className="px-3 py-2 text-right tabular-nums border-t-2 border-border text-primary font-bold">
                        {d.sum !== "" ? Number(d.sum).toLocaleString("ru-RU") : "—"}
                      </td>
                    </tr>
                  );
                }

                if (row.isSubHeader) {
                  return (
                    <tr key={row.id} className="bg-accent/40">
                      <td className="px-3 py-2 text-xs text-muted-foreground" />
                      <td className="px-3 py-2 font-semibold text-sm" colSpan={4}>
                        {isEn ? row.nameEn : row.nameRu}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-sm font-medium">
                        {d.sum !== "" ? Number(d.sum).toLocaleString("ru-RU") : "—"}
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={row.id} className="hover:bg-muted/30 border-b border-border/50 group">
                    <td className="px-3 py-1 text-xs text-muted-foreground align-top pt-2">{row.num}</td>
                    <td className="px-3 py-1 align-middle text-sm">
                      {isEn ? row.nameEn : row.nameRu}
                    </td>
                    <td className="px-3 py-1 align-middle text-xs text-muted-foreground">{row.unit}</td>
                    <td className="px-1 py-1 align-middle w-32">
                      <EditableCell
                        value={d.vol}
                        onChange={v => updateCell(row.id, activeYear, "vol", v)}
                        numeric
                      />
                    </td>
                    <td className="px-1 py-1 align-middle w-36">
                      <EditableCell
                        value={d.price}
                        onChange={v => updateCell(row.id, activeYear, "price", v)}
                        numeric
                      />
                    </td>
                    <td className="px-1 py-1 align-middle w-40">
                      <EditableCell
                        value={d.sum}
                        onChange={v => updateCell(row.id, activeYear, "sum", v)}
                        numeric
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Info banner */}
          <div className="p-4 m-4 rounded-lg bg-muted/40 border border-border/50 flex gap-2 text-xs text-muted-foreground">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-primary/60" />
            <span>
              {isEn
                ? `Data for year ${activeYear} shown. Switch years using tabs above. Click "Save" to persist data locally. "Export Excel" downloads a multi-year workbook with all 12 sections.`
                : `Отображены данные за ${activeYear} год. Переключайте годы с помощью вкладок выше. Нажмите «Сохранить» для сохранения в браузере. «Экспорт Excel» скачивает файл со всеми 12 разделами и всеми годами.`}
            </span>
          </div>
        </div>

        {/* ── Bottom approval panel (horizontal, collapsible) ── */}
        {showApproval && (
          <ApprovalPanel
            isEn={isEn}
            planName={activePlan?.name ?? ""}
            approval={approval}
            approvalInputs={approvalInputs}
            submitterName={submitterName}
            onInputChange={handleApprovalInputChange}
            onSubmitterChange={setSubmitterName}
            onSubmit={handleSubmitForReview}
            onApprove={handleApproveStep}
            onReject={handleRejectStep}
            onReset={handleResetApproval}
          />
        )}
      </div>

      </div>{/* end main content row */}

      {/* AI Plan Validation modal */}
      <PlanValidationModal
        isOpen={showValidation}
        onClose={() => setShowValidation(false)}
        isEn={isEn}
        planName={activePlan?.name ?? ""}
        companyName={companyName}
        planState={planState}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Helper sub-components
───────────────────────────────────────────────────────────────────────── */

function ApprovalStatusDot({ status }: { status: WorkflowStatus }) {
  const color =
    status === "approved"  ? "bg-green-500" :
    status === "rejected"  ? "bg-red-500" :
    status === "in_review" ? "bg-amber-400" : "bg-muted";
  return <span className={`inline-block h-2 w-2 rounded-full ${color} ml-0.5`} />;
}

interface ApprovalPanelProps {
  isEn: boolean;
  planName: string;
  approval: ApprovalWorkflow;
  approvalInputs: Record<string, { person: string; comment: string }>;
  submitterName: string;
  onInputChange: (stepId: string, field: "person" | "comment", value: string) => void;
  onSubmitterChange: (v: string) => void;
  onSubmit: () => void;
  onApprove: (stepId: string) => void;
  onReject: (stepId: string) => void;
  onReset: () => void;
}

function ApprovalPanel({
  isEn, planName, approval, approvalInputs, submitterName,
  onInputChange, onSubmitterChange, onSubmit, onApprove, onReject, onReset,
}: ApprovalPanelProps) {
  const [collapsed, setCollapsed] = useState(false);

  const wfMeta: Record<WorkflowStatus, { ru: string; en: string; cls: string }> = {
    draft:     { ru: "Черновик",        en: "Draft",      cls: "bg-muted text-muted-foreground border-border" },
    in_review: { ru: "На согласовании", en: "In Review",  cls: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
    approved:  { ru: "Согласован",      en: "Approved",   cls: "bg-green-500/15 text-green-600 border-green-500/30" },
    rejected:  { ru: "Отклонён",        en: "Rejected",   cls: "bg-red-500/15 text-red-600 border-red-500/30" },
  };
  const wf = wfMeta[approval.status];

  const approved  = approval.steps.filter(s => s.status === "approved").length;
  const rejected  = approval.steps.filter(s => s.status === "rejected").length;
  const pending   = approval.steps.filter(s => s.status === "pending").length;
  const total     = approval.steps.length;

  const fmtDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString(isEn ? "en-GB" : "ru-RU", { day: "2-digit", month: "short" }) : "";

  const statusIcon = (status: ApprovalStep["status"]) => {
    if (status === "approved") return <CheckCheck className="h-3.5 w-3.5 text-green-500 shrink-0" />;
    if (status === "rejected") return <XCircle    className="h-3.5 w-3.5 text-red-500 shrink-0" />;
    if (status === "pending")  return <Clock      className="h-3.5 w-3.5 text-amber-400 animate-pulse shrink-0" />;
    return <div className="h-3.5 w-3.5 rounded-full border-2 border-muted-foreground/25 shrink-0" />;
  };

  const rowBg = (status: ApprovalStep["status"]) => {
    if (status === "approved") return "bg-green-500/5";
    if (status === "rejected") return "bg-red-500/5";
    if (status === "pending")  return "bg-amber-500/5";
    return "";
  };

  return (
    <div className="shrink-0 border-t bg-background">

      {/* ── Always-visible header bar ── */}
      <div
        className="flex items-center gap-3 px-4 py-0 cursor-pointer select-none hover:bg-muted/30 transition-colors h-10"
        onClick={() => setCollapsed(v => !v)}
      >
        <GitBranch className="h-3.5 w-3.5 text-primary shrink-0" />
        <span className="text-xs font-semibold shrink-0">{isEn ? "Approval Workflow" : "Маршрут согласования"}</span>

        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium shrink-0 ${wf.cls}`}>
          {isEn ? wf.en : wf.ru}
        </span>

        {/* Progress bar + counter — inline in the menu bar */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-semibold text-green-600 tabular-nums">
            {isEn ? "Approved" : "Согласовано"}
          </span>
          <div className="w-28 bg-muted rounded-full h-2 overflow-hidden">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${
                rejected > 0 ? "bg-red-500" : "bg-green-500"
              }`}
              style={{ width: `${(approved / total) * 100}%` }}
            />
          </div>
          <span className={`text-[11px] font-bold tabular-nums ${
            rejected > 0 ? "text-red-500" : approved === total ? "text-green-600" : "text-green-600"
          }`}>
            {approved} / {total}
          </span>
          {rejected > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-red-500">
              <XCircle className="h-3 w-3" />{rejected}
            </span>
          )}
          {pending > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-amber-500">
              <Clock className="h-3 w-3" />{pending}
            </span>
          )}
        </div>

        <span className="text-xs text-muted-foreground truncate flex-1 min-w-0">{planName}</span>

        {approval.submittedAt && (
          <span className="text-[10px] text-muted-foreground/60 shrink-0 hidden lg:block">
            {isEn ? "Submitted" : "Отправлено"}: {fmtDate(approval.submittedAt)}
            {approval.submittedBy ? ` · ${approval.submittedBy}` : ""}
          </span>
        )}

        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform duration-200 ${collapsed ? "" : "rotate-180"}`} />
      </div>

      {/* ── Expandable body ── */}
      {!collapsed && (
        <div className="border-t border-border/60 flex">

          {/* Scrollable step list — full width */}
          <div className="flex-1 min-w-0 max-h-64 overflow-y-auto overflow-x-auto">
            <table className="w-full min-w-[900px] text-xs border-collapse">
              <thead className="sticky top-0 bg-muted/60 backdrop-blur-sm z-10">
                <tr className="border-b border-border">
                  <th className="text-left px-3 py-1.5 text-[10px] font-semibold text-muted-foreground w-8">#</th>
                  <th className="text-left px-3 py-1.5 text-[10px] font-semibold text-muted-foreground min-w-[160px]">
                    {isEn ? "Section" : "Раздел"}
                  </th>
                  <th className="text-left px-3 py-1.5 text-[10px] font-semibold text-muted-foreground min-w-[140px]">
                    {isEn ? "Approver" : "Согласующий"}
                  </th>
                  <th className="text-left px-3 py-1.5 text-[10px] font-semibold text-muted-foreground w-32">
                    {isEn ? "Status" : "Статус"}
                  </th>
                  <th className="text-left px-3 py-1.5 text-[10px] font-semibold text-muted-foreground w-36">
                    {isEn ? "User ID" : "Пользователь"}
                  </th>
                  <th className="text-left px-3 py-1.5 text-[10px] font-semibold text-muted-foreground w-28">
                    {isEn ? "Approval Date" : "Дата согласования"}
                  </th>
                  <th className="text-left px-3 py-1.5 text-[10px] font-semibold text-muted-foreground">
                    {isEn ? "Comment" : "Комментарий"}
                  </th>
                  {approval.status === "in_review" && (
                    <th className="text-left px-3 py-1.5 text-[10px] font-semibold text-muted-foreground w-80">
                      {isEn ? "Action" : "Действие"}
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {approval.steps.map((step, idx) => {
                  const isPending = step.status === "pending";
                  const inp = approvalInputs[step.id] ?? { person: "", comment: "" };
                  return (
                    <tr key={step.id} className={`border-b border-border/40 transition-colors ${rowBg(step.status)}`}>
                      {/* # */}
                      <td className="px-3 py-2 text-muted-foreground/50 tabular-nums align-middle">{idx + 1}</td>

                      {/* Section */}
                      <td className="px-3 py-2 align-middle">
                        <span className={`font-medium leading-snug ${step.status === "waiting" ? "text-muted-foreground" : "text-foreground"}`}>
                          {isEn ? step.sectionTitleEn : step.sectionTitleRu}
                        </span>
                      </td>

                      {/* Approver role */}
                      <td className="px-3 py-2 align-middle text-muted-foreground leading-snug">
                        {isEn ? step.roleEn : step.roleRu}
                      </td>

                      {/* Status badge */}
                      <td className="px-3 py-2 align-middle">
                        <span className="flex items-center gap-1.5">
                          {statusIcon(step.status)}
                          <span className={
                            step.status === "approved" ? "text-green-600" :
                            step.status === "rejected" ? "text-red-500" :
                            step.status === "pending"  ? "text-amber-500" :
                            "text-muted-foreground/50"
                          }>
                            {step.status === "approved" ? (isEn ? "Approved"       : "Согласовано")      :
                             step.status === "rejected" ? (isEn ? "Rejected"       : "Отклонено")        :
                             step.status === "pending"  ? (isEn ? "Pending"        : "На рассмотрении")  :
                                                          (isEn ? "Waiting"        : "Ожидает")}
                          </span>
                        </span>
                      </td>

                      {/* User ID */}
                      <td className="px-3 py-2 align-middle">
                        {step.person
                          ? <span className="flex items-center gap-1 text-foreground"><User className="h-2.5 w-2.5 text-muted-foreground shrink-0" />{step.person}</span>
                          : <span className="text-muted-foreground/30">—</span>}
                      </td>

                      {/* Approval Date */}
                      <td className="px-3 py-2 align-middle tabular-nums">
                        {step.timestamp
                          ? <span className="text-muted-foreground">{new Date(step.timestamp).toLocaleDateString(isEn ? "en-GB" : "ru-RU", { day: "2-digit", month: "short", year: "numeric" })}</span>
                          : <span className="text-muted-foreground/30">—</span>}
                      </td>

                      {/* Comment */}
                      <td className="px-3 py-2 align-middle">
                        {step.comment
                          ? <span className="italic text-muted-foreground">"{step.comment}"</span>
                          : <span className="text-muted-foreground/30">—</span>}
                      </td>

                      {/* Inline action for pending steps */}
                      {approval.status === "in_review" && (
                        <td className="px-2 py-1.5 align-middle">
                          {isPending ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                value={inp.person}
                                onChange={e => onInputChange(step.id, "person", e.target.value)}
                                placeholder={isEn ? "User ID…" : "Пользователь…"}
                                className="w-28 text-xs px-1.5 py-0.5 rounded border border-border bg-background outline-none focus:border-primary"
                              />
                              <input
                                value={inp.comment}
                                onChange={e => onInputChange(step.id, "comment", e.target.value)}
                                placeholder={isEn ? "Comment…" : "Комментарий…"}
                                className="w-36 text-xs px-1.5 py-0.5 rounded border border-border bg-background outline-none focus:border-primary"
                              />
                              <button
                                onClick={() => onApprove(step.id)}
                                className="h-6 px-2.5 rounded bg-green-600 hover:bg-green-700 text-white text-[10px] font-medium flex items-center gap-1 transition-colors shrink-0"
                              >
                                <CheckCheck className="h-2.5 w-2.5" />
                                {isEn ? "OK" : "ОК"}
                              </button>
                              <button
                                onClick={() => onReject(step.id)}
                                className="h-6 px-2.5 rounded bg-red-600 hover:bg-red-700 text-white text-[10px] font-medium flex items-center gap-1 transition-colors shrink-0"
                              >
                                <XCircle className="h-2.5 w-2.5" />
                                {isEn ? "No" : "Нет"}
                              </button>
                            </div>
                          ) : <span className="text-muted-foreground/30 text-[10px]">—</span>}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>

              {/* Footer row — submit / reset */}
              <tfoot className="sticky bottom-0 bg-muted/60 backdrop-blur-sm border-t border-border">
                <tr>
                  <td colSpan={approval.status === "in_review" ? 8 : 7} className="px-3 py-2">
                    {approval.status === "draft" && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide shrink-0">
                          {isEn ? "Submit for parallel review:" : "Отправить на параллельное согласование:"}
                        </span>
                        <input
                          value={submitterName}
                          onChange={e => onSubmitterChange(e.target.value)}
                          placeholder={isEn ? "Your name…" : "Ваше имя…"}
                          className="w-40 text-xs px-2 py-1 rounded border border-border bg-background outline-none focus:border-primary"
                        />
                        <button
                          onClick={onSubmit}
                          className="text-xs px-3 py-1 rounded bg-primary hover:bg-primary/90 text-primary-foreground font-medium flex items-center gap-1.5 transition-colors shrink-0"
                        >
                          <Send className="h-3 w-3" />
                          {isEn ? "Send to all" : "Разослать всем"}
                        </button>
                      </div>
                    )}
                    {(approval.status === "approved" || approval.status === "rejected") && (
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-semibold ${approval.status === "approved" ? "text-green-600" : "text-red-500"}`}>
                          {approval.status === "approved"
                            ? (isEn ? "✓ Fully approved" : "✓ Полностью согласован")
                            : (isEn ? "✗ Rejected" : "✗ Отклонён")}
                        </span>
                        <button
                          onClick={onReset}
                          className="text-xs px-3 py-1 rounded border border-border text-muted-foreground hover:text-foreground hover:bg-muted flex items-center gap-1.5 transition-colors"
                        >
                          <RotateCcw className="h-3 w-3" />
                          {isEn ? "Reset workflow" : "Сбросить маршрут"}
                        </button>
                      </div>
                    )}
                    {approval.status === "in_review" && (
                      <span className="text-[10px] text-muted-foreground/50 italic">
                        {isEn ? "All approvers notified — reviewing in parallel" : "Все согласующие уведомлены — параллельное рассмотрение"}
                      </span>
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
