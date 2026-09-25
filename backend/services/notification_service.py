from extensions import db, socketio

from models.notification import Notification


def create_notification(
    user_id,
    title,
    message,
    notification_type
):
    """
    Create an in-app notification.

    The notification is added to the current database
    transaction but is NOT committed here.

    This allows the calling business operation
    (payment, booking, refund, etc.) to decide when
    the complete transaction should be committed.
    """

    notification = Notification(
        user_id=user_id,
        title=title,
        message=message,
        notification_type=notification_type,
        is_read=False
    )

    # Add the notification to the current transaction.
    db.session.add(notification)

    # Flush so the notification receives its database ID.
    db.session.flush()

    return notification


def emit_notification(notification):
    """
    Send an already-created notification to the user's
    private Socket.IO room.

    This should be called AFTER the database transaction
    has successfully committed.
    """

    notification_data = {
        "notification_id": notification.id,
        "user_id": notification.user_id,
        "title": notification.title,
        "message": notification.message,
        "notification_type": notification.notification_type,
        "is_read": notification.is_read,
        "created_at": notification.created_at.isoformat()
    }

    # Every authenticated user has a private room:
    #
    # User 9 -> user_9
    # User 8 -> user_8
    #
    # Only the intended user receives this notification.
    user_room = f"user_{notification.user_id}"

    socketio.emit(
        "new_notification",
        notification_data,
        to=user_room
    )