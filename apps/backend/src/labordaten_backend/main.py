from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from labordaten_backend.api.router import api_router
from labordaten_backend.core.config import get_settings
from labordaten_backend.core.lock import SingleUserLockManager
from labordaten_backend.core.runtime_settings import get_runtime_settings_store


@asynccontextmanager
async def lifespan(app: FastAPI):
    runtime_settings_store = get_runtime_settings_store()
    runtime_settings = runtime_settings_store.get()
    lock_manager = SingleUserLockManager(runtime_settings.data_path)
    lock_manager.start()
    app.state.runtime_settings_store = runtime_settings_store
    app.state.lock_manager = lock_manager
    try:
        yield
    finally:
        lock_manager.shutdown()


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title=settings.app_name,
        version="0.2.0",
        docs_url="/api/docs",
        openapi_url="/api/openapi.json",
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.frontend_origin],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.middleware("http")
    async def block_requests_on_lock_conflict(request: Request, call_next):
        if request.url.path.startswith("/api/system") or request.url.path.startswith("/api/docs") or request.url.path.startswith("/api/openapi"):
            return await call_next(request)
        lock_manager = getattr(request.app.state, "lock_manager", None)
        if lock_manager is not None and lock_manager.is_conflicted():
            payload = lock_manager.status_payload()
            return JSONResponse(
                status_code=423,
                content={"detail": payload["message"], "lock": payload},
            )
        response = await call_next(request)
        if lock_manager is not None:
            lock_manager.refresh()
        return response

    app.include_router(api_router, prefix="/api")
    return app


app = create_app()
