"""
Thafari Contact API Routes

This module provides:

1. A public endpoint for visitors and customers to view
   Thafari contact details.

2. Admin-only endpoints to:
   - View the current contact details
   - Create/update the default contact details

The contact details are stored in the database so an
administrator can change them without modifying the frontend.
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required

from decorators.auth_decorator import roles_required
from extensions import db
from models.contact import Contact


# =========================================================
# CONTACT BLUEPRINT
# =========================================================

contact_bp = Blueprint(
    "contact",
    __name__,
    url_prefix="/api"
)


# =========================================================
# SERIALIZE CONTACT
# =========================================================

def serialize_contact(contact):
    """
    Convert a Contact model into a JSON-friendly dictionary.
    """

    return {
        "id": contact.id,
        "whatsapp": contact.whatsapp,
        "email": contact.email,
        "phone_number": contact.phone_number,
        "created_at": (
            contact.created_at.isoformat()
            if contact.created_at
            else None
        ),
        "updated_at": (
            contact.updated_at.isoformat()
            if contact.updated_at
            else None
        )
    }


# =========================================================
# GET PUBLIC CONTACT DETAILS
# =========================================================
#
# GET /api/contact
#
# No authentication is required.
#
# The public website uses this endpoint to display the
# current WhatsApp, email and phone number.
# =========================================================

@contact_bp.route(
    "/contact",
    methods=["GET"]
)
def get_public_contact():

    contact = (
        Contact.query
        .order_by(Contact.id.asc())
        .first()
    )

    if not contact:

        return jsonify({
            "message": (
                "Thafari contact details have not "
                "been configured yet."
            )
        }), 404

    return jsonify({
        "message": "Contact details retrieved successfully.",
        "contact": serialize_contact(contact)
    }), 200


# =========================================================
# GET ADMIN CONTACT DETAILS
# =========================================================
#
# GET /api/admin/contact
#
# Admin only.
#
# Returns the current default contact record.
# =========================================================

@contact_bp.route(
    "/admin/contact",
    methods=["GET"]
)
@jwt_required()
@roles_required("admin")
def get_admin_contact():

    contact = (
        Contact.query
        .order_by(Contact.id.asc())
        .first()
    )

    if not contact:

        return jsonify({
            "message": (
                "Contact details have not been "
                "configured yet."
            )
        }), 404

    return jsonify({
        "message": "Contact details retrieved successfully.",
        "contact": serialize_contact(contact)
    }), 200


# =========================================================
# CREATE / UPDATE DEFAULT CONTACT DETAILS
# =========================================================
#
# PUT /api/admin/contact
#
# Admin only.
#
# Expected JSON:
#
# {
#     "whatsapp": "+254 700 000 000",
#     "email": "hello@thafari.com",
#     "phone_number": "+254 700 000 000"
# }
#
# If a contact record already exists, it is updated.
#
# If one does not exist yet, the first record is created.
#
# This keeps Thafari working with one default contact record
# without requiring a separate settings key.
# =========================================================

@contact_bp.route(
    "/admin/contact",
    methods=["PUT"]
)
@jwt_required()
@roles_required("admin")
def update_admin_contact():

    data = request.get_json(
        silent=True
    ) or {}

    whatsapp = data.get("whatsapp")
    email = data.get("email")
    phone_number = data.get("phone_number")

    # -----------------------------------------------------
    # Validate WhatsApp.
    # -----------------------------------------------------

    if not isinstance(whatsapp, str):

        return jsonify({
            "message": "WhatsApp number is required."
        }), 400

    whatsapp = whatsapp.strip()

    if not whatsapp:

        return jsonify({
            "message": "WhatsApp number is required."
        }), 400

    if len(whatsapp) > 30:

        return jsonify({
            "message": (
                "WhatsApp number must not exceed "
                "30 characters."
            )
        }), 400

    # -----------------------------------------------------
    # Validate email.
    # -----------------------------------------------------

    if not isinstance(email, str):

        return jsonify({
            "message": "Email address is required."
        }), 400

    email = email.strip()

    if not email:

        return jsonify({
            "message": "Email address is required."
        }), 400

    if len(email) > 150:

        return jsonify({
            "message": (
                "Email address must not exceed "
                "150 characters."
            )
        }), 400

    if "@" not in email or "." not in email.rsplit("@", 1)[-1]:

        return jsonify({
            "message": "Please enter a valid email address."
        }), 400

    # -----------------------------------------------------
    # Validate phone number.
    # -----------------------------------------------------

    if not isinstance(phone_number, str):

        return jsonify({
            "message": "Phone number is required."
        }), 400

    phone_number = phone_number.strip()

    if not phone_number:

        return jsonify({
            "message": "Phone number is required."
        }), 400

    if len(phone_number) > 30:

        return jsonify({
            "message": (
                "Phone number must not exceed "
                "30 characters."
            )
        }), 400

    # -----------------------------------------------------
    # Get existing default contact record.
    # -----------------------------------------------------

    contact = (
        Contact.query
        .order_by(Contact.id.asc())
        .first()
    )

    # -----------------------------------------------------
    # Create the first contact record.
    # -----------------------------------------------------

    if not contact:

        contact = Contact(
            whatsapp=whatsapp,
            email=email,
            phone_number=phone_number
        )

        try:

            db.session.add(contact)
            db.session.commit()

        except Exception as e:

            db.session.rollback()

            print(
                f"Contact creation error: {e}"
            )

            return jsonify({
                "message": (
                    "Unable to save contact details."
                )
            }), 500

        return jsonify({
            "message": (
                "Contact details created successfully."
            ),
            "contact": serialize_contact(contact)
        }), 201

    # -----------------------------------------------------
    # Update the existing contact record.
    # -----------------------------------------------------

    contact.whatsapp = whatsapp
    contact.email = email
    contact.phone_number = phone_number

    try:

        db.session.commit()

    except Exception as e:

        db.session.rollback()

        print(
            f"Contact update error: {e}"
        )

        return jsonify({
            "message": (
                "Unable to update contact details."
            )
        }), 500

    return jsonify({
        "message": (
            "Contact details updated successfully."
        ),
        "contact": serialize_contact(contact)
    }), 200
