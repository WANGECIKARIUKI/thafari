# =========================================================
# THAFARI TOUR ACCOMMODATION MODEL
# =========================================================
#
# This model stores the actual accommodation option(s)
# included in a safari package.
#
# Example:
#
# Diani Safari
#     └── Diani Reef Beach Resort & Spa
#             Category: Mid-range
#             Location: Diani Beach, Kwale
#             Room: Standard Double Room
#             Meal plan: Half Board
#
# One Tour can have multiple accommodation options.
#
# =========================================================

from extensions import db

from models.base_model import BaseModel


class TourAccommodation(BaseModel):

    __tablename__ = "tour_accommodations"

    # -----------------------------------------------------
    # The safari package this accommodation belongs to
    # -----------------------------------------------------

    tour_id = db.Column(
        db.Integer,
        db.ForeignKey("tours.id"),
        nullable=False
    )

    # -----------------------------------------------------
    # Actual accommodation/property name
    #
    # Example:
    # "Diani Reef Beach Resort & Spa"
    # -----------------------------------------------------

    name = db.Column(
        db.String(200),
        nullable=False
    )

    # -----------------------------------------------------
    # Accommodation category
    #
    # Examples:
    # - budget
    # - mid_range
    # - luxury
    # -----------------------------------------------------

    category = db.Column(
        db.Enum(
            "budget",
            "mid_range",
            "luxury"
        ),
        nullable=False
    )

    # -----------------------------------------------------
    # Location of the accommodation
    #
    # Example:
    # "Diani Beach, Kwale"
    # -----------------------------------------------------

    location = db.Column(
        db.String(250),
        nullable=False
    )

    # -----------------------------------------------------
    # Room type included in the package
    #
    # Example:
    # "Standard Double Room"
    # -----------------------------------------------------

    room_type = db.Column(
        db.String(200),
        nullable=False
    )

    # -----------------------------------------------------
    # Meal plan included with the accommodation
    #
    # Example:
    # "Half Board"
    # -----------------------------------------------------

    meal_plan = db.Column(
        db.String(100),
        nullable=False
    )

    # -----------------------------------------------------
    # Additional information about the accommodation
    # -----------------------------------------------------

    description = db.Column(
        db.Text,
        nullable=True
    )

    # -----------------------------------------------------
    # Relationship back to the Tour
    # -----------------------------------------------------

    tour = db.relationship(
        "Tour",
        back_populates="accommodations"
    )