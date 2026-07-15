/**
 * ConstructionJournal — суточный журнал производства работ.
 *
 * Агрегирует записи из голосовых отчётов бригадиров (Telegram-бот → LLM),
 * ручных записей ПТО и CV-мониторинга. Источник — backend IE:AION (Фаза 1):
 *   GET  /api/construction/projects/{id}/journal
 *   POST /api/construction/projects/{id}/journal-manual
 */

import { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  ClipboardList, Plus, Mic, Pencil, ScanEye, Filter, RefreshCw,
  AlertTriangle, CheckCircle2, ChevronDown, ChevronRight,
} from 'lucide-react'

import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogTrigger, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

import { getCurrentProjectId, formatDate, ZONE_LIST } from '@/data/constructionMockData'
import {
  fetchJournal, createManualJournalEntry, fetchForemen,
  type JournalEntry, type JournalSource, type JournalFilters,
} from '@/lib/constructionApi'

const PROJECT_ID = getCurrentProjectId()

const SOURCE_META: Record<JournalSource, { label: string; cls: string; icon: typeof Mic }> = {
  voice:  { label: 'Голос',  cls: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',        icon: Mic },
  manual: { label: 'Ручная', cls: 'bg-muted text-muted-foreground',                      icon: Pencil },
  cv:     { label: 'CV',     cls: 'bg-violet-500/15 text-violet-600 dark:text-violet-400', icon: ScanEye },
}

function todayISO() { return new Date().toISOString().slice(0, 10) }
function daysAgoISO(n: number) { return new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10) }

export default function ConstructionJournal() {
  const qc = useQueryClient()
  const [searchParams] = useSearchParams()

  const [dateFrom, setDateFrom] = useState(daysAgoISO(30))
  const [dateTo, setDateTo] = useState(todayISO())
  const [zone, setZone] = useState('all')
  const [foremanId, setForemanId] = useState(searchParams.get('foreman_id') ?? 'all')
  const [confirmedOnly, setConfirmedOnly] = useState(false)

  const filters: JournalFilters = {
    dateFrom,
    dateTo,
    zone: zone === 'all' ? undefined : zone,
    foremanId: foremanId === 'all' ? undefined : foremanId,
    confirmedOnly: confirmedOnly || undefined,
  }

  const journalQ = useQuery({
    queryKey: ['construction', PROJECT_ID, 'journal', filters],
    queryFn: () => fetchJournal(PROJECT_ID, filters),
  })
  const foremenQ = useQuery({
    queryKey: ['construction', PROJECT_ID, 'foremen'],
    queryFn: () => fetchForemen(PROJECT_ID),
  })

  const entries = journalQ.data ?? []
  const foremen = foremenQ.data ?? []

  const bySource = (s: JournalSource) => entries.filter((e) => e.source === s).length
  const blockers = entries.filter((e) => e.blockerType).length

  // Группировка: дата (свежие сверху) → захватка.
  const grouped = useMemo(() => {
    const byDate = new Map<string, Map<string, JournalEntry[]>>()
    for (const e of entries) {
      const zoneKey = e.zone || 'Без захватки'
      if (!byDate.has(e.date)) byDate.set(e.date, new Map())
      const zones = byDate.get(e.date)!
      if (!zones.has(zoneKey)) zones.set(zoneKey, [])
      zones.get(zoneKey)!.push(e)
    }
    return Array.from(byDate.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, zones]) => ({ date, zones: Array.from(zones.entries()) }))
  }, [entries])

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
            Строительство · производство
          </p>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-teal-600" /> Суточный журнал
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Голосовые отчёты бригадиров, ручные записи ПТО и данные CV — в едином хронологическом журнале.
          </p>
        </div>
        <AddEntryDialog
          projectId={PROJECT_ID}
          onCreated={() => qc.invalidateQueries({ queryKey: ['construction', PROJECT_ID, 'journal'] })}
        />
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Записей за период" value={entries.length} />
        <Stat label="Голосовых" value={bySource('voice')} tone="sky" />
        <Stat label="С блокерами" value={blockers} tone="warn" />
        <Stat label="Подтверждено" value={entries.filter((e) => e.confirmed).length} tone="good" />
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><Filter className="h-4 w-4" /> Фильтры</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
            <div className="space-y-1">
              <Label className="text-[11px]">С даты</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">По дату</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Захватка</Label>
              <Select value={zone} onValueChange={setZone}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все захватки</SelectItem>
                  {ZONE_LIST.map((z) => <SelectItem key={z} value={z}>{z}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Бригадир</Label>
              <Select value={foremanId} onValueChange={setForemanId}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все бригадиры</SelectItem>
                  {foremen.map((f) => <SelectItem key={f.foremanId} value={f.foremanId}>{f.fullName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 pb-1.5">
              <input
                id="confirmed"
                type="checkbox"
                checked={confirmedOnly}
                onChange={(e) => setConfirmedOnly(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              <Label htmlFor="confirmed" className="text-[11px] cursor-pointer">Только подтверждённые</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Journal list */}
      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Записи журнала</CardTitle>
            <CardDescription>Хронологический список, свежие сверху</CardDescription>
          </div>
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => journalQ.refetch()}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Обновить
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {journalQ.isError && (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <AlertTriangle className="h-6 w-6 text-amber-500" />
              <p className="text-sm text-muted-foreground">Не удалось загрузить журнал из backend.</p>
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => journalQ.refetch()}>
                <RefreshCw className="h-3.5 w-3.5 mr-1" /> Повторить
              </Button>
            </div>
          )}
          {journalQ.isLoading && <p className="text-xs text-muted-foreground py-4">Загрузка…</p>}
          {!journalQ.isLoading && !journalQ.isError && entries.length === 0 && (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Записей за выбранный период нет.
            </p>
          )}
          {grouped.map((day) => (
            <div key={day.date} className="space-y-2">
              <div className="flex items-center gap-2 pt-2">
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {formatDate(day.date)}
                </span>
                <span className="h-px flex-1 bg-border" />
              </div>
              {day.zones.map(([zoneKey, zoneEntries]) => (
                <div key={zoneKey} className="space-y-1.5">
                  <p className="text-[11px] font-medium text-muted-foreground pl-1">{zoneKey}</p>
                  {zoneEntries.map((e) => <EntryCard key={e.entryId} e={e} />)}
                </div>
              ))}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

/* ─────────────────────────── Entry card ────────────────────────────────── */

function EntryCard({ e }: { e: JournalEntry }) {
  const [open, setOpen] = useState(false)
  const src = SOURCE_META[e.source]
  const SrcIcon = src.icon
  const delta = e.deltaPct
  const deltaCls = delta == null ? 'text-muted-foreground'
    : delta < 0 ? 'text-red-600 dark:text-red-400'
    : 'text-emerald-600 dark:text-emerald-400'
  const hasDetails = !!(e.rawTranscript || e.blockerDescription || (e.actions && e.actions.length) || (e.photos && e.photos.length))

  return (
    <div className="rounded-md border p-3">
      <div className="flex items-start gap-3">
        <span className={`h-7 w-7 rounded-md flex items-center justify-center shrink-0 ${src.cls}`}>
          <SrcIcon className="h-3.5 w-3.5" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold">{formatDate(e.date)}</span>
            {e.zone && <Badge variant="outline" className="text-[10px]">{e.zone}</Badge>}
            {e.workType && <span className="text-xs text-muted-foreground">{e.workType}</span>}
            {e.confirmed ? (
              <Badge variant="outline" className="text-[10px] gap-1 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-2.5 w-2.5" /> подтв.
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] gap-1 bg-amber-500/15 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-2.5 w-2.5" /> не подтв.
              </Badge>
            )}
            <span className="ml-auto text-[10px] text-muted-foreground">
              {e.authorForemanName ?? (e.source === 'cv' ? 'CV-мониторинг' : 'ПТО')}
            </span>
          </div>

          <div className="flex items-center gap-4 mt-1.5 text-xs">
            {e.factPct != null && (
              <span>Факт: <b>{e.factPct}%</b></span>
            )}
            {e.planPct != null && (
              <span className="text-muted-foreground">План: {e.planPct}%</span>
            )}
            {delta != null && (
              <span className={deltaCls}>Δ {delta > 0 ? '+' : ''}{delta}%</span>
            )}
            {e.blockerType && (
              <Badge variant="outline" className="text-[10px] gap-1 bg-amber-500/15 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-2.5 w-2.5" /> блокер
              </Badge>
            )}
          </div>

          {e.blockerDescription && !open && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 line-clamp-1">{e.blockerDescription}</p>
          )}

          {hasDetails && (
            <button
              onClick={() => setOpen((v) => !v)}
              className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
            >
              {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              {open ? 'Свернуть' : 'Подробнее'}
            </button>
          )}

          {open && (
            <div className="mt-2 space-y-2 text-[11px]">
              {e.blockerDescription && (
                <div>
                  <p className="font-semibold text-amber-600 dark:text-amber-400">Блокер ({e.blockerType})</p>
                  <p className="text-muted-foreground">{e.blockerDescription}</p>
                  {e.riskDelayDays != null && (
                    <p className="text-muted-foreground">Риск задержки: {e.riskDelayDays} дн. · {e.riskSeverity ?? '—'}</p>
                  )}
                  {e.responsible && <p className="text-muted-foreground">Ответственный: {e.responsible}</p>}
                </div>
              )}
              {e.actions && e.actions.length > 0 && (
                <div>
                  <p className="font-semibold">Действия / решения</p>
                  <ul className="list-disc list-inside text-muted-foreground">
                    {e.actions.map((a, i) => <li key={i}>{a}</li>)}
                  </ul>
                </div>
              )}
              {e.photos && e.photos.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {e.photos.map((p, i) => (
                    <img key={i} src={p} alt="Фото отчёта" className="h-16 w-24 object-cover rounded border" />
                  ))}
                </div>
              )}
              {e.rawTranscript && (
                <div>
                  <p className="font-semibold">Транскрипт</p>
                  <p className="text-muted-foreground italic">«{e.rawTranscript}»</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: 'good' | 'warn' | 'sky' }) {
  const color = tone === 'good' ? 'text-emerald-600 dark:text-emerald-400'
    : tone === 'warn' ? 'text-amber-600 dark:text-amber-400'
    : tone === 'sky' ? 'text-sky-600 dark:text-sky-400'
    : 'text-foreground'
  return (
    <div className="rounded-lg border p-3">
      <p className={`text-2xl font-bold tracking-tight ${color}`}>{value}</p>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
    </div>
  )
}

/* ─────────────────────────── Manual entry dialog ───────────────────────── */

function AddEntryDialog({ projectId, onCreated }: { projectId: string; onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState(todayISO())
  const [zone, setZone] = useState('none')
  const [workType, setWorkType] = useState('')
  const [planPct, setPlanPct] = useState('')
  const [factPct, setFactPct] = useState('')
  const [blocker, setBlocker] = useState('')
  const [responsible, setResponsible] = useState('')
  const [confirmed, setConfirmed] = useState(true)

  const mut = useMutation({
    mutationFn: () => {
      const plan = planPct ? Number(planPct) : null
      const fact = factPct ? Number(factPct) : null
      return createManualJournalEntry(projectId, {
        date,
        zone: zone === 'none' ? null : zone,
        workType: workType.trim() || null,
        planPct: plan,
        factPct: fact,
        deltaPct: plan != null && fact != null ? +(fact - plan).toFixed(1) : null,
        blockerType: blocker.trim() ? 'other' : null,
        blockerDescription: blocker.trim() || null,
        responsible: responsible.trim() || null,
        confirmed,
      })
    },
    onSuccess: () => {
      toast.success('Запись добавлена в журнал')
      onCreated()
      setOpen(false)
      setZone('none'); setWorkType(''); setPlanPct(''); setFactPct(''); setBlocker(''); setResponsible('')
    },
    onError: () => toast.error('Не удалось сохранить запись (проверьте backend/авторизацию).'),
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-8 text-xs">
          <Plus className="h-3.5 w-3.5 mr-1" /> Ручная запись
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ручная запись журнала</DialogTitle>
          <DialogDescription>Запись ПТО — например, если бригадир отчитался вне бота.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Дата *</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Захватка</Label>
              <Select value={zone} onValueChange={setZone}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— не задана —</SelectItem>
                  {ZONE_LIST.map((z) => <SelectItem key={z} value={z}>{z}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Вид работ</Label>
            <Input value={workType} onChange={(e) => setWorkType(e.target.value)} placeholder="Монолит перекрытия 5 этажа" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>План, %</Label>
              <Input type="number" value={planPct} onChange={(e) => setPlanPct(e.target.value)} placeholder="60" />
            </div>
            <div className="space-y-1.5">
              <Label>Факт, %</Label>
              <Input type="number" value={factPct} onChange={(e) => setFactPct(e.target.value)} placeholder="52" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Блокер / проблема</Label>
            <Textarea value={blocker} onChange={(e) => setBlocker(e.target.value)} placeholder="Не завезли арматуру ⌀12" rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label>Ответственный</Label>
            <Input value={responsible} onChange={(e) => setResponsible(e.target.value)} placeholder="Снабжение / подрядчик" />
          </div>
          <div className="flex items-center gap-2">
            <input id="conf" type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="h-4 w-4 rounded border-input" />
            <Label htmlFor="conf" className="cursor-pointer">Подтверждено ПТО</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Отмена</Button>
          <Button size="sm" disabled={mut.isPending} onClick={() => mut.mutate()}>
            {mut.isPending ? 'Сохранение…' : 'Сохранить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
