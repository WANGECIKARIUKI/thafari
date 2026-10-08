# =========================================================
# THAFARI SERVICE MODEL
# =========================================================
#
# This model stores the services that Thafari offers on the
# public website.
#
# Services are database-driven so an administrator can add,
# edit, activate/deactivate, or remove services later without
# changing the frontend code.
#
# Each service can also have:
#
# - An optional image
# - An optional destination link
# - An optional action label
#
# This allows the public service cards to be more visual and
# useful instead of being plain text-only cards.
# =========================================================

from extensions import db

from models.base_model import BaseModel


class Service(BaseModel):
    """
    Store a service offered by Thafari.
    """

    __tablename__ = "services"

    # -----------------------------------------------------
    # SERVICE NAME
    # -----------------------------------------------------

    name = db.Column(
        db.String(150),
        nullable=False
    )

    # -----------------------------------------------------
    # SERVICE DESCRIPTION
    # -----------------------------------------------------

    description = db.Column(
        db.Text,
        nullable=False
    )

    # -----------------------------------------------------
    # SERVICE IMAGE
    # -----------------------------------------------------
    #
    # Optional image URL/path used by the public service card.
    #
    # Examples:
    #
    #     /services/safari-booking.jpg
    #
    #     https://example.com/safari.jpg
    #
    # -----------------------------------------------------

    image_url = db.Column(
        db.String(500),
        nullable=True
    )

    # -----------------------------------------------------
    # SERVICE LINK
    # -----------------------------------------------------
    #
    # Optional destination for the service card action.
    #
    # Examples:
    #
    #     /tours
    #
    #     /#contact
    #
    # -----------------------------------------------------

    link_url = db.Column(
        db.String(255),
        nullable=True
    )

    # -----------------------------------------------------
    # SERVICE ACTION LABEL
    # -----------------------------------------------------
    #
    # Optional text shown on the service card button/link.
    #
    # Examples:
    #
    #     Explore Safaris
    #
    #     Contact Us
    #
    #     Learn More
    #
    # -----------------------------------------------------

    link_label = db.Column(
        db.String(100),
        nullable=True
    )

    # -----------------------------------------------------
    # ACTIVE STATUS
    # -----------------------------------------------------
    #
    # True:
    #     The service is visible on the public website.
    #
    # False:
    #     The service remains in the database but is hidden
    #     from customers.
    #
    # Soft deactivation is safer than immediately deleting
    # content that may be needed again later.
    # -----------------------------------------------------

    is_active = db.Column(
        db.Boolean,
        default=True,
        nullable=False
    )
