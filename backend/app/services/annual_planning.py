from collections import defaultdict

from sqlalchemy.orm import Session

from app.models.annual_plan import AnnualPlanLine, AnnualPlanScenario
from app.models.master_data import ExportDestination, OilField, ProcessingPlant, TransportationSection


def build_baseline_lines(db: Session, scenario: AnnualPlanScenario) -> None:
    db.query(AnnualPlanLine).filter(AnnualPlanLine.scenario_id == scenario.id).delete()
    lines = []
    for asset in db.query(OilField).order_by(OilField.id.asc()).all():
        monthly = [round(asset.current_month, 2) for _ in range(12)]
        lines.append(
            AnnualPlanLine(
                scenario_id=scenario.id,
                stage="UP",
                asset_type="oil_field",
                asset_code=asset.code,
                asset_name=asset.name,
                capacity=asset.capacity,
                monthly_plan=monthly,
                notes="",
            )
        )
    for asset in db.query(TransportationSection).order_by(TransportationSection.id.asc()).all():
        monthly = [round(asset.current_month, 2) for _ in range(12)]
        lines.append(
            AnnualPlanLine(
                scenario_id=scenario.id,
                stage="MID",
                asset_type="transportation_section",
                asset_code=asset.code,
                asset_name=asset.name,
                capacity=asset.capacity,
                monthly_plan=monthly,
                notes="",
            )
        )
    for asset in db.query(ProcessingPlant).order_by(ProcessingPlant.id.asc()).all():
        monthly = [round(asset.current_month, 2) for _ in range(12)]
        lines.append(
            AnnualPlanLine(
                scenario_id=scenario.id,
                stage="DOWN",
                asset_type="processing_plant",
                asset_code=asset.code,
                asset_name=asset.name,
                capacity=asset.capacity,
                monthly_plan=monthly,
                notes="",
            )
        )
    for asset in db.query(ExportDestination).order_by(ExportDestination.id.asc()).all():
        monthly = [round(asset.current_month, 2) for _ in range(12)]
        lines.append(
            AnnualPlanLine(
                scenario_id=scenario.id,
                stage="EXPORT",
                asset_type="export_destination",
                asset_code=asset.code,
                asset_name=asset.name,
                capacity=asset.capacity,
                monthly_plan=monthly,
                notes="",
            )
        )
    db.add_all(lines)
    db.commit()


def validate_plan(lines: list[AnnualPlanLine]) -> tuple[list[dict], dict]:
    totals = defaultdict(lambda: {"plan": [0.0] * 12, "capacity": 0.0})
    for line in lines:
        stage = line.stage
        totals[stage]["capacity"] += line.capacity
        for idx, value in enumerate(line.monthly_plan):
            totals[stage]["plan"][idx] += value

    issues: list[dict] = []
    bottleneck = {"stage": "", "month": 1, "gap": float("inf")}

    for stage, data in totals.items():
        capacity = data["capacity"]
        for month_idx, plan in enumerate(data["plan"], start=1):
            gap = capacity - plan
            if gap < bottleneck["gap"]:
                bottleneck = {"stage": stage, "month": month_idx, "gap": gap}
            if gap < 0:
                issues.append(
                    {
                        "severity": "critical",
                        "month": month_idx,
                        "stage": stage,
                        "asset_code": None,
                        "message": f"{stage}: план превышает мощность на {abs(gap):.1f}",
                        "gap": gap,
                    }
                )

    for month_idx in range(1, 13):
        up = totals.get("UP", {}).get("plan", [0.0] * 12)[month_idx - 1]
        down = totals.get("DOWN", {}).get("plan", [0.0] * 12)[month_idx - 1]
        export = totals.get("EXPORT", {}).get("plan", [0.0] * 12)[month_idx - 1]
        if down + export > up and up > 0:
            diff = up - (down + export)
            issues.append(
                {
                    "severity": "critical",
                    "month": month_idx,
                    "stage": "CHAIN",
                    "asset_code": None,
                    "message": f"CHAIN: переработка+экспорт превышают добычу на {abs(diff):.1f}",
                    "gap": diff,
                }
            )

    return issues, bottleneck
