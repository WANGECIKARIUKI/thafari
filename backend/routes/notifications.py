from flask import Blueprint, jsonify, request

from flask_jwt_extended import jwt_required, get_jwt_identity

from extensions import db

from models.notification import Notification

from services.notification_service import create_notification, emit_notification


notification_bp = Blueprint(
    "notification",
    __name__,
    url_prefix="/api"
)


# ============================================================
# GET ALL NOTIFICATIONS
# ============================================================

@notification_bp.route("/notifications", methods=["GET"])
@jwt_required()
def get_notifications():
    """
    Return notifications belonging to the currently
    authenticated user.

    Users can only see their own notifications.
    """

    # Get the currently authenticated user's ID from JWT.
    current_user_id = int(get_jwt_identity())

    # Get the user's notifications.
    notifications = Notification.query.filter_by(
        user_id=current_user_id
    ).order_by(
        Notification.created_at.desc()
    ).all()

    return jsonify({
        "notifications": [
            {
                "id": notification.id,
                "title": notification.title,
                "message": notification.message,
                "notification_type": notification.notification_type,
                "is_read": notification.is_read,
                "created_at": notification.created_at.isoformat(),
                "updated_at": notification.updated_at.isoformat()
            }
            for notification in notifications
        ]
    }), 200


# ============================================================
# GET UNREAD NOTIFICATIONS
# ============================================================

@notification_bp.route("/notifications/unread", methods=["GET"])
@jwt_required()
def get_unread_notifications():
    """
    Return only unread notifications belonging to
    the currently authenticated user.
    """

    current_user_id = int(get_jwt_identity())

    notifications = Notification.query.filter_by(
        user_id=current_user_id,
        is_read=False
    ).order_by(
        Notification.created_at.desc()
    ).all()

    return jsonify({
        "notifications": [
            {
                "id": notification.id,
                "title": notification.title,
                "message": notification.message,
                "notification_type": notification.notification_type,
                "is_read": notification.is_read,
                "created_at": notification.created_at.isoformat(),
                "updated_at": notification.updated_at.isoformat()
            }
            for notification in notifications
        ]
    }), 200


# ============================================================
# GET UNREAD NOTIFICATION COUNT
# ============================================================

@notification_bp.route("/notifications/unread-count", methods=["GET"])
@jwt_required()
def get_unread_notification_count():
    """
    Return the number of unread notifications belonging
    to the currently authenticated user.
    """

    current_user_id = int(get_jwt_identity())

    unread_count = Notification.query.filter_by(
        user_id=current_user_id,
        is_read=False
    ).count()

    return jsonify({
        "unread_count": unread_count
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

    current_user_id = int(get_jwt_identity())

    notification = Notification.query.filter_by(
        id=notification_id,
        user_id=current_user_id
    ).first()

    if not notification:
        return jsonify({
            "message": "Notification not found."
        }), 404

    notification.is_read = True

    db.session.commit()

    return jsonify({
        "message": "Notification marked as read.",
        "notification": {
            "id": notification.id,
            "is_read": notification.is_read
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

    current_user_id = int(get_jwt_identity())

    notifications = Notification.query.filter_by(
        user_id=current_user_id,
        is_read=False
    ).all()

    for notification in notifications:
        notification.is_read = True

    db.session.commit()

    return jsonify({
        "message": "All notifications marked as read.",
        "updated_count": len(notifications)
    }), 200


# ============================================================
# TEMPORARY DEVELOPMENT TEST ROUTE
# ============================================================

@notification_bp.route(
    "/notifications/test",
    methods=["POST"]
)
@jwt_required()
def create_test_notification():
    """
    Temporary development endpoint used to verify
    that notifications can be created.

    We will remove this endpoint once real notification
    events are connected.
    """

    current_user_id = int(get_jwt_identity())

    data = request.get_json() or {}

    title = data.get(
        "title",
        "Test Notification"
    )

    message = data.get(
        "message",
        "This is a test notification from Thafari."
    )

    notification = create_notification(
    user_id=current_user_id,
    title=title,
    message=message,
    notification_type="system"
    )
    

    # Commit the notification to the database first.
    db.session.commit()

    # Only notify the user's connected browser after
    # the database transaction succeeds.

    emit_notification(notification)

    return jsonify({
        "message": "Notification created successfully.",
        "notification": {
            "id": notification.id,
            "user_id": notification.user_id,
            "title": notification.title,
            "message": notification.message,
            "notification_type": notification.notification_type,
            "is_read": notification.is_read,
            "created_at": notification.created_at.isoformat()
        }
    }), 201