/**
 * ConstructionCrews — реестр бригадиров и бригад проекта.
 *
 * Источник данных — реальный backend IE:AION (Фаза 1):
 *   GET/POST /api/construction/projects/{id}/foremen
 *   GET/POST /api/construction/projects/{id}/crews
 *
 * Бригадир получает invite-код, который вводит в Telegram-боте для привязки.
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  HardHat, Plus, Users, Phone, MapPin, Send, CheckCircle2, Clock,
  Copy, RefreshCw, AlertTriangle,
} from 'lucide-react'

import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogTrigger, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

import { getCurrentProjectId, formatDate, ZONE_LIST } from '@/data/constructionMockData'
import {
  fetchForemen, createForeman, fetchCrews, createCrew,
  type Foreman, type Crew, type TelegramLinkStatus,
} from '@/lib/constructionApi'

const PROJECT_ID = getCurrentProjectId()
const BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'tanra_report_bot'

const ROLE_LABEL: Record<string, string> = {
  foreman: 'Прораб',
  brigadier: 'Бригадир',
  pto: 'ПТО',
}

const TG_STATUS_META: Record<TelegramLinkStatus, { label: string; cls: string; icon: typeof Send }> = {
  not_invited: { label: 'Не приглашён', cls: 'bg-muted text-muted-foreground', icon: Clock },
  invited:     { label: 'Приглашён',    cls: 'bg-amber-500/15 text-amber-600 dark:text-amber-400', icon: Send },
  linked:      { label: 'Привязан',     cls: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400', icon: CheckCircle2 },
}

export default function ConstructionCrews() {
  const qc = useQueryClient()
  const navigate = useNavigate()

  const foremenQ = useQuery({
    queryKey: ['construction', PROJECT_ID, 'foremen'],
    queryFn: () => fetchForemen(PROJECT_ID),
  })
  const crewsQ = useQuery({
    queryKey: ['construction', PROJECT_ID, 'crews'],
    queryFn: () => fetchCrews(PROJECT_ID),
  })

  const foremen = foremenQ.data ?? []
  const crews = crewsQ.data ?? []

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
            Строительство · персонал
          </p>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <HardHat className="h-6 w-6 text-teal-600" /> Бригадиры и бригады
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Реестр ответственных за захватки. Бригадиры сдают суточный отчёт голосом через Telegram-бот.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AddCrewDialog projectId={PROJECT_ID} onCreated={() => qc.invalidateQueries({ queryKey: ['construction', PROJECT_ID, 'crews'] })} />
          <AddForemanDialog
            projectId={PROJECT_ID}
            crews={crews}
            onCreated={() => qc.invalidateQueries({ queryKey: ['construction', PROJECT_ID, 'foremen'] })}
          />
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Бригадиров" value={foremen.length} icon={HardHat} />
        <StatCard label="Привязано к Telegram" value={foremen.filter((f) => f.telegramLinkStatus === 'linked').length} icon={Send} tone="good" />
        <StatCard label="Ожидают привязки" value={foremen.filter((f) => f.telegramLinkStatus === 'invited').length} icon={Clock} tone="warn" />
        <StatCard label="Бригад" value={crews.length} icon={Users} />
      </div>

      {/* Foremen table */}
      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Бригадиры</CardTitle>
            <CardDescription>Ответственные за отчётность по захваткам</CardDescription>
          </div>
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => foremenQ.refetch()}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Обновить
          </Button>
        </CardHeader>
        <CardContent>
          {foremenQ.isError && <ErrorState onRetry={() => foremenQ.refetch()} />}
          {foremenQ.isLoading && <p className="text-xs text-muted-foreground py-4">Загрузка…</p>}
          {!foremenQ.isLoading && !foremenQ.isError && foremen.length === 0 && (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Бригадиров пока нет. Добавьте первого — он получит invite-код для входа в бот.
            </p>
          )}
          {foremen.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ФИО</TableHead>
                  <TableHead>Роль</TableHead>
                  <TableHead>Бригада / подрядчик</TableHead>
                  <TableHead>Зона</TableHead>
                  <TableHead>Телефон</TableHead>
                  <TableHead>Telegram</TableHead>
                  <TableHead>Последний отчёт</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {foremen.map((f) => (
                  <ForemanRow
                    key={f.foremanId}
                    f={f}
                    onOpenJournal={() => navigate(`/construction-journal?foreman_id=${f.foremanId}`)}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Crews */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Бригады</CardTitle>
          <CardDescription>Состав и специализация бригад подрядчиков</CardDescription>
        </CardHeader>
        <CardContent>
          {crewsQ.isLoading && <p className="text-xs text-muted-foreground py-4">Загрузка…</p>}
          {!crewsQ.isLoading && crews.length === 0 && (
            <p className="text-sm text-muted-foreground py-6 text-center">Бригад пока нет.</p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {crews.map((c) => (
              <div key={c.crewId} className="rounded-lg border p-3 space-y-1">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-teal-600 shrink-0" />
                  <p className="text-sm font-semibold">{c.name}</p>
                </div>
                {c.contractorName && <p className="text-xs text-muted-foreground">{c.contractorName}</p>}
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  {c.specialization && <Badge variant="secondary" className="text-[10px]">{c.specialization}</Badge>}
                  {c.plannedHeadcount != null && (
                    <Badge variant="outline" className="text-[10px]">{c.plannedHeadcount} чел.</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/* ─────────────────────────── Row / cards ───────────────────────────────── */

function ForemanRow({ f, onOpenJournal }: { f: Foreman; onOpenJournal: () => void }) {
  const meta = TG_STATUS_META[f.telegramLinkStatus]
  const Icon = meta.icon
  const deepLink = f.inviteCode ? `https://t.me/${BOT_USERNAME}?start=${f.inviteCode}` : ''
  const copyInvite = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (deepLink) {
      navigator.clipboard.writeText(deepLink)
      toast.success('Ссылка-приглашение скопирована', { description: deepLink })
    }
  }
  return (
    <TableRow className="cursor-pointer" onClick={onOpenJournal}>
      <TableCell className="font-medium">{f.fullName}</TableCell>
      <TableCell><Badge variant="outline" className="text-[10px]">{ROLE_LABEL[f.role] ?? f.role}</Badge></TableCell>
      <TableCell className="text-xs">
        {f.crewName ?? '—'}
        {f.contractorName && <span className="block text-muted-foreground">{f.contractorName}</span>}
      </TableCell>
      <TableCell className="text-xs">
        {f.defaultZone ? (
          <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {f.defaultZone}</span>
        ) : '—'}
      </TableCell>
      <TableCell className="text-xs">
        {f.phone ? (
          <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> {f.phone}</span>
        ) : '—'}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Badge className={`text-[10px] gap-1 ${meta.cls}`} variant="outline">
            <Icon className="h-2.5 w-2.5" /> {meta.label}
          </Badge>
          {f.telegramLinkStatus !== 'linked' && f.inviteCode && (
            <button
              onClick={copyInvite}
              className="inline-flex items-center gap-1 text-[10px] font-mono text-muted-foreground hover:text-foreground"
              title={`Скопировать ссылку-приглашение (${deepLink})`}
            >
              {f.inviteCode} <Copy className="h-3 w-3" />
            </button>
          )}
        </div>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {f.lastReportDate ? formatDate(f.lastReportDate) : '—'}
      </TableCell>
    </TableRow>
  )
}

function StatCard({ label, value, icon: Icon, tone }: {
  label: string; value: number; icon: typeof HardHat; tone?: 'good' | 'warn'
}) {
  const color = tone === 'good' ? 'text-emerald-600 dark:text-emerald-400'
    : tone === 'warn' ? 'text-amber-600 dark:text-amber-400'
    : 'text-foreground'
  return (
    <div className="rounded-lg border p-3 flex items-center gap-3">
      <span className="h-9 w-9 rounded-md bg-teal-500/10 text-teal-600 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <p className={`text-2xl font-bold tracking-tight ${color}`}>{value}</p>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2 py-6 text-center">
      <AlertTriangle className="h-6 w-6 text-amber-500" />
      <p className="text-sm text-muted-foreground">Не удалось загрузить данные из backend.</p>
      <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onRetry}>
        <RefreshCw className="h-3.5 w-3.5 mr-1" /> Повторить
      </Button>
    </div>
  )
}

/* ─────────────────────────── Dialogs ───────────────────────────────────── */

function AddForemanDialog({ projectId, crews, onCreated }: {
  projectId: string; crews: Crew[]; onCreated: () => void
}) {
  const [open, setOpen] = useState(false)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState('foreman')
  const [crewId, setCrewId] = useState<string>('none')
  const [zone, setZone] = useState<string>('none')

  const mut = useMutation({
    mutationFn: () => createForeman(projectId, {
      fullName: fullName.trim(),
      phone: phone.trim() || null,
      role,
      crewId: crewId === 'none' ? null : crewId,
      defaultZone: zone === 'none' ? null : zone,
    }),
    onSuccess: (f) => {
      toast.success(`Бригадир добавлен. Invite-код: ${f.inviteCode ?? '—'}`)
      onCreated()
      setOpen(false)
      setFullName(''); setPhone(''); setRole('foreman'); setCrewId('none'); setZone('none')
    },
    onError: () => toast.error('Не удалось создать бригадира (проверьте backend/авторизацию).'),
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-8 text-xs">
          <Plus className="h-3.5 w-3.5 mr-1" /> Бригадир
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Новый бригадир</DialogTitle>
          <DialogDescription>После создания появится invite-код для привязки Telegram.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="fio">ФИО *</Label>
            <Input id="fio" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Иванов Сергей Петрович" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="phone">Телефон</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+7 701 …" />
            </div>
            <div className="space-y-1.5">
              <Label>Роль</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="foreman">Прораб</SelectItem>
                  <SelectItem value="brigadier">Бригадир</SelectItem>
                  <SelectItem value="pto">ПТО</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Бригада</Label>
              <Select value={crewId} onValueChange={setCrewId}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— не задана —</SelectItem>
                  {crews.map((c) => <SelectItem key={c.crewId} value={c.crewId}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Зона по умолчанию</Label>
              <Select value={zone} onValueChange={setZone}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— не задана —</SelectItem>
                  {ZONE_LIST.map((z) => <SelectItem key={z} value={z}>{z}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Отмена</Button>
          <Button size="sm" disabled={!fullName.trim() || mut.isPending} onClick={() => mut.mutate()}>
            {mut.isPending ? 'Создание…' : 'Создать'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function AddCrewDialog({ projectId, onCreated }: { projectId: string; onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [contractor, setContractor] = useState('')
  const [spec, setSpec] = useState('')
  const [headcount, setHeadcount] = useState('')

  const mut = useMutation({
    mutationFn: () => createCrew(projectId, {
      name: name.trim(),
      contractorName: contractor.trim() || undefined,
      specialization: spec.trim() || undefined,
      plannedHeadcount: headcount ? Number(headcount) : undefined,
    }),
    onSuccess: () => {
      toast.success('Бригада добавлена')
      onCreated()
      setOpen(false)
      setName(''); setContractor(''); setSpec(''); setHeadcount('')
    },
    onError: () => toast.error('Не удалось создать бригаду.'),
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-8 text-xs">
          <Plus className="h-3.5 w-3.5 mr-1" /> Бригада
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Новая бригада</DialogTitle>
          <DialogDescription>Подрядная или внутренняя бригада проекта.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="cname">Название *</Label>
            <Input id="cname" value={name} onChange={(e) => setName(e.target.value)} placeholder="Бригада монолитчиков №1" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contr">Подрядчик</Label>
            <Input id="contr" value={contractor} onChange={(e) => setContractor(e.target.value)} placeholder="ТОО «КазСтройМонолит»" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="spec">Специализация</Label>
              <Input id="spec" value={spec} onChange={(e) => setSpec(e.target.value)} placeholder="Монолит" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hc">Численность</Label>
              <Input id="hc" type="number" value={headcount} onChange={(e) => setHeadcount(e.target.value)} placeholder="24" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Отмена</Button>
          <Button size="sm" disabled={!name.trim() || mut.isPending} onClick={() => mut.mutate()}>
            {mut.isPending ? 'Создание…' : 'Создать'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
