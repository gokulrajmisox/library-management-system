from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncIterator, Optional

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config import get_settings
from app.database.seed import seed
from app.database.session import Base, SessionLocal, get_engine, init_engine
from app.routes import books, circulation, insights
from app.services.ds_service import playground
from app.services.engine import engine as ds_engine
from app.services.errors import AppError

log = logging.getLogger("library")


def bootstrap(database_url: Optional[str] = None, do_seed: Optional[bool] = None) -> None:
    db_engine = init_engine(database_url)
    import app.models  # noqa: F401  (register tables)

    Base.metadata.create_all(db_engine)
    with SessionLocal() as db:
        if do_seed if do_seed is not None else get_settings().seed_on_startup:
            seed(db)
        ds_engine.rebuild(db)
        playground.seed(db)


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    if not ds_engine.loaded:
        bootstrap()
    yield


def create_app() -> FastAPI:
    app = FastAPI(title="Library Book Management System", version="1.0.0", lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=get_settings().cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.exception_handler(AppError)
    async def app_error(_: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.message, "code": exc.code})

    @app.exception_handler(RequestValidationError)
    async def validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
        fields: dict[str, str] = {}
        for err in exc.errors():
            loc = [str(p) for p in err.get("loc", []) if p not in ("body", "query", "path")]
            msg = str(err.get("msg", "Invalid value")).removeprefix("Value error, ")
            fields[".".join(loc) or "request"] = msg
        first = next(iter(fields.values()), "Invalid request.")
        return JSONResponse(status_code=422, content={"detail": first, "code": "validation_error", "fields": fields})

    @app.exception_handler(StarletteHTTPException)
    async def http_error(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        detail = exc.detail if isinstance(exc.detail, str) else "Request failed."
        if exc.status_code == 404 and detail == "Not Found":
            detail = "The requested resource was not found."
        return JSONResponse(status_code=exc.status_code, content={"detail": detail, "code": "http_error"})

    @app.exception_handler(Exception)
    async def unhandled(_: Request, exc: Exception) -> JSONResponse:
        log.exception("Unhandled error", exc_info=exc)
        return JSONResponse(status_code=500, content={"detail": "Something went wrong on our side. Please try again.", "code": "server_error"})

    @app.get("/health", tags=["system"])
    def health() -> dict[str, object]:
        with get_engine().connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": "ok", "database": get_engine().dialect.name, "engine_loaded": ds_engine.loaded}

    app.include_router(books.router)
    app.include_router(circulation.router)
    app.include_router(insights.router)
    return app


app = create_app()
