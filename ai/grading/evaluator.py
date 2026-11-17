"""
Grade a student's Vietnamese idiom explanation.

Follows VIVID aspect-based LLM-as-a-Judge (Do et al., LREC 2026), with
learner-friendly structured feedback. Falls back to a trait-aware heuristic
when no LLM key is available or the call fails.
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import Any, Sequence

from ai.grading.feedback import clamp5, normalize_result
from ai.grading.rubric import SUMMARY_BY_OVERALL, TRAIT_LABELS
from ai.llm_client import chat_json, resolve_api_key, resolve_model

STOPWORDS = {
    "là",
    "của",
    "và",
    "có",
    "được",
    "cho",
    "những",
    "các",
    "một",
    "này",
    "đó",
    "thì",
    "mà",
    "để",
    "với",
    "khi",
    "như",
    "không",
    "cũng",
    "rất",
    "ra",
    "vào",
    "trong",
    "đã",
    "sẽ",
    "lại",
    "nên",
    "câu",
    "thành",
    "ngữ",
    "tục",
    "nghĩa",
    "chỉ",
    "việc",
    "sự",
    "về",
    "từ",
    "đến",
    "nói",
    "rằng",
    "hay",
    "hoặc",
    "ai",
    "gì",
    "nào",
    "ta",
    "mình",
    "đây",
    "lên",
    "bị",
    "theo",
    "nếu",
    "vì",
    "bởi",
    "làm",
    "người",
    "cái",
    "còn",
}

CUES = [
    "chê",
    "phê phán",
    "mỉa mai",
    "châm biếm",
    "chế giễu",
    "giễu",
    "khuyên",
    "răn",
    "đề cao",
    "ca ngợi",
    "tiêu cực",
    "vô ơn",
    "lợi dụng",
    "giả dối",
    "lừa",
    "lười",
    "tự cao",
    "khoe",
    "phản bội",
]

FIGURATIVE_CUES = ["ví như", "nghĩa bóng", "ẩn dụ", "tượng trưng", "tính cách", "hàm ý"]

_PROMPT_PATH = Path(__file__).resolve().parents[1] / "prompts" / "grading.txt"


def _load_prompt() -> str:
    return _PROMPT_PATH.read_text(encoding="utf-8")


def _tokens(text: str) -> set[str]:
    words = re.findall(r"\w+", text.lower(), flags=re.UNICODE)
    return {w for w in words if len(w) > 1 and w not in STOPWORDS}


def _has_any(text: str, cues: Sequence[str]) -> bool:
    padded = f" {text.lower()} "
    return any(f" {c} " in padded or c in text.lower() for c in cues)


def _empty_result(summary: str) -> dict[str, Any]:
    return normalize_result(
        {
            "scores": {"accuracy": 0, "nuance": 0, "fluency": 0, "completeness": 0},
            "overall": 0,
            "feedback": {
                "summary": summary,
                "comments": {k: summary for k in ("accuracy", "nuance", "fluency", "completeness")},
                "issues": [
                    {
                        "criterion": "fluency",
                        "type": "too_short",
                        "title": "Chưa có nội dung",
                        "detail": summary,
                    }
                ],
                "strengths": [],
                "missingKeywords": [],
            },
            "method": "empty",
        }
    )


def grade_heuristic(
    phrase: str,
    reference: str,
    answer: str,
    *,
    traits: Sequence[str] | None = None,
    topic: str | None = None,
) -> dict[str, Any]:
    """Offline fallback grader (word overlap + VIVID trait cues)."""
    del topic  # reserved for future cue packs
    traits = list(traits or [])
    ans = answer.strip()
    ans_set = _tokens(ans)
    ref_set = _tokens(reference)
    phrase_set = _tokens(phrase)

    if not ans:
        return _empty_result("Bài làm đang để trống. Hãy viết ít nhất một câu giải thích.")

    recall = len(ans_set & ref_set) / max(1, len(ref_set))
    # Lenient: ~25% keyword overlap can already reach a high accuracy band
    accuracy = clamp5((recall / 0.28) * 5) if ans_set else 0
    if ans_set and accuracy == 0 and recall > 0:
        accuracy = 1
    issues: list[dict[str, str]] = []

    if len(ans_set) < 2:
        accuracy = min(accuracy, 2)
        issues.append(
            {
                "criterion": "fluency",
                "type": "too_short",
                "title": "Bài làm hơi ngắn",
                "detail": "Thêm một câu ngắn nêu rõ ý câu muốn nói là được.",
            }
        )

    phrase_share = len(ans_set & phrase_set) / max(1, len(ans_set))
    if "literal" not in traits and phrase_share >= 0.7 and recall < 0.2 and len(ans_set) >= 3:
        accuracy = min(accuracy, 2)
        issues.append(
            {
                "criterion": "accuracy",
                "type": "literal_interpretation",
                "title": "Đang hiểu theo nghĩa đen",
                "detail": (
                    "Bài làm chủ yếu diễn lại các chữ trong câu. "
                    "Hãy nêu điều câu muốn nói về con người hoặc cuộc sống."
                ),
            }
        )

    if (
        ("sino_vietnamese" in traits or "uncommon_vocab" in traits)
        and accuracy <= 1
    ):
        issues.append(
            {
                "criterion": "accuracy",
                "type": "lexical_gap",
                "title": "Có từ khó chưa nắm",
                "detail": (
                    "Câu này có từ ít gặp hoặc Hán Việt. "
                    "Hãy giải nghĩa từng phần rồi mới ghép thành ý cả câu."
                ),
            }
        )

    pragmatic = "pragmatic" in traits
    if pragmatic:
        ans_cue = _has_any(ans, CUES)
        nuance = min(5, accuracy + 1) if ans_cue else max(1, accuracy - 1)
        if not ans_cue and accuracy >= 2:
            issues.append(
                {
                    "criterion": "nuance",
                    "type": "pragmatic_flattening",
                    "title": "Chưa nêu thái độ của câu",
                    "detail": "Câu này mang sắc thái đánh giá. Hãy nói rõ đang chê, mỉa mai hay khuyên răn.",
                }
            )
    else:
        nuance = clamp5(accuracy + (1 if _has_any(ans, CUES) and _has_any(reference, CUES) else 0))

    if "literal" in traits and _has_any(ans, FIGURATIVE_CUES):
        nuance = min(nuance, 3)
        issues.append(
            {
                "criterion": "nuance",
                "type": "over_interpretation",
                "title": "Suy diễn sang nghĩa bóng",
                "detail": "Câu này chủ yếu mô tả kinh nghiệm cụ thể, không cần gắn hàm ý tính cách.",
            }
        )

    words = ans.split()
    if not words:
        fluency = 0
    elif len(words) < 3:
        fluency = 2
    elif len(words) < 6:
        fluency = 4
    else:
        fluency = 5

    if fluency < 3 and len(ans_set) >= 2:
        issues.append(
            {
                "criterion": "fluency",
                "type": "unclear_wording",
                "title": "Diễn đạt chưa rõ",
                "detail": "Viết thành câu hoàn chỉnh có chủ ngữ, vị ngữ để ý được rõ ràng.",
            }
        )

    # Lenient completeness: half the reference keywords ≈ full credit band
    completeness = clamp5((recall / 0.45) * 5) if ans_set else 0
    if completeness < 2 and accuracy >= 2:
        completeness = 2
    if completeness <= 2 and accuracy >= 2 and len(ans_set) >= 3:
        issues.append(
            {
                "criterion": "completeness",
                "type": "missing_points",
                "title": "Còn thiếu ý",
                "detail": "Bạn đã có ý chính rồi — bổ sung thêm chi tiết sẽ đầy đủ hơn.",
            }
        )

    missing = list(ref_set - ans_set)[:4]
    strengths: list[str] = []
    if accuracy >= 4:
        strengths.append("Nắm đúng ý nghĩa cốt lõi của câu.")
    if nuance >= 4:
        strengths.append("Thể hiện được sắc thái, thái độ của câu.")
    if fluency >= 4:
        strengths.append("Diễn đạt rõ ràng, mạch lạc.")
    if completeness >= 4:
        strengths.append("Bao quát đầy đủ các ý chính.")

    scores = {
        "accuracy": accuracy,
        "nuance": nuance,
        "fluency": fluency,
        "completeness": completeness,
    }
    result = normalize_result(
        {
            "scores": scores,
            "feedback": {
                "summary": "",
                "comments": {
                    "accuracy": (
                        "Nắm đúng ý chính của câu."
                        if accuracy >= 4
                        else "Mới chạm tới một phần ý chính."
                        if accuracy >= 2
                        else "Ý chính khác với nghĩa chuẩn."
                    ),
                    "nuance": (
                        "Đã thể hiện được thái độ của câu."
                        if pragmatic and nuance >= 4
                        else "Chưa thể hiện thái độ khen, chê hay khuyên răn của câu."
                        if pragmatic
                        else "Phù hợp với cách dùng thông thường của câu."
                        if nuance >= 4
                        else "Chưa nêu được ngữ cảnh người ta dùng câu này."
                    ),
                    "fluency": (
                        "Câu văn rõ ràng, mạch lạc." if fluency >= 4 else "Nên viết thành câu hoàn chỉnh, rõ ý."
                    ),
                    "completeness": (
                        "Bao quát đủ các ý chính."
                        if completeness >= 4
                        else "Còn thiếu một số ý."
                        if completeness >= 2
                        else "Thiếu nhiều ý chính."
                    ),
                },
                "issues": issues,
                "strengths": strengths,
                "missingKeywords": missing,
            },
            "method": "heuristic",
        }
    )
    # Prefer template summaries for heuristic consistency
    result["feedback"]["summary"] = SUMMARY_BY_OVERALL[result["overall"]]
    return result


def grade_with_llm(
    phrase: str,
    reference: str,
    answer: str,
    *,
    model: str | None = None,
    api_key: str | None = None,
    base_url: str | None = None,
    traits: Sequence[str] | None = None,
    topic: str | None = None,
) -> dict[str, Any]:
    """LLM-as-a-Judge with VIVID aspects + learner-friendly JSON feedback."""
    traits = list(traits or [])
    trait_text = ", ".join(TRAIT_LABELS.get(t, t) for t in traits) if traits else "không rõ"
    prompt = _load_prompt().format(
        phrase=phrase,
        reference=reference,
        answer=answer.strip(),
        topic=topic or "không rõ",
        traits=trait_text,
    )
    data = chat_json(
        [{"role": "user", "content": prompt}],
        model=model,
        api_key=api_key,
        base_url=base_url,
        temperature=0,
        max_tokens=1600,
    )
    data["method"] = "llm"
    return normalize_result(data, prefer_weighted_overall=False)


def grade_explanation(
    phrase: str,
    reference: str,
    answer: str,
    *,
    model: str | None = None,
    api_key: str | None = None,
    base_url: str | None = None,
    use_llm: bool | None = None,
    traits: Sequence[str] | None = None,
    topic: str | None = None,
) -> dict[str, Any]:
    """
    Grade a student answer.

    use_llm=True  → always call the LLM
    use_llm=False → always use heuristic
    use_llm=None  → LLM when a real key + model are available, else heuristic
    """
    answer = (answer or "").strip()
    if not answer:
        return _empty_result("Bài làm đang để trống. Hãy viết ít nhất một câu giải thích.")

    key = resolve_api_key(api_key)
    resolved_model = resolve_model(model)
    want_llm = use_llm if use_llm is not None else bool(key and resolved_model)

    if want_llm and key and resolved_model:
        try:
            return grade_with_llm(
                phrase,
                reference,
                answer,
                model=resolved_model,
                api_key=key,
                base_url=base_url,
                traits=traits,
                topic=topic,
            )
        except Exception:
            result = grade_heuristic(phrase, reference, answer, traits=traits, topic=topic)
            result["method"] = "heuristic_fallback"
            return result

    return grade_heuristic(phrase, reference, answer, traits=traits, topic=topic)
