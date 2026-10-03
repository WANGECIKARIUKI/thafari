# ============================================================
# THAFARI NOTIFICATION ROUTES
# ============================================================
#
# This file contains API endpoints for:
#
# - getting all notifications
# - getting unread notifications
# - getting the unread notification count
# - marking one notification as read
# - marking all notifications as read
# - creating a temporary test notification
#
# Notifications can optionally contain a "link".
#
# The link is used by the frontend "View / Open" button.
#
# Example:
#
#     /admin/direct-payments/42
#
# The notification page will:
#
#     Mark as read + navigate to the link
#
# while the normal "Mark as read" button will only mark
# the notification as read.
# ============================================================

from flask import Blueprint, jsonify, request

from flask_jwt_extended import (
    jwt_required,
    get_jwt_identity
)

from extensions import db

from models.notification import Notification

from services.notification_service import (
    create_notification,
    emit_notification
)


# ============================================================
# BLUEPRINT
# ============================================================

notification_bp = Blueprint(
    "notification",
    __name__,
    url_prefix="/api"
)


# ============================================================
# GET ALL NOTIFICATIONS
# ============================================================

@notification_bp.route(
    "/notifications",
    methods=["GET"]
)
@jwt_required()
def get_notifications():
    """
    Return notifications belonging to the currently
    authenticated user.

    Users can only see their own notifications.

    The response includes the optional notification link.
    """

    # --------------------------------------------------------
    # Get the currently authenticated user's ID from JWT.
    # --------------------------------------------------------

    current_user_id = int(
        get_jwt_identity()
    )


    # --------------------------------------------------------
    # Get the user's notifications.
    #
    # Newest notifications are returned first.
    # --------------------------------------------------------

    notifications = Notification.query.filter_by(
        user_id=current_user_id
    ).order_by(
        Notification.created_at.desc()
    ).all()


    # --------------------------------------------------------
    # Return the notifications.
    # --------------------------------------------------------

    return jsonify({

        "notifications": [

            {
                "id": notification.id,

                "title": notification.title,

                "message": notification.message,

                "notification_type":
                    notification.notification_type,

                "is_read":
                    notification.is_read,

                # ------------------------------------------------
                # IMPORTANT:
                #
                # This allows React to know where the notification
                # can be opened.
                #
                # It can be:
                #
                # "/admin/direct-payments/42"
                #
                # or None if the notification has no destination.
                # ------------------------------------------------

                "link":
                    notification.link,

                "created_at":
                    notification.created_at.isoformat(),

                "updated_at":
                    notification.updated_at.isoformat()
            }

            for notification in notifications

        ]

    }), 200


# ============================================================
# GET UNREAD NOTIFICATIONS
# ============================================================

@notification_bp.route(
    "/notifications/unread",
    methods=["GET"]
)
@jwt_required()
def get_unread_notifications():
    """
    Return only unread notifications belonging to
    the currently authenticated user.

    The response also includes the optional notification link.
    """

    # --------------------------------------------------------
    # Get the currently authenticated user's ID.
    # --------------------------------------------------------

    current_user_id = int(
        get_jwt_identity()
    )


    # --------------------------------------------------------
    # Get unread notifications for this user.
    # --------------------------------------------------------

    notifications = Notification.query.filter_by(
        user_id=current_user_id,
        is_read=False
    ).order_by(
        Notification.created_at.desc()
    ).all()


    # --------------------------------------------------------
    # Return unread notifications.
    # --------------------------------------------------------

    return jsonify({

        "notifications": [

            {
                "id": notification.id,

                "title": notification.title,

                "message": notification.message,

                "notification_type":
                    notification.notification_type,

                "is_read":
                    notification.is_read,

                # ------------------------------------------------
                # Include the destination link here as well.
                # ------------------------------------------------

                "link":
                    notification.link,

                "created_at":
                    notification.created_at.isoformat(),

                "updated_at":
                    notification.updated_at.isoformat()
            }

            for notification in notifications

        ]

    }), 200


# ============================================================
# GET UNREAD NOTIFICATION COUNT
# ============================================================

@notification_bp.route(
    "/notifications/unread-count",
    methods=["GET"]
)
@jwt_required()
def get_unread_notification_count():
    """
    Return the number of unread notifications belonging
    to the currently authenticated user.
    """

    # --------------------------------------------------------
    # Get the current user.
    # --------------------------------------------------------

    current_user_id = int(
        get_jwt_identity()
    )


    # --------------------------------------------------------
    # Count unread notifications.
    # --------------------------------------------------------

    unread_count = Notification.query.filter_by(
        user_id=current_user_id,
        is_read=False
    ).count()


    return jsonify({

        "unread_count":
            unread_count

    }), 200


# ============================================================
# MARK ONE NOTIFICATION AS READ
# ============================================================

@notification_bp.route(
    "/notifications/<int:notification_id>/read",
    methods=["PATCH"]
)
@jwt_required()
def mark_notification_as_read(notification_id):
    """
    Mark one notification as read.

    Security:
    The notification must belong to the currently
    authenticated user.
    """

    # --------------------------------------------------------
    # Get current user.
    # --------------------------------------------------------

    current_user_id = int(
        get_jwt_identity()
    )


    # --------------------------------------------------------
    # Find the notification belonging to this user.
    #
    # This prevents one user from marking another user's
    # notification as read.
    # --------------------------------------------------------

    notification = Notification.query.filter_by(
        id=notification_id,
        user_id=current_user_id
    ).first()


    # --------------------------------------------------------
    # Notification not found.
    # --------------------------------------------------------

    if not notification:

        return jsonify({
            "message": "Notification not found."
        }), 404


    # --------------------------------------------------------
    # Mark notification as read.
    # --------------------------------------------------------

    notification.is_read = True


    # --------------------------------------------------------
    # Save the change.
    # --------------------------------------------------------

    db.session.commit()


    return jsonify({

        "message":
            "Notification marked as read.",

        "notification": {

            "id":
                notification.id,

            "is_read":
                notification.is_read

        }

    }), 200


# ============================================================
# MARK ALL NOTIFICATIONS AS READ
# ============================================================

@notification_bp.route(
    "/notifications/read-all",
    methods=["PATCH"]
)
@jwt_required()
def mark_all_notifications_as_read():
    """
    Mark all unread notifications belonging to the
    currently authenticated user as read.
    """

    # --------------------------------------------------------
    # Get current user.
    # --------------------------------------------------------

    current_user_id = int(
        get_jwt_identity()
    )


    # --------------------------------------------------------
    # Get all unread notifications belonging to the user.
    # --------------------------------------------------------

    notifications = Notification.query.filter_by(
        user_id=current_user_id,
        is_read=False
    ).all()


    # --------------------------------------------------------
    # Mark every notification as read.
    # --------------------------------------------------------

    for notification in notifications:

        notification.is_read = True


    # --------------------------------------------------------
    # Save changes.
    # --------------------------------------------------------

    db.session.commit()


    return jsonify({

        "message":
            "All notifications marked as read.",

        "updated_count":
            len(notifications)

    }), 200


# ============================================================
# TEMPORARY DEVELOPMENT TEST ROUTE
# ============================================================
#
# We are keeping this temporarily because it gives us an
# easy way to test the new notification link functionality
# before connecting every real Thafari event.
#
# Once we have finished connecting real notification events,
# we can remove this route.
# ============================================================

@notification_bp.route(
    "/notifications/test",
    methods=["POST"]
)
@jwt_required()
def create_test_notification():
    """
    Temporary development endpoint used to verify
    notification creation, storage and delivery.

    This now supports an optional "link" so we can test
    the View/Open functionality.
    """

    # --------------------------------------------------------
    # Get the currently authenticated user.
    # --------------------------------------------------------

    current_user_id = int(
        get_jwt_identity()
    )


    # --------------------------------------------------------
    # Get request body.
    # --------------------------------------------------------

    data = request.get_json() or {}


    # --------------------------------------------------------
    # Read test notification values.
    # --------------------------------------------------------

    title = data.get(
        "title",
        "Test Notification"
    )


    message = data.get(
        "message",
        "This is a test notification from Thafari."
    )


    # --------------------------------------------------------
    # Optional notification link.
    #
    # If the request does not provide one, the notification
    # will simply not have a View/Open button.
    # --------------------------------------------------------

    link = data.get(
        "link"
    )


    # --------------------------------------------------------
    # Create the notification.
    # --------------------------------------------------------

    notification = create_notification(

        user_id=current_user_id,

        title=title,

        message=message,

        notification_type="system",

        # Pass the optional link into the notification.
        link=link
    )


    # --------------------------------------------------------
    # Commit the notification to the database first.
    # --------------------------------------------------------

    db.session.commit()


    # --------------------------------------------------------
    # Only notify the user's connected browser after the
    # database transaction succeeds.
    # --------------------------------------------------------

    emit_notification(
        notification
    )


    # --------------------------------------------------------
    # Return the created notification.
    # --------------------------------------------------------

    return jsonify({

        "message":
            "Notification created successfully.",

        "notification": {

            "id":
                notification.id,

            "user_id":
                notification.user_id,

            "title":
                notification.title,

            "message":
                notification.message,

            "notification_type":
                notification.notification_type,

            "is_read":
                notification.is_read,

            # ------------------------------------------------
            # Return the link so we can confirm it was stored.
            # ------------------------------------------------

            "link":
                notification.link,

            "created_at":
                notification.created_at.isoformat()

        }

    }), 201