"""admin dashboard: lock users and archive idioms

Revision ID: a7b8c9d0e1f2
Revises: f6a7b8c9d0e1
Create Date: 2026-11-28 21:30:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "a7b8c9d0e1f2"
down_revision: str | Sequence[str] | None = "f6a7b8c9d0e1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
    )

    op.add_column("idioms", sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_idioms_archived_at", "idioms", ["archived_at"])


def downgrade() -> None:
    op.drop_index("ix_idioms_archived_at", table_name="idioms")
    op.drop_column("idioms", "archived_at")
    op.drop_column("users", "is_active")
