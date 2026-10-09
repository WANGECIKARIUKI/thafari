# ============================================================
# THAFARI GUEST INQUIRY ROUTES
# ============================================================

# This file handles inquiries submitted by visitors/guests
# through the public "Ask Thafari" chatbot.
#
# Guests DO NOT need to be logged in.
#
# Admins and tour operators can view and manage inquiries
# from the admin side.
# ============================================================


from flask import Blueprint, jsonify, request

from flask_jwt_extended import (
    jwt_required,
    get_jwt_identity
)

from extensions import db, limiter

from models.guest_inquiry import GuestInquiry
from models.user import User

from services.notification_service import (
    create_notification,
    emit_notification
)

from decorators.auth_decorator import roles_required


# ============================================================
# BLUEPRINT
# ============================================================

guest_inquiry_bp = Blueprint(
    "guest_inquiry",
    __name__,
    url_prefix="/api"
)


# ============================================================
# PUBLIC: SUBMIT GUEST INQUIRY
# ============================================================

@guest_inquiry_bp.route(
    "/guest-inquiries",
    methods=["POST"]
)
@limiter.limit("10 per 15 minutes")
def create_guest_inquiry():
    """
    Allow a visitor to submit an inquiry without logging in.

    Required:
        name
        message

    Email and phone are optional.
    """

    data = request.get_json(silent=True) or {}

    name = str(data.get("name", "")).strip()
    email = str(data.get("email", "")).strip()
    phone = str(data.get("phone", "")).strip()
    message = str(data.get("message", "")).strip()


    # --------------------------------------------------------
    # Validate name
    # --------------------------------------------------------

    if not name:
        return jsonify({
            "message": "Please provide your name."
        }), 400

    if len(name) > 120:
        return jsonify({
            "message": "Name must not exceed 120 characters."
        }), 400


    # --------------------------------------------------------
    # Validate optional contact information
    # --------------------------------------------------------

    if len(email) > 255:
        return jsonify({
            "message": "Email address is too long."
        }), 400

    if len(phone) > 50:
        return jsonify({
            "message": "Phone number is too long."
        }), 400


    # --------------------------------------------------------
    # Validate message
    # --------------------------------------------------------

    if not message:
        return jsonify({
            "message": "Please enter your inquiry."
        }), 400

    if len(message) > 2000:
        return jsonify({
            "message": (
                "Your inquiry is too long. "
                "Please keep it under 2000 characters."
            )
        }), 400


    # --------------------------------------------------------
    # Database transaction
    # --------------------------------------------------------

    notifications = []

    try:

        # ----------------------------------------------------
        # Create inquiry
        # ----------------------------------------------------

        inquiry = GuestInquiry(
            name=name,
            email=email or None,
            phone=phone or None,
            message=message,
            status="pending"
        )

        db.session.add(inquiry)

        # Flush so the inquiry receives its ID.
        db.session.flush()


        # ----------------------------------------------------
        # Find ACTIVE admins and tour operators
        # ----------------------------------------------------

        staff_users = User.query.filter(
            User.role.in_(["admin", "tour_operator"]),
            User.is_active.is_(True)
        ).all()


        # ----------------------------------------------------
        # Create notifications
        # ----------------------------------------------------

        for staff_user in staff_users:

            notification = create_notification(
                user_id=staff_user.id,
                title="New Guest Inquiry",
                message=(
                    f"{name} submitted a new inquiry"
                    + (
                        f" - {message[:100]}"
                        if message
                        else ""
                    )
                ),
                notification_type="message",
                link="/admin/guest-inquiries"
            )

            notifications.append(notification)


        # ----------------------------------------------------
        # Commit inquiry + notifications together
        # ----------------------------------------------------

        db.session.commit()


    except Exception:

        db.session.rollback()

        return jsonify({
            "message": (
                "We could not submit your inquiry right now. "
                "Please try again."
            )
        }), 500


    # --------------------------------------------------------
    # Emit notifications AFTER successful commit
    # --------------------------------------------------------

    for notification in notifications:

        try:
            emit_notification(notification)

        except Exception:
            # The inquiry has already been successfully saved.
            # A notification delivery failure should not make
            # the guest submission appear unsuccessful.
            pass


    # --------------------------------------------------------
    # Success response
    # --------------------------------------------------------

    return jsonify({
        "message": (
            "Your inquiry has been submitted successfully. "
            "The Thafari team will get back to you."
        ),
        "inquiry_id": inquiry.id
    }), 201


# ============================================================
# ADMIN / TOUR OPERATOR: GET GUEST INQUIRIES
# ============================================================

@guest_inquiry_bp.route(
    "/admin/guest-inquiries",
    methods=["GET"]
)
@jwt_required()
@roles_required("admin", "tour_operator")
def get_guest_inquiries():
    """
    Return guest inquiries for authorized staff.
    """

    inquiries = GuestInquiry.query.order_by(
        GuestInquiry.created_at.desc()
    ).all()


    return jsonify({
        "inquiries": [

            {
                "id": inquiry.id,
                "name": inquiry.name,
                "email": inquiry.email,
                "phone": inquiry.phone,
                "message": inquiry.message,
                "status": inquiry.status,
                "assigned_to": inquiry.assigned_to,
                "response": inquiry.response,
                "created_at": inquiry.created_at.isoformat(),
                "updated_at": inquiry.updated_at.isoformat()
            }

            for inquiry in inquiries

        ]
    }), 200


# ============================================================
# ADMIN / TOUR OPERATOR: UPDATE GUEST INQUIRY
# ============================================================

@guest_inquiry_bp.route(
    "/admin/guest-inquiries/<int:inquiry_id>",
    methods=["PATCH"]
)
@jwt_required()
@roles_required("admin", "tour_operator")
def update_guest_inquiry(inquiry_id):
    """
    Update the status, response or assignment of an inquiry.
    """

    inquiry = GuestInquiry.query.get(inquiry_id)


    if not inquiry:

        return jsonify({
            "message": "Guest inquiry not found."
        }), 404


    data = request.get_json(silent=True) or {}


    # --------------------------------------------------------
    # Get current authenticated staff member
    # --------------------------------------------------------

    try:

        current_user_id = int(
            get_jwt_identity()
        )

    except (TypeError, ValueError):

        return jsonify({
            "message": "Invalid authenticated user."
        }), 401


    # --------------------------------------------------------
    # Update status
    # --------------------------------------------------------

    if "status" in data:

        allowed_statuses = {
            "pending",
            "in_progress",
            "resolved"
        }

        status = str(
            data.get("status", "")
        ).strip()


        if status not in allowed_statuses:

            return jsonify({
                "message": "Invalid inquiry status."
            }), 400


        inquiry.status = status


    # --------------------------------------------------------
    # Assign inquiry to current staff member
    # --------------------------------------------------------

    if data.get("assign_to_me") is True:

        inquiry.assigned_to = current_user_id


    # --------------------------------------------------------
    # Update response
    # --------------------------------------------------------

    if "response" in data:

        response = str(
            data.get("response", "")
        ).strip()


        if len(response) > 5000:

            return jsonify({
                "message": (
                    "Response must not exceed "
                    "5000 characters."
                )
            }), 400


        inquiry.response = response or None


    # --------------------------------------------------------
    # Save changes
    # --------------------------------------------------------

    try:

        db.session.commit()

    except Exception:

        db.session.rollback()

        return jsonify({
            "message": "Could not update the guest inquiry."
        }), 500


    # --------------------------------------------------------
    # Return updated inquiry
    # --------------------------------------------------------

    return jsonify({

        "message": "Guest inquiry updated successfully.",

        "inquiry": {

            "id": inquiry.id,
            "name": inquiry.name,
            "email": inquiry.email,
            "phone": inquiry.phone,
            "message": inquiry.message,
            "status": inquiry.status,
            "assigned_to": inquiry.assigned_to,
            "response": inquiry.response,
            "created_at": inquiry.created_at.isoformat(),
            "updated_at": inquiry.updated_at.isoformat()

        }

    }), 200