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

   #we get the successful feedbacks if None return 0.
   total_successful_payment = total_successful_payment or Decimal("0.00")
   total_successful_refunds = total_successful_refunds or Decimal("0.00")

   #calculate the revenue
   actual_revenue = total_successful_payment - total_successful_refunds

   #calculate the achievement percentage 
   achievement_percentage = (actual_revenue / target.target_amount) * 100

   #calculate the revenue gap
   revenue_gap = target.target_amount - actual_revenue

   #check the revenue gap status
   gap_status = ["above_target", "on_target", "below_target"]

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
    popular_tours = db.session.query(
        Booking.tour_id,
        db.func.sum(Booking.number_of_people)
    ).filter(
        Booking.status_in(["confirmed", "completed"]),
        Booking.created_at >= target.start_date,
        Booking.created_at < end_datetime
    ).group_by(
        Booking.tour_id
    ).order_by(
        db.func.sum(Booking.number_of_people.desc())
    ).first()

    return jsonify({
        "message": "Dashboard created"
    }), 200
