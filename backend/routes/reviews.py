"""
Thafari Reviews API Routes

This module handles:

1. Public reviews
2. Customer review submission
3. Customer review editing
4. Customer review lookup
5. Admin review moderation
6. Admin review deletion

Business rules:

- Only authenticated customers can submit reviews.
- A review can only be submitted for a booking owned by
  the authenticated customer.
- The booking must have status "completed".
- Each booking can have only one review.
- Ratings must be between 1 and 5.
- Public visitors only see visible reviews.
- Administrators can hide, show, or delete reviews.
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from decorators.auth_decorator import roles_required
from extensions import db

from models.review import Review
from models.booking import Booking
from models.user import User


# =========================================================
# REVIEW BLUEPRINT
# =========================================================

review_bp = Blueprint(
    "review",
    __name__,
    url_prefix="/api"
)


# =========================================================
# SERIALIZE REVIEW
# =========================================================

def serialize_review(review):
    """
    Convert a Review model into a JSON-friendly dictionary.

    Customer information is read from the booking's user
    relationship instead of being duplicated in the review
    table.
    """

    booking = (
        Booking.query
        .filter_by(id=review.booking_id)
        .first()
    )

    customer = (
        booking.user
        if booking
        else None
    )

    departure = (
        booking.departure
        if booking
        else None
    )

    tour = (
        departure.tour
        if departure
        else None
    )

    customer_name = None

    if customer:

        full_name = " ".join(
            part
            for part in [
                customer.first_name,
                customer.last_name
            ]
            if part
        ).strip()

        customer_name = (
            full_name
            or customer.username
        )

    return {
        "review_id": review.id,

        "booking_id": review.booking_id,

        "rating": review.rating,

        "comment": review.comment,

        "is_visible": bool(
            review.is_visible
        ),

        "customer": (
            {
                "user_id": customer.id,
                "name": customer_name,
                "username": customer.username
            }
            if customer
            else None
        ),

        "tour": (
            {
                "tour_id": tour.id,
                "tour_name": tour.tour_name,
                "destination": tour.destination
            }
            if tour
            else None
        ),

        "departure": (
            {
                "departure_id": departure.id,
                "start_date": (
                    departure.start_date.isoformat()
                    if departure.start_date
                    else None
                ),
                "end_date": (
                    departure.end_date.isoformat()
                    if departure.end_date
                    else None
                )
            }
            if departure
            else None
        ),

        "created_at": (
            review.created_at.isoformat()
            if review.created_at
            else None
        ),

        "updated_at": (
            review.updated_at.isoformat()
            if review.updated_at
            else None
        )
    }


# =========================================================
# VALIDATE REVIEW DATA
# =========================================================

def validate_review_data(data):
    """
    Validate rating and comment from a customer request.

    Returns:

        rating,
        comment,
        None

    when valid.

    Returns:

        None,
        None,
        error_response

    when invalid.
    """

    if not isinstance(data, dict):

        return (
            None,
            None,
            (
                jsonify({
                    "message": (
                        "Request body is required."
                    )
                }),
                400
            )
        )

    rating = data.get("rating")

    comment = data.get("comment")

    # -----------------------------------------------------
    # RATING
    # -----------------------------------------------------

    if (
        not isinstance(rating, int)
        or isinstance(rating, bool)
    ):

        return (
            None,
            None,
            (
                jsonify({
                    "message": (
                        "Rating must be a whole number "
                        "between 1 and 5."
                    )
                }),
                400
            )
        )

    if rating < 1 or rating > 5:

        return (
            None,
            None,
            (
                jsonify({
                    "message": (
                        "Rating must be between 1 and 5."
                    )
                }),
                400
            )
        )

    # -----------------------------------------------------
    # COMMENT
    # -----------------------------------------------------

    if not isinstance(comment, str):

        return (
            None,
            None,
            (
                jsonify({
                    "message": (
                        "Review comment is required."
                    )
                }),
                400
            )
        )

    comment = comment.strip()

    if not comment:

        return (
            None,
            None,
            (
                jsonify({
                    "message": (
                        "Review comment is required."
                    )
                }),
                400
            )
        )

    if len(comment) > 2000:

        return (
            None,
            None,
            (
                jsonify({
                    "message": (
                        "Review comment must not exceed "
                        "2000 characters."
                    )
                }),
                400
            )
        )

    return (
        rating,
        comment,
        None
    )


# =========================================================
# PUBLIC REVIEWS
# =========================================================
#
# GET /api/reviews
#
# No authentication is required.
#
# Only visible reviews are returned.
# Newest reviews appear first.
# =========================================================

@review_bp.route(
    "/reviews",
    methods=["GET"]
)
def get_public_reviews():

    reviews = (
        Review.query
        .filter_by(
            is_visible=True
        )
        .order_by(
            Review.created_at.desc()
        )
        .all()
    )

    review_list = [
        serialize_review(review)
        for review in reviews
    ]

    return jsonify({

        "message":
            "Reviews retrieved successfully.",

        "count":
            len(review_list),

        "reviews":
            review_list

    }), 200


# =========================================================
# CUSTOMER - GET REVIEWS
# =========================================================
#
# GET /api/reviews/my
#
# Returns reviews belonging to the authenticated customer.
# =========================================================

@review_bp.route(
    "/reviews/my",
    methods=["GET"]
)
@jwt_required()
@roles_required("customer")
def get_my_reviews():

    current_user_id = int(
        get_jwt_identity()
    )

    reviews = (
        Review.query
        .join(
            Booking,
            Review.booking_id == Booking.id
        )
        .filter(
            Booking.user_id == current_user_id
        )
        .order_by(
            Review.created_at.desc()
        )
        .all()
    )

    review_list = [
        serialize_review(review)
        for review in reviews
    ]

    return jsonify({

        "message":
            "Your reviews retrieved successfully.",

        "count":
            len(review_list),

        "reviews":
            review_list

    }), 200


# =========================================================
# CUSTOMER - GET REVIEW FOR ONE BOOKING
# =========================================================
#
# GET /api/reviews/booking/<booking_id>
#
# Useful for the frontend to determine whether a completed
# booking already has a review.
# =========================================================

@review_bp.route(
    "/reviews/booking/<int:booking_id>",
    methods=["GET"]
)
@jwt_required()
@roles_required("customer")
def get_booking_review(booking_id):

    current_user_id = int(
        get_jwt_identity()
    )

    booking = Booking.query.filter_by(
        id=booking_id
    ).first()

    if not booking:

        return jsonify({
            "message": "Booking not found."
        }), 404

    # Customer ownership check.
    if booking.user_id != current_user_id:

        return jsonify({
            "message": (
                "You are not authorized to view "
                "this booking review."
            )
        }), 403

    review = Review.query.filter_by(
        booking_id=booking.id
    ).first()

    if not review:

        return jsonify({

            "message":
                "No review exists for this booking.",

            "review":
                None

        }), 200

    return jsonify({

        "message":
            "Booking review retrieved successfully.",

        "review":
            serialize_review(review)

    }), 200


# =========================================================
# CUSTOMER - CREATE REVIEW
# =========================================================
#
# POST /api/reviews
#
# Expected JSON:
#
# {
#     "booking_id": 123,
#     "rating": 5,
#     "comment": "Amazing experience!"
# }
#
# Rules:
#
# - Customer must own the booking.
# - Booking status must be "completed".
# - Booking can only have one review.
# =========================================================

@review_bp.route(
    "/reviews",
    methods=["POST"]
)
@jwt_required()
@roles_required("customer")
def create_review():

    current_user_id = int(
        get_jwt_identity()
    )

    data = request.get_json(
        silent=True
    ) or {}

    booking_id = data.get(
        "booking_id"
    )

    if (
        not isinstance(booking_id, int)
        or isinstance(booking_id, bool)
    ):

        return jsonify({
            "message": (
                "Booking ID must be a valid "
                "whole number."
            )
        }), 400

    booking = Booking.query.filter_by(
        id=booking_id
    ).first()

    if not booking:

        return jsonify({
            "message": "Booking not found."
        }), 404

    # -----------------------------------------------------
    # OWNERSHIP
    # -----------------------------------------------------

    if booking.user_id != current_user_id:

        return jsonify({
            "message": (
                "You are not authorized to review "
                "this booking."
            )
        }), 403

    # -----------------------------------------------------
    # COMPLETED BOOKING ONLY
    # -----------------------------------------------------

    if booking.status != "completed":

        return jsonify({
            "message": (
                "You can only review a completed booking."
            ),
            "booking_status":
                booking.status
        }), 400

    # -----------------------------------------------------
    # ONE REVIEW PER BOOKING
    # -----------------------------------------------------

    existing_review = Review.query.filter_by(
        booking_id=booking.id
    ).first()

    if existing_review:

        return jsonify({
            "message": (
                "This booking already has a review."
            ),
            "review":
                serialize_review(existing_review)
        }), 409

    # -----------------------------------------------------
    # VALIDATE REVIEW DATA
    # -----------------------------------------------------

    rating, comment, validation_error = (
        validate_review_data(data)
    )

    if validation_error:

        return validation_error

    review = Review(

        booking_id=booking.id,

        rating=rating,

        comment=comment,

        is_visible=True

    )

    try:

        db.session.add(review)

        db.session.commit()

    except Exception as e:

        db.session.rollback()

        print(
            f"Review creation error: {e}"
        )

        return jsonify({
            "message": (
                "Unable to submit the review."
            )
        }), 500

    return jsonify({

        "message":
            "Review submitted successfully.",

        "review":
            serialize_review(review)

    }), 201


# =========================================================
# CUSTOMER - UPDATE REVIEW
# =========================================================
#
# PUT /api/reviews/<review_id>
#
# Customers can only edit their own review.
# =========================================================

@review_bp.route(
    "/reviews/<int:review_id>",
    methods=["PUT"]
)
@jwt_required()
@roles_required("customer")
def update_review(review_id):

    current_user_id = int(
        get_jwt_identity()
    )

    review = Review.query.filter_by(
        id=review_id
    ).first()

    if not review:

        return jsonify({
            "message": "Review not found."
        }), 404

    booking = Booking.query.filter_by(
        id=review.booking_id
    ).first()

    if not booking:

        return jsonify({
            "message": (
                "Booking associated with "
                "this review was not found."
            )
        }), 404

    # -----------------------------------------------------
    # OWNERSHIP
    # -----------------------------------------------------

    if booking.user_id != current_user_id:

        return jsonify({
            "message": (
                "You are not authorized to "
                "edit this review."
            )
        }), 403

    # -----------------------------------------------------
    # VALIDATE NEW CONTENT
    # -----------------------------------------------------

    data = request.get_json(
        silent=True
    ) or {}

    rating, comment, validation_error = (
        validate_review_data(data)
    )

    if validation_error:

        return validation_error

    review.rating = rating

    review.comment = comment

    try:

        db.session.commit()

    except Exception as e:

        db.session.rollback()

        print(
            f"Review update error: {e}"
        )

        return jsonify({
            "message": (
                "Unable to update the review."
            )
        }), 500

    return jsonify({

        "message":
            "Review updated successfully.",

        "review":
            serialize_review(review)

    }), 200


# =========================================================
# ADMIN - GET ALL REVIEWS
# =========================================================
#
# GET /api/admin/reviews
#
# Admins can see both visible and hidden reviews.
# =========================================================

@review_bp.route(
    "/admin/reviews",
    methods=["GET"]
)
@jwt_required()
@roles_required("admin")
def get_admin_reviews():

    reviews = (
        Review.query
        .order_by(
            Review.created_at.desc()
        )
        .all()
    )

    review_list = [
        serialize_review(review)
        for review in reviews
    ]

    return jsonify({

        "message":
            "Reviews retrieved successfully.",

        "count":
            len(review_list),

        "reviews":
            review_list

    }), 200


# =========================================================
# ADMIN - CHANGE REVIEW VISIBILITY
# =========================================================
#
# PATCH /api/admin/reviews/<review_id>/visibility
#
# Expected JSON:
#
# {
#     "is_visible": false
# }
#
# Admins can hide or show a review without deleting it.
# =========================================================

@review_bp.route(
    "/admin/reviews/<int:review_id>/visibility",
    methods=["PATCH"]
)
@jwt_required()
@roles_required("admin")
def update_review_visibility(review_id):

    review = Review.query.filter_by(
        id=review_id
    ).first()

    if not review:

        return jsonify({
            "message": "Review not found."
        }), 404

    data = request.get_json(
        silent=True
    ) or {}

    is_visible = data.get(
        "is_visible"
    )

    if not isinstance(is_visible, bool):

        return jsonify({
            "message": (
                "is_visible must be true or false."
            )
        }), 400

    review.is_visible = is_visible

    try:

        db.session.commit()

    except Exception as e:

        db.session.rollback()

        print(
            f"Review visibility update error: {e}"
        )

        return jsonify({
            "message": (
                "Unable to update review visibility."
            )
        }), 500

    return jsonify({

        "message": (
            "Review visibility updated successfully."
        ),

        "review":
            serialize_review(review)

    }), 200


# =========================================================
# ADMIN - DELETE REVIEW
# =========================================================
#
# DELETE /api/admin/reviews/<review_id>
#
# Physical deletion is reserved for administrators.
# =========================================================

@review_bp.route(
    "/admin/reviews/<int:review_id>",
    methods=["DELETE"]
)
@jwt_required()
@roles_required("admin")
def delete_review(review_id):

    review = Review.query.filter_by(
        id=review_id
    ).first()

    if not review:

        return jsonify({
            "message": "Review not found."
        }), 404

    try:

        db.session.delete(review)

        db.session.commit()

    except Exception as e:

        db.session.rollback()

        print(
            f"Review deletion error: {e}"
        )

        return jsonify({
            "message": (
                "Unable to delete the review."
            )
        }), 500

    return jsonify({

        "message":
            "Review deleted successfully."

    }), 200
