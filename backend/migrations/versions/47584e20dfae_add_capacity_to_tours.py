"""add capacity to tours

Revision ID: 47584e20dfae
Revises: 5ac809f3b149
Create Date: 2026-08-20 22:47:51.408215

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '47584e20dfae'
down_revision = '5ac809f3b149'
branch_labels = None
depends_on = None


def upgrade():

    with op.batch_alter_table("tours", schema=None) as batch_op:

        batch_op.add_column(
            sa.Column(
                "capacity",
                sa.Integer(),
                nullable=False,
                server_default="20"
            )
        )

        batch_op.alter_column(
            "capacity",
            server_default=None
        )

        batch_op.create_check_constraint(
            "check_positive_tour_capacity",
            "capacity > 0"
        )

    # ### end Alembic commands ###


def downgrade():

    with op.batch_alter_table("tours", schema=None) as batch_op:

        batch_op.drop_constraint(
            "check_positive_tour_capacity",
            type_="check"
        )

        batch_op.drop_column("capacity")

    # ### end Alembic commands ###
