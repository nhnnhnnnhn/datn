import enum


class IdiomType(enum.StrEnum):
    idiom = "idiom"
    proverb = "proverb"


class AspectType(enum.StrEnum):
    theme = "theme"
    complexity_trait = "complexity_trait"
