from __future__ import annotations

import re
import unicodedata

from fastapi import HTTPException
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from app.lib.aspects import ASPECT_ID_BY_TOPIC, ASPECT_ID_BY_TRAIT
from app.lib.serializers import idiom_out
from app.models import Idiom, IdiomAspectMap


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

    query = db.query(Idiom).options(joinedload(Idiom.aspects))

    if topic and topic in ASPECT_ID_BY_TOPIC:
        query = query.join(IdiomAspectMap, IdiomAspectMap.idiom_id == Idiom.id).filter(
            IdiomAspectMap.aspect_id == ASPECT_ID_BY_TOPIC[topic]
        )
    if trait and trait in ASPECT_ID_BY_TRAIT:
        query = query.join(IdiomAspectMap, IdiomAspectMap.idiom_id == Idiom.id).filter(
            IdiomAspectMap.aspect_id == ASPECT_ID_BY_TRAIT[trait]
        )

    if q:
        like = f"%{q.strip()}%"
        query = query.filter(or_(Idiom.phrase.ilike(like), Idiom.meaning.ilike(like)))

    # distinct needed when joining aspect map twice conceptually — use subquery style
    query = query.distinct()
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
    total = db.query(func.count(Idiom.id)).scalar() or 0
    if total == 0:
        raise HTTPException(status_code=404, detail="Chưa có dữ liệu thành ngữ")
    from datetime import date

    idx = date.today().toordinal() % total
    idiom = (
        db.query(Idiom)
        .options(joinedload(Idiom.aspects))
        .order_by(Idiom.id)
        .offset(idx)
        .limit(1)
        .first()
    )
    return idiom_out(idiom)


def random_idiom(db: Session, topic: str | None = None, trait: str | None = None) -> dict:
    query = db.query(Idiom).options(joinedload(Idiom.aspects))
    if topic and topic in ASPECT_ID_BY_TOPIC:
        aspect_id = ASPECT_ID_BY_TOPIC[topic]
        query = query.join(IdiomAspectMap).filter(IdiomAspectMap.aspect_id == aspect_id)
    if trait and trait in ASPECT_ID_BY_TRAIT:
        aspect_id = ASPECT_ID_BY_TRAIT[trait]
        query = query.join(IdiomAspectMap).filter(IdiomAspectMap.aspect_id == aspect_id)
    idiom = query.order_by(func.random()).first()
    if not idiom:
        idiom = db.query(Idiom).options(joinedload(Idiom.aspects)).order_by(func.random()).first()
    if not idiom:
        raise HTTPException(status_code=404, detail="Chưa có dữ liệu thành ngữ")
    return idiom_out(idiom)


def neighbors(db: Session, idiom_id: int) -> list[dict]:
    _load(db, idiom_id)
    rows = db.query(Idiom).options(joinedload(Idiom.aspects)).order_by(Idiom.phrase.asc()).all()
    ids = [r.id for r in rows]
    try:
        index = ids.index(idiom_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail="Không tìm thấy thành ngữ") from exc
    start = max(0, index - 3)
    end = min(len(rows), index + 4)
    return [idiom_out(r) for r in rows[start:end]]
