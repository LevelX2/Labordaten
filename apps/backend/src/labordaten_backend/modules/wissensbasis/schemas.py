from datetime import datetime

from pydantic import BaseModel


class WissensseiteListRead(BaseModel):
    pfad_relativ: str
    pfad_absolut: str
    titel: str
    aliases: list[str]
    excerpt: str | None = None
    geaendert_am: datetime


class WissensseiteDetailRead(WissensseiteListRead):
    frontmatter: dict[str, object]
    inhalt_markdown: str
