# =========================================================
# THAFARI TOUR ROUTES
# =========================================================
#
# These routes handle safari packages.
#
# PUBLIC ROUTES
#
# GET /api/tours
#     Get active safari packages available to customers.
#
# GET /api/tours/<tour_id>
#     Get complete details of an active safari package.
#
#
# STAFF MANAGEMENT ROUTES
#
# GET /api/tours/manage
#     Admin:
#         Get all tours.
#
#     Tour operator:
#         Get only their own tours.
#
# POST /api/tour
#     Admin:
#         Create a tour and assign it to a tour operator.
#
#     Tour operator:
#         Create a tour assigned automatically to themselves.
#
# PATCH /api/tours/<tour_id>
#     Admin:
#         Edit any tour.
#
#     Tour operator:
#         Edit only their own tour.
#
# DELETE /api/tours/<tour_id>
#     Soft-delete/deactivate a tour.
#
#     The database record is NOT physically deleted because
#     historical bookings must remain safe.
#
#
# IMAGE MANAGEMENT
#
# PATCH /api/tours/<tour_id>/images
#     Update cover and gallery images.
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


# =========================================================
# BLUEPRINT
# =========================================================

tour_bp = Blueprint(
    "tour",
    __name__,
    url_prefix="/api"
)


# =========================================================
# HELPER: GET CURRENT USER
# =========================================================
#
# Gets the authenticated user from the JWT.
#
# This helper is used by protected tour-management routes.
#
# =========================================================

def get_current_user():

    current_user_id = int(
        get_jwt_identity()
    )

    current_user = User.query.filter_by(
        id=current_user_id
    ).first()

    return current_user


# =========================================================
# HELPER: VALIDATE TOUR IMAGES
# =========================================================
#
# cover_image:
#     Optional string.
#
# gallery_images:
#     Optional list containing only strings.
#
# We currently store image URLs instead of image files.
#
# =========================================================

def validate_tour_images(
    cover_image,
    gallery_images
):

    # -----------------------------------------------------
    # VALIDATE COVER IMAGE
    # -----------------------------------------------------

    if cover_image is not None:

        if not isinstance(
            cover_image,
            str
        ):

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

        if not isinstance(
            gallery_images,
            list
        ):

            return (
                "Gallery images should be a list."
            )


        for image in gallery_images:

            if not isinstance(
                image,
                str
            ):

                return (
                    "Every gallery image should "
                    "be a text URL."
                )


            if not image.strip():

                return (
                    "Gallery image URLs cannot "
                    "be empty."
                )


    return None


# =========================================================
# HELPER: VALIDATE TOUR DATA
# =========================================================
#
# This validates the common tour information used when
# creating and editing tours.
#
# partial=False
#     Used when creating a tour.
#
# partial=True
#     Used when editing a tour because PATCH allows only
#     some fields to be supplied.
#
# =========================================================

def validate_tour_data(
    data,
    partial=False
):

    # -----------------------------------------------------
    # TOUR NAME
    # -----------------------------------------------------

    if (
        not partial
        or "tour_name" in data
    ):

        tour_name = data.get(
            "tour_name"
        )


        if (
            not isinstance(
                tour_name,
                str
            )
            or not tour_name.strip()
        ):

            return (
                "Tour name is required."
            )


    # -----------------------------------------------------
    # CHARGES
    # -----------------------------------------------------

    if (
        not partial
        or "charges" in data
    ):

        charges = data.get(
            "charges"
        )


        if (
            not isinstance(
                charges,
                (int, float)
            )
            or charges <= 0
        ):

            return (
                "Charges is required and should "
                "be greater than 0."
            )


    # -----------------------------------------------------
    # DESTINATION
    # -----------------------------------------------------

    if (
        not partial
        or "destination" in data
    ):

        destination = data.get(
            "destination"
        )


        if (
            not isinstance(
                destination,
                str
            )
            or not destination.strip()
        ):

            return (
                "Destination is required."
            )


    # -----------------------------------------------------
    # DESCRIPTION
    # -----------------------------------------------------

    if "description" in data:

        description = data.get(
            "description"
        )


        if description is not None:

            if not isinstance(
                description,
                str
            ):

                return (
                    "Description should be text."
                )


    # -----------------------------------------------------
    # DURATION DAYS
    # -----------------------------------------------------

    if "duration_days" in data:

        duration_days = data.get(
            "duration_days"
        )


        if duration_days is not None:

            if not isinstance(
                duration_days,
                int
            ):

                return (
                    "Duration days should be "
                    "a whole number."
                )


            if duration_days <= 0:

                return (
                    "Duration days should be "
                    "greater than 0."
                )


    # -----------------------------------------------------
    # DURATION NIGHTS
    # -----------------------------------------------------

    if "duration_nights" in data:

        duration_nights = data.get(
            "duration_nights"
        )


        if duration_nights is not None:

            if not isinstance(
                duration_nights,
                int
            ):

                return (
                    "Duration nights should be "
                    "a whole number."
                )


            if duration_nights < 0:

                return (
                    "Duration nights cannot "
                    "be negative."
                )


    # -----------------------------------------------------
    # DAYS / NIGHTS RELATIONSHIP
    # -----------------------------------------------------

    duration_days = data.get(
        "duration_days"
    )

    duration_nights = data.get(
        "duration_nights"
    )


    if (
        duration_days is not None
        and duration_nights is not None
        and duration_nights >= duration_days
    ):

        return (
            "Duration nights should be "
            "less than duration days."
        )


    # -----------------------------------------------------
    # IMAGE VALIDATION
    # -----------------------------------------------------

    image_error = validate_tour_images(

        data.get(
            "cover_image"
        )
        if "cover_image" in data
        else None,

        data.get(
            "gallery_images"
        )
        if "gallery_images" in data
        else None

    )


    if image_error:

        return image_error


    return None


# =========================================================
# HELPER: SERIALIZE TOUR
# =========================================================
#
# Keeps the tour-management responses consistent.
#
# =========================================================

def serialize_tour(tour):

    return {

        "tour_id":
            tour.id,

        "tour_name":
            tour.tour_name,

        "destination":
            tour.destination,

        "charges": (

            str(tour.charges)

            if tour.charges is not None

            else None

        ),

        "description":
            tour.description,

        "duration_days":
            tour.duration_days,

        "duration_nights":
            tour.duration_nights,

        "cover_image":
            tour.cover_image,

        "gallery_images": (

            tour.gallery_images

            if tour.gallery_images

            else []

        ),

        "tour_operator_id":
            tour.tour_operator_id,

        "tour_operator": (

            tour.operator.username

            if tour.operator

            else None

        ),

        "is_active":
            tour.is_active,

        "created_at": (

            tour.created_at.isoformat()

            if tour.created_at

            else None

        ),

        "updated_at": (

            tour.updated_at.isoformat()

            if tour.updated_at

            else None

        ),

    }


# =========================================================
# CREATE A TOUR
# =========================================================
#
# POST /api/tour
#
# ADMIN
#     Can create a tour and assign it to a tour operator.
#
# TOUR OPERATOR
#     Creates a tour automatically assigned to themselves.
#
# =========================================================

@tour_bp.route(
    "/tour",
    methods=["POST"]
)
@jwt_required()
@roles_required(
    "admin",
    "tour_operator"
)
def create_tour():

    # -----------------------------------------------------
    # GET REQUEST DATA
    # -----------------------------------------------------

    data = request.get_json()


    if not data:

        return jsonify({

            "message":
                "Request body is required."

        }), 400


    # -----------------------------------------------------
    # VALIDATE TOUR DATA
    # -----------------------------------------------------

    validation_error = validate_tour_data(
        data
    )


    if validation_error:

        return jsonify({

            "message":
                validation_error

        }), 400


    # -----------------------------------------------------
    # GET CURRENT USER
    # -----------------------------------------------------

    current_user = get_current_user()


    if not current_user:

        return jsonify({

            "message":
                "Access denied!"

        }), 403


    # =====================================================
    # DETERMINE TOUR OPERATOR
    # =====================================================

    if current_user.role == "tour_operator":

        # The tour operator automatically becomes the
        # owner of the tour they create.

        tour_operator_id = current_user.id


    else:

        # -------------------------------------------------
        # ADMIN CREATION
        # -------------------------------------------------
        #
        # Admin must specify the tour operator responsible
        # for the new tour.
        # -------------------------------------------------

        tour_operator_id = data.get(
            "tour_operator_id"
        )


        if tour_operator_id is None:

            return jsonify({

                "message":
                    "Admin must provide "
                    "tour_operator_id."

            }), 400


        # -------------------------------------------------
        # VALIDATE OPERATOR ID
        # -------------------------------------------------

        if not isinstance(
            tour_operator_id,
            int
        ):

            return jsonify({

                "message":
                    "tour_operator_id should "
                    "be a whole number."

            }), 400


        # -------------------------------------------------
        # FIND ASSIGNED OPERATOR
        # -------------------------------------------------

        assigned_operator = User.query.filter_by(
            id=tour_operator_id
        ).first()


        if not assigned_operator:

            return jsonify({

                "message":
                    "Tour operator not found."

            }), 404


        # -------------------------------------------------
        # CHECK USER ROLE
        # -------------------------------------------------

        if assigned_operator.role != "tour_operator":

            return jsonify({

                "message":
                    "Selected user is not "
                    "a tour operator."

            }), 400


    # =====================================================
    # CREATE TOUR
    # =====================================================

    tour = Tour(

        tour_name=data.get(
            "tour_name"
        ).strip(),

        charges=data.get(
            "charges"
        ),

        destination=data.get(
            "destination"
        ).strip(),

        description=(

            data.get(
                "description"
            ).strip()

            if data.get(
                "description"
            )

            else None

        ),

        duration_days=data.get(
            "duration_days"
        ),

        duration_nights=data.get(
            "duration_nights"
        ),

        cover_image=(

            data.get(
                "cover_image"
            ).strip()

            if data.get(
                "cover_image"
            )

            else None

        ),

        gallery_images=(

            [

                image.strip()

                for image in data.get(
                    "gallery_images"
                )

            ]

            if data.get(
                "gallery_images"
            ) is not None

            else None

        ),

        tour_operator_id=
            tour_operator_id,

        is_active=True

    )


    # -----------------------------------------------------
    # SAVE TOUR
    # -----------------------------------------------------

    db.session.add(
        tour
    )

    db.session.commit()


    # =====================================================
    # RETURN CREATED TOUR
    # =====================================================

    return jsonify({

        "message":
            "Tour is created successfully.",

        "tour":
            serialize_tour(tour)

    }), 201


# =========================================================
# GET TOURS FOR STAFF MANAGEMENT
# =========================================================
#
# GET /api/tours/manage
#
# ADMIN:
#     Gets all tours.
#
# TOUR OPERATOR:
#     Gets only their own tours.
#
# This is separate from the public /api/tours endpoint.
#
# =========================================================

@tour_bp.route(
    "/tours/manage",
    methods=["GET"]
)
@jwt_required()
@roles_required(
    "admin",
    "tour_operator"
)
def get_manageable_tours():

    # -----------------------------------------------------
    # GET CURRENT USER
    # -----------------------------------------------------

    current_user = get_current_user()


    if not current_user:

        return jsonify({

            "message":
                "User not found."

        }), 404


    # -----------------------------------------------------
    # ADMIN
    # -----------------------------------------------------

    if current_user.role == "admin":

        tours = Tour.query.order_by(
            Tour.id.desc()
        ).all()


    # -----------------------------------------------------
    # TOUR OPERATOR
    # -----------------------------------------------------
    #
    # Only tours belonging to this operator are returned.
    # -----------------------------------------------------

    else:

        tours = Tour.query.filter_by(

            tour_operator_id=
                current_user.id

        ).order_by(

            Tour.id.desc()

        ).all()


    # -----------------------------------------------------
    # SERIALIZE TOURS
    # -----------------------------------------------------

    tours_list = [

        serialize_tour(tour)

        for tour in tours

    ]


    return jsonify({

        "tours":
            tours_list

    }), 200


# =========================================================
# GET ALL ACTIVE PUBLIC TOURS
# =========================================================
#
# GET /api/tours
#
# Customers only see active tours.
#
# =========================================================

@tour_bp.route(
    "/tours",
    methods=["GET"]
)
def get_tours():

    # -----------------------------------------------------
    # GET ACTIVE TOURS
    # -----------------------------------------------------

    tours = Tour.query.filter_by(
        is_active=True
    ).all()


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

                for departure
                in upcoming_departures

            )


        # -------------------------------------------------
        # ADD TOUR TO RESPONSE
        # -------------------------------------------------

        tours_list.append({

            "tour_id":
                tour.id,

            "tour_name":
                tour.tour_name,

            "destination":
                tour.destination,

            "starting_price": (

                str(starting_price)

                if starting_price is not None

                else None

            ),

            "cover_image":
                tour.cover_image,

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

        "tours":
            tours_list

    }), 200


# =========================================================
# GET COMPLETE TOUR PACKAGE
# =========================================================
#
# GET /api/tours/<tour_id>
#
# Customers can only access active tours.
#
# =========================================================

@tour_bp.route(
    "/tours/<int:tour_id>",
    methods=["GET"]
)
def get_tour_details(
    tour_id
):

    # -----------------------------------------------------
    # FIND ACTIVE TOUR
    # -----------------------------------------------------

    tour = Tour.query.filter_by(

        id=tour_id,

        is_active=True

    ).first()


    if not tour:

        return jsonify({

            "message":
                "Tour not found."

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

            "departure_id":
                departure.id,

            "tour_id":
                departure.tour_id,

            "capacity":
                departure.capacity,

            "available_seats":
                available_seats,

            "start_date": (

                departure.start_date.isoformat()

            ),

            "end_date": (

                departure.end_date.isoformat()

            ),

            "price_per_person":
                str(
                    departure.price_per_person
                )

        })


    # =====================================================
    # BUILD ITINERARY DATA
    # =====================================================

    itinerary_list = []


    for itinerary in tour.itineraries:

        itinerary_list.append({

            "itinerary_id":
                itinerary.id,

            "day_number":
                itinerary.day_number,

            "title":
                itinerary.title,

            "description":
                itinerary.description

        })


    # =====================================================
    # BUILD ACCOMMODATION DATA
    # =====================================================

    accommodation_list = []


    for accommodation in tour.accommodations:

        accommodation_list.append({

            "accommodation_id":
                accommodation.id,

            "name":
                accommodation.name,

            "category":
                accommodation.category,

            "location":
                accommodation.location,

            "room_type":
                accommodation.room_type,

            "meal_plan":
                accommodation.meal_plan,

            "description":
                accommodation.description

        })


    # =====================================================
    # BUILD FAQ DATA
    # =====================================================

    faq_list = []


    for faq in tour.faqs:

        faq_list.append({

            "faq_id":
                faq.id,

            "question":
                faq.question,

            "answer":
                faq.answer

        })


    # =====================================================
    # RETURN COMPLETE SAFARI PACKAGE
    # =====================================================

    return jsonify({

        "tour_id":
            tour.id,

        "tour_name":
            tour.tour_name,

        "destination":
            tour.destination,

        "description":
            tour.description,

        "duration_days":
            tour.duration_days,

        "duration_nights":
            tour.duration_nights,

        "cover_image":
            tour.cover_image,

        "gallery_images": (

            tour.gallery_images

            if tour.gallery_images

            else []

        ),

        "itineraries":
            itinerary_list,

        "accommodations":
            accommodation_list,

        "faqs":
            faq_list,

        "departures":
            departure_list

    }), 200


# =========================================================
# UPDATE TOUR
# =========================================================
#
# PATCH /api/tours/<tour_id>
#
# ADMIN:
#     Can edit any tour.
#
# TOUR OPERATOR:
#     Can edit only their own tour.
#
# =========================================================

@tour_bp.route(
    "/tours/<int:tour_id>",
    methods=["PATCH"]
)
@jwt_required()
@roles_required(
    "admin",
    "tour_operator"
)
def update_tour(
    tour_id
):

    # -----------------------------------------------------
    # GET REQUEST DATA
    # -----------------------------------------------------

    data = request.get_json()


    if not data:

        return jsonify({

            "message":
                "Request body is required."

        }), 400


    # -----------------------------------------------------
    # GET CURRENT USER
    # -----------------------------------------------------

    current_user = get_current_user()


    if not current_user:

        return jsonify({

            "message":
                "User not found."

        }), 404


    # -----------------------------------------------------
    # FIND TOUR
    # -----------------------------------------------------

    tour = Tour.query.filter_by(
        id=tour_id
    ).first()


    if not tour:

        return jsonify({

            "message":
                "Tour not found."

        }), 404


    # -----------------------------------------------------
    # CHECK OWNERSHIP
    # -----------------------------------------------------
    #
    # Admin can edit any tour.
    #
    # Tour operator can only edit their own tour.
    #
    # -----------------------------------------------------

    if (
        current_user.role != "admin"
        and tour.tour_operator_id != current_user.id
    ):

        return jsonify({

            "message":
                "You are not authorized to "
                "manage this tour."

        }), 403


    # -----------------------------------------------------
    # VALIDATE TOUR DATA
    # -----------------------------------------------------

    validation_error = validate_tour_data(
        data,
        partial=True
    )


    if validation_error:

        return jsonify({

            "message":
                validation_error

        }), 400


    # =====================================================
    # UPDATE TOUR NAME
    # =====================================================

    if "tour_name" in data:

        tour.tour_name = data.get(
            "tour_name"
        ).strip()


    # =====================================================
    # UPDATE DESTINATION
    # =====================================================

    if "destination" in data:

        tour.destination = data.get(
            "destination"
        ).strip()


    # =====================================================
    # UPDATE CHARGES
    # =====================================================

    if "charges" in data:

        tour.charges = data.get(
            "charges"
        )


    # =====================================================
    # UPDATE DESCRIPTION
    # =====================================================

    if "description" in data:

        description = data.get(
            "description"
        )


        tour.description = (

            description.strip()

            if description

            else None

        )


    # =====================================================
    # UPDATE DURATION DAYS
    # =====================================================

    if "duration_days" in data:

        tour.duration_days = data.get(
            "duration_days"
        )


    # =====================================================
    # UPDATE DURATION NIGHTS
    # =====================================================

    if "duration_nights" in data:

        tour.duration_nights = data.get(
            "duration_nights"
        )


    # =====================================================
    # UPDATE COVER IMAGE
    # =====================================================

    if "cover_image" in data:

        cover_image = data.get(
            "cover_image"
        )


        tour.cover_image = (

            cover_image.strip()

            if cover_image

            else None

        )


    # =====================================================
    # UPDATE GALLERY IMAGES
    # =====================================================

    if "gallery_images" in data:

        gallery_images = data.get(
            "gallery_images"
        )


        tour.gallery_images = (

            [

                image.strip()

                for image in gallery_images

            ]

            if gallery_images is not None

            else []

        )


    # =====================================================
    # ADMIN: CHANGE TOUR OPERATOR
    # =====================================================
    #
    # Only an administrator can reassign a tour.
    #
    # A tour operator cannot transfer their tour to another
    # operator.
    #
    # =====================================================

    if "tour_operator_id" in data:

        if current_user.role != "admin":

            return jsonify({

                "message":
                    "Only an admin can "
                    "reassign a tour."

            }), 403


        new_operator_id = data.get(
            "tour_operator_id"
        )


        if not isinstance(
            new_operator_id,
            int
        ):

            return jsonify({

                "message":
                    "tour_operator_id should "
                    "be a whole number."

            }), 400


        new_operator = User.query.filter_by(

            id=new_operator_id

        ).first()


        if not new_operator:

            return jsonify({

                "message":
                    "Tour operator not found."

            }), 404


        if new_operator.role != "tour_operator":

            return jsonify({

                "message":
                    "Selected user is not "
                    "a tour operator."

            }), 400


        tour.tour_operator_id = (
            new_operator_id
        )


    # =====================================================
    # UPDATE ACTIVE STATUS
    # =====================================================
    #
    # Setting:
    #
    #     true
    #
    # reactivates a tour.
    #
    # Setting:
    #
    #     false
    #
    # deactivates it.
    #
    # =====================================================

    if "is_active" in data:

        if not isinstance(
            data.get("is_active"),
            bool
        ):

            return jsonify({

                "message":
                    "is_active should "
                    "be true or false."

            }), 400


        tour.is_active = data.get(
            "is_active"
        )


    # =====================================================
    # SAVE CHANGES
    # =====================================================

    db.session.commit()


    # =====================================================
    # RETURN UPDATED TOUR
    # =====================================================

    return jsonify({

        "message":
            "Tour updated successfully.",

        "tour":
            serialize_tour(tour)

    }), 200


# =========================================================
# DEACTIVATE TOUR
# =========================================================
#
# DELETE /api/tours/<tour_id>
#
# IMPORTANT:
#
# This is a SOFT DELETE.
#
# The database record is NOT physically removed.
#
# Instead:
#
#     tour.is_active = False
#
# This protects historical bookings and related records.
#
# =========================================================

@tour_bp.route(
    "/tours/<int:tour_id>",
    methods=["DELETE"]
)
@jwt_required()
@roles_required(
    "admin",
    "tour_operator"
)
def delete_tour(
    tour_id
):

    # -----------------------------------------------------
    # GET CURRENT USER
    # -----------------------------------------------------

    current_user = get_current_user()


    if not current_user:

        return jsonify({

            "message":
                "User not found."

        }), 404


    # -----------------------------------------------------
    # FIND TOUR
    # -----------------------------------------------------

    tour = Tour.query.filter_by(
        id=tour_id
    ).first()


    if not tour:

        return jsonify({

            "message":
                "Tour not found."

        }), 404


    # -----------------------------------------------------
    # CHECK OWNERSHIP
    # -----------------------------------------------------

    if (
        current_user.role != "admin"
        and tour.tour_operator_id != current_user.id
    ):

        return jsonify({

            "message":
                "You are not authorized to "
                "manage this tour."

        }), 403


    # -----------------------------------------------------
    # CHECK WHETHER TOUR IS ALREADY INACTIVE
    # -----------------------------------------------------

    if not tour.is_active:

        return jsonify({

            "message":
                "Tour is already inactive."

        }), 400


    # =====================================================
    # SOFT DELETE
    # =====================================================
    #
    # We preserve the database record because it may have
    # departures and historical bookings.
    #
    # =====================================================

    tour.is_active = False


    # -----------------------------------------------------
    # SAVE
    # -----------------------------------------------------

    db.session.commit()


    # =====================================================
    # RETURN SUCCESS
    # =====================================================

    return jsonify({

        "message":
            "Tour deactivated successfully.",

        "tour_id":
            tour.id,

        "is_active":
            tour.is_active

    }), 200


# =========================================================
# UPDATE TOUR IMAGES
# =========================================================
#
# PATCH /api/tours/<tour_id>/images
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
@roles_required(
    "admin",
    "tour_operator"
)
def update_tour_images(
    tour_id
):

    # -----------------------------------------------------
    # GET REQUEST DATA
    # -----------------------------------------------------

    data = request.get_json()


    if not data:

        return jsonify({

            "message":
                "Request body is required."

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

            "message":
                "Provide cover_image or gallery_images."

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

            "message":
                image_error

        }), 400


    # =====================================================
    # GET CURRENT USER
    # =====================================================

    current_user = get_current_user()


    if not current_user:

        return jsonify({

            "message":
                "User not found."

        }), 404


    # =====================================================
    # FIND TOUR
    # =====================================================

    tour = Tour.query.filter_by(
        id=tour_id
    ).first()


    if not tour:

        return jsonify({

            "message":
                "Tour not found."

        }), 404


    # =====================================================
    # CHECK TOUR OWNERSHIP
    # =====================================================

    if (
        current_user.role != "admin"
        and tour.tour_operator_id != current_user.id
    ):

        return jsonify({

            "message":
                "You are not authorized to "
                "manage this tour."

        }), 403


    # =====================================================
    # UPDATE COVER IMAGE
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

        tour.gallery_images = (

            [

                image.strip()

                for image in gallery_images

            ]

            if gallery_images is not None

            else []

        )


    # =====================================================
    # SAVE CHANGES
    # =====================================================

    db.session.commit()


    # =====================================================
    # RETURN UPDATED IMAGES
    # =====================================================

    return jsonify({

        "message":
            "Tour images updated successfully.",

        "tour_id":
            tour.id,

        "cover_image":
            tour.cover_image,

        "gallery_images": (

            tour.gallery_images

            if tour.gallery_images

            else []

        )

    }), 200