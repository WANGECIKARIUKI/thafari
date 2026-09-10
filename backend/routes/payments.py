from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.booking import Booking
from models.payment import Payment
from decorators.auth_decorator import roles_required
from datetime import datetime
from extensions import db
from decimal import Decimal, InvalidOperation
import uuid
import hashlib #cryptographic(scrambling) hashing function
import hmac #create a keyed signature

payment_bp = Blueprint(
    "payment",
    __name__,
    url_prefix = "/api"
)

#create a payment endpoint

@payment_bp.route("/payment", methods = ["POST"])
@jwt_required()
@roles_required("customer")
def create_payment():
    #retrieve the data from the client
    data = request.get_json()

    if not data:
        return jsonify({
            "message": "Request body is required."
        }), 400

    #extract the data
    booking_id = data.get("booking_id")
    payment_method = data.get("payment_method")
    amount = data.get("amount")

    #validate the data
    if not isinstance(booking_id, int) or booking_id <= 0:
        return jsonify({
            "message": "Booking id is required and should be greater than 0."
        }), 400

    allowed_payment_method = ["mpesa", "visa", "bank_transfer"]
    if payment_method not in allowed_payment_method:
        return jsonify({
            "message": "Invalid payment method."
        }), 400

    if amount is None:
        return jsonify({
            "message": "Amount is required."
        }), 400

    #change the amount to a decimal and check if it is valid
    try:
        amount = Decimal(str(amount))
    except InvalidOperation:
        return jsonify({
            "message": "Amount must be a valid number."
        }), 400

    #allow trailing zeros after the two decimal places and remove them using normalize
    amount = amount.normalize()

    #check if it is greater than 0
    if amount <= 0:
        return jsonify({
            "message": "Amount needs to be greater than zero."
        }), 400

    #check if it has 2 decimal places
    if amount.as_tuple().exponent < -2:
        return jsonify({
            "message": "Amount cannot have more than 2 decimal places."
        }), 400

    #check if booking exists
    booking = Booking.query.filter_by(id=booking_id).first()

    if not booking:
        return jsonify({
            "message": "Booking not found."
        }), 404

    #check if user booking and making payment exists
    current_user_id = int(get_jwt_identity())
    #current_user = User.query.filter_by(id=current_user_id).first()

    if booking.user_id != current_user_id:
        return jsonify({
            "message": "Access denied!"
        }), 403
    #we are checking is the current status pending for the payment process to continue.
    if booking.status != "pending":
        return jsonify({
            "message": "This booking is no-longer available!",
            "status": booking.status
        }), 400

    #check total paid
    successful_payments = Payment.query.filter(
        Payment.booking_id == booking.id,
        Payment.status == "successful"
    ).all()

    total_paid = Decimal("0.00")
    #a for loop to loop thru the successful payments made
    for payment in successful_payments:
        total_paid += payment.amount

    #find the remaining balance
    remaining_balance = booking.total_price - total_paid

    #thafari rule: A booking is secured if payment of 50% minimum has been made
    minimum_payment = booking.total_price * Decimal("0.50")

    #a condition to avoid extra payment
    '''print("Booking total:", booking.total_price)
    print("Total paid:", total_paid)
    print("Remaining balance:", remaining_balance)
    print("New payment amount:", amount)'''

    if amount > remaining_balance:
        return jsonify({
            "message": "The amount you entered is more than your remaining balance.",
            "remaining_balance": float(remaining_balance)
        }), 400

    #check for new payments made successfully

    total_after_payment = total_paid + amount

    #check if the payment makes the booking secured
    is_secured = total_after_payment >= minimum_payment

    #check is payment is paid 100%
    is_fully_paid = total_after_payment >= booking.total_price

    transaction_reference = str(uuid.uuid4())

    #create a new payment
    new_payment = Payment(
        booking_id=booking.id,
        transaction_reference=transaction_reference,
        status = "pending",
        amount=amount,
        paid_at=None, #it is none since at the moment no payment has been made yet
        payment_method=payment_method

    )

    #prepare to save the data
    db.session.add(new_payment)
    #save the data
    db.session.commit()

    return jsonify({
        "message": "Payment request has been created and is awaiting confirmation.",
        "payment_id":new_payment.id,
        "status":new_payment.status,
        "booking_id":new_payment.booking_id,
        "amount":float(new_payment.amount)
    }), 201

#an endpoint to check and update a confirmation using payment id
@payment_bp.route("/payment/<int:payment_id>/confirmation", methods = ["POST"])
@jwt_required()
@roles_required("customer")
def confirm_payment(payment_id):
    #check if the payment id exists
    payment = Payment.query.filter_by(id=payment_id).first()

    if not payment:
        return jsonify({
            "message": "Payment not found."
        }), 404

    #check the current user logged in
    current_user_id = int(get_jwt_identity())

    #confirm the user id is of the same customer
    if payment.booking.user_id != current_user_id:
        return jsonify({
            "message": "Access denied!"
        }), 403

    #check if payment is still pending
    if payment.status != "pending":
       return jsonify({
           "message": "Payment has already been processed.",
           "status": payment.status
       }), 400

    #find all successful payments for the booking we are accessing
    successful_payments = Payment.query.filter(
        Payment.booking_id == payment.booking_id,
        Payment.status == "successful"
    ).all()
    #calculate the total payments made on that booking
    total_paid = Decimal("0.00")
    #loop thru all successful payments
    for successful_payment in successful_payments:
        total_paid += successful_payment.amount

    #calculate remaining balance
    remaining_balance = payment.booking.total_price - total_paid    

    #calculate what the payment would be after the above payment is successful
    total_after_payment = total_paid + payment.amount

    if total_after_payment > payment.booking.total_price:
        return jsonify({
            "message": "The payment would exceed the remaining balance.",
            "remaining_balance": float(remaining_balance)
        }), 400

    #change the status to successful
    payment.status = "successful"
    #update the time to show when the payment was successful
    payment.paid_at = datetime.utcnow()

    #add the current payment made(total after payment) to get the current total paid
    total_paid = total_after_payment

    #calculate the remaining balance after the current total paid
    remaining_balance = payment.booking.total_price - total_paid  
    
    #minimum threshold of 50%
    minimum_requirement = payment.booking.total_price * Decimal("0.50")

    #check if the 50% threshold is met
    is_secured = total_paid >= minimum_requirement

    #check if the payment is paid fully
    is_fully_paid = total_paid >= payment.booking.total_price

    #confirm the booking if the customer has fully paid
    if is_fully_paid:
        payment.booking.status = "confirmed"

    #save the changes made on the payment and booking and also a rollback if payment is not made successfully
    try:
        db.session.commit()

    except Exception:
        db.session.rollback()

        return jsonify({
            "message": "Payment confirmation could not be completed!"
        }), 500    
    

    return jsonify({
        "message": "Payment confirmed successfully",
        "payment_id":payment.id,
        "amount_paid":float(payment.amount),
        "total_paid":float(total_paid),
        "remaining_balance":float(remaining_balance),
        "booking_secured":is_secured,
        "booking_status":payment.booking.status,
        "fully_paid":is_fully_paid
    }), 200

#create an endpoint that allows the provider to communicate with thafari when the payment is made
@payment_bp.route("/payment/webhook", methods = ["POST"])

def create_webhook():
    data = request.get_json()

    if not data:
        return jsonify({
            "message": "Request body is required."
        }), 400

    #extract the transaction reference for the payment made
    transaction_reference = data.get("transaction_reference")

    if not transaction_reference:
        return jsonify({
            "message": "Transaction reference is required."
        }), 400

    #check if the transaction reference exists
    payment = Payment.query.filter_by(transaction_reference=transaction_reference).first()

    if not payment:
        return jsonify({
            "message": "payment transaction is not found."
        }), 404

    #temporary signature from the provider to prove it is the actual provider
    signature = request.headers.get("X-Webhook-Signature")

    if not signature:
        return jsonify({
            "message": "Webhook signature is required."
        }), 401 # the server cannot authenticate who you are.

    #get the webhook secret from config
    webhook_secret = current_app.config["WEBHOOK_SECRET"]

    #check the payment received by the provider
    provider_amount = data.get("amount")

    #ensure the amount data is available
    if provider_amount is None:
        return jsonify({
            "message": "Amount is required."
        }), 400
    
    #check if the provider amount is the same as the amount in booking
    if provider_amount != payment.amount:
        return jsonify({
            "message": "The payment amount does not match the expected amount."
        }), 400

    #get the status given by the provider
    #update the payment status
    provider_status = data.get("status")

    if not provider_status:
        return jsonify({
            "message": "Payment status is required"
        }), 400

    #get payload data from webhook
    payload = (
        f"{transaction_reference}|{provider_amount}|{provider_status}"
    )

    #generate the expected signature
    expected_signature = hmac.new(
        webhook_secret.encode(), #turn the webhook secret to bytes
        payload.encode(), #turn the payload to bytes
        hashlib.sha256, #SHA 256 hash algorithm
    ).hexdigest() #get the signature in a hexadecimal string

    if not hmac.compare_digest(signature, expected_signature):
        return jsonify({
            "message": "Invalid webhook signature."
        }), 401

    #check if the payment is already successful/failed and not to make the same payment twice
    if payment.status == "successful":
        return jsonify({
            "message": "Payment has already been processed.",
            "payment_id": payment.id,
            "status":payment.status
        }), 200

    if payment.status == "failed":
        return jsonify({
            "message": "Payment has already been processed.",
            "payment_id": payment.id,
            "status": payment.status
        }), 200

    if provider_status == "failed":
        payment.status = "failed"

        try:
            db.session.commit()

        except Exception:
            db.session.rollback()

            return jsonify({
                "message": "Payment processing could not be completed."
            }), 500    

        return jsonify({
            "message": "Payment failed.",
            "payment_id": payment.id,
            "status": payment.status
        }), 200
    
    #check successful payment and calculate total paid
    if provider_status == "successful":
        payment.status = "successful"
        payment.paid_at = datetime.utcnow()

        successful_payments = Payment.query.filter(
            Payment.booking_id == payment.booking_id,
            Payment.status == "successful"
        ).all()

        total_paid = Decimal("0.00")

        for successful_payment in successful_payments:
            total_paid += successful_payment.amount

        #remaining balance
        remaining_balance = payment.booking.total_price - total_paid

        #minimum_payment (50%)
        minimum_payment = payment.booking.total_price * Decimal("0.50")

        #check if booking is_secured
        is_secured = total_paid >= minimum_payment

        #check if booking is_fully_paid
        is_fully_paid = total_paid >= payment.booking.total_price

        if is_fully_paid:
            payment.booking.status = "confirmed"
        #save the data
        try:
            db.session.commit()

        except Exception:
            db.session.rollback()

            return jsonify({
                "message": "Payment confirmation could not be completed."
            }), 500           

        return jsonify({
            "message": "payment successfully confirmed.",
            "payment_id": payment.id,
            "booking_secured": is_secured,
            "total_paid":float(total_paid),
            "amount_paid":float(payment.amount),
            "remaining_balance":float(remaining_balance),
            "fully_paid":is_fully_paid,
            "payment_status":payment.status
        }), 200

    return jsonify({
        "message": "Unsupported payment status."
    }), 400


#create a refund payment route
'''@payment_bp.route("/payment/<int:payment_id>/refund", methods=["POST"])
@jwt_required()
@roles_required("customer")
def refund_payment(payment_id):

    #check if the payment exists
    payment = Payment.query.get(payment_id)

    #validate the payment
    if not payment:
        return jsonify({
            "message": "Payment not found."
        }), 404

     #check the user making the request
    current_user_id = int(get_jwt_identity())

    #check ownership of the customer making the request
    if payment.booking.user_id != current_user_id:
        return jsonify({
            "message": "You are not authorized to refund this payment."
        }), 403

    # a condition to make it only successful payments can be refunded
    if payment.status != "successful":
        return jsonify({
            "message": "Only successful payments can be refunded!",
            "status": payment.status
        }), 400
    
    #change the payment status to refunded
    payment.status = "refunded"

    #save the changes
    db.session.commit()

    #check all successful payments after refund is requested
    successful_payments = Payment.query.filter(
        Payment.booking_id == payment.booking_id,
        Payment.status == "successful"
    ).all()

    #check total paid after refund is done
    total_paid = Decimal("0.00")

    #loop thru the successful payments
    for successful_payment in successful_payments:
        total_paid += successful_payment.amount

    #remaining balance
    remaining_balance = payment.booking.total_price - total_paid

    #minimum payment - 50%
    minimum_payment = payment.booking.total_price * Decimal("0.50")

    #check if booking is secured
    is_secured = total_paid >= minimum_payment

    #check if still fully paid
    is_fully_paid = total_paid >= payment.booking.total_price

    if is_fully_paid:
        payment.booking.status = "confirmed"
    else:
        payment.booking.status = "pending"

    try:
        db.session.commit()

    except Exception:
        db.session.rollback()

        return jsonify({
            "message": "Refund processing could not be completed."
        }), 500

    return jsonify({
        "message": "Payment successfully refunded.",
        "payment_id": payment.id,
        "status": payment.status,
        "booking_secured":is_secured,
        "total_paid": float(total_paid),
        "remaining_balance": float(remaining_balance),
        "fully_paid": is_fully_paid
    }), 200 '''

#retrieve booking history
@payment_bp.route("/booking/<int:booking_id>/payments", methods = ["GET"])
@jwt_required()
@roles_required("customer")
def get_booking_payments(booking_id):
    #get the bookings the customer is requesting for
    booking = Booking.query.get(booking_id)

    if not booking:
        return jsonify({
            "message": "Booking is not found."
        }), 404

    current_user_id = int(get_jwt_identity())

    if booking.user_id != current_user_id:
        return jsonify({
            "message": "You are not authorized to check this booking."
        }), 403

    #get the payments for that specific booking id
    payments = Payment.query.filter_by(booking_id=booking_id).all()

    #retrieve all the payment details
    payment_history = [
        {
            "payment_id": payment.id,
            "status": payment.status,
            "transaction_reference": payment.transaction_reference,
            "amount": float(payment.amount),
            "payment_method": payment.payment_method,
            "paid_at":payment.paid_at.isoformat()
            if payment.paid_at
            else None
        }
        for payment in payments
    ]

    return jsonify({
        "booking_id":booking_id,
        "payments": payment_history
    }), 200





    