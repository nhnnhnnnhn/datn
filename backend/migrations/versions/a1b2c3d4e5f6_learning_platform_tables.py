"""learning platform tables

Revision ID: a1b2c3d4e5f6
Revises: 63c916d83dbd
Create Date: 2026-11-08 15:50:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "63c916d83dbd"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("daily_goal", sa.Integer(), server_default="10", nullable=False))

    op.add_column("idioms", sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=True))

    op.add_column("quizzes", sa.Column("config", postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column("quiz_questions", sa.Column("highlight", sa.Text(), nullable=True))
    op.add_column("quiz_attempts", sa.Column("duration_sec", sa.Integer(), nullable=True))

    op.add_column("submissions", sa.Column("fluency_score", sa.Numeric(3, 2), nullable=True))
    op.add_column("submissions", sa.Column("overall_score", sa.Numeric(3, 2), nullable=True))
    # feedback was text; store structured grading JSON instead
    op.execute("ALTER TABLE submissions ALTER COLUMN feedback TYPE jsonb USING NULL")

    op.create_table(
        "decks",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("source", sa.String(length=20), nullable=False),
        sa.Column("topic", sa.String(length=40), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.add_column("flashcards", sa.Column("deck_id", sa.String(length=64), nullable=True))
    op.add_column("flashcards", sa.Column("ease", sa.Float(), server_default="2.5", nullable=False))
    op.add_column("flashcards", sa.Column("interval_days", sa.Integer(), server_default="0", nullable=False))
    op.add_column("flashcards", sa.Column("repetitions", sa.Integer(), server_default="0", nullable=False))
    op.add_column(
        "flashcards",
        sa.Column("due_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
    )
    op.add_column("flashcards", sa.Column("last_reviewed", sa.DateTime(timezone=True), nullable=True))
    op.create_foreign_key("flashcards_deck_id_fkey", "flashcards", "decks", ["deck_id"], ["id"])

    op.add_column("flashcard_reviews", sa.Column("rating", sa.String(length=20), nullable=True))

    op.create_table(
        "classrooms",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("code", sa.String(length=20), nullable=False),
        sa.Column("teacher_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["teacher_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )
    op.create_table(
        "class_members",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("classroom_id", sa.String(length=64), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("joined_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["classroom_id"], ["classrooms.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("classroom_id", "user_id", name="uq_class_members_class_user"),
    )
    op.create_table(
        "assignments",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("classroom_id", sa.String(length=64), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("instructions", sa.Text(), nullable=False),
        sa.Column("idiom_ids", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("due_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["classroom_id"], ["classrooms.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "assignment_submissions",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("assignment_id", sa.String(length=64), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("items", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("ai_score", sa.Numeric(5, 2), nullable=True),
        sa.Column("teacher_score", sa.Numeric(5, 2), nullable=True),
        sa.Column("teacher_comment", sa.Text(), nullable=True),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["assignment_id"], ["assignments.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("assignment_id", "user_id", name="uq_assignment_submissions_assignment_user"),
    )


def downgrade() -> None:
    op.drop_table("assignment_submissions")
    op.drop_table("assignments")
    op.drop_table("class_members")
    op.drop_table("classrooms")

    op.drop_column("flashcard_reviews", "rating")
    op.drop_constraint("flashcards_deck_id_fkey", "flashcards", type_="foreignkey")
    op.drop_column("flashcards", "last_reviewed")
    op.drop_column("flashcards", "due_at")
    op.drop_column("flashcards", "repetitions")
    op.drop_column("flashcards", "interval_days")
    op.drop_column("flashcards", "ease")
    op.drop_column("flashcards", "deck_id")
    op.drop_table("decks")

    op.execute("ALTER TABLE submissions ALTER COLUMN feedback TYPE text USING feedback::text")
    op.drop_column("submissions", "overall_score")
    op.drop_column("submissions", "fluency_score")
    op.drop_column("quiz_attempts", "duration_sec")
    op.drop_column("quiz_questions", "highlight")
    op.drop_column("quizzes", "config")
    op.drop_column("idioms", "metadata")
    op.drop_column("users", "daily_goal")
