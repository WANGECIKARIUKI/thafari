from datetime import datetime, timedelta
from models.booking import Booking
from models.departure import Departure
from extensions import db

def expired_pending_booking():

    #get current time
    now = datetime.utcnow()

    #check for bookings which have expired

    expired_bookings = Booking.query.filter(
        Booking.status == "pending",
        Booking.expires_at <= now
    ). all()

    '''print("CURRENT PYTHON TIME:", now)
    print("BOOKINGS FOUND:", [booking.id for booking in expired_bookings])'''

    #change booking status from pending to expired

    for booking in expired_bookings:
        booking.status = "expired"

    #save the changes
    db.session.commit()

#calculate available seats

def calculate_available_seats(departure):

    #check all seats available we will use db and db or for this and ensure the expiry date is later than the current date
    now = datetime.utcnow()

    bookings = Booking.query.filter(
        Booking.departure_id == departure.id, #Has the same departure or
        db.or_(
            Booking.status == "confirmed", #is confirmed and
            db.and_(
                Booking.status == "pending", #pending and not yet expired
                Booking.expires_at > now
            )
        )
    )

    #find total booked
    total_booked = 0

    for booking in bookings:
        total_booked += booking.number_of_people

    #check available seats
    available_seats = departure.capacity - total_booked 

    return available_seats

#find suggested departures
def find_suggested_departures(departure, number_of_people):

    #check alternatives if current tour has no enough seats
    later_departures = Departure.query.filter(
        Departure.tour_id == departure.tour_id,
        Departure.is_active == True,
        Departure.start_date > departure.start_date
    ).order_by(Departure.start_date.asc()).all()

    #create an empty list for storing the later departure data
    suggested_departures = []

    #loop thru the departures to find suitable ones
    for later_departure in later_departures:

        #calculate seats for this departure. How many seats are available for the suggested departure
        remaining_seats = calculate_available_seats(later_departure)

        #an if statement to give suggestions on other departure dates
        if remaining_seats >= number_of_people:
            suggested_departures.append({
                "departure_id": later_departure.id,
                "available_seats": remaining_seats,
                "capacity": later_departure.capacity,
                "start_date": later_departure.start_date.isoformat(),
                "end_date": later_departure.end_date.isoformat(),
                "price_per_person": float(later_departure.price_per_person)
            })

        return suggested_departures


#create a booking
def create_pending_booking(user_id, departure, number_of_people):
    price_per_person = departure.price_per_person
    total_price = price_per_person * number_of_people


    #create a new booking
    booking = Booking(
        user_id=user_id,
        departure_id=departure.id,
        price_per_person=price_per_person,
        total_price=total_price,
        number_of_people=number_of_people,
        expires_at=datetime.utcnow() + timedelta(minutes=25),
        status="pending"
    )

    #prepare to save the data
    db.session.add(booking)

    #save the data
    db.session.commit()

    return booking 


    
