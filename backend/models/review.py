# =========================================================
# THAFARI REVIEW MODEL
# =========================================================
#
# This model stores customer reviews for completed bookings.
#
# Customers can leave one review per booking.
#
# Each review contains:
#
# - Booking being reviewed
# - Rating from 1 to 5
# - Written review
# - Public visibility
#
# The backend will only allow customers to submit a review
# for their own completed booking.
#
# Admins can later hide or remove reviews when necessary.
# =========================================================

from extensions import db

from models.base_model import BaseModel


class Review(BaseModel):
    """
    Store a customer review for a completed Thafari booking.
    """

    __tablename__ = "reviews"

    # -----------------------------------------------------
    # BOOKING
    # -----------------------------------------------------
    #
    # Each booking can have at most one review.
    #
    # -----------------------------------------------------

    booking_id = db.Column(
        db.Integer,
        db.ForeignKey("bookings.id"),
        nullable=False,
        unique=True
    )

    # -----------------------------------------------------
    # RATING
    # -----------------------------------------------------
    #
    # Customer rating from 1 to 5.
    #
    # The database constraint also protects this rule.
    #
    # -----------------------------------------------------

    rating = db.Column(
        db.Integer,
        nullable=False
    )

    # -----------------------------------------------------
    # COMMENT
    # -----------------------------------------------------
    #
    # Customer's written experience.
    #
    # -----------------------------------------------------

    comment = db.Column(
        db.Text,
        nullable=False
    )

    # -----------------------------------------------------
    # VISIBILITY
    # -----------------------------------------------------
    #
    # True:
    #     Review is visible publicly.
    #
    # False:
    #     Review is hidden by an administrator.
    #
    # -----------------------------------------------------

    is_visible = db.Column(
        db.Boolean,
        default=True,
        nullable=False
    )

    # -----------------------------------------------------
    # DATABASE CONSTRAINTS
    # -----------------------------------------------------

    __table_args__ = (
        db.CheckConstraint(
            "rating >= 1 AND rating <= 5",
            name="check_review_rating"
        ),
    )
