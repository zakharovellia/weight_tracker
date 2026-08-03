from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

from .database import init_pool, close_pool
from .routes import router

BASE_DIR = os.path.dirname(os.path.abspath(__file__))


def create_app() -> FastAPI:
    app = FastAPI(title="Weight Tracker", version="1.0.0")

    @app.on_event("startup")
    async def startup():
        await init_pool()

    @app.on_event("shutdown")
    async def shutdown():
        await close_pool()

    app.include_router(router, prefix="/api")

    @app.get("/health")
    async def health():
        return {"status": "ok"}

    app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")

    @app.get("/")
    async def index():
        return FileResponse(os.path.join(BASE_DIR, "static", "index.html"))

    return app


app = create_app()
