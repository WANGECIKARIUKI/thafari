from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.booking import Booking
from models.payment import Payment
from models.user import User
from decorators.auth_decorator import roles_required
from datetime import datetime
from extensions import db
from decimal import Decimal
import uuid
import requests
from services.email_service import (
    send_payment_success_email,
    send_booking_confirmed_email
)
from services.notification_service import(
    create_notification,
    emit_notification
)


# ---------------------------------------------------------
# PAYMENT BLUEPRINT
# ---------------------------------------------------------

payment_bp = Blueprint("payment", __name__, url_prefix="/api")


# ---------------------------------------------------------
# PESAPAL AUTHENTICATION
# ---------------------------------------------------------

def get_pesapal_token():
    """
    Request an authentication token from Pesapal.

    The token is required when communicating with the
    Pesapal API.
    """

    url = f"{current_app.config['PESAPAL_BASE_URL']}/api/Auth/RequestToken"

    payload = {
        "consumer_key": current_app.config["PESAPAL_CONSUMER_KEY"],
        "consumer_secret": current_app.config["PESAPAL_CONSUMER_SECRET"]
    }

    response = requests.post(url, json=payload, timeout=30)

    response.raise_for_status()

    result = response.json()

    # Pesapal returns the API token inside the response.
    return result["token"]


# ---------------------------------------------------------
# PESAPAL IPN REGISTRATION
# ---------------------------------------------------------

def register_pesapal_ipn():
    """
    Register Thafari's IPN endpoint with Pesapal.

    This is a setup/helper function rather than a public API
    endpoint. We do not expose this through a customer route.
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
        "url": current_app.config["PESAPAL_IPN_URL"],
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


# ---------------------------------------------------------
# SUBMIT ORDER TO PESAPAL
# ---------------------------------------------------------

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
        # Our unique reference for this payment.
        "id": transaction_reference,

        # Thafari currently processes payments in Kenyan Shillings.
        "currency": "KES",

        # Pesapal expects the amount as a number.
        "amount": float(amount),

        "description": description,

        # Pesapal redirects the customer here after checkout.
        "callback_url": current_app.config["PESAPAL_CALLBACK_URL"],

        # Pesapal uses this registered IPN ID to notify Thafari
        # when the payment status changes.
        "notification_id": current_app.config["PESAPAL_IPN_ID"],

        # Customer billing information.
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


# ---------------------------------------------------------
# GET PESAPAL TRANSACTION STATUS
# ---------------------------------------------------------

def get_pesapal_transaction_status(order_tracking_id):
    """
    Ask Pesapal for the authoritative status of a transaction.

    We do NOT trust the IPN notification alone to determine
    whether money was actually received.

    The IPN gives us the transaction ID, then we ask Pesapal
    for the real transaction status.
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


# ---------------------------------------------------------
# NORMALIZE PESAPAL PAYMENT METHODS
# ---------------------------------------------------------

def normalize_pesapal_payment_method(payment_method):
    """
    Convert Pesapal's payment method names into the values
    accepted by our Payment model.

    Pesapal may return slightly different labels, so we
    normalize them before saving them.
    """

    if not payment_method:
        return None

    method = payment_method.strip().lower()

    if method == "mpesa":
        return "mpesa"

    if method == "visa":
        return "visa"

    if method in ["mastercard", "master card"]:
        return "mastercard"

    if method == "amex":
        return "amex"

    if method in ["bank", "bank transfer", "bank_transfer"]:
        return "bank_transfer"

    # Unknown provider method.
    # We leave it as NULL rather than storing an invalid enum value.
    return None


# ---------------------------------------------------------
# CREATE PAYMENT
# ---------------------------------------------------------

@payment_bp.route("/payment", methods=["POST"])
@jwt_required()
@roles_required("customer")
def create_payment():
    """
    Create a pending payment for a customer's booking.

    The payment amount is calculated from the remaining booking
    balance rather than trusting an amount supplied by the client.
    """

    data = request.get_json(silent=True) or {}

    booking_id = data.get("booking_id")

    # -----------------------------------------------------
    # Validate booking ID
    # -----------------------------------------------------

    if booking_id is None:
        return jsonify({
            "message": "booking_id is required."
        }), 400

    try:
        booking_id = int(booking_id)
    except (TypeError, ValueError):
        return jsonify({
            "message": "booking_id must be a valid integer."
        }), 400

    if booking_id <= 0:
        return jsonify({
            "message": "booking_id must be greater than zero."
        }), 400

    # -----------------------------------------------------
    # Get the authenticated customer
    # -----------------------------------------------------

    current_user_id = int(get_jwt_identity())

    current_user = User.query.get(current_user_id)

    if not current_user:
        return jsonify({
            "message": "User not found."
        }), 404

    # -----------------------------------------------------
    # Find the booking
    # -----------------------------------------------------

    booking = Booking.query.get(booking_id)

    if not booking:
        return jsonify({
            "message": "Booking not found."
        }), 404

    # Customers can only make payments for their own bookings.
    if booking.user_id != current_user_id:
        return jsonify({
            "message": "You are not authorized to pay for this booking."
        }), 403

    # -----------------------------------------------------
    # Check booking status
    # -----------------------------------------------------

    if booking.status != "pending":
        return jsonify({
            "message": "Only pending bookings can receive payments."
        }), 400

    # -----------------------------------------------------
    # Calculate how much has already been successfully paid
    # -----------------------------------------------------

    successful_payments = Payment.query.filter_by(
        booking_id=booking.id,
        status="successful"
    ).all()

    total_paid = Decimal("0.00")

    for payment in successful_payments:
        total_paid += Decimal(str(payment.amount))

    # -----------------------------------------------------
    # Calculate the remaining booking balance
    # -----------------------------------------------------

    booking_total = Decimal(str(booking.total_price))

    remaining_balance = booking_total - total_paid

    # A booking with no remaining balance should not create
    # another payment.
    if remaining_balance <= Decimal("0.00"):
        return jsonify({
            "message": "This booking has already been fully paid."
        }), 400

    # -----------------------------------------------------
    # Generate our unique payment reference
    # -----------------------------------------------------

    transaction_reference = str(uuid.uuid4())

    # -----------------------------------------------------
    # Create the local payment record
    # -----------------------------------------------------

    payment = Payment(
        booking_id=booking.id,

        # We initially do not know the payment method because
        # the customer selects it during the Pesapal checkout.
        payment_method=None,

        # Payment starts as pending until Pesapal confirms it.
        status="pending",

        # The amount comes from our database calculation,
        # NOT from the client.
        amount=remaining_balance,

        # This reference connects the Thafari payment to the
        # Pesapal merchant reference.
        transaction_reference=transaction_reference
    )

    db.session.add(payment)

    # Flush gives us the payment ID without permanently
    # committing the transaction yet.
    db.session.flush()

    # -----------------------------------------------------
    # Prepare customer billing information for Pesapal
    # -----------------------------------------------------

    billing_address = {
        "email_address": current_user.email,
        "phone_number": current_user.phone_number,
        "country_code": "KE",
        "first_name": current_user.first_name,
        "last_name": current_user.last_name,
        "line_1": "",
        "line_2": "",
        "city": "",
        "state": "",
        "postal_code": "",
        "zip_code": ""
    }

    # -----------------------------------------------------
    # Submit the order to Pesapal
    # -----------------------------------------------------

    try:
        pesapal_response = submit_pesapal_order(
            transaction_reference=transaction_reference,
            amount=remaining_balance,
            description=f"Thafari booking payment #{booking.id}",
            billing_address=billing_address
        )

        # Pesapal returns a status code in the response.
        response_status = str(
            pesapal_response.get("status")
        )

        if response_status != "200":
            db.session.rollback()

            return jsonify({
                "message": "Pesapal could not create the payment session.",
                "pesapal_response": pesapal_response
            }), 502

        # Pesapal assigns its own tracking ID.
        order_tracking_id = pesapal_response.get(
            "order_tracking_id"
        )

        redirect_url = pesapal_response.get(
            "redirect_url"
        )

        if not order_tracking_id or not redirect_url:
            db.session.rollback()

            return jsonify({
                "message": "Pesapal returned an incomplete payment response."
            }), 502

        # Save Pesapal's tracking ID so that future IPN
        # notifications can locate this payment.
        payment.pesapal_order_tracking_id = order_tracking_id

        # Only now do we permanently save our local payment.
        db.session.commit()

        return jsonify({
            "message": "Payment created successfully.",
            "payment_id": payment.id,
            "transaction_reference": payment.transaction_reference,
            "pesapal_order_tracking_id": payment.pesapal_order_tracking_id,
            "amount": float(payment.amount),
            "status": payment.status,
            "redirect_url": redirect_url
        }), 201

    except requests.RequestException as e:
        # If Pesapal cannot be reached, do not leave behind
        # a payment record that was never submitted successfully.
        db.session.rollback()

        print(f"Pesapal request error: {e}")

        return jsonify({
            "message": "Unable to connect to the payment provider."
        }), 502

    except Exception as e:
        db.session.rollback()

        print(f"Payment creation error: {e}")

        return jsonify({
            "message": "An error occurred while creating the payment."
        }), 500


# ---------------------------------------------------------
# PESAPAL CUSTOMER CALLBACK
# ---------------------------------------------------------

@payment_bp.route("/payment/pesapal/callback", methods=["GET"])
def pesapal_callback():
    """
    Receive the customer redirect after Pesapal checkout.

    IMPORTANT:
    This endpoint does not mark a payment as successful.

    Pesapal's IPN + transaction-status API remain the source
    of truth for payment confirmation.
    """

    order_tracking_id = request.args.get("OrderTrackingId")
    merchant_reference = request.args.get(
        "OrderMerchantReference"
    )

    return jsonify({
        "message": "Pesapal callback received.",
        "order_tracking_id": order_tracking_id,
        "merchant_reference": merchant_reference
    }), 200


# ---------------------------------------------------------
# PESAPAL IPN
# ---------------------------------------------------------

@payment_bp.route("/payment/pesapal/ipn", methods=["POST"])
def pesapal_ipn():
    """
    Receive payment notifications from Pesapal.

    Flow:

    1. Pesapal sends the order tracking ID.
    2. We locate the local Payment.
    3. We verify the merchant reference.
    4. We ask Pesapal for the authoritative transaction status.
    5. We validate amount and currency.
    6. We update the local payment.
    7. We update the booking if fully paid.

    This endpoint is also designed to be idempotent because
    payment providers may send the same notification more than once.
    """

    data = request.get_json(silent=True) or {}

    order_tracking_id = data.get("OrderTrackingId")
    merchant_reference = data.get("OrderMerchantReference")

    # -----------------------------------------------------
    # Validate IPN payload
    # -----------------------------------------------------

    if not order_tracking_id or not merchant_reference:
        return jsonify({
            "message": "OrderTrackingId and OrderMerchantReference are required.",
            "status": "400"
        }), 400

    try:

        # -------------------------------------------------
        # Lock the payment row while processing it.
        # This helps prevent concurrent updates from creating
        # inconsistent payment states.
        # -------------------------------------------------

        payment = (
            Payment.query
            .filter_by(
                pesapal_order_tracking_id=order_tracking_id
            )
            .with_for_update()
            .first()
        )

        if not payment:
            return jsonify({
                "message": "Payment not found.",
                "status": "404"
            }), 404

        # -------------------------------------------------
        # Make sure the Pesapal merchant reference belongs
        # to the payment we found.
        # -------------------------------------------------

        if payment.transaction_reference != merchant_reference:
            return jsonify({
                "message": "Merchant reference does not match the payment.",
                "status": "400"
            }), 400

        # -------------------------------------------------
        # Ask Pesapal for the authoritative transaction status.
        # -------------------------------------------------

        pesapal_result = get_pesapal_transaction_status(
            order_tracking_id
        )

        raw_status_code = pesapal_result.get("status_code")

        try:
            status_code = int(raw_status_code)
        except (TypeError, ValueError):
            status_code = None

        # -------------------------------------------------
        # Pending payment
        # -------------------------------------------------

        if status_code == 0:

            payment.status = "pending"

            db.session.commit()

            return jsonify({
                "message": "Payment is still pending.",
                "status": "200"
            }), 200

        # -------------------------------------------------
        # Failed payment
        # -------------------------------------------------

        if status_code == 2:

            payment.status = "failed"

            db.session.commit()

            return jsonify({
                "message": "Payment failed.",
                "status": "200"
            }), 200

        # -------------------------------------------------
        # Reversed payment
        # -------------------------------------------------

        if status_code == 3:

            payment.status = "reversed"

            db.session.commit()

            return jsonify({
                "message": "Payment was reversed.",
                "status": "200"
            }), 200

        # -------------------------------------------------
        # Successful payment
        # -------------------------------------------------

                # -------------------------------------------------
        # Successful payment
        # -------------------------------------------------

        if status_code == 1:

            # ---------------------------------------------
            # Validate amount returned by Pesapal.
            # ---------------------------------------------

            pesapal_amount = Decimal(
                str(pesapal_result.get("amount"))
            )

            local_amount = Decimal(
                str(payment.amount)
            )

            if pesapal_amount != local_amount:
                return jsonify({
                    "message": "Payment amount does not match.",
                    "status": "400"
                }), 400

            # ---------------------------------------------
            # Validate currency.
            # ---------------------------------------------

            pesapal_currency = pesapal_result.get("currency")

            if pesapal_currency != "KES":
                return jsonify({
                    "message": "Unsupported payment currency.",
                    "status": "400"
                }), 400

            # ---------------------------------------------
            # Validate merchant reference returned by Pesapal.
            # ---------------------------------------------

            pesapal_merchant_reference = (
                pesapal_result.get("merchant_reference")
            )

            if pesapal_merchant_reference != payment.transaction_reference:
                return jsonify({
                    "message": "Pesapal merchant reference does not match.",
                    "status": "400"
                }), 400

            # ---------------------------------------------
            # Idempotency check.
            #
            # If Pesapal sends the same successful notification
            # again, do not process the payment a second time.
            # ---------------------------------------------

            if payment.status == "successful":

                db.session.commit()

                return jsonify({
                    "message": "Payment was already processed.",
                    "status": "successful"
                }), 200

            # ---------------------------------------------
            # Save the payment method selected at Pesapal.
            # ---------------------------------------------

            payment.payment_method = normalize_pesapal_payment_method(
                pesapal_result.get("payment_method")
            )

            # ---------------------------------------------
            # Save Pesapal's confirmation code.
            # ---------------------------------------------

            payment.pesapal_confirmation_code = (
                pesapal_result.get("confirmation_code")
            )

            # ---------------------------------------------
            # Mark the local payment as successful.
            # ---------------------------------------------

            payment.status = "successful"
            payment.paid_at = datetime.utcnow()

            # Flush the payment update before calculating
            # the total successful payments.
            db.session.flush()

            # ---------------------------------------------
            # Get the booking and its owner.
            # ---------------------------------------------

            booking = payment.booking
            user = booking.user

            # ---------------------------------------------
            # Calculate total successful payments for this
            # booking.
            # ---------------------------------------------

            successful_payments = (
                Payment.query
                .filter_by(
                    booking_id=booking.id,
                    status="successful"
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

            # Keep track of the booking status before updating it.
            # This allows us to know whether this payment caused
            # the booking to become confirmed.
            previous_booking_status = booking.status

            # ---------------------------------------------
            # Update booking payment status.
            # ---------------------------------------------

            if total_paid >= booking_total:

                booking.status = "confirmed"

            else:

                # Partial payment means the booking remains pending.
                booking.status = "pending"

            # ---------------------------------------------
            # Create payment-success notification.
            #
            # IMPORTANT:
            # create_notification() does NOT commit.
            #
            # Therefore this notification is part of the same
            # database transaction as the payment update.
            # ---------------------------------------------

            payment_notification = create_notification(
                user_id=user.id,
                title="Payment Successful",
                message=(
                    f"Your payment of KES {payment.amount} "
                    f"for booking #{booking.id} was received successfully."
                ),
                notification_type="payment"
            )

            # ---------------------------------------------
            # Create booking-confirmed notification only if
            # this payment caused the booking to become fully
            # paid and confirmed.
            # ---------------------------------------------

            booking_notification = None

            if (
                booking.status == "confirmed"
                and previous_booking_status != "confirmed"
            ):

                booking_notification = create_notification(
                    user_id=user.id,
                    title="Booking Confirmed",
                    message=(
                        f"Your booking #{booking.id} is fully paid "
                        f"and has been confirmed."
                    ),
                    notification_type="booking"
                )

            # ---------------------------------------------
            # Commit EVERYTHING together:
            #
            # - payment update
            # - booking update
            # - payment notification
            # - booking notification (if applicable)
            #
            # If the commit fails, the database transaction is
            # rolled back and no notification is emitted.
            # ---------------------------------------------

            db.session.commit()

            # -------------------------------------------------
            # EMIT PAYMENT NOTIFICATION AFTER COMMIT
            # -------------------------------------------------

            try:

                emit_notification(payment_notification)

            except Exception as e:

                # The payment and notification already exist in
                # the database. A Socket.IO delivery failure must
                # not undo the successful payment.
                print(
                    f"Payment notification could not be delivered: {e}"
                )

            # -------------------------------------------------
            # EMIT BOOKING CONFIRMATION NOTIFICATION
            # AFTER COMMIT
            # -------------------------------------------------

            if booking_notification:

                try:

                    emit_notification(booking_notification)

                except Exception as e:

                    print(
                        f"Booking confirmation notification "
                        f"could not be delivered: {e}"
                    )

            # -------------------------------------------------
            # SEND PAYMENT SUCCESS EMAIL
            # -------------------------------------------------

            try:

                send_payment_success_email(
                    user,
                    payment,
                    booking
                )

            except Exception as e:

                # Payment has already been committed successfully.
                # Email failure must not reverse the payment.
                print(
                    f"Payment success email could not be sent: {e}"
                )

            # -------------------------------------------------
            # SEND BOOKING CONFIRMATION EMAIL
            # ONLY IF THE BOOKING IS FULLY PAID.
            # -------------------------------------------------

            if booking.status == "confirmed":

                try:

                    send_booking_confirmed_email(
                        user,
                        booking
                    )

                except Exception as e:

                    # Booking remains confirmed even if the
                    # confirmation email cannot be delivered.
                    print(
                        f"Booking confirmation email could not "
                        f"be sent: {e}"
                    )

            return jsonify({
                "message": "Payment processed successfully.",
                "payment_id": payment.id,
                "status": payment.status,
                "payment_method": payment.payment_method,
                "amount": float(payment.amount),
                "booking_status": booking.status,
                "status_code": "200"
            }), 200

    except requests.RequestException as e:

        db.session.rollback()

        print(f"Pesapal status request error: {e}")

        # Returning a server error allows Pesapal to retry
        # the notification later.
        return jsonify({
            "message": "Unable to verify payment with Pesapal."
        }), 500

    except Exception as e:

        db.session.rollback()

        print(f"Pesapal IPN processing error: {e}")

        return jsonify({
            "message": "An error occurred while processing the payment."
        }), 500


# ---------------------------------------------------------
# PAYMENT HISTORY
# ---------------------------------------------------------

@payment_bp.route(
    "/booking/<int:booking_id>/payments",
    methods=["GET"]
)
@jwt_required()
@roles_required("customer")
def get_booking_payments(booking_id):
    """
    Return payment history for a customer's booking.

    Customers can only view payment history for their own
    bookings.
    """

    # -----------------------------------------------------
    # Find the booking
    # -----------------------------------------------------

    booking = Booking.query.get(booking_id)

    if not booking:
        return jsonify({
            "message": "Booking not found."
        }), 404

    # -----------------------------------------------------
    # Check ownership
    # -----------------------------------------------------

    current_user_id = int(get_jwt_identity())

    if booking.user_id != current_user_id:
        return jsonify({
            "message": "You are not authorized to view these payments."
        }), 403

    # -----------------------------------------------------
    # Get all payments associated with the booking
    # -----------------------------------------------------

    payments = Payment.query.filter_by(
        booking_id=booking_id
    ).order_by(
        Payment.created_at.desc()
    ).all()

    payment_history = []

    for payment in payments:

        payment_history.append({
            "payment_id": payment.id,
            "status": payment.status,
            "transaction_reference": payment.transaction_reference,
            "amount": float(payment.amount),
            "payment_method": payment.payment_method,
            "paid_at": (
                payment.paid_at.isoformat()
                if payment.paid_at
                else None
            )
        })

    return jsonify({
        "booking_id": booking_id,
        "payments": payment_history
    }), 200