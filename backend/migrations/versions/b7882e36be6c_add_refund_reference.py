"""add refund reference

Revision ID: b7882e36be6c
Revises: b77195f41d1b
Create Date: 2026-09-09 17:19:54.673289
"""

from alembic import op
import sqlalchemy as sa
import uuid


# Revision identifiers, used by Alembic.
revision = "b7882e36be6c"
down_revision = "b77195f41d1b"
branch_labels = None
depends_on = None


def upgrade():
    connection = op.get_bind()

    inspector = sa.inspect(connection)

    columns = {
        column["name"]
        for column in inspector.get_columns("refunds")
    }

    # Create the column if it does not exist.
    if "refund_reference" not in columns:
        op.add_column(
            "refunds",
            sa.Column(
                "refund_reference",
                sa.String(length=250),
                nullable=True,
            ),
        )

    # Generate references for rows that do not have one.
    refunds = connection.execute(
        sa.text(
            """
            SELECT id
            FROM refunds
            WHERE refund_reference IS NULL
               OR refund_reference = ''
            """
        )
    ).fetchall()

    for refund in refunds:
        connection.execute(
            sa.text(
                """
                UPDATE refunds
                SET refund_reference = :reference
                WHERE id = :refund_id
                """
            ),
            {
                "reference": str(uuid.uuid4()),
                "refund_id": refund[0],
            },
        )

    # Inspect existing unique constraints and indexes.
    inspector = sa.inspect(connection)

    unique_constraints = {
        constraint["name"]
        for constraint in inspector.get_unique_constraints("refunds")
        if constraint.get("name")
    }

    unique_indexes = {
        index["name"]
        for index in inspector.get_indexes("refunds")
        if index.get("name") and index.get("unique")
    }

    # Add uniqueness only when it is not already present.
    if (
        "uq_refunds_refund_reference" not in unique_constraints
        and "uq_refunds_refund_reference" not in unique_indexes
    ):
        with op.batch_alter_table("refunds") as batch_op:
            batch_op.create_unique_constraint(
                "uq_refunds_refund_reference",
                ["refund_reference"],
            )

    # Make the column NOT NULL after populating its values.
    inspector = sa.inspect(connection)

    refund_reference_column = next(
        (
            column
            for column in inspector.get_columns("refunds")
            if column["name"] == "refund_reference"
        ),
        None,
    )

    if (
        refund_reference_column is not None
        and refund_reference_column["nullable"]
    ):
        with op.batch_alter_table("refunds") as batch_op:
            batch_op.alter_column(
                "refund_reference",
                existing_type=sa.String(length=250),
                nullable=False,
            )


def downgrade():
    connection = op.get_bind()
    inspector = sa.inspect(connection)

    columns = {
        column["name"]
        for column in inspector.get_columns("refunds")
    }

    if "refund_reference" not in columns:
        return

    unique_constraints = {
        constraint["name"]
        for constraint in inspector.get_unique_constraints("refunds")
        if constraint.get("name")
    }

    unique_indexes = {
        index["name"]
        for index in inspector.get_indexes("refunds")
        if index.get("name") and index.get("unique")
    }

    with op.batch_alter_table("refunds") as batch_op:
        if "uq_refunds_refund_reference" in unique_constraints:
            batch_op.drop_constraint(
                "uq_refunds_refund_reference",
                type_="unique",
            )
        elif "uq_refunds_refund_reference" in unique_indexes:
            batch_op.drop_index(
                "uq_refunds_refund_reference",
            )

        batch_op.drop_column("refund_reference")