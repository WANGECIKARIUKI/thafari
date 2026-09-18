"""add positive number constraint to bookings

Revision ID: 5ac809f3b149
Revises: 2b6f86636b93
Create Date: 2026-08-20 21:42:08.942173

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '5ac809f3b149'
down_revision = '2b6f86636b93'
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        """
        ALTER TABLE bookings
        ADD CONSTRAINT check_positive_number_of_people
        CHECK (number_of_people > 0)
        """
    )


def downgrade():
    op.drop_constraint(
        "check_positive_number_of_people",
        "bookings",
        type_="check"
    )
