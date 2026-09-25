from apscheduler.schedulers.background import BackgroundScheduler

from services.departure_notification_service import (
    send_upcoming_departure_reminders
)


# Create one scheduler instance for the application.
scheduler = BackgroundScheduler()


def start_scheduler(app):
    """
    Start the background scheduler.

    The scheduler runs the departure reminder service
    automatically in the background.
    """

    # Prevent the same job from being registered more than once.
    if scheduler.get_job("departure_reminder_job"):
        return

    def departure_reminder_job():
        """
        Run the departure reminder service inside
        the Flask application context.
        """

        with app.app_context():
            try:
                notifications_sent = (
                    send_upcoming_departure_reminders()
                )

                print(
                    f"Departure reminder job completed. "
                    f"Notifications sent: {notifications_sent}"
                )

            except Exception as e:
                print(
                    f"Departure reminder job failed: {e}"
                )

    # TEMPORARY TEST:
    # Run every minute so we can verify that APScheduler
    # is executing the departure reminder job.
    scheduler.add_job(
        departure_reminder_job,
        trigger="interval",
        days=1,
        id="departure_reminder_job",
        replace_existing=True
    )

    scheduler.start()

    print("Background scheduler started.")