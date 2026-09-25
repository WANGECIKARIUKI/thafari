# =========================================================
# THAFARI DEPARTURE ROUTES
# =========================================================
#
# This file contains endpoints for:
#
# - Creating departures
# - Getting active departures for a specific tour
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
# CREATE DEPARTURE
# =========================================================
#
# POST /api/departure
#
# Only admins and tour operators can create departures.
#
# The tour_id tells us which tour this departure belongs to.
# =========================================================

@departure_bp.route(
    "/departure",
    methods=["POST"]
)
@jwt_required()
@roles_required("admin", "tour_operator")
def create_departure():

    # ---------------------------------------------------------
    # GET REQUEST DATA
    # ---------------------------------------------------------

    data = request.get_json()


    # ---------------------------------------------------------
    # CHECK REQUEST BODY
    # ---------------------------------------------------------

    if not data:

        return jsonify({
            "message": "Request body is required."
        }), 400


    # ---------------------------------------------------------
    # EXTRACT DATA
    # ---------------------------------------------------------

    tour_id = data.get("tour_id")

    capacity = data.get("capacity")

    price_per_person = data.get("price_per_person")

    start_date = data.get("start_date")

    end_date = data.get("end_date")


    # =========================================================
    # VALIDATE TOUR ID
    # =========================================================

    if not isinstance(tour_id, int) or tour_id <= 0:

        return jsonify({
            "message": (
                "Tour id is required and should be greater than 0."
            )
        }), 400


    # =========================================================
    # VALIDATE CAPACITY
    # =========================================================

    if not isinstance(capacity, int) or capacity <= 0:

        return jsonify({
            "message": (
                "Capacity is required and should be greater than 0."
            )
        }), 400


    # =========================================================
    # VALIDATE PRICE
    # =========================================================

    if (
        not isinstance(price_per_person, (int, float))
        or price_per_person <= 0
    ):

        return jsonify({
            "message": (
                "Price per person is required and "
                "should be greater than 0."
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

    except (ValueError, TypeError):

        return jsonify({
            "message": (
                "Wrong format used. "
                "Use correct format: YYYY-MM-DD"
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

    except (ValueError, TypeError):

        return jsonify({
            "message": (
                "Wrong format used. "
                "Use correct format: YYYY-MM-DD"
            )
        }), 400


    # =========================================================
    # VALIDATE DATE ORDER
    # =========================================================

    if end_date < start_date:

        return jsonify({
            "message": (
                "End date should be same as or "
                "after start date."
            )
        }), 400


    # =========================================================
    # GET CURRENT USER
    # =========================================================

    current_user_id = int(
        get_jwt_identity()
    )


    current_user = User.query.filter_by(
        id=current_user_id
    ).first()


    # =========================================================
    # FIND TOUR
    # =========================================================

    tour = Tour.query.filter_by(
        id=tour_id
    ).first()


    # ---------------------------------------------------------
    # TOUR NOT FOUND
    # ---------------------------------------------------------

    if not tour:

        return jsonify({
            "message": "Tour not found."
        }), 404


    # =========================================================
    # AUTHORIZATION
    # =========================================================
    #
    # Admins can create departures for any tour.
    #
    # Tour operators can only create departures for tours
    # that belong to them.
    # =========================================================

    if (
        current_user.role != "admin"
        and current_user_id != tour.tour_operator_id
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
        end_date=end_date
    )


    # =========================================================
    # SAVE DEPARTURE
    # =========================================================

    db.session.add(departure)

    db.session.commit()


    # =========================================================
    # RETURN SUCCESS RESPONSE
    # =========================================================
    #
    # departure.id is returned so the frontend can identify
    # this specific scheduled departure later when creating
    # a booking.
    # =========================================================

    return jsonify({
        "message": "Departure is created successfully.",
        "departure_id": departure.id,
        "tour_id": departure.tour_id,
        "capacity": departure.capacity,
        "start_date": departure.start_date.isoformat(),
        "end_date": departure.end_date.isoformat(),
        "price_per_person": str(departure.price_per_person)
    }), 201


# =========================================================
# GET DEPARTURES FOR A SPECIFIC TOUR
# =========================================================
#
# GET /api/tours/<tour_id>/departures
#
# This endpoint returns active upcoming departures belonging
# to the selected tour.
#
# The frontend will use the tour ID to retrieve the available
# departures.
# =========================================================

@departure_bp.route(
    "/tours/<int:tour_id>/departures",
    methods=["GET"]
)
def get_tour_departure(tour_id):

    # =========================================================
    # FIND TOUR
    # =========================================================

    tour = Tour.query.filter_by(
        id=tour_id
    ).first()


    # ---------------------------------------------------------
    # TOUR NOT FOUND
    # ---------------------------------------------------------

    if not tour:

        return jsonify({
            "message": "Tour not found."
        }), 404


    # =========================================================
    # GET TODAY'S DATE
    # =========================================================

    today = date.today()


    # =========================================================
    # GET ACTIVE UPCOMING DEPARTURES
    # =========================================================
    #
    # We only return departures that:
    #
    # 1. Belong to this tour
    # 2. Are active
    # 3. Have not already ended
    # =========================================================

    departures = Departure.query.filter(
        Departure.tour_id == tour.id,
        Departure.is_active == True,
        Departure.end_date >= today
    ).all()


    # =========================================================
    # CREATE DEPARTURE LIST
    # =========================================================

    departure_list = []


    # =========================================================
    # CALCULATE AVAILABLE SEATS
    # =========================================================

    for departure in departures:

        # -----------------------------------------------------
        # GET BOOKINGS OCCUPYING SEATS
        # -----------------------------------------------------
        #
        # Pending and confirmed bookings currently occupy
        # seats.
        # -----------------------------------------------------

        bookings = Booking.query.filter(
            Booking.departure_id == departure.id,
            Booking.status.in_([
                "pending",
                "confirmed"
            ])
        ).all()


        # -----------------------------------------------------
        # CALCULATE TOTAL BOOKED PEOPLE
        # -----------------------------------------------------

        total_booked = 0


        for booking in bookings:

            total_booked += booking.number_of_people


        # -----------------------------------------------------
        # CALCULATE AVAILABLE SEATS
        # -----------------------------------------------------

        available_seats = (
            departure.capacity - total_booked
        )


        # =====================================================
        # ADD DEPARTURE TO RESPONSE
        # =====================================================
        #
        # IMPORTANT:
        #
        # departure_id is included here because the frontend
        # will eventually need it when creating a booking.
        # =====================================================

        departure_list.append({

            "departure_id": departure.id,

            "tour_id": departure.tour_id,

            "capacity": departure.capacity,

            "available_seats": available_seats,

            "start_date": (
                departure.start_date.isoformat()
            ),

            "end_date": (
                departure.end_date.isoformat()
            ),

            "price_per_person": (
                str(departure.price_per_person)
            )
        })


    # =========================================================
    # RETURN DEPARTURES
    # =========================================================

    return jsonify({

        "tour_id": tour.id,

        "tour_name": tour.tour_name,

        "destination": tour.destination,

        "departures": departure_list

    }), 200