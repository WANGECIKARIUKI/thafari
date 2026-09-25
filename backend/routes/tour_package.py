# =========================================================
# THAFARI TOUR PACKAGE ROUTES
# =========================================================
#
# These routes manage the extra content that makes a tour
# feel like a complete safari package.
#
# Package content includes:
#
# - Itinerary
# - Accommodation
# - FAQs
#
# The customer will eventually see this information on
# the tour details page.
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
from models.tour_itinerary import TourItinerary
from models.tour_accommodation import TourAccommodation
from models.tour_faq import TourFAQ

from extensions import db


# =========================================================
# BLUEPRINT
# =========================================================

tour_package_bp = Blueprint(
    "tour_package",
    __name__,
    url_prefix="/api"
)


# =========================================================
# CREATE TOUR ITINERARY
# =========================================================
#
# POST /api/tours/<tour_id>/itinerary
#
# Only:
#
# - admin
# - tour_operator
#
# can create itinerary entries.
#
# A tour operator can only add itinerary content to their
# own tour.
#
# =========================================================


@tour_package_bp.route(
    "/tours/<int:tour_id>/itinerary",
    methods=["POST"]
)
@jwt_required()
@roles_required("admin", "tour_operator")
def create_itinerary(tour_id):

    # -----------------------------------------------------
    # GET REQUEST DATA
    # -----------------------------------------------------

    data = request.get_json()

    if not data:
        return jsonify({
            "message": "Request body is required."
        }), 400

    # -----------------------------------------------------
    # GET ITINERARY DATA
    # -----------------------------------------------------

    day_number = data.get("day_number")
    title = data.get("title")
    description = data.get("description")

    # -----------------------------------------------------
    # VALIDATE DAY NUMBER
    # -----------------------------------------------------

    if not isinstance(day_number, int):
        return jsonify({
            "message": (
                "Day number is required and should be "
                "a whole number."
            )
        }), 400

    if day_number <= 0:
        return jsonify({
            "message": "Day number should be greater than 0."
        }), 400

    # -----------------------------------------------------
    # VALIDATE TITLE
    # -----------------------------------------------------

    if not isinstance(title, str) or not title.strip():
        return jsonify({
            "message": "Itinerary title is required."
        }), 400

    # -----------------------------------------------------
    # VALIDATE DESCRIPTION
    # -----------------------------------------------------

    if not isinstance(description, str) or not description.strip():
        return jsonify({
            "message": "Itinerary description is required."
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
            "message": "User not found."
        }), 404

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
    # CHECK TOUR OWNERSHIP
    # -----------------------------------------------------
    #
    # Admins can manage any tour.
    #
    # Tour operators can only manage tours that belong
    # to them.
    #
    # -----------------------------------------------------

    if (
        current_user.role != "admin"
        and tour.tour_operator_id != current_user_id
    ):
        return jsonify({
            "message": (
                "You are not authorized to manage this tour."
            )
        }), 403

    # -----------------------------------------------------
    # CREATE ITINERARY
    # -----------------------------------------------------

    itinerary = TourItinerary(
        tour_id=tour.id,
        day_number=day_number,
        title=title.strip(),
        description=description.strip()
    )

    # Add the itinerary to the database session
    db.session.add(itinerary)

    # Save it
    db.session.commit()

    # -----------------------------------------------------
    # RETURN CREATED ITINERARY
    # -----------------------------------------------------

    return jsonify({

        "message": "Itinerary created successfully.",

        "itinerary": {

            "itinerary_id": itinerary.id,

            "tour_id": itinerary.tour_id,

            "day_number": itinerary.day_number,

            "title": itinerary.title,

            "description": itinerary.description

        }

    }), 201


# =========================================================
# CREATE TOUR ACCOMMODATION
# =========================================================
#
# POST /api/tours/<tour_id>/accommodation
#
# Only:
#
# - admin
# - tour_operator
#
# can create accommodation information.
#
# A tour operator can only add accommodation to their own
# tour.
#
# =========================================================


@tour_package_bp.route(
    "/tours/<int:tour_id>/accommodation",
    methods=["POST"]
)
@jwt_required()
@roles_required("admin", "tour_operator")
def create_accommodation(tour_id):

    # -----------------------------------------------------
    # GET REQUEST DATA
    # -----------------------------------------------------

    data = request.get_json()

    if not data:
        return jsonify({
            "message": "Request body is required."
        }), 400

    # -----------------------------------------------------
    # GET ACCOMMODATION DATA
    # -----------------------------------------------------

    name = data.get("name")
    category = data.get("category")
    location = data.get("location")
    room_type = data.get("room_type")
    meal_plan = data.get("meal_plan")
    description = data.get("description")

    # -----------------------------------------------------
    # VALIDATE NAME
    # -----------------------------------------------------

    if not isinstance(name, str) or not name.strip():
        return jsonify({
            "message": "Accommodation name is required."
        }), 400

    # -----------------------------------------------------
    # VALIDATE CATEGORY
    # -----------------------------------------------------

    allowed_categories = [
        "budget",
        "mid_range",
        "luxury"
    ]

    if category not in allowed_categories:
        return jsonify({
            "message": (
                "Category must be one of: "
                "budget, mid_range, luxury."
            )
        }), 400

    # -----------------------------------------------------
    # VALIDATE LOCATION
    # -----------------------------------------------------

    if not isinstance(location, str) or not location.strip():
        return jsonify({
            "message": "Accommodation location is required."
        }), 400

    # -----------------------------------------------------
    # VALIDATE ROOM TYPE
    # -----------------------------------------------------

    if not isinstance(room_type, str) or not room_type.strip():
        return jsonify({
            "message": "Room type is required."
        }), 400

    # -----------------------------------------------------
    # VALIDATE MEAL PLAN
    # -----------------------------------------------------

    if not isinstance(meal_plan, str) or not meal_plan.strip():
        return jsonify({
            "message": "Meal plan is required."
        }), 400

    # -----------------------------------------------------
    # VALIDATE DESCRIPTION
    #
    # Description is optional in our model.
    # -----------------------------------------------------

    if description is not None:

        if not isinstance(description, str):
            return jsonify({
                "message": "Description should be text."
            }), 400

        description = description.strip()

        if not description:
            description = None

    # -----------------------------------------------------
    # GET CURRENT USER
    # -----------------------------------------------------

    current_user_id = int(get_jwt_identity())

    current_user = User.query.filter_by(
        id=current_user_id
    ).first()

    if not current_user:
        return jsonify({
            "message": "User not found."
        }), 404

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
    # CHECK TOUR OWNERSHIP
    # -----------------------------------------------------

    if (
        current_user.role != "admin"
        and tour.tour_operator_id != current_user_id
    ):
        return jsonify({
            "message": (
                "You are not authorized to manage this tour."
            )
        }), 403

    # -----------------------------------------------------
    # CREATE ACCOMMODATION
    # -----------------------------------------------------

    accommodation = TourAccommodation(
        tour_id=tour.id,
        name=name.strip(),
        category=category,
        location=location.strip(),
        room_type=room_type.strip(),
        meal_plan=meal_plan.strip(),
        description=description
    )

    # Add accommodation to the database session
    db.session.add(accommodation)

    # Save it
    db.session.commit()

    # -----------------------------------------------------
    # RETURN CREATED ACCOMMODATION
    # -----------------------------------------------------

    return jsonify({

        "message": "Accommodation created successfully.",

        "accommodation": {

            "accommodation_id": accommodation.id,

            "tour_id": accommodation.tour_id,

            "name": accommodation.name,

            "category": accommodation.category,

            "location": accommodation.location,

            "room_type": accommodation.room_type,

            "meal_plan": accommodation.meal_plan,

            "description": accommodation.description

        }

    }), 201


# =========================================================
# CREATE TOUR FAQ
# =========================================================
#
# POST /api/tours/<tour_id>/faq
#
# Only:
#
# - admin
# - tour_operator
#
# can create FAQs.
#
# A tour operator can only add FAQs to their own tour.
#
# Example:
#
# POST /api/tours/5/faq
#
# {
#     "question": "What should I bring for the safari?",
#     "answer": "Comfortable clothing, sunscreen, a hat,
#                binoculars and a camera are recommended."
# }
#
# =========================================================


@tour_package_bp.route(
    "/tours/<int:tour_id>/faq",
    methods=["POST"]
)
@jwt_required()
@roles_required("admin", "tour_operator")
def create_faq(tour_id):

    # -----------------------------------------------------
    # GET REQUEST DATA
    # -----------------------------------------------------

    data = request.get_json()

    if not data:
        return jsonify({
            "message": "Request body is required."
        }), 400

    # -----------------------------------------------------
    # GET FAQ DATA
    # -----------------------------------------------------

    question = data.get("question")
    answer = data.get("answer")

    # -----------------------------------------------------
    # VALIDATE QUESTION
    # -----------------------------------------------------

    if not isinstance(question, str) or not question.strip():
        return jsonify({
            "message": "FAQ question is required."
        }), 400

    # -----------------------------------------------------
    # VALIDATE ANSWER
    # -----------------------------------------------------

    if not isinstance(answer, str) or not answer.strip():
        return jsonify({
            "message": "FAQ answer is required."
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
            "message": "User not found."
        }), 404

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
    # CHECK TOUR OWNERSHIP
    # -----------------------------------------------------
    #
    # Admins can manage any tour.
    #
    # Tour operators can only manage their own tours.
    #
    # -----------------------------------------------------

    if (
        current_user.role != "admin"
        and tour.tour_operator_id != current_user_id
    ):
        return jsonify({
            "message": (
                "You are not authorized to manage this tour."
            )
        }), 403

    # -----------------------------------------------------
    # CREATE FAQ
    # -----------------------------------------------------

    faq = TourFAQ(
        tour_id=tour.id,
        question=question.strip(),
        answer=answer.strip()
    )

    # Add FAQ to the database session
    db.session.add(faq)

    # Save it
    db.session.commit()

    # -----------------------------------------------------
    # RETURN CREATED FAQ
    # -----------------------------------------------------

    return jsonify({

        "message": "FAQ created successfully.",

        "faq": {

            "faq_id": faq.id,

            "tour_id": faq.tour_id,

            "question": faq.question,

            "answer": faq.answer

        }

    }), 201