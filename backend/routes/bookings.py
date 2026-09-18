from flask import Blueprint, jsonify, request
from flask_jwt_extended import (jwt_required, get_jwt_identity)
from decorators.auth_decorator import roles_required
from models.user import User
from models.booking import Booking
from models.departure import Departure
from models.tour import Tour
from datetime import date
from services.booking_service import (expired_pending_booking, calculate_available_seats, find_suggested_departures, create_pending_booking)



booking_bp = Blueprint(
    "booking",
    __name__,
    url_prefix = "/api"
)

#create a booking
@booking_bp.route("/booking", methods = ["POST"])
@jwt_required()
@roles_required("admin", "customer")

def create_booking():
    #retrieve the data
    data = request.get_json()

    if not data:
        return jsonify({
            "message": "Request body is required."
        }), 400
    
    #extract the data
    departure_id = data.get("departure_id")
    number_of_people = data.get("number_of_people")

    #validate the data

    if not isinstance(departure_id, int):
        return jsonify({
            "message": "Departure id is required."
        }), 400

    if departure_id <=0:
        return jsonify({
            "message": "departure id should be greater than 0."
        }), 400

    if not isinstance(number_of_people, int):
        return jsonify({
            "message": "Number of people is required."
        }), 400

    if number_of_people <=0:
        return jsonify({
            "message": "number of people should be greater than 0."
        }), 400

    #check if the user exists
    current_user_id = int(get_jwt_identity())

    current_user = User.query.filter_by(id=current_user_id).first()

    if current_user.role == "admin":
        booking_user_id = data.get("user_id")

        #need to validate the user-id is provided
        if not isinstance(booking_user_id, int) or booking_user_id <=0:
            return jsonify({
                "message": "User id is required and has to be greater than 0."
            }), 400
    else:
        booking_user_id = current_user_id

    #check if the user exists
    booking_user = User.query.filter_by(id=booking_user_id).first()

    if not booking_user:
        return jsonify({
            "message": "User not found"
        }), 404

    #check if tour exists
    departure = Departure.query.filter_by(id=departure_id).first()

    if not departure:
        return jsonify({
            "message": "Departure not found."
        }), 404

    #check if the departure is active
    if not departure.is_active:
        return jsonify({
            "message": "This departure is no longer available for booking!"
        }), 400

    #check if end of trip date has already passed.
    #today = date.today()

    if departure.end_date < departure.start_date:
        return jsonify({
            "message": "This departure has already ended and is no longer available for booking."
        }), 400

    #calculate available seats// data is in services
    available_seats = calculate_available_seats(departure)

    #check if remaining slots are enough
    if number_of_people > available_seats:
        suggested_departures = find_suggested_departures(departure, number_of_people)

        return jsonify({
            "message": "The available slots are not enough for you all.",
            "available_seats": available_seats,
            "suggested_departures": suggested_departures
        }), 400            

   #create a booking
    booking = create_pending_booking(
       user_id=booking_user_id,
       departure=departure,
       number_of_people=number_of_people
   )

    return jsonify({
        "message": "A New booking created successfully!",
        "booking_id":booking.id,
        "departure_id":booking.departure_id,
        "status":booking.status,
        "number_of_people":booking.number_of_people,
        "price_per_person":float(booking.price_per_person),
        "total_price":float(booking.total_price),
        "expires_at":booking.expires_at.isoformat() #isoformat - converts the time into a string
    }), 201

#temporary expiry check
@booking_bp.route("/booking/expires", methods = ["POST"] )
@jwt_required()
@roles_required("admin")
def expired_bookings():

    expired_pending_booking()

    return jsonify({
        "message": "Expired bookings processed successfully."
    }), 200

#get a single booking
@booking_bp.route("/booking/<int:booking_id>", methods = ["GET"])
@jwt_required()
@roles_required("admin", "customer")
def get_booking(booking_id):
    #check if the booking exists
    booking = Booking.query.filter_by(id=booking_id).first()

    #check if the booking is found
    if not booking:
        return jsonify({
            "message": "Booking not found"
        }), 404

    #confirm the customer accessing the booking is the correct customer
    current_user_id = int(get_jwt_identity())

    current_user = User.query.filter_by(id=current_user_id).first()

    if current_user.role != "customer":
        if booking.user_id != current_user_id:
            return jsonify({
                "message": "You are not authorized to view this booking!"
            }), 403

    return jsonify({
        "booking_id": booking.id,
        "user_id": booking.user_id,
        "departure_id": booking.departure_id,
        "number_of_people": booking.number_of_people,
        "price_per_person": float(booking.price_per_person),
        "total_price": float(booking.total_price),
        "status": booking.status,
        "expires_at": (
            booking.expires_at.isoformat()
            if booking.expires_at
            else None
        ),
        "created_at": booking.created_at.isoformat(),
        "updated_at": booking.updated_at.isoformat()
    }), 200

#get all bookings
@booking_bp.route("/bookings", methods = ["GET"])
@jwt_required()
@roles_required("admin", "customer", "tour_operator")
#the tour_operator is there since we will eventually use it to get only their own bookings

def get_bookings():

    #get current user id
    current_user_id = int(get_jwt_identity())

    #get user role

    current_user = User.query.filter_by(id=current_user_id).first()

    #check bookings for admin and customer
    if current_user.role == "admin":
        bookings = Booking.query.all()
    #use join to connect different tables and their foreign keys
    elif current_user.role == "tour_operator":
        bookings = (
            Booking.query.join(Departure).join(Tour)
            .filter(Tour.tour_operator_id == current_user_id).all()
        )
    #customer
    else:
        booking = Booking.query.filter(Booking.user_id == current_user_id).all()    

    #create an empty list to store your bookings
    booking_list = []

    #loop thru the list
    for booking in bookings:
        booking_list.append({
            "booking_id": booking.id,
            "user_id": booking.user_id,
            "departure_id": booking.departure_id,
            "number_of_people": booking.number_of_people,
            "price_per_person": float(booking.price_per_person),
            "total_price": float(booking.total_price),
            "status": booking.status,
            "expires_at": (
                booking.expires_at.isoformat()
                if booking.expires_at
                else None
            ),
            "created_at": booking.created_at.isoformat(),
            "updated_at": booking.updated_at.isoformat()
        })

    return jsonify({
        "bookings": booking_list
    }), 200