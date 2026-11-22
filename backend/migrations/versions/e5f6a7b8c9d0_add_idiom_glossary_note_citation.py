"""add idioms.glossary, idioms.note and idioms.citation

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-11-21 16:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "e5f6a7b8c9d0"
down_revision: str | Sequence[str] | None = "d4e5f6a7b8c9"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("idioms", sa.Column("glossary", sa.Text(), nullable=True))
    op.add_column("idioms", sa.Column("note", sa.Text(), nullable=True))
    op.add_column("idioms", sa.Column("citation", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("idioms", "citation")
    op.drop_column("idioms", "note")
    op.drop_column("idioms", "glossary")
