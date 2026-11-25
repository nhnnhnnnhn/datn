import pytest
from scripts.seed_idioms import seed
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.lib.serializers import idiom_out
from app.models import Flashcard, Idiom, IdiomAspect, IdiomAspectMap
from app.models.enums import AspectType

FIRST = {
    "id": 1,
    "phrase": "một",
    "explanation": "Nghĩa một.",
    "topic": "love",
    "traits": ["literal"],
    "glossary": [{"term": "Ghe", "meaning": "Thuyền"}],
    "note": "Bối cảnh",
    "citation": {"text": "Trăm năm", "source": "Ca dao"},
}
SECOND = {"id": 2, "phrase": "hai", "explanation": "Nghĩa hai.", "topic": "social", "traits": []}


@pytest.fixture()
def db():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(engine)
    with sessionmaker(bind=engine, autocommit=False, autoflush=False)() as session:
        session.add_all(
            IdiomAspect(id=i, name=str(i), aspect="a", type=AspectType.theme) for i in (4, 5, 8)
        )
        session.commit()
        yield session


def test_seed_stores_split_fields_and_aspect_links(db):
    seed(db, [FIRST, SECOND])

    first = idiom_out(db.get(Idiom, 1))
    assert first["glossary"] == FIRST["glossary"]
    assert first["note"] == "Bối cảnh" and first["citation"] == FIRST["citation"]
    assert first["topic"] == "love" and first["traits"] == ["literal"]
    assert not {"glossary", "note", "citation"} & idiom_out(db.get(Idiom, 2)).keys()
    assert db.query(IdiomAspectMap).count() == 3


def test_seed_without_flags_leaves_existing_idioms_alone(db):
    seed(db, [FIRST, SECOND])
    seed(db, [{**FIRST, "explanation": "đổi"}])
    assert db.get(Idiom, 1).meaning == "Nghĩa một."


def test_refresh_updates_texts_adds_new_and_keeps_referenced_ones(db):
    stale_used = {**SECOND, "id": 3, "phrase": "ba"}
    stale_unused = {**SECOND, "id": 4, "phrase": "bốn"}
    seed(db, [FIRST, SECOND, stale_used, stale_unused])
    db.add(Flashcard(user_id=1, idiom_id=1, deck_id="d", front="một", back="cũ"))
    db.add(Flashcard(user_id=1, idiom_id=3, deck_id="d", front="ba", back="cũ"))
    db.commit()

    fresh = {"id": 5, "phrase": "năm", "explanation": "Nghĩa năm.", "topic": "love", "traits": []}
    seed(db, [{**FIRST, "explanation": "Nghĩa mới."}, SECOND, fresh], refresh_texts=True)

    assert db.get(Idiom, 1).meaning == "Nghĩa mới."
    assert db.get(Idiom, 5).phrase == "năm"
    assert db.get(Idiom, 3) is not None
    assert db.get(Idiom, 4) is None
    assert db.query(IdiomAspectMap).filter_by(idiom_id=4).count() == 0
    assert db.query(Flashcard).filter_by(idiom_id=1).one().back == "Nghĩa mới."
    assert db.query(Flashcard).filter_by(idiom_id=3).one().back == "Nghĩa hai."
