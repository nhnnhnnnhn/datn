"""
Quiz generation from VIVID idiom records.

Default path is rule-based (stable, mirrors VIVID discriminative tasks).
Optional LLM path can enrich meaning/reverse/fill_blank items when a key is set.
"""

from __future__ import annotations

import json
import random
import re
import unicodedata
from pathlib import Path
from typing import Any

from ai.generation.validator import validate_questions
from ai.llm_client import chat_json, resolve_api_key, resolve_model

TOPIC_LABELS = {
    "criticism": "Phê phán",
    "life_lessons": "Bài học cuộc sống",
    "work_nature": "Lao động & Thiên nhiên",
    "social": "Quan hệ xã hội",
    "love": "Tình yêu",
    "virtues": "Phẩm chất đạo đức",
    "other": "Khác",
}

TRAIT_IDS = ["literal", "pragmatic", "sino_vietnamese", "uncommon_vocab", "folk_knowledge"]
TRAIT_LABELS = {
    "literal": "Nghĩa đen",
    "pragmatic": "Sắc thái ngữ dụng",
    "sino_vietnamese": "Từ Hán Việt",
    "uncommon_vocab": "Từ ít phổ biến",
    "folk_knowledge": "Kinh nghiệm dân gian",
}

WEAK_WORDS = {"thì", "có", "là", "mà", "cũng", "như", "một", "nào", "ấy", "cho", "hơn"}
LLM_TYPES = frozenset({"meaning", "reverse", "fill_blank"})
_PROMPT_PATH = Path(__file__).resolve().parents[1] / "prompts" / "quiz_generation.txt"


def _norm(text: str) -> str:
    text = unicodedata.normalize("NFC", text).lower()
    return re.sub(r"\s+", " ", text).strip()


def _first_sentence(text: str) -> str:
    parts = re.split(r"(?<=[.!?…])\s+", text.strip())
    return parts[0] if parts else text


def _shuffle(items: list[Any], rng: random.Random) -> list[Any]:
    out = list(items)
    rng.shuffle(out)
    return out


def _with_options(correct: str, distractors: list[str], rng: random.Random) -> dict[str, Any]:
    seen = {_norm(correct)}
    unique: list[str] = []
    for d in distractors:
        n = _norm(d)
        if n and n not in seen:
            seen.add(n)
            unique.append(d)
        if len(unique) == 3:
            break
    options = _shuffle([correct, *unique], rng)
    return {"options": options, "answer": [options.index(correct)]}


def build_question(
    idiom: dict[str, Any],
    qtype: str,
    all_idioms: list[dict[str, Any]],
    *,
    rng: random.Random | None = None,
) -> dict[str, Any] | None:
    rng = rng or random.Random()
    others = _shuffle([i for i in all_idioms if i["id"] != idiom["id"]], rng)
    explanation = f"“{idiom['phrase']}” có nghĩa là: {idiom['explanation']}"
    base = {"idiomId": idiom["id"], "explanation": explanation, "type": qtype}

    if qtype == "meaning":
        same = [o for o in others if o.get("topic") == idiom.get("topic")]
        pool = [_first_sentence(o["explanation"]) for o in [*same, *others]]
        return {
            **base,
            "prompt": "Câu sau có nghĩa là gì?",
            "highlight": idiom["phrase"],
            **_with_options(_first_sentence(idiom["explanation"]), pool, rng),
        }

    if qtype == "reverse":
        return {
            **base,
            "prompt": "Câu thành ngữ/tục ngữ nào phù hợp với lời giải nghĩa sau?",
            "highlight": _first_sentence(idiom["explanation"]),
            **_with_options(idiom["phrase"], [o["phrase"] for o in others], rng),
        }

    if qtype == "fill_blank":
        words = idiom["phrase"].split(" ")
        candidates = [
            {"w": w.replace(",", "").replace(".", ""), "i": i}
            for i, w in enumerate(words)
            if len(w.replace(",", "").replace(".", "")) > 1
            and _norm(w.replace(",", "").replace(".", "")) not in WEAK_WORDS
        ]
        if len(words) < 3 or not candidates:
            return None
        pick = rng.choice(candidates[1:] or candidates)
        w, i = pick["w"], pick["i"]
        blanked = " ".join(
            word.replace(w, "_____") if idx == i else word for idx, word in enumerate(words)
        )
        pool = [
            x.replace(",", "").replace(".", "")
            for o in others
            for x in o["phrase"].split(" ")
            if len(x) > 1 and _norm(x) not in WEAK_WORDS
        ]
        answer = w if i == 0 else w.lower()
        distractors = [
            (x[:1].upper() + x[1:] if i == 0 else x.lower()) for x in _shuffle(pool, rng)
        ]
        return {
            **base,
            "prompt": "Chọn từ thích hợp điền vào chỗ trống:",
            "highlight": blanked,
            **_with_options(answer, distractors, rng),
        }

    if qtype == "traits":
        traits = idiom.get("traits") or []
        options = [TRAIT_LABELS[t] for t in TRAIT_IDS] + ["Không mang đặc trưng nào"]
        answer = [i for i, t in enumerate(TRAIT_IDS) if t in traits] if traits else [len(TRAIT_IDS)]
        labels = ", ".join(TRAIT_LABELS[t].lower() for t in traits)
        trait_note = (
            f"“{idiom['phrase']}” có đặc trưng là {labels}."
            if traits
            else f"“{idiom['phrase']}” không mang đặc trưng ngôn ngữ nào."
        )
        return {
            **base,
            "prompt": "Câu sau mang những đặc trưng ngôn ngữ nào? Chọn tất cả đáp án đúng.",
            "highlight": idiom["phrase"],
            "options": options,
            "answer": answer,
            "explanation": trait_note,
        }

    if qtype == "topic":
        topic = idiom.get("topic") or "other"
        correct = TOPIC_LABELS[topic]
        distractors = [
            TOPIC_LABELS[t]
            for t in _shuffle([t for t in TOPIC_LABELS if t not in (topic, "other")], rng)
        ]
        return {
            **base,
            "prompt": "Câu sau thuộc chủ đề nào?",
            "highlight": idiom["phrase"],
            **_with_options(correct, distractors, rng),
        }

    return None


def generate_questions_rule_based(
    idioms: list[dict[str, Any]],
    *,
    count: int = 10,
    types: list[str] | None = None,
    topic: str | None = None,
    trait: str | None = None,
    seed: int | None = None,
    all_idioms: list[dict[str, Any]] | None = None,
) -> list[dict[str, Any]]:
    """Build up to `count` quiz questions from a pool of idiom dicts (deterministic)."""
    rng = random.Random(seed)
    types = types or ["meaning", "reverse", "fill_blank", "topic", "traits"]
    bank = all_idioms or idioms
    pool = list(idioms)
    if topic:
        pool = [i for i in pool if i.get("topic") == topic]
    if trait:
        pool = [i for i in pool if trait in (i.get("traits") or [])]
    if not pool:
        pool = list(bank)

    pool = _shuffle(pool, rng)
    questions: list[dict[str, Any]] = []
    for idiom in pool:
        if len(questions) >= count:
            break
        qtype = types[len(questions) % len(types)]
        q = build_question(idiom, qtype, bank, rng=rng)
        if q:
            questions.append(q)
    return validate_questions(questions)


def generate_questions_llm(
    idioms: list[dict[str, Any]],
    *,
    count: int = 10,
    types: list[str] | None = None,
    model: str | None = None,
    api_key: str | None = None,
    base_url: str | None = None,
) -> list[dict[str, Any]]:
    """Ask an LLM for meaning/reverse/fill_blank items; validated before return."""
    key = resolve_api_key(api_key)
    if not key:
        raise RuntimeError("LLM API key required for generate_questions_llm")

    types = [t for t in (types or ["meaning", "reverse", "fill_blank"]) if t in LLM_TYPES]
    if not types:
        types = ["meaning", "reverse", "fill_blank"]

    sample = idioms[: max(count * 2, count)]
    payload = [
        {
            "id": i["id"],
            "phrase": i["phrase"],
            "explanation": i.get("explanation") or i.get("meaning") or "",
            "topic": i.get("topic"),
            "traits": i.get("traits") or [],
        }
        for i in sample
    ]
    prompt = _PROMPT_PATH.read_text(encoding="utf-8").format(
        idioms_json=json.dumps(payload, ensure_ascii=False, indent=2),
        count=count,
        types=", ".join(types),
    )
    data = chat_json(
        [{"role": "user", "content": prompt}],
        model=resolve_model(model),
        api_key=key,
        base_url=base_url,
        temperature=0.4,
        max_tokens=2500,
    )
    raw = data.get("questions") if isinstance(data, dict) else None
    if not isinstance(raw, list):
        raise ValueError("LLM quiz reply missing questions[]")
    return validate_questions(raw)[:count]


def generate_questions(
    idioms: list[dict[str, Any]],
    *,
    count: int = 10,
    types: list[str] | None = None,
    topic: str | None = None,
    trait: str | None = None,
    seed: int | None = None,
    all_idioms: list[dict[str, Any]] | None = None,
    use_llm: bool = False,
    model: str | None = None,
    api_key: str | None = None,
    base_url: str | None = None,
) -> list[dict[str, Any]]:
    """
    Generate quiz questions.

    use_llm=False (default): rule-based VIVID-style items (recommended).
    use_llm=True: try LLM for meaning/reverse/fill_blank, then fill remaining
    slots with rule-based questions (topic/traits always rule-based).
    """
    types = types or ["meaning", "reverse", "fill_blank", "topic", "traits"]
    bank = all_idioms or idioms
    pool = list(idioms)
    if topic:
        pool = [i for i in pool if i.get("topic") == topic]
    if trait:
        pool = [i for i in pool if trait in (i.get("traits") or [])]
    if not pool:
        pool = list(bank)

    questions: list[dict[str, Any]] = []
    llm_types = [t for t in types if t in LLM_TYPES]
    rule_types = types

    if use_llm and resolve_api_key(api_key) and llm_types:
        try:
            llm_count = min(count, max(1, sum(1 for t in types if t in LLM_TYPES)))
            # Prefer a proportional slice for LLM types
            llm_count = min(count, max(llm_count, count // 2 or 1))
            questions = generate_questions_llm(
                pool,
                count=llm_count,
                types=llm_types,
                model=model,
                api_key=api_key,
                base_url=base_url,
            )
        except Exception:
            questions = []

    if len(questions) < count:
        needed = count - len(questions)
        used_ids = {(q["idiomId"], q["type"]) for q in questions}
        extra = generate_questions_rule_based(
            pool,
            count=needed + 5,
            types=rule_types,
            seed=seed,
            all_idioms=bank,
        )
        for q in extra:
            key = (q["idiomId"], q["type"])
            if key in used_ids:
                continue
            questions.append(q)
            used_ids.add(key)
            if len(questions) >= count:
                break

    return questions[:count]
