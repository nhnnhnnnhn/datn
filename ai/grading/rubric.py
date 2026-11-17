"""VIVID aspect-based rubric (Do et al., LREC 2026; κ ≈ 0.792)."""

from __future__ import annotations

CRITERIA = ("accuracy", "nuance", "fluency", "completeness")

CRITERION_LABELS = {
    "accuracy": "Ý nghĩa cốt lõi",
    "nuance": "Sắc thái & ẩn ý",
    "fluency": "Diễn đạt",
    "completeness": "Độ đầy đủ",
}

# Learner-facing short descriptions (0–5)
CRITERION_GUIDE = {
    "accuracy": "Bạn có nắm đúng ý chính của câu không?",
    "nuance": "Bạn có nêu được thái độ, ngữ cảnh hay hàm ý không?",
    "fluency": "Câu văn có rõ ràng, dễ hiểu không?",
    "completeness": "Bạn đã bao quát đủ các ý chính chưa?",
}

# Weights used when the judge does not supply a reliable overall
OVERALL_WEIGHTS = {
    "accuracy": 0.45,
    "nuance": 0.20,
    "fluency": 0.10,
    "completeness": 0.25,
}

ERROR_TYPES = (
    "literal_interpretation",
    "lexical_gap",
    "pragmatic_flattening",
    "missing_points",
    "too_short",
    "over_interpretation",
    "unclear_wording",
)

SUMMARY_BY_OVERALL = (
    "Ý nghĩa cốt lõi chưa đúng, nên điểm tổng là 0. Hãy đọc lại nghĩa chuẩn và thử viết lại.",
    "Ý nghĩa bạn đưa ra còn khác xa nghĩa chuẩn. Tập trung vào điều câu muốn nói về con người hoặc cuộc sống.",
    "Bài làm mới chạm tới một phần ý nghĩa của câu. Bổ sung thêm ý còn thiếu sẽ rõ hơn nhiều.",
    "Đã nắm được ý chính, còn thiếu một số ý hoặc sắc thái. Bạn đang đi đúng hướng!",
    "Nắm đúng ý chính, chỉ cần bổ sung thêm chút ít là rất tốt.",
    "Giải nghĩa chính xác và đầy đủ. Làm tốt lắm!",
)

TRAIT_LABELS = {
    "literal": "nghĩa đen / kinh nghiệm cụ thể",
    "pragmatic": "sắc thái ngữ dụng (chê, mỉa, khuyên…)",
    "sino_vietnamese": "từ Hán Việt",
    "uncommon_vocab": "từ ít phổ biến",
    "folk_knowledge": "kinh nghiệm dân gian",
}
