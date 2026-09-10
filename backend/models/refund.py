from models.base_model import BaseModel
from extensions import db


class Refund(BaseModel):
    __tablename__ = "refunds"

    payment_id = db.Column(
        db.Integer,
        db.ForeignKey("payments.id"),
        nullable=False
    )

    amount = db.Column(
        db.Numeric(10, 2),
        nullable=False
    )

    __table_args__ = (
            db.CheckConstraint(
                "amount > 0",
                name="check_positive_refund_amount"
            ),
        )

    status = db.Column(
        db.Enum(
            "pending",
            "successful",
            "failed"
        ),
        default = "pending",
        nullable=False
    )

    refunded_at = db.Column(
        db.DateTime,
        nullable=True
    )

    refund_reference = db.Column(
        db.String(250),
        unique=True,
        nullable=False
    )

    payment = db.relationship(
        "Payment",
        back_populates = "refunds"
    )