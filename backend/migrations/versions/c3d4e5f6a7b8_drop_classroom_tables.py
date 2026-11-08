"""drop classroom and assignment tables

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-11-08 16:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "c3d4e5f6a7b8"
down_revision: str | Sequence[str] | None = "b2c3d4e5f6a7"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_table("assignment_submissions")
    op.drop_table("assignments")
    op.drop_table("class_members")
    op.drop_table("classrooms")


def downgrade() -> None:
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
        sa.Column("idiom_ids", sa.Text(), nullable=False),
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
        sa.Column("items", sa.Text(), nullable=False),
        sa.Column("ai_score", sa.Numeric(5, 2), nullable=True),
        sa.Column("teacher_score", sa.Numeric(5, 2), nullable=True),
        sa.Column("teacher_comment", sa.Text(), nullable=True),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["assignment_id"], ["assignments.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("assignment_id", "user_id", name="uq_assignment_submissions_assignment_user"),
    )
