from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from datetime import date
from typing import Optional, Literal

from .database import get_pool

router = APIRouter()


# ---------- Models ----------

class WeightIn(BaseModel):
    weight_date: date
    weight_kg: float = Field(gt=30, lt=300)
    notes: Optional[str] = None


class NutritionIn(BaseModel):
    nutrition_date: date
    calories: Optional[int] = Field(default=None, ge=0, le=10000)
    protein_g: Optional[int] = Field(default=None, ge=0, le=500)
    notes: Optional[str] = None


class WorkoutIn(BaseModel):
    workout_date: date
    workout_type: Literal["boxing", "gym", "cardio", "other"]
    duration_min: int = Field(gt=0, le=600)
    intensity: Optional[Literal["low", "medium", "high"]] = None
    notes: Optional[str] = None


# ---------- Weight ----------

@router.get("/weight")
async def list_weight(limit: int = 400):
    pool = get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT weight_date, weight_kg, notes FROM weight.daily_weight "
            "ORDER BY weight_date DESC LIMIT $1", limit
        )
    return [
        {"weight_date": r["weight_date"].isoformat(),
         "weight_kg": float(r["weight_kg"]),
         "notes": r["notes"]}
        for r in rows
    ]


@router.put("/weight")
async def upsert_weight(payload: WeightIn):
    pool = get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO weight.daily_weight (weight_date, weight_kg, notes)
            VALUES ($1, $2, $3)
            ON CONFLICT (weight_date)
            DO UPDATE SET weight_kg = EXCLUDED.weight_kg,
                          notes = EXCLUDED.notes,
                          updated_at = now()
            """,
            payload.weight_date, payload.weight_kg, payload.notes,
        )
    return {"status": "ok"}


@router.delete("/weight/{weight_date}")
async def delete_weight(weight_date: date):
    pool = get_pool()
    async with pool.acquire() as conn:
        result = await conn.execute(
            "DELETE FROM weight.daily_weight WHERE weight_date = $1", weight_date
        )
    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="not found")
    return {"status": "ok"}


# ---------- Nutrition ----------

@router.get("/nutrition")
async def list_nutrition(limit: int = 400):
    pool = get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT nutrition_date, calories, protein_g, notes FROM weight.daily_nutrition "
            "ORDER BY nutrition_date DESC LIMIT $1", limit
        )
    return [
        {"nutrition_date": r["nutrition_date"].isoformat(),
         "calories": r["calories"],
         "protein_g": r["protein_g"],
         "notes": r["notes"]}
        for r in rows
    ]


@router.put("/nutrition")
async def upsert_nutrition(payload: NutritionIn):
    pool = get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO weight.daily_nutrition (nutrition_date, calories, protein_g, notes)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (nutrition_date)
            DO UPDATE SET calories = EXCLUDED.calories,
                          protein_g = EXCLUDED.protein_g,
                          notes = EXCLUDED.notes,
                          updated_at = now()
            """,
            payload.nutrition_date, payload.calories, payload.protein_g, payload.notes,
        )
    return {"status": "ok"}


@router.delete("/nutrition/{nutrition_date}")
async def delete_nutrition(nutrition_date: date):
    pool = get_pool()
    async with pool.acquire() as conn:
        result = await conn.execute(
            "DELETE FROM weight.daily_nutrition WHERE nutrition_date = $1", nutrition_date
        )
    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="not found")
    return {"status": "ok"}


# ---------- Workouts ----------

@router.get("/workouts")
async def list_workouts(limit: int = 400):
    pool = get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT id, workout_date, workout_type, duration_min, intensity, notes "
            "FROM weight.workouts ORDER BY workout_date DESC, id DESC LIMIT $1", limit
        )
    return [
        {"id": r["id"],
         "workout_date": r["workout_date"].isoformat(),
         "workout_type": r["workout_type"],
         "duration_min": r["duration_min"],
         "intensity": r["intensity"],
         "notes": r["notes"]}
        for r in rows
    ]


@router.post("/workouts")
async def create_workout(payload: WorkoutIn):
    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO weight.workouts (workout_date, workout_type, duration_min, intensity, notes)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id
            """,
            payload.workout_date, payload.workout_type, payload.duration_min,
            payload.intensity, payload.notes,
        )
    return {"status": "ok", "id": row["id"]}


@router.delete("/workouts/{workout_id}")
async def delete_workout(workout_id: int):
    pool = get_pool()
    async with pool.acquire() as conn:
        result = await conn.execute(
            "DELETE FROM weight.workouts WHERE id = $1", workout_id
        )
    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="not found")
    return {"status": "ok"}
