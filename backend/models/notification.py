from extensions import db
from models.base_model import BaseModel


class Notification(BaseModel):
    """
    Stores in-app notifications for users.

    A notification belongs to one user and records:
    - what happened
    - what type of event caused it
    - whether the user has read it
    """

    __tablename__ = "notifications"

    # The user who should receive this notification.
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False
    )

    # Short heading displayed in the notification panel.
    title = db.Column(
        db.String(150),
        nullable=False
    )

    # Full notification message.
    message = db.Column(
        db.Text,
        nullable=False
    )

    # Helps the frontend know what kind of notification this is.
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

    # False = unread, True = user has read it.
    is_read = db.Column(
        db.Boolean,
        default=False,
        nullable=False
    )

    # Relationship back to the user.
    user = db.relationship(
        "User",
        back_populates="notifications"
    )