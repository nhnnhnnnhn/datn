"""JSON stored as TEXT — works on SQL_ASCII databases that reject Unicode in JSONB."""

from __future__ import annotations

import json

from sqlalchemy import Text
from sqlalchemy.types import TypeDecorator


class JsonText(TypeDecorator):
    impl = Text
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        return json.dumps(value, ensure_ascii=False)

    def process_result_value(self, value, dialect):
        if value is None or value == "":
            return None
        if isinstance(value, (dict, list)):
            return value
        return json.loads(value)
