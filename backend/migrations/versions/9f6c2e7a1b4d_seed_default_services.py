"""
Seed the default Thafari services.

Revision ID: 9f6c2e7a1b4d
Revises: cbe9194c4794
Create Date: 2026-10-07

This is a data migration only.

It adds the four default services to the existing
services table without creating duplicate rows when a
service with the same name already exists.
"""

from datetime import datetime

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "9f6c2e7a1b4d"
down_revision = "cbe9194c4794"
branch_labels = None
depends_on = None


DEFAULT_SERVICES = (
    (
        "Safari & Tour Bookings",
        "Book unforgettable safari experiences and tours across Kenya through Thafari."
    ),
    (
        "Custom Safari Experiences",
        "Get personalized safari experiences tailored to your preferred destinations, activities, and travel plans."
    ),
    (
        "Travel Planning",
        "Get support planning your safari itinerary, destinations, activities, and overall travel experience."
    ),
    (
        "Airport Transfers",
        "Arrange convenient airport transfers to help you get to and from your safari destination comfortably."
    ),
)


def upgrade():
    """
    Add the default Thafari services.

    Existing services with the same name are preserved,
    so this migration is safe to run on a database that
    already contains some of these entries.
    """

    connection = op.get_bind()

    now = datetime.utcnow()

    insert_statement = sa.text(
        """
        INSERT INTO services (
            name,
            description,
            is_active,
            created_at,
            updated_at
        )
        SELECT
            :name,
            :description,
            :is_active,
            :created_at,
            :updated_at
        WHERE NOT EXISTS (
            SELECT 1
            FROM services
            WHERE name = :name
        )
        """
    )

    for name, description in DEFAULT_SERVICES:
        connection.execute(
            insert_statement,
            {
                "name": name,
                "description": description,
                "is_active": True,
                "created_at": now,
                "updated_at": now,
            }
        )


def downgrade():
    """
    Remove only the four default service records added
    by this migration.

    Admin-created services with different names are not
    affected.
    """

    connection = op.get_bind()

    delete_statement = sa.text(
        """
        DELETE FROM services
        WHERE name = :name
        """
    )

    for name, _ in DEFAULT_SERVICES:
        connection.execute(
            delete_statement,
            {"name": name}
        )
