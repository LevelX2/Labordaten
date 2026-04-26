from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from labordaten_backend.api.deps import get_db
from labordaten_backend.modules.parameter import schemas, service

router = APIRouter()


@router.get("", response_model=list[schemas.ParameterRead])
def list_parameter(db: Session = Depends(get_db)) -> list[schemas.ParameterRead]:
    return service.list_parameter(db)


@router.get("/alias-vorschlaege", response_model=list[schemas.ParameterAliasSuggestionRead])
def list_parameter_alias_suggestions(
    db: Session = Depends(get_db),
) -> list[schemas.ParameterAliasSuggestionRead]:
    return service.list_parameter_alias_suggestions(db)


@router.get("/dublettenvorschlaege", response_model=list[schemas.ParameterDuplicateSuggestionRead])
def list_parameter_duplicate_suggestions(
    pruefschaerfe: schemas.ParameterDuplicatePruefschaerfe = Query(default="ausgewogen"),
    db: Session = Depends(get_db),
) -> list[schemas.ParameterDuplicateSuggestionRead]:
    return service.list_parameter_duplicate_suggestions(db, pruefschaerfe)


@router.post(
    "/dublettenausschluesse",
    response_model=schemas.ParameterDuplicateSuppressionRead,
    status_code=status.HTTP_201_CREATED,
)
def create_parameter_duplicate_suppression(
    payload: schemas.ParameterDuplicateSuppressionCreate,
    db: Session = Depends(get_db),
) -> schemas.ParameterDuplicateSuppressionRead:
    try:
        return service.create_parameter_duplicate_suppression(db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("", response_model=schemas.ParameterRead, status_code=status.HTTP_201_CREATED)
def create_parameter(
    payload: schemas.ParameterCreate,
    db: Session = Depends(get_db),
) -> schemas.ParameterRead:
    return service.create_parameter(db, payload)


@router.post("/zusammenfuehren", response_model=schemas.ParameterMergeResultRead)
def merge_parameters(
    payload: schemas.ParameterMergeRequest,
    db: Session = Depends(get_db),
) -> schemas.ParameterMergeResultRead:
    try:
        return service.merge_parameters(db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.patch("/{parameter_id}/standardeinheit", response_model=schemas.ParameterStandardEinheitUpdateResult)
def update_parameter_standard_einheit(
    parameter_id: str,
    payload: schemas.ParameterStandardEinheitUpdate,
    db: Session = Depends(get_db),
) -> schemas.ParameterStandardEinheitUpdateResult:
    try:
        return service.update_parameter_standard_einheit(db, parameter_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.patch(
    "/{parameter_id}/primaere-klassifikation",
    response_model=schemas.ParameterPrimaereKlassifikationUpdateResult,
)
def update_parameter_primaere_klassifikation(
    parameter_id: str,
    payload: schemas.ParameterPrimaereKlassifikationUpdate,
    db: Session = Depends(get_db),
) -> schemas.ParameterPrimaereKlassifikationUpdateResult:
    try:
        return service.update_parameter_primaere_klassifikation(db, parameter_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/{parameter_id}/umbenennen", response_model=schemas.ParameterRenameResultRead)
def rename_parameter(
    parameter_id: str,
    payload: schemas.ParameterRenameRequest,
    db: Session = Depends(get_db),
) -> schemas.ParameterRenameResultRead:
    try:
        return service.rename_parameter(db, parameter_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/{parameter_id}", response_model=schemas.ParameterRead)
def get_parameter(parameter_id: str, db: Session = Depends(get_db)) -> schemas.ParameterRead:
    parameter = service.get_parameter(db, parameter_id)
    if parameter is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parameter nicht gefunden.")
    return parameter


@router.get(
    "/{parameter_id}/dublettenausschluesse",
    response_model=list[schemas.ParameterDuplicateSuppressionRead],
)
def list_parameter_duplicate_suppressions(
    parameter_id: str,
    db: Session = Depends(get_db),
) -> list[schemas.ParameterDuplicateSuppressionRead]:
    try:
        return service.list_parameter_duplicate_suppressions(db, parameter_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.get("/{parameter_id}/aliase", response_model=list[schemas.ParameterAliasRead])
def list_parameter_aliase(parameter_id: str, db: Session = Depends(get_db)) -> list[schemas.ParameterAliasRead]:
    try:
        return service.list_parameter_aliase(db, parameter_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.get(
    "/{parameter_id}/umrechnungsregeln",
    response_model=list[schemas.ParameterUmrechnungsregelRead],
)
def list_parameter_umrechnungsregeln(
    parameter_id: str,
    db: Session = Depends(get_db),
) -> list[schemas.ParameterUmrechnungsregelRead]:
    try:
        return service.list_parameter_umrechnungsregeln(db, parameter_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.get(
    "/{parameter_id}/gruppen",
    response_model=list[schemas.ParameterGruppenzuordnungRead],
)
def list_parameter_gruppen(
    parameter_id: str,
    db: Session = Depends(get_db),
) -> list[schemas.ParameterGruppenzuordnungRead]:
    try:
        return service.list_parameter_gruppen(db, parameter_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.get(
    "/{parameter_id}/klassifikationen",
    response_model=list[schemas.ParameterKlassifikationRead],
)
def list_parameter_klassifikationen(
    parameter_id: str,
    db: Session = Depends(get_db),
) -> list[schemas.ParameterKlassifikationRead]:
    try:
        return service.list_parameter_klassifikationen(db, parameter_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post(
    "/{parameter_id}/aliase",
    response_model=schemas.ParameterAliasRead,
    status_code=status.HTTP_201_CREATED,
)
def create_parameter_alias(
    parameter_id: str,
    payload: schemas.ParameterAliasCreate,
    db: Session = Depends(get_db),
) -> schemas.ParameterAliasRead:
    try:
        return service.create_parameter_alias(db, parameter_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post(
    "/{parameter_id}/klassifikationen",
    response_model=schemas.ParameterKlassifikationRead,
    status_code=status.HTTP_201_CREATED,
)
def create_parameter_klassifikation(
    parameter_id: str,
    payload: schemas.ParameterKlassifikationCreate,
    db: Session = Depends(get_db),
) -> schemas.ParameterKlassifikationRead:
    try:
        return service.create_parameter_klassifikation(db, parameter_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post(
    "/{parameter_id}/umrechnungsregeln",
    response_model=schemas.ParameterUmrechnungsregelRead,
    status_code=status.HTTP_201_CREATED,
)
def create_parameter_umrechnungsregel(
    parameter_id: str,
    payload: schemas.ParameterUmrechnungsregelCreate,
    db: Session = Depends(get_db),
) -> schemas.ParameterUmrechnungsregelRead:
    try:
        return service.create_parameter_umrechnungsregel(db, parameter_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.delete(
    "/dublettenausschluesse/{suppression_id}",
    response_model=schemas.ParameterDuplicateSuppressionDeleteResult,
)
def delete_parameter_duplicate_suppression(
    suppression_id: str,
    db: Session = Depends(get_db),
) -> schemas.ParameterDuplicateSuppressionDeleteResult:
    try:
        service.delete_parameter_duplicate_suppression(db, suppression_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return schemas.ParameterDuplicateSuppressionDeleteResult(suppression_id=suppression_id)


@router.delete(
    "/klassifikationen/{klassifikation_id}",
    response_model=schemas.ParameterKlassifikationDeleteResult,
)
def delete_parameter_klassifikation(
    klassifikation_id: str,
    db: Session = Depends(get_db),
) -> schemas.ParameterKlassifikationDeleteResult:
    try:
        return service.delete_parameter_klassifikation(db, klassifikation_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
