"""store json payloads as text for SQL_ASCII databases

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-11-08 16:10:00.000000

"""

from collections.abc import Sequence

from alembic import op

revision: str = "b2c3d4e5f6a7"
down_revision: str | Sequence[str] | None = "a1b2c3d4e5f6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("ALTER TABLE idioms ALTER COLUMN metadata TYPE text USING metadata::text")
    op.execute("ALTER TABLE submissions ALTER COLUMN feedback TYPE text USING feedback::text")
    op.execute("ALTER TABLE quizzes ALTER COLUMN config TYPE text USING config::text")
    op.execute("ALTER TABLE quiz_questions ALTER COLUMN options TYPE text USING options::text")
    op.execute("ALTER TABLE assignments ALTER COLUMN idiom_ids TYPE text USING idiom_ids::text")
    op.execute(
        "ALTER TABLE assignment_submissions ALTER COLUMN items TYPE text USING items::text"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE idioms ALTER COLUMN metadata TYPE jsonb USING NULL")
    op.execute("ALTER TABLE submissions ALTER COLUMN feedback TYPE jsonb USING NULL")
    op.execute("ALTER TABLE quizzes ALTER COLUMN config TYPE jsonb USING NULL")
    op.execute("ALTER TABLE quiz_questions ALTER COLUMN options TYPE jsonb USING NULL")
    op.execute("ALTER TABLE assignments ALTER COLUMN idiom_ids TYPE jsonb USING '[]'::jsonb")
    op.execute(
        "ALTER TABLE assignment_submissions ALTER COLUMN items TYPE jsonb USING '[]'::jsonb"
    )
