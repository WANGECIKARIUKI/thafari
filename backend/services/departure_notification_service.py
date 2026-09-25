from datetime import date, timedelta

from extensions import db
from models.departure import Departure
from models.booking import Booking
from models.notification import Notification
from services.notification_service import (
    create_notification,
    emit_notification
)


def send_upcoming_departure_reminders():
    """
    Send notifications to customers whose bookings are
    associated with departures starting in 3 days.

    Only pending and confirmed bookings are considered.

    The function is designed to be idempotent:
    if the same departure reminder has already been
    created for the customer, another notification
    will not be created.
    """

    today = date.today()

    # We want to find departures that start exactly
    # 3 days from today.
    reminder_date = today + timedelta(days=3)

    # Find active departures starting on the reminder date.
    departures = Departure.query.filter(
        Departure.start_date == reminder_date,
        Departure.is_active == True
    ).all()

    notifications_to_emit = []

    for departure in departures:

        # Find bookings that are still relevant.
        #
        # Cancelled, expired and completed bookings
        # should not receive departure reminders.
        bookings = Booking.query.filter(
            Booking.departure_id == departure.id,
            Booking.status.in_(["pending", "confirmed"])
        ).all()

        for booking in bookings:

            # Build the exact notification message.
            days_until_departure = (
                departure.start_date - today
            ).days

            message = (
                f"Your safari departure starts in"
                f"{days_until_departure} day(s)",
                f"on {departure.start_date.isoformat()}."
            )

            # Check whether this exact departure reminder
            # has already been sent to this customer.
            existing_notification = Notification.query.filter(
                Notification.user_id == booking.user_id,
                Notification.notification_type == "departure",
                Notification.message == message
            ).first()

            # If it already exists, do not send it again.
            if existing_notification:
                continue

            # Create the notification inside the current
            # database transaction.
            notification = create_notification(
                user_id=booking.user_id,
                title="Upcoming Departure",
                message=message,
                notification_type="departure"
            )

            notifications_to_emit.append(notification)

    # Save all newly created notifications together.
    db.session.commit()

    # Only emit Socket.IO notifications AFTER the database
    # transaction has successfully committed.
    for notification in notifications_to_emit:
        try:
            emit_notification(notification)
        except Exception as e:
            # A Socket.IO delivery problem should not undo
            # the database transaction.
            print(
                f"Departure notification could not be delivered: {e}"
            )

    return len(notifications_to_emit)