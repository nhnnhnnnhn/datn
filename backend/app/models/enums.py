import enum


class IdiomType(str, enum.Enum):
    idiom = "idiom"
    proverb = "proverb"


class AspectType(str, enum.Enum):
    theme = "theme"
    complexity_trait = "complexity_trait"
