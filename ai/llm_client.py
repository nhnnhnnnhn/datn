"""OpenAI-compatible chat helper (OpenAI, Gemini, OpenRouter, custom base URL)."""

from __future__ import annotations

import json
import os
import re
from typing import Any

GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai"
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"

# Placeholders that must not trigger real LLM calls
_PLACEHOLDER_KEYS = frozenset({"", "default-api-key", "change-me", "none", "null"})
_PLACEHOLDER_MODELS = frozenset({"", "default-model", "none", "null"})


def resolve_api_key(api_key: str | None = None) -> str | None:
    key = (
        api_key or os.environ.get("OPENAI_API_KEY") or os.environ.get("LLM_API_KEY") or ""
    ).strip()
    if not key or key.lower() in _PLACEHOLDER_KEYS:
        return None
    return key


def resolve_model(model: str | None = None) -> str | None:
    """Prefer an explicit model, then LLM_MODEL from the environment."""
    for candidate in (model, os.environ.get("LLM_MODEL")):
        name = (candidate or "").strip()
        if name and name.lower() not in _PLACEHOLDER_MODELS:
            return name
    return None


def resolve_base_url(
    model: str, base_url: str | None = None, api_key: str | None = None
) -> str | None:
    explicit = (base_url or os.environ.get("LLM_BASE_URL") or "").strip()
    if explicit:
        return explicit.rstrip("/")
    # OpenRouter-style ids (provider/model) or OpenRouter keys
    key = api_key or ""
    if key.startswith("sk-or-") or "/" in model:
        return OPENROUTER_BASE_URL
    if "gemini" in model.lower():
        return GEMINI_BASE_URL
    return None


def make_client(
    api_key: str | None = None,
    model: str | None = None,
    base_url: str | None = None,
):
    """Create an OpenAI-compatible client."""
    try:
        from openai import OpenAI
    except ImportError as exc:
        raise RuntimeError("Install openai: pip install openai") from exc

    key = resolve_api_key(api_key)
    if not key:
        raise RuntimeError("Missing LLM API key (OPENAI_API_KEY or LLM_API_KEY)")

    resolved = resolve_model(model)
    if not resolved:
        raise RuntimeError("Missing LLM model (pass model= or set LLM_MODEL)")

    url = resolve_base_url(resolved, base_url=base_url, api_key=key)
    kwargs: dict[str, Any] = {"api_key": key}
    if url:
        kwargs["base_url"] = url
    return OpenAI(**kwargs)


def chat_text(
    messages: list[dict[str, str]],
    *,
    model: str | None = None,
    api_key: str | None = None,
    base_url: str | None = None,
    temperature: float = 0,
    max_tokens: int = 1200,
) -> str:
    resolved = resolve_model(model)
    if not resolved:
        raise RuntimeError("Missing LLM model (pass model= or set LLM_MODEL)")
    client = make_client(api_key=api_key, model=resolved, base_url=base_url)
    resp = client.chat.completions.create(
        model=resolved,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
    )
    return (resp.choices[0].message.content or "").strip()


def chat_json(
    messages: list[dict[str, str]],
    *,
    model: str | None = None,
    api_key: str | None = None,
    base_url: str | None = None,
    temperature: float = 0,
    max_tokens: int = 1500,
) -> dict[str, Any]:
    text = chat_text(
        messages,
        model=model,
        api_key=api_key,
        base_url=base_url,
        temperature=temperature,
        max_tokens=max_tokens,
    )
    return parse_json_object(text)


def parse_json_object(text: str) -> dict[str, Any]:
    """Pull the first JSON object out of a model reply."""
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
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
