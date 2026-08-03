# Weight Tracker

Личный трекер веса/питания/тренировок. FastAPI + vanilla JS + Chart.js (локальный, без CDN).

## Запуск локально

```bash
uv venv .venv && source .venv/bin/activate
uv pip install -r requirements.txt
PG_PASSWORD=... uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## БД

PostgreSQL `postgres.storage:5432`, БД `postgres`, схема `weight` (создана SQL из чата):
- `daily_weight` — вес по дням (UNIQUE по дате, upsert)
- `daily_nutrition` — калории/белок (UNIQUE по дате, upsert)
- `workouts` — тренировки (boxing/gym/cardio/other, несколько в день)

## API

| Метод | Путь | Описание |
|---|---|---|
| GET | `/api/weight` | список весов (DESC) |
| PUT | `/api/weight` | upsert: `{weight_date, weight_kg, notes?}` |
| DELETE | `/api/weight/{date}` | удалить |
| GET | `/api/nutrition` | список |
| PUT | `/api/nutrition` | upsert: `{nutrition_date, calories?, protein_g?, notes?}` |
| DELETE | `/api/nutrition/{date}` | удалить |
| GET | `/api/workouts` | список (DESC) |
| POST | `/api/workouts` | создать: `{workout_date, workout_type, duration_min, intensity?, notes?}` |
| DELETE | `/api/workouts/{id}` | удалить |

## Деплой (GitOps)

Push в `main` → GitHub Actions собирает образ → `registry.askahomelab.ru/weight_tracker:<дата-ша>` → bump тега в devops `k3s/weight-tracker.yml` → ArgoCD.

Адрес: `https://wt.aska.internal` (внутренняя зона).
