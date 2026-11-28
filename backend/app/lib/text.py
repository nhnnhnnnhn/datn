import re
import unicodedata


def fold(text: str) -> str:
    """Lower-case text without Vietnamese diacritics, for case and accent insensitive comparison."""
    decomposed = unicodedata.normalize("NFD", text).replace("đ", "d").replace("Đ", "D")
    plain = "".join(ch for ch in decomposed if unicodedata.category(ch) != "Mn")
    return re.sub(r"\s+", " ", plain).strip().lower()
