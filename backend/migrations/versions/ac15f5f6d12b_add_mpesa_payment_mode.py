"""add mpesa payment mode

Revision ID: ac15f5f6d12b
Revises: 08963a72de73
Create Date: 2026-10-07 14:30:59.974902

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'ac15f5f6d12b'
down_revision = '08963a72de73'
branch_labels = None
depends_on = None


def upgrade():
    # Add the new column with a server-side default so existing
    # payment_settings rows safely receive "paybill".
    with op.batch_alter_table('payment_settings', schema=None) as batch_op:
        batch_op.add_column(
            sa.Column(
                'mpesa_mode',
                sa.Enum('paybill', 'till'),
                nullable=False,
                server_default='paybill'
            )
        )

    # Remove the database-level default after existing rows have
    # been populated. The model's default remains responsible for
    # new records.
    with op.batch_alter_table('payment_settings', schema=None) as batch_op:
        batch_op.alter_column(
            'mpesa_mode',
            server_default=None
        )


def downgrade():
    with op.batch_alter_table('payment_settings', schema=None) as batch_op:
        batch_op.drop_column('mpesa_mode')
