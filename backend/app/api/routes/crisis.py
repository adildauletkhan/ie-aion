import datetime as dt
import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, WebSocket, WebSocketDisconnect, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.crud import crisis as crisis_crud
from app.db.session import SessionLocal
from app.schemas.crisis import (
    CrisisActionItemRead,
    CrisisActionItemUpdate,
    CrisisEventCreate,
    CrisisEventDetail,
    CrisisEventRead,
    CrisisEventUpdate,
    CrisisExecutionBundle,
    CrisisExecutionMonitoringRead,
    CrisisExecutionPlanRead,
    CrisisImpactAnalysisRead,
    CrisisMonitoringEntryCreate,
    CrisisNotificationRead,
    CrisisResponseScenarioRead,
)
from app.services.crisis import build_action_items, build_chain_baseline, build_execution_plan, build_monitoring_entry, generate_response_scenarios, run_impact_analysis
from app.services.ws_manager import ConnectionManager

router = APIRouter(prefix="/crisis")
manager = ConnectionManager()


def _serialize_event(event) -> CrisisEventRead:
    return CrisisEventRead(
        id=str(event.id),
        eventType=event.event_type,
        severity=event.severity,
        status=event.status,
        title=event.title,
        description=event.description,
        affectedAssetType=event.affected_asset_type,
        affectedAssetId=event.affected_asset_id,
        affectedStage=event.affected_stage,
        currentCapacity=event.current_capacity,
        impactedCapacity=event.impacted_capacity,
        capacityLoss=event.capacity_loss,
        capacityLossPct=event.capacity_loss_pct,
        eventStartDatetime=event.event_start_datetime,
        estimatedDowntimeMinDays=event.estimated_downtime_min_days,
        estimatedDowntimeMaxDays=event.estimated_downtime_max_days,
        estimatedDowntimeBestDays=event.estimated_downtime_best_days,
        actualRecoveryDatetime=event.actual_recovery_datetime,
        detectedBy=event.detected_by,
        createdBy=event.created_by,
        createdAt=event.created_at,
        updatedAt=event.updated_at,
    )


def _serialize_analysis(analysis) -> CrisisImpactAnalysisRead:
    return CrisisImpactAnalysisRead(
        id=str(analysis.id),
        crisisEventId=str(analysis.crisis_event_id),
        analysisRunAt=analysis.analysis_run_at,
        status=analysis.status,
        errorMessage=analysis.error_message,
        directImpact=analysis.direct_impact,
        upstreamImpact=analysis.upstream_impact,
        midstreamImpact=analysis.midstream_impact,
        downstreamImpact=analysis.downstream_impact,
        exportImpact=analysis.export_impact,
        financialImpact=analysis.financial_impact,
        balanceChainBefore=analysis.balance_chain_before,
        balanceChainAfter=analysis.balance_chain_after,
    )


def _serialize_scenario(scenario) -> CrisisResponseScenarioRead:
    return CrisisResponseScenarioRead(
        id=str(scenario.id),
        crisisEventId=str(scenario.crisis_event_id),
        scenarioName=scenario.scenario_name,
        scenarioType=scenario.scenario_type,
        description=scenario.description,
        strategyDetails=scenario.strategy_details,
        baselineFinancialImpact=scenario.baseline_financial_impact,
        mitigatedFinancialImpact=scenario.mitigated_financial_impact,
        netSavings=scenario.net_savings,
        executionComplexity=scenario.execution_complexity,
        executionTimelineDays=scenario.execution_timeline_days,
        dependencies=scenario.dependencies,
        risks=scenario.risks,
        aiGenerated=scenario.ai_generated,
        aiConfidenceScore=scenario.ai_confidence_score,
        aiRanking=scenario.ai_ranking,
        status=scenario.status,
        selectedBy=scenario.selected_by,
        selectedAt=scenario.selected_at,
    )


def _serialize_plan(plan) -> CrisisExecutionPlanRead:
    return CrisisExecutionPlanRead(
        id=str(plan.id),
        crisisEventId=str(plan.crisis_event_id),
        selectedScenarioId=str(plan.selected_scenario_id),
        status=plan.status,
        startDate=plan.start_date,
        targetCompletionDate=plan.target_completion_date,
        plannedFinancialImpact=plan.planned_financial_impact,
        actualFinancialImpact=plan.actual_financial_impact,
        variance=plan.variance,
    )


def _serialize_action(item) -> CrisisActionItemRead:
    return CrisisActionItemRead(
        id=str(item.id),
        executionPlanId=str(item.execution_plan_id),
        phase=item.phase,
        actionTitle=item.action_title,
        actionDescription=item.action_description,
        assignedTo=item.assigned_to,
        deadline=item.deadline,
        completedAt=item.completed_at,
        status=item.status,
        progressPct=item.progress_pct,
        dependsOnActionId=str(item.depends_on_action_id) if item.depends_on_action_id else None,
        blockingReason=item.blocking_reason,
    )


def _serialize_monitoring(record) -> CrisisExecutionMonitoringRead:
    return CrisisExecutionMonitoringRead(
        id=str(record.id),
        executionPlanId=str(record.execution_plan_id),
        recordedAt=record.recorded_at,
        metrics=record.metrics,
        financialMetrics=record.financial_metrics,
        alerts=record.alerts,
    )


def _serialize_notification(notification) -> CrisisNotificationRead:
    return CrisisNotificationRead(
        id=str(notification.id),
        crisisEventId=str(notification.crisis_event_id),
        notificationType=notification.notification_type,
        severity=notification.severity,
        title=notification.title,
        message=notification.message,
        recipientUserId=notification.recipient_user_id,
        recipientRole=notification.recipient_role,
        sentAt=notification.sent_at,
        deliveredAt=notification.delivered_at,
        readAt=notification.read_at,
        sentViaEmail=notification.sent_via_email,
        sentViaWebsocket=notification.sent_via_websocket,
        sentViaSms=notification.sent_via_sms,
    )


async def _broadcast_notification(payload: dict) -> None:
    await manager.broadcast(payload)


def _notify(db: Session, event_id: uuid.UUID, notification_type: str, severity: str, title: str, message: str) -> None:
    notification = crisis_crud.create_notification(
        db,
        {
            "crisis_event_id": event_id,
            "notification_type": notification_type,
            "severity": severity,
            "title": title,
            "message": message,
            "sent_via_websocket": True,
            "sent_via_email": False,
            "sent_via_sms": False,
        },
    )
    payload = _serialize_notification(notification).model_dump(by_alias=True)
    import asyncio

    try:
        asyncio.run(_broadcast_notification(payload))
    except RuntimeError:
        # Best-effort fallback for when event loop is already running.
        pass


def _run_analysis(event_id: uuid.UUID) -> None:
    db = SessionLocal()
    try:
        event = crisis_crud.get_event(db, event_id)
        if not event:
            return
        analysis = crisis_crud.create_impact_analysis(
            db,
            event.id,
            {
                "status": "running",
                "analysis_run_at": dt.datetime.utcnow(),
            },
        )
        baseline = build_chain_baseline(db)
        result = run_impact_analysis(event, baseline)
        crisis_crud.update_impact_analysis(
            db,
            analysis,
            {
                "status": "done",
                "direct_impact": result["direct_impact"],
                "upstream_impact": result["upstream_impact"],
                "midstream_impact": result["midstream_impact"],
                "downstream_impact": result["downstream_impact"],
                "export_impact": result["export_impact"],
                "financial_impact": result["financial_impact"],
                "balance_chain_before": result["balance_chain_before"],
                "balance_chain_after": result["balance_chain_after"],
            },
        )
        crisis_crud.update_event(db, event, {"status": "scenarios_ready"})
        _notify(
            db,
            event.id,
            "analysis_complete",
            "medium",
            "Impact analysis completed",
            f"Analysis completed for event {event.title}.",
        )
    except Exception as exc:  # noqa: BLE001
        if "analysis" in locals():
            crisis_crud.update_impact_analysis(db, analysis, {"status": "error", "error_message": str(exc)})
        if event:
            crisis_crud.update_event(db, event, {"status": "failed"})
    finally:
        db.close()


def _run_scenario_generation(event_id: uuid.UUID) -> None:
    db = SessionLocal()
    try:
        event = crisis_crud.get_event(db, event_id)
        if not event:
            return
        analysis = crisis_crud.get_latest_analysis(db, event_id)
        if not analysis or analysis.status != "done":
            return
        scenarios = generate_response_scenarios(event, {
            "financial_impact": analysis.financial_impact,
            "upstream_impact": analysis.upstream_impact,
        })
        crisis_crud.replace_response_scenarios(db, event_id, scenarios)
        _notify(
            db,
            event.id,
            "scenario_generated",
            "medium",
            "Response scenarios ready",
            f"{len(scenarios)} scenarios generated for {event.title}.",
        )
    finally:
        db.close()


@router.post("/events", response_model=CrisisEventRead, status_code=status.HTTP_201_CREATED)
def create_event(
    payload: CrisisEventCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> CrisisEventRead:
    event_data = payload.model_dump(by_alias=False)
    event_data["capacity_loss"] = event_data["current_capacity"] - event_data["impacted_capacity"]
    event_data["capacity_loss_pct"] = (
        (event_data["capacity_loss"] / event_data["current_capacity"]) * 100 if event_data["current_capacity"] else 0
    )
    event_data["status"] = "analyzing"
    event = crisis_crud.create_event(db, event_data)
    _notify(db, event.id, "event_detected", event.severity, "Critical event detected", event.title)
    background_tasks.add_task(_run_analysis, event.id)
    return _serialize_event(event)


@router.get("/events", response_model=list[CrisisEventRead])
def list_events(
    db: Session = Depends(get_db),
) -> list[CrisisEventRead]:
    return [_serialize_event(event) for event in crisis_crud.list_events(db)]


@router.get("/events/{event_id}", response_model=CrisisEventDetail)
def get_event_detail(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> CrisisEventDetail:
    event = crisis_crud.get_event(db, event_id)
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    analysis = crisis_crud.get_latest_analysis(db, event_id)
    scenarios = crisis_crud.list_response_scenarios(db, event_id)
    plans = crisis_crud.list_execution_plans(db, event_id)
    plan = plans[0] if plans else None
    action_items = crisis_crud.list_action_items(db, plan.id) if plan else []
    return CrisisEventDetail(
        event=_serialize_event(event),
        impact=_serialize_analysis(analysis) if analysis else None,
        scenarios=[_serialize_scenario(scenario) for scenario in scenarios],
        executionPlan=_serialize_plan(plan) if plan else None,
        actionItems=[_serialize_action(item) for item in action_items],
    )


@router.put("/events/{event_id}", response_model=CrisisEventRead)
def update_event(
    event_id: uuid.UUID,
    payload: CrisisEventUpdate,
    db: Session = Depends(get_db),
) -> CrisisEventRead:
    event = crisis_crud.get_event(db, event_id)
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    updated = crisis_crud.update_event(db, event, payload.model_dump(by_alias=False, exclude_unset=True))
    return _serialize_event(updated)


@router.post("/events/{event_id}/analyze", status_code=status.HTTP_202_ACCEPTED)
def analyze_event(
    event_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> dict:
    event = crisis_crud.get_event(db, event_id)
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    crisis_crud.update_event(db, event, {"status": "analyzing"})
    background_tasks.add_task(_run_analysis, event.id)
    return {"status": "running"}


@router.get("/events/{event_id}/impact", response_model=CrisisImpactAnalysisRead)
def get_event_impact(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> CrisisImpactAnalysisRead:
    analysis = crisis_crud.get_latest_analysis(db, event_id)
    if not analysis:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Impact analysis not found")
    return _serialize_analysis(analysis)


@router.post("/events/{event_id}/generate-scenarios", status_code=status.HTTP_202_ACCEPTED)
def generate_scenarios(
    event_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> dict:
    event = crisis_crud.get_event(db, event_id)
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    background_tasks.add_task(_run_scenario_generation, event.id)
    return {"status": "running"}


@router.get("/events/{event_id}/scenarios", response_model=list[CrisisResponseScenarioRead])
def list_scenarios(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> list[CrisisResponseScenarioRead]:
    return [_serialize_scenario(scenario) for scenario in crisis_crud.list_response_scenarios(db, event_id)]


@router.post("/scenarios/{scenario_id}/select", response_model=CrisisResponseScenarioRead)
def select_scenario(
    scenario_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> CrisisResponseScenarioRead:
    scenario = crisis_crud.get_response_scenario(db, scenario_id)
    if not scenario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scenario not found")
    updated = crisis_crud.select_response_scenario(db, scenario, selected_by="Crisis Team")
    crisis_crud.update_event(db, scenario.event, {"status": "executing"})
    return _serialize_scenario(updated)


@router.post("/scenarios/{scenario_id}/execute", response_model=CrisisExecutionBundle)
def execute_scenario(
    scenario_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> CrisisExecutionBundle:
    scenario = crisis_crud.get_response_scenario(db, scenario_id)
    if not scenario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scenario not found")
    plan_payload = build_execution_plan(scenario)
    plan_payload["crisis_event_id"] = scenario.crisis_event_id
    plan_payload["selected_scenario_id"] = scenario.id
    plan = crisis_crud.create_execution_plan(db, plan_payload)
    items = crisis_crud.add_action_items(db, build_action_items(plan.id))
    crisis_crud.add_monitoring_entry(db, build_monitoring_entry(plan.id, scenario.scenario_name))
    return CrisisExecutionBundle(
        plan=_serialize_plan(plan),
        actionItems=[_serialize_action(item) for item in items],
    )


@router.get("/events/{event_id}/execution", response_model=CrisisExecutionBundle)
def get_execution(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> CrisisExecutionBundle:
    plans = crisis_crud.list_execution_plans(db, event_id)
    if not plans:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Execution plan not found")
    plan = plans[0]
    items = crisis_crud.list_action_items(db, plan.id)
    return CrisisExecutionBundle(plan=_serialize_plan(plan), actionItems=[_serialize_action(item) for item in items])


@router.put("/actions/{action_id}", response_model=CrisisActionItemRead)
def update_action(
    action_id: uuid.UUID,
    payload: CrisisActionItemUpdate,
    db: Session = Depends(get_db),
) -> CrisisActionItemRead:
    item = crisis_crud.get_action_item(db, action_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Action item not found")
    updated = crisis_crud.update_action_item(db, item, payload.model_dump(by_alias=False, exclude_unset=True))
    return _serialize_action(updated)


@router.get("/events/{event_id}/monitoring", response_model=list[CrisisExecutionMonitoringRead])
def list_monitoring(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> list[CrisisExecutionMonitoringRead]:
    plans = crisis_crud.list_execution_plans(db, event_id)
    if not plans:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Execution plan not found")
    monitoring = crisis_crud.list_monitoring_entries(db, plans[0].id)
    return [_serialize_monitoring(record) for record in monitoring]


@router.post("/events/{event_id}/monitoring", response_model=CrisisExecutionMonitoringRead, status_code=201)
def add_monitoring(
    event_id: uuid.UUID,
    payload: CrisisMonitoringEntryCreate,
    db: Session = Depends(get_db),
) -> CrisisExecutionMonitoringRead:
    plans = crisis_crud.list_execution_plans(db, event_id)
    if not plans:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Execution plan not found")
    plan = plans[0]
    metrics = {}
    if payload.utilization_refineries is not None:
        metrics["utilization_refineries"] = payload.utilization_refineries
    if payload.export_volumes is not None:
        metrics["export_volumes"] = payload.export_volumes
    if payload.note:
        metrics["note"] = payload.note
    financial = {}
    if payload.planned_impact is not None:
        financial["planned_impact"] = payload.planned_impact
    if payload.actual_impact is not None:
        financial["actual_impact"] = payload.actual_impact
    if payload.variance_pct is not None:
        financial["variance_pct"] = payload.variance_pct
    alerts = []
    if payload.alert_message:
        alerts.append({"type": "manual", "severity": payload.alert_severity or "info", "message": payload.alert_message})
    entry = crisis_crud.add_monitoring_entry(db, {
        "execution_plan_id": plan.id,
        "metrics": metrics or None,
        "financial_metrics": financial or None,
        "alerts": alerts or None,
    })
    return _serialize_monitoring(entry)


@router.websocket("/ws/crisis-alerts")
async def crisis_alerts(websocket: WebSocket) -> None:
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
