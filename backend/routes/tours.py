from flask import Blueprint, jsonify, request
from flask_jwt_extended import (jwt_required, get_jwt_identity)
from decorators.auth_decorator import roles_required
from models.user import User
from models.tour import Tour
from extensions import db

tour_bp = Blueprint(
    "tour",
    __name__,
    url_prefix="/api"
)

#create a tour endpoint
@tour_bp.route("/tour", methods = ["POST"])
@jwt_required()
@roles_required("admin", "tour_operator")
def create_tour():
    #retrieve data
    data = request.get_json()

    if not data:
        return jsonify({
            "message": "Request body is required."
        }), 400

    #extract the data we will use
    tour_name = data.get("tour_name")
    charges = data.get("charges")
    destination = data.get("destination")

    #validate the data

    if not isinstance(tour_name, str) or not tour_name.strip():
        return jsonify({
            "message": "Tour name is required."
        }), 400

    if not isinstance(charges, (int, float)) or charges <= 0:
        return jsonify({
            "message": "Charges is required and should be greater than 0."
        }), 400

    if not isinstance(destination, str) or not destination.strip():
        return jsonify({
            "message": "Destination is required."
        }), 400

    #check the if user is authorized to access data

    current_user_id = int(get_jwt_identity())

    current_user = User.query.filter_by(id=current_user_id).first()

    #check if the user exists
    if not current_user:
        return jsonify({
            "message": "Access denied!"
        }), 403

    #create a new tour
    tour = Tour(
        tour_name=tour_name,
        charges=charges,
        destination=destination,
        tour_operator_id=current_user_id
    )

    #prepare to save the data
    db.session.add(tour)

    #save the data
    db.session.commit()

    #tell the client the tour is created successfully
    return jsonify({
        "message": "Tour is created successfully.",
        "tour_id": tour.id,
        "tour_name": tour.tour_name,
        "charges": tour.charges,
        "destination": tour.destination,
        "tour_operator_id": current_user_id
    }), 201

#endpoint for getting all tours.
@tour_bp.route("/tours", methods = ["GET"])

def get_tours():
    #retrieve all tours data from the database
    tours = Tour.query.all()

    #we extract the data
    #it will be an empty list just in-case we have no tours available
    #empty tour list
    tours_list = []

    #create a for loop to loop thru the  tour data
    #we change the data to a dictionary so that we are able to return it as json
    for tour in tours:
        tours_list.append({
            "tour_name": tour.tour_name,
            "destination": tour.destination,
            "charges": tour.charges
        })

    return jsonify({
        "tours": tours_list
    }), 200  
    
