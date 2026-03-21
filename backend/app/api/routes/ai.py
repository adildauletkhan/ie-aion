import json
import re
import tempfile

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import StreamingResponse
from openai import OpenAI
from pydantic import BaseModel
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.core.config import get_settings
from app.models.annual_plan import AnnualPlan, AnnualPlanScenario, AnnualPlanLine, AnnualPlanIssue
from app.models.crisis import (
    CrisisEvent,
    CrisisImpactAnalysis,
    CrisisResponseScenario,
    CrisisExecutionPlan,
    CrisisActionItem,
    CrisisExecutionMonitoring,
)
from app.models.entity import Entity
from app.models.master_data import (
    ExportDestination,
    ExtractionCompany,
    Ngdu,
    NpsStation,
    OilField,
    ProcessingPlant,
    TransportationCompany,
    TransportationSection,
)
from app.models.reservoir_twin import ReservoirHorizon, ReservoirFormation, ReservoirDrainageZone
from app.models.scenario import Scenario
from app.models.scenario_result import ScenarioResult
from app.schemas.ai import AiChatRequest, AiChatResponse

router = APIRouter(prefix="/ai")

# ─── helpers ──────────────────────────────────────────────────────────────────

def _summarize_assets(db: Session, model, label: str) -> dict:
    try:
        total_capacity = db.query(func.coalesce(func.sum(model.capacity), 0)).scalar() or 0
    except Exception:
        total_capacity = 0
    count = db.query(model).count()
    items = db.query(model).all()
    rows = []
    for asset in items:
        row = {
            "code": getattr(asset, "code", None),
            "name": getattr(asset, "name", None),
            "region": getattr(asset, "region", None),
            "status": getattr(asset, "status", None),
        }
        for f in ("capacity", "current_month", "current_day"):
            v = getattr(asset, f, None)
            if v is not None:
                row[f] = round(float(v), 2)
        rows.append(row)
    return {"label": label, "count": count, "total_capacity": float(total_capacity), "assets": rows}


def _wells_summary(db: Session) -> list[dict]:
    sql = text("""
        SELECT
            of.name                AS oil_field_name,
            w.well_type,
            w.status,
            COUNT(*)               AS well_count
        FROM wells w
        LEFT JOIN oil_fields of ON w.oil_field_id = of.id
        GROUP BY of.name, w.well_type, w.status
        ORDER BY of.name, w.well_type
    """)
    rows = db.execute(sql).mappings().all()
    fields: dict[str, dict] = {}
    for row in rows:
        fn = row["oil_field_name"] or "Unknown"
        if fn not in fields:
            fields[fn] = {"oil_field": fn, "total_wells": 0, "by_type": {}, "by_status": {}}
        fields[fn]["total_wells"] += row["well_count"]
        wt = row["well_type"] or "unknown"
        fields[fn]["by_type"][wt] = fields[fn]["by_type"].get(wt, 0) + row["well_count"]
        st = row["status"] or "unknown"
        fields[fn]["by_status"][st] = fields[fn]["by_status"].get(st, 0) + row["well_count"]
    return list(fields.values())


def _build_context(db: Session, sources: dict) -> tuple[dict, list[str]]:
    context: dict = {}
    used_sources: list[str] = []

    # ── Master data + infrastructure ──────────────────────────────────────────
    if sources.get("master_data"):
        context["master_data"] = {
            "extraction_companies":    _summarize_assets(db, ExtractionCompany, "extraction_companies"),
            "oil_fields":              _summarize_assets(db, OilField, "oil_fields"),
            "processing_plants":       _summarize_assets(db, ProcessingPlant, "processing_plants"),
            "transportation_companies":_summarize_assets(db, TransportationCompany, "transportation_companies"),
            "transportation_sections": _summarize_assets(db, TransportationSection, "transportation_sections"),
            "export_destinations":     _summarize_assets(db, ExportDestination, "export_destinations"),
            "ngdu_list": [
                {"id": n.id, "name": n.name, "status": n.status}
                for n in db.query(Ngdu).all()
            ],
            "nps_stations": [
                {
                    "name": n.name, "code": getattr(n, "code", None),
                    "capacity": round(float(n.capacity), 2) if n.capacity else None,
                    "status": n.status,
                }
                for n in db.query(NpsStation).all()
            ],
        }
        # Wells grouped by oil field
        try:
            context["wells"] = _wells_summary(db)
        except Exception:
            pass
        used_sources.append("master_data")

    # ── Geology / Reservoir ────────────────────────────────────────────────────
    if sources.get("geology"):
        horizons = db.query(ReservoirHorizon).all()
        formations = db.query(ReservoirFormation).all()
        zones = db.query(ReservoirDrainageZone).all()
        context["geology"] = {
            "horizons": [
                {
                    "id": h.id, "name": h.name, "code": h.code,
                    "depth_top": h.depth_top, "depth_bottom": h.depth_bottom,
                    "lithology": h.lithology,
                    "porosity": h.porosity, "permeability": h.permeability,
                    "effective_thickness": h.effective_thickness,
                }
                for h in horizons
            ],
            "formations_count": len(formations),
            "formations_summary": [
                {
                    "code": f.code, "name": f.name,
                    "area": round(f.area, 2) if f.area else None,
                    "porosity": round(f.porosity, 4) if f.porosity else None,
                    "permeability": round(f.permeability, 4) if f.permeability else None,
                    "saturation_oil": round(f.saturation_oil, 4) if f.saturation_oil else None,
                }
                for f in formations
            ],
            "drainage_zones": [
                {"code": z.code, "name": z.name}
                for z in zones
            ],
        }
        used_sources.append("geology")

    # ── Scenarios ─────────────────────────────────────────────────────────────
    if sources.get("scenarios"):
        items = db.query(Scenario).order_by(Scenario.created_at.desc()).limit(20).all()
        context["scenarios"] = [
            {
                "name": s.name,
                "description": s.description,
                "status": s.status,
                "owner": s.owner,
                "approval_status": s.approval_status,
                "usd_kzt": s.usd_kzt,
                "oil_price_kz": s.oil_price_kz,
                "brent_price": s.brent_price,
                "kzt_inflation": s.kzt_inflation,
                "created_at": s.created_at.isoformat() if s.created_at else None,
            }
            for s in items
        ]
        used_sources.append("scenarios")

    # ── Annual plans ──────────────────────────────────────────────────────────
    if sources.get("annual_plans"):
        plans = db.query(AnnualPlan).order_by(AnnualPlan.created_at.desc()).limit(10).all()
        plan_data = []
        for p in plans:
            scenarios_count = db.query(AnnualPlanScenario).filter(
                AnnualPlanScenario.plan_id == p.id
            ).count()
            issues = db.query(AnnualPlanIssue).join(
                AnnualPlanScenario, AnnualPlanIssue.scenario_id == AnnualPlanScenario.id
            ).filter(
                AnnualPlanScenario.plan_id == p.id
            ).all()
            plan_data.append({
                "name": p.name,
                "year": p.year,
                "status": p.status,
                "baseline_source": p.baseline_source,
                "scenarios_count": scenarios_count,
                "issues_count": len(issues),
                "critical_issues": sum(1 for i in issues if i.severity == "critical"),
            })
        context["annual_plans"] = plan_data
        used_sources.append("annual_plans")

    # ── Scenario results ───────────────────────────────────────────────────────
    if sources.get("results"):
        results = (
            db.query(ScenarioResult, Scenario)
            .join(Scenario, ScenarioResult.scenario_id == Scenario.id)
            .order_by(ScenarioResult.id.desc())
            .limit(20)
            .all()
        )
        context["scenario_results"] = [
            {
                "scenario": sc.name,
                "owner": sc.owner,
                "total_gap": r.total_gap,
                "bottleneck": r.bottleneck,
                "utilization": round(r.utilization, 2) if r.utilization else None,
            }
            for r, sc in results
        ]
        used_sources.append("results")

    # ── Crisis management ──────────────────────────────────────────────────────
    if sources.get("crisis"):
        events = db.query(CrisisEvent).order_by(CrisisEvent.created_at.desc()).limit(30).all()
        crisis_data = []
        for e in events:
            actions = db.query(CrisisActionItem).join(
                CrisisExecutionPlan,
                CrisisActionItem.execution_plan_id == CrisisExecutionPlan.id
            ).filter(
                CrisisExecutionPlan.crisis_event_id == e.id
            ).all()
            crisis_data.append({
                "title": e.title,
                "event_type": e.event_type,
                "severity": e.severity,
                "status": e.status,
                "affected_stage": e.affected_stage,
                "capacity_loss_pct": round(e.capacity_loss_pct, 2) if e.capacity_loss_pct else 0,
                "capacity_loss": round(e.capacity_loss, 2) if e.capacity_loss else 0,
                "started": e.event_start_datetime.isoformat() if e.event_start_datetime else None,
                "actions_total": len(actions),
                "actions_done": sum(1 for a in actions if a.status == "done"),
            })
        context["crisis_events"] = crisis_data
        used_sources.append("crisis")

    # ── Entities (production balance chain) ───────────────────────────────────
    if sources.get("entities"):
        entities = db.query(Entity).all()
        context["entities"] = [
            {
                "entity": e.entity,
                "type": e.type,
                "capacity": round(float(e.capacity), 2),
                "gov_plan": round(float(e.gov_plan), 2),
                "corp_plan": round(float(e.corp_plan), 2),
                "region": e.region,
                "status": e.status,
            }
            for e in entities
        ]
        used_sources.append("entities")

    return context, used_sources


# ─── Direct lookup (fast-path, skip GPT for entity name queries) ──────────────

# Questions that ask for counts/stats must go to GPT, not _direct_answer
_ANALYTICAL_TRIGGERS = {
    "сколько", "количество", "число", "кол-во", "статистика", "итого",
    "всего", "суммарно", "среднее", "среднем", "процент", "доля",
    "динамика", "тренд", "план", "факт", "прогноз", "отклонение",
    "сравни", "сравнение", "анализ", "аналитика", "почему", "причина",
    "эффективность", "загрузка", "использование", "потери", "дефицит",
    "узкое", "бутылочное", "рекомендуй", "рекомендация", "оцени",
    "how many", "count", "total", "sum", "average", "statistics",
    "trend", "forecast", "compare", "analysis", "why", "recommend",
}

_STOP_WORDS = {
    "чем", "что", "как", "где", "кто", "когда", "сколько", "какой", "какая",
    "какие", "какое", "это", "есть", "или", "все", "для", "про", "при", "под",
    "над", "без", "был", "была", "были", "быть", "ты", "мне", "мы", "вы",
    "он", "она", "они", "его", "её", "их", "по", "на", "в", "с", "из", "к",
    "за", "об", "у", "о", "и", "а", "но", "не", "да", "же", "ли", "бы",
    "можешь", "можете", "можно", "помочь", "помощь", "скажи", "расскажи",
    "покажи", "дай", "дайте", "узнать", "узнай", "хочу", "хочешь",
    "the", "what", "how", "where", "who", "which", "is", "are", "was",
    "were", "do", "does", "can", "could", "would", "should", "have", "has",
    "had", "be", "been", "being", "of", "to", "in", "for", "on", "at",
}

_MIN_TOKEN_LEN = 3


def _word_match(token: str, text: str) -> bool:
    return bool(re.search(r"(?<![а-яa-z0-9])" + re.escape(token) + r"(?![а-яa-z0-9])", text))


def _direct_answer(db: Session, question: str) -> str | None:
    normalized = question.lower()
    raw_tokens = {t for t in re.split(r"[^a-zA-Z0-9А-Яа-я]+", normalized) if t}
    tokens = {t for t in raw_tokens if len(t) >= _MIN_TOKEN_LEN and t not in _STOP_WORDS}
    if not tokens:
        return None
    models = [
        (ProcessingPlant, "Завод"),
        (OilField, "Месторождение"),
        (ExtractionCompany, "Добывающая компания"),
        (TransportationSection, "Участок транспортировки"),
        (TransportationCompany, "Транспортная компания"),
        (ExportDestination, "Экспорт"),
    ]
    matches: list[str] = []
    seen_codes: set[str] = set()
    for model, label in models:
        for asset in db.query(model).all():
            name = asset.name or ""
            code = asset.code or ""
            short_name = (getattr(asset, "short_name", None) or "").lower()
            name_lower = name.lower()
            code_lower = code.lower()
            short_match = short_name and short_name in tokens
            name_match = any(_word_match(token, name_lower) for token in tokens)
            code_match = any(_word_match(token, code_lower) for token in tokens)
            if short_match or name_match or code_match:
                if code and code in seen_codes:
                    continue
                seen_codes.add(code)
                matches.append(
                    "\n".join([
                        f"{label}: {name}",
                        f"Код: {code or '—'}",
                        f"Краткое название: {short_name or '—'}",
                        f"Мощность: {asset.capacity:.0f} тыс. тонн/год",
                        f"Текущий месяц: {asset.current_month:.0f} тыс. тонн",
                        f"Текущие сутки: {asset.current_day:.0f} тыс. тонн",
                    ])
                )
    if not matches:
        return None
    return "Краткий ответ\n\n" + "\n\n".join(matches)


# ─── Main endpoint ─────────────────────────────────────────────────────────────

@router.post("/chat", response_model=AiChatResponse)
def ai_chat(
    payload: AiChatRequest,
    _user=Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AiChatResponse:
    settings = get_settings()
    if not settings.openai_api_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OPENAI_API_KEY is not configured",
        )

    context, used_sources = _build_context(db, payload.sources.model_dump(by_alias=False))

    system_prompt = (
        "You are a structured analytics assistant for an oil & gas digital twin platform (Integrated Enterprise). "
        "The context contains all available data: master data (oil fields, extraction companies, plants, transport, export), "
        "wells statistics per oil field (total_wells, by_type, by_status), "
        "geology (horizons, formations, drainage zones with porosity/permeability), "
        "scenarios with economic parameters (USD/KZT, Brent price, inflation), "
        "annual plans with issue tracking, "
        "scenario calculation results (gap, bottleneck, utilization), "
        "crisis events (type, severity, capacity loss, action progress), "
        "and production chain entities. "
        "RULES: "
        "1. Always respond in the SAME language the user used (Russian or English). "
        "2. Use exact numbers from context. If data is missing, say clearly. "
        "3. Never expose user data (passwords, emails). "
        "4. Structure your answer as plain text with sections:\n"
        "Краткий ответ\n\n<direct answer>\n\n"
        "Детали\n\n<numbers and supporting data>\n\n"
        "Источники\n\n<which data sources were used>\n"
        "5. No Markdown (no **, ##, -, *). Plain text only."
    )

    q_lower = payload.question.lower()
    is_analytical = any(trigger in q_lower for trigger in _ANALYTICAL_TRIGGERS)

    client = OpenAI(api_key=settings.openai_api_key)

    if not payload.skip_direct_answer and not is_analytical:
        direct = _direct_answer(db, payload.question)
        if direct:
            return AiChatResponse(answer=direct, usedSources=used_sources)

    try:
        response = client.chat.completions.create(
            model=settings.openai_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": json.dumps(
                    {"question": payload.question, "context": context},
                    ensure_ascii=False,
                    default=str,
                )},
            ],
            max_tokens=1500,
        )
        answer = response.choices[0].message.content or ""
        return AiChatResponse(answer=answer, usedSources=used_sources)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI provider error: {exc}",
        ) from exc


# ─── TTS (Text-to-Speech via OpenAI) ──────────────────────────────────────────

class TTSRequest(BaseModel):
    text: str
    voice: str = "nova"


@router.post("/tts")
def ai_tts(
    payload: TTSRequest,
    _user=Depends(get_current_user),
):
    settings = get_settings()
    if not settings.openai_api_key:
        raise HTTPException(status_code=400, detail="OPENAI_API_KEY not configured")

    client = OpenAI(api_key=settings.openai_api_key)
    try:
        response = client.audio.speech.create(
            model="tts-1-hd",
            voice=payload.voice,
            input=payload.text[:4096],
        )
        return StreamingResponse(
            response.iter_bytes(),
            media_type="audio/mpeg",
            headers={"Content-Disposition": "inline; filename=speech.mp3"},
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"TTS error: {exc}") from exc


# ─── STT (Speech-to-Text via OpenAI Whisper) ──────────────────────────────────

@router.post("/stt")
async def ai_stt(
    file: UploadFile = File(...),
    _user=Depends(get_current_user),
):
    settings = get_settings()
    if not settings.openai_api_key:
        raise HTTPException(status_code=400, detail="OPENAI_API_KEY not configured")

    content = await file.read()
    if len(content) > 25 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large (max 25MB)")

    suffix = ".webm"
    if file.filename:
        suffix = "." + file.filename.rsplit(".", 1)[-1] if "." in file.filename else ".webm"

    client = OpenAI(api_key=settings.openai_api_key)
    try:
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=True) as tmp:
            tmp.write(content)
            tmp.flush()
            with open(tmp.name, "rb") as audio_file:
                transcription = client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file,
                )
        return {"text": transcription.text}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"STT error: {exc}") from exc
