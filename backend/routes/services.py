"""
Thafari Services API Routes

This module provides:

1. A public endpoint for customers and visitors to view
   active services offered by Thafari.

2. Admin-only endpoints to:
   - View all services
   - Add a service
   - Edit a service
   - Activate/deactivate a service
   - Remove a service

Services are stored in the database so the public website
does not need to be changed whenever Thafari adds or updates
a service.

Each service can also contain an optional:
- Image URL
- Link URL
- Link label
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required

from decorators.auth_decorator import roles_required
from extensions import db
from models.service import Service


# =========================================================
# SERVICE BLUEPRINT
# =========================================================

service_bp = Blueprint(
    "service",
    __name__,
    url_prefix="/api"
)


# =========================================================
# SERIALIZE SERVICE
# =========================================================

def serialize_service(service):
    """
    Convert a Service model into a JSON-friendly dictionary.
    """

    return {
        "id": service.id,

        "name": service.name,

        "description": service.description,

        "image_url": service.image_url,

        "link_url": service.link_url,

        "link_label": service.link_label,

        "is_active": bool(
            service.is_active
        ),

        "created_at": (
            service.created_at.isoformat()
            if service.created_at
            else None
        ),

        "updated_at": (
            service.updated_at.isoformat()
            if service.updated_at
            else None
        )
    }


# =========================================================
# VALIDATE OPTIONAL SERVICE DISPLAY FIELDS
# =========================================================

def validate_optional_service_fields(
    data
):
    """
    Validate the optional visual/action fields.

    image_url:
        Maximum 500 characters.

    link_url:
        Maximum 255 characters.

    link_label:
        Maximum 100 characters.

    Blank strings are converted to None so the database
    stores them as empty optional values rather than
    meaningless whitespace.
    """

    image_url = data.get(
        "image_url"
    )

    link_url = data.get(
        "link_url"
    )

    link_label = data.get(
        "link_label"
    )

    # -----------------------------------------------------
    # IMAGE URL
    # -----------------------------------------------------

    if image_url is not None:

        if not isinstance(
            image_url,
            str
        ):

            return (
                None,
                None,
                None,
                (
                    jsonify({
                        "message": (
                            "image_url must be text."
                        )
                    }),
                    400
                )
            )

        image_url = image_url.strip()

        if len(image_url) > 500:

            return (
                None,
                None,
                None,
                (
                    jsonify({
                        "message": (
                            "image_url must not exceed "
                            "500 characters."
                        )
                    }),
                    400
                )
            )

        image_url = (
            image_url
            if image_url
            else None
        )

    # -----------------------------------------------------
    # LINK URL
    # -----------------------------------------------------

    if link_url is not None:

        if not isinstance(
            link_url,
            str
        ):

            return (
                None,
                None,
                None,
                (
                    jsonify({
                        "message": (
                            "link_url must be text."
                        )
                    }),
                    400
                )
            )

        link_url = link_url.strip()

        if len(link_url) > 255:

            return (
                None,
                None,
                None,
                (
                    jsonify({
                        "message": (
                            "link_url must not exceed "
                            "255 characters."
                        )
                    }),
                    400
                )
            )

        link_url = (
            link_url
            if link_url
            else None
        )

    # -----------------------------------------------------
    # LINK LABEL
    # -----------------------------------------------------

    if link_label is not None:

        if not isinstance(
            link_label,
            str
        ):

            return (
                None,
                None,
                None,
                (
                    jsonify({
                        "message": (
                            "link_label must be text."
                        )
                    }),
                    400
                )
            )

        link_label = link_label.strip()

        if len(link_label) > 100:

            return (
                None,
                None,
                None,
                (
                    jsonify({
                        "message": (
                            "link_label must not exceed "
                            "100 characters."
                        )
                    }),
                    400
                )
            )

        link_label = (
            link_label
            if link_label
            else None
        )

    return (
        image_url,
        link_url,
        link_label,
        None
    )


# =========================================================
# PUBLIC SERVICES
# =========================================================
#
# GET /api/services
#
# Customers and visitors only receive active services.
# No authentication is required.
# =========================================================

@service_bp.route(
    "/services",
    methods=["GET"]
)
def get_public_services():

    services = (
        Service.query
        .filter_by(is_active=True)
        .order_by(Service.id.asc())
        .all()
    )

    return jsonify({
        "message":
            "Services retrieved successfully.",

        "count":
            len(services),

        "services": [
            serialize_service(service)
            for service in services
        ]
    }), 200


# =========================================================
# ADMIN - GET ALL SERVICES
# =========================================================
#
# GET /api/admin/services
#
# Admins can see both active and inactive services.
# =========================================================

@service_bp.route(
    "/admin/services",
    methods=["GET"]
)
@jwt_required()
@roles_required("admin")
def get_admin_services():

    services = (
        Service.query
        .order_by(Service.id.asc())
        .all()
    )

    return jsonify({
        "message":
            "Services retrieved successfully.",

        "count":
            len(services),

        "services": [
            serialize_service(service)
            for service in services
        ]
    }), 200


# =========================================================
# ADMIN - CREATE SERVICE
# =========================================================
#
# POST /api/admin/services
#
# Expected JSON:
#
# {
#     "name": "Safari & Tour Bookings",
#     "description": "Book unforgettable safari experiences.",
#     "image_url": "/services/safari.jpg",
#     "link_url": "/tours",
#     "link_label": "Explore Safaris",
#     "is_active": true
# }
#
# image_url, link_url and link_label are optional.
# =========================================================

@service_bp.route(
    "/admin/services",
    methods=["POST"]
)
@jwt_required()
@roles_required("admin")
def create_service():

    data = request.get_json(
        silent=True
    ) or {}

    name = data.get(
        "name"
    )

    description = data.get(
        "description"
    )

    is_active = data.get(
        "is_active",
        True
    )

    # -----------------------------------------------------
    # Validate service name.
    # -----------------------------------------------------

    if (
        not isinstance(name, str)
        or not name.strip()
    ):

        return jsonify({
            "message":
                "Service name is required."
        }), 400

    name = name.strip()

    # -----------------------------------------------------
    # Validate service description.
    # -----------------------------------------------------

    if (
        not isinstance(description, str)
        or not description.strip()
    ):

        return jsonify({
            "message":
                "Service description is required."
        }), 400

    description = description.strip()

    # -----------------------------------------------------
    # Validate active status.
    # -----------------------------------------------------

    if not isinstance(
        is_active,
        bool
    ):

        return jsonify({
            "message":
                "is_active must be true or false."
        }), 400

    # -----------------------------------------------------
    # Validate optional visual/action fields.
    # -----------------------------------------------------

    (
        image_url,
        link_url,
        link_label,
        validation_error
    ) = validate_optional_service_fields(
        data
    )

    if validation_error:

        return validation_error

    # -----------------------------------------------------
    # Create service.
    # -----------------------------------------------------

    service = Service(
        name=name,

        description=description,

        image_url=image_url,

        link_url=link_url,

        link_label=link_label,

        is_active=is_active
    )

    try:

        db.session.add(service)

        db.session.commit()

    except Exception as e:

        db.session.rollback()

        print(
            f"Service creation error: {e}"
        )

        return jsonify({
            "message":
                "Unable to create service."
        }), 500

    return jsonify({

        "message":
            "Service created successfully.",

        "service":
            serialize_service(service)

    }), 201


# =========================================================
# ADMIN - UPDATE SERVICE
# =========================================================
#
# PUT /api/admin/services/<service_id>
#
# All supplied fields are updated.
# =========================================================

@service_bp.route(
    "/admin/services/<int:service_id>",
    methods=["PUT"]
)
@jwt_required()
@roles_required("admin")
def update_service(service_id):

    service = Service.query.get(
        service_id
    )

    if not service:

        return jsonify({
            "message":
                "Service not found."
        }), 404

    data = request.get_json(
        silent=True
    ) or {}

    name = data.get(
        "name"
    )

    description = data.get(
        "description"
    )

    is_active = data.get(
        "is_active"
    )

    # -----------------------------------------------------
    # Validate and update service name when supplied.
    # -----------------------------------------------------

    if name is not None:

        if (
            not isinstance(name, str)
            or not name.strip()
        ):

            return jsonify({
                "message":
                    "Service name cannot be empty."
            }), 400

        service.name = name.strip()

    # -----------------------------------------------------
    # Validate and update description when supplied.
    # -----------------------------------------------------

    if description is not None:

        if (
            not isinstance(description, str)
            or not description.strip()
        ):

            return jsonify({
                "message":
                    (
                        "Service description cannot "
                        "be empty."
                    )
            }), 400

        service.description = (
            description.strip()
        )

    # -----------------------------------------------------
    # Validate and update active status when supplied.
    # -----------------------------------------------------

    if is_active is not None:

        if not isinstance(
            is_active,
            bool
        ):

            return jsonify({
                "message":
                    "is_active must be true or false."
            }), 400

        service.is_active = is_active

    # -----------------------------------------------------
    # Update optional visual/action fields.
    # -----------------------------------------------------
    #
    # Because this is an update, only modify each field if
    # the frontend actually supplied it.
    # -----------------------------------------------------

    if "image_url" in data:

        image_url = data.get(
            "image_url"
        )

        if image_url is not None:

            if not isinstance(
                image_url,
                str
            ):

                return jsonify({
                    "message":
                        "image_url must be text."
                }), 400

            image_url = image_url.strip()

            if len(image_url) > 500:

                return jsonify({
                    "message":
                        (
                            "image_url must not exceed "
                            "500 characters."
                        )
                }), 400

        service.image_url = (
            image_url
            if image_url
            else None
        )

    if "link_url" in data:

        link_url = data.get(
            "link_url"
        )

        if link_url is not None:

            if not isinstance(
                link_url,
                str
            ):

                return jsonify({
                    "message":
                        "link_url must be text."
                }), 400

            link_url = link_url.strip()

            if len(link_url) > 255:

                return jsonify({
                    "message":
                        (
                            "link_url must not exceed "
                            "255 characters."
                        )
                }), 400

        service.link_url = (
            link_url
            if link_url
            else None
        )

    if "link_label" in data:

        link_label = data.get(
            "link_label"
        )

        if link_label is not None:

            if not isinstance(
                link_label,
                str
            ):

                return jsonify({
                    "message":
                        "link_label must be text."
                }), 400

            link_label = link_label.strip()

            if len(link_label) > 100:

                return jsonify({
                    "message":
                        (
                            "link_label must not exceed "
                            "100 characters."
                        )
                }), 400

        service.link_label = (
            link_label
            if link_label
            else None
        )

    try:

        db.session.commit()

    except Exception as e:

        db.session.rollback()

        print(
            f"Service update error: {e}"
        )

        return jsonify({
            "message":
                "Unable to update service."
        }), 500

    return jsonify({

        "message":
            "Service updated successfully.",

        "service":
            serialize_service(service)

    }), 200


# =========================================================
# ADMIN - REMOVE SERVICE
# =========================================================
#
# DELETE /api/admin/services/<service_id>
#
# This permanently removes the selected service from the
# database.
# =========================================================

@service_bp.route(
    "/admin/services/<int:service_id>",
    methods=["DELETE"]
)
@jwt_required()
@roles_required("admin")
def delete_service(service_id):

    service = Service.query.get(
        service_id
    )

    if not service:

        return jsonify({
            "message":
                "Service not found."
        }), 404

    try:

        db.session.delete(service)

        db.session.commit()

    except Exception as e:

        db.session.rollback()

        print(
            f"Service deletion error: {e}"
        )

        return jsonify({
            "message":
                "Unable to remove service."
        }), 500

    return jsonify({

        "message":
            "Service removed successfully."

    }), 200
