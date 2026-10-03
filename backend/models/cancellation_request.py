from models.base_model import BaseModel
from extensions import db


# =========================================================
# CANCELLATION REQUEST MODEL
# =========================================================
#
# This model stores cancellation requests for confirmed,
# paid bookings.
#
# IMPORTANT:
# Creating a cancellation request does NOT immediately
# cancel the booking and does NOT immediately refund money.
#
# The booking remains confirmed while the request is
# awaiting review.
# =========================================================

class CancellationRequest(BaseModel):

    __tablename__ = "cancellation_requests"


    # -----------------------------------------------------
    # BOOKING
    # -----------------------------------------------------
    #
    # The booking the customer wants to cancel.
    # -----------------------------------------------------

    booking_id = db.Column(
        db.Integer,
        db.ForeignKey("bookings.id"),
        nullable=False
    )


    # -----------------------------------------------------
    # CUSTOMER REASON
    # -----------------------------------------------------
    #
    # The customer's explanation for requesting
    # cancellation.
    # -----------------------------------------------------

    reason = db.Column(
        db.Text,
        nullable=False
    )


    # -----------------------------------------------------
    # REQUEST STATUS
    # -----------------------------------------------------
    #
    # pending  = waiting for staff review
    # approved = staff approved the cancellation request
    # denied   = staff denied the cancellation request
    # -----------------------------------------------------

    status = db.Column(
        db.Enum(
            "pending",
            "approved",
            "denied"
        ),
        nullable=False,
        default="pending"
    )


    # -----------------------------------------------------
    # ADMIN / STAFF REVIEW REASON
    # -----------------------------------------------------
    #
    # This stores the explanation given by the reviewer.
    #
    # It is especially important when a request is denied,
    # because the customer should be told why it was denied.
    # -----------------------------------------------------

    admin_reason = db.Column(
        db.Text,
        nullable=True
    )


    # -----------------------------------------------------
    # REVIEW INFORMATION
    # -----------------------------------------------------
    #
    # reviewed_by stores the user ID of the staff member
    # who approved or denied the request.
    #
    # reviewed_at stores when the review happened.
    # -----------------------------------------------------

    reviewed_by = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=True
    )

    reviewed_at = db.Column(
        db.DateTime,
        nullable=True
    )


    # -----------------------------------------------------
    # RELATIONSHIPS
    # -----------------------------------------------------

    booking = db.relationship(
        "Booking",
        back_populates="cancellation_requests"
    )

    reviewer = db.relationship(
        "User",
        foreign_keys=[reviewed_by]
    )
