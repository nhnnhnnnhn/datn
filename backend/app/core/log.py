import base64
import json
import logging
import sys
import time
import uuid
from contextvars import ContextVar

from starlette.types import ASGIApp, Message, Receive, Scope, Send

REQUEST_ID_HEADER = "X-Request-ID"
DEBUG_LOGS_HEADER = "X-Debug-Logs"
MAX_DEBUG_LOGS_BYTES = 6000

APP_LOGGER_PREFIX = "app."
THIRD_PARTY_TAGS = {
    "uvicorn.error": "SERVER",
    "uvicorn": "SERVER",
    "sqlalchemy": "DB",
    "alembic": "DB",
    "httpx": "HTTP-OUT",
}

request_id_var: ContextVar[str] = ContextVar("request_id", default="-")
client_logs_var: ContextVar[list[dict[str, str]] | None] = ContextVar("client_logs", default=None)


def get_logger(tag: str) -> logging.Logger:
    return logging.getLogger(f"{APP_LOGGER_PREFIX}{tag.upper()}")


def _feature_tag(record: logging.LogRecord) -> str:
    if record.name.startswith(APP_LOGGER_PREFIX):
        return record.name.removeprefix(APP_LOGGER_PREFIX)
    for prefix, tag in THIRD_PARTY_TAGS.items():
        if record.name == prefix or record.name.startswith(prefix + "."):
            return tag
    return record.name.split(".")[0].upper()


def _tag_for(record: logging.LogRecord) -> str:
    tag = f"[{_feature_tag(record)}]"
    if record.levelno >= logging.ERROR and tag != "[ERROR]":
        return f"[ERROR]{tag}"
    return tag


class TaggedFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        timestamp = time.strftime("%H:%M:%S", time.localtime(record.created))
        line = (
            f"{_tag_for(record)} {timestamp}.{int(record.msecs):03d} {record.levelname:<7} "
            f"req={request_id_var.get()} | {record.getMessage()}"
        )
        if record.exc_info:
            line += "\n" + self.formatException(record.exc_info)
        return line


class ClientLogHandler(logging.Handler):
    def emit(self, record: logging.LogRecord) -> None:
        buffer = client_logs_var.get()
        if buffer is None:
            return
        message = record.getMessage()
        if record.exc_info and record.exc_info[1] is not None:
            message += f" ({type(record.exc_info[1]).__name__}: {record.exc_info[1]})"
        buffer.append({"tag": _feature_tag(record), "level": record.levelname, "msg": message})


def setup_logging(level: str = "INFO", log_to_client: bool = False) -> None:
    stream = logging.StreamHandler(sys.stdout)
    stream.setFormatter(TaggedFormatter())
    handlers: list[logging.Handler] = [stream]
    if log_to_client:
        handlers.append(ClientLogHandler())

    root = logging.getLogger()
    root.handlers = handlers
    root.setLevel(level.upper())

    for name in ("uvicorn", "uvicorn.error"):
        logging.getLogger(name).handlers = []
        logging.getLogger(name).propagate = True
    logging.getLogger("uvicorn.access").disabled = True


def _encode_client_logs(entries: list[dict[str, str]]) -> str:
    kept: list[dict[str, str]] = []
    for entry in entries:
        candidate = json.dumps([*kept, entry], ensure_ascii=False).encode()
        if len(base64.urlsafe_b64encode(candidate)) > MAX_DEBUG_LOGS_BYTES:
            kept.append({"tag": "LOG", "level": "WARNING", "msg": "truncated, see server output"})
            break
        kept.append(entry)
    return base64.urlsafe_b64encode(json.dumps(kept, ensure_ascii=False).encode()).decode()


class RequestContextMiddleware:
    def __init__(self, app: ASGIApp, log_to_client: bool = False) -> None:
        self.app = app
        self.log_to_client = log_to_client
        self.log = get_logger("HTTP")

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        headers = dict(scope["headers"])
        request_id = headers.get(REQUEST_ID_HEADER.lower().encode(), b"").decode()
        request_id = request_id or uuid.uuid4().hex[:12]
        request_id_token = request_id_var.set(request_id)
        buffer: list[dict[str, str]] | None = [] if self.log_to_client else None
        buffer_token = client_logs_var.set(buffer)

        method, path = scope["method"], scope["path"]
        started = time.perf_counter()
        response_started = False
        self.log.debug("-> %s %s", method, path)

        def build_headers(raw: list[tuple[bytes, bytes]]) -> list[tuple[bytes, bytes]]:
            raw = [*raw, (REQUEST_ID_HEADER.encode(), request_id.encode())]
            if buffer:
                raw.append((DEBUG_LOGS_HEADER.encode(), _encode_client_logs(buffer).encode()))
            return raw

        async def send_wrapper(message: Message) -> None:
            nonlocal response_started
            if message["type"] == "http.response.start":
                response_started = True
                status = message["status"]
                elapsed_ms = (time.perf_counter() - started) * 1000
                level = (
                    logging.ERROR
                    if status >= 500
                    else logging.WARNING
                    if status >= 400
                    else logging.INFO
                )
                self.log.log(level, "<- %s %s %s %.1fms", status, method, path, elapsed_ms)
                message["headers"] = build_headers(list(message.get("headers", [])))
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
        except Exception as exc:
            self.log.exception("unhandled %s on %s %s", type(exc).__name__, method, path)
            if response_started:
                raise
            body = json.dumps(
                {"detail": "Internal Server Error", "request_id": request_id}
            ).encode()
            await send_wrapper(
                {
                    "type": "http.response.start",
                    "status": 500,
                    "headers": [(b"content-type", b"application/json")],
                }
            )
            await send({"type": "http.response.body", "body": body})
        finally:
            request_id_var.reset(request_id_token)
            client_logs_var.reset(buffer_token)
