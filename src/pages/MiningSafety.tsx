import { useState } from 'react'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useTheme } from '@/hooks/useTheme'
import {
  HardHat, AlertTriangle, CheckCircle2, Clock,
  TrendingDown, Users, Zap, ShieldCheck, BookOpen,
  ArrowDownRight,
} from 'lucide-react'

/* ══════════════════════════════════════════════════════════ DATA ══ */

const ltifr = [
  { year: '2020', ltifr: 0.34, target: 0.25 },
  { year: '2021', ltifr: 0.28, target: 0.23 },
  { year: '2022', ltifr: 0.22, target: 0.20 },
  { year: '2023', ltifr: 0.15, target: 0.18 },
  { year: '2024', ltifr: 0.12, target: 0.15 },
]

const incidentsByMonth = [
  { month: 'Ян',  near: 14, minor: 4, major: 0 },
  { month: 'Фев', near: 12, minor: 3, major: 0 },
  { month: 'Мар', near: 16, minor: 5, major: 1 },
  { month: 'Апр', near: 11, minor: 2, major: 0 },
  { month: 'Май', near: 9,  minor: 3, major: 0 },
  { month: 'Июн', near: 13, minor: 2, major: 0 },
  { month: 'Июл', near: 10, minor: 1, major: 0 },
  { month: 'Авг', near: 8,  minor: 1, major: 0 },
]

const incidents = [
  {
    date: '14.03.2024', location: 'Жезказган · Горизонт Г-340',
    type: 'Травма с ВПТ', category: 'major',
    description: 'Ушиб руки при уборке горной массы, водитель ПДМ.',
    action: 'Внеплановый инструктаж, проверка СИЗ, изменение маршрута уборки.',
    status: 'Закрыт',
  },
  {
    date: '22.05.2024', location: 'ОФ «Балхашская» · Флотационный цех',
    type: 'Опасное происшествие', category: 'near',
    description: 'Пролив реагента (ксантогенат). Разлив локализован, персонал не пострадал.',
    action: 'Проверка запорной арматуры, повторное обучение ХОOS.',
    status: 'Закрыт',
  },
  {
    date: '07.07.2024', location: 'Соколовский ГОК · Карьер',
    type: 'Опасное происшествие', category: 'near',
    description: 'Нарушение безопасного расстояния между самосвалами на отвале.',
    action: 'Корректировка правил движения на отвале, GPS-контроль дистанции.',
    status: 'Закрыт',
  },
  {
    date: '19.08.2024', location: 'КЭЗ «Балхаш» · Электролизный цех',
    type: 'Незначительная травма', category: 'minor',
    description: 'Порез руки при обслуживании медных катодов. Оказана первая помощь.',
    action: 'Выдача усиленных защитных перчаток, повторный инструктаж.',
    status: 'Закрыт',
  },
]

const trainingModules = [
  { name: 'Базовый курс ПБ для горняков',      total: 4060, trained: 4060, pct: 100 },
  { name: 'Работа с взрывчатыми веществами',   total: 824,  trained: 812,  pct: 98.5 },
  { name: 'Управление ПДМ и самосвалами',      total: 1240, trained: 1198, pct: 96.6 },
  { name: 'Химическая безопасность (ХОOS)',    total: 680,  trained: 642,  pct: 94.4 },
  { name: 'Первая помощь и медэвакуация',      total: 4060, trained: 3814, pct: 93.9 },
  { name: 'Эвакуация при подземных авариях',  total: 1820, trained: 1694, pct: 93.1 },
  { name: 'Работа на высоте > 1.8 м',          total: 312,  trained: 278,  pct: 89.1 },
]

const riskMatrix = [
  { zone: 'Подземные горные работы',   level: 'Высокий',  score: 8, controls: 'Газовый контроль, крепёж кровли, план эвакуации' },
  { zone: 'Взрывные работы',           level: 'Высокий',  score: 7, controls: 'Маршруты эвакуации, 500м зона, ЭВМ регистрация' },
  { zone: 'Работа с реагентами ОФ',    level: 'Средний',  score: 5, controls: 'СИЗ, план ХОOS, вентиляция, душевые' },
  { zone: 'Техника на карьере',        level: 'Средний',  score: 5, controls: 'GPS-мониторинг, DISPATCH, ПДД карьера' },
  { zone: 'Электролизный цех (КЭЗ)',   level: 'Средний',  score: 4, controls: 'Изоляция ограждений, СИЗ, план нейтрализации' },
  { zone: 'Административные здания',   level: 'Низкий',   score: 2, controls: 'Стандартные меры ОТ' },
]

/* ══════════════════════════════════════════════════════════ MAIN ══ */

export default function MiningSafety() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [activeTab, setActiveTab] = useState<'overview' | 'incidents' | 'training' | 'risks'>('overview')
  const green = '#10b981'
  const amber = '#f59e0b'
  const red   = '#ef4444'

  const tabs = [
    { id: 'overview',  label: 'Обзор',              icon: ShieldCheck },
    { id: 'incidents', label: 'Инциденты',           icon: AlertTriangle },
    { id: 'training',  label: 'Обучение',            icon: BookOpen },
    { id: 'risks',     label: 'Матрица рисков',      icon: HardHat },
  ] as const

  return (
    <div className="flex flex-col gap-5 p-5 min-h-screen">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Промышленная безопасность</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            АО «КазГМК» · LTIFR, инциденты, обучение, оценка рисков · 2024
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge className="text-[10px] bg-emerald-500/15 text-emerald-500 border-0">
            <ShieldCheck className="h-3 w-3 mr-1" />312 суток без ЧП
          </Badge>
          <Badge variant="outline" className="text-[10px]" style={{ borderColor: '#f59e0b40', color: amber }}>
            LTIFR 0.12
          </Badge>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 border-b">
        {tabs.map((t) => {
          const Icon = t.icon
          return (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className="flex items-center gap-1.5 px-3 pb-2 text-xs font-medium transition-colors"
              style={{
                borderBottom: activeTab === t.id ? `2px solid ${green}` : '2px solid transparent',
                color: activeTab === t.id ? green : undefined,
              }}>
              <Icon className="h-3.5 w-3.5" />{t.label}
            </button>
          )
        })}
      </div>

      {/* ── OVERVIEW ── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'LTIFR 2024',              value: '0.12', sub: 'цель < 0.15', ok: true,  color: green, icon: TrendingDown },
              { label: 'Суток без НС с ВПТ',       value: '312',  sub: 'с 14 марта 2024', ok: true, color: green, icon: CheckCircle2 },
              { label: 'НС с ВПТ за 2024 г.',      value: '1',    sub: '2023 — 3 случая', ok: true, color: amber, icon: AlertTriangle },
              { label: 'Опасных происшествий',      value: '18',   sub: '2023 — 26 / −30.8%', ok: true, color: green, icon: Clock },
            ].map((k) => {
              const Icon = k.icon
              return (
                <div key={k.label} className="rounded-xl border p-4"
                  style={{ borderColor: `${k.color}30`, background: isDark ? `${k.color}07` : `${k.color}04` }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="h-4 w-4" style={{ color: k.color }} />
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground leading-snug">{k.label}</span>
                  </div>
                  <p className="text-2xl font-bold" style={{ color: k.color }}>{k.value}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    {k.ok
                      ? <Badge className="text-[9px] bg-emerald-500/15 text-emerald-500 border-0">В норме</Badge>
                      : <Badge className="text-[9px] bg-red-500/15 text-red-400 border-0">Выше цели</Badge>
                    }
                    <span className="text-[10px] text-muted-foreground">{k.sub}</span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* LTIFR trend chart */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              Динамика LTIFR 2020–2024
            </h3>
            <div className="rounded-xl border p-4" style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={ltifr} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} />
                  <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 0.40]} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number, name: string) => [v.toFixed(2), name === 'ltifr' ? 'LTIFR факт' : 'Целевой LTIFR']} />
                  <Legend wrapperStyle={{ fontSize: 11 }} formatter={(v) => v === 'ltifr' ? 'LTIFR факт' : 'Целевой LTIFR'} />
                  <ReferenceLine y={0.20} stroke={red} strokeDasharray="4 2"
                    label={{ value: 'КМП 0.20', position: 'insideTopRight', fontSize: 9, fill: red }} />
                  <Line type="monotone" dataKey="ltifr"  stroke={amber} strokeWidth={2.5} dot={{ r: 5 }} />
                  <Line type="monotone" dataKey="target" stroke={green} strokeWidth={1.5} strokeDasharray="5 3" dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Incidents by month chart */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              Инциденты по месяцам · 2024
            </h3>
            <div className="rounded-xl border p-4" style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={incidentsByMonth} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} formatter={(v) => v === 'near' ? 'Опасные происш.' : v === 'minor' ? 'Лёгкие травмы' : 'НС с ВПТ'} />
                  <Bar dataKey="near"  fill={`${amber}66`} radius={[3, 3, 0, 0]} stackId="a" />
                  <Bar dataKey="minor" fill={`${red}44`}   radius={[3, 3, 0, 0]} stackId="a" />
                  <Bar dataKey="major" fill={red}          radius={[3, 3, 0, 0]} stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Safety ribbon */}
          <div className="rounded-xl border p-4 flex items-start gap-3"
            style={{ borderColor: `${green}25`, background: isDark ? `${green}07` : `${green}04` }}>
            <HardHat className="h-5 w-5 shrink-0 mt-0.5" style={{ color: green }} />
            <div>
              <p className="text-sm font-semibold mb-1" style={{ color: green }}>
                Программа «Нулевой травматизм» — выполняется
              </p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Цели на 2024 год: LTIFR &lt; 0.15, нулевые смертельные случаи, &gt; 95% охват обучением по ПБ.
                По всем показателям — выше плана. LTIFR 0.12 — исторический минимум компании.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── INCIDENTS ── */}
      {activeTab === 'incidents' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: red }} />
              <span className="text-muted-foreground">НС с ВПТ: 1</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: amber }} />
              <span className="text-muted-foreground">Лёгкие травмы: 4</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="h-2.5 w-2.5 rounded-full bg-muted" />
              <span className="text-muted-foreground">Опасные происш.: 13</span>
            </div>
          </div>

          <div className="space-y-3">
            {incidents.map((inc, i) => {
              const borderColor = inc.category === 'major' ? red : inc.category === 'minor' ? amber : 'var(--border)'
              const bg = inc.category === 'major'
                ? (isDark ? `${red}09` : `${red}05`)
                : inc.category === 'minor'
                ? (isDark ? `${amber}09` : `${amber}05`)
                : 'transparent'
              return (
                <div key={i} className="rounded-xl border p-4" style={{ borderColor, background: bg }}>
                  <div className="flex items-start gap-3">
                    <div>
                      {inc.category === 'major'
                        ? <AlertTriangle className="h-4 w-4 mt-0.5" style={{ color: red }} />
                        : inc.category === 'minor'
                        ? <AlertTriangle className="h-4 w-4 mt-0.5" style={{ color: amber }} />
                        : <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-semibold">{inc.date}</span>
                        <span className="text-[10px] text-muted-foreground">{inc.location}</span>
                        <Badge className={`text-[9px] border-0 ml-auto ${
                          inc.category === 'major' ? 'bg-red-500/15 text-red-400' :
                          inc.category === 'minor' ? 'bg-amber-500/15 text-amber-500' :
                          'bg-muted text-muted-foreground'}`}>
                          {inc.type}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground mb-1.5">{inc.description}</p>
                      <div className="flex items-start gap-1.5 text-[11px]">
                        <CheckCircle2 className="h-3 w-3 mt-0.5 shrink-0" style={{ color: green }} />
                        <span className="text-muted-foreground">{inc.action}</span>
                      </div>
                    </div>
                    <Badge className="text-[9px] bg-emerald-500/15 text-emerald-500 border-0 shrink-0">
                      {inc.status}
                    </Badge>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── TRAINING ── */}
      {activeTab === 'training' && (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Охват обучением (ПБ)', value: '95.2%', color: green, icon: Users },
              { label: 'Персонала в базе',      value: '4 060', color: '#6366f1', icon: HardHat },
              { label: 'Модулей пройдено',       value: '24 830', color: '#0d9488', icon: BookOpen },
            ].map((s) => {
              const Icon = s.icon
              return (
                <div key={s.label} className="rounded-xl border p-4"
                  style={{ borderColor: `${s.color}25`, background: isDark ? `${s.color}07` : `${s.color}04` }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="h-4 w-4" style={{ color: s.color }} />
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</span>
                  </div>
                  <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                </div>
              )
            })}
          </div>

          <div className="rounded-xl border overflow-hidden">
            <div className="border-b px-4 py-2.5"
              style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Обучение по модулям · 2024
              </p>
            </div>
            <div className="divide-y">
              {trainingModules.map((mod) => {
                const colorPct = mod.pct >= 95 ? green : mod.pct >= 90 ? amber : red
                return (
                  <div key={mod.name} className="px-4 py-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium">{mod.name}</span>
                      <span className="text-xs tabular-nums">
                        <span className="font-semibold" style={{ color: colorPct }}>{mod.trained}</span>
                        <span className="text-muted-foreground"> / {mod.total}</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${mod.pct}%`, background: colorPct }} />
                      </div>
                      <span className="text-[10px] font-semibold w-10 text-right" style={{ color: colorPct }}>{mod.pct}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── RISKS ── */}
      {activeTab === 'risks' && (
        <div className="space-y-5">
          <p className="text-xs text-muted-foreground">
            Оценка по методологии ICMM / ISO 31000. Уровень риска = Вероятность × Тяжесть последствий (шкала 1–10).
          </p>
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b" style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
                  {['Зона / Процесс', 'Уровень риска', 'Балл', 'Барьеры управления'].map((h) => (
                    <th key={h} className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {riskMatrix.map((row, i) => {
                  const color = row.level === 'Высокий' ? red : row.level === 'Средний' ? amber : green
                  const rowBg  = row.level === 'Высокий'
                    ? (isDark ? `${red}07`   : `${red}04`)
                    : row.level === 'Средний'
                    ? (isDark ? `${amber}07` : `${amber}04`)
                    : 'transparent'
                  return (
                    <tr key={i} className="border-b last:border-0" style={{ background: rowBg }}>
                      <td className="px-4 py-2.5 font-medium">{row.zone}</td>
                      <td className="px-4 py-2.5">
                        <Badge className="text-[9px] border-0 font-medium" style={{ background: `${color}18`, color }}>
                          {row.level}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 tabular-nums">
                        <div className="flex items-center gap-2">
                          <Progress value={(row.score / 10) * 100} className="w-12 h-1.5" />
                          <span className="font-semibold" style={{ color }}>{row.score}/10</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">{row.controls}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { title: 'Обрушение кровли',       text: 'Крепление горных выработок. Маркшейдерский контроль. Сейсмодатчики.',  color: red   },
              { title: 'Взрывные работы',         text: 'Зоны оцепления 500 м. Электронные детонаторы. Видеоконтроль.',          color: amber },
              { title: 'Задымление / вспышка ВВ', text: 'Системы газового контроля. Аварийная вентиляция. Маски СИЗ.',           color: amber },
            ].map((r, i) => (
              <div key={i} className="rounded-xl border p-4"
                style={{ borderColor: `${r.color}35`, background: isDark ? `${r.color}09` : `${r.color}05` }}>
                <div className="flex items-start gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" style={{ color: r.color }} />
                  <h4 className="text-xs font-semibold">{r.title}</h4>
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">{r.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground border-t pt-3">
        Источник: Отдел промышленной безопасности АО «КазГМК». Данные 2024 г.
        Методология LTIFR: число травм с ВПТ на 1 млн чел.-часов. ICMM / ISO 31000.
      </p>
    </div>
  )
}
