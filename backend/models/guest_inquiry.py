# =========================================================
# THAFARI - GUEST INQUIRY MODEL
# =========================================================
#
# Stores questions/inquiries submitted by visitors through
# the public Ask Thafari widget.
#
# This is deliberately separate from the authenticated
# customer/operator messaging system.
# =========================================================

from datetime import datetime

from extensions import db


class GuestInquiry(db.Model):

    __tablename__ = "guest_inquiries"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    name = db.Column(
        db.String(120),
        nullable=False
    )

    email = db.Column(
        db.String(255),
        nullable=True
    )

    phone = db.Column(
        db.String(50),
        nullable=True
    )

    message = db.Column(
        db.Text,
        nullable=False
    )

    status = db.Column(
        db.Enum(
            "pending",
            "in_progress",
            "resolved",
            name="guest_inquiry_status"
        ),
        nullable=False,
        default="pending"
    )

    assigned_to = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=True
    )

    response = db.Column(
        db.Text,
        nullable=True
    )

    created_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow
    )

    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

    assignee = db.relationship(
        "User",
        foreign_keys=[assigned_to],
        lazy=True
    )

    def __repr__(self):
        return (
            f"<GuestInquiry {self.id} "
            f"status={self.status}>"
        )