# =========================================================
# THAFARI PASSWORD RESET TOKEN MODEL
# =========================================================
#
# This model stores password-reset information.
#
# IMPORTANT:
#
# We DO NOT store the actual reset token.
#
# The raw token is sent to the user's email.
# Only a secure hash of that token is stored in MySQL.
#
# This means that even if somebody somehow sees the database,
# they cannot directly use the stored value as a reset link.
# =========================================================

from datetime import datetime

from extensions import db

from models.base_model import BaseModel


class PasswordResetToken(BaseModel):

    __tablename__ = "password_reset_tokens"


    # =========================================================
    # USER
    # =========================================================
    #
    # Each reset token belongs to one user.
    # =========================================================

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False
    )


    # =========================================================
    # TOKEN HASH
    # =========================================================
    #
    # We store the SHA-256 hash of the actual reset token.
    #
    # The raw token itself is NEVER stored.
    # =========================================================

    token_hash = db.Column(
        db.String(64),
        unique=True,
        nullable=False
    )


    # =========================================================
    # EXPIRATION
    # =========================================================
    #
    # Reset links will only work for a limited period.
    #
    # We will use 30 minutes.
    # =========================================================

    expires_at = db.Column(
        db.DateTime,
        nullable=False
    )


    # =========================================================
    # USED STATUS
    # =========================================================
    #
    # A reset token can only be used once.
    # =========================================================

    used_at = db.Column(
        db.DateTime,
        nullable=True
    )


    # =========================================================
    # USER RELATIONSHIP
    # =========================================================

    user = db.relationship(
        "User",
        back_populates="password_reset_tokens"
    )


    # =========================================================
    # HELPER
    # =========================================================
    #
    # Returns True when the token has already been used.
    # =========================================================

    @property
    def is_used(self):

        return self.used_at is not None


    # =========================================================
    # HELPER
    # =========================================================
    #
    # Returns True when the token has expired.
    # =========================================================

    @property
    def is_expired(self):

        return datetime.utcnow() > self.expires_at