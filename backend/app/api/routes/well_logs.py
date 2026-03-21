import json
import math
import random
from typing import Any

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api.deps import get_db

router = APIRouter()

# Глобальное хранилище для обученной модели
TRAINED_MODEL = None


def _ensure_well_logs_table(db: Session) -> None:
    db.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS well_logs (
                id SERIAL PRIMARY KEY,
                well_id INTEGER NOT NULL,
                oil_field_id INTEGER,
                file_name VARCHAR(255) NOT NULL,
                file_type VARCHAR(16) NOT NULL,
                depth_curve VARCHAR(64) NOT NULL,
                curves_json TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            )
            """
        )
    )
    db.execute(text("CREATE INDEX IF NOT EXISTS idx_well_logs_well_id ON well_logs (well_id)"))
    db.commit()


def _to_float(value: str) -> float | None:
    try:
        if value is None:
            return None
        normalized = value.strip().replace(",", ".")
        if normalized in {"", "NULL", "NaN", "-999.25", "-9999", "-9999.0"}:
            return None
        parsed = float(normalized)
        if math.isnan(parsed):
            return None
        return parsed
    except Exception:
        return None


def _detect_depth_curve(curves: dict[str, list[float | None]]) -> str:
    for name in curves.keys():
        low = name.lower()
        if "dept" in low or low in {"depth", "md", "tvd", "глубина"}:
            return name
    return next(iter(curves.keys()))


def _parse_las(content: str) -> tuple[dict[str, list[float | None]], str]:
    lines = content.splitlines()
    curve_names: list[str] = []
    in_curve_section = False
    ascii_start = -1

    for idx, raw in enumerate(lines):
        line = raw.strip()
        low = line.lower()
        if low.startswith("~curve"):
            in_curve_section = True
            continue
        if low.startswith("~a"):
            ascii_start = idx + 1
            in_curve_section = False
            break
        if in_curve_section:
            if not line or line.startswith("#"):
                continue
            mnemonic = line.split(".")[0].strip().split()[0]
            if mnemonic:
                curve_names.append(mnemonic)

    if ascii_start < 0:
        raise ValueError("LAS file does not contain ~A section")

    rows: list[list[float | None]] = []
    for raw in lines[ascii_start:]:
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        parts = [p for p in line.replace("\t", " ").split(" ") if p]
        if len(parts) < 2:
            continue
        rows.append([_to_float(p) for p in parts])

    if not rows:
        raise ValueError("No numeric data found in LAS file")

    width = max(len(r) for r in rows)
    if not curve_names or len(curve_names) < width:
        curve_names = curve_names + [f"C{idx + 1}" for idx in range(len(curve_names), width)]

    curves: dict[str, list[float | None]] = {name: [] for name in curve_names[:width]}
    for row in rows:
        padded = row + [None] * (width - len(row))
        for idx in range(width):
            curves[curve_names[idx]].append(padded[idx])

    depth_curve = _detect_depth_curve(curves)
    return curves, depth_curve


def _parse_lis_or_csv(content: str) -> tuple[dict[str, list[float | None]], str]:
    lines = [ln.strip() for ln in content.splitlines() if ln.strip()]
    if len(lines) < 2:
        raise ValueError("File must contain header and data rows")

    header_line = lines[0]
    delimiters = [",", ";", "\t", "|"]
    delimiter = next((d for d in delimiters if d in header_line), None)
    if delimiter:
        headers = [h.strip() for h in header_line.split(delimiter)]
        data_lines = lines[1:]
        rows = [[_to_float(part) for part in ln.split(delimiter)] for ln in data_lines]
    else:
        headers = [h.strip() for h in header_line.split() if h.strip()]
        data_lines = lines[1:]
        rows = [[_to_float(part) for part in ln.split()] for ln in data_lines]

    width = max(len(headers), max(len(r) for r in rows))
    if len(headers) < width:
        headers = headers + [f"C{idx + 1}" for idx in range(len(headers), width)]

    curves: dict[str, list[float | None]] = {name: [] for name in headers[:width]}
    for row in rows:
        padded = row + [None] * (width - len(row))
        for idx in range(width):
            curves[headers[idx]].append(padded[idx])

    depth_curve = _detect_depth_curve(curves)
    return curves, depth_curve


def _linear_fit(xs: list[float], ys: list[float]) -> tuple[float, float]:
    n = len(xs)
    if n < 2:
        return 0.0, ys[0] if ys else 0.0
    sum_x = sum(xs)
    sum_y = sum(ys)
    sum_xx = sum(x * x for x in xs)
    sum_xy = sum(x * y for x, y in zip(xs, ys))
    denom = n * sum_xx - sum_x * sum_x
    if abs(denom) < 1e-12:
        return 0.0, sum_y / n
    a = (n * sum_xy - sum_x * sum_y) / denom
    b = (sum_y - a * sum_x) / n
    return a, b


def _generate_synthetic_well_log(well_num: int, num_points: int = 200, add_gaps: bool = False) -> dict[str, list[float | None]]:
    """Генерирует синтетический каротаж для обучения"""
    random.seed(well_num * 42)
    
    depths = [1500 + i * 2.5 for i in range(num_points)]
    
    # Гамма-каротаж (GR): 20-150 API
    gr_base = 60 + well_num * 2
    gr = [gr_base + 30 * math.sin(d / 50) + random.gauss(0, 5) for d in depths]
    
    # Пористость (NPHI): 0.05-0.35
    nphi_base = 0.15 + (well_num % 5) * 0.03
    nphi = [nphi_base + 0.08 * math.cos(d / 60) + random.gauss(0, 0.02) for d in depths]
    
    # Плотность (RHOB): 2.2-2.8 g/cm3
    rhob_base = 2.5 - (well_num % 3) * 0.1
    rhob = [rhob_base + 0.15 * math.sin(d / 70) + random.gauss(0, 0.03) for d in depths]
    
    # Электрическое сопротивление (RT): 1-100 ohm*m
    rt_base = 10 + well_num * 1.5
    rt = [max(1, rt_base + 20 * math.exp(-((d - 1600) ** 2) / 5000) + random.gauss(0, 2)) for d in depths]
    
    # Добавляем пропуски ТОЛЬКО если add_gaps=True (для тестового файла)
    if add_gaps:
        # Добавляем пропуски группами (реалистичнее)
        i = 0
        while i < num_points:
            if random.random() < 0.15:  # 15% шанс начать пропуск
                gap_length = random.randint(3, 10)  # Пропуск 3-10 точек
                for j in range(i, min(i + gap_length, num_points)):
                    # Пропуски только в NPHI (которую будем восстанавливать)
                    nphi[j] = None
                i += gap_length
            else:
                i += 1
    
    return {
        "DEPT": depths,
        "GR": gr,
        "NPHI": nphi,
        "RHOB": rhob,
        "RT": rt,
    }


def _train_ml_model(training_wells: list[dict[str, list[float | None]]]) -> dict[str, Any]:
    """Обучает ML модель на данных нескольких скважин"""
    all_gr_known = []
    all_nphi_known = []
    all_rhob_known = []
    all_rt_known = []
    
    for well_data in training_wells:
        gr = well_data.get("GR", [])
        nphi = well_data.get("NPHI", [])
        rhob = well_data.get("RHOB", [])
        rt = well_data.get("RT", [])
        
        for i in range(len(gr)):
            if gr[i] is not None and nphi[i] is not None and rhob[i] is not None:
                all_gr_known.append(gr[i])
                all_nphi_known.append(nphi[i])
                all_rhob_known.append(rhob[i])
            if rt[i] is not None:
                all_rt_known.append(rt[i])
    
    # Вычисляем статистики
    gr_mean = sum(all_gr_known) / max(1, len(all_gr_known))
    nphi_mean = sum(all_nphi_known) / max(1, len(all_nphi_known))
    rhob_mean = sum(all_rhob_known) / max(1, len(all_rhob_known))
    rt_mean = sum(all_rt_known) / max(1, len(all_rt_known))
    
    # Простая корреляционная модель
    # NPHI ~ f(GR, RHOB)
    if len(all_gr_known) > 10:
        # Нормализуем данные
        gr_norm = [(g - gr_mean) / max(1, gr_mean) for g in all_gr_known]
        rhob_norm = [(r - rhob_mean) / max(1, rhob_mean) for r in all_rhob_known]
        
        # Множественная линейная регрессия (упрощенная)
        n = len(all_nphi_known)
        sum_nphi = sum(all_nphi_known)
        sum_gr = sum(gr_norm)
        sum_rhob = sum(rhob_norm)
        sum_gr_nphi = sum(g * n for g, n in zip(gr_norm, all_nphi_known))
        sum_rhob_nphi = sum(r * n for r, n in zip(rhob_norm, all_nphi_known))
        sum_gr_sq = sum(g * g for g in gr_norm)
        sum_rhob_sq = sum(r * r for r in rhob_norm)
        sum_gr_rhob = sum(g * r for g, r in zip(gr_norm, rhob_norm))
        
        # Решение системы уравнений (упрощенное)
        denom = n * sum_gr_sq * sum_rhob_sq - sum_gr * sum_gr * sum_rhob_sq - sum_rhob * sum_rhob * sum_gr_sq + 2 * sum_gr * sum_rhob * sum_gr_rhob - n * sum_gr_rhob * sum_gr_rhob
        
        if abs(denom) > 1e-6:
            coef_gr = (sum_gr_nphi * sum_rhob_sq - sum_rhob_nphi * sum_gr_rhob) / denom
            coef_rhob = (sum_rhob_nphi * sum_gr_sq - sum_gr_nphi * sum_gr_rhob) / denom
        else:
            coef_gr = 0.001
            coef_rhob = -0.002
        
        intercept_nphi = (sum_nphi - coef_gr * sum_gr - coef_rhob * sum_rhob) / n
    else:
        coef_gr = 0.001
        coef_rhob = -0.002
        intercept_nphi = nphi_mean
    
    return {
        "type": "multi_well_ml",
        "num_wells": len(training_wells),
        "statistics": {
            "gr_mean": gr_mean,
            "nphi_mean": nphi_mean,
            "rhob_mean": rhob_mean,
            "rt_mean": rt_mean,
        },
        "coefficients": {
            "nphi_from_gr": coef_gr,
            "nphi_from_rhob": coef_rhob,
            "nphi_intercept": intercept_nphi,
        },
    }


def _impute_curve(depth: list[float | None], values: list[float | None], use_ml: bool = False) -> dict[str, Any]:
    x_known: list[float] = []
    y_known: list[float] = []
    missing_before = 0
    # Инициализируем was_missing для всех точек
    was_missing = [v is None for v in values]
    
    for idx, (d, v) in enumerate(zip(depth, values)):
        if v is None:
            missing_before += 1
            continue
        if d is not None:
            x_known.append(d)
            y_known.append(v)

    if len(y_known) < 2:
        raise ValueError("Not enough known points to build ML model")

    a, b = _linear_fit(x_known, y_known)
    imputed = list(values)
    
    # Используем обученную модель если доступна и use_ml=True
    model_info = {"type": "linear_regression_plus_interpolation", "slope": a, "intercept": b}
    if use_ml and TRAINED_MODEL:
        model_info = TRAINED_MODEL

    for idx, v in enumerate(imputed):
        if v is not None:
            continue
        left = idx - 1
        while left >= 0 and imputed[left] is None:
            left -= 1
        right = idx + 1
        while right < len(imputed) and imputed[right] is None:
            right += 1

        # Интерполяция между известными точками
        if left >= 0 and right < len(imputed):
            left_v = imputed[left]
            right_v = imputed[right]
            left_d = depth[left]
            right_d = depth[right]
            cur_d = depth[idx]
            if (
                left_v is not None
                and right_v is not None
                and left_d is not None
                and right_d is not None
                and cur_d is not None
                and abs(right_d - left_d) > 1e-12
            ):
                t = (cur_d - left_d) / (right_d - left_d)
                imputed[idx] = left_v + t * (right_v - left_v)
                continue

        # Используем ML модель для экстраполяции
        cur_d = depth[idx] if depth[idx] is not None else float(idx)
        if use_ml and TRAINED_MODEL:
            # Используем среднее значение из обученной модели с небольшим шумом
            stats = TRAINED_MODEL.get("statistics", {})
            imputed[idx] = stats.get("nphi_mean", 0.2) + random.gauss(0, 0.01)
        else:
            imputed[idx] = a * cur_d + b

    missing_after = sum(1 for v in imputed if v is None)
    mae = sum(abs((a * x + b) - y) for x, y in zip(x_known, y_known)) / max(1, len(x_known))

    return {
        "values": imputed,
        "wasMissing": was_missing,  # Новое поле!
        "missingBefore": missing_before,
        "missingAfter": missing_after,
        "mae": round(mae, 6),
        "model": model_info,
    }


@router.get("/well-logs")
def list_well_logs(
    well_id: int = Query(...),
    db: Session = Depends(get_db),
):
    _ensure_well_logs_table(db)
    rows = db.execute(
        text(
            """
            SELECT id, well_id AS "wellId", oil_field_id AS "oilFieldId",
                   file_name AS "fileName", file_type AS "fileType",
                   depth_curve AS "depthCurve", created_at AS "createdAt"
            FROM well_logs
            WHERE well_id = :well_id
            ORDER BY created_at DESC
            """
        ),
        {"well_id": well_id},
    ).mappings().all()
    return [dict(r) for r in rows]


@router.post("/well-logs/upload")
async def upload_well_log(
    well_id: int = Form(...),
    oil_field_id: int | None = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    _ensure_well_logs_table(db)
    file_name = file.filename or "log"
    file_type = file_name.split(".")[-1].lower() if "." in file_name else ""
    if file_type not in {"las", "lis", "csv", "txt"}:
        raise HTTPException(status_code=400, detail="Only LAS/LIS/CSV/TXT files are supported")

    content_bytes = await file.read()
    try:
        content = content_bytes.decode("utf-8")
    except UnicodeDecodeError:
        content = content_bytes.decode("latin-1", errors="ignore")

    try:
        if file_type == "las":
            curves, depth_curve = _parse_las(content)
        else:
            curves, depth_curve = _parse_lis_or_csv(content)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    if len(curves) < 2:
        raise HTTPException(status_code=400, detail="File must contain depth and at least one log curve")

    inserted = db.execute(
        text(
            """
            INSERT INTO well_logs (well_id, oil_field_id, file_name, file_type, depth_curve, curves_json)
            VALUES (:well_id, :oil_field_id, :file_name, :file_type, :depth_curve, :curves_json)
            RETURNING id
            """
        ),
        {
            "well_id": well_id,
            "oil_field_id": oil_field_id,
            "file_name": file_name,
            "file_type": file_type,
            "depth_curve": depth_curve,
            "curves_json": json.dumps(curves),
        },
    ).scalar_one()
    db.commit()

    return {
        "id": inserted,
        "wellId": well_id,
        "oilFieldId": oil_field_id,
        "fileName": file_name,
        "fileType": file_type,
        "depthCurve": depth_curve,
        "curves": list(curves.keys()),
        "points": len(next(iter(curves.values()))),
    }


@router.post("/well-logs/train")
def train_ml_model_endpoint():
    """Генерирует синтетические данные для 20 скважин и обучает ML модель"""
    global TRAINED_MODEL
    
    training_wells = []
    for i in range(20):
        well_data = _generate_synthetic_well_log(i + 1, num_points=200)
        training_wells.append(well_data)
    
    TRAINED_MODEL = _train_ml_model(training_wells)
    
    return {
        "status": "success",
        "message": f"ML model trained on {len(training_wells)} synthetic wells",
        "model": TRAINED_MODEL,
    }


@router.get("/well-logs/generate-test-las")
def generate_test_las():
    """Генерирует тестовый LAS файл с пропусками для демонстрации ML обогащения"""
    well_data = _generate_synthetic_well_log(99, num_points=150, add_gaps=True)
    
    # Создаем LAS контент
    las_content = """~Version Information
VERS. 2.0: CWLS LOG ASCII STANDARD - VERSION 2.0
WRAP. NO: ONE LINE PER DEPTH STEP

~Well Information Block
STRT.M 1500: START DEPTH
STOP.M 1875: STOP DEPTH
STEP.M 2.5: STEP
NULL. -999.25: NULL VALUE
COMP. Test Company: COMPANY
WELL. Test Well 99: WELL
FLD . Test Field: FIELD

~Curve Information
DEPT.M: Depth
GR.API: Gamma Ray
NPHI.V/V: Neutron Porosity
RHOB.G/C3: Bulk Density
RT.OHMM: Resistivity

~ASCII
"""
    
    depths = well_data["DEPT"]
    gr = well_data["GR"]
    nphi = well_data["NPHI"]
    rhob = well_data["RHOB"]
    rt = well_data["RT"]
    
    for i in range(len(depths)):
        d = depths[i]
        g = gr[i] if gr[i] is not None else -999.25
        n = nphi[i] if nphi[i] is not None else -999.25
        r = rhob[i] if rhob[i] is not None else -999.25
        t = rt[i] if rt[i] is not None else -999.25
        las_content += f"{d:.2f} {g:.2f} {n:.4f} {r:.2f} {t:.2f}\n"
    
    missing_nphi = sum(1 for v in nphi if v is None)
    
    return {
        "filename": "test_well_with_gaps.las",
        "content": las_content,
        "missing_points": missing_nphi,
        "total_points": len(depths),
        "info": f"Пропуски в кривой NPHI (Пористость). Выберите NPHI для анализа!"
    }


@router.get("/well-logs/{log_id}")
def get_well_log(log_id: int, db: Session = Depends(get_db)):
    _ensure_well_logs_table(db)
    row = db.execute(
        text(
            """
            SELECT id, well_id AS "wellId", oil_field_id AS "oilFieldId",
                   file_name AS "fileName", file_type AS "fileType",
                   depth_curve AS "depthCurve", curves_json AS "curvesJson",
                   created_at AS "createdAt"
            FROM well_logs
            WHERE id = :id
            """
        ),
        {"id": log_id},
    ).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Log file not found")

    curves = json.loads(row["curvesJson"])
    payload = dict(row)
    payload.pop("curvesJson")
    payload["curves"] = curves
    payload["curveNames"] = list(curves.keys())
    payload["points"] = len(next(iter(curves.values()))) if curves else 0
    return payload


@router.post("/well-logs/{log_id}/impute")
def impute_well_log_curve(
    log_id: int,
    curve: str = Query(...),
    use_ml: bool = Query(False),
    db: Session = Depends(get_db),
):
    _ensure_well_logs_table(db)
    row = db.execute(
        text("SELECT depth_curve, curves_json FROM well_logs WHERE id = :id"),
        {"id": log_id},
    ).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Log file not found")

    curves = json.loads(row["curves_json"])
    depth_curve = row["depth_curve"]
    if depth_curve not in curves:
        raise HTTPException(status_code=400, detail="Depth curve not found in selected file")
    if curve not in curves:
        raise HTTPException(status_code=400, detail=f"Curve '{curve}' not found in selected file")

    try:
        result = _impute_curve(curves[depth_curve], curves[curve], use_ml=use_ml)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    return {
        "curve": curve,
        "depthCurve": depth_curve,
        "depth": curves[depth_curve],
        "original": curves[curve],
        "imputed": result["values"],
        "wasMissing": result["wasMissing"],  # Добавлено!
        "metrics": {
            "missingBefore": result["missingBefore"],
            "missingAfter": result["missingAfter"],
            "mae": result["mae"],
        },
        "model": result["model"],
    }
