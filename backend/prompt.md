# КОНТЕКСТ

Это существующий монорепозиторий ie-aion (кросс-индустриальная платформа Digital Twin,
React+TS+Vite фронт, синхронный FastAPI бэк). Я добавляю НОВУЮ ОТРАСЛЬ — «Строительство».
Не создавай новый проект и не меняй стек. Зарегистрируй отрасль строго по существующему
паттерну IndustryPack и подключи к ней модуль 4D-Construction.

## Как устроена отрасль в проекте (СОБЛЮДАЙ ТОЧНО)

Отрасль = объект IndustryPack. Тип и интерфейсы — в src/config/industries/index.ts
(IndustryId, KpiDef, ModuleDef, IndustryPack). Образцы паков: mining.ts, upstream.ts,
pipeline_oil.ts. Каждая отрасль регистрируется в ТРЁХ местах:
  1) src/config/industries/<name>.ts — сам пак (export const ...Pack: IndustryPack)
  2) src/config/industries/index.ts — добавить литерал в union-тип IndustryId
  3) src/context/CompanyProfileContext.tsx — импорт пака + запись в INDUSTRY_PACKS
Модули пака (modules[]) с полями {id,label,icon,route} формируют меню (AppSidebar.tsx
читает getIndustryPack().modules). icon — имя иконки lucide-react. Под каждый route,
которого ещё нет, нужна страница в src/pages/ и Route в src/App.tsx (внутри AppLayout/AuthGuard,
по образцу существующих отраслевых страниц вроде MiningProduction/MiningDigitalTwin).

# ЗАДАЧА 1 — Зарегистрировать отрасль «Строительство»

Создай src/config/industries/construction.ts с export const constructionPack: IndustryPack:
- id: 'construction'
- label: 'Строительство'
- description: 'Управление капитальным строительством — 4D BIM, контроль СМР, план/факт'
- assetHierarchy: ['Холдинг / Застройщик', 'Проект / Объект', 'Очередь / Секция', 'Захватка / Элемент']
- kpis (реалистичные для стройки, с unit): физический прогресс %, освоение бюджета (EV) %,
  SPI, CPI, отклонение от графика (дни), отставание захваток (шт), выполнение СМР (млн ₸/сут),
  обеспеченность материалами %, отклонения качества (шт), охрана труда LTIFR.
- modules: dashboard (route '/'), 4D-модель (route '/construction-4d', icon 'Box'),
  график/планирование (route '/planning'), смета/бюджет (route '/construction-budget'),
  контроль СМР план/факт (route '/construction-progress'), цифровой двойник стройки
  (route '/construction-digital-twin'), кризис-центр (route '/crisis-response' если общий,
  иначе '/construction-crisis'), интеграции (route '/integrations'). Подбери осмысленные
  icon из lucide-react.
- integrations: типичные для стройки — Autodesk BIM 360 / ACC, Navisworks, Primavera P6,
  MS Project, 1С:ERP Строительство, SAP PS, Tekla, СОД/CDE.

Затем:
- В src/config/industries/index.ts добавь 'construction' в union IndustryId.
- В src/context/CompanyProfileContext.tsx импортируй constructionPack и добавь
  construction: constructionPack в INDUSTRY_PACKS.
Проверь, что переключение на отрасль не ломает типы (Record<IndustryId, IndustryPack>
требует наличия всех ключей).

# ЗАДАЧА 2 — Страницы отрасли (фронтенд)

Под каждый НОВЫЙ route из modules создай страницу-каркас в src/pages/ (Construction4D.tsx,
ConstructionProgress.tsx, ConstructionBudget.tsx, ConstructionDigitalTwin.tsx) и
зарегистрируй Route в src/App.tsx по образцу существующих. Реализуй осмысленные каркасы:
- ConstructionProgress: дашборд план/факт по захваткам/элементам (recharts: S-кривая
  освоения, bar план vs факт), таблица на @/components/ui/table, фильтры на shadcn/ui.
- ConstructionBudget: освоение бюджета (EV/PV/AC), CPI/SPI карточки (MetricCard),
  график. Construction4D: страница под 4D-вьюер (переиспользуй Three.js/@react-three
  подход из src/scene и существующих *3DViewer*-компонентов; пока — сцена-заглушка
  с timeline-слайдером по датам графика).
- ConstructionDigitalTwin: агрегирующий обзор (KPI отрасли из пака + ссылки на модули).
Данные тяни через @tanstack/react-query из API нового бэкенд-модуля (ниже).

# ЗАДАЧА 3 — Бэкенд-модуль 4D-Construction (по конвенциям проекта)

Backend СИНХРОННЫЙ (обычный SQLAlchemy Session, НЕ async). Слои как в домене field_scheme:
  app/models/construction.py    — ORM 2.0 (Mapped/mapped_column), PK UUID(as_uuid=True),
                                   JSONB для геометрии/атрибутов, FK на users.id (Integer).
  app/schemas/construction.py    — Pydantic v2, поля в camelCase + ручная сериализация
                                   _serialize_* (как в schemas/field_scheme.py).
  app/crud/construction.py       — функции (db: Session первым аргументом).
  app/services/construction_*.py — linking_service, plan_vs_fact_engine, simulation_engine.
  app/api/routes/construction.py — APIRouter(prefix="/construction"), Depends(get_db) и
                                   get_current_user из app/api/deps.py.
  Зарегистрируй роутер в app/api/router.py (tags=["construction"]).
Таблицы (миграция Alembic, начиная с 0016, down_revision -> последняя существующая):
construction_projects, bim_elements (guid,type,geom JSONB), schedule_tasks,
task_dependencies, cost_items, element_task_links, element_cost_links,
progress_snapshots (element_id/task_id, ts, source[ai|manual], value), deviations, forecasts,
integration_configs. PostGIS НЕ использовать (его нет) — геометрия в JSONB.
ИИ-части (progress по CV, deviation, forecasting, LLM-ассистент) — интерфейсы (ABC/Protocol)
+ StubProvider-заглушки с TODO, без выдуманной бизнес-логики. Проект уже использует openai
(app/api/routes/ai.py) — LLM-ассистент может опираться на это.

# ПОРЯДОК
Сначала покажи: (1) constructionPack целиком, (2) точечные диффы index.ts и
CompanyProfileContext.tsx, (3) список новых файлов фронта и бэка, (4) черновик миграции 0016.
ОСТАНОВИСЬ и спроси, что реализовать первым в полной детализации (пак+регистрация ИЛИ
конкретную страницу ИЛИ бэкенд-модуль), прежде чем генерировать весь код.
Комментарии/докстринги — на русском, имена кода — на английском.