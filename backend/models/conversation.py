# stores information about a conversation between users
# a conversation can optionally be connected to a booking

from models.base_model import BaseModel
from extensions import db


class Conversation(BaseModel):

    __tablename__ = "conversations"

    # Optional booking associated with this conversation.
    # Nullable because a customer may want to contact an operator
    # before making a booking.
    booking_id = db.Column(
        db.Integer,
        db.ForeignKey("bookings.id"),
        nullable=True
    )

    # Indicates whether the conversation is currently active.
    is_active = db.Column(
        db.Boolean,
        default=True,
        nullable=False
    )

    # Relationship to the booking.
    booking = db.relationship(
        "Booking",
        back_populates="conversation"
    )

    # A conversation can have multiple participants.
    participants = db.relationship(
        "ConversationParticipant",
        back_populates="conversation",
        cascade="all, delete-orphan"
    )

    # A conversation can contain many messages.
    messages = db.relationship(
        "Message",
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="Message.created_at"
    )