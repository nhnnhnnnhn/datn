"""AI helpers for the Vietnamese idiom learning platform."""

from ai.generation.quiz_generator import generate_questions
from ai.grading.evaluator import grade_explanation

__all__ = ["generate_questions", "grade_explanation"]
