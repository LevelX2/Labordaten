from fastapi import APIRouter

from labordaten_backend.api.routes import (
    auswertung,
    befunde,
    berichte,
    dokumente,
    einheiten,
    gruppen,
    importe,
    labore,
    loeschlogik,
    messwerte,
    parameter,
    planung,
    personen,
    referenzen,
    system,
    wissensbasis,
    zielbereiche,
)

api_router = APIRouter()
api_router.include_router(system.router, tags=["system"])
api_router.include_router(wissensbasis.router, tags=["wissensbasis"])
api_router.include_router(loeschlogik.router, tags=["loeschlogik"])
api_router.include_router(dokumente.router, tags=["dokumente"])
api_router.include_router(einheiten.router, tags=["einheiten"])
api_router.include_router(personen.router, prefix="/personen", tags=["personen"])
api_router.include_router(labore.router, prefix="/labore", tags=["labore"])
api_router.include_router(parameter.router, prefix="/parameter", tags=["parameter"])
api_router.include_router(gruppen.router, tags=["gruppen"])
api_router.include_router(befunde.router, prefix="/befunde", tags=["befunde"])
api_router.include_router(messwerte.router, prefix="/messwerte", tags=["messwerte"])
api_router.include_router(auswertung.router, tags=["auswertung"])
api_router.include_router(berichte.router, tags=["berichte"])
api_router.include_router(importe.router, tags=["importe"])
api_router.include_router(planung.router, tags=["planung"])
api_router.include_router(referenzen.router, tags=["referenzen"])
api_router.include_router(zielbereiche.router, tags=["zielbereiche"])
