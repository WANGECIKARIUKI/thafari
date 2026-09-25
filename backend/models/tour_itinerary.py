# =========================================================
# THAFARI TOUR ITINERARY MODEL
# =========================================================
#
# This model stores the day-by-day itinerary for a safari.
#
# Example:
#
# Diani Safari
#     Day 1 - Arrival in Diani
#     Day 2 - Beach & Adventure
#     Day 3 - Explore Diani
#     Day 4 - Return to Nairobi
#
# One Tour can have many itinerary entries.
#
# =========================================================

from extensions import db

from models.base_model import BaseModel


class TourItinerary(BaseModel):

    __tablename__ = "tour_itineraries"

    # -----------------------------------------------------
    # The safari package this itinerary belongs to
    # -----------------------------------------------------

    tour_id = db.Column(
        db.Integer,
        db.ForeignKey("tours.id"),
        nullable=False
    )

    # -----------------------------------------------------
    # The day number
    #
    # Example:
    # 1 = Day 1
    # 2 = Day 2
    # 3 = Day 3
    # -----------------------------------------------------

    day_number = db.Column(
        db.Integer,
        nullable=False
    )

    # -----------------------------------------------------
    # Short title for the day
    #
    # Example:
    # "Arrival in Diani"
    # -----------------------------------------------------

    title = db.Column(
        db.String(200),
        nullable=False
    )

    # -----------------------------------------------------
    # Detailed description of what happens that day
    # -----------------------------------------------------

    description = db.Column(
        db.Text,
        nullable=False
    )

    # -----------------------------------------------------
    # Relationship back to the Tour
    # -----------------------------------------------------

    tour = db.relationship(
        "Tour",
        back_populates="itineraries"
    )

    # -----------------------------------------------------
    # Make sure the day number is positive
    # -----------------------------------------------------

    __table_args__ = (
        db.CheckConstraint(
            "day_number > 0",
            name="check_positive_itinerary_day"
        ),
    )