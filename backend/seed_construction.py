"""Seed демо-данных строительного домена (проект ЖК «Highvill Astana»).

Зеркалит фикстуру фронтенда (src/data/constructionMockData.ts), чтобы после свапа
mock→API интерфейс показывал те же данные. Идемпотентен: повторный запуск не
дублирует проект.

Запуск:
    cd backend && python seed_construction.py
"""

import datetime as dt
import uuid

from app.db.session import SessionLocal
from app.models.construction import (
    ConstructionProject,
    Crew,
    Deviation,
    Foreman,
    Phase,
    ProgressCurvePoint,
    ScheduleTask,
    ZonePlanFact,
)

PROJECT_ID = "proj-highvill-astana"


def _d(s: str) -> dt.date:
    return dt.date.fromisoformat(s)


PHASES = [
    ("P1", "Подготовка площадки", "#94a3b8", "2026-01-15", "2026-04-30"),
    ("P2", "Нулевой цикл (фундаменты, подземка)", "#0ea5e9", "2026-03-01", "2026-08-31"),
    ("P3", "Монолитные работы надземной части", "#14b8a6", "2026-05-01", "2027-03-31"),
    ("P4", "Фасад и кровля", "#f59e0b", "2026-12-01", "2027-07-31"),
    ("P5", "Инженерные сети (ОВиК, ВК, ЭОМ, СС)", "#6366f1", "2026-09-01", "2027-08-31"),
    ("P6", "Отделочные работы", "#a855f7", "2027-04-01", "2027-10-31"),
    ("P7", "Благоустройство и инфраструктура", "#22c55e", "2027-04-01", "2027-09-30"),
    ("P8", "Пусконаладка и ввод в эксплуатацию", "#ef4444", "2027-09-01", "2027-12-15"),
]

# task_id, wbs, name, zone, phase, actual_pct, status, responsible,
# plan_start, plan_finish, fact_start, pv, ev, ac
TASKS = [
    ("t-001", "1.1.1", "Земляные работы БС-1", "БС-1 · фундамент", "P1", 100, "done", "Петров В.А.",
     "2026-01-15", "2026-02-28", "2026-01-20", 480_000_000, 480_000_000, 492_000_000),
    ("t-002", "1.2.1", "Свайное поле БС-1", "БС-1 · фундамент", "P2", 100, "done", "Петров В.А.",
     "2026-03-01", "2026-04-15", "2026-03-06", 920_000_000, 920_000_000, 941_000_000),
    ("t-003", "1.2.2", "Ростверк БС-1", "БС-1 · фундамент", "P2", 100, "done", "Петров В.А.",
     "2026-04-10", "2026-05-15", "2026-04-19", 360_000_000, 360_000_000, 358_000_000),
    ("t-004", "1.3.1", "Монолит этажи 1-6 БС-1", "БС-1 · этажи 1-6", "P3", 72, "in_progress", "Петров В.А.",
     "2026-05-01", "2026-09-30", "2026-05-22", 2_100_000_000, 1_512_000_000, 1_584_000_000),
    ("t-005", "1.3.2", "Монолит этажи 7-12 БС-1", "БС-1 · этажи 7-12", "P3", 0, "planned", "Петров В.А.",
     "2026-08-01", "2026-12-31", None, 2_100_000_000, 0, 0),
    ("t-006", "2.1.1", "Земляные работы БС-2", "БС-2 · фундамент", "P1", 100, "done", "Сидоров К.Н.",
     "2026-02-15", "2026-04-15", "2026-02-20", 480_000_000, 480_000_000, 489_000_000),
    ("t-007", "2.2.1", "Свайное поле БС-2", "БС-2 · фундамент", "P2", 64, "in_progress", "Сидоров К.Н.",
     "2026-04-01", "2026-05-30", "2026-04-23", 920_000_000, 588_800_000, 612_000_000),
    ("t-008", "2.2.2", "Ростверк БС-2", "БС-2 · фундамент", "P2", 0, "blocked", "Сидоров К.Н.",
     "2026-05-20", "2026-06-30", None, 360_000_000, 0, 0),
    ("t-009", "2.3.1", "Монолит этажи 1-6 БС-2", "БС-2 · этажи 1-6", "P3", 0, "planned", "Сидоров К.Н.",
     "2026-06-15", "2026-11-30", None, 2_100_000_000, 0, 0),
    ("t-010", "3.1.1", "Подземный паркинг · монолит", "Паркинг / подземный", "P2", 58, "in_progress", "Иванов А.С.",
     "2026-03-01", "2026-08-31", "2026-03-15", 1_400_000_000, 812_000_000, 845_000_000),
    ("t-011", "4.1.1", "Внутренние сети инженерии БС-1", "БС-1 · этажи 1-6", "P5", 0, "planned", "Ким Е.В.",
     "2026-09-01", "2026-12-31", None, 680_000_000, 0, 0),
    ("t-012", "7.1.1", "Благоустройство и МАФ", "Благоустройство", "P7", 0, "planned", "Жанабаева Г.К.",
     "2027-04-01", "2027-09-30", None, 520_000_000, 0, 0),
    ("t-013", "2.3.2", "Монолит этажи 7-12 БС-2", "БС-2 · этажи 7-12", "P3", 0, "planned", "Сидоров К.Н.",
     "2026-10-15", "2027-03-31", None, 2_100_000_000, 0, 0),
    ("t-014", "4.2.1", "Фасад и витражи БС-1", "БС-1 · этажи 1-6", "P4", 0, "planned", "Иванов А.С.",
     "2026-12-01", "2027-04-30", None, 980_000_000, 0, 0),
    ("t-015", "4.2.2", "Фасад и витражи БС-2", "БС-2 · этажи 1-6", "P4", 0, "planned", "Иванов А.С.",
     "2027-03-15", "2027-07-31", None, 980_000_000, 0, 0),
    ("t-016", "4.3.1", "Кровля и парапеты (БС-1, БС-2)", "БС-1 · этажи 7-12", "P4", 0, "planned", "Иванов А.С.",
     "2027-02-01", "2027-06-30", None, 420_000_000, 0, 0),
    ("t-017", "6.1.1", "Чистовая отделка квартир и МОП", "БС-1 · этажи 1-6", "P6", 0, "planned", "Ким Е.В.",
     "2027-04-01", "2027-10-31", None, 1_840_000_000, 0, 0),
    ("t-018", "8.1.1", "Пусконаладка инженерных систем", "БС-1 · этажи 7-12", "P8", 0, "planned", "Ахметов Р.Н.",
     "2027-09-01", "2027-11-30", None, 280_000_000, 0, 0),
    ("t-019", "8.2.1", "Сдача объекта, акты ГПК и разрешение на ввод", "Благоустройство", "P8", 0, "planned", "Иванов А.С.",
     "2027-11-15", "2027-12-15", None, 80_000_000, 0, 0),
]

# zone, plan_pct, fact_pct, lag_days (снимок на data_date = 2026-06-01)
ZONE_PLAN_FACT = [
    ("БС-1 · фундамент", 100.0, 100.0, 0),
    ("БС-1 · этажи 1-6", 74.0, 72.0, 5),
    ("БС-1 · этажи 7-12", 0.0, 0.0, 0),
    ("БС-2 · фундамент", 78.0, 62.0, 14),
    ("БС-2 · этажи 1-6", 0.0, 0.0, 0),
    ("БС-2 · этажи 7-12", 0.0, 0.0, 0),
    ("Паркинг / подземный", 58.0, 58.0, 0),
    ("Благоустройство", 0.0, 0.0, 0),
]

# kind, severity, delta_pct, description, zone, task_id, days_ago
DEVIATIONS = [
    ("schedule", "critical", -16.0, "Не начата критическая задача ростверк БС-2 — каскадирует на монолит 1-6 БС-2.",
     "БС-2 · фундамент", "t-008", 18),
    ("schedule", "risk", -10.0, "Простой буровой установки 6 дн. из-за отказа гидросистемы.",
     "БС-2 · фундамент", "t-007", 21),
    ("quality", "attention", None, "Замечание ССК по защитному слою ростверка БС-1 — устранено.",
     "БС-1 · фундамент", "t-003", 27),
]


def seed() -> None:
    db = SessionLocal()
    try:
        if db.get(ConstructionProject, PROJECT_ID) is not None:
            print(f"Проект {PROJECT_ID} уже существует — пропуск seed.")
            return

        data_date = _d("2026-06-01")

        project = ConstructionProject(
            project_id=PROJECT_ID,
            name="ЖК «Highvill Astana» · 2-я очередь",
            developer="BI Group",
            bac=48_000_000_000,
            data_date=data_date,
            plan_start=_d("2026-01-15"),
            plan_finish=_d("2027-12-31"),
            fact_start=_d("2026-01-20"),
        )
        db.add(project)

        db.flush()  # проект должен существовать до вставки зависимых записей

        for pid, name, color, ps, pf in PHASES:
            db.add(Phase(phase_id=pid, project_id=PROJECT_ID, name=name, color=color,
                         plan_start=_d(ps), plan_finish=_d(pf)))
        db.flush()

        for (tid, wbs, name, zone, phase, actual, status, resp, ps, pf, fs, pv, ev, ac) in TASKS:
            db.add(ScheduleTask(
                task_id=tid, project_id=PROJECT_ID, wbs_code=wbs, name=name, zone=zone,
                phase_id=phase, planned_progress_pct=100.0, actual_progress_pct=float(actual),
                status=status, responsible=resp,
                plan_start=_d(ps), plan_finish=_d(pf), fact_start=_d(fs) if fs else None,
                pv=pv, ev=ev, ac=ac,
            ))
        db.flush()  # задачи должны существовать до вставки отклонений (FK task_id)

        for zone, plan_pct, fact_pct, lag in ZONE_PLAN_FACT:
            db.add(ZonePlanFact(
                id=uuid.uuid4(), project_id=PROJECT_ID, zone=zone, date=data_date,
                plan_pct=plan_pct, fact_pct=fact_pct, lag_days=lag,
            ))

        now = dt.datetime.utcnow()
        for kind, severity, delta, desc, zone, task_id, days_ago in DEVIATIONS:
            db.add(Deviation(
                id=uuid.uuid4(), project_id=PROJECT_ID, task_id=task_id, zone=zone,
                kind=kind, severity=severity, delta_pct=delta, description=desc,
                detected_at=now - dt.timedelta(days=days_ago),
            ))

        # Помесячная S-кривая PV/EV/AC от старта до data_date (упрощённо, кумулятивно)
        _seed_progress_curve(db, project, data_date)

        # Демо-бригада и бригадир с фиксированным invite_code для теста бота.
        crew = Crew(
            crew_id=uuid.uuid4(), project_id=PROJECT_ID, name="Монолит-1 (БС-1)",
            contractor_name="КазСтройМонолит", specialization="Монолитные работы",
            planned_headcount=18,
        )
        db.add(crew)
        db.flush()
        db.add(Foreman(
            foreman_id=uuid.uuid4(), project_id=PROJECT_ID,
            full_name="Ержан Бектасов", phone="+7 701 000 00 00", role="brigadier",
            crew_id=crew.crew_id, default_zone="БС-1 · этажи 1-6",
            telegram_link_status="invited", invite_code="INV-DEMO01",
        ))

        db.commit()
        print(f"Seed завершён: проект {PROJECT_ID}, {len(TASKS)} задач, {len(PHASES)} фаз.")
        print("Демо-бригадир Ержан Бектасов, invite_code = INV-DEMO01")
    finally:
        db.close()


def _seed_progress_curve(db, project, data_date: dt.date) -> None:
    """Кумулятивная помесячная S-кривая от plan_start до plan_finish.

    PV растёт по всему графику; EV/AC накапливаются только до data_date.
    """
    tasks = TASKS
    total_pv = sum(t[11] for t in tasks)
    total_ev = sum(t[12] for t in tasks)
    total_ac = sum(t[13] for t in tasks)

    start = project.plan_start
    finish = project.plan_finish
    months: list[dt.date] = []
    cur = dt.date(start.year, start.month, 1)
    while cur <= finish:
        months.append(cur)
        cur = dt.date(cur.year + (cur.month // 12), (cur.month % 12) + 1, 1)

    def month_share(ps: dt.date, pf: dt.date, m_start: dt.date) -> float:
        if pf <= ps:
            return 0.0
        m_end = dt.date(m_start.year + (m_start.month // 12), (m_start.month % 12) + 1, 1)
        overlap = (min(pf, m_end) - max(ps, m_start)).days
        span = (pf - ps).days
        return max(0.0, overlap / span) if span else 0.0

    cum_pv = cum_ev = cum_ac = 0.0
    for m in months:
        for (_, _, _, _, _, _, _, _, ps, pf, _, pv, ev, ac) in tasks:
            share = month_share(_d(ps), _d(pf), m)
            cum_pv += pv * share
            if m <= data_date:
                cum_ev = min(total_ev, cum_ev + ev * share)
                cum_ac = min(total_ac, cum_ac + ac * share)
        db.add(ProgressCurvePoint(
            id=uuid.uuid4(), project_id=project.project_id, date=m,
            pv=round(min(total_pv, cum_pv), 2),
            ev=round(cum_ev, 2) if m <= data_date else None,
            ac=round(cum_ac, 2) if m <= data_date else None,
        ))


if __name__ == "__main__":
    seed()
