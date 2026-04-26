from datetime import datetime

from pydantic import BaseModel


class WissensseiteListRead(BaseModel):
    pfad_relativ: str
    pfad_absolut: str
    titel: str
    aliases: list[str]
    excerpt: str | None = None
    geaendert_am: datetime
    loeschbar: bool = True
    loesch_sperrgrund: str | None = None


class WissensseiteDetailRead(WissensseiteListRead):
    frontmatter: dict[str, object]
    inhalt_markdown: str


class WissensseiteCreate(BaseModel):
    pfad_relativ: str
    titel: str
    inhalt_markdown: str | None = None


class WissensseiteDeleteResult(BaseModel):
    pfad_relativ: str
    geloescht: bool = True
