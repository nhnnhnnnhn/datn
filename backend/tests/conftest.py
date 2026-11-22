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
