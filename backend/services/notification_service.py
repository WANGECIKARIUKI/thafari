# =========================================================
# THAFARI NOTIFICATION SERVICE
# =========================================================
#
# This file contains the shared logic for creating and
# delivering in-app notifications.
#
# Notifications can be used by different parts of Thafari:
#
# - bookings
# - payments
# - refunds
# - messages
# - departures
# - system events
#
# A notification can optionally contain a "link".
#
# The link tells the frontend where the user can go when
# they choose the notification's "View" / "Open" action.
#
# Example:
#
#     /admin/direct-payments/42
#
# The destination page does not have to exist yet.
# We can add it when that feature is built.
# =========================================================

from extensions import db, socketio

from models.notification import Notification


# =========================================================
# CREATE NOTIFICATION
# =========================================================
#
# Creates an in-app notification and adds it to the current
# database transaction.
#
# IMPORTANT:
#
# This function DOES NOT commit the transaction.
#
# The business operation that created the notification
# decides when the complete transaction should be committed.
#
# Example:
#
#     notification = create_notification(
#         user_id=admin.id,
#         title="New Direct Payment",
#         message="A customer submitted a payment.",
#         notification_type="payment",
#         link=f"/admin/direct-payments/{payment.id}"
#     )
#
# The "link" parameter is optional.
#
# Existing notification calls that do not provide a link
# will continue working normally.
# =========================================================

def create_notification(
    user_id,
    title,
    message,
    notification_type,
    link=None
):
    """
    Create an in-app notification.

    The notification is added to the current database
    transaction but is NOT committed here.

    This allows the calling business operation
    (payment, booking, refund, etc.) to decide when
    the complete transaction should be committed.

    Parameters:
        user_id:
            ID of the user receiving the notification.

        title:
            Short notification heading.

        message:
            Full notification message.

        notification_type:
            Category of the notification.

        link:
            Optional frontend route that the user can open
            to view more information.
    """

    notification = Notification(
        user_id=user_id,
        title=title,
        message=message,
        notification_type=notification_type,
        is_read=False,

        # Store the optional destination.
        #
        # If no link was supplied, this will be NULL in
        # the database.
        link=link
    )


    # ---------------------------------------------------------
    # Add the notification to the current transaction.
    # ---------------------------------------------------------

    db.session.add(notification)


    # ---------------------------------------------------------
    # Flush so the notification receives its database ID.
    # ---------------------------------------------------------

    db.session.flush()


    return notification


# =========================================================
# EMIT NOTIFICATION
# =========================================================
#
# Sends an already-created notification to the user's
# private Socket.IO room.
#
# This should be called AFTER the database transaction
# has successfully committed.
#
# The frontend can use this real-time event to immediately
# display the new notification without requiring the user
# to refresh the page.
# =========================================================

def emit_notification(notification):
    """
    Send an already-created notification to the user's
    private Socket.IO room.

    This should be called AFTER the database transaction
    has successfully committed.
    """

    notification_data = {

        # Database notification ID.
        "notification_id": notification.id,

        # User receiving the notification.
        "user_id": notification.user_id,

        # Notification heading.
        "title": notification.title,

        # Notification message.
        "message": notification.message,

        # Notification category.
        "notification_type": notification.notification_type,

        # Whether the notification has been read.
        "is_read": notification.is_read,

        # Optional destination.
        #
        # Examples:
        #
        # /admin/direct-payments/42
        # /admin/messages/123
        # /admin/bookings/25
        #
        # If there is no destination, this will be None.
        "link": notification.link,

        # Creation timestamp.
        "created_at": notification.created_at.isoformat()
    }


    # ---------------------------------------------------------
    # Every authenticated user has a private Socket.IO room.
    #
    # User 9 -> user_9
    # User 8 -> user_8
    #
    # Only the intended user receives this notification.
    # ---------------------------------------------------------

    user_room = f"user_{notification.user_id}"


    socketio.emit(
        "new_notification",
        notification_data,
        to=user_room
    )