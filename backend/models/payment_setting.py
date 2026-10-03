# =========================================================
# THAFARI PAYMENT SETTINGS MODEL
# =========================================================
#
# This table stores the payment details that customers
# should see when they choose direct payment.
#
# IMPORTANT:
#
# These are NOT secret credentials.
#
# They are public business payment details such as:
#
#     M-Pesa Paybill
#     M-Pesa Till
#     Airtel Money number
#     Business/account names
#     Customer instructions
#
# The admin can update these details without changing
# the frontend code.
#
# =========================================================

from extensions import db
from models.base_model import BaseModel


class PaymentSetting(BaseModel):

    __tablename__ = "payment_settings"


    # =====================================================
    # SETTINGS KEY
    # =====================================================
    #
    # We currently use one configuration row.
    #
    # "default" identifies the active payment configuration.
    #
    # The unique constraint prevents multiple rows using
    # the same key.
    #
    # =====================================================

    setting_key = db.Column(
        db.String(50),
        nullable=False,
        unique=True,
        default="default"
    )


    # =====================================================
    # M-PESA SETTINGS
    # =====================================================

    mpesa_enabled = db.Column(
        db.Boolean,
        nullable=False,
        default=True
    )


    mpesa_paybill = db.Column(
        db.String(50),
        nullable=True
    )


    mpesa_till = db.Column(
        db.String(50),
        nullable=True
    )


    mpesa_business_name = db.Column(
        db.String(200),
        nullable=True
    )


    # =====================================================
    # AIRTEL MONEY SETTINGS
    # =====================================================

    airtel_enabled = db.Column(
        db.Boolean,
        nullable=False,
        default=True
    )


    airtel_money_number = db.Column(
        db.String(50),
        nullable=True
    )


    airtel_business_name = db.Column(
        db.String(200),
        nullable=True
    )


    # =====================================================
    # CUSTOMER PAYMENT INSTRUCTIONS
    # =====================================================

    instructions = db.Column(
        db.Text,
        nullable=True
    )