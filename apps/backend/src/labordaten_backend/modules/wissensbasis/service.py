from __future__ import annotations

from datetime import datetime
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from labordaten_backend.core.runtime_settings import get_runtime_settings_store
from labordaten_backend.models.laborparameter import Laborparameter
from labordaten_backend.models.wissensseite import Wissensseite
from labordaten_backend.modules.wissensbasis.schemas import (
    WissensseiteCreate,
    WissensseiteDeleteResult,
    WissensseiteDetailRead,
    WissensseiteListRead,
)


def list_wissensseiten(query: str | None = None, db: Session | None = None) -> list[WissensseiteListRead]:
    root = _knowledge_root()
    if not root.exists():
        return []

    normalized_query = (query or "").strip().lower()
    items: list[WissensseiteListRead] = []
    for file_path in sorted(root.rglob("*.md")):
        if ".obsidian" in file_path.parts:
            continue
        detail = _read_markdown_file(root, file_path)
        if normalized_query and not _matches_query(detail, normalized_query):
            continue
        delete_block_reason = _build_delete_block_reason(db, detail.pfad_relativ)
        items.append(
            WissensseiteListRead(
                pfad_relativ=detail.pfad_relativ,
                pfad_absolut=detail.pfad_absolut,
                titel=detail.titel,
                aliases=detail.aliases,
                excerpt=detail.excerpt,
                geaendert_am=detail.geaendert_am,
                loeschbar=delete_block_reason is None,
                loesch_sperrgrund=delete_block_reason,
            )
        )
    return items


def get_wissensseite_detail(pfad_relativ: str, db: Session | None = None) -> WissensseiteDetailRead | None:
    root = _knowledge_root()
    try:
        file_path = _resolve_markdown_path(root, pfad_relativ)
    except ValueError:
        return None
    if not file_path.exists():
        return None
    detail = _read_markdown_file(root, file_path)
    delete_block_reason = _build_delete_block_reason(db, detail.pfad_relativ)
    detail.loeschbar = delete_block_reason is None
    detail.loesch_sperrgrund = delete_block_reason
    return detail


def create_wissensseite(payload: WissensseiteCreate) -> WissensseiteDetailRead:
    root = _knowledge_root()
    file_path = _resolve_markdown_path(root, payload.pfad_relativ)
    if file_path.exists():
        raise ValueError("Unter diesem Pfad existiert bereits eine Wissensseite.")

    title = payload.titel.strip()
    if not title:
        raise ValueError("Ein Titel ist erforderlich.")

    body = (payload.inhalt_markdown or "").strip()
    if not body:
        body = f"# {title}\n"
    elif not body.startswith("---") and not body.lstrip().startswith("#"):
        body = f"# {title}\n\n{body}"

    file_path.parent.mkdir(parents=True, exist_ok=True)
    file_path.write_text(body.rstrip() + "\n", encoding="utf-8")
    return _read_markdown_file(root, file_path)


def delete_wissensseite(db: Session, pfad_relativ: str) -> WissensseiteDeleteResult | None:
    root = _knowledge_root()
    try:
        file_path = _resolve_markdown_path(root, pfad_relativ)
    except ValueError as exc:
        raise ValueError(str(exc)) from exc

    if not file_path.exists():
        return None

    normalized_path = file_path.relative_to(root).as_posix()
    delete_block_reason = _build_delete_block_reason(db, normalized_path)
    if delete_block_reason:
        raise ValueError(delete_block_reason)

    wissensseite = db.scalar(select(Wissensseite).where(Wissensseite.pfad_relativ == normalized_path))
    file_path.unlink()
    if wissensseite is not None:
        db.delete(wissensseite)
    db.commit()
    return WissensseiteDeleteResult(pfad_relativ=normalized_path)


def _build_delete_block_reason(db: Session | None, pfad_relativ: str) -> str | None:
    if pfad_relativ.startswith("01 Rohquellen/"):
        return "Rohquellen bleiben unverändert und können hier nicht gelöscht werden."
    if db is None:
        return None

    wissensseite = db.scalar(select(Wissensseite).where(Wissensseite.pfad_relativ == pfad_relativ))
    if wissensseite is None:
        return None

    linked_parameter = db.scalar(
        select(Laborparameter)
        .where(Laborparameter.wissensseite_id == wissensseite.id)
        .limit(1)
    )
    if linked_parameter is not None:
        return f"Diese Wissensseite ist noch mit dem Parameter '{linked_parameter.anzeigename}' verknüpft."
    return None


def _knowledge_root() -> Path:
    runtime_settings = get_runtime_settings_store().get()
    return Path(runtime_settings.knowledge_path).expanduser().resolve()


def _resolve_markdown_path(root: Path, pfad_relativ: str) -> Path:
    cleaned = pfad_relativ.strip().replace("\\", "/")
    if not cleaned:
        raise ValueError("Ein relativer Pfad ist erforderlich.")
    if cleaned.startswith("/") or cleaned.startswith("../") or "/../" in cleaned or cleaned == "..":
        raise ValueError("Der Pfad muss innerhalb der Wissensbasis liegen.")

    file_path = (root / cleaned).resolve()
    if file_path != root and root not in file_path.parents:
        raise ValueError("Der Pfad muss innerhalb der Wissensbasis liegen.")
    if ".obsidian" in file_path.parts:
        raise ValueError("Interne Obsidian-Dateien werden nicht als Wissensseiten verwaltet.")
    if file_path.suffix.lower() != ".md":
        raise ValueError("Wissensseiten müssen Markdown-Dateien mit der Endung .md sein.")
    return file_path


def _read_markdown_file(root: Path, file_path: Path) -> WissensseiteDetailRead:
    content = file_path.read_text(encoding="utf-8")
    frontmatter, body = _split_frontmatter(content)
    title = _extract_title(frontmatter, body, file_path.stem)
    aliases = _extract_aliases(frontmatter)
    excerpt = _build_excerpt(body)
    return WissensseiteDetailRead(
        pfad_relativ=file_path.relative_to(root).as_posix(),
        pfad_absolut=str(file_path),
        titel=title,
        aliases=aliases,
        excerpt=excerpt,
        geaendert_am=datetime.fromtimestamp(file_path.stat().st_mtime),
        frontmatter=frontmatter,
        inhalt_markdown=body.strip(),
    )


def _split_frontmatter(content: str) -> tuple[dict[str, object], str]:
    if not content.startswith("---\n"):
        return {}, content

    lines = content.splitlines()
    try:
        end_index = lines[1:].index("---") + 1
    except ValueError:
        return {}, content

    frontmatter_lines = lines[1:end_index]
    body = "\n".join(lines[end_index + 1 :])
    return _parse_frontmatter(frontmatter_lines), body


def _parse_frontmatter(lines: list[str]) -> dict[str, object]:
    result: dict[str, object] = {}
    current_list_key: str | None = None
    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        if stripped.startswith("- ") and current_list_key:
            result.setdefault(current_list_key, [])
            casted = result[current_list_key]
            if isinstance(casted, list):
                casted.append(stripped.removeprefix("- ").strip())
            continue
        if ":" not in line:
            current_list_key = None
            continue
        key, raw_value = line.split(":", 1)
        key = key.strip()
        value = raw_value.strip()
        if not value:
            result[key] = []
            current_list_key = key
            continue
        result[key] = value.strip("\"'")
        current_list_key = None
    return result


def _extract_title(frontmatter: dict[str, object], body: str, fallback: str) -> str:
    for key in ("titel", "title"):
        value = frontmatter.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    for line in body.splitlines():
        stripped = line.strip()
        if stripped.startswith("# "):
            return stripped.removeprefix("# ").strip()
    return fallback


def _extract_aliases(frontmatter: dict[str, object]) -> list[str]:
    value = frontmatter.get("aliases") or frontmatter.get("alias")
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if isinstance(value, str):
        parts = [item.strip() for item in value.split(",")]
        return [item for item in parts if item]
    return []


def _build_excerpt(body: str) -> str | None:
    for line in body.splitlines():
        stripped = line.strip()
        if stripped and not stripped.startswith("#"):
            return stripped[:240]
    return None


def _matches_query(detail: WissensseiteDetailRead, query: str) -> bool:
    haystack = " ".join(
        [
            detail.titel,
            detail.pfad_relativ,
            " ".join(detail.aliases),
            detail.excerpt or "",
        ]
    ).lower()
    return query in haystack
