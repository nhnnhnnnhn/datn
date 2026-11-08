"""
Rule-based quiz generation from VIVID idiom records.

Question types: meaning | reverse | fill_blank | topic | traits
"""

from __future__ import annotations

import random
import re
import unicodedata
from typing import Any

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
    explanation = f"“{idiom['phrase']}”: {idiom['explanation']}"
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
        labels = ", ".join(TRAIT_LABELS[t].lower() for t in traits) or "không có đặc trưng nào"
        return {
            **base,
            "prompt": "Câu sau mang những đặc trưng ngôn ngữ nào? Chọn tất cả đáp án đúng.",
            "highlight": idiom["phrase"],
            "options": options,
            "answer": answer,
            "explanation": f"“{idiom['phrase']}” được gán nhãn trong VIVID: {labels}.",
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


def generate_questions(
    idioms: list[dict[str, Any]],
    *,
    count: int = 10,
    types: list[str] | None = None,
    topic: str | None = None,
    trait: str | None = None,
    seed: int | None = None,
    all_idioms: list[dict[str, Any]] | None = None,
) -> list[dict[str, Any]]:
    """Build up to `count` quiz questions from a pool of idiom dicts."""
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
    return questions
