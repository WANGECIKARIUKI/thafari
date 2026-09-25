from datetime import datetime

from models.base_model import BaseModel
from extensions import db


class RevokedToken(BaseModel):
    """
    Stores JWT tokens that have been revoked.

    We store the JWT ID (jti) rather than the actual token.
    The jti uniquely identifies a JWT and allows us to
    invalidate it without storing the sensitive token itself.
    """

    __tablename__ = "revoked_tokens"

    # Unique identifier assigned to the JWT.
    jti = db.Column(
        db.String(255),
        unique=True,
        nullable=False
    )

    # Identifies whether the revoked token was an
    # access token or refresh token.
    token_type = db.Column(
        db.String(20),
        nullable=False
    )

    # The user who owned the token.
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False
    )

    # Time when the token was revoked.
    revoked_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow
    )

    # Time when the JWT itself expires.
    #
    # This allows us to eventually clean up old revoked
    # tokens that can no longer be used anyway.
    expires_at = db.Column(
        db.DateTime,
        nullable=False
    )

    user = db.relationship(
        "User",
        backref="revoked_tokens"
    )