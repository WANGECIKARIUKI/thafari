
from datetime import date, datetime

from apscheduler.schedulers.background import BackgroundScheduler

from extensions import db
from models.booking import Booking
from models.departure import Departure
from services.departure_notification_service import (
    send_upcoming_departure_reminders,
)


# Create one scheduler instance for the application.
scheduler = BackgroundScheduler()


def start_scheduler(app):
    """
    Start the background scheduler.

    The scheduler:
    1. Sends upcoming departure reminders.
    2. Automatically completes confirmed bookings after
       their departure end date has passed.
    """

    def departure_reminder_job():
        """Send departure reminders inside the Flask app context."""

        with app.app_context():
            try:
                notifications_sent = send_upcoming_departure_reminders()

                print(
                    "Departure reminder job completed. "
                    f"Notifications sent: {notifications_sent}"
                )

            except Exception:
                app.logger.exception(
                    "Departure reminder job failed."
                )

    def complete_finished_bookings_job():
        """
        Complete confirmed bookings whose departure end date
        is earlier than today's date.
        """

        with app.app_context():
            try:
                today = date.today()

                finished_bookings = (
                    Booking.query
                    .join(
                        Departure,
                        Booking.departure_id == Departure.id,
                    )
                    .filter(
                        Booking.status == "confirmed",
                        Departure.end_date < today,
                    )
                    .all()
                )

                if not finished_bookings:
                    print(
                        "Booking completion job completed. "
                        "No finished confirmed bookings found."
                    )
                    return

                completed_count = 0

                for booking in finished_bookings:
                    booking.status = "completed"
                    completed_count += 1

                db.session.commit()

                print(
                    "Booking completion job completed. "
                    f"Bookings marked completed: {completed_count}"
                )

            except Exception:
                db.session.rollback()
                app.logger.exception(
                    "Automatic booking completion job failed."
                )

    # Register the departure reminder job independently.
    # Existing reminder timing is preserved: once per day.
    if not scheduler.get_job("departure_reminder_job"):
        scheduler.add_job(
            departure_reminder_job,
            trigger="interval",
            days=1,
            id="departure_reminder_job",
            replace_existing=True,
            max_instances=1,
            coalesce=True,
        )

    # Check for finished bookings every hour.
    # Run once immediately when the scheduler starts as well.
    if not scheduler.get_job("booking_completion_job"):
        scheduler.add_job(
            complete_finished_bookings_job,
            trigger="interval",
            hours=1,
            id="booking_completion_job",
            replace_existing=True,
            next_run_time=datetime.now(),
            max_instances=1,
            coalesce=True,
        )

    if not scheduler.running:
        scheduler.start()

    print("Background scheduler started.")
