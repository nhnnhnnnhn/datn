"""Small OpenAI-compatible chat helper for the learning platform."""

from __future__ import annotations

import json
import os
import re
from typing import Any

# Gemini OpenAI-compatible endpoint (Google AI Studio)
GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai"


def make_client(api_key: str | None = None, model: str = "gpt-4o-mini"):
    """Create an OpenAI client. Uses Gemini's URL when the model name contains 'gemini'."""
    try:
        from openai import OpenAI
    except ImportError as exc:
        raise RuntimeError("Install openai: pip install openai") from exc

    key = api_key or os.environ.get("OPENAI_API_KEY") or os.environ.get("LLM_API_KEY") or ""
    if not key:
        raise RuntimeError("Missing LLM API key (OPENAI_API_KEY or LLM_API_KEY)")

    if "gemini" in model.lower():
        return OpenAI(api_key=key, base_url=GEMINI_BASE_URL)
    return OpenAI(api_key=key)


def chat_text(
    messages: list[dict[str, str]],
    *,
    model: str = "gpt-4o-mini",
    api_key: str | None = None,
    temperature: float = 0,
    max_tokens: int = 1200,
) -> str:
    client = make_client(api_key=api_key, model=model)
    resp = client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
    )
    return (resp.choices[0].message.content or "").strip()


def chat_json(
    messages: list[dict[str, str]],
    *,
    model: str = "gpt-4o-mini",
    api_key: str | None = None,
    temperature: float = 0,
    max_tokens: int = 1500,
) -> dict[str, Any]:
    text = chat_text(
        messages,
        model=model,
        api_key=api_key,
        temperature=temperature,
        max_tokens=max_tokens,
    )
    return parse_json_object(text)


def parse_json_object(text: str) -> dict[str, Any]:
    """Pull the first JSON object out of a model reply."""
    text = text.strip()
    try:
        data = json.loads(text)
        if isinstance(data, dict):
            return data
    except json.JSONDecodeError:
        pass

    match = re.search(r"\{.*\}", text, re.S)
    if not match:
        raise ValueError(f"No JSON object in model reply: {text[:200]}")
    data = json.loads(match.group())
    if not isinstance(data, dict):
        raise ValueError("Expected a JSON object")
    return data
