# Промпт для Cursor: Фаза 1 — backend для бригадиров, WBS и суточного журнала

Скопируйте текст ниже в Cursor, открыв репозиторий backend'а IE:AION (FastAPI +
PostgreSQL + SQLAlchemy + Alembic, см. `construction-overview.md`, §7.2). Приложите
к контексту `construction-overview.md` и `ie-aion-brigades-journal-dynamics-spec.md`,
если они есть в репозитории — промпт на них ссылается.

Это Фаза 1 из плана: реальные таблицы и эндпоинты, без которых бот и фронтенд
IE:AION не могут ничего писать/читать по-настоящему (сейчас всё на mock во
фронтенде). Промпт не трогает сам `bot.py` и фронтенд — это отдельные следующие шаги.

---

## ПРОМПТ (вставить в Cursor)

```
Контекст: FastAPI + PostgreSQL + SQLAlchemy + Alembic backend платформы IE:AION.
Сейчас строительный домен (проекты, задачи графика, план-факт по захваткам,
отклонения) существует только как TypeScript-типы и mock-данные во фронтенде
(constructionMockData.ts) — в базе данных реальных таблиц под них нет. Нужно создать
backend-основу для трёх новых сущностей и двух ключевых эндпоинтов, которые будет
использовать Telegram-бот сбора голосовых отчётов бригадиров.

ЗАДАЧА 1 — SQLAlchemy-модели и Alembic-миграция.

Создай модели (в стиле уже существующих моделей проекта — используй те же базовые
классы/миксины, что и в остальном кодовое базе, если есть общий Base/TimestampMixin):

1. ConstructionProject (если такой модели ещё нет в БД — создай минимальную версию:
   project_id (str, PK, например "proj-highvill-astana"), name, developer, bac
   (Numeric — бюджет по завершении), data_date (Date), plan_start, plan_finish,
   fact_start).

2. Phase: phase_id (str, PK), project_id (FK), name, color, plan_start, plan_finish.

3. ScheduleTask: task_id (str, PK), project_id (FK), wbs_code (str), name (str),
   zone (str, nullable), phase_id (FK, nullable), planned_progress_pct (Numeric),
   actual_progress_pct (Numeric, default 0), status (Enum: planned/in_progress/
   done/blocked), responsible (str, nullable), plan_start, plan_finish,
   fact_start (nullable), fact_finish (nullable), pv/ev/ac (Numeric, nullable —
   для EVM-расчётов).

4. ZonePlanFact: id (uuid PK), project_id (FK), zone (str), date (Date),
   plan_pct (Numeric), fact_pct (Numeric), lag_days (Integer, nullable),
   updated_at.

5. Deviation: id (uuid PK), project_id (FK), task_id (FK, nullable), zone (str),
   kind (Enum: schedule/resource/dependency/quality/external), severity
   (Enum: attention/risk/critical), delta_pct (Numeric, nullable),
   description (Text), detected_at (timestamp), resolved_at (timestamp, nullable).

6. ProgressCurvePoint: id (uuid PK), project_id (FK), date (Date), pv (Numeric),
   ev (Numeric), ac (Numeric). Unique constraint на (project_id, date).

7. Crew: crew_id (uuid PK), project_id (FK), name (str), contractor_name (str),
   specialization (str, nullable), planned_headcount (Integer, nullable).

8. Foreman: foreman_id (uuid PK), project_id (FK), full_name (str),
   phone (str, nullable), role (Enum: foreman/brigadier/pto), crew_id
   (FK, nullable), default_zone (str, nullable), telegram_user_id
   (BigInteger, nullable, unique), telegram_link_status (Enum: not_invited/
   invited/linked, default not_invited), invite_code (str, nullable, unique,
   indexed), active (Boolean, default true), created_at, updated_at.

9. DailyJournalEntry: entry_id (uuid PK), project_id (FK), date (Date),
   zone (str), task_id (FK, nullable — может быть null, если не удалось
   сопоставить с WBS), work_type (str, nullable), plan_pct (Numeric, nullable),
   fact_pct (Numeric, nullable), delta_pct (Numeric, nullable),
   source (Enum: voice/manual/cv), author_foreman_id (FK Foreman, nullable),
   author_user_id (FK на существующую таблицу пользователей, nullable),
   blocker_type (Enum: resource/dependency/external/quality/none, nullable),
   blocker_description (Text, nullable), risk_delay_days (Integer, nullable),
   risk_severity (Enum: risk/attention/critical/none, nullable),
   responsible (str, nullable), actions (ARRAY(String) или JSON — список строк),
   raw_transcript (Text, nullable), photos (ARRAY(String) или JSON — список URL),
   confirmed (Boolean, default false), created_at.

Сгенерируй Alembic-миграцию для всех новых таблиц. Добавь разумные индексы:
на (project_id, date) для ZonePlanFact/ProgressCurvePoint/DailyJournalEntry,
на telegram_user_id и invite_code для Foreman (уникальные).

ЗАДАЧА 2 — Pydantic-схемы для API (request/response), отдельно от SQLAlchemy-моделей,
в стиле остального проекта (если есть схема с schemas.py или отдельная папка schemas/
— следуй этому паттерну).

ЗАДАЧА 3 — эндпоинт для бота: получение активных задач WBS.

GET /api/construction/projects/{project_id}/active-tasks

Возвращает список ScheduleTask со статусом in_progress или planned, отсортированных
по phase/wbs_code, в формате, СТРОГО совпадающем с схемой active_wbs_tasks из
файла voice-report-system-prompt.md (§2):
[{
  "task_id": ..., "wbs_code": ..., "name": ..., "zone": ..., "phase_id": ...,
  "planned_progress_pct": ..., "status": ..., "responsible": ...
}]
Это критично — бот отправляет этот список как есть в LLM-промпт, поле в поле.

ЗАДАЧА 4 — эндпоинт для бота: приём подтверждённого отчёта.

POST /api/construction/projects/{project_id}/journal

Принимает тело:
{
  "entries": [ ...массив entries в формате structured_data.entries[] из
               voice-report-system-prompt.md §5.1... ],
  "author_foreman_id": "uuid",
  "raw_quote": "текст",
  "report_date": "YYYY-MM-DD"
}

Логика обработки (в транзакции, всё или ничего):
1. Для каждого entry с непустым task_id и match_confidence in (high, medium):
   - Обнови ScheduleTask.actual_progress_pct = entry.fact_pct (если fact_pct
     не null)
   - Найди или создай ZonePlanFact на (project_id, zone, date=report_date),
     обнови plan_pct/fact_pct/lag_days (lag_days можно взять из risk.delay_days,
     если severity != none)
   - Если delta_pct существенно отрицательный (порог -10%, вынеси в константу
     DEVIATION_THRESHOLD_PCT) ИЛИ blocker.type != "none" — создай Deviation
     (kind сопоставь из blocker.type, severity из risk.severity, delta_pct,
     description из blocker.description)
2. Для каждого entry — создай DailyJournalEntry с source="voice", confirmed=true,
   author_foreman_id из тела запроса, остальные поля — прямое отображение из
   entry (zone, work_type, plan_pct, fact_pct, delta_pct, blocker_type,
   blocker_description, risk_delay_days, risk_severity, responsible, actions,
   raw_transcript=raw_quote, photos пока пустой список — фото прикрепляются
   отдельным эндпоинтом позже, оставь TODO).
3. Пересчитай ProgressCurvePoint на report_date для всего project_id: просуммируй
   PV/EV/AC по всем ScheduleTask проекта на эту дату (используй существующие
   pv/ev/ac поля задач, если они заполняются откуда-то ещё — иначе оставь
   TODO-комментарий с пометкой "требует источника PV/AC, сейчас используем
   упрощённый расчёт EV = sum(planned_progress_pct * task_weight)").
4. Верни в ответе: краткую сводку (сколько entries применено, сколько ушло в
   needs_clarification из-за unmatched/no_context — для unmatched entries создай
   DailyJournalEntry с task_id=null и confirmed=false, чтобы они попали в очередь
   ручной верификации ПТО, но НЕ обновляй ScheduleTask/ZonePlanFact для них).

ЗАДАЧА 5 — эндпоинты для управления бригадирами (для будущего UI «Бригадиры»,
эту часть реализуй тоже, фронтенд подключим отдельно):

GET /api/construction/projects/{project_id}/foremen — список бригадиров проекта
POST /api/construction/projects/{project_id}/foremen — создать бригадира
  (генерирует invite_code, например через secrets.token_urlsafe(6))
POST /api/construction/foremen/{foreman_id}/link-telegram — принимает
  {"telegram_user_id": ..., "invite_code": ...}, проверяет соответствие invite_code,
  если совпадает — устанавливает telegram_user_id и telegram_link_status=linked,
  invite_code делает одноразовым (обнуляет после использования или помечает used)
GET /api/construction/foremen/by-telegram/{telegram_user_id} — для бота: найти
  бригадира по telegram_user_id, вернуть его project_id и default_zone (404 если
  не найден/не привязан — бот должен обработать это как "нужен invite_code")

ЗАДАЧА 6 — эндпоинт для чтения журнала (для будущего UI «Суточный журнал»):

GET /api/construction/projects/{project_id}/journal?date_from=&date_to=&zone=&
  foreman_id=&confirmed_only=
Пагинация (limit/offset), сортировка по created_at desc по умолчанию.

ОБЩИЕ ТРЕБОВАНИЯ:
- Используй существующую сессию БД / dependency injection паттерн проекта (не
  изобретай новый способ подключения к БД, если уже есть get_db() или аналог).
- Все эндпоинты — под существующей аутентификацией проекта (Basic Auth, судя по
  описанию), кроме эндпоинтов, которые будет дёргать бот — уточни в комментарии,
  что для машинного доступа (бота) может понадобиться отдельный API-ключ вместо
  пользовательского Basic Auth, но НЕ реализуй это сейчас — оставь TODO с описанием
  варианта (например отдельный заголовок X-Bot-Api-Key, проверяемый по env
  переменной BOT_BACKEND_API_KEY), чтобы не блокировать Фазу 1 задачей
  аутентификации.
- Обработка ошибок: 404 если project_id/foreman_id не существует, 422 при
  невалидном теле запроса (Pydantic это даст автоматически), 409 при попытке
  повторно использовать invite_code.
- Покажи итоговый список новых/изменённых файлов (модели, схемы, роутер,
  миграция) с их содержимым.
```

---

## Что делать после того, как Cursor сгенерирует код

1. **Прогнать миграцию** (`alembic upgrade head`) на dev-базе, проверить, что
   таблицы создались без ошибок
2. **Проверить эндпоинты вручную** (curl/Postman/Swagger UI FastAPI — обычно
   доступен на `/docs`):
   - Создать тестовый `ConstructionProject` и несколько `ScheduleTask` вручную
     (или через seed-скрипт, попросите Cursor его тоже сгенерировать, если нужно)
   - Вызвать `GET /active-tasks` — убедиться, что формат совпадает с ожиданиями
     промпта бота
   - Создать `Foreman` через `POST /foremen`, получить `invite_code`
   - Вызвать `POST /journal` с тестовым телом, проверить, что `ScheduleTask`,
     `ZonePlanFact`, `Deviation`, `DailyJournalEntry` действительно создались/
     обновились в базе

## Следующие шаги после Фазы 1 (не в этом промпте)

- Подключить `bot.py` к этим эндпоинтам (замена `PROJECTS` и `TODO` в `on_confirm`)
- UI «Бригадиры» и «Суточный журнал» во фронтенде IE:AION
- Переключить дашборд «Цифровой двойник» с mock на реальный `ProgressCurvePoint`

Такое разделение сделано намеренно — Фаза 1 самодостаточна и тестируется отдельно
от бота и фронтенда, что снижает риск сломать что-то при интеграции.
