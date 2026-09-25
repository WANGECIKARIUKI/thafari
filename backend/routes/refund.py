from flask import Blueprint, jsonify, request, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from decorators.auth_decorator import roles_required
from decimal import Decimal, InvalidOperation
from models.refund import Refund
from models.payment import Payment
from models.user import User
from datetime import datetime
from extensions import db
import uuid
import hmac
import hashlib

from services.email_service import send_refund_success_email
from services.notification_service import (
    create_notification,
    emit_notification
)


# =========================================================
# REFUND BLUEPRINT
# =========================================================

refund_bp = Blueprint(
    "refunds",
    __name__,
    url_prefix="/api"
)


# =========================================================
# CREATE REFUND REQUEST
# =========================================================

@refund_bp.route(
    "/payment/<int:payment_id>/refund",
    methods=["POST"]
)
@jwt_required()
@roles_required("customer")
def create_refund(payment_id):
    """
    Create a refund request for a successful payment.

    IMPORTANT CONCURRENCY PROTECTION:

    The payment row is locked using SELECT ... FOR UPDATE
    before we calculate the refundable balance.

    This prevents two refund requests for the same payment
    from calculating the same available balance at the
    same time.

    Example:

        Payment = KES 10,000

        Request A locks payment
        Request B must wait

        Request A checks balance
        Request A creates refund
        Request A commits

        Request B continues and sees the latest state.

    This prevents concurrent refund requests from bypassing
    the refundable balance checks.
    """

    data = request.get_json(silent=True)

    # -----------------------------------------------------
    # Validate request body
    # -----------------------------------------------------

    if not data:
        return jsonify({
            "message": "Request body is required."
        }), 400

    refund_amount = data.get("amount")

    if refund_amount is None:
        return jsonify({
            "message": "Refund amount is required."
        }), 400

    # -----------------------------------------------------
    # Convert refund amount to Decimal
    # -----------------------------------------------------

    try:
        refund_amount = Decimal(
            str(refund_amount)
        )

    except InvalidOperation:
        return jsonify({
            "message": "Amount should be a valid number."
        }), 400

    # -----------------------------------------------------
    # Refund amount must be greater than zero
    # -----------------------------------------------------

    if refund_amount <= 0:
        return jsonify({
            "message": "Refund amount should be greater than 0."
        }), 400

    # -----------------------------------------------------
    # Only allow two decimal places
    # -----------------------------------------------------

    if refund_amount.as_tuple().exponent < -2:
        return jsonify({
            "message": (
                "Refund amount should have only two "
                "decimal places."
            )
        }), 400

    # -----------------------------------------------------
    # Get authenticated customer
    # -----------------------------------------------------

    current_user_id = int(
        get_jwt_identity()
    )

    # =====================================================
    # LOCK THE PAYMENT ROW
    # =====================================================
    #
    # with_for_update() translates to a database row-level
    # lock such as:
    #
    # SELECT ... FOR UPDATE
    #
    # While this transaction is active, another transaction
    # trying to lock the same payment must wait.
    #
    # This is critical because the refundable balance is
    # calculated below.
    # =====================================================

    payment = (
        Payment.query
        .filter_by(id=payment_id)
        .with_for_update()
        .first()
    )

    if not payment:
        return jsonify({
            "message": "Payment not found."
        }), 404

    # -----------------------------------------------------
    # Only successful payments can be refunded
    # -----------------------------------------------------

    if payment.status != "successful":
        return jsonify({
            "message": (
                "Only successful payments can be refunded."
            ),
            "status": payment.status
        }), 400

    # -----------------------------------------------------
    # Make sure the payment belongs to the customer
    # -----------------------------------------------------

    if payment.booking.user_id != current_user_id:
        return jsonify({
            "message": "Access denied."
        }), 403

    # =====================================================
    # CHECK FOR EXISTING PENDING REFUND
    # =====================================================
    #
    # IMPORTANT:
    # This check happens while the payment row is locked.
    #
    # Therefore another refund request for this same payment
    # cannot pass this check simultaneously.
    # =====================================================

    pending_refund = Refund.query.filter(
        Refund.payment_id == payment.id,
        Refund.status == "pending"
    ).first()

    if pending_refund:
        return jsonify({
            "message": (
                "Refund process is still pending. "
                "Please wait for the status to change."
            ),
            "status": pending_refund.status
        }), 400

    # =====================================================
    # GET SUCCESSFUL REFUNDS
    # =====================================================

    successful_refunds = Refund.query.filter(
        Refund.payment_id == payment.id,
        Refund.status == "successful"
    ).all()

    # -----------------------------------------------------
    # Calculate total already refunded
    # -----------------------------------------------------

    total_refunded = Decimal("0.00")

    for successful_refund in successful_refunds:
        total_refunded += Decimal(
            str(successful_refund.amount)
        )

    # =====================================================
    # CALCULATE REMAINING REFUNDABLE BALANCE
    # =====================================================

    refundable_amount = (
        Decimal(str(payment.amount))
        - total_refunded
    )

    # -----------------------------------------------------
    # Prevent refunding more than the remaining balance
    # -----------------------------------------------------

    if refund_amount > refundable_amount:
        return jsonify({
            "message": "Please put the correct amount.",
            "refundable_amount": refundable_amount
        }), 400

    # =====================================================
    # GENERATE UNIQUE REFUND REFERENCE
    # =====================================================

    refund_reference = str(
        uuid.uuid4()
    )

    # =====================================================
    # CREATE REFUND RECORD
    # =====================================================

    refund = Refund(
        payment_id=payment.id,
        amount=refund_amount,
        status="pending",
        refund_reference=refund_reference,
        refunded_at=None
    )

    db.session.add(refund)

    # =====================================================
    # COMMIT REFUND REQUEST
    # =====================================================
    #
    # The payment row remains locked until this transaction
    # commits or rolls back.
    #
    # Once committed, another waiting request can continue
    # and will see the newly-created pending refund.
    # =====================================================

    try:
        db.session.commit()

    except Exception as e:

        db.session.rollback()

        print(
            f"Refund creation error: {e}"
        )

        return jsonify({
            "message": (
                "Refund process could not be completed."
            )
        }), 500

    return jsonify({
        "message": "Refund created successfully.",
        "id": refund.id,
        "amount": float(refund.amount),
        "status": refund.status,
        "refund_reference": refund.refund_reference
    }), 201


# =========================================================
# REFUND WEBHOOK
# =========================================================

@refund_bp.route(
    "/webhook/refund",
    methods=["POST"]
)
def create_webhook():
    """
    Process refund status notifications from the payment
    provider.

    IMPORTANT CONCURRENCY PROTECTION:

    We lock the Payment row before changing the refund's
    financial state.

    Refund creation also locks Payment first.

    Therefore both financial operations use the same lock
    order:

        Payment → Refund

    This helps reduce the possibility of deadlocks.
    """

    # -----------------------------------------------------
    # Get webhook payload
    # -----------------------------------------------------

    data = request.get_json(silent=True)

    if not data:
        return jsonify({
            "message": "Request body is required."
        }), 400

    refund_reference = data.get(
        "refund_reference"
    )

    amount = data.get(
        "amount"
    )

    status = data.get(
        "status"
    )

    # -----------------------------------------------------
    # Validate refund reference
    # -----------------------------------------------------

    if (
        not isinstance(refund_reference, str)
        or not refund_reference.strip()
    ):
        return jsonify({
            "message": "Refund reference is required."
        }), 400

    # -----------------------------------------------------
    # Validate amount exists
    # -----------------------------------------------------

    if amount is None:
        return jsonify({
            "message": "Amount is required."
        }), 400

    # -----------------------------------------------------
    # Convert amount to Decimal
    # -----------------------------------------------------

    try:
        amount = Decimal(
            str(amount)
        )

    except InvalidOperation:
        return jsonify({
            "message": "Amount should be valid."
        }), 400

    # -----------------------------------------------------
    # Amount must be greater than zero
    # -----------------------------------------------------

    if amount <= 0:
        return jsonify({
            "message": (
                "Amount should be greater than 0."
            )
        }), 400

    # -----------------------------------------------------
    # Only allow two decimal places
    # -----------------------------------------------------

    if amount.as_tuple().exponent < -2:
        return jsonify({
            "message": (
                "The number of decimal places "
                "should be 2."
            )
        }), 400

    # -----------------------------------------------------
    # Validate refund status
    # -----------------------------------------------------

    allowed_status = [
        "successful",
        "failed"
    ]

    if status not in allowed_status:
        return jsonify({
            "message": (
                "Only mentioned statuses allowed."
            )
        }), 400

    # -----------------------------------------------------
    # Get webhook signature
    # -----------------------------------------------------

    signature = request.headers.get(
        "X-Webhook-Signature"
    )

    if not signature:
        return jsonify({
            "message": (
                "Webhook signature is required."
            )
        }), 401

    # -----------------------------------------------------
    # Get webhook secret
    # -----------------------------------------------------

    webhook_secret = current_app.config[
        "WEBHOOK_SECRET"
    ]

    # -----------------------------------------------------
    # Recreate the payload used to generate the HMAC
    # signature.
    # -----------------------------------------------------

    payload = (
        f"{refund_reference}|"
        f"{amount:.2f}|"
        f"{status}"
    )

    # -----------------------------------------------------
    # Generate expected HMAC signature
    # -----------------------------------------------------

    expected_signature = hmac.new(
        webhook_secret.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()

    # -----------------------------------------------------
    # Compare signatures securely
    # -----------------------------------------------------

    if not hmac.compare_digest(
        signature,
        expected_signature
    ):
        return jsonify({
            "message": (
                "Invalid Webhook signature."
            )
        }), 401

    # =====================================================
    # FIND REFUND FIRST
    # =====================================================
    #
    # We need the refund reference to identify the payment
    # that needs to be locked.
    #
    # We do NOT change the refund yet.
    # =====================================================

    refund = Refund.query.filter_by(
        refund_reference=refund_reference
    ).first()

    if not refund:
        return jsonify({
            "message": "Refund not found."
        }), 404

    # -----------------------------------------------------
    # Verify refund amount
    # -----------------------------------------------------

    if amount != Decimal(
        str(refund.amount)
    ):
        return jsonify({
            "message": (
                "Refund amount does not match."
            ),
            "refund_amount": amount
        }), 400

    # =====================================================
    # LOCK THE PAYMENT
    # =====================================================
    #
    # We lock the payment before changing the refund.
    #
    # This is the same lock order used by create_refund():
    #
    #     Payment → Refund
    #
    # This protects financial calculations involving the
    # payment and its refunds.
    # =====================================================

    payment = (
        Payment.query
        .filter_by(id=refund.payment_id)
        .with_for_update()
        .first()
    )

    if not payment:
        return jsonify({
            "message": "Payment not found."
        }), 404

    # =====================================================
    # RELOAD REFUND AFTER PAYMENT LOCK
    # =====================================================
    #
    # Refresh the refund state inside the same transaction.
    # This makes the current database state explicit before
    # applying the webhook.
    # =====================================================

    refund = Refund.query.filter_by(
        id=refund.id
    ).first()

    if not refund:
        return jsonify({
            "message": "Refund not found."
        }), 404

    # =====================================================
    # IDEMPOTENCY CHECK
    # =====================================================
    #
    # If another webhook already processed this refund,
    # do nothing.
    # =====================================================

    if refund.status == "successful":
        db.session.commit()

        return jsonify({
            "message": "Refund already processed.",
            "status": refund.status
        }), 200

    if refund.status == "failed":
        db.session.commit()

        return jsonify({
            "message": "Refund already failed.",
            "status": refund.status
        }), 200

    # =====================================================
    # SUCCESSFUL REFUND
    # =====================================================

    if status == "successful":

        # -------------------------------------------------
        # Mark refund as successful
        # -------------------------------------------------

        refund.status = "successful"

        refund.refunded_at = datetime.utcnow()

        # -------------------------------------------------
        # Flush so this refund becomes visible to queries
        # inside this transaction.
        # -------------------------------------------------

        db.session.flush()

        # =================================================
        # GET BOOKING
        # =================================================

        booking = payment.booking

        # -------------------------------------------------
        # Get the customer who owns the booking
        # -------------------------------------------------

        user = User.query.filter_by(
            id=booking.user_id
        ).first()

        # =================================================
        # GET SUCCESSFUL PAYMENTS FOR THIS BOOKING
        # =================================================

        successful_payments = Payment.query.filter(
            Payment.booking_id == booking.id,
            Payment.status == "successful"
        ).all()

        # -------------------------------------------------
        # Calculate total successful payments
        # -------------------------------------------------

        total_successful_paid = Decimal(
            "0.00"
        )

        for successful_payment in successful_payments:
            total_successful_paid += Decimal(
                str(successful_payment.amount)
            )

        # =================================================
        # GET SUCCESSFUL REFUNDS FOR THIS BOOKING
        # =================================================

        successful_refunds = Refund.query.join(
            Payment
        ).filter(
            Payment.booking_id == booking.id,
            Refund.status == "successful"
        ).all()

        # -------------------------------------------------
        # Calculate total refunded
        # -------------------------------------------------

        total_refunded = Decimal(
            "0.00"
        )

        for successful_refund in successful_refunds:
            total_refunded += Decimal(
                str(successful_refund.amount)
            )

        # =================================================
        # UPDATE BOOKING STATUS
        # =================================================
        #
        # If all successful payments have been refunded,
        # cancel the booking.
        #
        # If only part of the money has been refunded,
        # keep the booking pending.
        # =================================================

        if total_refunded >= total_successful_paid:
            booking.status = "cancelled"
        else:
            booking.status = "pending"

        # =================================================
        # CREATE REFUND NOTIFICATION
        # =================================================

        refund_notification = None

        if user:

            refund_notification = create_notification(
                user_id=user.id,
                title="Refund Successful",
                message=(
                    f"Your refund of KES "
                    f"{refund.amount} for booking "
                    f"#{booking.id} has been successfully "
                    f"processed."
                ),
                notification_type="refund"
            )

        # =================================================
        # COMMIT FINANCIAL TRANSACTION
        # =================================================
        #
        # This commits:
        #
        # - refund status
        # - refund timestamp
        # - booking status
        # - notification
        #
        # The payment lock is released after commit.
        # =================================================

        try:

            db.session.commit()

        except Exception as e:

            db.session.rollback()

            print(
                f"Refund webhook error: {e}"
            )

            return jsonify({
                "message": (
                    "Refund process could not "
                    "be completed."
                )
            }), 500

        # =================================================
        # EMIT NOTIFICATION AFTER COMMIT
        # =================================================

        if refund_notification:

            try:

                emit_notification(
                    refund_notification
                )

            except Exception as e:

                # The financial transaction already succeeded.
                # Socket.IO failure must not reverse it.
                print(
                    "Refund notification could not "
                    f"be delivered: {e}"
                )

        # =================================================
        # SEND REFUND SUCCESS EMAIL
        # =================================================

        if user:

            try:

                send_refund_success_email(
                    user=user,
                    refund=refund,
                    payment=payment
                )

            except Exception as e:

                # Email failure must not reverse the refund.
                print(
                    "Refund success email could not "
                    f"be sent: {e}"
                )

        return jsonify({
            "message": "Refund has been confirmed.",
            "refund_id": refund.id,
            "refund_status": refund.status,
            "refund_amount": float(
                refund.amount
            ),
            "total_refunded": float(
                total_refunded
            ),
            "booking_status": booking.status,
            "refunded_at": (
                refund.refunded_at.isoformat()
            )
        }), 200

    # =====================================================
    # FAILED REFUND
    # =====================================================

    else:

        # -------------------------------------------------
        # Mark refund as failed
        # -------------------------------------------------

        refund.status = "failed"

        # -------------------------------------------------
        # Save failed refund
        # -------------------------------------------------

        try:

            db.session.commit()

        except Exception as e:

            db.session.rollback()

            print(
                f"Failed refund webhook error: {e}"
            )

            return jsonify({
                "message": (
                    "Refund processing could "
                    "not be completed."
                )
            }), 500

        return jsonify({
            "message": "Refund failed.",
            "refund_id": refund.id,
            "refund_status": refund.status
        }), 200