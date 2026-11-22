import base64
import json

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from app.core.log import (
    DEBUG_LOGS_HEADER,
    REQUEST_ID_HEADER,
    RequestContextMiddleware,
    get_logger,
    setup_logging,
)


def make_client(log_to_client: bool) -> TestClient:
    setup_logging("DEBUG", log_to_client)
    log = get_logger("QUIZ")
    app = FastAPI()
    app.add_middleware(RequestContextMiddleware, log_to_client=log_to_client)

    @app.get("/ok")
    def ok() -> dict[str, str]:
        log.info("loaded quiz quiz_id=%s", 7)
        return {"status": "ok"}

    @app.get("/missing")
    def missing() -> None:
        raise HTTPException(status_code=404, detail="not found")

    @app.get("/boom")
    def boom() -> None:
        raise RuntimeError("kaboom")

    return TestClient(app, raise_server_exceptions=False)


def decode_debug_logs(header: str) -> list[dict[str, str]]:
    return json.loads(base64.urlsafe_b64decode(header))


def test_generates_request_id_when_missing() -> None:
    res = make_client(log_to_client=False).get("/ok")
    assert res.status_code == 200
    assert len(res.headers[REQUEST_ID_HEADER]) == 12
    assert DEBUG_LOGS_HEADER not in res.headers


def test_echoes_incoming_request_id() -> None:
    res = make_client(log_to_client=False).get("/ok", headers={REQUEST_ID_HEADER: "abc123"})
    assert res.headers[REQUEST_ID_HEADER] == "abc123"


def test_forwards_backend_logs_to_client() -> None:
    res = make_client(log_to_client=True).get("/ok")
    entries = decode_debug_logs(res.headers[DEBUG_LOGS_HEADER])
    assert {"tag": "QUIZ", "level": "INFO", "msg": "loaded quiz quiz_id=7"} in entries


@pytest.mark.parametrize("path, status", [("/missing", 404), ("/boom", 500)])
def test_error_responses_carry_request_id(path: str, status: int) -> None:
    res = make_client(log_to_client=True).get(path)
    assert res.status_code == status
    assert REQUEST_ID_HEADER in res.headers
    if status == 500:
        assert res.json()["request_id"] == res.headers[REQUEST_ID_HEADER]
        entries = decode_debug_logs(res.headers[DEBUG_LOGS_HEADER])
        assert any("RuntimeError: kaboom" in e["msg"] for e in entries)


def test_console_format_starts_with_tag(capsys: pytest.CaptureFixture[str]) -> None:
    make_client(log_to_client=False).get("/boom")
    out = capsys.readouterr().out
    assert any(line.startswith("[QUIZ]") or line.startswith("[HTTP]") for line in out.splitlines())
    assert any(line.startswith("[ERROR][HTTP]") for line in out.splitlines())
