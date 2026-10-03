# =========================================================
# THAFARI NOTIFICATION MODEL
# =========================================================
#
# This model stores in-app notifications for users.
#
# A notification can represent different events such as:
#
# - bookings
# - payments
# - refunds
# - customer messages
# - departures
# - system events
#
# Notifications can also optionally contain a LINK.
#
# The link tells the frontend where the user should go
# when they click the "View" or "Open" button.
#
# Example:
#
# Payment notification:
#     /admin/direct-payments/42
#
# Customer message:
#     /admin/messages/123
#
# Booking:
#     /admin/bookings/25
#
# Not every notification needs a link, so this field is
# optional.
# =========================================================

from extensions import db
from models.base_model import BaseModel


class Notification(BaseModel):
    """
    Stores in-app notifications for users.

    A notification belongs to one user and records:

    - what happened
    - what type of event caused it
    - whether the user has read it
    - where the user can go to view more details
    """

    __tablename__ = "notifications"


    # =====================================================
    # USER
    # =====================================================
    #
    # The user who should receive this notification.
    # =====================================================

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False
    )


    # =====================================================
    # TITLE
    # =====================================================
    #
    # Short heading displayed in the notification panel.
    #
    # Example:
    #
    # "New Direct Payment"
    # =====================================================

    title = db.Column(
        db.String(150),
        nullable=False
    )


    # =====================================================
    # MESSAGE
    # =====================================================
    #
    # Full notification message.
    #
    # Example:
    #
    # "John submitted a direct payment of KSh 18,000."
    # =====================================================

    message = db.Column(
        db.Text,
        nullable=False
    )


    # =====================================================
    # NOTIFICATION TYPE
    # =====================================================
    #
    # Helps the frontend determine what kind of notification
    # this is.
    #
    # We can expand this list later if Thafari needs more
    # notification categories.
    # =====================================================

    notification_type = db.Column(
        db.Enum(
            "booking",
            "payment",
            "refund",
            "message",
            "departure",
            "system"
        ),
        nullable=False
    )


    # =====================================================
    # READ STATUS
    # =====================================================
    #
    # False = unread
    # True  = read
    #
    # This controls:
    #
    # - the "New" label
    # - unread notification count
    # - notification styling
    # =====================================================

    is_read = db.Column(
        db.Boolean,
        default=False,
        nullable=False
    )


    # =====================================================
    # NOTIFICATION LINK
    # =====================================================
    #
    # Optional frontend route for viewing more information
    # about this notification.
    #
    # Examples:
    #
    # /admin/direct-payments/42
    # /admin/messages/123
    # /admin/bookings/25
    #
    # It is nullable because some notifications may simply
    # be informational and do not need an "Open" button.
    #
    # IMPORTANT:
    #
    # We are NOT requiring the destination page to exist yet.
    #
    # We can create the notification now and build the
    # destination feature later.
    # =====================================================

    link = db.Column(
        db.String(255),
        nullable=True
    )


    # =====================================================
    # USER RELATIONSHIP
    # =====================================================

    user = db.relationship(
        "User",
        back_populates="notifications"
    )