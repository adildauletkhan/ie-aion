import datetime as dt

from sqlalchemy.orm import Session

from app.models.master_data import ExportDestination, OilField, ProcessingPlant, TransportationSection


MARGIN_PER_TON = 400  # USD/ton, placeholder for MVP
IMPORT_COST_PER_TON = 520
EXPORT_MARGIN_PER_TON = 120
PENALTY_RATE = 0.08


def build_chain_baseline(db: Session) -> dict:
    upstream_capacity = sum(asset.capacity for asset in db.query(OilField).all())
    midstream_capacity = sum(asset.capacity for asset in db.query(TransportationSection).all())
    downstream_capacity = sum(asset.capacity for asset in db.query(ProcessingPlant).all())
    export_capacity = sum(asset.capacity for asset in db.query(ExportDestination).all())

    upstream_plan = sum(asset.current_month for asset in db.query(OilField).all())
    midstream_plan = sum(asset.current_month for asset in db.query(TransportationSection).all())
    downstream_plan = sum(asset.current_month for asset in db.query(ProcessingPlant).all())
    export_plan = sum(asset.current_month for asset in db.query(ExportDestination).all())

    return {
        "UP": {"capacity": upstream_capacity, "plan": upstream_plan},
        "MID": {"capacity": midstream_capacity, "plan": midstream_plan},
        "DOWN": {"capacity": downstream_capacity, "plan": downstream_plan},
        "EXPORT": {"capacity": export_capacity, "plan": export_plan},
    }


def _downtime_months(best_days: int | None) -> float:
    if not best_days:
        return 1.0
    return max(best_days / 30.0, 0.1)


def run_impact_analysis(event, baseline: dict) -> dict:
    affected_stage = event.affected_stage or "DOWN"
    downtime_months = _downtime_months(event.estimated_downtime_best_days)
    capacity_loss = max(event.capacity_loss, 0)

    balance_before = {stage: dict(values) for stage, values in baseline.items()}
    balance_after = {stage: dict(values) for stage, values in baseline.items()}

    if affected_stage in balance_after:
        balance_after[affected_stage]["capacity"] = max(
            balance_after[affected_stage]["capacity"] - capacity_loss, 0
        )

    downstream_deficit = 0.0
    upstream_surplus = 0.0
    midstream_utilization_drop = 0.0
    export_surplus = 0.0

    if affected_stage == "DOWN":
        downstream_deficit = capacity_loss * 0.35
        upstream_surplus = capacity_loss
        midstream_utilization_drop = 0.37
        export_surplus = capacity_loss * 0.2
    elif affected_stage == "UP":
        downstream_deficit = capacity_loss * 0.6
        export_surplus = 0.0
        midstream_utilization_drop = 0.2
    elif affected_stage == "MID":
        downstream_deficit = capacity_loss * 0.4
        upstream_surplus = capacity_loss * 0.5
    elif affected_stage == "EXPORT":
        export_surplus = capacity_loss
        upstream_surplus = capacity_loss * 0.3

    lost_margin = capacity_loss * downtime_months * MARGIN_PER_TON
    export_discount = export_surplus * downtime_months * EXPORT_MARGIN_PER_TON
    import_costs = downstream_deficit * downtime_months * IMPORT_COST_PER_TON
    penalties = lost_margin * PENALTY_RATE
    total_impact = -(lost_margin + export_discount + import_costs + penalties)

    return {
        "direct_impact": {
            "capacity_loss": capacity_loss,
            "downtime_months": round(downtime_months, 2),
        },
        "upstream_impact": {"surplus": round(upstream_surplus, 1)},
        "midstream_impact": {"utilization_drop": round(midstream_utilization_drop * 100, 1)},
        "downstream_impact": {"deficit": round(downstream_deficit, 1)},
        "export_impact": {"surplus": round(export_surplus, 1)},
        "financial_impact": {
            "lost_margin": -round(lost_margin, 2),
            "export_discount": -round(export_discount, 2),
            "import_costs": -round(import_costs, 2),
            "penalties": -round(penalties, 2),
            "total": round(total_impact, 2),
        },
        "balance_chain_before": balance_before,
        "balance_chain_after": balance_after,
    }


def generate_response_scenarios(event, analysis: dict) -> list[dict]:
    baseline_impact = analysis.get("financial_impact", {}).get("total", -480_000_000)
    baseline_impact = float(baseline_impact)

    scenarios = [
        {
            "scenario_name": "A) Redirect to alternative assets",
            "scenario_type": "redirect",
            "description": "Перенаправление потоков на альтернативные НПЗ и экспорт излишков.",
            "strategy_details": {
                "redirect_assets": ["Ачинск", "Ангарск"],
                "export_volume": analysis.get("upstream_impact", {}).get("surplus", 0),
                "import_products": ["Бензин", "Дизель"],
            },
            "mitigated_financial_impact": baseline_impact * 0.5,
            "execution_complexity": "medium",
            "execution_timeline_days": 7,
            "dependencies": "Контракты с альтернативными НПЗ и логистика",
            "risks": {"capacity": "Высокая загрузка альтернативных НПЗ"},
        },
        {
            "scenario_name": "B) Export + Import",
            "scenario_type": "export_import",
            "description": "Максимальный экспорт сырья и импорт нефтепродуктов.",
            "strategy_details": {"export_focus": True, "import_focus": True},
            "mitigated_financial_impact": baseline_impact * 0.72,
            "execution_complexity": "high",
            "execution_timeline_days": 10,
            "dependencies": "Экспортные окна и международные поставщики",
            "risks": {"supply": "Зависимость от внешних поставщиков"},
        },
        {
            "scenario_name": "C) Reduce production",
            "scenario_type": "reduce_production",
            "description": "Снижение добычи upstream и балансировка запасов.",
            "strategy_details": {"production_cut": analysis.get("upstream_impact", {}).get("surplus", 0)},
            "mitigated_financial_impact": baseline_impact * 0.68,
            "execution_complexity": "low",
            "execution_timeline_days": 5,
            "dependencies": "Согласование с добычей и регулятором",
            "risks": {"restart": "Сложный запуск скважин после простоя"},
        },
    ]

    for idx, scenario in enumerate(scenarios, start=1):
        scenario["baseline_financial_impact"] = baseline_impact
        scenario["net_savings"] = baseline_impact - scenario["mitigated_financial_impact"]
        scenario["ai_generated"] = True
        scenario["ai_confidence_score"] = round(0.8 - idx * 0.05, 2)
        scenario["ai_ranking"] = idx
        scenario["status"] = "draft"

    return sorted(scenarios, key=lambda item: item["net_savings"], reverse=True)


def build_execution_plan(scenario, start_date: dt.date | None = None) -> dict:
    start = start_date or dt.date.today()
    return {
        "status": "active",
        "start_date": start,
        "target_completion_date": start + dt.timedelta(days=scenario.execution_timeline_days),
        "planned_financial_impact": scenario.mitigated_financial_impact,
        "actual_financial_impact": scenario.mitigated_financial_impact * 1.02,
        "variance": scenario.mitigated_financial_impact * 0.02,
    }


def build_action_items(plan_id) -> list[dict]:
    return [
        {
            "execution_plan_id": plan_id,
            "phase": "Phase 1",
            "action_title": "Immediate coordination call",
            "action_description": "Созвон с кризисной командой и подтверждение объема потерь.",
            "assigned_to": "Crisis Lead",
            "deadline": dt.date.today() + dt.timedelta(days=1),
            "status": "pending",
            "progress_pct": 0,
        },
        {
            "execution_plan_id": plan_id,
            "phase": "Phase 1",
            "action_title": "Notify logistics partners",
            "action_description": "Согласовать перенаправление потоков и графики.",
            "assigned_to": "Logistics Ops",
            "deadline": dt.date.today() + dt.timedelta(days=2),
            "status": "pending",
            "progress_pct": 0,
        },
        {
            "execution_plan_id": plan_id,
            "phase": "Phase 2",
            "action_title": "Ramp-up alternative capacity",
            "action_description": "Увеличить загрузку альтернативных НПЗ и экспортных маршрутов.",
            "assigned_to": "Operations",
            "deadline": dt.date.today() + dt.timedelta(days=5),
            "status": "pending",
            "progress_pct": 0,
        },
        {
            "execution_plan_id": plan_id,
            "phase": "Phase 3",
            "action_title": "Steady-state monitoring",
            "action_description": "Контроль фактического исполнения, KPI и отклонений.",
            "assigned_to": "Performance Team",
            "deadline": dt.date.today() + dt.timedelta(days=10),
            "status": "pending",
            "progress_pct": 0,
        },
    ]


def build_monitoring_entry(plan_id, scenario_name: str) -> dict:
    return {
        "execution_plan_id": plan_id,
        "metrics": {
            "utilization_refineries": 0.83,
            "export_volumes": 0.92,
            "scenario": scenario_name,
        },
        "financial_metrics": {
            "planned_impact": -240_000_000,
            "actual_impact": -252_000_000,
            "variance_pct": 5.0,
        },
        "alerts": [
            {"type": "variance", "severity": "warning", "message": "Отклонение 5% от плана."}
        ],
    }
