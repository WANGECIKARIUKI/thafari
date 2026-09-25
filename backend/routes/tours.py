# =========================================================
# THAFARI TOUR ROUTES
# =========================================================
#
# These routes handle safari packages.
#
# Available routes:
#
# POST /api/tour
#     Create a new safari package.
#
# GET /api/tours
#     Get all safari packages.
#
# GET /api/tours/<tour_id>
#     Get the complete details of one safari package.
#
# PATCH /api/tours/<tour_id>/images
#     Add or update safari images.
#
# =========================================================


from flask import Blueprint, jsonify, request

from flask_jwt_extended import (
    jwt_required,
    get_jwt_identity
)

from decorators.auth_decorator import roles_required

from models.user import User
from models.tour import Tour
from models.departure import Departure

from extensions import db

from datetime import date


tour_bp = Blueprint(
    "tour",
    __name__,
    url_prefix="/api"
)


# =========================================================
# HELPER: VALIDATE TOUR IMAGES
# =========================================================
#
# This helper keeps our image validation in one place.
#
# cover_image:
#     Optional string.
#
# gallery_images:
#     Optional list containing only strings.
#
# We are storing image URLs for now rather than actual
# image files.
#
# =========================================================


def validate_tour_images(cover_image, gallery_images):

    # -----------------------------------------------------
    # VALIDATE COVER IMAGE
    # -----------------------------------------------------

    if cover_image is not None:

        if not isinstance(cover_image, str):
            return (
                "Cover image should be a text URL."
            )

        if not cover_image.strip():
            return (
                "Cover image cannot be empty."
            )

    # -----------------------------------------------------
    # VALIDATE GALLERY IMAGES
    # -----------------------------------------------------

    if gallery_images is not None:

        if not isinstance(gallery_images, list):
            return (
                "Gallery images should be a list."
            )

        for image in gallery_images:

            if not isinstance(image, str):
                return (
                    "Every gallery image should be a text URL."
                )

            if not image.strip():
                return (
                    "Gallery image URLs cannot be empty."
                )

    return None


# =========================================================
# CREATE A TOUR
# =========================================================
#
# POST /api/tour
#
# Protected:
#
# JWT
#     ↓
# admin OR tour_operator
#
# =========================================================


@tour_bp.route("/tour", methods=["POST"])
@jwt_required()
@roles_required("admin", "tour_operator")
def create_tour():

    # -----------------------------------------------------
    # GET REQUEST DATA
    # -----------------------------------------------------

    data = request.get_json()

    if not data:
        return jsonify({
            "message": "Request body is required."
        }), 400

    # -----------------------------------------------------
    # EXTRACT TOUR DATA
    # -----------------------------------------------------

    tour_name = data.get("tour_name")

    charges = data.get("charges")

    destination = data.get("destination")

    description = data.get("description")

    duration_days = data.get("duration_days")

    duration_nights = data.get("duration_nights")

    cover_image = data.get("cover_image")

    gallery_images = data.get("gallery_images")


    # =====================================================
    # VALIDATE TOUR NAME
    # =====================================================

    if not isinstance(tour_name, str) or not tour_name.strip():

        return jsonify({
            "message": "Tour name is required."
        }), 400


    # =====================================================
    # VALIDATE CHARGES
    # =====================================================

    if (
        not isinstance(charges, (int, float))
        or charges <= 0
    ):

        return jsonify({
            "message": (
                "Charges is required and should be "
                "greater than 0."
            )
        }), 400


    # =====================================================
    # VALIDATE DESTINATION
    # =====================================================

    if (
        not isinstance(destination, str)
        or not destination.strip()
    ):

        return jsonify({
            "message": "Destination is required."
        }), 400


    # =====================================================
    # VALIDATE DESCRIPTION
    # =====================================================

    if description is not None:

        if not isinstance(description, str):

            return jsonify({
                "message": "Description should be text."
            }), 400

        description = description.strip()

        if not description:

            description = None


    # =====================================================
    # VALIDATE DURATION DAYS
    # =====================================================

    if duration_days is not None:

        if not isinstance(duration_days, int):

            return jsonify({
                "message": (
                    "Duration days should be "
                    "a whole number."
                )
            }), 400

        if duration_days <= 0:

            return jsonify({
                "message": (
                    "Duration days should be "
                    "greater than 0."
                )
            }), 400


    # =====================================================
    # VALIDATE DURATION NIGHTS
    # =====================================================

    if duration_nights is not None:

        if not isinstance(duration_nights, int):

            return jsonify({
                "message": (
                    "Duration nights should be "
                    "a whole number."
                )
            }), 400

        if duration_nights < 0:

            return jsonify({
                "message": (
                    "Duration nights cannot "
                    "be negative."
                )
            }), 400


    # =====================================================
    # VALIDATE DAYS / NIGHTS RELATIONSHIP
    # =====================================================

    if (
        duration_days is not None
        and duration_nights is not None
        and duration_nights >= duration_days
    ):

        return jsonify({
            "message": (
                "Duration nights should be "
                "less than duration days."
            )
        }), 400


    # =====================================================
    # VALIDATE TOUR IMAGES
    # =====================================================

    image_error = validate_tour_images(
        cover_image,
        gallery_images
    )

    if image_error:

        return jsonify({
            "message": image_error
        }), 400


    # =====================================================
    # GET CURRENT USER
    # =====================================================

    current_user_id = int(
        get_jwt_identity()
    )


    # =====================================================
    # FIND CURRENT USER
    # =====================================================

    current_user = User.query.filter_by(
        id=current_user_id
    ).first()

    if not current_user:

        return jsonify({
            "message": "Access denied!"
        }), 403


    # =====================================================
    # CREATE TOUR
    # =====================================================

    tour = Tour(

        tour_name=tour_name.strip(),

        charges=charges,

        destination=destination.strip(),

        description=description,

        duration_days=duration_days,

        duration_nights=duration_nights,

        cover_image=(
            cover_image.strip()
            if cover_image
            else None
        ),

        gallery_images=(
            [
                image.strip()
                for image in gallery_images
            ]
            if gallery_images is not None
            else None
        ),

        tour_operator_id=current_user_id
    )


    # Add tour to database session
    db.session.add(tour)


    # Save tour
    db.session.commit()


    # =====================================================
    # RETURN CREATED TOUR
    # =====================================================

    return jsonify({

        "message": "Tour is created successfully.",

        "tour_id": tour.id,

        "tour_name": tour.tour_name,

        "charges": str(tour.charges),

        "destination": tour.destination,

        "description": tour.description,

        "duration_days": tour.duration_days,

        "duration_nights": tour.duration_nights,

        "cover_image": tour.cover_image,

        "gallery_images": tour.gallery_images,

        "tour_operator_id": current_user_id

    }), 201


# =========================================================
# GET ALL TOURS
# =========================================================
#
# GET /api/tours
#
# The starting price is calculated from the cheapest
# currently bookable departure for each tour.
#
# =========================================================


@tour_bp.route("/tours", methods=["GET"])
def get_tours():

    # Retrieve all tours
    tours = Tour.query.all()

    tours_list = []

    today = date.today()


    # -----------------------------------------------------
    # LOOP THROUGH TOURS
    # -----------------------------------------------------

    for tour in tours:

        # -------------------------------------------------
        # FIND UPCOMING BOOKABLE DEPARTURES
        # -------------------------------------------------

        upcoming_departures = Departure.query.filter(

            Departure.tour_id == tour.id,

            Departure.is_active == True,

            Departure.start_date > today

        ).all()


        # -------------------------------------------------
        # CALCULATE STARTING PRICE
        # -------------------------------------------------

        starting_price = None

        if upcoming_departures:

            starting_price = min(
                departure.price_per_person
                for departure in upcoming_departures
            )


        # -------------------------------------------------
        # ADD TOUR TO RESPONSE
        # -------------------------------------------------

        tours_list.append({

            "tour_id": tour.id,

            "tour_name": tour.tour_name,

            "destination": tour.destination,

            "starting_price": (
                str(starting_price)
                if starting_price is not None
                else None
            ),

            "cover_image": tour.cover_image,

            "gallery_images": (
                tour.gallery_images
                if tour.gallery_images
                else []
            )

        })


    # -----------------------------------------------------
    # RETURN TOURS
    # -----------------------------------------------------

    return jsonify({

        "tours": tours_list

    }), 200


# =========================================================
# GET COMPLETE TOUR PACKAGE
# =========================================================
#
# GET /api/tours/<tour_id>
#
# Returns:
#
# - Basic tour information
# - Description
# - Duration
# - Cover image
# - Gallery images
# - Itinerary
# - Accommodation
# - FAQs
# - Upcoming departures
#
# =========================================================


@tour_bp.route(
    "/tours/<int:tour_id>",
    methods=["GET"]
)
def get_tour_details(tour_id):

    # -----------------------------------------------------
    # FIND TOUR
    # -----------------------------------------------------

    tour = Tour.query.filter_by(
        id=tour_id
    ).first()

    if not tour:

        return jsonify({
            "message": "Tour not found."
        }), 404


    # -----------------------------------------------------
    # TODAY'S DATE
    # -----------------------------------------------------

    today = date.today()


    # -----------------------------------------------------
    # GET UPCOMING ACTIVE DEPARTURES
    # -----------------------------------------------------

    departures = Departure.query.filter(

        Departure.tour_id == tour.id,

        Departure.is_active == True,

        Departure.start_date > today

    ).order_by(

        Departure.start_date.asc()

    ).all()


    # -----------------------------------------------------
    # BUILD DEPARTURE DATA
    # -----------------------------------------------------

    departure_list = []


    for departure in departures:

        bookings = departure.bookings

        total_booked = 0


        # -----------------------------------------------
        # COUNT HELD / CONFIRMED SEATS
        # -----------------------------------------------

        for booking in bookings:

            if booking.status in [
                "pending",
                "confirmed"
            ]:

                total_booked += (
                    booking.number_of_people
                )


        # -----------------------------------------------
        # CALCULATE AVAILABLE SEATS
        # -----------------------------------------------

        available_seats = (
            departure.capacity
            - total_booked
        )


        if available_seats < 0:

            available_seats = 0


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

            "price_per_person": str(
                departure.price_per_person
            )

        })


    # =====================================================
    # BUILD ITINERARY DATA
    # =====================================================

    itinerary_list = []


    for itinerary in tour.itineraries:

        itinerary_list.append({

            "itinerary_id": itinerary.id,

            "day_number": itinerary.day_number,

            "title": itinerary.title,

            "description": itinerary.description

        })


    # =====================================================
    # BUILD ACCOMMODATION DATA
    # =====================================================

    accommodation_list = []


    for accommodation in tour.accommodations:

        accommodation_list.append({

            "accommodation_id": (
                accommodation.id
            ),

            "name": accommodation.name,

            "category": accommodation.category,

            "location": accommodation.location,

            "room_type": accommodation.room_type,

            "meal_plan": accommodation.meal_plan,

            "description": (
                accommodation.description
            )

        })


    # =====================================================
    # BUILD FAQ DATA
    # =====================================================

    faq_list = []


    for faq in tour.faqs:

        faq_list.append({

            "faq_id": faq.id,

            "question": faq.question,

            "answer": faq.answer

        })


    # =====================================================
    # RETURN COMPLETE SAFARI PACKAGE
    # =====================================================

    return jsonify({

        "tour_id": tour.id,

        "tour_name": tour.tour_name,

        "destination": tour.destination,

        "description": tour.description,

        "duration_days": tour.duration_days,

        "duration_nights": tour.duration_nights,

        "cover_image": tour.cover_image,

        "gallery_images": (
            tour.gallery_images
            if tour.gallery_images
            else []
        ),

        "itineraries": itinerary_list,

        "accommodations": accommodation_list,

        "faqs": faq_list,

        "departures": departure_list

    }), 200


# =========================================================
# UPDATE TOUR IMAGES
# =========================================================
#
# PATCH /api/tours/<tour_id>/images
#
# This allows us to add or replace images for an existing
# tour without creating a new tour.
#
# Only:
#
# - admin
# - tour_operator
#
# can use this endpoint.
#
# A tour operator can only update images for their own tour.
#
# =========================================================


@tour_bp.route(
    "/tours/<int:tour_id>/images",
    methods=["PATCH"]
)
@jwt_required()
@roles_required("admin", "tour_operator")
def update_tour_images(tour_id):

    # -----------------------------------------------------
    # GET REQUEST DATA
    # -----------------------------------------------------

    data = request.get_json()

    if not data:

        return jsonify({
            "message": "Request body is required."
        }), 400


    # -----------------------------------------------------
    # GET IMAGE DATA
    # -----------------------------------------------------

    cover_image = data.get(
        "cover_image"
    )

    gallery_images = data.get(
        "gallery_images"
    )


    # -----------------------------------------------------
    # VALIDATE THAT AT LEAST ONE IMAGE FIELD WAS SENT
    # -----------------------------------------------------

    if (
        "cover_image" not in data
        and "gallery_images" not in data
    ):

        return jsonify({
            "message": (
                "Provide cover_image or gallery_images."
            )
        }), 400


    # -----------------------------------------------------
    # VALIDATE IMAGES
    # -----------------------------------------------------

    image_error = validate_tour_images(
        cover_image,
        gallery_images
    )

    if image_error:

        return jsonify({
            "message": image_error
        }), 400


    # =====================================================
    # GET CURRENT USER
    # =====================================================

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


    # =====================================================
    # FIND TOUR
    # =====================================================

    tour = Tour.query.filter_by(
        id=tour_id
    ).first()


    if not tour:

        return jsonify({
            "message": "Tour not found."
        }), 404


    # =====================================================
    # CHECK TOUR OWNERSHIP
    # =====================================================

    if (
        current_user.role != "admin"
        and tour.tour_operator_id != current_user_id
    ):

        return jsonify({
            "message": (
                "You are not authorized to "
                "manage this tour."
            )
        }), 403


    # =====================================================
    # UPDATE COVER IMAGE
    # =====================================================
    #
    # Only update the field if the client actually sent it.
    #
    # This means:
    #
    # PATCH with gallery_images only
    #
    # will NOT accidentally erase the cover image.
    #
    # =====================================================

    if "cover_image" in data:

        tour.cover_image = (
            cover_image.strip()
            if cover_image
            else None
        )


    # =====================================================
    # UPDATE GALLERY IMAGES
    # =====================================================

    if "gallery_images" in data:

        tour.gallery_images = [

            image.strip()

            for image in gallery_images

        ] if gallery_images is not None else []


    # =====================================================
    # SAVE CHANGES
    # =====================================================

    db.session.commit()


    # =====================================================
    # RETURN UPDATED IMAGES
    # =====================================================

    return jsonify({

        "message": (
            "Tour images updated successfully."
        ),

        "tour_id": tour.id,

        "cover_image": tour.cover_image,

        "gallery_images": (
            tour.gallery_images
            if tour.gallery_images
            else []
        )

    }), 200