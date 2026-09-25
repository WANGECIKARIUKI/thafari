from flask import Blueprint, jsonify, request
from flask_jwt_extended import (
    jwt_required,
    get_jwt_identity
)
from decorators.auth_decorator import roles_required
from models.user import User
from models.booking import Booking
from models.departure import Departure
from models.tour import Tour

from services.booking_service import (
    expired_pending_booking,
    calculate_available_seats,
    find_suggested_departures,
    create_pending_booking
)

from datetime import date

# Email service used to notify customers about new bookings.
from services.email_service import send_booking_created_email


# ---------------------------------------------------------
# BOOKING BLUEPRINT
# ---------------------------------------------------------

booking_bp = Blueprint(
    "booking",
    __name__,
    url_prefix="/api"
)


# ---------------------------------------------------------
# CREATE A BOOKING
# ---------------------------------------------------------

@booking_bp.route("/booking", methods=["POST"])
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
        "expires_at": booking.expires_at.isoformat()
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
# GET A SINGLE BOOKING
# ---------------------------------------------------------

@booking_bp.route(
    "/booking/<int:booking_id>",
    methods=["GET"]
)
@jwt_required()
@roles_required("admin", "customer")
def get_booking(booking_id):

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