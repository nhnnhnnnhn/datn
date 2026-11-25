from __future__ import annotations

import random
import secrets
from datetime import UTC, datetime

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.lib.aspects import (
    ASPECT_ID_BY_TOPIC,
    ASPECT_ID_BY_TRAIT,
    TOPIC_DESCRIPTIONS,
    TOPIC_LABELS,
    TRAIT_LABELS,
)
from app.lib.serializers import apply_srs, card_out, deck_out, srs_from_card
from app.lib.srs import is_due, is_new, new_srs, schedule
from app.models import Deck, Flashcard, FlashcardReview, Idiom, IdiomAspect, Submission, User


def _uid(prefix: str = "") -> str:
    return f"{prefix}{secrets.token_hex(6)}"


def _cards_for(db: Session, deck_id: str, user_id: int) -> list[Flashcard]:
    return (
        db.query(Flashcard)
        .options(joinedload(Flashcard.idiom).joinedload(Idiom.aspects))
        .filter(Flashcard.deck_id == deck_id, Flashcard.user_id == user_id)
        .all()
    )


def _saved_deck(db: Session, user: User) -> Deck:
    deck_id = f"saved-{user.id}"
    deck = db.get(Deck, deck_id)
    if not deck:
        deck = Deck(
            id=deck_id,
            user_id=user.id,
            name="Câu đã lưu",
            description="Những câu bạn lưu khi tra cứu hoặc luyện viết.",
            source="saved",
        )
        db.add(deck)
        db.flush()
    return deck


def _ensure_default_decks(db: Session, user: User) -> None:
    has_topic_decks = (
        db.query(Deck.id).filter(Deck.user_id == user.id, Deck.source == "topic").first()
    )
    if has_topic_decks:
        return

    _saved_deck(db, user)
    now = datetime.now(UTC)
    for topic, aspect_id in ASPECT_ID_BY_TOPIC.items():
        idioms = db.query(Idiom).filter(Idiom.aspects.any(IdiomAspect.id == aspect_id)).all()
        if not idioms:
            continue
        deck = Deck(
            id=f"topic-{user.id}-{topic}",
            user_id=user.id,
            name=TOPIC_LABELS[topic],
            description=TOPIC_DESCRIPTIONS[topic],
            source="topic",
            topic=topic,
        )
        db.add(deck)
        db.flush()
        for idiom in idioms:
            card = Flashcard(
                user_id=user.id,
                idiom_id=idiom.id,
                deck_id=deck.id,
                front=idiom.phrase,
                back=idiom.meaning,
            )
            apply_srs(card, new_srs(now))
            db.add(card)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()


def list_decks(db: Session, user: User) -> list[dict]:
    _ensure_default_decks(db, user)
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
            raise HTTPException(
                status_code=400,
                detail="Không có câu nào phù hợp với tiêu chí đã chọn",
            )
        query = query.filter(Idiom.id.in_(weak_ids))
        criteria_bits.append("những câu bạn đạt điểm thấp khi luyện viết")
    else:
        if topic and topic in ASPECT_ID_BY_TOPIC:
            aspect_id = ASPECT_ID_BY_TOPIC[topic]
            query = query.filter(Idiom.aspects.any(IdiomAspect.id == aspect_id))
            criteria_bits.append(f"chủ đề “{TOPIC_LABELS[topic]}”")
        if trait and trait in ASPECT_ID_BY_TRAIT:
            aspect_id = ASPECT_ID_BY_TRAIT[trait]
            query = query.filter(Idiom.aspects.any(IdiomAspect.id == aspect_id))
            criteria_bits.append(f"đặc trưng “{TRAIT_LABELS[trait]}”")
        if not criteria_bits:
            criteria_bits.append("toàn bộ kho")

    idioms = query.distinct().order_by(Idiom.id).all()
    if not idioms:
        raise HTTPException(
            status_code=400,
            detail="Không có câu nào phù hợp với tiêu chí đã chọn",
        )

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

    now = datetime.now(UTC)
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


def study_queue(db: Session, user: User, deck_id: str, new_limit: int) -> list[dict]:
    get_deck(db, user, deck_id)
    now = datetime.now(UTC)
    cards = _cards_for(db, deck_id, user.id)
    due = sorted(
        (c for c in cards if not is_new(srs_from_card(c)) and is_due(srs_from_card(c), now)),
        key=lambda c: c.due_at,
    )
    fresh = [c for c in cards if is_new(srs_from_card(c))]
    random.shuffle(fresh)
    return [card_out(c) for c in [*due, *fresh[:new_limit]]]


def review_card(db: Session, user: User, card_id: int, rating: str) -> dict:
    card = _own_card(db, user, card_id)
    apply_srs(card, schedule(srs_from_card(card), rating))
    db.add(FlashcardReview(flashcard_id=card.id, rating=rating, reviewed_at=datetime.now(UTC)))
    db.commit()
    return card_out(card)


def save_idiom(db: Session, user: User, idiom_id: int) -> dict:
    idiom = db.get(Idiom, idiom_id)
    if not idiom:
        raise HTTPException(status_code=404, detail="Không tìm thấy thành ngữ")

    deck_id = _saved_deck(db, user).id

    card = (
        db.query(Flashcard)
        .filter(Flashcard.deck_id == deck_id, Flashcard.idiom_id == idiom_id)
        .first()
    )
    if not card:
        card = Flashcard(
            user_id=user.id,
            idiom_id=idiom_id,
            deck_id=deck_id,
            front=idiom.phrase,
            back=idiom.meaning,
        )
        apply_srs(card, new_srs())
        db.add(card)
        db.commit()
    return card_out(_own_card(db, user, card.id))


def _own_card(db: Session, user: User, card_id: int) -> Flashcard:
    card = (
        db.query(Flashcard)
        .options(joinedload(Flashcard.idiom).joinedload(Idiom.aspects))
        .filter(Flashcard.id == card_id, Flashcard.user_id == user.id)
        .first()
    )
    if not card:
        raise HTTPException(status_code=404, detail="Không tìm thấy thẻ")
    return card


def delete_deck(db: Session, user: User, deck_id: str) -> None:
    deck = db.query(Deck).filter(Deck.id == deck_id, Deck.user_id == user.id).first()
    if not deck or deck.source != "ai":
        raise HTTPException(status_code=400, detail="Chỉ xoá được bộ thẻ tự tạo")
    card_ids = db.query(Flashcard.id).filter(
        Flashcard.deck_id == deck_id,
        Flashcard.user_id == user.id,
    )
    db.query(FlashcardReview).filter(FlashcardReview.flashcard_id.in_(card_ids)).delete(
        synchronize_session=False
    )
    db.query(Flashcard).filter(Flashcard.deck_id == deck_id, Flashcard.user_id == user.id).delete()
    db.delete(deck)
    db.commit()
