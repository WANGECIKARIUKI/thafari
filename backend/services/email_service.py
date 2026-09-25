from flask import current_app
from flask_mail import Message
from extensions import mail


# ---------------------------------------------------------
# SEND EMAIL
# ---------------------------------------------------------

def send_email(to, subject, body):
    """
    Send a plain-text email.

    Keeping email sending in one service means our routes
    don't need to know how Flask-Mail works.

    Later, we can reuse this function for:
    - booking emails
    - payment emails
    - refund emails
    - account emails
    - notifications
    """

    # Create the email message.
    message = Message(
        subject=subject,

        # The sender comes from our Flask configuration.
        sender=current_app.config["MAIL_DEFAULT_SENDER"],

        # 'to' can be one email address or a list of addresses.
        recipients=[to] if isinstance(to, str) else to,

        # Plain-text email body.
        body=body
    )

    # Send the email through Flask-Mail.
    mail.send(message)


# ---------------------------------------------------------
# BOOKING CREATED EMAIL
# ---------------------------------------------------------

def send_booking_created_email(user, booking):
    """
    Notify a customer that their booking has been created.
    """

    subject = "Thafari Booking Created"

    body = f"""
Hello {user.first_name},

Your Thafari booking has been created successfully.

Booking ID: {booking.id}
Number of people: {booking.number_of_people}
Total price: KES {booking.total_price}

Your booking is currently pending payment.

Please complete your payment to confirm your booking.

Thank you for choosing Thafari.

The Thafari Team
"""

    send_email(
        to=user.email,
        subject=subject,
        body=body
    )


# ---------------------------------------------------------
# PAYMENT SUCCESS EMAIL
# ---------------------------------------------------------

def send_payment_success_email(user, payment, booking):
    """
    Notify the customer that a payment was successfully received.
    """

    subject = "Thafari Payment Successful"

    body = f"""
Hello {user.first_name},

We have successfully received your payment.

Payment ID: {payment.id}
Booking ID: {booking.id}
Amount paid: KES {payment.amount}
Payment method: {payment.payment_method}
Transaction reference: {payment.transaction_reference}

Thank you for your payment.

The Thafari Team
"""

    send_email(
        to=user.email,
        subject=subject,
        body=body
    )


# ---------------------------------------------------------
# BOOKING CONFIRMED EMAIL
# ---------------------------------------------------------

def send_booking_confirmed_email(user, booking):
    """
    Notify the customer that their booking has been fully paid
    and confirmed.
    """

    subject = "Thafari Booking Confirmed"

    body = f"""
Hello {user.first_name},

Your Thafari booking has been fully paid and confirmed!

Booking ID: {booking.id}
Number of people: {booking.number_of_people}
Total price: KES {booking.total_price}

Your trip is now confirmed.

Thank you for choosing Thafari.

The Thafari Team
"""

    send_email(
        to=user.email,
        subject=subject,
        body=body
    )


# ---------------------------------------------------------
# REFUND SUCCESS EMAIL
# ---------------------------------------------------------

def send_refund_success_email(user, refund, payment):
    """
    Notify the customer that their refund was successfully processed.
    """

    subject = "Thafari Refund Successful"

    body = f"""
Hello {user.first_name},

Your refund has been successfully processed.

Refund ID: {refund.id}
Refund amount: KES {refund.amount}
Refund reference: {refund.refund_reference}
Original payment ID: {payment.id}

Please keep this information for your records.

The Thafari Team
"""

    send_email(
        to=user.email,
        subject=subject,
        body=body
    )