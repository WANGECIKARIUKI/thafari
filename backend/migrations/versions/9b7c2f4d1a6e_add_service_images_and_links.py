"""add real images and links to default services

Revision ID: 9b7c2f4d1a6e
Revises: 44d5be7e8efb
Create Date: 2026-10-07

"""

from alembic import op
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision = "9b7c2f4d1a6e"
down_revision = "44d5be7e8efb"
branch_labels = None
depends_on = None


SERVICE_UPDATES = (
    (
        "Safari & Tour Bookings",
        "/services/01-safari-tour-bookings.jpg",
        "/tours",
        "Explore Safaris",
    ),
    (
        "Custom Safari Experiences",
        "/services/02-custom-safari-experiences.jpg",
        "/#contact",
        "Plan Your Safari",
    ),
    (
        "Travel Planning",
        "/services/03-travel-planning.jpg",
        "/#contact",
        "Talk to Us",
    ),
    (
        "Airport Transfers",
        "/services/04-airport-transfers.jpg",
        "/#contact",
        "Contact Us",
    ),
)


def upgrade():
    connection = op.get_bind()

    statement = text(
        """
        UPDATE services
        SET image_url = :image_url,
            link_url = :link_url,
            link_label = :link_label
        WHERE name = :name
        """
    )

    for name, image_url, link_url, link_label in SERVICE_UPDATES:
        connection.execute(
            statement,
            {
                "name": name,
                "image_url": image_url,
                "link_url": link_url,
                "link_label": link_label,
            },
        )


def downgrade():
    connection = op.get_bind()

    statement = text(
        """
        UPDATE services
        SET image_url = NULL,
            link_url = NULL,
            link_label = NULL
        WHERE name = :name
        """
    )

    for name, _, _, _ in SERVICE_UPDATES:
        connection.execute(statement, {"name": name})
