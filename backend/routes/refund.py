from flask import Blueprint, jsonify, request, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from decorators.auth_decorator import roles_required
from decimal import Decimal, InvalidOperation
from models.refund import Refund
from models.payment import Payment
from datetime import datetime
from extensions import db
import uuid
import hmac
import hashlib


refund_bp = Blueprint(
    "refunds",
    __name__,
    url_prefix="/api"
)

#route for creating refund request
@refund_bp.route("/payment/<int:payment_id>/refund", methods = ["POST"])
@jwt_required()
@roles_required("customer")

def create_refund(payment_id):

    data = request.get_json()

    if not data:
        return jsonify({
            "message": "Request body is required."
        }), 400

    refund_amount = data.get("amount")

    if refund_amount is None:
        return jsonify({
            "message": "Refund amount is required."
        }), 400

    try:
        refund_amount = Decimal(str(refund_amount))

    except InvalidOperation:
        return jsonify({
            "message": "Amount should be a valid number."
        }), 400

    #refund_amount = refund_amount.normalize()

    if refund_amount <= 0:
        return jsonify({
            "message": "Refund amount should be greater than 0."
        }), 400

    if refund_amount.as_tuple().exponent < -2:
        return jsonify({
            "message": "Refund amount should have only two decimal places."
        }), 400

    #refund_amount = refund_amount.quantize(Decimal("0.01"))

    #get the payments  and check if it exists
    payment = Payment.query.get(payment_id)

    if not payment:
        return jsonify({
            "message": "Payment not found."
        }), 404

    #check if payment is successful

    if payment.status != "successful":
        return jsonify({
            "message": "Only successful payments can be refunded.",
            "status": payment.status
        }), 400

    #get current user
    current_user_id = int(get_jwt_identity())

    if payment.booking.user_id != current_user_id:
        return jsonify({
            "message": "Access denied."
        }), 403

    #check for the first pending refund on this particular payment
    pending_refund = Refund.query.filter(
        Refund.payment_id == payment_id,
        Refund.status == "pending"
    ).first()

    if pending_refund:
        return jsonify({
            "message": "Refund process is still pending. Please wait for the status to change.",
            "status": pending_refund.status
        }), 400
    
    #get all successful refunds associated with this payment
    successful_refunds = Refund.query.filter(
        Refund.payment_id == payment.id,
        Refund.status == "successful"
    ).all()
    #calculate total refund
    total_refunded = Decimal("0.00")

    for successful_refund in successful_refunds:
        total_refunded += successful_refund.amount

    #check refundable amount(balance to after a refund is done)
    refundable_amount = payment.amount - total_refunded

    #condition to ensure you do not refund more than refundable amount balance
    if refund_amount > refundable_amount:
        return jsonify({
            "message": "Please put the correct amount.",
            "refundable_amount":refundable_amount
        }), 400

    #get the unique refund reference

    refund_reference = str(uuid.uuid4())
    #create a refund
    refund = Refund(
        payment_id=payment.id,
        amount= refund_amount,
        status="pending",
        refund_reference=refund_reference,
        refunded_at=None
    )

    #prepare to save the refund
    db.session.add(refund)

    #save the refund data
    try:
        db.session.commit()

    except Exception:
        db.session.rollback()

        return jsonify({
            "message": "Refund process could not be completed."
        }), 500

    return jsonify({
        "message": "Refund created successfully.",
        "id":refund.id,
        "amount":float(refund.amount),
        "status":refund.status,
        "refund_reference":refund.refund_reference
    }), 201

#create a webhook- notification for external provider with thafari
@refund_bp.route("/webhook/refund", methods = ["POST"])

def create_webhook():
    #retrieve the data
    data = request.get_json()

    if not data:
        return jsonify({
            "message": "Request body is required."
        }), 400

    refund_reference = data.get("refund_reference")
    amount = data.get("amount")
    status = data.get("status")

    #validate refund reference
    if not isinstance(refund_reference, str) or not refund_reference.strip():
        return jsonify({
            "message": "Refund reference is required."
        }), 400

    #validate amount
    if amount is None:
        return jsonify({
            "message": "Amount is required."
        }), 400

    #change to decimal for accuracy
    try:
        amount = Decimal(str(amount))

    except InvalidOperation:
        return jsonify({
            "message": "Amount should be valid."
        }), 400
    
    #check if amount is an acceptable amount
    if amount <= 0:
        return jsonify({
            "message": "Amount should be greater than 0."
        }), 400

    #reject amounts with more than 2 decimal places
    if amount.as_tuple().exponent < -2:
        return jsonify({
            "message": "The number of decimal places should be 2."
        }), 400

    #validate status
    allowed_status = ["successful", "failed"]

    if status not in allowed_status:
        return jsonify({
            "message": "Only mentioned statuses allowed."
        }), 400

        # create a webhook signature
    signature = request.headers.get("X-Webhook-Signature")

    if not signature:
        return jsonify({
            "message": "Webhook signature is required."
        }), 401

    webhook_secret = current_app.config["WEBHOOK_SECRET"]
    print("Flask secret length:", len(webhook_secret))
    print("Postman secret length:", request.headers.get("X-Debug-Secret-Length"))

    # create a payload string to be used to get the secret signature
    payload = f"{refund_reference}|{amount:.2f}|{status}"

    # create a Thafari signature
    expected_signature = hmac.new(
        webhook_secret.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()

    print("WEBHOOK PAYLOAD:", payload)
    print("EXPECTED SIGNATURE:", expected_signature)
    print("RECEIVED SIGNATURE:", signature)

    #print("Webhook payload:", payload)
    #print("Expected signature:", expected_signature)

    if not hmac.compare_digest(signature, expected_signature):
        return jsonify({
            "message": "Invalid Webhook signature."
        }), 401

    #check if the refund exists using the refund reference
    refund = Refund.query.filter_by(refund_reference=refund_reference).first()

    if not refund:
        return jsonify({
            "message": "Refund not found."
        }), 404

    #check if refund amount is correct
    if amount != refund.amount:
        return jsonify({
            "message": "Refund amount does not match.",
            "refund_amount":amount
        }), 400

    #check for idempotency(if a refund is already successful/failed do not process it again)
    if refund.status == "successful":
        return jsonify({
            "message": "Refund already processed.",
            "status": refund.status
        }), 200

    if refund.status == "failed":
        return jsonify({
            "message": "Refund already failed.",
            "status": refund.status
        }), 200
    
    #update status and datetime once refund is successful
    if status == "successful":
        refund.status = "successful"
        refund.refunded_at = datetime.utcnow()

        db.session.flush()# add the changes to the database first this doesn't permanently save the changes.

        #get all successful payments too.
        successful_payments = Payment.query.filter(
            Payment.booking_id == refund.payment.booking_id, #the payment should be the same as the refund.
            Payment.status == "successful"

        ).all()

        total_successful_paid = Decimal("0.00")

        for successful_payment in successful_payments:
            total_successful_paid += successful_payment.amount

        #get all successful refunds for all payments belonging to a certain booking
        successful_refunds = Refund.query.join(Payment).filter(
            Payment.booking_id == refund.payment.booking_id, #helps us check all payments and refunds associated with that booking
            Refund.status == "successful"
        ).all()

        total_refunded = Decimal("0.00")
        

        for successful_refund in successful_refunds:
            total_refunded += successful_refund.amount

        print("TOTAL SUCCESSFUL PAID:", total_successful_paid)
        print("TOTAL REFUNDED:", total_refunded)
        print("BOOKING STATUS BEFORE:", refund.payment.booking.status)    

        #get the payment the refund belongs to.
        payment = refund.payment
        #check if the total refunded amount is same or more than total successful payment for that specific booking. then we cancel the booking
        if total_refunded >= total_successful_paid:
            refund.payment.booking.status = "cancelled" 

        else:
            refund.payment.booking.status = "pending" # if refund partially paid change the booking status to pending

        print("BOOKING STATUS AFTER:", refund.payment.booking.status)     

        try:
            db.session.commit()

        except Exception:
            db.session.rollback()

            return jsonify({
                "message": "Refund process could not be completed."
            }), 500

        return jsonify({
            "message": "Refund has been confirmed",
            "refund_id": refund.id,
            "refund_status": refund.status,
            "refund_amount":float(refund.amount),
            "total_refunded": float(total_refunded),
            "booking_status": payment.booking.status,
            "refunded_at": refund.refunded_at.isoformat()
        }), 200

    else:
        refund.status = "failed"

        try:
            db.session.commit()

        except Exception:
            db.session.rollback()

            return jsonify({
                "message": "Refund processing could not be processed."
            }), 500

    return jsonify({
        "message":"Refund failed.",
        "refund_id": refund.id,
        "refund_status": refund.status
    }), 200


    




        

    
        


