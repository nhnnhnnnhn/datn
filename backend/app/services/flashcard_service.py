from __future__ import annotations

import secrets
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from app.lib.aspects import ASPECT_ID_BY_TOPIC, ASPECT_ID_BY_TRAIT, TOPIC_LABELS, TRAIT_LABELS
from app.lib.serializers import apply_srs, card_out, deck_out, idiom_out, srs_from_card
from app.lib.srs import is_due, is_new, new_srs, schedule
from app.models import Deck, Flashcard, FlashcardReview, Idiom, IdiomAspectMap, Submission, User


def _uid(prefix: str = "") -> str:
    return f"{prefix}{secrets.token_hex(6)}"


def _user_decks(db: Session, user: User) -> list[Deck]:
    return db.query(Deck).filter((Deck.user_id == user.id) | (Deck.user_id.is_(None))).all()


def _ensure_saved_deck(db: Session, user: User) -> Deck:
    deck = db.query(Deck).filter(Deck.id == f"saved-{user.id}").first()
    if deck:
        return deck
    deck = Deck(
        id=f"saved-{user.id}",
        user_id=user.id,
        name="Đã lưu",
        description="Các câu bạn đánh dấu để ôn.",
        source="saved",
    )
    db.add(deck)
    db.commit()
    db.refresh(deck)
    return deck


def _cards_for(db: Session, deck_id: str, user_id: int) -> list[Flashcard]:
    return (
        db.query(Flashcard)
        .options(joinedload(Flashcard.idiom).joinedload(Idiom.aspects))
        .filter(Flashcard.deck_id == deck_id, Flashcard.user_id == user_id)
        .all()
    )


def list_decks(db: Session, user: User) -> list[dict]:
    _ensure_saved_deck(db, user)
    decks = db.query(Deck).filter(Deck.user_id == user.id).all()
    order = {"saved": 0, "ai": 1, "topic": 2}
    views = [deck_out(d, _cards_for(db, d.id, user.id)) for d in decks]
    views.sort(key=lambda d: (order.get(d["source"], 9), d["createdAt"]), reverse=False)
    views.sort(key=lambda d: order.get(d["source"], 9))
    return views


def get_deck(db: Session, user: User, deck_id: str) -> dict:
    deck = db.query(Deck).filter(Deck.id == deck_id, Deck.user_id == user.id).first()
    if not deck:
        raise HTTPException(status_code=404, detail="Không tìm thấy bộ thẻ")
    return deck_out(deck, _cards_for(db, deck.id, user.id))


def list_cards(db: Session, user: User, deck_id: str) -> list[dict]:
    get_deck(db, user, deck_id)
    return [card_out(c) for c in _cards_for(db, deck_id, user.id)]


def study_queue(db: Session, user: User, deck_id: str, new_limit: int = 10) -> list[dict]:
    get_deck(db, user, deck_id)
    cards = _cards_for(db, deck_id, user.id)
    now = datetime.now(timezone.utc)
    due = sorted(
        [c for c in cards if not is_new(srs_from_card(c)) and is_due(srs_from_card(c), now)],
        key=lambda c: c.due_at or now,
    )
    fresh = [c for c in cards if is_new(srs_from_card(c))][:new_limit]
    return [card_out(c) for c in [*due, *fresh]]


def review(db: Session, user: User, card_id: str, rating: str) -> dict:
    if rating not in ("again", "hard", "good", "easy"):
        raise HTTPException(status_code=400, detail="Rating không hợp lệ")
    card = (
        db.query(Flashcard)
        .options(joinedload(Flashcard.idiom).joinedload(Idiom.aspects))
        .filter(Flashcard.id == int(card_id), Flashcard.user_id == user.id)
        .first()
    )
    if not card:
        raise HTTPException(status_code=404, detail="Không tìm thấy thẻ")

    srs = schedule(srs_from_card(card), rating)
    apply_srs(card, srs)
    conf = {"again": 1, "hard": 2, "good": 3, "easy": 4}[rating]
    db.add(FlashcardReview(flashcard_id=card.id, confidence_rating=conf, rating=rating))
    db.commit()
    db.refresh(card)
    return card_out(card)


def generate_deck(db: Session, user: User, config: dict) -> dict:
    count = int(config.get("count") or 10)
    topic = config.get("topic")
    trait = config.get("trait")
    from_weak = bool(config.get("fromWeak"))
    name = (config.get("name") or "").strip()

    query = db.query(Idiom).options(joinedload(Idiom.aspects))
    criteria_bits: list[str] = []

    if from_weak:
        scores = (
            db.query(Submission.idiom_id, Submission.overall_score)
            .filter(Submission.user_id == user.id)
            .all()
        )
        best: dict[int, float] = {}
        for idiom_id, overall in scores:
            val = float(overall or 0)
            best[idiom_id] = min(val, best.get(idiom_id, val)) if idiom_id in best else val
        weak_ids = [i for i, s in best.items() if s <= 3]
        if not weak_ids:
            raise HTTPException(status_code=400, detail="Không có câu nào phù hợp với tiêu chí đã chọn")
        query = query.filter(Idiom.id.in_(weak_ids))
        criteria_bits.append("những câu bạn đạt điểm thấp khi luyện viết")
    else:
        if topic and topic in ASPECT_ID_BY_TOPIC:
            query = query.join(IdiomAspectMap).filter(IdiomAspectMap.aspect_id == ASPECT_ID_BY_TOPIC[topic])
            criteria_bits.append(f'chủ đề “{TOPIC_LABELS[topic]}”')
        if trait and trait in ASPECT_ID_BY_TRAIT:
            query = query.join(IdiomAspectMap).filter(IdiomAspectMap.aspect_id == ASPECT_ID_BY_TRAIT[trait])
            criteria_bits.append(f'đặc trưng “{TRAIT_LABELS[trait]}”')
        if not criteria_bits:
            criteria_bits.append("toàn bộ kho")

    idioms = query.distinct().order_by(Idiom.id).all()
    if not idioms:
        raise HTTPException(status_code=400, detail="Không có câu nào phù hợp với tiêu chí đã chọn")

    import random

    random.shuffle(idioms)
    idioms = idioms[:count]

    deck_name = name or (
        "Ôn câu còn yếu"
        if from_weak
        else f"{TOPIC_LABELS[topic]} (tự tạo)"
        if topic
        else f"{TRAIT_LABELS[trait]} (tự tạo)"
        if trait
        else "Tổng hợp (tự tạo)"
    )
    deck = Deck(
        id=_uid("ai-"),
        user_id=user.id,
        name=deck_name,
        description=f"Tạo tự động từ {', '.join(criteria_bits)}.",
        source="ai",
        topic=topic,
    )
    db.add(deck)
    db.flush()

    now = datetime.now(timezone.utc)
    for idiom in idioms:
        srs = new_srs(now)
        db.add(
            Flashcard(
                user_id=user.id,
                idiom_id=idiom.id,
                deck_id=deck.id,
                front=idiom.phrase,
                back=idiom.meaning,
                generated_by="auto",
                ease=srs["ease"],
                interval_days=srs["interval"],
                repetitions=srs["repetitions"],
                due_at=now,
            )
        )
    db.commit()
    return get_deck(db, user, deck.id)


def save_idiom(db: Session, user: User, idiom_id: int) -> dict:
    idiom = db.query(Idiom).options(joinedload(Idiom.aspects)).filter(Idiom.id == idiom_id).first()
    if not idiom:
        raise HTTPException(status_code=404, detail="Không tìm thấy thành ngữ")
    deck = _ensure_saved_deck(db, user)
    existing = (
        db.query(Flashcard)
        .options(joinedload(Flashcard.idiom).joinedload(Idiom.aspects))
        .filter(Flashcard.deck_id == deck.id, Flashcard.idiom_id == idiom_id, Flashcard.user_id == user.id)
        .first()
    )
    if existing:
        return card_out(existing)

    now = datetime.now(timezone.utc)
    srs = new_srs(now)
    card = Flashcard(
        user_id=user.id,
        idiom_id=idiom.id,
        deck_id=deck.id,
        front=idiom.phrase,
        back=idiom.meaning,
        generated_by="saved",
        ease=srs["ease"],
        interval_days=0,
        repetitions=0,
        due_at=now,
    )
    db.add(card)
    db.commit()
    card = (
        db.query(Flashcard)
        .options(joinedload(Flashcard.idiom).joinedload(Idiom.aspects))
        .filter(Flashcard.id == card.id)
        .first()
    )
    return card_out(card)


def delete_deck(db: Session, user: User, deck_id: str) -> None:
    deck = db.query(Deck).filter(Deck.id == deck_id, Deck.user_id == user.id).first()
    if not deck or deck.source != "ai":
        raise HTTPException(status_code=400, detail="Chỉ xoá được bộ thẻ tự tạo")
    db.query(FlashcardReview).filter(
        FlashcardReview.flashcard_id.in_(
            db.query(Flashcard.id).filter(Flashcard.deck_id == deck_id, Flashcard.user_id == user.id)
        )
    ).delete(synchronize_session=False)
    db.query(Flashcard).filter(Flashcard.deck_id == deck_id, Flashcard.user_id == user.id).delete()
    db.delete(deck)
    db.commit()
