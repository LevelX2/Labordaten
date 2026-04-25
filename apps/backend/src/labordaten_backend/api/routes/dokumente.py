import mimetypes

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from labordaten_backend.api.deps import get_db
from labordaten_backend.modules.dokumente import service

router = APIRouter(prefix="/dokumente")


@router.get("/{dokument_id}/inhalt")
def get_dokument_inhalt(
    dokument_id: str,
    download: bool = False,
    db: Session = Depends(get_db),
) -> FileResponse:
    dokument = service.get_dokument(db, dokument_id)
    if dokument is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dokument nicht gefunden.")

    try:
        file_path = service.resolve_dokument_path(dokument)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    safe_filename = dokument.dateiname.replace('"', "")
    media_type = dokument.mime_typ or mimetypes.guess_type(safe_filename)[0] or "application/octet-stream"

    return FileResponse(
        path=file_path,
        media_type=media_type,
        filename=safe_filename,
        content_disposition_type="attachment" if download else "inline",
    )
