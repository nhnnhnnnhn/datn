"""
Grade a student's Vietnamese idiom explanation.

Uses VIVID aspect-based criteria (accuracy, nuance, fluency, completeness).
Falls back to a word-overlap heuristic when no LLM API key is set.
"""

from __future__ import annotations

import os
import re
from pathlib import Path
from typing import Any

from ai.llm_client import chat_json

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

_PROMPT_PATH = Path(__file__).resolve().parents[1] / "prompts" / "grading.txt"


def _load_prompt() -> str:
    return _PROMPT_PATH.read_text(encoding="utf-8")


def _tokens(text: str) -> set[str]:
    words = re.findall(r"\w+", text.lower(), flags=re.UNICODE)
    return {w for w in words if len(w) > 1 and w not in STOPWORDS}


def _clamp5(x: float) -> int:
    return max(0, min(5, round(x)))


def _empty_result(summary: str) -> dict[str, Any]:
    return {
        "scores": {"accuracy": 0, "nuance": 0, "fluency": 0, "completeness": 0},
        "overall": 0,
        "feedback": {
            "summary": summary,
            "comments": {
                "accuracy": summary,
                "nuance": summary,
                "fluency": summary,
                "completeness": summary,
            },
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
    }


def grade_heuristic(phrase: str, reference: str, answer: str) -> dict[str, Any]:
    """Offline fallback grader based on content-word overlap."""
    ans = answer.strip()
    ans_set = _tokens(ans)
    ref_set = _tokens(reference)
    phrase_set = _tokens(phrase)

    if not ans:
        return _empty_result("Bài làm đang để trống.")

    recall = len(ans_set & ref_set) / max(1, len(ref_set))
    accuracy = _clamp5((recall / 0.42) * 5) if ans_set else 0
    issues: list[dict[str, str]] = []

    if len(ans_set) < 3:
        accuracy = min(accuracy, 1)
        issues.append(
            {
                "criterion": "fluency",
                "type": "too_short",
                "title": "Bài làm quá ngắn",
                "detail": "Viết thành ít nhất một câu hoàn chỉnh để nêu đủ ý nghĩa của câu.",
            }
        )

    phrase_share = len(ans_set & phrase_set) / max(1, len(ans_set))
    if phrase_share >= 0.5 and recall < 0.3 and len(ans_set) >= 3:
        accuracy = min(accuracy, 1)
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

    completeness = _clamp5(recall * 5)
    fluency = 4 if len(ans.split()) >= 8 else 2 if len(ans.split()) >= 4 else 1
    nuance = max(0, accuracy - 1) if recall < 0.5 else accuracy

    if completeness <= 2:
        issues.append(
            {
                "criterion": "completeness",
                "type": "missing_points",
                "title": "Còn thiếu ý",
                "detail": "Hãy bổ sung các ý chính còn thiếu so với nghĩa chuẩn.",
            }
        )

    overall = 0 if accuracy == 0 else _clamp5((accuracy + nuance + fluency + completeness) / 4)
    missing = list(ref_set - ans_set)[:4]
    strengths = []
    if accuracy >= 4:
        strengths.append("Nắm đúng ý nghĩa cốt lõi")
    if fluency >= 4:
        strengths.append("Diễn đạt rõ ràng")

    return {
        "scores": {
            "accuracy": accuracy,
            "nuance": nuance,
            "fluency": fluency,
            "completeness": completeness,
        },
        "overall": overall,
        "feedback": {
            "summary": (
                "Bài làm khá tốt, hãy tinh chỉnh thêm sắc thái."
                if overall >= 4
                else "Bài làm chưa đủ sát nghĩa chuẩn, hãy đọc lại và bổ sung ý còn thiếu."
            ),
            "comments": {
                "accuracy": f"Độ khớp từ khóa với nghĩa chuẩn khoảng {int(recall * 100)}%.",
                "nuance": (
                    "Cần thể hiện rõ hơn thái độ/ẩn ý của câu." if nuance < 4 else "Sắc thái ổn."
                ),
                "fluency": "Câu văn ổn." if fluency >= 3 else "Hãy viết thành câu hoàn chỉnh hơn.",
                "completeness": "Còn thiếu một số ý chính." if completeness < 4 else "Khá đầy đủ.",
            },
            "issues": issues,
            "strengths": strengths,
            "missingKeywords": missing,
        },
    }


def grade_with_llm(
    phrase: str,
    reference: str,
    answer: str,
    *,
    model: str = "gpt-4o-mini",
    api_key: str | None = None,
) -> dict[str, Any]:
    """LLM-as-a-Judge grading with structured JSON feedback."""
    prompt = _load_prompt().format(phrase=phrase, reference=reference, answer=answer.strip())
    data = chat_json(
        [{"role": "user", "content": prompt}],
        model=model,
        api_key=api_key,
        temperature=0,
        max_tokens=1500,
    )
    scores = data.get("scores") or {}
    for key in ("accuracy", "nuance", "fluency", "completeness"):
        scores[key] = _clamp5(float(scores.get(key, 0)))
    overall = _clamp5(float(data.get("overall", 0)))
    if scores["accuracy"] == 0:
        overall = 0
    feedback = data.get("feedback") or {}
    feedback.setdefault("summary", "")
    feedback.setdefault("comments", {})
    feedback.setdefault("issues", [])
    feedback.setdefault("strengths", [])
    feedback.setdefault("missingKeywords", [])
    return {"scores": scores, "overall": overall, "feedback": feedback}


def grade_explanation(
    phrase: str,
    reference: str,
    answer: str,
    *,
    model: str | None = None,
    api_key: str | None = None,
    use_llm: bool | None = None,
) -> dict[str, Any]:
    """
    Grade a student answer.

    use_llm=True  → always call the LLM
    use_llm=False → always use heuristic
    use_llm=None  → LLM when a key is available, else heuristic
    """
    answer = (answer or "").strip()
    if not answer:
        return _empty_result("Bài làm đang để trống.")

    key = api_key or None
    want_llm = (
        use_llm
        if use_llm is not None
        else bool(key or os.environ.get("OPENAI_API_KEY") or os.environ.get("LLM_API_KEY"))
    )

    if want_llm:
        try:
            return grade_with_llm(
                phrase,
                reference,
                answer,
                model=model or "gpt-4o-mini",
                api_key=key,
            )
        except Exception:
            return grade_heuristic(phrase, reference, answer)

    return grade_heuristic(phrase, reference, answer)
