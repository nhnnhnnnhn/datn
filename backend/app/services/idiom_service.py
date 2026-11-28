from __future__ import annotations

import re
import unicodedata
from datetime import UTC, datetime

from fastapi import HTTPException
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from app.lib.aspects import ASPECT_ID_BY_TOPIC, ASPECT_ID_BY_TRAIT
from app.lib.serializers import idiom_out
from app.lib.text import fold
from app.models import Idiom, IdiomAspect, IdiomType


def _norm(text: str) -> str:
    text = unicodedata.normalize("NFC", text).lower()
    return re.sub(r"\s+", " ", text).strip()


def _load(db: Session, idiom_id: int) -> Idiom:
    idiom = db.query(Idiom).options(joinedload(Idiom.aspects)).filter(Idiom.id == idiom_id).first()
    if not idiom:
        raise HTTPException(status_code=404, detail="Không tìm thấy thành ngữ")
    return idiom


def get_idiom(db: Session, idiom_id: int) -> dict:
    return idiom_out(_load(db, idiom_id))


def list_idioms(
    db: Session,
    *,
    q: str | None = None,
    topic: str | None = None,
    trait: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> dict:
    page = max(1, page)
    page_size = min(100, max(1, page_size))

    query = db.query(Idiom).options(joinedload(Idiom.aspects)).filter(Idiom.archived_at.is_(None))

    if topic and topic in ASPECT_ID_BY_TOPIC:
        query = query.filter(Idiom.aspects.any(IdiomAspect.id == ASPECT_ID_BY_TOPIC[topic]))
    if trait and trait in ASPECT_ID_BY_TRAIT:
        query = query.filter(Idiom.aspects.any(IdiomAspect.id == ASPECT_ID_BY_TRAIT[trait]))

    if q:
        like = f"%{q.strip()}%"
        query = query.filter(or_(Idiom.phrase.ilike(like), Idiom.meaning.ilike(like)))

    total = query.count()
    rows = query.order_by(Idiom.phrase.asc()).offset((page - 1) * page_size).limit(page_size).all()

    items = [idiom_out(r) for r in rows]
    if q:
        nq = _norm(q)
        items.sort(
            key=lambda i: (
                0 if _norm(i["phrase"]).startswith(nq) else 1,
                _norm(i["phrase"]),
            )
        )

    return {"items": items, "total": total, "page": page, "pageSize": page_size}


def daily_idiom(db: Session) -> dict:
    total = db.query(func.count(Idiom.id)).filter(Idiom.archived_at.is_(None)).scalar() or 0
    if total == 0:
        raise HTTPException(status_code=404, detail="Chưa có dữ liệu thành ngữ")
    from datetime import date

    idx = date.today().toordinal() % total
    idiom = (
        db.query(Idiom)
        .options(joinedload(Idiom.aspects))
        .filter(Idiom.archived_at.is_(None))
        .order_by(Idiom.id)
        .offset(idx)
        .limit(1)
        .first()
    )
    return idiom_out(idiom)


def random_idiom(db: Session, topic: str | None = None, trait: str | None = None) -> dict:
    active = Idiom.archived_at.is_(None)
    query = db.query(Idiom).options(joinedload(Idiom.aspects)).filter(active)
    if topic and topic in ASPECT_ID_BY_TOPIC:
        query = query.filter(Idiom.aspects.any(IdiomAspect.id == ASPECT_ID_BY_TOPIC[topic]))
    if trait and trait in ASPECT_ID_BY_TRAIT:
        query = query.filter(Idiom.aspects.any(IdiomAspect.id == ASPECT_ID_BY_TRAIT[trait]))
    idiom = query.order_by(func.random()).first()
    if not idiom:
        idiom = (
            db.query(Idiom)
            .options(joinedload(Idiom.aspects))
            .filter(active)
            .order_by(func.random())
            .first()
        )
    if not idiom:
        raise HTTPException(status_code=404, detail="Chưa có dữ liệu thành ngữ")
    return idiom_out(idiom)


def neighbors(db: Session, idiom_id: int) -> list[dict]:
    _load(db, idiom_id)
    rows = (
        db.query(Idiom)
        .options(joinedload(Idiom.aspects))
        .filter(Idiom.archived_at.is_(None))
        .order_by(Idiom.phrase.asc())
        .all()
    )
    ids = [r.id for r in rows]
    if idiom_id not in ids:
        return []
    index = ids.index(idiom_id)
    start = max(0, index - 3)
    end = min(len(rows), index + 4)
    return [idiom_out(r) for r in rows[start:end]]


def _clean(db: Session, body, except_id: int | None = None) -> dict:
    phrase = body.phrase.strip()
    explanation = body.explanation.strip()
    if not phrase:
        raise HTTPException(status_code=400, detail="Vui lòng nhập thành ngữ, tục ngữ")
    if not explanation:
        raise HTTPException(status_code=400, detail="Vui lòng nhập phần giải thích")
    if body.topic not in ASPECT_ID_BY_TOPIC:
        raise HTTPException(status_code=400, detail="Chủ đề không hợp lệ")
    if any(trait not in ASPECT_ID_BY_TRAIT for trait in body.traits):
        raise HTTPException(status_code=400, detail="Đặc trưng không hợp lệ")

    key = fold(phrase)
    active = db.query(Idiom.id, Idiom.phrase).filter(Idiom.archived_at.is_(None)).all()
    if any(i != except_id and fold(p) == key for i, p in active):
        raise HTTPException(status_code=409, detail="Câu này đã có trong kho")

    citation = body.citation
    glossary = [
        {"term": g.term.strip(), "meaning": g.meaning.strip()}
        for g in body.glossary or []
        if g.term.strip() and g.meaning.strip()
    ]
    return {
        "phrase": phrase,
        "meaning": explanation,
        "aspect_ids": [ASPECT_ID_BY_TOPIC[body.topic]]
        + [ASPECT_ID_BY_TRAIT[t] for t in dict.fromkeys(body.traits)],
        "note": (body.note or "").strip() or None,
        "citation": (
            {"text": citation.text.strip(), "source": citation.source.strip()}
            if citation and citation.text.strip()
            else None
        ),
        "glossary": glossary or None,
    }


def _apply(db: Session, idiom: Idiom, data: dict) -> None:
    idiom.phrase = data["phrase"]
    idiom.meaning = data["meaning"]
    idiom.note = data["note"]
    idiom.citation = data["citation"]
    idiom.glossary = data["glossary"]
    idiom.aspects = db.query(IdiomAspect).filter(IdiomAspect.id.in_(data["aspect_ids"])).all()


def create_idiom(db: Session, body) -> dict:
    data = _clean(db, body)
    idiom = Idiom(phrase=data["phrase"], type=IdiomType.idiom, meaning=data["meaning"])
    _apply(db, idiom, data)
    db.add(idiom)
    db.commit()
    return idiom_out(_load(db, idiom.id))


def _active(db: Session, idiom_id: int) -> Idiom:
    idiom = _load(db, idiom_id)
    if idiom.archived_at is not None:
        raise HTTPException(status_code=404, detail="Không tìm thấy thành ngữ")
    return idiom


def update_idiom(db: Session, idiom_id: int, body) -> dict:
    idiom = _active(db, idiom_id)
    _apply(db, idiom, _clean(db, body, except_id=idiom.id))
    db.commit()
    return idiom_out(_load(db, idiom_id))


def archive_idiom(db: Session, idiom_id: int) -> None:
    idiom = _active(db, idiom_id)
    idiom.archived_at = datetime.now(UTC)
    db.commit()
