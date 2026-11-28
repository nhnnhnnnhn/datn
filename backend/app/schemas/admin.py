from pydantic import BaseModel


class AdminUserIn(BaseModel):
    name: str = ""
    email: str = ""
    password: str = ""
    role: str = "student"


class AdminUserPatch(BaseModel):
    name: str | None = None
    role: str | None = None
    active: bool | None = None


class GlossaryItemIn(BaseModel):
    term: str = ""
    meaning: str = ""


class CitationIn(BaseModel):
    text: str = ""
    source: str = ""


class IdiomIn(BaseModel):
    phrase: str = ""
    explanation: str = ""
    topic: str = "other"
    traits: list[str] = []
    note: str | None = None
    citation: CitationIn | None = None
    glossary: list[GlossaryItemIn] | None = None
