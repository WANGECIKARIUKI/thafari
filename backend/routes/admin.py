from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from decorators.auth_decorator import roles_required
from extensions import db
from datetime import datetime, timedelta
from models.revenue_target import RevenueTarget
from decimal import Decimal, InvalidOperation
from models.payment import Payment
from models.refund import Refund
from models.booking import Booking
from models.departure import Departure
from models.tour import Tour


admin_bp = Blueprint(
    "admin",
    __name__,
    url_prefix="/api"
)

#create a revenue targets endpoint
@admin_bp.route("/revenue_target", methods = ["POST"])
@jwt_required()
@roles_required("admin")
def create_revenue_target():

    #retrieve the data
    data = request.get_json()

    if not data:
        return jsonify({
            "message": "Request body is required."
        }), 400

    target_amount = data.get("target_amount")
    start_date = data.get("start_date")
    end_date = data.get("end_date")

    #validate the data

    if target_amount is None:
        return jsonify({
            "message": "Target amount is required."
        }), 400

    #change the amount to decimal and validate
    try:
        target_amount = Decimal(str(target_amount))

    except InvalidOperation:
        return jsonify({
            "message": "Target amount is required and should be valid."
        }), 400

    #check if the amount is greater than 0
    if target_amount <= 0:
        return jsonify({
            "message": "Target amount should be greater than 0."
        }), 400

    #check if it is 2 decimal places

    if target_amount.as_tuple().exponent < -2:
        return jsonify({
            "message": "Target amount should not be more than 2 decimal places."
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

    except(TypeError, ValueError):
        return jsonify({
            "message": "Invalid date format. Use YYYY-MM-DD"
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

    except (ValueError, TypeError):
        return jsonify({
            "message": "Invalid date format. Use YYYY-MM-DD"
        }), 400

    if end_date < start_date:
        return jsonify({
            "message": "End date should come after start date."
        }), 400

    #create a new revenue target
    revenue_target = RevenueTarget(
        target_amount=target_amount,
        start_date=start_date,
        end_date=end_date
    )

    #prepare to save the data
    db.session.add(revenue_target)

    #save the data
    try:
        db.session.commit()

    except Exception:

        db.session.rollback()

        return jsonify({
            "message": "Revenue target creation could not be completed."
        }), 500
    
    return jsonify({
        "message": "revenue target created successfully.",
        "revenue_target": {
            "id": revenue_target.id,
            "target_amount": float(revenue_target.target_amount),
            "start_date": revenue_target.start_date.isoformat(),
            "end_date": revenue_target.end_date.isoformat()
        }
    }), 201

#get all revenue targets

@admin_bp.route("/revenue_targets", methods = ["GET"])
@jwt_required()
@roles_required("admin")
def get_revenue_targets():

    #get all the revenue targets
    revenue_targets = RevenueTarget.query.all()

    #create an empty list of the targets

    revenue_target_list = []

    #for loop to loop thru the revenue targets
    for revenue_target in revenue_targets:
        revenue_target_list.append({
            "id":revenue_target.id,
            "target_amount": float(revenue_target.target_amount),
            "start_date": revenue_target.start_date.isoformat(),
            "end_date": revenue_target.end_date.isoformat()
        })

    return jsonify({
        "revenue_targets": revenue_target_list
    }), 200

#total revenue endpoint(revenue performance BI metrics)
@admin_bp.route("/total_revenue/<int:target_id>", methods = ["GET"])
@jwt_required()
@roles_required("admin")
def get_revenue(target_id):
   #check if target exists
   target = RevenueTarget.query.get(target_id)

   if not target:
    return jsonify({
        "message": "Target not found."
    }), 404
   #create a variable for giving us the end time for the time target time period
   end_datetime = target.end_date + timedelta(days=1)

   #get all successful payments
   total_successful_payment = db.session.query(
       db.func.sum(Payment.amount) #request the database to give you the sum of the payment amounts
   ).filter(
       Payment.status == "successful",# filter and only return the successful payments
       Payment.paid_at >= target.start_date,# Only payments made on or after the beginning of this target's period.
       Payment.paid_at < end_datetime 
   ).scalar()


   #get all successful refunds
   total_successful_refunds = db.session.query(
       db.func.sum(Refund.amount)
   ).filter(
    Refund.status == "successful",
    Refund.refunded_at >= target.start_date,
    Refund.refunded_at < end_datetime
   ).scalar()

   #we get the sum of successful payments/refunds if None return 0.
   total_successful_payment = total_successful_payment or Decimal("0.00")
   total_successful_refunds = total_successful_refunds or Decimal("0.00")

   #calculate the revenue
   actual_revenue = total_successful_payment - total_successful_refunds

   #calculate the achievement percentage 
   achievement_percentage = (actual_revenue / target.target_amount) * 100

   #calculate the revenue gap
   revenue_gap = target.target_amount - actual_revenue

   #check the revenue gap status

   if revenue_gap > 0:
       gap_status = "below_target"

   elif revenue_gap == 0:
       gap_status = "on_target"

   else:
       gap_status = "above_target" 

   return jsonify({
       "target_amount":float(target.target_amount),
       "actual_revenue": float(actual_revenue),
       "revenue_gap": float(revenue_gap),
       "status": gap_status,
       "achievement_percentage": float(achievement_percentage)
   }), 200

#endpoint to get the popular tour in a booking by customers
@admin_bp.route("/popular_tours/<int:target_id>", methods = ["GET"])
@jwt_required()
@roles_required("admin")
def get_popular_tours(target_id):
    target = RevenueTarget.query.get(target_id)

    if not target:
        return jsonify({
            "message": "Target not found."
        }), 404
    
    #create a variable for giving us the end time for the target time period
    end_datetime = target.end_date + timedelta(days=1)

    #get all popular tour in a booking using the number of customers
    popular_tour = db.session.query(
        Departure.tour_id, #we need the tour id to know which tour
        db.func.sum(Booking.number_of_people) #check the total no of people in a tour
    ).join(
        Departure, Booking.departure_id == Departure.id #connect each booking to the departure whose id matches booking's departure.id.
    ).filter(
        Booking.status.in_(["confirmed", "completed"]), # these are successful bookings
        Booking.created_at >= target.start_date,
        Booking.created_at < end_datetime
    ).group_by(
        Departure.tour_id #group the total customers by tours
    ).order_by(
        db.func.sum(Booking.number_of_people).desc() #check the total customers from highest to lowest
    ).first() # retrieve the first tour with highest number of people

    #check if the popular tours exist
    if not popular_tour:
        return jsonify({
            "message": "There is no booking for this target period."
        }), 404
    
    #give the order of how the tour id and number of customers will be retrieved(extract the two values)
    tour_id = popular_tour[0]
    total_customers = popular_tour[1]

    #retrieve the actual tour
    tour = Tour.query.get(tour_id)

    if not tour:
        return jsonify({
            "message": "Tour not found."
        }), 404

    return jsonify({
        "message": "Popular tour retrieved successfully.",
        "tour_id":tour.id,
        "tour_name":tour.tour_name,
        "destination": tour.destination,
        "total_customers": int(total_customers)
    }), 200

#metrics for total customers booked
@admin_bp.route("/total_customers/<int:target_id>", methods = ["GET"])
@jwt_required()
@roles_required("admin")
def get_total_customers(target_id):
    target = RevenueTarget.query.get(target_id)

    if not target:
        return jsonify({
            "message": "Target not found."
        }), 404

    #get the end date time
    end_datetime = target.end_date + timedelta(days=1)

    #get the total customers who have confirmed/completed a booking
    total_customers = db.session.query(
        db.func.sum(Booking.number_of_people)
    ).filter(
        Booking.status.in_(["confirmed", "completed"]),
        Booking.created_at >= target.start_date,
        Booking.created_at < end_datetime
    ).scalar() # calculate all the customers and give me one value

    total_customers = total_customers or 0  # if no customers return 0

    return jsonify({
        "total_customers": int(total_customers)
    }), 200

#metrics for confirmed bookings
@admin_bp.route("/confirmed_bookings/<int:target_id>", methods = ["GET"])
@jwt_required()
@roles_required("admin")
def get_confirmed_bookings(target_id):
    target = RevenueTarget.query.get(target_id)

    if not target:
        return jsonify({
            "message": "Target not found."
        }), 404

    end_datetime = target.end_date + timedelta(days=1)

    confirmed_bookings = db.session.query(
        db.func.count(Booking.id)
    ).filter(
        Booking.status == "confirmed",
        Booking.created_at >= target.start_date,
        Booking.created_at < end_datetime
    ).scalar()

    confirmed_bookings = confirmed_bookings or 0

    return jsonify({
        "confirmed_bookings": int(confirmed_bookings)
    }), 200


#get metrics for completed bookings
@admin_bp.route("/completed_bookings/<int:target_id>", methods = ["GET"])
@jwt_required()
@roles_required("admin")
def get_completed_bookings(target_id):
    target = RevenueTarget.query.get(target_id)

    if not target:
        return jsonify({
            "message": "Target not found."
        }), 404

    end_datetime = target.end_date + timedelta(days=1)

    completed_bookings = db.session.query(
        db.func.count(Booking.id)
    ).filter(
        Booking.status == "completed",
        Booking.created_at >= target.start_date,
        Booking.created_at < end_datetime
    ).scalar()

    completed_bookings = completed_bookings or 0

    return jsonify({
        "completed_bookings": int(completed_bookings)
    }), 200
    
#get metrics for canceled bookings
@admin_bp.route("/cancelled_bookings/<int:target_id>", methods = ["GET"])
@jwt_required()
@roles_required("admin")
def get_cancelled_bookings(target_id):
    target = RevenueTarget.query.get(target_id)

    if not target:
        return jsonify({
            "message": "Target not found."
        }), 404

    end_datetime = target.end_date + timedelta(days=1)

    cancelled_bookings = db.session.query(
        db.func.count(Booking.id)
    ).filter(
        Booking.status == "cancelled",
        Booking.created_at >= target.start_date,
        Booking.created_at < end_datetime
    ).scalar()

    cancelled_bookings = cancelled_bookings or 0

    return jsonify({
        "cancelled_bookings": int(cancelled_bookings)
    }), 200


#get expired bookings metrics
@admin_bp.route("/expired_bookings/<int:target_id>", methods = ["GET"])
@jwt_required()
@roles_required("admin")
def get_expired_bookings(target_id):
    target = RevenueTarget.query.get(target_id)

    if not target:
        return jsonify({
            "message": "Target not found."
        }), 404
    
    end_datetime = target.end_date + timedelta(days=1)

    expired_bookings = db.session.query(
        db.func.count(Booking.id)
    ).filter(
        Booking.status == "expired",
        Booking.created_at >= target.start_date,
        Booking.created_at < end_datetime
    ).scalar()

    expired_bookings = expired_bookings or 0

    return jsonify({
        "expired_bookings":int(expired_bookings)
    }), 200

#get booking completion rate metrics using completed and total bookings we are checking using departure to know when the tour was completed
@admin_bp.route("/completion_rate/<int:target_id>", methods = ["GET"])
@jwt_required()
@roles_required("admin")
def get_booking_completion_rate(target_id):
    target = RevenueTarget.query.get(target_id)

    if not target:
        return jsonify({
            "message": "Target not found."
        }), 404

    end_datetime = target.end_date + timedelta(days=1)

    #get completed bookings metrics
    completed_bookings = db.session.query(
        db.func.count(Booking.id)
    ).join(
        Departure,
        Booking.departure_id == Departure.id
    ).filter(
        Booking.status == "completed",
        Departure.end_date >= target.start_date,
        Departure.end_date < end_datetime
    ).scalar()

    completed_bookings = completed_bookings or 0

    #get total bookings
    total_bookings = db.session.query(
        db.func.count(Booking.id)
    ).join(
        Departure,
        Booking.departure_id == Departure.id
    ).filter(
        Departure.end_date >= target.start_date,
        Departure.end_date < end_datetime
    ).scalar()

    #calculate completion rate ensuring if 0 it can not explode
    if total_bookings == 0:
        completion_rate = 0

    else:
        completion_rate = (completed_bookings / total_bookings) * 100

    return jsonify({
        "completed_bookings":int(completed_bookings),
        "total_bookings":int(total_bookings),
        "completion_rate": round(float(completion_rate), 2) # round of to two decimal places.
    }), 200

#get all cancelled bookings from a targeted period from departures from total bookings
@admin_bp.route("/cancellation_rate/<int:target_id>", methods = ["GET"])
@jwt_required()
@roles_required("admin")
def get_cancellation_rate(target_id):
    target = RevenueTarget.query.get(target_id)

    if not target:
        return jsonify({
            "message": "Target not found."
        }), 404

    end_datetime = target.end_date + timedelta(days=1)

    cancelled_bookings = db.session.query(
        db.func.count(Booking.id)
    ).join(
        Departure,
        Booking.departure_id == Departure.id
    ).filter(
        Booking.status == "cancelled",
        Departure.end_date >= target.start_date,
        Departure.end_date < end_datetime
    ).scalar()

    cancelled_bookings = cancelled_bookings or 0

    #total bookings
    total_bookings = db.session.query(
        db.func.count(Booking.id)
    ).join(
        Departure,
        Booking.departure_id == Departure.id
    ).filter(
        Departure.end_date >= target.start_date,
        Departure.end_date < end_datetime
    ).scalar()

    if total_bookings == 0:
        cancellation_rate = 0
    else:
        cancellation_rate = (cancelled_bookings / total_bookings) * 100

    return jsonify({
        "cancellation_rate": round(float(cancellation_rate), 2),
        "cancelled_bookings": int(cancelled_bookings),
        "total_bookings": int(total_bookings)
    }), 200

#get average booking size(customers) metrics
@admin_bp.route("/average_size/<int:target_id>", methods =["GET"])
@jwt_required()
@roles_required("admin")
def get_average_size(target_id):
    target = RevenueTarget.query.get(target_id)

    if not target:
        return jsonify({
            "message": "Target not found."
        }), 404

    end_datetime = target.end_date + timedelta(days=1)

    total_customers = db.session.query(
        db.func.sum(Booking.number_of_people)
    ).join(
        Departure,
        Booking.departure_id == Departure.id
    ).filter(
        Departure.end_date >= target.start_date,
        Departure.end_date < end_datetime
    ).scalar()

    total_customers = total_customers or 0

    #total bookings
    total_bookings = db.session.query(
        db.func.count(Booking.id)
    ).join(
        Departure,
        Booking.departure_id == Departure.id
    ).filter(
        Departure.end_date >= target.start_date,
        Departure.end_date < end_datetime
    ).scalar()

    if total_bookings == 0:
        average_booking_size = 0

    else:
        average_booking_size = (total_customers / total_bookings)

    return jsonify({
        "average_booking_size": round(float(average_booking_size), 2),
        "total_customers":int(total_customers),
        "total_bookings":int(total_bookings)
    }), 200

#get average revenue metrics(use actual revenue and total bookings)
@admin_bp.route("/average_revenue/<int:target_id>", methods = ["GET"])
@jwt_required()
@roles_required("admin")
def get_average_revenue(target_id):
    target = RevenueTarget.query.get(target_id)

    if not target:
        return jsonify({
            "message": "Target not found."
        }), 404
    
    end_datetime = target.end_date + timedelta(days=1)

    #get total revenue using successful payments and successful refunds

    total_successful_payments = db.session.query(
        db.func.sum(Payment.amount)
    ).filter(
        Payment.status == "successful",
        Payment.paid_at >= target.start_date,
        Payment.paid_at < end_datetime
    ).scalar()

    #create a subquery to identify the booking that belong to the payment target period we are measuring then find the refunds of that booking.

    paid_booking_ids = db.session.query(
        Payment.booking_id
    ).filter(
        Payment.status == "successful",
        Payment.paid_at >= target.start_date,
        Payment.paid_at < end_datetime
    ).subquery()

    #total successful refunds
    total_successful_refunds = db.session.query(
        db.func.sum(Refund.amount)
    ).join(
        Payment,
        Refund.payment_id == Payment.id
    ).filter(
        Refund.status == "successful",
        Payment.booking_id.in_(paid_booking_ids) #only include the refund's payment unless it belongs to the bookings identified by successful payment subquery
    ).scalar()

    total_successful_payments = total_successful_payments or Decimal("0.00")
    total_successful_refunds = total_successful_refunds or Decimal("0.00")

    #calculate actual revenue
    actual_revenue = total_successful_payments - total_successful_refunds

    #total bookings
    total_successful_bookings = db.session.query(
        db.func.count(db.distinct(Payment.booking_id)) # we are using payment and distinct because a booking can have many payments so we get only unique bookings.
        #i.e is one booking has 3 payments we count it as one unique booking not 3.
    ).filter(
        Payment.status == "successful",
        Payment.paid_at >= target.start_date,
        Payment.paid_at < end_datetime
    ).scalar()

    #calculate average revenue per booking
    if total_successful_bookings == 0:
        average_revenue_per_booking = 0
        revenue_message = "Average revenue cannot be calculated because there were no successful paid bookings in this period."

    else:
        average_revenue_per_booking = actual_revenue / total_successful_bookings
        revenue_message = "Average revenue calculated successfully."

    return jsonify({
        "average_revenue_per_booking": round(float(average_revenue_per_booking), 2),
        "total_successful_bookings": total_successful_bookings,
        "actual_revenue": float(actual_revenue),
        "message": revenue_message
    }), 200

#get the tour generating more revenue metrics
@admin_bp.route("/top_revenue/<int:target_id>", methods = ["GET"])
@jwt_required()
@roles_required("admin")
def get_top_revenue(target_id):
    target = RevenueTarget.query.get(target_id)

    if not target:
        return jsonify({
            "message": "Target not found."
        }), 404

    end_datetime = target.end_date + timedelta(days=1)

    #get successful payments for each tour
    total_payments = db.session.query(
        Departure.tour_id,
        db.func.sum(Payment.amount)
    ).join(
        Booking,
        Payment.booking_id == Booking.id
    ).join(
        Departure,
        Booking.departure_id == Departure.id
    ).join(
        Tour,
        Departure.tour_id == Tour.id
    ).filter(
        Payment.status == "successful",
        Payment.paid_at >= target.start_date,
        Payment.paid_at < end_datetime
    ).group_by(
        Departure.tour_id
    ).all()

    #get successful refunds for each tour
    total_refunds = db.session.query(
        Departure.tour_id,
        db.func.sum(Refund.amount)
    ).join(
        Payment,
        Refund.payment_id == Payment.id
    ).join(
        Booking,
        Payment.booking_id == Booking.id
    ).join(
        Departure,
        Booking.departure_id == Departure.id
    ).join(
        Tour,
        Departure.tour_id == Tour.id
    ).filter(
        Refund.status == "successful",
        Refund.refunded_at >= target.start_date,
        Refund.refunded_at < end_datetime
    ).group_by(
        Departure.tour_id
    ).all()

    #create a dictionary so we can find the refund amounts for each tour using the tour id.
    refunds_by_tour = {
        tour_id: refund_amount
        for tour_id, refund_amount in total_refunds  #tour_id is key and refund_amount is value
    }

    payments_by_tour = {
        tour_id: payment_amount
        for tour_id, payment_amount in total_payments
    }

    #create a dictionary to store the actual revenue generated by each tour
    actual_revenue_by_tour = {}

    #go through each tour and it's successful payments
    for tour_id, payment_amount in payments_by_tour.items():

        #get the successful refunds for this tour, if the tour has no refunds use 0.
        refund_amount = refunds_by_tour.get(tour_id, 0)

        #calculate the actual revenue generated
        actual_revenue_by_tour[tour_id] = payment_amount - refund_amount

    if not actual_revenue_by_tour:
        return jsonify({
            "message": "No revenue generated during that target period."
        }), 200

    #find the tour with the actual highest revenue using the revenue value stored by each tour
    top_tour_id = max(
        actual_revenue_by_tour,
        key=actual_revenue_by_tour.get #use the revenue values to determine which (tour_id) has the highest revenue
    )

    #get the highest actual revenue
    top_revenue = actual_revenue_by_tour[top_tour_id]

    #get the tour records so we can return things such as tour name
    top_tour = Tour.query.get(top_tour_id)

    if not top_tour:
        return jsonify({
            "message": "Tour not found."
        }), 404

    return jsonify({
        "tour_id": top_tour.id,
        "tour_name": top_tour.tour_name,
        "actual_revenue": float(top_revenue)
    }), 200    

#get revenue per customer metrics
@admin_bp.route("/customer_revenue/<int:target_id>", methods = ["GET"]) 
@jwt_required()
@roles_required("admin")
def get_revenue_per_customer(target_id):
    target = RevenueTarget.query.get(target_id)

    if not target:
        return jsonify({
            "message": "Target not found."
        }), 404

    end_datetime = target.end_date + timedelta(days=1)

    total_customers = db.session.query(
        db.func.sum(Booking.number_of_people)
    ).join(
        Departure,
        Booking.departure_id == Departure.id
    ).filter(
        Booking.status == "completed",
        Departure.end_date >= target.start_date,
        Departure.end_date < end_datetime 
    ).scalar()

    total_customers = total_customers or 0

    #successful payment per booking
    successful_payments = db.session.query(
        db.func.sum(Payment.amount)
    ).join(
        Booking,
        Payment.booking_id == Booking.id
    ).join(
        Departure,
        Booking.departure_id == Departure.id
    ).filter(
        Payment.status == "successful",
        Booking.status == "completed",
        Departure.end_date >= target.start_date,
        Departure.end_date < end_datetime
    ).scalar()

    #total refunds
    successful_refunds = db.session.query(
        db.func.sum(Refund.amount)
    ).join(
        Payment,
        Refund.payment_id == Payment.id
    ).join(
        Booking,
        Payment.booking_id == Booking.id
    ).join(
        Departure,
        Booking.departure_id == Departure.id
    ).filter(
        Refund.status == "successful",
        Booking.status == "completed",
        Departure.end_date >= target.start_date,
        Departure.end_date < end_datetime
    ).scalar()

    successful_payments = successful_payments or Decimal("0.00")
    successful_refunds = successful_refunds or Decimal("0.00")

    actual_revenue = successful_payments - successful_refunds

    if total_customers == 0:
        revenue_per_customer = 0

    else:
        revenue_per_customer = actual_revenue / total_customers

    return jsonify({
        "total_customers": int(total_customers),
        "actual_revenue": float(actual_revenue),
        "revenue_per_customer": round(float(revenue_per_customer), 2)
    }), 200

#completed bookings per customer
@admin_bp.route("/customer_booking/<int:target_id>", methods = ["GET"])
@jwt_required()
@roles_required("admin")
def get_customer_retention(target_id):
    target = RevenueTarget.query.get(target_id)

    if not target:
        return jsonify({
            "message": "Target not found."
        }), 404

    end_datetime = target.end_date + timedelta(days=1)    

    completed_bookings_per_customer = db.session.query(
        Booking.user_id,
        db.func.count(Booking.id)
    ).join(
        Departure,
        Booking.departure_id == Departure.id
    ).filter(
        Booking.status == "completed",
        Departure.end_date >= target.start_date,
        Departure.end_date < end_datetime
    ).group_by(
        Booking.user_id
    ).all()

    #find the total unique customers
    total_unique_customers = len(completed_bookings_per_customer)

    #find repeat customers
    repeat_customers = 0

    for user_id, completed_trips in completed_bookings_per_customer:
        #check if there are two or more completed trips and from there if there are repeat customers
        if completed_trips >= 2:
            repeat_customers +=1

    if total_unique_customers == 0:
        repeat_booking_rate = 0

    else:
        repeat_booking_rate = (repeat_customers / total_unique_customers) * 100

    return jsonify({
        "repeat_booking_rate": round(float(repeat_booking_rate), 2),
        "repeat_customers": int(repeat_customers),
        "total_unique_customers": int(total_unique_customers)
    }), 200

#get occupancy rate in a tour(departure) here we check customers and capacity
@admin_bp.route("/occupancy_rate/<int:target_id>", methods = ["GET"])
@jwt_required()
@roles_required("admin")
def get_occupancy_rate(target_id):
    target = RevenueTarget.query.get(target_id)

    if not target:
        return jsonify({
            "message": "Target not found."
        }), 404

    end_datetime = target.end_date + timedelta(days=1)

    #get total customers in a booking
    total_customers = db.session.query(
        db.func.sum(Booking.number_of_people)
    ).join(
        Departure, # joining bookings to their departure
        Booking.departure_id == Departure.id
    ).filter(
        Booking.status.in_(["completed", "confirmed"]),
        Departure.end_date >= target.start_date,
        Departure.end_date < end_datetime
    ).scalar()

    total_customers = total_customers or 0

    #get total capacity in a departure
    total_capacity = db.session.query(
        db.func.sum(Departure.capacity)
    ).filter(
        Departure.end_date >= target.start_date,
        Departure.end_date < end_datetime
    ).scalar()

    total_capacity = total_capacity or 0

    if total_capacity == 0:
        occupancy_rate = 0

    else:
        occupancy_rate = (total_customers / total_capacity) * 100

    return jsonify({
        "occupancy_rate": round(float(occupancy_rate), 2),
        "total_customers": int(total_customers),
        "total_capacity": int(total_capacity)
    }), 200


#get booking growth rate here we check previous month booking and current month booking
@admin_bp.route("/booking_growth/<int:target_id>", methods = ["GET"])
@jwt_required()
@roles_required("admin")
def get_growth_rate(target_id):
    target = RevenueTarget.query.get(target_id)

    if not target:
        return jsonify({
            "message": "Target not found."
        }), 404

    end_datetime = target.end_date + timedelta(days=1)

    current_bookings = db.session.query(
        db.func.count(Booking.id)
    ).join(
        Departure,
        Booking.departure_id == Departure.id
    ).filter(
        Booking.status.in_(["completed", "confirmed"]),
        Departure.end_date >= target.start_date,
        Departure.end_date < end_datetime
    ).scalar()

    current_bookings = current_bookings or 0

    #get exact duration(number of days) we want to check
    target_duration = target.end_date - target.start_date + timedelta(days=1)
    #previous dates
    previous_startdate = target.start_date - target_duration
    previous_enddate = target.start_date # use the target start date as the exclusive boundary
    # so the previous period ends immediately before the target period
    
    #previous bookings
    previous_bookings = db.session.query(
        db.func.count(Booking.id)
    ).join(
        Departure,
        Booking.departure_id == Departure.id
    ).filter(
        Booking.status.in_(["completed", "confirmed"]),
        Departure.end_date >= previous_startdate,
        Departure.end_date < previous_enddate
    ).scalar()

    previous_bookings = previous_bookings or 0

    if previous_bookings == 0:
        booking_growth_rate = None
        growth_message = "Growth rate cannot be calculated because the previous period had zero bookings; percentage growth from a zero baseline is undefined."  

    else:
        booking_growth_rate = ((current_bookings - previous_bookings) / previous_bookings)  * 100
        growth_message = "Growth rate calculated successfully."

    return jsonify({
        "booking_growth_rate": booking_growth_rate,
        "current_bookings": int(current_bookings),
        "previous_bookings": int(previous_bookings),
        "message": growth_message
    }), 200

#customer growth rate
@admin_bp.route("/customer_growth/<int:target_id>", methods = ["GET"])
@jwt_required()
@roles_required("admin")
def get_customer_growth_rate(target_id):
    target = RevenueTarget.query.get(target_id)

    if not target:
        return jsonify({
            "message": "Target not found."
        }), 404

    end_datetime = target.end_date + timedelta(days=1)

    current_customers = db.session.query(
        db.func.count(db.distinct(Booking.user_id)) # count each user id only once.
    ).join(
        Departure,
        Booking.departure_id == Departure.id
    ).filter(
        Booking.status.in_(["completed", "confirmed"]),
        Departure.end_date >= target.start_date,
        Departure.end_date < end_datetime
    ).scalar()

    current_customers = current_customers or 0

    #get the previous target duration
    target_duration = target.end_date - target.start_date + timedelta(days=1)
    previous_startdate = target.start_date - target_duration
    previous_enddate = target.start_date #boundary between the previous and the current periods.

    previous_customers = db.session.query(
        db.func.count(db.distinct(Booking.user_id))
    ).join(
        Departure,
        Booking.departure_id == Departure.id
    ).filter(
        Booking.status.in_(["completed", "confirmed"]),
        Departure.end_date >= previous_startdate,
        Departure.end_date < previous_enddate
    ).scalar()

    previous_customers = previous_customers or 0

    if previous_customers == 0:
        customer_growth_rate = None
        growth_message = "Growth rate cannot be calculated because the previous period had zero customers; percentage growth from a zero baseline is undefined."

    else:
        customer_growth_rate = ((current_customers - previous_customers) / previous_customers) * 100
        growth_message = "Growth rate calculated successfully."

    return jsonify({
        "customer_growth_rate": customer_growth_rate,
        "current_customers": int(current_customers),
        "previous_customers": int(previous_customers),
        "message": growth_message
    }), 200 

#average trip duration metrics(departures: start date and end date)
@admin_bp.route("/average_trip/<int:target_id>", methods = ["GET"])
@jwt_required()
@roles_required("admin")
def get_average_trip_duration(target_id):
    target = RevenueTarget.query.get(target_id)
    if not target:
        return jsonify({
            "message": "Target not found."
        }), 404

    end_datetime = target.end_date + timedelta(days=1)

    #get all valid distinct departures(get each departure once)
    unique_departures = db.session.query(
        Departure.id # we are getting each departure
    ).join(
        Booking, #connect each departure to the bookings belonging to it
        Booking.departure_id == Departure.id
    ).filter(
        Booking.status == "completed", # this will change to complete
        Departure.end_date >= target.start_date,
        Departure.end_date < end_datetime
    ).distinct().subquery() #distinct- remove duplicates, subquery - temporary query that another query(main) will use.

    #main query : calculate the average trip duration
    average_trip_duration = db.session.query(
        db.func.avg( # average duration of the departures
            db.func.datediff( # how many days did the departure last
                Departure.end_date,
                Departure.start_date
            ) + 1 # this includes start and end dates
        )
    ).join( # use the departures identified by our subquery
        unique_departures,
        Departure.id == unique_departures.c.id #c means column
    ).scalar() #gives you the single average value

    average_trip_duration = average_trip_duration or 0

    return jsonify({
        "average_trip_duration": round(float(average_trip_duration), 2)
    }), 200

#get revenue per tour metrics we will use payments, refunds, booking and departure
@admin_bp.route("/revenue_tour/<int:target_id>", methods = ["GET"])
@jwt_required()
@roles_required("admin")
def get_revenue_per_tour(target_id):
    target = RevenueTarget.query.get(target_id)

    if not target:
        return jsonify({
            "message": "Target not found."
        }), 404

    end_datetime = target.end_date + timedelta(days=1)

    #successful payments
    successful_payments = db.session.query(
        Departure.tour_id, #get payments for each tour
        db.func.sum(Payment.amount)
    ).join(
        Booking,
        Payment.booking_id == Booking.id
    ).join(
        Departure,
        Booking.departure_id == Departure.id
    ).group_by(
        Departure.tour_id
    ).filter(
        Payment.status == "successful",
        Payment.paid_at >= target.start_date,
        Payment.paid_at < end_datetime,
        Departure.end_date >= target.start_date, # we include departure to know the duration of the paid tour
        Departure.end_date < end_datetime
    ).all()

    #successful refunds
    successful_refunds = db.session.query(
        Departure.tour_id,
        db.func.sum(Refund.amount)
    ).join(
        Payment, # a payment can have many refunds
        Refund.payment_id == Payment.id
    ).join(
        Booking, # a booking can have many payments
        Payment.booking_id == Booking.id
    ).join(
        Departure, #A departure can have many bookings
        Booking.departure_id == Departure.id
    ).group_by(
        Departure.tour_id
    ).filter(
        Refund.status == "successful",
        Refund.refunded_at >= target.start_date,
        Refund.refunded_at < end_datetime,
        Departure.end_date >= target.start_date,
        Departure.end_date < end_datetime
    ).all()

    #dictionary for successful payments/successful refunds
    payments_by_tour = {
        tour_id: payment_amount #key: value
        for tour_id, payment_amount in successful_payments
    }

    refunds_by_tour = {
        tour_id: refund_amount
        for tour_id, refund_amount in successful_refunds
    }

    #create an actual revenue dictionary
    actual_revenue_by_tour = {}

    #loop thru the payments
    for tour_id, payment_amount in payments_by_tour.items():

        #find the refunds of this tour, if none return 0
        refund_amount = refunds_by_tour.get(tour_id, 0)

        #calculate the actual revenue for a particular tour
        actual_revenue_by_tour[tour_id] = payment_amount - refund_amount

    #create a list to get the tour details
    #empty list
    revenue_per_tour = []

    #loop thru the actual revenue
    for tour_id, actual_revenue in actual_revenue_by_tour.items():

        tour = Tour.query.get(tour_id)

        if not tour:
            return jsonify({
                "message": "Tour not found."
            }), 404

        revenue_per_tour.append({
            "tour_id":tour.id,
            "tour_name": tour.tour_name,
            "actual_revenue": float(actual_revenue)
        })
    return jsonify({
        "revenue_per_tour":revenue_per_tour
    }), 200
