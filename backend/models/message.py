# stores individual messages sent inside conversations

from models.base_model import BaseModel
from extensions import db


class Message(BaseModel):

    __tablename__ = "messages"

    # Conversation where the message was sent.
    conversation_id = db.Column(
        db.Integer,
        db.ForeignKey("conversations.id"),
        nullable=False
    )

    # User who sent the message.
    sender_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False
    )

    # Actual message content.
    content = db.Column(
        db.Text,
        nullable=False
    )

    conversation = db.relationship(
        "Conversation",
        back_populates="messages"
    )

    sender = db.relationship(
        "User",
        back_populates="sent_messages"
    )