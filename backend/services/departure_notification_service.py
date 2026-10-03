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
    Send departure reminder notifications to customers
    with confirmed bookings.

    Reminders are sent:
        - 3 days before departure
        - 1 day before departure

    Only confirmed bookings receive departure reminders.

    Cancelled, expired, pending, and completed bookings
    do not receive departure reminders.

    The function is idempotent:
    if a reminder for the same booking and reminder stage
    has already been created, another notification will
    not be created.

    Returns:
        int: Number of new notifications created.
    """

    today = date.today()

    # ---------------------------------------------------------
    # Reminder dates
    # ---------------------------------------------------------

    reminder_dates = {
        today + timedelta(days=3): 3,
        today + timedelta(days=1): 1
    }

    notifications_to_emit = []

    # ---------------------------------------------------------
    # Process each reminder date
    # ---------------------------------------------------------

    for reminder_date, days_until_departure in reminder_dates.items():

        # Find active departures happening on this reminder date.
        departures = Departure.query.filter(
            Departure.start_date == reminder_date,
            Departure.is_active == True
        ).all()

        # -----------------------------------------------------
        # Process departures
        # -----------------------------------------------------

        for departure in departures:

            # -------------------------------------------------
            # Only confirmed bookings receive reminders.
            # -------------------------------------------------

            bookings = Booking.query.filter(
                Booking.departure_id == departure.id,
                Booking.status == "confirmed"
            ).all()

            # -------------------------------------------------
            # Process confirmed bookings
            # -------------------------------------------------

            for booking in bookings:

                # -------------------------------------------------
                # Build reminder-specific notification content.
                # -------------------------------------------------

                if days_until_departure == 3:
                    title = "Departure in 3 Days"

                    message = (
                        f"Your safari departure is in 3 days, "
                        f"on {departure.start_date.isoformat()}."
                    )

                else:
                    title = "Departure Tomorrow"

                    message = (
                        f"Your safari departure is tomorrow, "
                        f"on {departure.start_date.isoformat()}."
                    )

                # -------------------------------------------------
                # Link directly to the booking.
                # -------------------------------------------------

                link = f"/booking/view/{booking.id}"

                # -------------------------------------------------
                # Prevent duplicate reminders.
                #
                # The combination of:
                #   user_id
                #   notification_type
                #   title
                #   link
                #
                # uniquely identifies this reminder stage for
                # this booking.
                # -------------------------------------------------

                existing_notification = Notification.query.filter(
                    Notification.user_id == booking.user_id,
                    Notification.notification_type == "departure",
                    Notification.title == title,
                    Notification.link == link
                ).first()

                if existing_notification:
                    continue

                # -------------------------------------------------
                # Create notification.
                # -------------------------------------------------

                notification = create_notification(
                    user_id=booking.user_id,
                    title=title,
                    message=message,
                    notification_type="departure",
                    link=link
                )

                notifications_to_emit.append(notification)

    # ---------------------------------------------------------
    # Save all notifications together.
    # ---------------------------------------------------------

    if notifications_to_emit:
        db.session.commit()

    # ---------------------------------------------------------
    # Emit Socket.IO notifications only after successful
    # database commit.
    # ---------------------------------------------------------

    for notification in notifications_to_emit:

        try:
            emit_notification(notification)

        except Exception as e:
            # Socket.IO delivery failure should not undo
            # the successfully committed notification.

            print(
                f"Departure notification could not be delivered: {e}"
            )

    return len(notifications_to_emit)