# =========================================================
# THAFARI DEPARTURE ROUTES
# =========================================================
#
# This file contains endpoints for:
#
# - Creating departures
# - Getting public departures for a tour
# - Getting departures for admin/operator management
# - Updating departures
# - Deactivating departures
# - Reactivating departures
#
# A departure represents a specific scheduled trip of a tour.
#
# Example:
#
# Tour:
#     Tsavo Safari
#
# Departures:
#     10 October 2026 - 15 October 2026
#     15 November 2026 - 20 November 2026
#
# Each departure belongs to a specific tour through tour_id.
#
# IMPORTANT:
#
# Bookings belong to departures.
#
# Therefore we use soft deactivation instead of permanently
# deleting departures.
# =========================================================


from flask import Blueprint, jsonify, request

from flask_jwt_extended import (
    jwt_required,
    get_jwt_identity
)

from decorators.auth_decorator import roles_required

from datetime import datetime, date

from models.user import User
from models.tour import Tour
from models.departure import Departure
from models.booking import Booking

from extensions import db


# =========================================================
# DEPARTURE BLUEPRINT
# =========================================================

departure_bp = Blueprint(
    "departures",
    __name__,
    url_prefix="/api"
)


# =========================================================
# HELPER: GET CURRENT USER
# =========================================================
#
# Gets the currently authenticated user from the JWT.
# =========================================================

def get_current_user():

    current_user_id = int(
        get_jwt_identity()
    )

    return User.query.filter_by(
        id=current_user_id
    ).first()


# =========================================================
# HELPER: CHECK TOUR ACCESS
# =========================================================
#
# Admins can manage departures belonging to any tour.
#
# Tour operators can only manage departures belonging to
# their own tours.
#
# Returns:
#
# True  -> access allowed
# False -> access denied
# =========================================================

def can_manage_tour(
    current_user,
    tour
):

    if not current_user or not tour:

        return False


    if current_user.role == "admin":

        return True


    if (
        current_user.role == "tour_operator"
        and current_user.id == tour.tour_operator_id
    ):

        return True


    return False


# =========================================================
# HELPER: SERIALIZE DEPARTURE
# =========================================================
#
# Converts a Departure object into JSON-friendly data.
#
# available_seats is calculated from active bookings.
# =========================================================

def serialize_departure(
    departure
):

    # ---------------------------------------------------------
    # FIND BOOKINGS THAT CURRENTLY OCCUPY SEATS
    # ---------------------------------------------------------

    bookings = Booking.query.filter(
        Booking.departure_id == departure.id,
        Booking.status.in_([
            "pending",
            "confirmed"
        ])
    ).all()


    # ---------------------------------------------------------
    # CALCULATE TOTAL PEOPLE BOOKED
    # ---------------------------------------------------------

    total_booked = sum(
        booking.number_of_people
        for booking in bookings
    )


    # ---------------------------------------------------------
    # CALCULATE AVAILABLE SEATS
    # ---------------------------------------------------------

    available_seats = (
        departure.capacity - total_booked
    )


    return {

        "departure_id": departure.id,

        "tour_id": departure.tour_id,

        "capacity": departure.capacity,

        "available_seats": max(
            available_seats,
            0
        ),

        "start_date": (
            departure.start_date.isoformat()
        ),

        "end_date": (
            departure.end_date.isoformat()
        ),

        "price_per_person": (
            str(departure.price_per_person)
        ),

        "is_active": departure.is_active,

        "created_at": (
            departure.created_at.isoformat()
            if departure.created_at
            else None
        ),

        "updated_at": (
            departure.updated_at.isoformat()
            if departure.updated_at
            else None
        ),
    }


# =========================================================
# CREATE DEPARTURE
# =========================================================
#
# POST /api/departure
#
# Only admins and tour operators can create departures.
#
# Admin:
#     Can create for any tour.
#
# Tour operator:
#     Can only create for their own tours.
# =========================================================

@departure_bp.route(
    "/departure",
    methods=["POST"]
)
@jwt_required()
@roles_required(
    "admin",
    "tour_operator"
)
def create_departure():

    # ---------------------------------------------------------
    # GET REQUEST DATA
    # ---------------------------------------------------------

    data = request.get_json()


    if not data:

        return jsonify({
            "message": "Request body is required."
        }), 400


    # ---------------------------------------------------------
    # EXTRACT DATA
    # ---------------------------------------------------------

    tour_id = data.get("tour_id")

    capacity = data.get("capacity")

    price_per_person = data.get(
        "price_per_person"
    )

    start_date = data.get(
        "start_date"
    )

    end_date = data.get(
        "end_date"
    )


    # =========================================================
    # VALIDATE TOUR ID
    # =========================================================

    if (
        not isinstance(tour_id, int)
        or tour_id <= 0
    ):

        return jsonify({
            "message": (
                "Tour id is required and "
                "should be greater than 0."
            )
        }), 400


    # =========================================================
    # VALIDATE CAPACITY
    # =========================================================

    if (
        not isinstance(capacity, int)
        or capacity <= 0
    ):

        return jsonify({
            "message": (
                "Capacity is required and "
                "should be greater than 0."
            )
        }), 400


    # =========================================================
    # VALIDATE PRICE
    # =========================================================

    if (
        not isinstance(
            price_per_person,
            (int, float)
        )
        or price_per_person <= 0
    ):

        return jsonify({
            "message": (
                "Price per person is required "
                "and should be greater than 0."
            )
        }), 400


    # =========================================================
    # VALIDATE START DATE
    # =========================================================

    if not start_date:

        return jsonify({
            "message": "Start date is required."
        }), 400


    try:

        start_date = datetime.strptime(
            start_date,
            "%Y-%m-%d"
        ).date()

    except (
        ValueError,
        TypeError
    ):

        return jsonify({
            "message": (
                "Wrong start date format. "
                "Use YYYY-MM-DD."
            )
        }), 400


    # =========================================================
    # VALIDATE END DATE
    # =========================================================

    if not end_date:

        return jsonify({
            "message": "End date is required."
        }), 400


    try:

        end_date = datetime.strptime(
            end_date,
            "%Y-%m-%d"
        ).date()

    except (
        ValueError,
        TypeError
    ):

        return jsonify({
            "message": (
                "Wrong end date format. "
                "Use YYYY-MM-DD."
            )
        }), 400


    # =========================================================
    # VALIDATE DATE ORDER
    # =========================================================

    if end_date < start_date:

        return jsonify({
            "message": (
                "End date should be the same as "
                "or after the start date."
            )
        }), 400


    # =========================================================
    # GET CURRENT USER
    # =========================================================

    current_user = get_current_user()


    if not current_user:

        return jsonify({
            "message": "User not found."
        }), 404


    # =========================================================
    # FIND TOUR
    # =========================================================

    tour = Tour.query.filter_by(
        id=tour_id
    ).first()


    if not tour:

        return jsonify({
            "message": "Tour not found."
        }), 404


    # =========================================================
    # CHECK TOUR ACCESS
    # =========================================================

    if not can_manage_tour(
        current_user,
        tour
    ):

        return jsonify({
            "message": "Access denied!"
        }), 403


    # =========================================================
    # CREATE DEPARTURE
    # =========================================================

    departure = Departure(

        tour_id=tour.id,

        capacity=capacity,

        price_per_person=price_per_person,

        start_date=start_date,

        end_date=end_date,

        is_active=True
    )


    # =========================================================
    # SAVE
    # =========================================================

    db.session.add(
        departure
    )

    db.session.commit()


    # =========================================================
    # RETURN SUCCESS
    # =========================================================

    return jsonify({

        "message": (
            "Departure is created successfully."
        ),

        "departure": serialize_departure(
            departure
        )

    }), 201


# =========================================================
# GET PUBLIC DEPARTURES
# =========================================================
#
# GET /api/tours/<tour_id>/departures
#
# This endpoint remains public.
#
# Customers only receive:
#
# - Active departures
# - Departures that have not ended
# =========================================================

@departure_bp.route(
    "/tours/<int:tour_id>/departures",
    methods=["GET"]
)
def get_tour_departures(
    tour_id
):

    # ---------------------------------------------------------
    # FIND TOUR
    # ---------------------------------------------------------

    tour = Tour.query.filter_by(
        id=tour_id
    ).first()


    if not tour:

        return jsonify({
            "message": "Tour not found."
        }), 404


    # ---------------------------------------------------------
    # TODAY
    # ---------------------------------------------------------

    today = date.today()


    # ---------------------------------------------------------
    # GET ACTIVE UPCOMING DEPARTURES
    # ---------------------------------------------------------

    departures = Departure.query.filter(

        Departure.tour_id == tour.id,

        Departure.is_active == True,

        Departure.end_date >= today

    ).order_by(

        Departure.start_date.asc()

    ).all()


    # ---------------------------------------------------------
    # SERIALIZE
    # ---------------------------------------------------------

    departure_list = [

        serialize_departure(
            departure
        )

        for departure in departures
    ]


    # =========================================================
    # RETURN
    # =========================================================

    return jsonify({

        "tour_id": tour.id,

        "tour_name": tour.tour_name,

        "destination": tour.destination,

        "departures": departure_list

    }), 200


# =========================================================
# GET MANAGEABLE DEPARTURES
# =========================================================
#
# GET /api/tours/<tour_id>/departures/manage
#
# Admins can access any tour.
#
# Tour operators can only access their own tours.
#
# Unlike the public endpoint, this endpoint returns both
# active and inactive departures.
# =========================================================

@departure_bp.route(
    "/tours/<int:tour_id>/departures/manage",
    methods=["GET"]
)
@jwt_required()
@roles_required(
    "admin",
    "tour_operator"
)
def get_manageable_departures(
    tour_id
):

    # ---------------------------------------------------------
    # GET CURRENT USER
    # ---------------------------------------------------------

    current_user = get_current_user()


    if not current_user:

        return jsonify({
            "message": "User not found."
        }), 404


    # ---------------------------------------------------------
    # FIND TOUR
    # ---------------------------------------------------------

    tour = Tour.query.filter_by(
        id=tour_id
    ).first()


    if not tour:

        return jsonify({
            "message": "Tour not found."
        }), 404


    # ---------------------------------------------------------
    # CHECK ACCESS
    # ---------------------------------------------------------

    if not can_manage_tour(
        current_user,
        tour
    ):

        return jsonify({
            "message": "Access denied!"
        }), 403


    # ---------------------------------------------------------
    # GET ALL DEPARTURES
    # ---------------------------------------------------------

    departures = Departure.query.filter_by(
        tour_id=tour.id
    ).order_by(
        Departure.start_date.asc()
    ).all()


    # ---------------------------------------------------------
    # RETURN
    # ---------------------------------------------------------

    return jsonify({

        "tour_id": tour.id,

        "tour_name": tour.tour_name,

        "departures": [

            serialize_departure(
                departure
            )

            for departure in departures
        ]

    }), 200


# =========================================================
# UPDATE DEPARTURE
# =========================================================
#
# PATCH /api/departures/<departure_id>
#
# Admins can edit any departure.
#
# Tour operators can edit departures belonging to their
# own tours.
# =========================================================

@departure_bp.route(
    "/departures/<int:departure_id>",
    methods=["PATCH"]
)
@jwt_required()
@roles_required(
    "admin",
    "tour_operator"
)
def update_departure(
    departure_id
):

    # ---------------------------------------------------------
    # GET CURRENT USER
    # ---------------------------------------------------------

    current_user = get_current_user()


    if not current_user:

        return jsonify({
            "message": "User not found."
        }), 404


    # ---------------------------------------------------------
    # FIND DEPARTURE
    # ---------------------------------------------------------

    departure = Departure.query.filter_by(
        id=departure_id
    ).first()


    if not departure:

        return jsonify({
            "message": "Departure not found."
        }), 404


    # ---------------------------------------------------------
    # FIND TOUR
    # ---------------------------------------------------------

    tour = Tour.query.filter_by(
        id=departure.tour_id
    ).first()


    if not tour:

        return jsonify({
            "message": "Tour not found."
        }), 404


    # ---------------------------------------------------------
    # CHECK ACCESS
    # ---------------------------------------------------------

    if not can_manage_tour(
        current_user,
        tour
    ):

        return jsonify({
            "message": "Access denied!"
        }), 403


    # ---------------------------------------------------------
    # REQUEST BODY
    # ---------------------------------------------------------

    data = request.get_json()


    if not data:

        return jsonify({
            "message": "Request body is required."
        }), 400


    # =========================================================
    # CURRENT VALUES
    # =========================================================

    new_capacity = data.get(
        "capacity",
        departure.capacity
    )

    new_price = data.get(
        "price_per_person",
        departure.price_per_person
    )

    new_start_date = data.get(
        "start_date"
    )

    new_end_date = data.get(
        "end_date"
    )


    # =========================================================
    # VALIDATE CAPACITY
    # =========================================================

    if (
        not isinstance(
            new_capacity,
            int
        )
        or new_capacity <= 0
    ):

        return jsonify({
            "message": (
                "Capacity should be greater than 0."
            )
        }), 400


    # =========================================================
    # CHECK EXISTING BOOKINGS
    # =========================================================

    bookings = Booking.query.filter(
        Booking.departure_id == departure.id,
        Booking.status.in_([
            "pending",
            "confirmed"
        ])
    ).all()


    booked_people = sum(
        booking.number_of_people
        for booking in bookings
    )


    # ---------------------------------------------------------
    # CAPACITY CANNOT DROP BELOW CURRENT BOOKINGS
    # ---------------------------------------------------------

    if new_capacity < booked_people:

        return jsonify({
            "message": (
                f"Capacity cannot be reduced below "
                f"{booked_people} people already booked."
            )
        }), 400


    # =========================================================
    # VALIDATE PRICE
    # =========================================================

    if (
        not isinstance(
            new_price,
            (int, float)
        )
        or float(new_price) <= 0
    ):

        return jsonify({
            "message": (
                "Price per person should be "
                "greater than 0."
            )
        }), 400


    # =========================================================
    # VALIDATE START DATE
    # =========================================================

    if new_start_date:

        try:

            new_start_date = datetime.strptime(
                new_start_date,
                "%Y-%m-%d"
            ).date()

        except (
            ValueError,
            TypeError
        ):

            return jsonify({
                "message": (
                    "Wrong start date format. "
                    "Use YYYY-MM-DD."
                )
            }), 400

    else:

        new_start_date = departure.start_date


    # =========================================================
    # VALIDATE END DATE
    # =========================================================

    if new_end_date:

        try:

            new_end_date = datetime.strptime(
                new_end_date,
                "%Y-%m-%d"
            ).date()

        except (
            ValueError,
            TypeError
        ):

            return jsonify({
                "message": (
                    "Wrong end date format. "
                    "Use YYYY-MM-DD."
                )
            }), 400

    else:

        new_end_date = departure.end_date


    # =========================================================
    # VALIDATE DATE ORDER
    # =========================================================

    if new_end_date < new_start_date:

        return jsonify({
            "message": (
                "End date should be the same as "
                "or after the start date."
            )
        }), 400


    # =========================================================
    # UPDATE FIELDS
    # =========================================================

    departure.capacity = new_capacity

    departure.price_per_person = new_price

    departure.start_date = new_start_date

    departure.end_date = new_end_date


    # ---------------------------------------------------------
    # OPTIONAL STATUS UPDATE
    # ---------------------------------------------------------

    if "is_active" in data:

        departure.is_active = bool(
            data["is_active"]
        )


    # =========================================================
    # SAVE
    # =========================================================

    db.session.commit()


    # =========================================================
    # RETURN
    # =========================================================

    return jsonify({

        "message": (
            "Departure updated successfully."
        ),

        "departure": serialize_departure(
            departure
        )

    }), 200


# =========================================================
# DEACTIVATE DEPARTURE
# =========================================================
#
# DELETE /api/departures/<departure_id>
#
# This is a SOFT DELETE.
#
# We do not physically delete the record because bookings
# may already reference this departure.
# =========================================================

@departure_bp.route(
    "/departures/<int:departure_id>",
    methods=["DELETE"]
)
@jwt_required()
@roles_required(
    "admin",
    "tour_operator"
)
def deactivate_departure(
    departure_id
):

    # ---------------------------------------------------------
    # GET CURRENT USER
    # ---------------------------------------------------------

    current_user = get_current_user()


    if not current_user:

        return jsonify({
            "message": "User not found."
        }), 404


    # ---------------------------------------------------------
    # FIND DEPARTURE
    # ---------------------------------------------------------

    departure = Departure.query.filter_by(
        id=departure_id
    ).first()


    if not departure:

        return jsonify({
            "message": "Departure not found."
        }), 404


    # ---------------------------------------------------------
    # FIND TOUR
    # ---------------------------------------------------------

    tour = Tour.query.filter_by(
        id=departure.tour_id
    ).first()


    if not tour:

        return jsonify({
            "message": "Tour not found."
        }), 404


    # ---------------------------------------------------------
    # CHECK ACCESS
    # ---------------------------------------------------------

    if not can_manage_tour(
        current_user,
        tour
    ):

        return jsonify({
            "message": "Access denied!"
        }), 403


    # =========================================================
    # DEACTIVATE
    # =========================================================

    departure.is_active = False

    db.session.commit()


    return jsonify({

        "message": (
            "Departure deactivated successfully."
        ),

        "departure_id": departure.id

    }), 200


# =========================================================
# REACTIVATE DEPARTURE
# =========================================================
#
# PATCH /api/departures/<departure_id>/reactivate
# =========================================================

@departure_bp.route(
    "/departures/<int:departure_id>/reactivate",
    methods=["PATCH"]
)
@jwt_required()
@roles_required(
    "admin",
    "tour_operator"
)
def reactivate_departure(
    departure_id
):

    # ---------------------------------------------------------
    # GET CURRENT USER
    # ---------------------------------------------------------

    current_user = get_current_user()


    if not current_user:

        return jsonify({
            "message": "User not found."
        }), 404


    # ---------------------------------------------------------
    # FIND DEPARTURE
    # ---------------------------------------------------------

    departure = Departure.query.filter_by(
        id=departure_id
    ).first()


    if not departure:

        return jsonify({
            "message": "Departure not found."
        }), 404


    # ---------------------------------------------------------
    # FIND TOUR
    # ---------------------------------------------------------

    tour = Tour.query.filter_by(
        id=departure.tour_id
    ).first()


    if not tour:

        return jsonify({
            "message": "Tour not found."
        }), 404


    # ---------------------------------------------------------
    # CHECK ACCESS
    # ---------------------------------------------------------

    if not can_manage_tour(
        current_user,
        tour
    ):

        return jsonify({
            "message": "Access denied!"
        }), 403


    # =========================================================
    # REACTIVATE
    # =========================================================

    departure.is_active = True

    db.session.commit()


    return jsonify({

        "message": (
            "Departure reactivated successfully."
        ),

        "departure": serialize_departure(
            departure
        )

    }), 200