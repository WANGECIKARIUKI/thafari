from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from models.tour import Tour
from extensions import db
from decorators.auth_decorator import roles_required
from datetime import datetime

tour_bp = Blueprint(
    "tour",
    __name__,
    url_prefix="/api"
)

#tour route
@tour_bp.route("/tour", methods=["POST"])
#authentication
@jwt_required()
#authorization
@roles_required("admin", "tour_operator")

def create_tour():
    #retrieve data from client

    data = request.get_json()

    if not data:
        return jsonify({
            "message": "Request body is required."
        }), 400

    #extract the data
    tour_name = data.get("tour_name")
    destination = data.get("destination")
    charges = data.get("charges")
    departure_date = data.get("departure_date")

    #validation
    if not isinstance(tour_name, str) or not tour_name.strip():
        return jsonify({
            "message": "Tour name is required and must be text."
        }), 400
    if not isinstance(destination, str) or not destination.strip():
        return jsonify({
            "message": "Destination is required and must be text."
        }), 400
    if charges is None:
        return jsonify({
            "message": "Charges is required."
        }), 400
    #if not an integer or float
    if not isinstance(charges, (int, float)):
        return jsonify({
            "message": "Charges need to be a number."
        }), 400      
    #if the balance is 0 or less(-ve)
    if charges <=0:
        return jsonify({
            "message": "Charges need to be greater than 0."
        }), 400       
    if not departure_date:
        return jsonify({
            "message": "Departure date is required."
        }), 400
    #change the string date format to python object
    try:
        departure_date = datetime.strptime(
            departure_date,
            "%Y-%m-%d"
        )
    except (TypeError, ValueError):
        return jsonify({
            "message": "use correct date format: YYYY-MM-DD."
        }), 400

    #current user id who is logged in
    current_user_id=get_jwt_identity()

    #create a new tour
    tour = Tour(
        tour_name = tour_name.strip(),
        destination = destination.strip(),
        charges = charges,
        departure_date = departure_date,
        tour_operator_id = current_user_id
    )

    #prepare to save the data in the database
    db.session.add(tour)
    #save changes
    db.session.commit()

    #tell client the tour was created successfully
    return jsonify({
        "message": "Tour created successfully."
    }), 201
    
#get all tours data

@tour_bp.route("/tours", methods=["GET"])

def get_tours():
    #retrieve the data for all tours
    tours = Tour.query.all()

    #create a for loop and a list of dictionaries of the data

    #empty list to store the tour dictionary
    tours_list = []

    #loop through all tours retrieved from the database

    for tour in tours:
        #make the data into a dictionary
        tours_list.append({
            "id": tour.id,
            "tour_name": tour.tour_name,
            "destination": tour.destination,
            "charges": tour.charges,
            "departure_date": tour.departure_date.strftime("%Y-%m-%d")  #convert the date to a string
        })

        #print(tour.departure_date)

        #return the tour details to the client
        return jsonify({
            "tours":tours_list
        }), 200

#get one tour using the tour id
@tour_bp.route("/tours/<int:tour_id>", methods=["GET"])
def get_tour(tour_id):
    #get tour by tour id from the database
    tour = Tour.query.filter_by(id=tour_id).first()
    #check if the tour exists
    if not tour:
        return jsonify({
            "message": "Tour not found."
        }), 404
    #return the tour details to the client    
    return jsonify({
        "tour":{
            "id": tour.id,
            "tour_name": tour.tour_name,
            "destination": tour.destination,
            "charges": tour.charges,
            "departure_date": tour.departure_date.strftime("%Y-%m-%d")
        }
    }), 200   
    #return jsonify({
        #"tour_id": tour_id
    #}), 200

@tour_bp.route("/tours/<int:tour_id>", methods = ["PATCH"])
def update_tour(tour_id):

    #retrieve the tour
    tour = Tour.query.filter_by(id=tour_id).first()

    #retrieve the data from the client
    data = request.get_json()
    if not data:
        return jsonify({
            "message": "Request body is required."
        }), 400

    if not tour:
        return jsonify({
            "message": "Tour not found."
        }), 404

    #update tour_name
    if "tour_name" in data:
        tour_name = data["tour_name"]

        if not isinstance (tour_name, str) or not tour_name.strip():
            return jsonify({
                "message": "Tour name is required."
            }), 400

        tour.tour_name = tour_name

    #update destination
    if "destination" in data:
        destination = data["destination"]

        if not isinstance (destination, str) or not destination.strip():
            return jsonify({
                "message": "Destination is required."
            }), 400

        tour.destination = destination

    #update charges we do not add strip since we do not change it to string
    if "charges" in data:
        charges = data["charges"]

        if not isinstance(charges, (int, float)):
            return jsonify({
                "message": "Charges is required."
            }), 400

        if charges <=0:
            return jsonify({
                "message": "charges should be greater than 0."
            }), 400

        tour.charges = charges

    #update departure_date
    if "departure_date" in data:
        departure_date = data["departure_date"]

        if not departure_date:
            return jsonify({
                "message": "Departure date is required."
            }), 400

        try:
            departure_date = datetime.strptime(
                departure_date,
                "%Y-%m-%d"
            )
        except (TypeError, ValueError):
            return jsonify({
                "message": "Use the correct format. YYYY-MM-DD."
            }), 400
    #save the update
    db.session.commit()

    #tell the client the tour was updated successfully
    return jsonify({
        "message": "Tour is updated successfully.",
    }), 200

#delete a tour

@tour_bp.route("/tours/<int:tour_id>", methods=["DELETE"])
def delete_tour(tour_id):
    #retrieve the tour data
    tour = Tour.query.filter_by(id=tour_id).first()

    #check if the tour exists
    if not tour:
        return jsonify({
            "message": "Tour not found."
        }), 404

    #delete the tour
    db.session.delete(tour)

    #save the changes
    db.session.commit()

    #tell the client the tour is deleted successfully

    return jsonify({
        "message": "Tour deleted successfully."
    }), 200