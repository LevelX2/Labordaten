from fastapi import APIRouter

from labordaten_backend.api.routes import (
    befunde,
    labore,
    messwerte,
    parameter,
    personen,
    referenzen,
    system,
    zielbereiche,
)

api_router = APIRouter()
api_router.include_router(system.router, tags=["system"])
api_router.include_router(personen.router, prefix="/personen", tags=["personen"])
api_router.include_router(labore.router, prefix="/labore", tags=["labore"])
api_router.include_router(parameter.router, prefix="/parameter", tags=["parameter"])
api_router.include_router(befunde.router, prefix="/befunde", tags=["befunde"])
api_router.include_router(messwerte.router, prefix="/messwerte", tags=["messwerte"])
api_router.include_router(referenzen.router, tags=["referenzen"])
api_router.include_router(zielbereiche.router, tags=["zielbereiche"])
