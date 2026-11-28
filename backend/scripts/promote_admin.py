"""
Change the role of an existing user, e.g. to make someone an admin.

Usage (from backend/):
  python scripts/promote_admin.py someone@example.com            # becomes admin
  python scripts/promote_admin.py someone@example.com --role student
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]  # backend/
sys.path.insert(0, str(ROOT))

from app.db.database import SessionLocal
from app.models import User


def main() -> int:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawTextHelpFormatter
    )
    parser.add_argument("email")
    parser.add_argument("--role", choices=["admin", "student"], default="admin")
    args = parser.parse_args()

    email = args.email.strip().lower()
    with SessionLocal() as db:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            print(f"No user with email {email}", file=sys.stderr)
            return 1
        previous = user.role
        user.role = args.role
        db.commit()
    print(f"{email}: {previous} -> {args.role}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
