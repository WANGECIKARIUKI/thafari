from datetime import datetime, timedelta
from models.booking import Booking
from models.departure import Departure
from extensions import db


# ---------------------------------------------------------
# EXPIRE PENDING BOOKINGS
# ---------------------------------------------------------

def expired_pending_booking():
    """
    Find pending bookings whose payment window has expired
    and change their status to expired.
    """

    # Get the current UTC time.
    now = datetime.utcnow()

    # Find pending bookings whose expiration time has passed.
    expired_bookings = Booking.query.filter(
        Booking.status == "pending",
        Booking.expires_at <= now
    ).all()

    # Change each expired booking from pending to expired.
    for booking in expired_bookings:
        booking.status = "expired"

    # Save all status changes to the database.
    db.session.commit()


# ---------------------------------------------------------
# CALCULATE AVAILABLE SEATS
# ---------------------------------------------------------

def calculate_available_seats(departure):
    """
    Calculate how many seats are currently available
    for a departure.

    Confirmed bookings always occupy seats.

    Pending bookings only occupy seats while their payment
    window is still active.
    """

    # Get the current UTC time.
    now = datetime.utcnow()

    # Get bookings that currently occupy seats.
    bookings = Booking.query.filter(
        Booking.departure_id == departure.id,
        db.or_(
            # Confirmed bookings occupy seats.
            Booking.status == "confirmed",

            # Pending bookings occupy seats only if
            # their payment window has not expired.
            db.and_(
                Booking.status == "pending",
                Booking.expires_at > now
            )
        )
    )

    # Keep track of the number of people already occupying seats.
    total_booked = 0

    for booking in bookings:
        total_booked += booking.number_of_people

    # Calculate remaining capacity.
    available_seats = departure.capacity - total_booked

    return available_seats


# ---------------------------------------------------------
# FIND SUGGESTED DEPARTURES
# ---------------------------------------------------------

def find_suggested_departures(departure, number_of_people):
    """
    Find later departures for the same tour that have
    enough available seats.
    """

    # Find later active departures belonging to the same tour.
    later_departures = Departure.query.filter(
        Departure.tour_id == departure.tour_id,
        Departure.is_active == True,
        Departure.start_date > departure.start_date
    ).order_by(
        Departure.start_date.asc()
    ).all()

    # Store suitable alternatives here.
    suggested_departures = []

    # Check every later departure.
    for later_departure in later_departures:

        # Calculate available seats for this departure.
        remaining_seats = calculate_available_seats(
            later_departure
        )

        # Only suggest departures that can accommodate
        # the requested number of people.
        if remaining_seats >= number_of_people:
            suggested_departures.append({
                "departure_id": later_departure.id,
                "available_seats": remaining_seats,
                "capacity": later_departure.capacity,
                "start_date": later_departure.start_date.isoformat(),
                "end_date": later_departure.end_date.isoformat(),
                "price_per_person": float(
                    later_departure.price_per_person
                )
            })

    # IMPORTANT:
    # This return belongs outside the loop so that ALL
    # suitable departures can be checked.
    return suggested_departures


# ---------------------------------------------------------
# CREATE PENDING BOOKING
# ---------------------------------------------------------

def create_pending_booking(
    user_id,
    departure,
    number_of_people
):
    """
    Create a new pending booking.

    The booking receives a temporary payment window.
    """

    # Get the price per person directly from the departure.
    price_per_person = departure.price_per_person

    # Calculate the total booking price.
    total_price = price_per_person * number_of_people

    # Create the booking.
    booking = Booking(
        user_id=user_id,
        departure_id=departure.id,
        price_per_person=price_per_person,
        total_price=total_price,
        number_of_people=number_of_people,

        # Give the customer 25 minutes to complete payment.
        expires_at=datetime.utcnow() + timedelta(minutes=25),

        # A newly created booking starts as pending.
        status="pending"
    )

    # Add the booking to the database session.
    db.session.add(booking)

    # Save the booking permanently.
    db.session.commit()

    return booking