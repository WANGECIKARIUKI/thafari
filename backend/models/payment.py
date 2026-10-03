# =========================================================
# THAFARI PAYMENT MODEL
# =========================================================

from models.base_model import BaseModel
from extensions import db


class Payment(BaseModel):

    __tablename__ = "payments"


    # =====================================================
    # BOOKING
    # =====================================================
    #
    # A booking can have multiple payments.
    #
    # Example:
    #
    # Booking total = KSh 50,000
    #
    # Payment 1 = KSh 20,000
    # Payment 2 = KSh 30,000
    #
    # The booking is fully paid once the successful
    # payments reach the booking total.
    #
    # =====================================================

    booking_id = db.Column(
        db.Integer,
        db.ForeignKey("bookings.id"),
        nullable=False
    )


    # =====================================================
    # PAYMENT STATUS
    # =====================================================

    status = db.Column(
        db.Enum(
            "pending",
            "successful",
            "failed",
            "cancelled",
            "refunded",
            "reversed"
        ),
        default="pending",
        nullable=False
    )


    # =====================================================
    # PAYMENT AMOUNT
    # =====================================================

    amount = db.Column(
        db.Numeric(10, 2),
        nullable=False
    )


    # =====================================================
    # POSITIVE PAYMENT AMOUNT
    # =====================================================

    __table_args__ = (
        db.CheckConstraint(
            "amount > 0",
            name="check_positive_payment_amount"
        ),
    )


    # =====================================================
    # PAYMENT METHOD
    # =====================================================
    #
    # Supported payment methods:
    #
    #     mpesa
    #     airtel_money
    #     visa
    #     mastercard
    #     amex
    #     bank_transfer
    #
    # Airtel Money is being added for direct payments.
    #
    # =====================================================

    payment_method = db.Column(
        db.Enum(
            "mpesa",
            "airtel_money",
            "visa",
            "mastercard",
            "amex",
            "bank_transfer"
        ),
        nullable=True
    )


    # =====================================================
    # TRANSACTION REFERENCE
    # =====================================================
    #
    # This is the payment transaction reference.
    #
    # For Pesapal, this is the merchant reference generated
    # by Thafari.
    #
    # For direct payments, this will be the transaction
    # reference submitted by the customer.
    #
    # It must be unique so that the same transaction cannot
    # accidentally be registered multiple times.
    #
    # =====================================================

    transaction_reference = db.Column(
        db.String(250),
        unique=True,
        nullable=False
    )


    # =====================================================
    # PAYMENT DATE
    # =====================================================

    paid_at = db.Column(
        db.DateTime,
        nullable=True
    )


    # =====================================================
    # MANUAL PAYMENT VERIFICATION
    # =====================================================
    #
    # These fields are primarily used for direct payments.
    #
    # Example:
    #
    # Customer submits:
    #
    #     M-Pesa transaction reference
    #
    # Payment remains:
    #
    #     pending
    #
    # An admin or authorized tour operator then verifies
    # the transaction.
    #
    # verified_by:
    #     Stores the user ID of the person who verified it.
    #
    # verified_at:
    #     Stores when the verification happened.
    #
    # Pesapal payments do not need manual verification, so
    # these fields can remain NULL for Pesapal transactions.
    #
    # =====================================================

    verified_by = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=True
    )


    verified_at = db.Column(
        db.DateTime,
        nullable=True
    )


    # =====================================================
    # RELATIONSHIPS
    # =====================================================

    booking = db.relationship(
        "Booking",
        back_populates="payments"
    )


    refunds = db.relationship(
        "Refund",
        back_populates="payment"
    )


    # =====================================================
    # PESAPAL TRACKING ID
    # =====================================================
    #
    # This is returned by Pesapal when the order is
    # successfully submitted.
    #
    # =====================================================

    pesapal_order_tracking_id = db.Column(
        db.String(250),
        nullable=True,
        unique=True
    )


    # =====================================================
    # PESAPAL CONFIRMATION CODE
    # =====================================================
    #
    # This is the confirmation/reference code returned by
    # Pesapal after successful payment.
    #
    # =====================================================

    pesapal_confirmation_code = db.Column(
        db.String(250),
        unique=True,
        nullable=True
    )


    # =====================================================
    # VERIFIER RELATIONSHIP
    # =====================================================
    #
    # Connects the payment to the admin/operator who
    # manually verified it.
    #
    # =====================================================

    verifier = db.relationship(
        "User",
        foreign_keys=[verified_by]
    )