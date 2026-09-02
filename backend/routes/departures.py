from flask import Blueprint, jsonify, request
from flask_jwt_extended import (jwt_required, get_jwt_identity)
from decorators.auth_decorator import roles_required
from datetime import datetime, date
from models.user import User
from models.tour import Tour
from models.departure import Departure
from models.booking import Booking
from extensions import db

departure_bp = Blueprint(
    "departures",
    __name__,
    url_prefix="/api"
)

#create departure endpoint
@departure_bp.route("/departure", methods = ["POST"])
@jwt_required()
@roles_required("admin", "tour_operator")
def create_departure():
    #retrieve the data
    data = request.get_json()

    if not data:
        return jsonify ({
            "message": "Request body is required."
        }), 400

    #extract the data
    tour_id = data.get("tour_id")
    capacity = data.get("capacity")
    price_per_person = data.get("price_per_person")
    start_date = data.get("start_date")
    end_date = data.get("end_date")

    #validate the data

    if not isinstance(tour_id, int) or tour_id <= 0:
        return jsonify ({
            "message": "Tour id is required and should be greater than 0."
        }), 400

    if not isinstance(capacity, int) or capacity <= 0:
        return jsonify ({
            "message": "Capacity is required and should be greater than 0."
        }), 400

    if not isinstance(price_per_person, (int, float)) or price_per_person <= 0:
        return jsonify ({
            "message": "Price per person is required and should be greater than 0."
        }), 400

    if not start_date:
        return jsonify({
            "message": "Start date is required."
        }), 400

    try:
        start_date = datetime.strptime(
            start_date,
            "%Y-%m-%d"
        ).date()

    except(ValueError, TypeError):
        return jsonify({
            "message": "Wrong format used. Use correct format: YYYY-MM-DD"
        }), 400

    if not end_date:
        return jsonify({
            "message": "End date is required."
        }), 400

    try:
        end_date = datetime.strptime(
            end_date,
            "%Y-%m-%d"
        ).date()

    except(ValueError, TypeError):
        return jsonify({
            "message": "Wrong format used. Use correct format: YYYY-MM-DD"
        }), 400

    if end_date < start_date:
        return jsonify({
            "message": "End date should be same as or after start date."
        }), 400

     #check if the user is authorized using user id
    current_user_id = int(get_jwt_identity())

     #ensure user exists
    current_user = User.query.filter_by(id=current_user_id).first()

    #ensure the tour exists
    tour = Tour.query.filter_by(id=tour_id).first()

    #check if the tour exists
    if not tour:
        return jsonify({
            "message": "Tour not found."
        }), 404

    #confirm the tour operator is allowed to access the departure
    if current_user.role != "admin" and current_user_id != tour.tour_operator_id:
        return jsonify({
            "message": "Access denied!"
        }), 403

    #create the departure

    departure = Departure(
        tour_id=tour.id,
        capacity=capacity,
        price_per_person=price_per_person,
        start_date=start_date,
        end_date=end_date,
        )

    #prepare to save the data
    db.session.add(departure)

    #save the data
    db.session.commit()

    #tell the client the departure is created successfully

    return jsonify({
        "message": "Departure is created successfully.",
        "departure_id": departure.id,
        "capacity": departure.capacity,
        "start_date": departure.start_date.isoformat(),
        "end_date": departure.end_date.isoformat(),
        "price_per_person": departure.price_per_person
    }), 201

#endpoint for getting a specific tour using the departure id
@departure_bp.route("/tours/<int:tour_id>/departures", methods = ["GET"])
def get_tour_departure(tour_id):

    #extract the data of that specific tour
    tour = Tour.query.filter_by(id=tour_id).first()

    #check if the tour exists
    if not tour:
        return jsonify({
            "message": "Tour not found"
        }), 404

    #get today's date
    today = date.today()

    #retrieve only departure data for that specific tour

    departures = Departure.query.filter(
        Departure.tour_id == tour.id,
        Departure.is_active == True,
        Departure.end_date >= today
    ).all()

    #create an empty departure list
    departure_list = []

    for departure in departures:
        #retrieve the booking details for the occupied seats
        bookings = Booking.query.filter(
            Booking.departure_id == departure.id,
            Booking.status.in_(["pending", "confirmed"])
        ). all()

        #create an empty total booked
        total_booked = 0

        for booking in bookings:
            total_booked += booking.number_of_people

         #check available seats
        available_seats = departure.capacity - total_booked

        #add the departure details to the list
        departure_list.append({
            "capacity": departure.capacity,
            "available_seats": available_seats,
            "start_date": departure.start_date,
            "end_date": departure.end_date,
            "price_per_person": departure.price_per_person
        })

    return jsonify({
        "tour_name": tour.tour_name,
        "destination": tour.destination,
        "departures": departure_list
    }), 200 
    


     




    

    