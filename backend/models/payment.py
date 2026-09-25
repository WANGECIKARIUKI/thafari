from models.base_model import BaseModel
from extensions import db

class Payment(BaseModel):
    __tablename__ = "payments"

    booking_id = db.Column(
        db.Integer,
        db.ForeignKey("bookings.id"), #a booking can have many payments
        nullable=False
    )

    status = db.Column(
        db.Enum("pending", "successful", "failed", "cancelled", "refunded", "reversed"),
        default = "pending",
        nullable=False
    )

    amount = db.Column(
        db.Numeric(10, 2),
        nullable=False
    )

    __table_args__ = (db.CheckConstraint(
        "amount > 0",
        name="check_positive_payment_amount"
    ),
    )

    payment_method = db.Column(
    db.Enum(
        "mpesa",
        "visa",
        "mastercard",
        "amex",
        "bank_transfer"
    ),
    nullable=True
)

    transaction_reference = db.Column(
        db.String(250),
        unique=True,
        nullable=False
    )

    paid_at = db.Column(
        db.DateTime,
        nullable=True
    )

    booking = db.relationship(
        "Booking",
        back_populates = "payments"
    )

    refunds = db.relationship(
        "Refund",
        back_populates = "payment"
    )

    pesapal_order_tracking_id = db.Column(
        db.String(250),
        nullable=True,
        unique=True
    )

    # Stores the confirmation/reference code returned by Pesapal
    # after a payment is successfully completed.
    pesapal_confirmation_code = db.Column(
        db.String(250),
        unique=True,
        nullable=True
    )
