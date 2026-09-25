# connects users to conversations
# this allows a conversation to have two or more participants

from models.base_model import BaseModel
from extensions import db


class ConversationParticipant(BaseModel):

    __tablename__ = "conversation_participants"

    # Conversation the user belongs to.
    conversation_id = db.Column(
        db.Integer,
        db.ForeignKey("conversations.id"),
        nullable=False
    )

    # User participating in the conversation.
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False
    )

    # Records when the user joined the conversation.
    joined_at = db.Column(
        db.DateTime,
        nullable=False,
        default=db.func.now()
    )

    # Records the last time this participant read the conversation.
    # This is better than putting "is_read" on Message because
    # different users can have different read states.
    last_read_at = db.Column(
        db.DateTime,
        nullable=True
    )

    conversation = db.relationship(
        "Conversation",
        back_populates="participants"
    )

    user = db.relationship(
        "User",
        back_populates="conversation_participations"
    )

    # Prevent the same user from being added to the same conversation twice.
    __table_args__ = (
        db.UniqueConstraint(
            "conversation_id",
            "user_id",
            name="unique_conversation_participant"
        ),
    )