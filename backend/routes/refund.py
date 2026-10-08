from flask import Blueprint, jsonify, request, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from decorators.auth_decorator import roles_required
from decimal import Decimal, InvalidOperation
from models.refund import Refund
from models.payment import Payment
from models.user import User
from models.booking import Booking
from models.departure import Departure
from models.tour import Tour
from models.cancellation_request import CancellationRequest
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
# GET CANCELLATION REQUESTS
# =========================================================
#
# GET /api/admin/cancellation-requests?status=pending
#
# Admins can see all cancellation requests.
# Tour operators only see requests belonging to their own
# tours.
#
# Supported statuses:
#     pending
#     approved
#     denied
# =========================================================

@refund_bp.route(
    "/admin/cancellation-requests",
    methods=["GET"]
)
@jwt_required()
@roles_required(
    "admin",
    "tour_operator"
)
def get_cancellation_requests():

    current_user_id = int(
        get_jwt_identity()
    )

    current_user = User.query.filter_by(
        id=current_user_id
    ).first()

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
        "approved",
        "denied"
    }

    if requested_status not in allowed_statuses:
        return jsonify({
            "message": (
                "Invalid status. Use pending, approved, or denied."
            )
        }), 400

    query = (
        CancellationRequest.query
        .join(Booking)
        .join(Departure)
        .join(Tour)
        .filter(
            CancellationRequest.status == requested_status
        )
    )

    if current_user.role == "tour_operator":
        query = query.filter(
            Tour.tour_operator_id == current_user_id
        )

    cancellation_requests = (
        query
        .order_by(
            CancellationRequest.created_at.desc()
        )
        .all()
    )

    request_list = []

    for cancellation_request in cancellation_requests:

        booking = cancellation_request.booking
        departure = booking.departure if booking else None
        tour = departure.tour if departure else None
        customer = booking.user if booking else None

        request_list.append({
            "cancellation_request_id": cancellation_request.id,
            "booking_id": booking.id if booking else None,
            "status": cancellation_request.status,
            "reason": cancellation_request.reason,
            "admin_reason": cancellation_request.admin_reason,
            "created_at": (
                cancellation_request.created_at.isoformat()
                if cancellation_request.created_at
                else None
            ),
            "reviewed_at": (
                cancellation_request.reviewed_at.isoformat()
                if cancellation_request.reviewed_at
                else None
            ),
            "reviewed_by": cancellation_request.reviewed_by,
            "customer": (
                {
                    "user_id": customer.id,
                    "username": customer.username,
                    "email": customer.email
                }
                if customer
                else None
            ),
            "booking": (
                {
                    "booking_id": booking.id,
                    "number_of_people": booking.number_of_people,
                    "total_price": float(booking.total_price),
                    "status": booking.status
                }
                if booking
                else None
            ),
            "departure": (
                {
                    "departure_id": departure.id,
                    "start_date": departure.start_date.isoformat()
                }
                if departure
                else None
            ),
            "tour": (
                {
                    "tour_id": tour.id,
                    "tour_name": tour.tour_name,
                    "destination": tour.destination
                }
                if tour
                else None
            )
        })

    return jsonify({
        "message": "Cancellation requests retrieved successfully.",
        "status": requested_status,
        "count": len(request_list),
        "cancellation_requests": request_list
    }), 200


# =========================================================
# APPROVE CANCELLATION REQUEST
# =========================================================

@refund_bp.route(
    "/admin/cancellation-requests/<int:request_id>/approve",
    methods=["PATCH"]
)
@jwt_required()
@roles_required("admin", "tour_operator")
def approve_cancellation_request(request_id):
    """
    Approve a customer's cancellation request.

    IMPORTANT:
    Approval does NOT immediately cancel the booking.

    The booking remains confirmed until the refund webhook
    confirms that the successful payment(s) have been refunded.

    A pending Refund record is created for every successful
    payment that still has a refundable balance.
    """

    # -----------------------------------------------------
    # FIND CANCELLATION REQUEST
    # -----------------------------------------------------

    # Lock the cancellation request so two admins/operators cannot
    # approve or deny the same request at the same time.
    cancellation_request = (
        CancellationRequest.query
        .filter_by(id=request_id)
        .with_for_update()
        .first()
    )

    if not cancellation_request:
        return jsonify({
            "message": "Cancellation request not found."
        }), 404

    # -----------------------------------------------------
    # REQUEST MUST STILL BE PENDING
    # -----------------------------------------------------

    if cancellation_request.status != "pending":
        return jsonify({
            "message": (
                "This cancellation request has already been reviewed."
            ),
            "status": cancellation_request.status
        }), 400

    booking = cancellation_request.booking

    if not booking:
        return jsonify({
            "message": "Booking associated with this request was not found."
        }), 404

    # -----------------------------------------------------
    # TOUR OPERATOR ACCESS CHECK
    # -----------------------------------------------------
    #
    # Admins can review any cancellation request.
    # Tour operators can only review requests belonging to
    # their own tours.
    # -----------------------------------------------------

    current_user_id = int(
        get_jwt_identity()
    )

    current_user = User.query.filter_by(
        id=current_user_id
    ).first()

    if not current_user:
        return jsonify({
            "message": "User not found."
        }), 404

    if current_user.role == "tour_operator":

        departure = booking.departure

        tour = departure.tour if departure else None

        if not tour or tour.tour_operator_id != current_user_id:
            return jsonify({
                "message": "You are not authorized to review this cancellation request."
            }), 403

    # -----------------------------------------------------
    # LOCK BOOKING
    # -----------------------------------------------------
    #
    # Payment rows are locked first above.  We now lock the
    # booking using the same Payment -> Booking order used by
    # the refund webhook.  This prevents concurrent refund
    # processing from calculating/storing an outdated booking
    # state.
    # -----------------------------------------------------

    booking = (
        Booking.query
        .filter_by(id=booking.id)
        .with_for_update()
        .first()
    )

    if not booking:
        return jsonify({
            "message": "Booking associated with this request was not found."
        }), 404

    # -----------------------------------------------------
    # BOOKING MUST STILL BE CONFIRMED
    # -----------------------------------------------------

    if booking.status != "confirmed":
        return jsonify({
            "message": (
                "Only confirmed bookings can have a cancellation "
                "request approved."
            ),
            "status": booking.status
        }), 400

    # -----------------------------------------------------
    # FIND SUCCESSFUL PAYMENTS
    # -----------------------------------------------------

    # Lock all successful payment rows before calculating
    # refundable balances.  This serializes cancellation approval
    # with refund processing and keeps the lock order:
    #
    #     Payment -> Booking
    #
    # which matches the refund webhook.
    successful_payments = (
        Payment.query
        .filter_by(
            booking_id=booking.id,
            status="successful"
        )
        .with_for_update()
        .all()
    )

    if not successful_payments:
        return jsonify({
            "message": (
                "No successful payment was found for this booking."
            )
        }), 400

    # -----------------------------------------------------
    # PREPARE REFUNDS
    # -----------------------------------------------------

    refunds_to_create = []

    for payment in successful_payments:

        successful_refunds = Refund.query.filter(
            Refund.payment_id == payment.id,
            Refund.status == "successful"
        ).all()

        total_refunded = Decimal("0.00")

        for successful_refund in successful_refunds:
            total_refunded += Decimal(
                str(successful_refund.amount)
            )

        refundable_amount = (
            Decimal(str(payment.amount))
            - total_refunded
        )

        if refundable_amount <= 0:
            continue

        pending_refund = Refund.query.filter(
            Refund.payment_id == payment.id,
            Refund.status == "pending"
        ).first()

        if pending_refund:
            refunds_to_create.append(pending_refund)
            continue

        refund = Refund(
            payment_id=payment.id,
            amount=refundable_amount,
            status="pending",
            refund_reference=str(uuid.uuid4()),
            refunded_at=None
        )

        db.session.add(refund)
        refunds_to_create.append(refund)

    if not refunds_to_create:
        return jsonify({
            "message": (
                "No refundable balance is available for this booking."
            )
        }), 400

    # -----------------------------------------------------
    # APPROVE CANCELLATION REQUEST
    # -----------------------------------------------------

    cancellation_request.status = "approved"
    cancellation_request.reviewed_by = current_user_id
    cancellation_request.reviewed_at = datetime.utcnow()

    # The booking deliberately remains CONFIRMED here.
    # The existing refund webhook will change it to CANCELLED
    # after all successful payment amounts have been refunded.

    try:

        db.session.commit()

    except Exception as e:

        db.session.rollback()

        print(
            f"Cancellation approval error: {e}"
        )

        return jsonify({
            "message": (
                "Cancellation approval could not be completed."
            )
        }), 500

    # -----------------------------------------------------
    # CUSTOMER NOTIFICATION
    # -----------------------------------------------------

    notification = None

    notification = create_notification(
        user_id=booking.user_id,
        title="Cancellation Request Approved",
        message=(
            f"Your cancellation request for booking "
            f"#{booking.id} has been approved. "
            f"Your refund is now being processed."
        ),
        notification_type="refund",
        link=f"/booking/view/{booking.id}"
    )

    try:

        emit_notification(notification)

    except Exception as e:

        # The approval and refund records already succeeded.
        # A Socket.IO failure must not reverse the transaction.
        print(
            "Cancellation approval notification could not "
            f"be delivered: {e}"
        )

    return jsonify({
        "message": (
            "Cancellation request approved successfully. "
            "Refund processing has been initiated."
        ),
        "cancellation_request": {
            "id": cancellation_request.id,
            "booking_id": booking.id,
            "status": cancellation_request.status,
            "reviewed_by": cancellation_request.reviewed_by,
            "reviewed_at": (
                cancellation_request.reviewed_at.isoformat()
            )
        },
        "booking_status": booking.status,
        "refunds": [
            {
                "refund_id": refund.id,
                "payment_id": refund.payment_id,
                "amount": float(refund.amount),
                "status": refund.status,
                "refund_reference": refund.refund_reference
            }
            for refund in refunds_to_create
        ]
    }), 200


# =========================================================
# DENY CANCELLATION REQUEST
# =========================================================

@refund_bp.route(
    "/admin/cancellation-requests/<int:request_id>/deny",
    methods=["PATCH"]
)
@jwt_required()
@roles_required("admin", "tour_operator")
def deny_cancellation_request(request_id):
    """
    Deny a customer's cancellation request.

    A denial reason is required and the booking remains
    confirmed.
    """

    data = request.get_json(silent=True)

    if not data:
        return jsonify({
            "message": "Request body is required."
        }), 400

    admin_reason = data.get("reason")

    if not isinstance(admin_reason, str) or not admin_reason.strip():
        return jsonify({
            "message": "A denial reason is required."
        }), 400

    # Lock the cancellation request so an approval and denial
    # cannot race each other for the same request.
    cancellation_request = (
        CancellationRequest.query
        .filter_by(id=request_id)
        .with_for_update()
        .first()
    )

    if not cancellation_request:
        return jsonify({
            "message": "Cancellation request not found."
        }), 404

    if cancellation_request.status != "pending":
        return jsonify({
            "message": (
                "This cancellation request has already been reviewed."
            ),
            "status": cancellation_request.status
        }), 400

    booking = cancellation_request.booking

    if not booking:
        return jsonify({
            "message": "Booking associated with this request was not found."
        }), 404

    if booking.status != "confirmed":
        return jsonify({
            "message": (
                "Only confirmed bookings can have a cancellation "
                "request denied."
            ),
            "status": booking.status
        }), 400

    # -----------------------------------------------------
    # TOUR OPERATOR ACCESS CHECK
    # -----------------------------------------------------
    #
    # Admins can review any cancellation request.
    # Tour operators can only review requests belonging to
    # their own tours.
    # -----------------------------------------------------

    current_user_id = int(
        get_jwt_identity()
    )

    current_user = User.query.filter_by(
        id=current_user_id
    ).first()

    if not current_user:
        return jsonify({
            "message": "User not found."
        }), 404

    if current_user.role == "tour_operator":

        departure = booking.departure

        tour = departure.tour if departure else None

        if not tour or tour.tour_operator_id != current_user_id:
            return jsonify({
                "message": "You are not authorized to review this cancellation request."
            }), 403

    # -----------------------------------------------------
    # DENY REQUEST
    # -----------------------------------------------------

    cancellation_request.status = "denied"
    cancellation_request.admin_reason = admin_reason.strip()
    cancellation_request.reviewed_by = current_user_id
    cancellation_request.reviewed_at = datetime.utcnow()

    # The booking deliberately remains CONFIRMED.

    try:

        db.session.commit()

    except Exception as e:

        db.session.rollback()

        print(
            f"Cancellation denial error: {e}"
        )

        return jsonify({
            "message": (
                "Cancellation denial could not be completed."
            )
        }), 500

    # -----------------------------------------------------
    # CUSTOMER NOTIFICATION
    # -----------------------------------------------------

    notification = create_notification(
        user_id=booking.user_id,
        title="Cancellation Request Denied",
        message=(
            f"Your cancellation request for booking "
            f"#{booking.id} was denied. "
            f"Reason: {cancellation_request.admin_reason}"
        ),
        notification_type="booking",
        link=f"/booking/view/{booking.id}"
    )

    try:

        emit_notification(notification)

    except Exception as e:

        # The cancellation decision already succeeded.
        print(
            "Cancellation denial notification could not "
            f"be delivered: {e}"
        )

    return jsonify({
        "message": (
            "Cancellation request denied successfully."
        ),
        "cancellation_request": {
            "id": cancellation_request.id,
            "booking_id": booking.id,
            "status": cancellation_request.status,
            "reason": cancellation_request.reason,
            "admin_reason": cancellation_request.admin_reason,
            "reviewed_by": cancellation_request.reviewed_by,
            "reviewed_at": (
                cancellation_request.reviewed_at.isoformat()
            )
        },
        "booking_status": booking.status
    }), 200


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