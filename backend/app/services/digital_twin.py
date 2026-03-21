from app.schemas.digital_twin import ScenarioResult, StageInput, StageResultRow


def run_scenario(stages: list[StageInput]) -> ScenarioResult:
    rows: list[StageResultRow] = []
    for stage in stages:
        total_plan = stage.plan_corp + stage.plan_gov
        utilization = (total_plan / stage.capacity) * 100 if stage.capacity > 0 else 0
        status = "red" if utilization > 95 else "yellow" if utilization > 80 else "green"
        rows.append(
            StageResultRow(
                stage=stage.stage,
                label=stage.label,
                capacity=stage.capacity,
                plan_gov=stage.plan_gov,
                plan_corp=stage.plan_corp,
                total_plan=total_plan,
                utilization=utilization,
                status=status,
                is_bottleneck=False,
            )
        )

    bottleneck_idx = min(range(len(rows)), key=lambda idx: rows[idx].capacity - rows[idx].total_plan)
    rows[bottleneck_idx].is_bottleneck = True

    feasible_volume = min(row.capacity for row in rows) if rows else 0
    total_planned = max(row.total_plan for row in rows) if rows else 0
    gap = feasible_volume - total_planned

    return ScenarioResult(
        feasible_volume=feasible_volume,
        bottleneck_stage=rows[bottleneck_idx].stage if rows else "",
        bottleneck_label=rows[bottleneck_idx].label if rows else "",
        gap=gap,
        stages=rows,
    )
