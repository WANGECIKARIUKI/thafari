# =========================================================
# THAFARI TOUR PACKAGE ROUTES
# =========================================================
#
# These routes manage the extra content that makes a tour
# feel like a complete travel package.
#
# Package content includes:
# - Itinerary
# - Accommodation
# - FAQs
#
# Customers can GET package information publicly.
# Admins and tour operators can CREATE, UPDATE and DELETE
# package information.
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
# HELPERS
# =========================================================

def get_tour_or_404(tour_id):
    tour = Tour.query.filter_by(id=tour_id).first()

    if not tour:
        return None, (
            jsonify({"message": "Tour not found."}),
            404
        )

    return tour, None


def get_current_user():
    current_user_id = int(get_jwt_identity())

    current_user = User.query.filter_by(
        id=current_user_id
    ).first()

    return current_user


def can_manage_tour(current_user, tour):
    return (
        current_user.role == "admin"
        or tour.tour_operator_id == current_user.id
    )


def serialize_itinerary(item):
    return {
        "itinerary_id": item.id,
        "tour_id": item.tour_id,
        "day_number": item.day_number,
        "title": item.title,
        "description": item.description
    }


def serialize_accommodation(item):
    return {
        "accommodation_id": item.id,
        "tour_id": item.tour_id,
        "name": item.name,
        "category": item.category,
        "location": item.location,
        "room_type": item.room_type,
        "meal_plan": item.meal_plan,
        "description": item.description
    }


def serialize_faq(item):
    return {
        "faq_id": item.id,
        "tour_id": item.tour_id,
        "question": item.question,
        "answer": item.answer
    }


# =========================================================
# GET COMPLETE TOUR PACKAGE
# =========================================================
#
# GET /api/tours/<tour_id>/package
#
# PUBLIC
#
# Customers do NOT need to be logged in.
#
# This returns:
# - itinerary
# - accommodation
# - FAQs
#
# =========================================================

@tour_package_bp.route(
    "/tours/<int:tour_id>/package",
    methods=["GET"]
)
def get_tour_package(tour_id):

    tour, error = get_tour_or_404(tour_id)

    if error:
        return error

    # Only active tours should be publicly visible.
    if not tour.is_active:
        return jsonify({
            "message": "Tour not found."
        }), 404

    itineraries = (
        TourItinerary.query
        .filter_by(tour_id=tour.id)
        .order_by(TourItinerary.day_number.asc())
        .all()
    )

    accommodations = (
        TourAccommodation.query
        .filter_by(tour_id=tour.id)
        .order_by(TourAccommodation.id.asc())
        .all()
    )

    faqs = (
        TourFAQ.query
        .filter_by(tour_id=tour.id)
        .order_by(TourFAQ.id.asc())
        .all()
    )

    return jsonify({
        "tour_id": tour.id,
        "itineraries": [
            serialize_itinerary(item)
            for item in itineraries
        ],
        "accommodations": [
            serialize_accommodation(item)
            for item in accommodations
        ],
        "faqs": [
            serialize_faq(item)
            for item in faqs
        ]
    }), 200


# =========================================================
# CREATE TOUR ITINERARY
# =========================================================
#
# POST /api/tours/<tour_id>/itinerary
#
# ADMIN / TOUR OPERATOR
#
# =========================================================

@tour_package_bp.route(
    "/tours/<int:tour_id>/itinerary",
    methods=["POST"]
)
@jwt_required()
@roles_required("admin", "tour_operator")
def create_itinerary(tour_id):

    data = request.get_json()

    if not data:
        return jsonify({
            "message": "Request body is required."
        }), 400

    day_number = data.get("day_number")
    title = data.get("title")
    description = data.get("description")

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

    if not isinstance(title, str) or not title.strip():
        return jsonify({
            "message": "Itinerary title is required."
        }), 400

    if not isinstance(description, str) or not description.strip():
        return jsonify({
            "message": "Itinerary description is required."
        }), 400

    current_user = get_current_user()

    if not current_user:
        return jsonify({
            "message": "User not found."
        }), 404

    tour, error = get_tour_or_404(tour_id)

    if error:
        return error

    if not can_manage_tour(current_user, tour):
        return jsonify({
            "message": (
                "You are not authorized to manage this tour."
            )
        }), 403

    itinerary = TourItinerary(
        tour_id=tour.id,
        day_number=day_number,
        title=title.strip(),
        description=description.strip()
    )

    db.session.add(itinerary)
    db.session.commit()

    return jsonify({
        "message": "Itinerary created successfully.",
        "itinerary": serialize_itinerary(itinerary)
    }), 201


# =========================================================
# GET TOUR ITINERARY
# =========================================================
#
# GET /api/tours/<tour_id>/itinerary
#
# PUBLIC
#
# =========================================================

@tour_package_bp.route(
    "/tours/<int:tour_id>/itinerary",
    methods=["GET"]
)
def get_itinerary(tour_id):

    tour, error = get_tour_or_404(tour_id)

    if error:
        return error

    if not tour.is_active:
        return jsonify({
            "message": "Tour not found."
        }), 404

    itineraries = (
        TourItinerary.query
        .filter_by(tour_id=tour.id)
        .order_by(TourItinerary.day_number.asc())
        .all()
    )

    return jsonify({
        "tour_id": tour.id,
        "itineraries": [
            serialize_itinerary(item)
            for item in itineraries
        ]
    }), 200


# =========================================================
# UPDATE TOUR ITINERARY
# =========================================================
#
# PATCH /api/tours/<tour_id>/itinerary/<itinerary_id>
#
# ADMIN / TOUR OPERATOR
#
# =========================================================

@tour_package_bp.route(
    "/tours/<int:tour_id>/itinerary/<int:itinerary_id>",
    methods=["PATCH"]
)
@jwt_required()
@roles_required("admin", "tour_operator")
def update_itinerary(tour_id, itinerary_id):

    data = request.get_json()

    if not data:
        return jsonify({
            "message": "Request body is required."
        }), 400

    current_user = get_current_user()

    if not current_user:
        return jsonify({
            "message": "User not found."
        }), 404

    tour, error = get_tour_or_404(tour_id)

    if error:
        return error

    if not can_manage_tour(current_user, tour):
        return jsonify({
            "message": (
                "You are not authorized to manage this tour."
            )
        }), 403

    itinerary = TourItinerary.query.filter_by(
        id=itinerary_id,
        tour_id=tour.id
    ).first()

    if not itinerary:
        return jsonify({
            "message": "Itinerary entry not found."
        }), 404

    if "day_number" in data:
        day_number = data.get("day_number")

        if not isinstance(day_number, int):
            return jsonify({
                "message": "Day number should be a whole number."
            }), 400

        if day_number <= 0:
            return jsonify({
                "message": "Day number should be greater than 0."
            }), 400

        itinerary.day_number = day_number

    if "title" in data:
        title = data.get("title")

        if not isinstance(title, str) or not title.strip():
            return jsonify({
                "message": "Itinerary title is required."
            }), 400

        itinerary.title = title.strip()

    if "description" in data:
        description = data.get("description")

        if (
            not isinstance(description, str)
            or not description.strip()
        ):
            return jsonify({
                "message": "Itinerary description is required."
            }), 400

        itinerary.description = description.strip()

    db.session.commit()

    return jsonify({
        "message": "Itinerary updated successfully.",
        "itinerary": serialize_itinerary(itinerary)
    }), 200


# =========================================================
# DELETE TOUR ITINERARY
# =========================================================
#
# DELETE /api/tours/<tour_id>/itinerary/<itinerary_id>
#
# ADMIN / TOUR OPERATOR
#
# =========================================================

@tour_package_bp.route(
    "/tours/<int:tour_id>/itinerary/<int:itinerary_id>",
    methods=["DELETE"]
)
@jwt_required()
@roles_required("admin", "tour_operator")
def delete_itinerary(tour_id, itinerary_id):

    current_user = get_current_user()

    if not current_user:
        return jsonify({
            "message": "User not found."
        }), 404

    tour, error = get_tour_or_404(tour_id)

    if error:
        return error

    if not can_manage_tour(current_user, tour):
        return jsonify({
            "message": (
                "You are not authorized to manage this tour."
            )
        }), 403

    itinerary = TourItinerary.query.filter_by(
        id=itinerary_id,
        tour_id=tour.id
    ).first()

    if not itinerary:
        return jsonify({
            "message": "Itinerary entry not found."
        }), 404

    db.session.delete(itinerary)
    db.session.commit()

    return jsonify({
        "message": "Itinerary deleted successfully."
    }), 200


# =========================================================
# CREATE TOUR ACCOMMODATION
# =========================================================
#
# POST /api/tours/<tour_id>/accommodation
#
# ADMIN / TOUR OPERATOR
#
# =========================================================

@tour_package_bp.route(
    "/tours/<int:tour_id>/accommodation",
    methods=["POST"]
)
@jwt_required()
@roles_required("admin", "tour_operator")
def create_accommodation(tour_id):

    data = request.get_json()

    if not data:
        return jsonify({
            "message": "Request body is required."
        }), 400

    name = data.get("name")
    category = data.get("category")
    location = data.get("location")
    room_type = data.get("room_type")
    meal_plan = data.get("meal_plan")
    description = data.get("description")

    if not isinstance(name, str) or not name.strip():
        return jsonify({
            "message": "Accommodation name is required."
        }), 400

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

    if not isinstance(location, str) or not location.strip():
        return jsonify({
            "message": "Accommodation location is required."
        }), 400

    if not isinstance(room_type, str) or not room_type.strip():
        return jsonify({
            "message": "Room type is required."
        }), 400

    if not isinstance(meal_plan, str) or not meal_plan.strip():
        return jsonify({
            "message": "Meal plan is required."
        }), 400

    if description is not None:

        if not isinstance(description, str):
            return jsonify({
                "message": "Description should be text."
            }), 400

        description = description.strip()

        if not description:
            description = None

    current_user = get_current_user()

    if not current_user:
        return jsonify({
            "message": "User not found."
        }), 404

    tour, error = get_tour_or_404(tour_id)

    if error:
        return error

    if not can_manage_tour(current_user, tour):
        return jsonify({
            "message": (
                "You are not authorized to manage this tour."
            )
        }), 403

    accommodation = TourAccommodation(
        tour_id=tour.id,
        name=name.strip(),
        category=category,
        location=location.strip(),
        room_type=room_type.strip(),
        meal_plan=meal_plan.strip(),
        description=description
    )

    db.session.add(accommodation)
    db.session.commit()

    return jsonify({
        "message": "Accommodation created successfully.",
        "accommodation": serialize_accommodation(accommodation)
    }), 201


# =========================================================
# GET TOUR ACCOMMODATION
# =========================================================
#
# GET /api/tours/<tour_id>/accommodation
#
# PUBLIC
#
# =========================================================

@tour_package_bp.route(
    "/tours/<int:tour_id>/accommodation",
    methods=["GET"]
)
def get_accommodation(tour_id):

    tour, error = get_tour_or_404(tour_id)

    if error:
        return error

    if not tour.is_active:
        return jsonify({
            "message": "Tour not found."
        }), 404

    accommodations = (
        TourAccommodation.query
        .filter_by(tour_id=tour.id)
        .order_by(TourAccommodation.id.asc())
        .all()
    )

    return jsonify({
        "tour_id": tour.id,
        "accommodations": [
            serialize_accommodation(item)
            for item in accommodations
        ]
    }), 200


# =========================================================
# UPDATE TOUR ACCOMMODATION
# =========================================================
#
# PATCH /api/tours/<tour_id>/accommodation/<accommodation_id>
#
# ADMIN / TOUR OPERATOR
#
# =========================================================

@tour_package_bp.route(
    "/tours/<int:tour_id>/accommodation/<int:accommodation_id>",
    methods=["PATCH"]
)
@jwt_required()
@roles_required("admin", "tour_operator")
def update_accommodation(tour_id, accommodation_id):

    data = request.get_json()

    if not data:
        return jsonify({
            "message": "Request body is required."
        }), 400

    current_user = get_current_user()

    if not current_user:
        return jsonify({
            "message": "User not found."
        }), 404

    tour, error = get_tour_or_404(tour_id)

    if error:
        return error

    if not can_manage_tour(current_user, tour):
        return jsonify({
            "message": (
                "You are not authorized to manage this tour."
            )
        }), 403

    accommodation = TourAccommodation.query.filter_by(
        id=accommodation_id,
        tour_id=tour.id
    ).first()

    if not accommodation:
        return jsonify({
            "message": "Accommodation not found."
        }), 404

    if "name" in data:
        name = data.get("name")

        if not isinstance(name, str) or not name.strip():
            return jsonify({
                "message": "Accommodation name is required."
            }), 400

        accommodation.name = name.strip()

    if "category" in data:
        category = data.get("category")

        if category not in [
            "budget",
            "mid_range",
            "luxury"
        ]:
            return jsonify({
                "message": (
                    "Category must be one of: "
                    "budget, mid_range, luxury."
                )
            }), 400

        accommodation.category = category

    if "location" in data:
        location = data.get("location")

        if not isinstance(location, str) or not location.strip():
            return jsonify({
                "message": "Accommodation location is required."
            }), 400

        accommodation.location = location.strip()

    if "room_type" in data:
        room_type = data.get("room_type")

        if (
            not isinstance(room_type, str)
            or not room_type.strip()
        ):
            return jsonify({
                "message": "Room type is required."
            }), 400

        accommodation.room_type = room_type.strip()

    if "meal_plan" in data:
        meal_plan = data.get("meal_plan")

        if (
            not isinstance(meal_plan, str)
            or not meal_plan.strip()
        ):
            return jsonify({
                "message": "Meal plan is required."
            }), 400

        accommodation.meal_plan = meal_plan.strip()

    if "description" in data:
        description = data.get("description")

        if description is not None:
            if not isinstance(description, str):
                return jsonify({
                    "message": "Description should be text."
                }), 400

            description = description.strip()

        accommodation.description = description or None

    db.session.commit()

    return jsonify({
        "message": "Accommodation updated successfully.",
        "accommodation": serialize_accommodation(accommodation)
    }), 200


# =========================================================
# DELETE TOUR ACCOMMODATION
# =========================================================
#
# DELETE /api/tours/<tour_id>/accommodation/<accommodation_id>
#
# ADMIN / TOUR OPERATOR
#
# =========================================================

@tour_package_bp.route(
    "/tours/<int:tour_id>/accommodation/<int:accommodation_id>",
    methods=["DELETE"]
)
@jwt_required()
@roles_required("admin", "tour_operator")
def delete_accommodation(tour_id, accommodation_id):

    current_user = get_current_user()

    if not current_user:
        return jsonify({
            "message": "User not found."
        }), 404

    tour, error = get_tour_or_404(tour_id)

    if error:
        return error

    if not can_manage_tour(current_user, tour):
        return jsonify({
            "message": (
                "You are not authorized to manage this tour."
            )
        }), 403

    accommodation = TourAccommodation.query.filter_by(
        id=accommodation_id,
        tour_id=tour.id
    ).first()

    if not accommodation:
        return jsonify({
            "message": "Accommodation not found."
        }), 404

    db.session.delete(accommodation)
    db.session.commit()

    return jsonify({
        "message": "Accommodation deleted successfully."
    }), 200


# =========================================================
# CREATE TOUR FAQ
# =========================================================
#
# POST /api/tours/<tour_id>/faq
#
# ADMIN / TOUR OPERATOR
#
# =========================================================

@tour_package_bp.route(
    "/tours/<int:tour_id>/faq",
    methods=["POST"]
)
@jwt_required()
@roles_required("admin", "tour_operator")
def create_faq(tour_id):

    data = request.get_json()

    if not data:
        return jsonify({
            "message": "Request body is required."
        }), 400

    question = data.get("question")
    answer = data.get("answer")

    if not isinstance(question, str) or not question.strip():
        return jsonify({
            "message": "FAQ question is required."
        }), 400

    if not isinstance(answer, str) or not answer.strip():
        return jsonify({
            "message": "FAQ answer is required."
        }), 400

    current_user = get_current_user()

    if not current_user:
        return jsonify({
            "message": "User not found."
        }), 404

    tour, error = get_tour_or_404(tour_id)

    if error:
        return error

    if not can_manage_tour(current_user, tour):
        return jsonify({
            "message": (
                "You are not authorized to manage this tour."
            )
        }), 403

    faq = TourFAQ(
        tour_id=tour.id,
        question=question.strip(),
        answer=answer.strip()
    )

    db.session.add(faq)
    db.session.commit()

    return jsonify({
        "message": "FAQ created successfully.",
        "faq": serialize_faq(faq)
    }), 201


# =========================================================
# GET TOUR FAQS
# =========================================================
#
# GET /api/tours/<tour_id>/faq
#
# PUBLIC
#
# This is the endpoint customers can use to view FAQs.
#
# =========================================================

@tour_package_bp.route(
    "/tours/<int:tour_id>/faq",
    methods=["GET"]
)
def get_faqs(tour_id):

    tour, error = get_tour_or_404(tour_id)

    if error:
        return error

    if not tour.is_active:
        return jsonify({
            "message": "Tour not found."
        }), 404

    faqs = (
        TourFAQ.query
        .filter_by(tour_id=tour.id)
        .order_by(TourFAQ.id.asc())
        .all()
    )

    return jsonify({
        "tour_id": tour.id,
        "faqs": [
            serialize_faq(item)
            for item in faqs
        ]
    }), 200


# =========================================================
# UPDATE TOUR FAQ
# =========================================================
#
# PATCH /api/tours/<tour_id>/faq/<faq_id>
#
# ADMIN / TOUR OPERATOR
#
# =========================================================

@tour_package_bp.route(
    "/tours/<int:tour_id>/faq/<int:faq_id>",
    methods=["PATCH"]
)
@jwt_required()
@roles_required("admin", "tour_operator")
def update_faq(tour_id, faq_id):

    data = request.get_json()

    if not data:
        return jsonify({
            "message": "Request body is required."
        }), 400

    current_user = get_current_user()

    if not current_user:
        return jsonify({
            "message": "User not found."
        }), 404

    tour, error = get_tour_or_404(tour_id)

    if error:
        return error

    if not can_manage_tour(current_user, tour):
        return jsonify({
            "message": (
                "You are not authorized to manage this tour."
            )
        }), 403

    faq = TourFAQ.query.filter_by(
        id=faq_id,
        tour_id=tour.id
    ).first()

    if not faq:
        return jsonify({
            "message": "FAQ not found."
        }), 404

    if "question" in data:
        question = data.get("question")

        if not isinstance(question, str) or not question.strip():
            return jsonify({
                "message": "FAQ question is required."
            }), 400

        faq.question = question.strip()

    if "answer" in data:
        answer = data.get("answer")

        if not isinstance(answer, str) or not answer.strip():
            return jsonify({
                "message": "FAQ answer is required."
            }), 400

        faq.answer = answer.strip()

    db.session.commit()

    return jsonify({
        "message": "FAQ updated successfully.",
        "faq": serialize_faq(faq)
    }), 200


# =========================================================
# DELETE TOUR FAQ
# =========================================================
#
# DELETE /api/tours/<tour_id>/faq/<faq_id>
#
# ADMIN / TOUR OPERATOR
#
# =========================================================

@tour_package_bp.route(
    "/tours/<int:tour_id>/faq/<int:faq_id>",
    methods=["DELETE"]
)
@jwt_required()
@roles_required("admin", "tour_operator")
def delete_faq(tour_id, faq_id):

    current_user = get_current_user()

    if not current_user:
        return jsonify({
            "message": "User not found."
        }), 404

    tour, error = get_tour_or_404(tour_id)

    if error:
        return error

    if not can_manage_tour(current_user, tour):
        return jsonify({
            "message": (
                "You are not authorized to manage this tour."
            )
        }), 403

    faq = TourFAQ.query.filter_by(
        id=faq_id,
        tour_id=tour.id
    ).first()

    if not faq:
        return jsonify({
            "message": "FAQ not found."
        }), 404

    db.session.delete(faq)
    db.session.commit()

    return jsonify({
        "message": "FAQ deleted successfully."
    }), 200
