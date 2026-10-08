# =========================================================
# THAFARI PAYMENT ROUTES
# =========================================================
#
# This file handles:
#
# - Creating Pesapal payments
# - Pesapal authentication
# - Pesapal IPN registration
# - Pesapal transaction verification
# - Pesapal customer callback
# - Public direct-payment settings
# - Payment history
#
# IMPORTANT:
#
# Pesapal IPN + transaction-status verification are the
# source of truth for successful Pesapal payments.
#
# Direct payments are different:
#
# Customer submits a transaction reference.
# The payment remains pending until an authorized
# admin/operator manually verifies it.
#
# =========================================================


from flask import (
    Blueprint,
    request,
    jsonify,
    current_app,
    redirect
)

from flask_jwt_extended import (
    jwt_required,
    get_jwt_identity
)

from models.booking import Booking
from models.departure import Departure
from models.payment import Payment
from models.tour import Tour
from models.payment_setting import PaymentSetting
from models.user import User

from decorators.auth_decorator import roles_required

from datetime import datetime

from extensions import db, limiter

from decimal import Decimal

import uuid

import requests

from urllib.parse import urlencode

from services.email_service import (
    send_payment_success_email,
    send_booking_confirmed_email
)

from services.notification_service import (
    create_notification,
    emit_notification
)


# =========================================================
# PAYMENT BLUEPRINT
# =========================================================

payment_bp = Blueprint(
    "payment",
    __name__,
    url_prefix="/api"
)


# =========================================================
# PUBLIC PAYMENT SETTINGS
# =========================================================

@payment_bp.route(
    "/payment-settings",
    methods=["GET"]
)
def get_public_payment_settings():
    """
    Return the payment instructions that customers can use
    for direct payments.

    These details are intentionally public because they are
    business payment details such as:

    - M-Pesa Paybill
    - M-Pesa Till
    - Airtel Money number
    - Business names
    - Customer instructions

    No authentication is required.

    IMPORTANT:

    This endpoint does NOT expose Pesapal credentials,
    admin information, or any secret configuration.
    """

    # -----------------------------------------------------
    # Find the active/default payment configuration
    # -----------------------------------------------------

    settings = PaymentSetting.query.filter_by(
        setting_key="default"
    ).first()


    # -----------------------------------------------------
    # If no configuration exists yet
    # -----------------------------------------------------
    #
    # Return a safe response instead of exposing an error
    # to the customer.
    #
    # -----------------------------------------------------

    if not settings:

        return jsonify({

            "message":
                "Payment settings retrieved successfully.",

            "payment_settings": {

                "mpesa": {
                    "enabled": False,
                    "mode": "paybill",
                    "paybill": None,
                    "till": None,
                    "business_name": None
                },

                "airtel_money": {
                    "enabled": False,
                    "number": None,
                    "business_name": None
                },

                "instructions": None

            }

        }), 200


    # -----------------------------------------------------
    # Return customer-facing payment information
    # -----------------------------------------------------
    #
    # We deliberately serialize only the fields customers
    # actually need.
    #
    # -----------------------------------------------------

    return jsonify({

        "message":
            "Payment settings retrieved successfully.",

        "payment_settings": {

            "mpesa": {

                "enabled":
                    settings.mpesa_enabled,

                "mode":
                    settings.mpesa_mode,

                "paybill":
                    settings.mpesa_paybill,

                "till":
                    settings.mpesa_till,

                "business_name":
                    settings.mpesa_business_name
            },

            "airtel_money": {

                "enabled":
                    settings.airtel_enabled,

                "number":
                    settings.airtel_money_number,

                "business_name":
                    settings.airtel_business_name
            },

            "instructions":
                settings.instructions

        }

    }), 200


# =========================================================
# ADMIN PAYMENT SETTINGS
# =========================================================
#
# These routes allow ONLY administrators to view and update
# the platform payment settings.
#
# GET /api/admin/payment-settings
# PUT /api/admin/payment-settings
#
# These settings control the payment details displayed to
# customers on the booking payment screen.
# =========================================================


@payment_bp.route(
    "/admin/payment-settings",
    methods=["GET"]
)
@jwt_required()
@roles_required("admin")
def get_admin_payment_settings():
    """
    Return the current platform payment settings.

    Only administrators can access this endpoint.
    """

    settings = PaymentSetting.query.filter_by(
        setting_key="default"
    ).first()


    # -----------------------------------------------------
    # Create a safe default configuration if none exists
    # -----------------------------------------------------

    if not settings:

        settings = PaymentSetting(
            setting_key="default",
            mpesa_enabled=True,
            mpesa_mode="paybill",
            mpesa_paybill="",
            mpesa_till="",
            mpesa_business_name="",
            airtel_enabled=False,
            airtel_money_number="",
            airtel_business_name="",
            instructions=""
        )

        db.session.add(settings)

        try:

            db.session.commit()

        except Exception as e:

            db.session.rollback()

            print(
                f"Admin payment settings creation error: {e}"
            )

            return jsonify({
                "message": (
                    "Payment settings could not "
                    "be initialized."
                )
            }), 500


    return jsonify({

        "message":
            "Admin payment settings retrieved successfully.",

        "payment_settings": {

            "mpesa_enabled":
                settings.mpesa_enabled,

            "mpesa_mode":
                settings.mpesa_mode,

            "mpesa_paybill":
                settings.mpesa_paybill,

            "mpesa_till":
                settings.mpesa_till,

            "mpesa_business_name":
                settings.mpesa_business_name,

            "airtel_enabled":
                settings.airtel_enabled,

            "airtel_money_number":
                settings.airtel_money_number,

            "airtel_business_name":
                settings.airtel_business_name,

            "instructions":
                settings.instructions

        }

    }), 200


@payment_bp.route(
    "/admin/payment-settings",
    methods=["PUT"]
)
@jwt_required()
@roles_required("admin")
def update_admin_payment_settings():
    """
    Update the platform payment settings.

    Only administrators can modify these settings.

    The active M-Pesa mode must be either:
        - paybill
        - till
    """

    data = request.get_json(
        silent=True
    ) or {}


    # -----------------------------------------------------
    # Find the default payment configuration
    # -----------------------------------------------------

    settings = PaymentSetting.query.filter_by(
        setting_key="default"
    ).first()


    # -----------------------------------------------------
    # Create the configuration if it does not exist
    # -----------------------------------------------------

    if not settings:

        settings = PaymentSetting(
            setting_key="default"
        )

        db.session.add(settings)


    # -----------------------------------------------------
    # Read incoming values
    # -----------------------------------------------------

    mpesa_enabled = data.get(
        "mpesa_enabled",
        settings.mpesa_enabled
    )

    mpesa_mode = data.get(
        "mpesa_mode",
        settings.mpesa_mode or "paybill"
    )

    mpesa_paybill = data.get(
        "mpesa_paybill",
        settings.mpesa_paybill
    )

    mpesa_till = data.get(
        "mpesa_till",
        settings.mpesa_till
    )

    mpesa_business_name = data.get(
        "mpesa_business_name",
        settings.mpesa_business_name
    )

    airtel_enabled = data.get(
        "airtel_enabled",
        settings.airtel_enabled
    )

    airtel_money_number = data.get(
        "airtel_money_number",
        settings.airtel_money_number
    )

    airtel_business_name = data.get(
        "airtel_business_name",
        settings.airtel_business_name
    )

    instructions = data.get(
        "instructions",
        settings.instructions
    )


    # -----------------------------------------------------
    # Validate M-Pesa enabled
    # -----------------------------------------------------

    if not isinstance(
        mpesa_enabled,
        bool
    ):

        return jsonify({
            "message":
                "mpesa_enabled must be true or false."
        }), 400


    # -----------------------------------------------------
    # Validate M-Pesa mode
    # -----------------------------------------------------

    if not isinstance(
        mpesa_mode,
        str
    ):

        return jsonify({
            "message":
                "mpesa_mode must be paybill or till."
        }), 400


    mpesa_mode = (
        mpesa_mode
        .strip()
        .lower()
    )


    if mpesa_mode not in {
        "paybill",
        "till"
    }:

        return jsonify({
            "message":
                "mpesa_mode must be paybill or till."
        }), 400


    # -----------------------------------------------------
    # Validate M-Pesa payment destination
    # -----------------------------------------------------

    if mpesa_enabled:

        if mpesa_mode == "paybill":

            if not isinstance(
                mpesa_paybill,
                str
            ) or not mpesa_paybill.strip():

                return jsonify({
                    "message":
                        "M-Pesa Paybill number is required "
                        "when Paybill mode is active."
                }), 400


        if mpesa_mode == "till":

            if not isinstance(
                mpesa_till,
                str
            ) or not mpesa_till.strip():

                return jsonify({
                    "message":
                        "M-Pesa Till Number is required "
                        "when Till mode is active."
                }), 400


    # -----------------------------------------------------
    # Validate Airtel settings
    # -----------------------------------------------------

    if not isinstance(
        airtel_enabled,
        bool
    ):

        return jsonify({
            "message":
                "airtel_enabled must be true or false."
        }), 400


    if airtel_enabled:

        if not isinstance(
            airtel_money_number,
            str
        ) or not airtel_money_number.strip():

            return jsonify({
                "message":
                    "Airtel Money number is required "
                    "when Airtel Money is enabled."
            }), 400


    # -----------------------------------------------------
    # Normalize text fields
    # -----------------------------------------------------

    if mpesa_paybill is None:
        mpesa_paybill = ""

    if mpesa_till is None:
        mpesa_till = ""

    if mpesa_business_name is None:
        mpesa_business_name = ""

    if airtel_money_number is None:
        airtel_money_number = ""

    if airtel_business_name is None:
        airtel_business_name = ""

    if instructions is None:
        instructions = ""


    if not isinstance(
        mpesa_paybill,
        str
    ):

        return jsonify({
            "message":
                "mpesa_paybill must be text."
        }), 400


    if not isinstance(
        mpesa_till,
        str
    ):

        return jsonify({
            "message":
                "mpesa_till must be text."
        }), 400


    if not isinstance(
        mpesa_business_name,
        str
    ):

        return jsonify({
            "message":
                "mpesa_business_name must be text."
        }), 400


    if not isinstance(
        airtel_money_number,
        str
    ):

        return jsonify({
            "message":
                "airtel_money_number must be text."
        }), 400


    if not isinstance(
        airtel_business_name,
        str
    ):

        return jsonify({
            "message":
                "airtel_business_name must be text."
        }), 400


    if not isinstance(
        instructions,
        str
    ):

        return jsonify({
            "message":
                "instructions must be text."
        }), 400


    # -----------------------------------------------------
    # Update settings
    # -----------------------------------------------------

    settings.mpesa_enabled = mpesa_enabled

    settings.mpesa_mode = mpesa_mode

    settings.mpesa_paybill = (
        mpesa_paybill.strip()
    )

    settings.mpesa_till = (
        mpesa_till.strip()
    )

    settings.mpesa_business_name = (
        mpesa_business_name.strip()
    )

    settings.airtel_enabled = airtel_enabled

    settings.airtel_money_number = (
        airtel_money_number.strip()
    )

    settings.airtel_business_name = (
        airtel_business_name.strip()
    )

    settings.instructions = (
        instructions.strip()
    )


    # -----------------------------------------------------
    # Save changes
    # -----------------------------------------------------

    try:

        db.session.commit()

    except Exception as e:

        db.session.rollback()

        print(
            f"Admin payment settings update error: {e}"
        )

        return jsonify({
            "message":
                "Payment settings could not be updated."
        }), 500


    return jsonify({

        "message":
            "Payment settings updated successfully.",

        "payment_settings": {

            "mpesa_enabled":
                settings.mpesa_enabled,

            "mpesa_mode":
                settings.mpesa_mode,

            "mpesa_paybill":
                settings.mpesa_paybill,

            "mpesa_till":
                settings.mpesa_till,

            "mpesa_business_name":
                settings.mpesa_business_name,

            "airtel_enabled":
                settings.airtel_enabled,

            "airtel_money_number":
                settings.airtel_money_number,

            "airtel_business_name":
                settings.airtel_business_name,

            "instructions":
                settings.instructions

        }

    }), 200

# =========================================================
# SUBMIT DIRECT PAYMENT
# =========================================================

@payment_bp.route(
    "/payment/direct",
    methods=["POST"]
)
@limiter.limit("5 per 15 minutes")
@jwt_required()
@roles_required("customer")
def submit_direct_payment():
    """
    Submit a direct M-Pesa or Airtel Money payment for
    manual verification.

    IMPORTANT:

    This endpoint does NOT mark the payment as successful.

    The customer only tells Thafari that they have made
    the payment.

    Thafari creates a pending payment record, then an
    authorized admin or tour operator must verify the
    payment before it becomes successful.

    The customer does NOT provide a transaction reference.
    Thafari generates an internal unique reference for
    the payment record.
    """

    # -----------------------------------------------------
    # Read request body
    # -----------------------------------------------------

    data = request.get_json(
        silent=True
    ) or {}

    booking_id = data.get(
        "booking_id"
    )

    payment_method = data.get(
        "payment_method"
    )


    # -----------------------------------------------------
    # Validate booking ID
    # -----------------------------------------------------

    if booking_id is None:

        return jsonify({
            "message": "booking_id is required."
        }), 400


    try:

        booking_id = int(
            booking_id
        )

    except (
        TypeError,
        ValueError
    ):

        return jsonify({
            "message": "booking_id must be a valid integer."
        }), 400


    if booking_id <= 0:

        return jsonify({
            "message": "booking_id must be greater than zero."
        }), 400


    # -----------------------------------------------------
    # Validate payment method
    # -----------------------------------------------------

    if not isinstance(
        payment_method,
        str
    ):

        return jsonify({
            "message": (
                "payment_method must be "
                "mpesa or airtel_money."
            )
        }), 400


    payment_method = (
        payment_method
        .strip()
        .lower()
    )


    allowed_methods = {
        "mpesa",
        "airtel_money"
    }


    if payment_method not in allowed_methods:

        return jsonify({
            "message": (
                "payment_method must be "
                "mpesa or airtel_money."
            )
        }), 400


    # -----------------------------------------------------
    # Get authenticated customer
    # -----------------------------------------------------

    current_user_id = int(
        get_jwt_identity()
    )


    current_user = User.query.get(
        current_user_id
    )


    if not current_user:

        return jsonify({
            "message": "User not found."
        }), 404


    # -----------------------------------------------------
    # Find booking
    # -----------------------------------------------------

    booking = Booking.query.get(
        booking_id
    )


    if not booking:

        return jsonify({
            "message": "Booking not found."
        }), 404


    # -----------------------------------------------------
    # Verify booking ownership
    # -----------------------------------------------------

    if booking.user_id != current_user_id:

        return jsonify({
            "message": (
                "You are not authorized "
                "to pay for this booking."
            )
        }), 403


    # -----------------------------------------------------
    # Check booking status
    # -----------------------------------------------------

    if booking.status != "pending":

        return jsonify({
            "message": (
                "Only pending bookings can "
                "receive payments."
            )
        }), 400


    # -----------------------------------------------------
    # Get current payment settings
    # -----------------------------------------------------

    # We check the database rather than trusting the
    # frontend. This prevents a customer from submitting
    # a payment through a method that the admin has disabled.

    settings = PaymentSetting.query.filter_by(
        setting_key="default"
    ).first()


    if not settings:

        return jsonify({
            "message": (
                "Direct payment settings "
                "are not configured."
            )
        }), 503


    # -----------------------------------------------------
    # Check whether selected payment method is enabled
    # -----------------------------------------------------

    if payment_method == "mpesa":

        if not settings.mpesa_enabled:

            return jsonify({
                "message": (
                    "M-Pesa direct payment "
                    "is currently unavailable."
                )
            }), 400


    if payment_method == "airtel_money":

        if not settings.airtel_enabled:

            return jsonify({
                "message": (
                    "Airtel Money direct payment "
                    "is currently unavailable."
                )
            }), 400


    # -----------------------------------------------------
    # Check for an existing pending direct payment
    # -----------------------------------------------------

    # We do not want a customer submitting multiple
    # unverified direct payments for the same booking.

    pending_direct_payment = (
        Payment.query
        .filter(
            Payment.booking_id == booking.id,
            Payment.status == "pending",
            Payment.payment_method.in_([
                "mpesa",
                "airtel_money"
            ])
        )
        .first()
    )


    if pending_direct_payment:

        return jsonify({
            "message": (
                "This booking already has a "
                "direct payment awaiting verification."
            ),
            "payment_id":
                pending_direct_payment.id
        }), 409


    # -----------------------------------------------------
    # Calculate successful payments
    # -----------------------------------------------------

    successful_payments = (
        Payment.query
        .filter_by(
            booking_id=booking.id,
            status="successful"
        )
        .all()
    )


    total_paid = Decimal(
        "0.00"
    )


    for payment in successful_payments:

        total_paid += Decimal(
            str(payment.amount)
        )


    # -----------------------------------------------------
    # Calculate remaining balance
    # -----------------------------------------------------

    booking_total = Decimal(
        str(booking.total_price)
    )


    remaining_balance = (
        booking_total - total_paid
    )


    # -----------------------------------------------------
    # Make sure something remains to be paid
    # -----------------------------------------------------

    if remaining_balance <= Decimal(
        "0.00"
    ):

        return jsonify({
            "message": (
                "This booking has already "
                "been fully paid."
            )
        }), 400


    # -----------------------------------------------------
    # Generate internal payment reference
    # -----------------------------------------------------

    # The customer no longer supplies a transaction
    # reference.
    #
    # This reference is only an internal identifier for
    # the Thafari payment record. It is NOT proof that
    # the customer actually paid.
    #
    # The uuid makes the value unique even when several
    # customers submit payments at the same time.

    transaction_reference = (
        f"DIRECT-{booking.id}-{uuid.uuid4().hex}"
    )


    # -----------------------------------------------------
    # Create pending direct payment
    # -----------------------------------------------------

    payment = Payment(

        booking_id=booking.id,

        status="pending",

        amount=remaining_balance,

        payment_method=payment_method,

        transaction_reference=
            transaction_reference,

        # Direct payments have not been verified yet.
        paid_at=None,

        verified_by=None,

        verified_at=None

    )


    db.session.add(
        payment
    )


    # -----------------------------------------------------
    # Save the payment FIRST
    # -----------------------------------------------------
    #
    # IMPORTANT:
    # The payment record is the primary business operation.
    # A notification problem must never prevent a customer's
    # payment submission from being stored.
    # -----------------------------------------------------

    try:

        db.session.commit()

    except Exception as e:

        db.session.rollback()

        print(
            f"Direct payment creation error: {e}"
        )

        return jsonify({
            "message": (
                "Unable to submit the "
                "direct payment."
            )
        }), 500


    # -----------------------------------------------------
    # Create staff notifications AFTER payment is committed
    # -----------------------------------------------------

    staff_notifications = []

    try:

        # Notify every admin because admins can review any
        # direct payment.
        admin_users = User.query.filter_by(
            role="admin"
        ).all()


        for admin_user in admin_users:

            staff_notifications.append(
                create_notification(
                    user_id=admin_user.id,
                    title="New Direct Payment",
                    message=(
                        f"A customer submitted a direct payment "
                        f"of KES {payment.amount} for booking "
                        f"#{booking.id}. It is awaiting verification."
                    ),
                    notification_type="payment",
                    link=(
                        f"/admin/direct-payments/{payment.id}"
                    )
                )
            )


        # Notify the tour operator responsible for the tour.
        tour_operator_id = (
            booking.departure.tour.tour_operator_id
            if booking.departure
            and booking.departure.tour
            else None
        )


        if tour_operator_id:

            already_notified_ids = {
                notification.user_id
                for notification in staff_notifications
            }

            if tour_operator_id not in already_notified_ids:

                staff_notifications.append(
                    create_notification(
                        user_id=tour_operator_id,
                        title="New Direct Payment",
                        message=(
                            f"A customer submitted a direct payment "
                            f"of KES {payment.amount} for booking "
                            f"#{booking.id}. It is awaiting verification."
                        ),
                        notification_type="payment",
                        link=(
                            f"/admin/direct-payments/{payment.id}"
                        )
                    )
                )


        # Commit notifications independently from the payment.
        db.session.commit()


    except Exception as e:

        db.session.rollback()

        print(
            "Direct payment staff notification error: "
            f"{e}"
        )

        # The payment has already been committed, so we still
        # return success for the payment submission.
        staff_notifications = []


    # -----------------------------------------------------
    # Emit staff notifications after successful commit
    # -----------------------------------------------------

    for notification in staff_notifications:

        try:

            emit_notification(
                notification
            )

        except Exception as e:

            print(
                "Direct payment staff notification "
                f"could not be delivered: {e}"
            )


    # -----------------------------------------------------
    # Return successful submission response
    # -----------------------------------------------------

    # "Successful" here means the SUBMISSION succeeded.
    #
    # The PAYMENT itself is still pending.
    #
    # We deliberately do not return the internal
    # transaction reference because the customer does
    # not need it.

    return jsonify({

        "message": (
            "Direct payment submitted successfully. "
            "Your payment is awaiting verification."
        ),

        "payment": {

            "payment_id":
                payment.id,

            "booking_id":
                payment.booking_id,

            "amount":
                float(payment.amount),

            "payment_method":
                payment.payment_method,

            "status":
                payment.status,

            "paid_at":
                None,

            "verified_by":
                None,

            "verified_at":
                None
        }

    }), 201


# =========================================================
# PESAPAL AUTHENTICATION
# =========================================================

def get_pesapal_token():
    """
    Request an authentication token from Pesapal.

    The token is required when communicating with the
    Pesapal API.
    """

    url = (
        f"{current_app.config['PESAPAL_BASE_URL']}"
        "/api/Auth/RequestToken"
    )

    payload = {
        "consumer_key": current_app.config[
            "PESAPAL_CONSUMER_KEY"
        ],

        "consumer_secret": current_app.config[
            "PESAPAL_CONSUMER_SECRET"
        ]
    }

    response = requests.post(
        url,
        json=payload,
        timeout=30
    )

    response.raise_for_status()

    result = response.json()

    # Pesapal returns the API token inside the response.
    return result["token"]


# =========================================================
# PESAPAL IPN REGISTRATION
# =========================================================

def register_pesapal_ipn():
    """
    Register Thafari's IPN endpoint with Pesapal.

    This is a setup/helper function rather than a public API
    endpoint.
    """

    token = get_pesapal_token()

    url = (
        f"{current_app.config['PESAPAL_BASE_URL']}"
        "/api/URLSetup/RegisterIPN"
    )

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    payload = {
        "url": current_app.config[
            "PESAPAL_IPN_URL"
        ],

        "ipn_notification_type": "POST"
    }

    response = requests.post(
        url,
        json=payload,
        headers=headers,
        timeout=30
    )

    response.raise_for_status()

    return response.json()


# =========================================================
# SUBMIT ORDER TO PESAPAL
# =========================================================

def submit_pesapal_order(
    transaction_reference,
    amount,
    description,
    billing_address
):
    """
    Submit a payment order to Pesapal.

    Pesapal creates the checkout session and returns a
    redirect URL where the customer completes payment.
    """

    token = get_pesapal_token()

    url = (
        f"{current_app.config['PESAPAL_BASE_URL']}"
        "/api/Transactions/SubmitOrderRequest"
    )

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    payload = {

        # -------------------------------------------------
        # Our unique reference for this payment.
        # -------------------------------------------------

        "id": transaction_reference,


        # -------------------------------------------------
        # Thafari currently processes payments in KES.
        # -------------------------------------------------

        "currency": "KES",


        # -------------------------------------------------
        # Pesapal expects the amount as a number.
        # -------------------------------------------------

        "amount": float(amount),


        # -------------------------------------------------
        # Payment description.
        # -------------------------------------------------

        "description": description,


        # -------------------------------------------------
        # Pesapal redirects the customer here after checkout.
        # -------------------------------------------------

        "callback_url": current_app.config[
            "PESAPAL_CALLBACK_URL"
        ],


        # -------------------------------------------------
        # Pesapal uses this registered IPN ID to notify
        # Thafari when payment status changes.
        # -------------------------------------------------

        "notification_id": current_app.config[
            "PESAPAL_IPN_ID"
        ],


        # -------------------------------------------------
        # Customer billing information.
        # -------------------------------------------------

        "billing_address": billing_address
    }

    response = requests.post(
        url,
        json=payload,
        headers=headers,
        timeout=30
    )

    response.raise_for_status()

    return response.json()


# =========================================================
# GET PESAPAL TRANSACTION STATUS
# =========================================================

def get_pesapal_transaction_status(
    order_tracking_id
):
    """
    Ask Pesapal for the authoritative status of a
    transaction.

    We do NOT trust the IPN notification alone.

    The IPN gives us the transaction ID, then we ask
    Pesapal for the actual transaction status.
    """

    token = get_pesapal_token()

    url = (
        f"{current_app.config['PESAPAL_BASE_URL']}"
        "/api/Transactions/GetTransactionStatus"
    )

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    params = {
        "orderTrackingId": order_tracking_id
    }

    response = requests.get(
        url,
        params=params,
        headers=headers,
        timeout=30
    )

    response.raise_for_status()

    return response.json()


# =========================================================
# NORMALIZE PESAPAL PAYMENT METHODS
# =========================================================

def normalize_pesapal_payment_method(
    payment_method
):
    """
    Convert Pesapal's payment method names into the values
    accepted by our Payment model.
    """

    if not payment_method:
        return None

    method = payment_method.strip().lower()

    if method == "mpesa":
        return "mpesa"

    if method == "visa":
        return "visa"

    if method in [
        "mastercard",
        "master card"
    ]:
        return "mastercard"

    if method == "amex":
        return "amex"

    if method in [
        "bank",
        "bank transfer",
        "bank_transfer"
    ]:
        return "bank_transfer"

    # Unknown provider method.
    return None


# =========================================================
# CREATE PESAPAL PAYMENT
# =========================================================

@payment_bp.route(
    "/payment",
    methods=["POST"]
)
@jwt_required()
@roles_required("customer")
def create_payment():
    """
    Create a pending Pesapal payment for a customer's
    booking.

    The payment amount is calculated from the remaining
    booking balance rather than trusting an amount supplied
    by the client.
    """

    data = request.get_json(
        silent=True
    ) or {}

    booking_id = data.get(
        "booking_id"
    )


    # -----------------------------------------------------
    # Validate booking ID
    # -----------------------------------------------------

    if booking_id is None:

        return jsonify({
            "message": "booking_id is required."
        }), 400


    try:

        booking_id = int(
            booking_id
        )

    except (
        TypeError,
        ValueError
    ):

        return jsonify({
            "message": "booking_id must be a valid integer."
        }), 400


    if booking_id <= 0:

        return jsonify({
            "message": "booking_id must be greater than zero."
        }), 400


    # -----------------------------------------------------
    # Get authenticated customer
    # -----------------------------------------------------

    current_user_id = int(
        get_jwt_identity()
    )

    current_user = User.query.get(
        current_user_id
    )


    if not current_user:

        return jsonify({
            "message": "User not found."
        }), 404


    # -----------------------------------------------------
    # Find booking
    # -----------------------------------------------------

    booking = Booking.query.get(
        booking_id
    )


    if not booking:

        return jsonify({
            "message": "Booking not found."
        }), 404


    # -----------------------------------------------------
    # Verify booking ownership
    # -----------------------------------------------------

    if booking.user_id != current_user_id:

        return jsonify({
            "message": (
                "You are not authorized to pay "
                "for this booking."
            )
        }), 403


    # -----------------------------------------------------
    # Check booking status
    # -----------------------------------------------------

    if booking.status != "pending":

        return jsonify({
            "message": (
                "Only pending bookings can "
                "receive payments."
            )
        }), 400


    # -----------------------------------------------------
    # Calculate successful payments
    # -----------------------------------------------------

    successful_payments = (
        Payment.query
        .filter_by(
            booking_id=booking.id,
            status="successful"
        )
        .all()
    )


    total_paid = Decimal(
        "0.00"
    )


    for payment in successful_payments:

        total_paid += Decimal(
            str(payment.amount)
        )


    # -----------------------------------------------------
    # Calculate remaining balance
    # -----------------------------------------------------

    booking_total = Decimal(
        str(booking.total_price)
    )

    remaining_balance = (
        booking_total - total_paid
    )


    if remaining_balance <= Decimal(
        "0.00"
    ):

        return jsonify({
            "message": (
                "This booking has already "
                "been fully paid."
            )
        }), 400


    # -----------------------------------------------------
    # Generate unique payment reference
    # -----------------------------------------------------

    transaction_reference = str(
        uuid.uuid4()
    )


    # -----------------------------------------------------
    # Create local pending payment
    # -----------------------------------------------------

    payment = Payment(

        booking_id=booking.id,

        # The customer chooses the actual payment method
        # during Pesapal checkout.
        payment_method=None,

        status="pending",

        amount=remaining_balance,

        transaction_reference=transaction_reference
    )


    db.session.add(
        payment
    )


    # Give SQLAlchemy the payment ID before commit.
    db.session.flush()


    # -----------------------------------------------------
    # Prepare billing information
    # -----------------------------------------------------

    billing_address = {

        "email_address":
            current_user.email,

        "phone_number":
            current_user.phone_number,

        "country_code":
            "KE",

        "first_name":
            current_user.first_name,

        "last_name":
            current_user.last_name,

        "line_1":
            "",

        "line_2":
            "",

        "city":
            "",

        "state":
            "",

        "postal_code":
            "",

        "zip_code":
            ""
    }


    # -----------------------------------------------------
    # Submit order to Pesapal
    # -----------------------------------------------------

    try:

        pesapal_response = (
            submit_pesapal_order(

                transaction_reference=
                    transaction_reference,

                amount=
                    remaining_balance,

                description=
                    f"Thafari booking payment #{booking.id}",

                billing_address=
                    billing_address
            )
        )


        response_status = str(
            pesapal_response.get(
                "status"
            )
        )


        if response_status != "200":

            db.session.rollback()

            return jsonify({

                "message": (
                    "Pesapal could not create "
                    "the payment session."
                ),

                "pesapal_response":
                    pesapal_response

            }), 502


        # -------------------------------------------------
        # Get Pesapal tracking ID
        # -------------------------------------------------

        order_tracking_id = (
            pesapal_response.get(
                "order_tracking_id"
            )
        )


        redirect_url = (
            pesapal_response.get(
                "redirect_url"
            )
        )


        if (
            not order_tracking_id
            or not redirect_url
        ):

            db.session.rollback()

            return jsonify({

                "message": (
                    "Pesapal returned an incomplete "
                    "payment response."
                )

            }), 502


        # -------------------------------------------------
        # Save Pesapal tracking ID
        # -------------------------------------------------

        payment.pesapal_order_tracking_id = (
            order_tracking_id
        )


        # -------------------------------------------------
        # Commit local payment
        # -------------------------------------------------

        db.session.commit()


        return jsonify({

            "message":
                "Payment created successfully.",

            "payment_id":
                payment.id,

            "transaction_reference":
                payment.transaction_reference,

            "pesapal_order_tracking_id":
                payment.pesapal_order_tracking_id,

            "amount":
                float(payment.amount),

            "status":
                payment.status,

            "redirect_url":
                redirect_url

        }), 201


    except requests.RequestException as e:

        db.session.rollback()

        print(
            f"Pesapal request error: {e}"
        )

        return jsonify({

            "message": (
                "Unable to connect to "
                "the payment provider."
            )

        }), 502


    except Exception as e:

        db.session.rollback()

        print(
            f"Payment creation error: {e}"
        )

        return jsonify({

            "message": (
                "An error occurred while "
                "creating the payment."
            )

        }), 500


# =========================================================
# PESAPAL CUSTOMER CALLBACK
# =========================================================

@payment_bp.route(
    "/payment/pesapal/callback",
    methods=["GET"]
)
def pesapal_callback():
    """
    Receive the customer redirect after Pesapal checkout.

    IMPORTANT:

    This endpoint does NOT mark the payment as successful.

    The Pesapal IPN + transaction-status API remain the
    source of truth for payment confirmation.

    This callback simply sends the customer back to the
    Thafari frontend.

    The frontend PaymentResult page then checks the actual
    payment record.
    """

    order_tracking_id = request.args.get(
        "OrderTrackingId"
    )

    merchant_reference = request.args.get(
        "OrderMerchantReference"
    )


    # -----------------------------------------------------
    # Find local payment using merchant reference
    # -----------------------------------------------------

    payment = None


    if merchant_reference:

        payment = Payment.query.filter_by(
            transaction_reference=
                merchant_reference
        ).first()


    # -----------------------------------------------------
    # Get booking ID
    # -----------------------------------------------------

    booking_id = (
        payment.booking_id
        if payment
        else None
    )


    # -----------------------------------------------------
    # Get frontend URL
    # -----------------------------------------------------

    frontend_url = current_app.config.get(
        "FRONTEND_URL"
    )


    if not frontend_url:

        return jsonify({

            "message": (
                "Payment completed, but "
                "FRONTEND_URL is not configured."
            ),

            "order_tracking_id":
                order_tracking_id,

            "merchant_reference":
                merchant_reference,

            "booking_id":
                booking_id

        }), 500


    # -----------------------------------------------------
    # Build query parameters
    # -----------------------------------------------------

    query_parameters = {}


    if booking_id:

        query_parameters[
            "booking_id"
        ] = booking_id


    if order_tracking_id:

        query_parameters[
            "tracking_id"
        ] = order_tracking_id


    if merchant_reference:

        query_parameters[
            "reference"
        ] = merchant_reference


    # -----------------------------------------------------
    # Build frontend result URL
    # -----------------------------------------------------

    result_url = (
        f"{frontend_url.rstrip('/')}"
        "/payment/result"
    )


    if query_parameters:

        result_url = (
            f"{result_url}?"
            f"{urlencode(query_parameters)}"
        )


    # -----------------------------------------------------
    # Redirect customer back to Thafari
    # -----------------------------------------------------

    return redirect(
        result_url,
        code=302
    )


# =========================================================
# PESAPAL IPN
# =========================================================

@payment_bp.route(
    "/payment/pesapal/ipn",
    methods=["POST"]
)
def pesapal_ipn():
    """
    Receive payment notifications from Pesapal.

    Flow:

    1. Pesapal sends the order tracking ID.
    2. We locate the local Payment.
    3. We verify the merchant reference.
    4. We ask Pesapal for authoritative status.
    5. We validate amount and currency.
    6. We update the local payment.
    7. We update the booking if fully paid.

    This endpoint is idempotent.
    """

    data = request.get_json(
        silent=True
    ) or {}


    order_tracking_id = data.get(
        "OrderTrackingId"
    )

    merchant_reference = data.get(
        "OrderMerchantReference"
    )


    # -----------------------------------------------------
    # Validate IPN payload
    # -----------------------------------------------------

    if (
        not order_tracking_id
        or not merchant_reference
    ):

        return jsonify({

            "message": (
                "OrderTrackingId and "
                "OrderMerchantReference "
                "are required."
            ),

            "status": "400"

        }), 400


    try:

        # -------------------------------------------------
        # Lock payment row
        # -------------------------------------------------

        payment = (
            Payment.query
            .filter_by(
                pesapal_order_tracking_id=
                    order_tracking_id
            )
            .with_for_update()
            .first()
        )


        if not payment:

            return jsonify({

                "message":
                    "Payment not found.",

                "status":
                    "404"

            }), 404


        # -------------------------------------------------
        # Verify merchant reference
        # -------------------------------------------------

        if (
            payment.transaction_reference
            != merchant_reference
        ):

            return jsonify({

                "message": (
                    "Merchant reference does "
                    "not match the payment."
                ),

                "status":
                    "400"

            }), 400


        # -------------------------------------------------
        # Get authoritative Pesapal status
        # -------------------------------------------------

        pesapal_result = (
            get_pesapal_transaction_status(
                order_tracking_id
            )
        )


        raw_status_code = (
            pesapal_result.get(
                "status_code"
            )
        )


        try:

            status_code = int(
                raw_status_code
            )

        except (
            TypeError,
            ValueError
        ):

            status_code = None


        # =================================================
        # PAYMENT PENDING
        # =================================================

        if status_code == 0:

            payment.status = "pending"

            db.session.commit()

            return jsonify({

                "message":
                    "Payment is still pending.",

                "status":
                    "200"

            }), 200


        # =================================================
        # PAYMENT FAILED
        # =================================================

        if status_code == 2:

            payment.status = "failed"

            db.session.commit()

            return jsonify({

                "message":
                    "Payment failed.",

                "status":
                    "200"

            }), 200


        # =================================================
        # PAYMENT REVERSED
        # =================================================

        if status_code == 3:

            payment.status = "reversed"

            db.session.commit()

            return jsonify({

                "message":
                    "Payment was reversed.",

                "status":
                    "200"

            }), 200


        # =================================================
        # PAYMENT SUCCESSFUL
        # =================================================

        if status_code == 1:

            # ---------------------------------------------
            # Validate amount
            # ---------------------------------------------

            pesapal_amount = Decimal(
                str(
                    pesapal_result.get(
                        "amount"
                    )
                )
            )


            local_amount = Decimal(
                str(
                    payment.amount
                )
            )


            if (
                pesapal_amount
                != local_amount
            ):

                return jsonify({

                    "message":
                        "Payment amount does not match.",

                    "status":
                        "400"

                }), 400


            # ---------------------------------------------
            # Validate currency
            # ---------------------------------------------

            pesapal_currency = (
                pesapal_result.get(
                    "currency"
                )
            )


            if pesapal_currency != "KES":

                return jsonify({

                    "message":
                        "Unsupported payment currency.",

                    "status":
                        "400"

                }), 400


            # ---------------------------------------------
            # Validate merchant reference
            # ---------------------------------------------

            pesapal_merchant_reference = (
                pesapal_result.get(
                    "merchant_reference"
                )
            )


            if (
                pesapal_merchant_reference
                != payment.transaction_reference
            ):

                return jsonify({

                    "message": (
                        "Pesapal merchant reference "
                        "does not match."
                    ),

                    "status":
                        "400"

                }), 400


            # ---------------------------------------------
            # Idempotency check
            # ---------------------------------------------

            if payment.status == "successful":

                db.session.commit()

                return jsonify({

                    "message":
                        "Payment was already processed.",

                    "status":
                        "successful"

                }), 200


            # ---------------------------------------------
            # Save payment method
            # ---------------------------------------------

            payment.payment_method = (
                normalize_pesapal_payment_method(
                    pesapal_result.get(
                        "payment_method"
                    )
                )
            )


            # ---------------------------------------------
            # Save Pesapal confirmation code
            # ---------------------------------------------

            payment.pesapal_confirmation_code = (
                pesapal_result.get(
                    "confirmation_code"
                )
            )


            # ---------------------------------------------
            # Mark payment successful
            # ---------------------------------------------

            payment.status = "successful"

            payment.paid_at = datetime.utcnow()


            # Make the payment update available to the
            # following successful-payment calculation.
            db.session.flush()


            # ---------------------------------------------
            # Get booking and customer
            # ---------------------------------------------

            booking = payment.booking

            user = booking.user


            # ---------------------------------------------
            # Calculate total successful payments
            # ---------------------------------------------

            successful_payments = (
                Payment.query
                .filter_by(
                    booking_id=booking.id,
                    status="successful"
                )
                .all()
            )


            total_paid = Decimal(
                "0.00"
            )


            for successful_payment in (
                successful_payments
            ):

                total_paid += Decimal(
                    str(
                        successful_payment.amount
                    )
                )


            booking_total = Decimal(
                str(
                    booking.total_price
                )
            )


            # ---------------------------------------------
            # Remember previous booking status
            # ---------------------------------------------

            previous_booking_status = (
                booking.status
            )


            # ---------------------------------------------
            # Update booking status
            # ---------------------------------------------

            if total_paid >= booking_total:

                booking.status = "confirmed"

            else:

                booking.status = "pending"


            # ---------------------------------------------
            # Payment notification
            # ---------------------------------------------

            payment_notification = (
                create_notification(

                    user_id=user.id,

                    title="Payment Successful",

                    message=(
                        f"Your payment of KES "
                        f"{payment.amount} "
                        f"for booking "
                        f"#{booking.id} "
                        f"was received successfully."
                    ),

                    notification_type="payment",

                    # Customer can open the payment result directly.
                    link=f"/payment/result?booking_id={booking.id}"
                )
            )


            # ---------------------------------------------
            # Booking confirmation notification
            # ---------------------------------------------

            booking_notification = None


            if (
                booking.status == "confirmed"
                and previous_booking_status
                != "confirmed"
            ):

                booking_notification = (
                    create_notification(

                        user_id=user.id,

                        title="Booking Confirmed",

                        message=(
                            f"Your booking "
                            f"#{booking.id} "
                            f"is fully paid and "
                            f"has been confirmed."
                        ),

                        notification_type="booking",

                        # Customer can open the booking directly.
                        link=f"/booking/view/{booking.id}"
                    )
                )


            # ---------------------------------------------
            # Commit payment + booking + notifications
            # ---------------------------------------------

            db.session.commit()


            # ---------------------------------------------
            # Emit payment notification
            # ---------------------------------------------

            try:

                emit_notification(
                    payment_notification
                )

            except Exception as e:

                print(
                    "Payment notification "
                    f"could not be delivered: {e}"
                )


            # ---------------------------------------------
            # Emit booking confirmation notification
            # ---------------------------------------------

            if booking_notification:

                try:

                    emit_notification(
                        booking_notification
                    )

                except Exception as e:

                    print(
                        "Booking confirmation "
                        f"notification could not "
                        f"be delivered: {e}"
                    )


            # ---------------------------------------------
            # Send payment success email
            # ---------------------------------------------

            try:

                send_payment_success_email(
                    user,
                    payment,
                    booking
                )

            except Exception as e:

                print(
                    "Payment success email "
                    f"could not be sent: {e}"
                )


            # ---------------------------------------------
            # Send booking confirmation email
            # ---------------------------------------------

            if booking.status == "confirmed":

                try:

                    send_booking_confirmed_email(
                        user,
                        booking
                    )

                except Exception as e:

                    print(
                        "Booking confirmation email "
                        f"could not be sent: {e}"
                    )


            return jsonify({

                "message":
                    "Payment processed successfully.",

                "payment_id":
                    payment.id,

                "status":
                    payment.status,

                "payment_method":
                    payment.payment_method,

                "amount":
                    float(payment.amount),

                "booking_status":
                    booking.status,

                "status_code":
                    "200"

            }), 200


    except requests.RequestException as e:

        db.session.rollback()

        print(
            f"Pesapal status request error: {e}"
        )

        # A server error allows Pesapal to retry.
        return jsonify({

            "message": (
                "Unable to verify payment "
                "with Pesapal."
            )

        }), 500


    except Exception as e:

        db.session.rollback()

        print(
            f"Pesapal IPN processing error: {e}"
        )

        return jsonify({

            "message": (
                "An error occurred while "
                "processing the payment."
            )

        }), 500



# =========================================================
# DIRECT PAYMENT VERIFICATION HELPERS
# =========================================================

def _get_direct_payment_for_authorized_user(
    payment_id,
    current_user_id
):
    """
    Find a direct payment and verify that the authenticated
    user is allowed to manage it.

    Admins can manage direct payments for any booking.

    Tour operators can only manage direct payments belonging
    to their own tours.
    """

    payment = (
        Payment.query
        .join(Booking)
        .join(Departure)
        .join(Tour)
        .filter(
            Payment.id == payment_id,
            Payment.payment_method.in_([
                "mpesa",
                "airtel_money"
            ])
        )
        .first()
    )


    if not payment:
        return None, None, (
            jsonify({
                "message": "Direct payment not found."
            }),
            404
        )


    current_user = User.query.get(
        current_user_id
    )


    if not current_user:
        return None, None, (
            jsonify({
                "message": "User not found."
            }),
            404
        )


    # Admins can manage any direct payment.
    if current_user.role == "admin":
        return payment, current_user, None


    # Tour operators can only manage payments for their
    # own tours.
    if current_user.role == "tour_operator":

        if (
            payment.booking.departure.tour.tour_operator_id
            != current_user_id
        ):

            return None, current_user, (
                jsonify({
                    "message": (
                        "You are not authorized to "
                        "manage this direct payment."
                    )
                }),
                403
            )

        return payment, current_user, None


    # This should normally be blocked by roles_required(),
    # but we keep the authorization check here as defense
    # in depth.
    return None, current_user, (
        jsonify({
            "message": "Access denied."
        }),
        403
    )


def _calculate_successful_booking_total(
    booking
):
    """
    Calculate the total amount successfully paid for
    a booking.
    """

    successful_payments = (
        Payment.query
        .filter_by(
            booking_id=booking.id,
            status="successful"
        )
        .all()
    )


    total_paid = Decimal(
        "0.00"
    )


    for successful_payment in successful_payments:

        total_paid += Decimal(
            str(successful_payment.amount)
        )


    return total_paid


def _serialize_direct_payment(
    payment
):
    """
    Convert a direct payment into a safe admin/operator
    response object.
    """

    booking = payment.booking
    departure = booking.departure
    tour = departure.tour
    customer = booking.user


    return {
        "payment_id": payment.id,

        "booking_id": booking.id,

        "customer": {
            "user_id": customer.id,
            "name": (
                f"{customer.first_name or ''} "
                f"{customer.last_name or ''}"
            ).strip(),
            "email": customer.email
        },

        "tour": {
            "tour_id": tour.id,
            "tour_name": tour.tour_name,
            "destination": tour.destination
        },

        "departure": {
            "departure_id": departure.id,
            "start_date": (
                departure.start_date.isoformat()
                if departure.start_date
                else None
            ),
            "end_date": (
                departure.end_date.isoformat()
                if departure.end_date
                else None
            )
        },

        "amount": float(
            payment.amount
        ),

        "payment_method":
            payment.payment_method,

        "status":
            payment.status,

        # This is the internal Thafari reference.
        # It is useful to admins/operators for auditing,
        # but was intentionally hidden from customers.
        "transaction_reference":
            payment.transaction_reference,

        "paid_at": (
            payment.paid_at.isoformat()
            if payment.paid_at
            else None
        ),

        "verified_by":
            payment.verified_by,

        "verified_at": (
            payment.verified_at.isoformat()
            if payment.verified_at
            else None
        ),

        "created_at": (
            payment.created_at.isoformat()
            if payment.created_at
            else None
        )
    }


# =========================================================
# GET DIRECT PAYMENTS FOR ADMIN / TOUR OPERATOR
# =========================================================
#
# GET /api/admin/direct-payments
#
# Optional:
#
#     ?status=pending
#
# Admins can see all direct payments.
#
# Tour operators only see direct payments belonging to
# their own tours.
# =========================================================

@payment_bp.route(
    "/admin/direct-payments",
    methods=["GET"]
)
@jwt_required()
@roles_required(
    "admin",
    "tour_operator"
)
def get_direct_payments():

    current_user_id = int(
        get_jwt_identity()
    )


    current_user = User.query.get(
        current_user_id
    )


    if not current_user:

        return jsonify({
            "message": "User not found."
        }), 404


    requested_status = request.args.get(
        "status",
        "pending"
    ).strip().lower()


    allowed_statuses = {
        "pending",
        "successful",
        "failed",
        "cancelled",
        "reversed"
    }


    if requested_status not in allowed_statuses:

        return jsonify({
            "message": (
                "Invalid status. Use pending, successful, "
                "failed, cancelled, or reversed."
            )
        }), 400


    query = (
        Payment.query
        .join(Booking)
        .join(Departure)
        .join(Tour)
        .filter(
            Payment.payment_method.in_([
                "mpesa",
                "airtel_money"
            ]),
            Payment.status == requested_status
        )
    )


    # Tour operators are restricted to their own tours.
    if current_user.role == "tour_operator":

        query = query.filter(
            Tour.tour_operator_id == current_user_id
        )


    payments = (
        query
        .order_by(
            Payment.created_at.desc()
        )
        .all()
    )


    payment_list = []


    for payment in payments:

        payment_list.append(
            _serialize_direct_payment(
                payment
            )
        )


    return jsonify({

        "message":
            "Direct payments retrieved successfully.",

        "status":
            requested_status,

        "count":
            len(payment_list),

        "payments":
            payment_list

    }), 200


# =========================================================
# GET ONE DIRECT PAYMENT
# =========================================================
#
# GET /api/admin/direct-payments/<payment_id>
#
# Returns the full details needed by the admin/operator
# Review panel.
#
# Admins can review any direct payment.
# Tour operators can only review payments belonging to
# their own tours.
# =========================================================

@payment_bp.route(
    "/admin/direct-payments/<int:payment_id>",
    methods=["GET"]
)
@jwt_required()
@roles_required(
    "admin",
    "tour_operator"
)
def get_direct_payment(
    payment_id
):

    current_user_id = int(
        get_jwt_identity()
    )

    current_user = User.query.get(
        current_user_id
    )

    if not current_user:

        return jsonify({
            "message": "User not found."
        }), 404

    payment = (
        Payment.query
        .filter(
            Payment.id == payment_id,
            Payment.payment_method.in_([
                "mpesa",
                "airtel_money"
            ])
        )
        .first()
    )

    if not payment:

        return jsonify({
            "message": "Direct payment not found."
        }), 404

    booking = payment.booking

    if not booking:

        return jsonify({
            "message": "Booking not found for this payment."
        }), 404

    departure = booking.departure

    if not departure:

        return jsonify({
            "message": "Departure not found for this booking."
        }), 404

    tour = departure.tour

    if not tour:

        return jsonify({
            "message": "Tour not found for this departure."
        }), 404

    if (
        current_user.role == "tour_operator"
        and tour.tour_operator_id != current_user_id
    ):

        return jsonify({
            "message": (
                "You are not authorized to view this "
                "direct payment."
            )
        }), 403

    customer = booking.user

    if not customer:

        return jsonify({
            "message": "Customer not found for this booking."
        }), 404

    successful_payments = (
        Payment.query
        .filter(
            Payment.booking_id == booking.id,
            Payment.status == "successful"
        )
        .all()
    )

    total_paid = Decimal("0.00")

    for successful_payment in successful_payments:

        total_paid += Decimal(
            str(successful_payment.amount)
        )

    booking_total = Decimal(
        str(booking.total_price)
    )

    remaining_balance = (
        booking_total - total_paid
    )

    if remaining_balance < Decimal("0.00"):

        remaining_balance = Decimal("0.00")

    return jsonify({

        "message":
            "Direct payment retrieved successfully.",

        "payment": {
            "payment_id": payment.id,
            "booking_id": payment.booking_id,
            "amount": float(payment.amount),
            "payment_method": payment.payment_method,
            "status": payment.status,
            "transaction_reference": payment.transaction_reference,
            "created_at": (
                payment.created_at.isoformat()
                if payment.created_at
                else None
            ),
            "paid_at": (
                payment.paid_at.isoformat()
                if payment.paid_at
                else None
            ),
            "verified_by": payment.verified_by,
            "verified_at": (
                payment.verified_at.isoformat()
                if payment.verified_at
                else None
            )
        },

        "customer": {
            "user_id": customer.id,
            "username": customer.username,
            "first_name": customer.first_name,
            "last_name": customer.last_name,
            "email": customer.email,
            "phone_number": customer.phone_number
        },

        "booking": {
            "booking_id": booking.id,
            "status": booking.status,
            "total_price": float(booking_total),
            "total_paid": float(total_paid),
            "remaining_balance": float(remaining_balance),
            "number_of_people": booking.number_of_people
        },

        "departure": {
            "departure_id": departure.id,
            "start_date": (
                departure.start_date.isoformat()
                if departure.start_date
                else None
            ),
            "end_date": (
                departure.end_date.isoformat()
                if departure.end_date
                else None
            )
        },

        "tour": {
            "tour_id": tour.id,
            "tour_name": tour.tour_name,
            "destination": tour.destination
        }

    }), 200


# =========================================================
# VERIFY DIRECT PAYMENT
# =========================================================
#
# PATCH /api/admin/direct-payments/<payment_id>/verify
#
# This is the manual verification action.
#
# The authorized admin/operator confirms that the real
# M-Pesa/Airtel payment was received.
# =========================================================

@payment_bp.route(
    "/admin/direct-payments/<int:payment_id>/verify",
    methods=["PATCH"]
)
@jwt_required()
@roles_required(
    "admin",
    "tour_operator"
)
def verify_direct_payment(
    payment_id
):

    current_user_id = int(
        get_jwt_identity()
    )


    payment, current_user, error_response = (
        _get_direct_payment_for_authorized_user(
            payment_id,
            current_user_id
        )
    )


    if error_response:
        return error_response


    # Only pending direct payments can be verified.
    if payment.status != "pending":

        if payment.status == "successful":

            return jsonify({
                "message": (
                    "This direct payment has "
                    "already been verified."
                ),
                "payment_id": payment.id,
                "status": payment.status,
                "booking_status":
                    payment.booking.status
            }), 200


        return jsonify({
            "message": (
                "Only pending direct payments "
                "can be verified."
            ),
            "payment_id": payment.id,
            "status": payment.status
        }), 400


    # -----------------------------------------------------
    # Get booking and customer
    # -----------------------------------------------------

    booking = payment.booking
    user = booking.user


    # -----------------------------------------------------
    # Booking expiry is no longer enforced here
    # -----------------------------------------------------

    # Thafari no longer uses an automatic payment window.
    # A pending booking can therefore remain pending until
    # the customer completes payment or the booking is
    # otherwise cancelled.
    #
    # We intentionally do not check booking.expires_at here.
    # This prevents a payment from being rejected because of
    # the old 25-minute expiry feature.


    # -----------------------------------------------------
    # Mark payment successful
    # -----------------------------------------------------

    payment.status = "successful"

    payment.paid_at = datetime.utcnow()

    payment.verified_by = current_user_id

    payment.verified_at = datetime.utcnow()


    # Make the successful payment visible to the
    # calculation below before committing.
    db.session.flush()


    # -----------------------------------------------------
    # Calculate total successfully paid
    # -----------------------------------------------------

    total_paid = (
        _calculate_successful_booking_total(
            booking
        )
    )


    booking_total = Decimal(
        str(booking.total_price)
    )


    previous_booking_status = (
        booking.status
    )


    # -----------------------------------------------------
    # Confirm booking if fully paid
    # -----------------------------------------------------

    if total_paid >= booking_total:

        booking.status = "confirmed"

    else:

        booking.status = "pending"


    # -----------------------------------------------------
    # Create payment notification
    # -----------------------------------------------------

    payment_notification = (
        create_notification(

            user_id=user.id,

            title="Payment Successful",

            message=(
                f"Your direct payment of KES "
                f"{payment.amount} for booking "
                f"#{booking.id} was verified "
                f"successfully."
            ),

            notification_type="payment",

            # Customer can open the payment result directly.
            link=f"/payment/result?booking_id={booking.id}"
        )
    )


    # -----------------------------------------------------
    # Create booking confirmation notification
    # -----------------------------------------------------

    booking_notification = None


    if (
        booking.status == "confirmed"
        and previous_booking_status
        != "confirmed"
    ):

        booking_notification = (
            create_notification(

                user_id=user.id,

                title="Booking Confirmed",

                message=(
                    f"Your booking #{booking.id} "
                    f"is fully paid and has been "
                    f"confirmed."
                ),

                notification_type="booking",

                # Customer can open the booking directly.
                link=f"/booking/view/{booking.id}"
            )
        )


    # -----------------------------------------------------
    # Commit payment + booking + notifications
    # -----------------------------------------------------

    try:

        db.session.commit()

    except Exception as e:

        db.session.rollback()

        print(
            f"Direct payment verification error: {e}"
        )

        return jsonify({
            "message": (
                "The direct payment could not "
                "be verified."
            )
        }), 500


    # -----------------------------------------------------
    # Emit payment notification
    # -----------------------------------------------------

    try:

        emit_notification(
            payment_notification
        )

    except Exception as e:

        print(
            "Direct payment notification "
            f"could not be delivered: {e}"
        )


    # -----------------------------------------------------
    # Emit booking confirmation notification
    # -----------------------------------------------------

    if booking_notification:

        try:

            emit_notification(
                booking_notification
            )

        except Exception as e:

            print(
                "Direct booking confirmation "
                f"notification could not be delivered: {e}"
            )


    # -----------------------------------------------------
    # Send payment success email
    # -----------------------------------------------------

    try:

        send_payment_success_email(
            user,
            payment,
            booking
        )

    except Exception as e:

        print(
            "Direct payment success email "
            f"could not be sent: {e}"
        )


    # -----------------------------------------------------
    # Send booking confirmation email
    # -----------------------------------------------------

    if booking.status == "confirmed":

        try:

            send_booking_confirmed_email(
                user,
                booking
            )

        except Exception as e:

            print(
                "Direct booking confirmation email "
                f"could not be sent: {e}"
            )


    return jsonify({

        "message":
            "Direct payment verified successfully.",

        "payment_id":
            payment.id,

        "payment_status":
            payment.status,

        "payment_method":
            payment.payment_method,

        "amount":
            float(payment.amount),

        "verified_by":
            current_user_id,

        "verified_at":
            payment.verified_at.isoformat(),

        "paid_at":
            payment.paid_at.isoformat(),

        "total_paid":
            float(total_paid),

        "booking_total":
            float(booking_total),

        "booking_status":
            booking.status

    }), 200


# =========================================================
# REJECT DIRECT PAYMENT
# =========================================================
#
# PATCH /api/admin/direct-payments/<payment_id>/reject
#
# This records that the submitted direct payment could
# not be verified.
# =========================================================

@payment_bp.route(
    "/admin/direct-payments/<int:payment_id>/reject",
    methods=["PATCH"]
)
@jwt_required()
@roles_required(
    "admin",
    "tour_operator"
)
def reject_direct_payment(
    payment_id
):

    current_user_id = int(
        get_jwt_identity()
    )


    payment, current_user, error_response = (
        _get_direct_payment_for_authorized_user(
            payment_id,
            current_user_id
        )
    )


    if error_response:
        return error_response


    # Only pending direct payments can be rejected.
    if payment.status != "pending":

        if payment.status == "failed":

            return jsonify({
                "message": (
                    "This direct payment has "
                    "already been rejected."
                ),
                "payment_id": payment.id,
                "status": payment.status
            }), 200


        return jsonify({
            "message": (
                "Only pending direct payments "
                "can be rejected."
            ),
            "payment_id": payment.id,
            "status": payment.status
        }), 400


    booking = payment.booking


    if not booking:

        return jsonify({
            "message": (
                "The booking associated with "
                "this payment was not found."
            )
        }), 404


    # -----------------------------------------------------
    # Reject payment
    # -----------------------------------------------------

    payment.status = "failed"

    payment.verified_by = current_user_id

    payment.verified_at = datetime.utcnow()

    # paid_at remains NULL because the payment was not
    # successfully verified.


    # -----------------------------------------------------
    # Save rejection FIRST
    # -----------------------------------------------------

    try:

        db.session.commit()

    except Exception as e:

        db.session.rollback()

        print(
            f"Direct payment rejection error: {e}"
        )

        return jsonify({
            "message": (
                "The direct payment could not "
                "be rejected."
            )
        }), 500


    # -----------------------------------------------------
    # Create customer rejection notification
    # -----------------------------------------------------

    rejection_notification = None


    try:

        rejection_notification = create_notification(

            user_id=booking.user_id,

            title="Payment Rejected",

            message=(
                f"Your direct payment of KES {payment.amount} "
                f"for booking #{booking.id} was rejected. "
                f"Please review your payment details and try again."
            ),

            notification_type="payment",

            link=f"/booking/view/{booking.id}"
        )


        db.session.commit()


    except Exception as e:

        db.session.rollback()

        print(
            "Direct payment rejection notification "
            f"error: {e}"
        )


    # -----------------------------------------------------
    # Emit customer rejection notification
    # -----------------------------------------------------

    if rejection_notification:

        try:

            emit_notification(
                rejection_notification
            )

        except Exception as e:

            print(
                "Direct payment rejection notification "
                f"could not be delivered: {e}"
            )


    return jsonify({

        "message":
            "Direct payment rejected successfully.",

        "payment_id":
            payment.id,

        "payment_status":
            payment.status,

        "verified_by":
            current_user_id,

        "verified_at":
            payment.verified_at.isoformat(),

        "booking_status":
            booking.status

    }), 200


# =========================================================
# PAYMENT HISTORY
# =========================================================

@payment_bp.route(
    "/booking/<int:booking_id>/payments",
    methods=["GET"]
)
@jwt_required()
@roles_required("customer")
def get_booking_payments(
    booking_id
):
    """
    Return payment history for a customer's booking.

    Customers can only view payment history for their own
    bookings.
    """

    # -----------------------------------------------------
    # Find booking
    # -----------------------------------------------------

    booking = Booking.query.get(
        booking_id
    )


    if not booking:

        return jsonify({

            "message":
                "Booking not found."

        }), 404


    # -----------------------------------------------------
    # Check ownership
    # -----------------------------------------------------

    current_user_id = int(
        get_jwt_identity()
    )


    if (
        booking.user_id
        != current_user_id
    ):

        return jsonify({

            "message": (
                "You are not authorized "
                "to view these payments."
            )

        }), 403


    # -----------------------------------------------------
    # Get payment history
    # -----------------------------------------------------

    payments = (
        Payment.query
        .filter_by(
            booking_id=booking_id
        )
        .order_by(
            Payment.created_at.desc()
        )
        .all()
    )


    payment_history = []


    for payment in payments:

        payment_history.append({

            "payment_id":
                payment.id,

            "status":
                payment.status,

            "transaction_reference":
                payment.transaction_reference,

            "amount":
                float(payment.amount),

            "payment_method":
                payment.payment_method,

            "paid_at": (
                payment.paid_at.isoformat()
                if payment.paid_at
                else None
            )
        })


    return jsonify({

        "booking_id":
            booking_id,

        "payments":
            payment_history

    }), 200