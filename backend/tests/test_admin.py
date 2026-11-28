import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.main import app
from app.models import User
from app.services import admin_service


def _create_user(
    admin, email="s1@test.local", name="Học Sinh", role="student", password="secret12"
):
    res = admin.post(
        "/admin/users", json={"name": name, "email": email, "password": password, "role": role}
    )
    assert res.status_code == 201, res.text
    return res.json()


def _login(email, password="secret12"):
    with TestClient(app) as anonymous:
        return anonymous.post("/auth/login", json={"email": email, "password": password})


def test_admin_routes_reject_students_and_anonymous(client):
    for method, path in [
        ("get", "/admin/stats"),
        ("get", "/admin/users"),
        ("post", "/admin/users"),
        ("post", "/admin/idioms"),
    ]:
        assert getattr(client, method)(path).status_code == 403, path
    with TestClient(app) as anonymous:
        assert anonymous.get("/admin/stats").status_code == 401


def test_register_cannot_create_admin(client):
    admin = client.post(
        "/auth/register",
        json={"name": "T", "email": "t@test.local", "password": "secret12", "role": "admin"},
    )
    assert admin.status_code == 422


def test_stats(admin_client):
    _create_user(admin_client)
    data = admin_client.get("/admin/stats").json()
    assert data["users"] == {"total": 2, "students": 1, "admins": 1, "newLast7Days": 2}
    assert data["content"]["idioms"] == 3
    assert data["content"]["byTopic"] == {
        "criticism": 0,
        "life_lessons": 0,
        "work_nature": 0,
        "social": 0,
        "love": 3,
        "virtues": 0,
        "other": 0,
    }
    assert data["activity"] == {"gradings": 0, "quizzes": 0, "flashcardReviews": 0}
    assert len(data["signupsByDay"]) == 14
    assert data["signupsByDay"][-1]["count"] == 2
    assert [d["date"] for d in data["signupsByDay"]] == sorted(
        d["date"] for d in data["signupsByDay"]
    )


def test_create_user_validation(admin_client):
    def post(**patch):
        body = {"name": "Tên", "email": "x@test.local", "password": "secret12", "role": "student"}
        return admin_client.post("/admin/users", json={**body, **patch})

    assert post(name=" ").json()["detail"] == "Vui lòng nhập họ tên"
    assert post(email="khong-co-a-cong").json()["detail"] == "Email không hợp lệ"
    assert post(password="12345").json()["detail"] == "Mật khẩu cần tối thiểu 6 ký tự"
    assert post(role="owner").json()["detail"] == "Vai trò không hợp lệ"
    assert post(email="ADMIN@test.local").status_code == 409


def test_created_user_can_sign_in(admin_client):
    created = _create_user(admin_client, email="Moi@Test.Local")
    assert created["email"] == "moi@test.local"
    assert created["active"] is True and created["role"] == "student"
    assert _login("moi@test.local").status_code == 200


def test_list_users_search_filter_and_paginate(admin_client):
    _create_user(admin_client, email="a1@test.local", name="Nguyễn An")
    _create_user(admin_client, email="b2@test.local", name="Trần Bình")
    _create_user(admin_client, email="c3@test.local", name="Lê Cường", role="admin")

    page = admin_client.get("/admin/users", params={"pageSize": 2}).json()
    assert page["total"] == 4 and page["page"] == 1 and page["pageSize"] == 2
    assert len(page["items"]) == 2
    assert page["items"][0]["email"] == "c3@test.local"

    second = admin_client.get("/admin/users", params={"pageSize": 2, "page": 2}).json()
    assert len(second["items"]) == 2

    assert admin_client.get("/admin/users", params={"q": "Bình"}).json()["total"] == 1
    assert admin_client.get("/admin/users", params={"q": "b2@test"}).json()["total"] == 1
    assert admin_client.get("/admin/users", params={"role": "admin"}).json()["total"] == 2
    assert admin_client.get("/admin/users", params={"role": "student"}).json()["total"] == 2


def test_update_user(admin_client):
    user = _create_user(admin_client)
    res = admin_client.patch(
        f"/admin/users/{user['id']}", json={"name": " Tên Mới ", "role": "admin"}
    )
    assert res.status_code == 200, res.text
    assert res.json()["name"] == "Tên Mới" and res.json()["role"] == "admin"

    assert admin_client.patch(f"/admin/users/{user['id']}", json={}).status_code == 400
    assert admin_client.patch(f"/admin/users/{user['id']}", json={"name": " "}).status_code == 400
    assert admin_client.patch(f"/admin/users/{user['id']}", json={"role": "x"}).status_code == 400
    assert admin_client.patch("/admin/users/9999", json={"name": "A"}).status_code == 404


def test_locked_user_cannot_sign_in_or_use_a_token(admin_client):
    user = _create_user(admin_client)
    token = _login("s1@test.local").json()["token"]
    with TestClient(app) as student:
        student.headers["Authorization"] = f"Bearer {token}"
        assert student.get("/auth/me").status_code == 200

        locked = admin_client.patch(f"/admin/users/{user['id']}", json={"active": False})
        assert locked.json()["active"] is False
        assert student.get("/auth/me").status_code == 401
    refused = _login("s1@test.local")
    assert refused.status_code == 403
    assert refused.json()["detail"] == "Tài khoản đã bị khóa"
    assert _login("s1@test.local", "sai-mat-khau").status_code == 401

    admin_client.patch(f"/admin/users/{user['id']}", json={"active": True})
    assert _login("s1@test.local").status_code == 200


def test_admin_cannot_change_or_delete_themselves(admin_client):
    me = admin_client.get("/auth/me").json()
    assert (
        admin_client.patch(f"/admin/users/{me['id']}", json={"role": "student"}).status_code == 400
    )
    assert admin_client.patch(f"/admin/users/{me['id']}", json={"active": False}).status_code == 400
    assert admin_client.delete(f"/admin/users/{me['id']}").status_code == 400
    renamed = admin_client.patch(f"/admin/users/{me['id']}", json={"name": "Tên khác"})
    assert renamed.status_code == 200 and renamed.json()["name"] == "Tên khác"


def test_the_last_active_admin_is_protected(session_factory):
    with session_factory() as db:
        only = User(full_name="A", email="only@test.local", password_hash="x", role="admin")
        db.add(only)
        db.commit()
        with pytest.raises(HTTPException) as err:
            admin_service._keep_an_admin(db, only)
        assert err.value.status_code == 400


def test_deleting_a_user_removes_their_data(admin_client):
    user = _create_user(admin_client)
    token = _login("s1@test.local").json()["token"]
    with TestClient(app) as student:
        student.headers["Authorization"] = f"Bearer {token}"
        deck = student.post("/flashcards/decks/generate", json={"count": 2})
        assert deck.status_code == 200, deck.text

    assert admin_client.delete(f"/admin/users/{user['id']}").status_code == 204
    assert admin_client.get("/admin/users", params={"q": "s1@test"}).json()["total"] == 0
    assert _login("s1@test.local").status_code == 401
    assert admin_client.delete(f"/admin/users/{user['id']}").status_code == 404


def test_last_active_reflects_study_activity(admin_client):
    _create_user(admin_client)
    token = _login("s1@test.local").json()["token"]
    with TestClient(app) as student:
        student.headers["Authorization"] = f"Bearer {token}"
        deck = student.post("/flashcards/decks/generate", json={"count": 2}).json()
        card = student.get(f"/flashcards/decks/{deck['id']}/cards").json()[0]
        student.post(f"/flashcards/cards/{card['id']}/review", json={"rating": "good"})

    row = admin_client.get("/admin/users", params={"q": "s1@test"}).json()["items"][0]
    assert row["lastActiveAt"]
    assert admin_client.get("/admin/stats").json()["activity"]["flashcardReviews"] == 1


IDIOM = {
    "phrase": "Cây nhà lá vườn",
    "explanation": "Những thứ tự mình làm ra.",
    "topic": "love",
    "traits": ["literal", "literal"],
    "note": "  ghi chú  ",
    "citation": {"text": "Ca dao", "source": "Dân gian"},
    "glossary": [{"term": "vườn", "meaning": "khu đất"}, {"term": "", "meaning": ""}],
}


def test_create_idiom_is_visible_to_students(admin_client, client):
    res = admin_client.post("/admin/idioms", json=IDIOM)
    assert res.status_code == 201, res.text
    created = res.json()
    assert created["phrase"] == "Cây nhà lá vườn"
    assert created["explanation"] == "Những thứ tự mình làm ra."
    assert created["topic"] == "love" and created["traits"] == ["literal"]
    assert created["note"] == "ghi chú"
    assert created["citation"] == {"text": "Ca dao", "source": "Dân gian"}
    assert created["glossary"] == [{"term": "vườn", "meaning": "khu đất"}]

    found = client.get("/idioms", params={"q": "Cây nhà"}).json()
    assert found["total"] == 1 and found["items"][0]["id"] == created["id"]
    assert client.get("/idioms").json()["total"] == 4


def test_create_idiom_validation(admin_client):
    def post(**patch):
        return admin_client.post("/admin/idioms", json={**IDIOM, **patch})

    assert post(phrase="  ").json()["detail"] == "Vui lòng nhập thành ngữ, tục ngữ"
    assert post(explanation="").json()["detail"] == "Vui lòng nhập phần giải thích"
    assert post(topic="nope").json()["detail"] == "Chủ đề không hợp lệ"
    assert post(traits=["nope"]).json()["detail"] == "Đặc trưng không hợp lệ"
    assert admin_client.post("/admin/idioms", json=IDIOM).status_code == 201
    duplicate = post(phrase="CAY NHA LA VUON")
    assert duplicate.status_code == 409
    assert duplicate.json()["detail"] == "Câu này đã có trong kho"


def test_update_idiom(admin_client, client):
    created = admin_client.post("/admin/idioms", json=IDIOM).json()
    body = {"phrase": "Cây nhà lá vườn", "explanation": "Đã sửa.", "topic": "other", "traits": []}
    res = admin_client.patch(f"/admin/idioms/{created['id']}", json=body)
    assert res.status_code == 200, res.text
    assert res.json()["explanation"] == "Đã sửa." and res.json()["topic"] == "other"
    assert "note" not in res.json() and "glossary" not in res.json()
    assert client.get(f"/idioms/{created['id']}").json()["explanation"] == "Đã sửa."

    taken = {**body, "phrase": "một"}
    assert admin_client.patch(f"/admin/idioms/{created['id']}", json=taken).status_code == 409
    assert admin_client.patch("/admin/idioms/9999", json=body).status_code == 404


def test_archiving_hides_an_idiom_but_keeps_it_reachable(admin_client, client):
    target = client.get("/idioms", params={"q": "hai"}).json()["items"][0]
    assert admin_client.delete(f"/admin/idioms/{target['id']}").status_code == 204

    assert client.get("/idioms").json()["total"] == 2
    assert target["id"] not in [i["id"] for i in client.get("/idioms").json()["items"]]
    assert client.get(f"/idioms/{target['id']}").status_code == 200
    assert client.get(f"/idioms/{target['id']}/neighbors").json() == []
    for _ in range(10):
        assert client.get("/idioms/random").json()["id"] != target["id"]
    assert client.get("/idioms/daily").json()["id"] != target["id"]
    assert admin_client.get("/admin/stats").json()["content"]["idioms"] == 2

    assert admin_client.delete(f"/admin/idioms/{target['id']}").status_code == 404
    body = {"phrase": "hai", "explanation": "x", "topic": "other", "traits": []}
    assert admin_client.patch(f"/admin/idioms/{target['id']}", json=body).status_code == 404

    deck = client.post("/flashcards/decks/generate", json={"count": 10}).json()
    assert deck["cardCount"] == 2


def test_idiom_writes_need_an_admin(client):
    assert client.post("/admin/idioms", json=IDIOM).status_code == 403
    assert client.patch("/admin/idioms/1", json=IDIOM).status_code == 403
    assert client.delete("/admin/idioms/1").status_code == 403
