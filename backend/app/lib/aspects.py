"""Map DB idiom_aspects rows ↔ frontend topic/trait ids."""

TOPIC_BY_ASPECT_ID = {
    1: "criticism",
    2: "life_lessons",
    3: "work_nature",
    4: "social",
    5: "love",
    6: "virtues",
    7: "other",
}

TRAIT_BY_ASPECT_ID = {
    8: "literal",
    9: "pragmatic",
    10: "sino_vietnamese",
    11: "uncommon_vocab",
    12: "folk_knowledge",
}

ASPECT_ID_BY_TOPIC = {v: k for k, v in TOPIC_BY_ASPECT_ID.items()}
ASPECT_ID_BY_TRAIT = {v: k for k, v in TRAIT_BY_ASPECT_ID.items()}

TOPIC_LABELS = {
    "criticism": "Phê phán",
    "life_lessons": "Bài học cuộc sống",
    "work_nature": "Lao động & Thiên nhiên",
    "social": "Quan hệ xã hội",
    "love": "Tình yêu",
    "virtues": "Phẩm chất đạo đức",
    "other": "Khác",
}

TRAIT_LABELS = {
    "literal": "Nghĩa đen",
    "pragmatic": "Sắc thái ngữ dụng",
    "sino_vietnamese": "Từ Hán Việt",
    "uncommon_vocab": "Từ ít phổ biến",
    "folk_knowledge": "Kinh nghiệm dân gian",
}
