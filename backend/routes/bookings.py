from flask import Blueprint, jsonify, request
from flask_jwt_extended import (
    jwt_required,
    get_jwt_identity
)
from decorators.auth_decorator import roles_required
from extensions import db, limiter
from models.user import User
from models.booking import Booking
from models.departure import Departure
from models.tour import Tour
from models.payment import Payment
from models.cancellation_request import CancellationRequest

from services.booking_service import (
    expired_pending_booking,
    calculate_available_seats,
    find_suggested_departures,
    create_pending_booking
)

from datetime import date, datetime, timedelta

# Email service used to notify customers about new bookings.
from services.email_service import send_booking_created_email
from services.notification_service import create_notification, emit_notification


# ---------------------------------------------------------
# BOOKING BLUEPRINT
# ---------------------------------------------------------

booking_bp = Blueprint(
    "booking",
    __name__,
    url_prefix="/api"
)


# ---------------------------------------------------------
# AUTOMATICALLY COMPLETE FINISHED BOOKINGS
# ---------------------------------------------------------
#
# A confirmed booking becomes completed once its departure
# end date has passed.
#
# We update this directly in the booking API so customers,
# admins and tour operators always receive the current status
# when they load their bookings.
# ---------------------------------------------------------

def update_completed_bookings():
    """
    Mark confirmed bookings as completed after their departure
    end date has passed.

    We deliberately use the departure end_date rather than the
    start_date because a safari can run for multiple days.
    """

    today = date.today()

    finished_bookings = (
        Booking.query
        .join(Departure)
        .filter(
            Booking.status == "confirmed",
            Departure.end_date < today
        )
        .all()
    )

    if not finished_bookings:
        return 0

    updated_count = 0

    try:
        for booking in finished_bookings:
            booking.status = "completed"
            updated_count += 1

        db.session.commit()

        return updated_count

    except Exception as e:
        db.session.rollback()

        print(
            f"Failed to automatically complete bookings: {e}"
        )

        return 0


# ---------------------------------------------------------
# CREATE A BOOKING
# ---------------------------------------------------------

@booking_bp.route("/booking", methods=["POST"])
@limiter.limit("10 per minute")
@jwt_required()
@roles_required("admin", "customer")
def create_booking():

    # Retrieve the request body.
    data = request.get_json()

    if not data:
        return jsonify({
            "message": "Request body is required."
        }), 400

    # Extract booking information.
    departure_id = data.get("departure_id")
    number_of_people = data.get("number_of_people")

    # -----------------------------------------------------
    # VALIDATE DEPARTURE ID
    # -----------------------------------------------------

    if not isinstance(departure_id, int):
        return jsonify({
            "message": "Departure id is required."
        }), 400

    if departure_id <= 0:
        return jsonify({
            "message": "departure id should be greater than 0."
        }), 400

    # -----------------------------------------------------
    # VALIDATE NUMBER OF PEOPLE
    # -----------------------------------------------------

    if not isinstance(number_of_people, int):
        return jsonify({
            "message": "Number of people is required."
        }), 400

    if number_of_people <= 0:
        return jsonify({
            "message": "number of people should be greater than 0."
        }), 400

    # -----------------------------------------------------
    # GET CURRENT USER
    # -----------------------------------------------------

    current_user_id = int(get_jwt_identity())

    current_user = User.query.filter_by(
        id=current_user_id
    ).first()

    if not current_user:
        return jsonify({
            "message": "Current user not found."
        }), 404

    # -----------------------------------------------------
    # DETERMINE WHO THE BOOKING IS FOR
    # -----------------------------------------------------

    if current_user.role == "admin":

        # Admins can create bookings on behalf of customers.
        booking_user_id = data.get("user_id")

        if not isinstance(booking_user_id, int) or booking_user_id <= 0:
            return jsonify({
                "message": (
                    "User id is required and has to be greater than 0."
                )
            }), 400

    else:

        # Normal customers create bookings for themselves.
        booking_user_id = current_user_id

    # -----------------------------------------------------
    # CHECK THAT THE BOOKING USER EXISTS
    # -----------------------------------------------------

    booking_user = User.query.filter_by(
        id=booking_user_id
    ).first()

    if not booking_user:
        return jsonify({
            "message": "User not found."
        }), 404

    # -----------------------------------------------------
    # FIND THE DEPARTURE
    # -----------------------------------------------------

    departure = Departure.query.filter_by(
        id=departure_id
    ).first()

    if not departure:
        return jsonify({
            "message": "Departure not found."
        }), 404

    # -----------------------------------------------------
    # CHECK WHETHER THE DEPARTURE IS ACTIVE
    # -----------------------------------------------------

    if not departure.is_active:
        return jsonify({
            "message": (
                "This departure is no longer available for booking!"
            )
        }), 400

    # -----------------------------------------------------
    # CHECK WHETHER THE DEPARTURE HAS ALREADY STARTED
    # -----------------------------------------------------

    today = date.today()

    if departure.start_date <= today:
        return jsonify({
            "message": "This departure has already started and is no longer available for booking."
        }), 400

    # -----------------------------------------------------
    # CALCULATE AVAILABLE SEATS
    # -----------------------------------------------------

    available_seats = calculate_available_seats(
        departure
    )

    # -----------------------------------------------------
    # CHECK WHETHER THERE ARE ENOUGH SEATS
    # -----------------------------------------------------

    if number_of_people > available_seats:

        # If there aren't enough seats, look for later
        # departures for the same tour.
        suggested_departures = find_suggested_departures(
            departure,
            number_of_people
        )

        return jsonify({
            "message": (
                "The available slots are not enough for you all."
            ),
            "available_seats": available_seats,
            "suggested_departures": suggested_departures
        }), 400

    # -----------------------------------------------------
    # CREATE THE PENDING BOOKING
    # -----------------------------------------------------

    booking = create_pending_booking(
        user_id=booking_user_id,
        departure=departure,
        number_of_people=number_of_people
    )

    # -----------------------------------------------------
    # SEND BOOKING EMAIL
    # -----------------------------------------------------

    try:
        # Send the email AFTER the booking has successfully
        # been committed to the database.
        send_booking_created_email(
            booking_user,
            booking
        )

    except Exception as e:
        # Email failure should NOT undo a successfully
        # created booking.
        #
        # The booking already exists in the database, so we
        # simply log the email error.
        print(
            f"Booking email could not be sent: {e}"
        )

    # -----------------------------------------------------
    # RETURN BOOKING RESPONSE
    # -----------------------------------------------------

    return jsonify({
        "message": "A New booking created successfully!",
        "booking_id": booking.id,
        "departure_id": booking.departure_id,
        "status": booking.status,
        "number_of_people": booking.number_of_people,
        "price_per_person": float(
            booking.price_per_person
        ),
        "total_price": float(
            booking.total_price
        ),
        "expires_at": None
    }), 201


# ---------------------------------------------------------
# PROCESS EXPIRED BOOKINGS
# ---------------------------------------------------------

@booking_bp.route(
    "/booking/expires",
    methods=["POST"]
)
@jwt_required()
@roles_required("admin")
def expired_bookings():

    # Process pending bookings whose payment window has expired.
    expired_pending_booking()

    return jsonify({
        "message": "Expired bookings processed successfully."
    }), 200


# ---------------------------------------------------------
# CANCEL A PENDING BOOKING
# ---------------------------------------------------------
#
# Customers can cancel their own pending bookings only when
# no successful or pending payment is attached to the booking.
#
# This keeps unpaid bookings simple to cancel while preventing
# a booking with an active payment from being cancelled through
# the normal unpaid-booking cancellation flow.
#
# A refund workflow for paid bookings will be handled separately.
# ---------------------------------------------------------

@booking_bp.route(
    "/booking/<int:booking_id>/cancel",
    methods=["PATCH"]
)
@limiter.limit("10 per minute")
@jwt_required()
@roles_required("customer")
def cancel_booking(booking_id):

    # ---------------------------------------------------------
    # FIND THE BOOKING
    # ---------------------------------------------------------

    booking = Booking.query.filter_by(
        id=booking_id
    ).first()

    if not booking:
        return jsonify({
            "message": "Booking not found."
        }), 404


    # ---------------------------------------------------------
    # GET CURRENT CUSTOMER
    # ---------------------------------------------------------

    current_user_id = int(
        get_jwt_identity()
    )


    # ---------------------------------------------------------
    # CHECK BOOKING OWNERSHIP
    # ---------------------------------------------------------

    if booking.user_id != current_user_id:
        return jsonify({
            "message": (
                "You are not authorized to cancel this booking."
            )
        }), 403


    # ---------------------------------------------------------
    # BOOKING MUST STILL BE PENDING
    # ---------------------------------------------------------

    if booking.status != "pending":
        return jsonify({
            "message": (
                "Only pending bookings can be cancelled "
                "using this option."
            ),
            "status": booking.status
        }), 400


    # ---------------------------------------------------------
    # CHECK ATTACHED PAYMENTS
    # ---------------------------------------------------------
    #
    # A successful payment means money has been recorded
    # against the booking and should go through a separate
    # cancellation/refund process.
    #
    # A pending payment means the customer has submitted a
    # payment that may still require verification. We do not
    # cancel that payment through the unpaid-booking flow.
    #
    # Failed, cancelled, refunded and reversed payments do not
    # block cancellation because they do not represent an
    # active successful/pending payment.
    # ---------------------------------------------------------

    successful_payment = Payment.query.filter_by(
        booking_id=booking.id,
        status="successful"
    ).first()

    if successful_payment:
        return jsonify({
            "message": (
                "This booking has a successful payment and "
                "cannot be cancelled through the unpaid-booking "
                "cancellation option. A refund request is required."
            )
        }), 400


    pending_payment = Payment.query.filter_by(
        booking_id=booking.id,
        status="pending"
    ).first()

    if pending_payment:
        return jsonify({
            "message": (
                "This booking has a payment awaiting verification "
                "and cannot be cancelled through the unpaid-booking "
                "cancellation option."
            )
        }), 400


    # ---------------------------------------------------------
    # CANCEL THE BOOKING
    # ---------------------------------------------------------

    booking.status = "cancelled"

    try:

        db.session.commit()

    except Exception as e:

        db.session.rollback()

        print(
            f"Failed to cancel booking {booking.id}: {e}"
        )

        return jsonify({
            "message": "Failed to cancel booking."
        }), 500


    # ---------------------------------------------------------
    # RETURN UPDATED BOOKING
    # ---------------------------------------------------------

    return jsonify({
        "message": "Booking cancelled successfully.",
        "booking_id": booking.id,
        "status": booking.status
    }), 200


# ---------------------------------------------------------
# REQUEST CANCELLATION FOR A CONFIRMED PAID BOOKING
# ---------------------------------------------------------
#
# Customers use this endpoint when they have already paid
# for a booking and want to request cancellation/refund.
#
# IMPORTANT:
# - This does NOT cancel the booking immediately.
# - The booking remains confirmed while the request is pending.
# - The customer must have a successful payment.
# - The request must be made at least 72 hours before the
#   departure date.
# - The customer must provide a reason.
# - An admin will review the request separately.
# ---------------------------------------------------------

@booking_bp.route(
    "/booking/<int:booking_id>/cancellation-request",
    methods=["POST"]
)
@limiter.limit("10 per minute")
@jwt_required()
@roles_required("customer")
def request_booking_cancellation(booking_id):

    # ---------------------------------------------------------
    # FIND THE BOOKING
    # ---------------------------------------------------------

    booking = Booking.query.filter_by(
        id=booking_id
    ).first()

    if not booking:
        return jsonify({
            "message": "Booking not found."
        }), 404

    # ---------------------------------------------------------
    # GET CURRENT CUSTOMER
    # ---------------------------------------------------------

    current_user_id = int(
        get_jwt_identity()
    )

    # ---------------------------------------------------------
    # CHECK BOOKING OWNERSHIP
    # ---------------------------------------------------------

    if booking.user_id != current_user_id:
        return jsonify({
            "message": (
                "You are not authorized to request cancellation "
                "for this booking."
            )
        }), 403

    # ---------------------------------------------------------
    # BOOKING MUST BE CONFIRMED
    # ---------------------------------------------------------

    if booking.status != "confirmed":
        return jsonify({
            "message": (
                "Cancellation requests are only available for "
                "confirmed bookings."
            ),
            "status": booking.status
        }), 400

    # ---------------------------------------------------------
    # CHECK FOR A SUCCESSFUL PAYMENT
    # ---------------------------------------------------------

    successful_payment = Payment.query.filter_by(
        booking_id=booking.id,
        status="successful"
    ).first()

    if not successful_payment:
        return jsonify({
            "message": (
                "A successful payment is required before you "
                "can request a cancellation."
            )
        }), 400

    # ---------------------------------------------------------
    # CHECK FOR AN EXISTING PENDING REQUEST
    # ---------------------------------------------------------

    existing_request = CancellationRequest.query.filter_by(
        booking_id=booking.id,
        status="pending"
    ).first()

    if existing_request:
        return jsonify({
            "message": (
                "A cancellation request for this booking is "
                "already awaiting review."
            ),
            "cancellation_request_id": existing_request.id,
            "status": existing_request.status
        }), 400

    # ---------------------------------------------------------
    # FIND THE DEPARTURE
    # ---------------------------------------------------------

    departure = booking.departure

    if not departure:
        return jsonify({
            "message": "Departure not found for this booking."
        }), 404

    # ---------------------------------------------------------
    # CHECK THE 72-HOUR CANCELLATION POLICY
    # ---------------------------------------------------------
    #
    # The current Departure model stores the departure date.
    # We treat the beginning of that date as the departure
    # cutoff for this initial 72-hour policy.
    # ---------------------------------------------------------

    departure_datetime = datetime.combine(
        departure.start_date,
        datetime.min.time()
    )

    cancellation_deadline = (
        departure_datetime - timedelta(hours=72)
    )

    if datetime.utcnow() > cancellation_deadline:
        return jsonify({
            "message": (
                "This booking is no longer eligible for "
                "cancellation because it is within 72 hours "
                "of the departure date."
            ),
            "policy": {
                "minimum_notice_hours": 72,
                "eligible": False,
                "departure_date": departure.start_date.isoformat()
            }
        }), 400

    # ---------------------------------------------------------
    # GET CANCELLATION REASON
    # ---------------------------------------------------------

    data = request.get_json()

    if not data:
        return jsonify({
            "message": "Request body is required."
        }), 400

    reason = data.get("reason")

    if not isinstance(reason, str) or not reason.strip():
        return jsonify({
            "message": "A cancellation reason is required."
        }), 400

    reason = reason.strip()

    # ---------------------------------------------------------
    # CREATE CANCELLATION REQUEST
    # ---------------------------------------------------------

    cancellation_request = CancellationRequest(
        booking_id=booking.id,
        reason=reason,
        status="pending"
    )

    try:

        # -----------------------------------------------------
        # SAVE THE CANCELLATION REQUEST
        # -----------------------------------------------------

        db.session.add(cancellation_request)

        # Flush so the cancellation request receives its
        # database ID before the notifications are created.
        db.session.flush()

        # -----------------------------------------------------
        # FIND NOTIFICATION RECIPIENTS
        # -----------------------------------------------------

        notification_recipients = []

        # All admins should receive the cancellation request.
        admins = User.query.filter_by(
            role="admin"
        ).all()

        for admin in admins:
            notification_recipients.append(admin.id)

        # The tour operator responsible for this booking's
        # tour should also receive the cancellation request.
        tour_operator_id = (
            departure.tour.tour_operator_id
            if departure.tour
            else None
        )

        if (
            tour_operator_id
            and tour_operator_id not in notification_recipients
        ):
            notification_recipients.append(
                tour_operator_id
            )

        # -----------------------------------------------------
        # CREATE STAFF NOTIFICATIONS
        # -----------------------------------------------------

        cancellation_notifications = []

        for recipient_id in notification_recipients:

            notification = create_notification(
                user_id=recipient_id,
                title="New Cancellation Request",
                message=(
                    f"Customer has submitted a cancellation "
                    f"request for Booking #{booking.id}. "
                    f"The request is awaiting review."
                ),
                notification_type="booking",
                link=f"/dashboard?cancellation_request={cancellation_request.id}"
            )

            cancellation_notifications.append(
                notification
            )

        # -----------------------------------------------------
        # COMMIT THE REQUEST AND NOTIFICATIONS TOGETHER
        # -----------------------------------------------------

        db.session.commit()

    except Exception as e:

        db.session.rollback()

        print(
            f"Failed to create cancellation request "
            f"for booking {booking.id}: {e}"
        )

        return jsonify({
            "message": "Failed to submit cancellation request."
        }), 500

    # ---------------------------------------------------------
    # EMIT STAFF NOTIFICATIONS AFTER COMMIT
    # ---------------------------------------------------------

    for notification in cancellation_notifications:

        try:

            emit_notification(notification)

        except Exception as e:

            # The cancellation request and notification are
            # already safely stored in the database. A Socket.IO
            # delivery failure should not undo the successful
            # business operation.
            print(
                f"Cancellation notification could not be "
                f"delivered in real time: {e}"
            )

    # ---------------------------------------------------------
    # RETURN REQUEST DETAILS
    # ---------------------------------------------------------

    return jsonify({
        "message": (
            "Cancellation request submitted successfully. "
            "Your booking will remain confirmed while the "
            "request is awaiting review."
        ),
        "cancellation_request": {
            "id": cancellation_request.id,
            "booking_id": cancellation_request.booking_id,
            "reason": cancellation_request.reason,
            "status": cancellation_request.status,
            "created_at": (
                cancellation_request.created_at.isoformat()
            )
        },
        "policy": {
            "minimum_notice_hours": 72,
            "eligible": True,
            "departure_date": departure.start_date.isoformat()
        }
    }), 201


# ---------------------------------------------------------
# GET A SINGLE BOOKING
# ---------------------------------------------------------

@booking_bp.route(
    "/booking/<int:booking_id>",
    methods=["GET"]
)
@jwt_required()
@roles_required("admin", "customer")
def get_booking(booking_id):

    # Automatically complete confirmed bookings whose
    # departure has already ended.
    update_completed_bookings()

    # Find the requested booking.
    booking = Booking.query.filter_by(
        id=booking_id
    ).first()

    if not booking:
        return jsonify({
            "message": "Booking not found"
        }), 404

    # Get the authenticated user.
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

    # Customers may only access their own bookings.
    #
    # Admins are allowed to access bookings generally.
    if current_user.role == "customer":

        if booking.user_id != current_user_id:
            return jsonify({
                "message": (
                    "You are not authorized to view this booking!"
                )
            }), 403

    return jsonify({
        "booking_id": booking.id,
        "user_id": booking.user_id,
        "departure_id": booking.departure_id,
        "number_of_people": booking.number_of_people,
        "price_per_person": float(
            booking.price_per_person
        ),
        "total_price": float(
            booking.total_price
        ),
        "status": booking.status,
        "expires_at": (
            booking.expires_at.isoformat()
            if booking.expires_at
            else None
        ),
        "created_at": booking.created_at.isoformat(),
        "updated_at": booking.updated_at.isoformat()
    }), 200


# ---------------------------------------------------------
# GET ALL BOOKINGS
# ---------------------------------------------------------

@booking_bp.route(
    "/bookings",
    methods=["GET"]
)
@jwt_required()
@roles_required(
    "admin",
    "customer",
    "tour_operator"
)
def get_bookings():

    # Automatically complete confirmed bookings whose
    # departure has already ended.
    update_completed_bookings()

    # Get the authenticated user's ID.
    current_user_id = int(
        get_jwt_identity()
    )

    # Find the authenticated user.
    current_user = User.query.filter_by(
        id=current_user_id
    ).first()

    if not current_user:
        return jsonify({
            "message": "User not found."
        }), 404

    # -----------------------------------------------------
    # ADMIN
    # -----------------------------------------------------

    if current_user.role == "admin":

        # Admins can see all bookings.
        bookings = Booking.query.all()

    # -----------------------------------------------------
    # TOUR OPERATOR
    # -----------------------------------------------------

    elif current_user.role == "tour_operator":

        # Tour operators only see bookings belonging to
        # their own tours.
        bookings = (
            Booking.query
            .join(Departure)
            .join(Tour)
            .filter(
                Tour.tour_operator_id == current_user_id
            )
            .all()
        )

    # -----------------------------------------------------
    # CUSTOMER
    # -----------------------------------------------------

    else:

        # Customers only see their own bookings.
        bookings = Booking.query.filter(
            Booking.user_id == current_user_id
        ).all()

    # -----------------------------------------------------
    # FORMAT BOOKINGS
    # -----------------------------------------------------

    booking_list = []

    for booking in bookings:

        # -----------------------------------------------------
        # GET THE LATEST CANCELLATION REQUEST
        # -----------------------------------------------------
        #
        # Return the latest request regardless of whether it is
        # pending, approved or denied. This allows the frontend
        # to keep showing the final cancellation decision after
        # the dashboard is refreshed.
        # -----------------------------------------------------

        latest_cancellation_request = (
            CancellationRequest.query
            .filter_by(booking_id=booking.id)
            .order_by(
                CancellationRequest.created_at.desc()
            )
            .first()
        )

        booking_list.append({
            "booking_id": booking.id,
            "user_id": booking.user_id,
            "departure_id": booking.departure_id,
            "number_of_people": booking.number_of_people,
            "price_per_person": float(
                booking.price_per_person
            ),
            "total_price": float(
                booking.total_price
            ),
            "status": booking.status,
            "cancellation_request": (
                {
                    "id": latest_cancellation_request.id,
                    "status": latest_cancellation_request.status,
                    "reason": latest_cancellation_request.reason,
                    "admin_reason": latest_cancellation_request.admin_reason,
                    "reviewed_by": latest_cancellation_request.reviewed_by,
                    "reviewed_at": (
                        latest_cancellation_request.reviewed_at.isoformat()
                        if latest_cancellation_request.reviewed_at
                        else None
                    ),
                    "created_at": (
                        latest_cancellation_request.created_at.isoformat()
                    )
                }
                if latest_cancellation_request
                else None
            ),
            "expires_at": (
                booking.expires_at.isoformat()
                if booking.expires_at
                else None
            ),
            "created_at": booking.created_at.isoformat(),
            "updated_at": booking.updated_at.isoformat()
        })

    return jsonify({
        "bookings": booking_list
    }), 200