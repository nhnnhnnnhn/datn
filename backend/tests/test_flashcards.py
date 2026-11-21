import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.database import get_db
from app.main import app
from app.models import Idiom, IdiomAspect
from app.models.enums import AspectType, IdiomType

LOVE_ASPECT_ID = 5
LITERAL_ASPECT_ID = 8


@pytest.fixture()
def client():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(engine)
    make_session = sessionmaker(bind=engine, autocommit=False, autoflush=False)

    with make_session() as db:
        love = IdiomAspect(id=LOVE_ASPECT_ID, name="love", aspect="topic", type=AspectType.theme)
        literal = IdiomAspect(
            id=LITERAL_ASPECT_ID,
            name="literal",
            aspect="trait",
            type=AspectType.complexity_trait,
        )
        for phrase in ("một", "hai", "ba"):
            idiom = Idiom(phrase=phrase, type=IdiomType.idiom, meaning=f"nghĩa {phrase}")
            idiom.aspects = [love, literal]
            db.add(idiom)
        db.commit()

    def override_db():
        with make_session() as db:
            yield db

    app.dependency_overrides[get_db] = override_db
    with TestClient(app) as c:
        token = c.post(
            "/auth/register",
            json={"name": "A", "email": "a@test.local", "password": "secret12", "role": "student"},
        ).json()["token"]
        c.headers["Authorization"] = f"Bearer {token}"
        yield c
    app.dependency_overrides.clear()


def _new_deck(client: TestClient) -> dict:
    res = client.post("/flashcards/decks/generate", json={"count": 3})
    assert res.status_code == 200, res.text
    return res.json()


def test_generate_deck_filters_by_topic_and_trait(client):
    res = client.post(
        "/flashcards/decks/generate", json={"count": 3, "topic": "love", "trait": "literal"}
    )
    assert res.status_code == 200, res.text
    assert res.json()["cardCount"] == 3


def test_study_queue_returns_new_cards_up_to_limit(client):
    deck = _new_deck(client)
    res = client.get(f"/flashcards/decks/{deck['id']}/study", params={"newLimit": 2})
    assert res.status_code == 200
    assert len(res.json()) == 2


def test_study_queue_unknown_deck_is_404(client):
    assert client.get("/flashcards/decks/nope/study").status_code == 404


def test_review_updates_srs_and_leaves_the_new_queue(client):
    deck = _new_deck(client)
    card = client.get(f"/flashcards/decks/{deck['id']}/cards").json()[0]

    res = client.post(f"/flashcards/cards/{card['id']}/review", json={"rating": "good"})
    assert res.status_code == 200
    srs = res.json()["srs"]
    assert srs["repetitions"] == 1 and srs["interval"] == 1 and srs["lastReviewed"]

    queue = client.get(f"/flashcards/decks/{deck['id']}/study").json()
    assert card["id"] not in [c["id"] for c in queue]
    assert client.get("/progress/summary").json()["reviewCount"] == 1


def test_review_rejects_bad_rating_and_unknown_card(client):
    deck = _new_deck(client)
    card = client.get(f"/flashcards/decks/{deck['id']}/cards").json()[0]
    assert (
        client.post(f"/flashcards/cards/{card['id']}/review", json={"rating": "meh"}).status_code
        == 422
    )
    assert client.post("/flashcards/cards/9999/review", json={"rating": "good"}).status_code == 404


def test_save_idiom_is_idempotent_and_lands_in_saved_deck(client):
    first = client.post("/flashcards/saved", json={"idiomId": 1})
    again = client.post("/flashcards/saved", json={"idiomId": 1})
    assert first.status_code == 200 and again.json()["id"] == first.json()["id"]

    saved = [d for d in client.get("/flashcards/decks").json() if d["source"] == "saved"]
    assert len(saved) == 1 and saved[0]["cardCount"] == 1
    assert first.json()["deckId"] == saved[0]["id"]


def test_save_unknown_idiom_is_404(client):
    assert client.post("/flashcards/saved", json={"idiomId": 9999}).status_code == 404
