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
from models.payment_setting import PaymentSetting


admin_bp = Blueprint(
    "admin",
    __name__,
    url_prefix="/api"
)


# =========================================================
# PAYMENT SETTINGS
# =========================================================
#
# These endpoints allow an administrator to control the
# direct payment details displayed to customers.
#
# The payment details are stored in the database instead
# of being hardcoded in the React frontend.
#
# Admin can update:
#
# - M-Pesa enabled/disabled
# - M-Pesa Paybill
# - M-Pesa Till
# - M-Pesa business name
# - Airtel Money enabled/disabled
# - Airtel Money number
# - Airtel business name
# - Customer payment instructions
#
# =========================================================


def serialize_payment_settings(settings):
    """
    Convert the PaymentSetting model into a JSON-friendly
    dictionary.

    Keeping this in one helper means both GET and PUT
    responses use the same structure.
    """

    return {
        "id": settings.id,
        "setting_key": settings.setting_key,

        "mpesa": {
            "enabled": bool(settings.mpesa_enabled),
            "paybill": settings.mpesa_paybill,
            "till": settings.mpesa_till,
            "business_name": settings.mpesa_business_name
        },

        "airtel_money": {
            "enabled": bool(settings.airtel_enabled),
            "number": settings.airtel_money_number,
            "business_name": settings.airtel_business_name
        },

        "instructions": settings.instructions,

        "created_at": (
            settings.created_at.isoformat()
            if settings.created_at
            else None
        ),

        "updated_at": (
            settings.updated_at.isoformat()
            if settings.updated_at
            else None
        )
    }


def clean_optional_string(value):
    """
    Clean optional text fields.

    Empty strings are converted to None so the database
    does not store meaningless empty values.
    """

    if value is None:
        return None

    if not isinstance(value, str):
        return value

    value = value.strip()

    return value if value else None


# =========================================================
# GET PAYMENT SETTINGS
# =========================================================

@admin_bp.route(
    "/admin/payment-settings",
    methods=["GET"]
)
@jwt_required()
@roles_required("admin")
def get_admin_payment_settings():

    # -----------------------------------------------------
    # Get the default payment settings record.
    # -----------------------------------------------------

    settings = PaymentSetting.query.filter_by(
        setting_key="default"
    ).first()


    # -----------------------------------------------------
    # If settings have not been configured yet, return a
    # safe empty configuration.
    #
    # We do NOT create a database row during GET.
    # -----------------------------------------------------

    if not settings:

        return jsonify({
            "message": "Payment settings have not been configured yet.",
            "payment_settings": {
                "id": None,
                "setting_key": "default",

                "mpesa": {
                    "enabled": False,
                    "paybill": None,
                    "till": None,
                    "business_name": None
                },

                "airtel_money": {
                    "enabled": False,
                    "number": None,
                    "business_name": None
                },

                "instructions": None,

                "created_at": None,
                "updated_at": None
            }
        }), 200


    return jsonify({
        "message": "Payment settings retrieved successfully.",
        "payment_settings":
            serialize_payment_settings(settings)
    }), 200


# =========================================================
# UPDATE PAYMENT SETTINGS
# =========================================================

@admin_bp.route(
    "/admin/payment-settings",
    methods=["PUT"]
)
@jwt_required()
@roles_required("admin")
def update_admin_payment_settings():

    data = request.get_json()


    # -----------------------------------------------------
    # Validate request body.
    # -----------------------------------------------------

    if not data:

        return jsonify({
            "message": "Request body is required."
        }), 400


    # -----------------------------------------------------
    # Find the existing default configuration.
    # -----------------------------------------------------

    settings = PaymentSetting.query.filter_by(
        setting_key="default"
    ).first()


    # -----------------------------------------------------
    # If this is the first configuration, create it.
    # -----------------------------------------------------

    if not settings:

        settings = PaymentSetting(
            setting_key="default"
        )

        db.session.add(settings)


    # =====================================================
    # M-PESA ENABLED
    # =====================================================

    if "mpesa_enabled" in data:

        if not isinstance(
            data["mpesa_enabled"],
            bool
        ):

            return jsonify({
                "message":
                    "mpesa_enabled must be true or false."
            }), 400


        settings.mpesa_enabled = \
            data["mpesa_enabled"]


    # =====================================================
    # M-PESA PAYBILL
    # =====================================================

    if "mpesa_paybill" in data:

        mpesa_paybill = \
            clean_optional_string(
                data["mpesa_paybill"]
            )


        if (
            mpesa_paybill is not None
            and not isinstance(
                mpesa_paybill,
                str
            )
        ):

            return jsonify({
                "message":
                    "mpesa_paybill must be text."
            }), 400


        settings.mpesa_paybill = \
            mpesa_paybill


    # =====================================================
    # M-PESA TILL
    # =====================================================

    if "mpesa_till" in data:

        mpesa_till = \
            clean_optional_string(
                data["mpesa_till"]
            )


        if (
            mpesa_till is not None
            and not isinstance(
                mpesa_till,
                str
            )
        ):

            return jsonify({
                "message":
                    "mpesa_till must be text."
            }), 400


        settings.mpesa_till = \
            mpesa_till


    # =====================================================
    # M-PESA BUSINESS NAME
    # =====================================================

    if "mpesa_business_name" in data:

        mpesa_business_name = \
            clean_optional_string(
                data["mpesa_business_name"]
            )


        if (
            mpesa_business_name is not None
            and not isinstance(
                mpesa_business_name,
                str
            )
        ):

            return jsonify({
                "message":
                    "mpesa_business_name must be text."
            }), 400


        settings.mpesa_business_name = \
            mpesa_business_name


    # =====================================================
    # AIRTEL ENABLED
    # =====================================================

    if "airtel_enabled" in data:

        if not isinstance(
            data["airtel_enabled"],
            bool
        ):

            return jsonify({
                "message":
                    "airtel_enabled must be true or false."
            }), 400


        settings.airtel_enabled = \
            data["airtel_enabled"]


    # =====================================================
    # AIRTEL MONEY NUMBER
    # =====================================================

    if "airtel_money_number" in data:

        airtel_money_number = \
            clean_optional_string(
                data["airtel_money_number"]
            )


        if (
            airtel_money_number is not None
            and not isinstance(
                airtel_money_number,
                str
            )
        ):

            return jsonify({
                "message":
                    "airtel_money_number must be text."
            }), 400


        settings.airtel_money_number = \
            airtel_money_number


    # =====================================================
    # AIRTEL BUSINESS NAME
    # =====================================================

    if "airtel_business_name" in data:

        airtel_business_name = \
            clean_optional_string(
                data["airtel_business_name"]
            )


        if (
            airtel_business_name is not None
            and not isinstance(
                airtel_business_name,
                str
            )
        ):

            return jsonify({
                "message":
                    "airtel_business_name must be text."
            }), 400


        settings.airtel_business_name = \
            airtel_business_name


    # =====================================================
    # CUSTOMER INSTRUCTIONS
    # =====================================================

    if "instructions" in data:

        instructions = \
            clean_optional_string(
                data["instructions"]
            )


        if (
            instructions is not None
            and not isinstance(
                instructions,
                str
            )
        ):

            return jsonify({
                "message":
                    "instructions must be text."
            }), 400


        settings.instructions = \
            instructions


    # =====================================================
    # BUSINESS VALIDATION
    # =====================================================
    #
    # If a payment method is enabled, the customer must
    # have enough information to actually make the payment.
    #
    # M-Pesa can use either:
    #
    #     Paybill
    #
    # OR:
    #
    #     Till
    #
    # Therefore we require at least one of them when
    # M-Pesa is enabled.
    #
    # =====================================================

    if settings.mpesa_enabled:

        if (
            not settings.mpesa_paybill
            and not settings.mpesa_till
        ):

            db.session.rollback()

            return jsonify({
                "message":
                    "M-Pesa is enabled but no Paybill or Till number has been configured."
            }), 400


    # =====================================================
    # AIRTEL VALIDATION
    # =====================================================

    if settings.airtel_enabled:

        if not settings.airtel_money_number:

            db.session.rollback()

            return jsonify({
                "message":
                    "Airtel Money is enabled but no Airtel Money number has been configured."
            }), 400


    # =====================================================
    # SAVE CHANGES
    # =====================================================

    try:

        db.session.commit()

    except Exception:

        db.session.rollback()

        return jsonify({
            "message":
                "Payment settings could not be updated."
        }), 500


    return jsonify({
        "message":
            "Payment settings updated successfully.",

        "payment_settings":
            serialize_payment_settings(settings)

    }), 200


# =========================================================
# CREATE REVENUE TARGET
# =========================================================

@admin_bp.route(
    "/revenue_target",
    methods=["POST"]
)
@jwt_required()
@roles_required("admin")
def create_revenue_target():

    # retrieve the data
    data = request.get_json()

    if not data:
        return jsonify({
            "message": "Request body is required."
        }), 400

    target_amount = data.get("target_amount")
    start_date = data.get("start_date")
    end_date = data.get("end_date")

    # validate the data

    if target_amount is None:
        return jsonify({
            "message": "Target amount is required."
        }), 400

    # change the amount to decimal and validate
    try:
        target_amount = Decimal(str(target_amount))

    except InvalidOperation:
        return jsonify({
            "message": "Target amount is required and should be valid."
        }), 400

    # check if the amount is greater than 0
    if target_amount <= 0:
        return jsonify({
            "message": "Target amount should be greater than 0."
        }), 400

    # check if it is 2 decimal places

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

    except (TypeError, ValueError):
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

    # create a new revenue target
    revenue_target = RevenueTarget(
        target_amount=target_amount,
        start_date=start_date,
        end_date=end_date
    )

    # prepare to save the data
    db.session.add(revenue_target)

    # save the data
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


# =========================================================
# GET ALL REVENUE TARGETS
# =========================================================

@admin_bp.route(
    "/revenue_targets",
    methods=["GET"]
)
@jwt_required()
@roles_required("admin")
def get_revenue_targets():

    # get all the revenue targets
    revenue_targets = RevenueTarget.query.all()

    # create an empty list of the targets
    revenue_target_list = []

    # for loop to loop through the revenue targets
    for revenue_target in revenue_targets:

        revenue_target_list.append({
            "id": revenue_target.id,
            "target_amount": float(
                revenue_target.target_amount
            ),
            "start_date":
                revenue_target.start_date.isoformat(),
            "end_date":
                revenue_target.end_date.isoformat()
        })

    return jsonify({
        "revenue_targets": revenue_target_list
    }), 200


# =========================================================
# TOTAL REVENUE ENDPOINT
# =========================================================

@admin_bp.route(
    "/total_revenue/<int:target_id>",
    methods=["GET"]
)
@jwt_required()
@roles_required("admin")
def get_revenue(target_id):

    # check if target exists
    target = RevenueTarget.query.get(target_id)

    if not target:
        return jsonify({
            "message": "Target not found."
        }), 404

    # create a variable for giving us the end time
    # for the target time period
    end_datetime = target.end_date + timedelta(days=1)

    # get all successful payments
    total_successful_payment = db.session.query(
        db.func.sum(Payment.amount)
    ).filter(
        Payment.status == "successful",
        Payment.paid_at >= target.start_date,
        Payment.paid_at < end_datetime
    ).scalar()

    # get all successful refunds
    total_successful_refunds = db.session.query(
        db.func.sum(Refund.amount)
    ).filter(
        Refund.status == "successful",
        Refund.refunded_at >= target.start_date,
        Refund.refunded_at < end_datetime
    ).scalar()

    # if None return 0
    total_successful_payment = (
        total_successful_payment
        or Decimal("0.00")
    )

    total_successful_refunds = (
        total_successful_refunds
        or Decimal("0.00")
    )

    # calculate the revenue
    actual_revenue = (
        total_successful_payment
        - total_successful_refunds
    )

    # calculate achievement percentage
    achievement_percentage = (
        actual_revenue
        / target.target_amount
    ) * 100

    # calculate revenue gap
    revenue_gap = (
        target.target_amount
        - actual_revenue
    )

    # check revenue gap status
    if revenue_gap > 0:
        gap_status = "below_target"

    elif revenue_gap == 0:
        gap_status = "on_target"

    else:
        gap_status = "above_target"

    return jsonify({
        "target_amount":
            float(target.target_amount),

        "actual_revenue":
            float(actual_revenue),

        "revenue_gap":
            float(revenue_gap),

        "status":
            gap_status,

        "achievement_percentage":
            float(achievement_percentage)
    }), 200


# =========================================================
# POPULAR TOUR
# =========================================================

@admin_bp.route(
    "/popular_tours/<int:target_id>",
    methods=["GET"]
)
@jwt_required()
@roles_required("admin")
def get_popular_tours(target_id):

    target = RevenueTarget.query.get(target_id)

    if not target:
        return jsonify({
            "message": "Target not found."
        }), 404

    # create a variable for giving us the end time
    end_datetime = target.end_date + timedelta(days=1)

    # get all popular tours in a booking using
    # the number of customers
    popular_tour = db.session.query(
        Departure.tour_id,
        db.func.sum(
            Booking.number_of_people
        )
    ).join(
        Departure,
        Booking.departure_id == Departure.id
    ).filter(
        Booking.status.in_(
            ["confirmed", "completed"]
        ),
        Booking.created_at >= target.start_date,
        Booking.created_at < end_datetime
    ).group_by(
        Departure.tour_id
    ).order_by(
        db.func.sum(
            Booking.number_of_people
        ).desc()
    ).first()

    if not popular_tour:
        return jsonify({
            "message":
                "There is no booking for this target period."
        }), 404

    tour_id = popular_tour[0]
    total_customers = popular_tour[1]

    tour = Tour.query.get(tour_id)

    if not tour:
        return jsonify({
            "message": "Tour not found."
        }), 404

    return jsonify({
        "message":
            "Popular tour retrieved successfully.",

        "tour_id":
            tour.id,

        "tour_name":
            tour.tour_name,

        "destination":
            tour.destination,

        "total_customers":
            int(total_customers)

    }), 200


# =========================================================
# TOTAL CUSTOMERS
# =========================================================

@admin_bp.route(
    "/total_customers/<int:target_id>",
    methods=["GET"]
)
@jwt_required()
@roles_required("admin")
def get_total_customers(target_id):

    target = RevenueTarget.query.get(target_id)

    if not target:
        return jsonify({
            "message": "Target not found."
        }), 404

    end_datetime = target.end_date + timedelta(days=1)

    total_customers = db.session.query(
        db.func.sum(
            Booking.number_of_people
        )
    ).filter(
        Booking.status.in_(
            ["confirmed", "completed"]
        ),
        Booking.created_at >= target.start_date,
        Booking.created_at < end_datetime
    ).scalar()

    total_customers = total_customers or 0

    return jsonify({
        "total_customers":
            int(total_customers)
    }), 200


# =========================================================
# CONFIRMED BOOKINGS
# =========================================================

@admin_bp.route(
    "/confirmed_bookings/<int:target_id>",
    methods=["GET"]
)
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
        "confirmed_bookings":
            int(confirmed_bookings)
    }), 200


# =========================================================
# COMPLETED BOOKINGS
# =========================================================

@admin_bp.route(
    "/completed_bookings/<int:target_id>",
    methods=["GET"]
)
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
        "completed_bookings":
            int(completed_bookings)
    }), 200


# =========================================================
# CANCELLED BOOKINGS
# =========================================================

@admin_bp.route(
    "/cancelled_bookings/<int:target_id>",
    methods=["GET"]
)
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
        "cancelled_bookings":
            int(cancelled_bookings)
    }), 200


# =========================================================
# EXPIRED BOOKINGS
# =========================================================

@admin_bp.route(
    "/expired_bookings/<int:target_id>",
    methods=["GET"]
)
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
        "expired_bookings":
            int(expired_bookings)
    }), 200


# =========================================================
# BOOKING COMPLETION RATE
# =========================================================

@admin_bp.route(
    "/completion_rate/<int:target_id>",
    methods=["GET"]
)
@jwt_required()
@roles_required("admin")
def get_booking_completion_rate(target_id):

    target = RevenueTarget.query.get(target_id)

    if not target:
        return jsonify({
            "message": "Target not found."
        }), 404

    end_datetime = target.end_date + timedelta(days=1)

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
        completion_rate = 0

    else:
        completion_rate = (
            completed_bookings
            / total_bookings
        ) * 100

    return jsonify({
        "completed_bookings":
            int(completed_bookings),

        "total_bookings":
            int(total_bookings),

        "completion_rate":
            round(
                float(completion_rate),
                2
            )
    }), 200


# =========================================================
# CANCELLATION RATE
# =========================================================

@admin_bp.route(
    "/cancellation_rate/<int:target_id>",
    methods=["GET"]
)
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
        cancellation_rate = (
            cancelled_bookings
            / total_bookings
        ) * 100

    return jsonify({
        "cancellation_rate":
            round(
                float(cancellation_rate),
                2
            ),

        "cancelled_bookings":
            int(cancelled_bookings),

        "total_bookings":
            int(total_bookings)
    }), 200


# =========================================================
# AVERAGE BOOKING SIZE
# =========================================================

@admin_bp.route(
    "/average_size/<int:target_id>",
    methods=["GET"]
)
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
        db.func.sum(
            Booking.number_of_people
        )
    ).join(
        Departure,
        Booking.departure_id == Departure.id
    ).filter(
        Departure.end_date >= target.start_date,
        Departure.end_date < end_datetime
    ).scalar()

    total_customers = total_customers or 0

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
        average_booking_size = (
            total_customers
            / total_bookings
        )

    return jsonify({
        "average_booking_size":
            round(
                float(average_booking_size),
                2
            ),

        "total_customers":
            int(total_customers),

        "total_bookings":
            int(total_bookings)

    }), 200


# =========================================================
# AVERAGE REVENUE
# =========================================================

@admin_bp.route(
    "/average_revenue/<int:target_id>",
    methods=["GET"]
)
@jwt_required()
@roles_required("admin")
def get_average_revenue(target_id):

    target = RevenueTarget.query.get(target_id)

    if not target:
        return jsonify({
            "message": "Target not found."
        }), 404

    end_datetime = target.end_date + timedelta(days=1)

    total_successful_payments = db.session.query(
        db.func.sum(Payment.amount)
    ).filter(
        Payment.status == "successful",
        Payment.paid_at >= target.start_date,
        Payment.paid_at < end_datetime
    ).scalar()

    paid_booking_ids = db.session.query(
        Payment.booking_id
    ).filter(
        Payment.status == "successful",
        Payment.paid_at >= target.start_date,
        Payment.paid_at < end_datetime
    ).subquery()

    total_successful_refunds = db.session.query(
        db.func.sum(Refund.amount)
    ).join(
        Payment,
        Refund.payment_id == Payment.id
    ).filter(
        Refund.status == "successful",
        Payment.booking_id.in_(
            paid_booking_ids
        )
    ).scalar()

    total_successful_payments = (
        total_successful_payments
        or Decimal("0.00")
    )

    total_successful_refunds = (
        total_successful_refunds
        or Decimal("0.00")
    )

    actual_revenue = (
        total_successful_payments
        - total_successful_refunds
    )

    total_successful_bookings = db.session.query(
        db.func.count(
            db.distinct(
                Payment.booking_id
            )
        )
    ).filter(
        Payment.status == "successful",
        Payment.paid_at >= target.start_date,
        Payment.paid_at < end_datetime
    ).scalar()

    if total_successful_bookings == 0:

        average_revenue_per_booking = 0

        revenue_message = (
            "Average revenue cannot be calculated "
            "because there were no successful paid "
            "bookings in this period."
        )

    else:

        average_revenue_per_booking = (
            actual_revenue
            / total_successful_bookings
        )

        revenue_message = (
            "Average revenue calculated successfully."
        )

    return jsonify({

        "average_revenue_per_booking":
            round(
                float(
                    average_revenue_per_booking
                ),
                2
            ),

        "total_successful_bookings":
            total_successful_bookings,

        "actual_revenue":
            float(actual_revenue),

        "message":
            revenue_message

    }), 200


# =========================================================
# TOP REVENUE TOUR
# =========================================================

@admin_bp.route(
    "/top_revenue/<int:target_id>",
    methods=["GET"]
)
@jwt_required()
@roles_required("admin")
def get_top_revenue(target_id):

    target = RevenueTarget.query.get(target_id)

    if not target:
        return jsonify({
            "message": "Target not found."
        }), 404

    end_datetime = target.end_date + timedelta(days=1)

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

    refunds_by_tour = {
        tour_id: refund_amount
        for tour_id, refund_amount in total_refunds
    }

    payments_by_tour = {
        tour_id: payment_amount
        for tour_id, payment_amount in total_payments
    }

    actual_revenue_by_tour = {}

    for tour_id, payment_amount in payments_by_tour.items():

        refund_amount = refunds_by_tour.get(
            tour_id,
            0
        )

        actual_revenue_by_tour[tour_id] = (
            payment_amount
            - refund_amount
        )

    if not actual_revenue_by_tour:

        return jsonify({
            "message":
                "No revenue generated during that target period."
        }), 200

    top_tour_id = max(
        actual_revenue_by_tour,
        key=actual_revenue_by_tour.get
    )

    top_revenue = \
        actual_revenue_by_tour[top_tour_id]

    top_tour = Tour.query.get(
        top_tour_id
    )

    if not top_tour:

        return jsonify({
            "message":
                "Tour not found."
        }), 404

    return jsonify({

        "tour_id":
            top_tour.id,

        "tour_name":
            top_tour.tour_name,

        "actual_revenue":
            float(top_revenue)

    }), 200


# =========================================================
# REVENUE PER CUSTOMER
# =========================================================

@admin_bp.route(
    "/customer_revenue/<int:target_id>",
    methods=["GET"]
)
@jwt_required()
@roles_required("admin")
def get_revenue_per_customer(target_id):

    target = RevenueTarget.query.get(target_id)

    if not target:

        return jsonify({
            "message":
                "Target not found."
        }), 404

    end_datetime = target.end_date + timedelta(days=1)

    total_customers = db.session.query(
        db.func.sum(
            Booking.number_of_people
        )
    ).join(
        Departure,
        Booking.departure_id == Departure.id
    ).filter(
        Booking.status == "completed",
        Departure.end_date >= target.start_date,
        Departure.end_date < end_datetime
    ).scalar()

    total_customers = total_customers or 0

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

    successful_payments = (
        successful_payments
        or Decimal("0.00")
    )

    successful_refunds = (
        successful_refunds
        or Decimal("0.00")
    )

    actual_revenue = (
        successful_payments
        - successful_refunds
    )

    if total_customers == 0:

        revenue_per_customer = 0

    else:

        revenue_per_customer = (
            actual_revenue
            / total_customers
        )

    return jsonify({

        "total_customers":
            int(total_customers),

        "actual_revenue":
            float(actual_revenue),

        "revenue_per_customer":
            round(
                float(
                    revenue_per_customer
                ),
                2
            )

    }), 200


# =========================================================
# CUSTOMER RETENTION
# =========================================================

@admin_bp.route(
    "/customer_booking/<int:target_id>",
    methods=["GET"]
)
@jwt_required()
@roles_required("admin")
def get_customer_retention(target_id):

    target = RevenueTarget.query.get(target_id)

    if not target:

        return jsonify({
            "message":
                "Target not found."
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

    total_unique_customers = len(
        completed_bookings_per_customer
    )

    repeat_customers = 0

    for user_id, completed_trips in \
            completed_bookings_per_customer:

        if completed_trips >= 2:

            repeat_customers += 1

    if total_unique_customers == 0:

        repeat_booking_rate = 0

    else:

        repeat_booking_rate = (
            repeat_customers
            / total_unique_customers
        ) * 100

    return jsonify({

        "repeat_booking_rate":
            round(
                float(
                    repeat_booking_rate
                ),
                2
            ),

        "repeat_customers":
            int(repeat_customers),

        "total_unique_customers":
            int(total_unique_customers)

    }), 200


# =========================================================
# OCCUPANCY RATE
# =========================================================

@admin_bp.route(
    "/occupancy_rate/<int:target_id>",
    methods=["GET"]
)
@jwt_required()
@roles_required("admin")
def get_occupancy_rate(target_id):

    target = RevenueTarget.query.get(target_id)

    if not target:

        return jsonify({
            "message":
                "Target not found."
        }), 404

    end_datetime = target.end_date + timedelta(days=1)

    total_customers = db.session.query(
        db.func.sum(
            Booking.number_of_people
        )
    ).join(
        Departure,
        Booking.departure_id == Departure.id
    ).filter(
        Booking.status.in_(
            ["completed", "confirmed"]
        ),
        Departure.end_date >= target.start_date,
        Departure.end_date < end_datetime
    ).scalar()

    total_customers = total_customers or 0

    total_capacity = db.session.query(
        db.func.sum(
            Departure.capacity
        )
    ).filter(
        Departure.end_date >= target.start_date,
        Departure.end_date < end_datetime
    ).scalar()

    total_capacity = total_capacity or 0

    if total_capacity == 0:

        occupancy_rate = 0

    else:

        occupancy_rate = (
            total_customers
            / total_capacity
        ) * 100

    return jsonify({

        "occupancy_rate":
            round(
                float(
                    occupancy_rate
                ),
                2
            ),

        "total_customers":
            int(total_customers),

        "total_capacity":
            int(total_capacity)

    }), 200


# =========================================================
# BOOKING GROWTH RATE
# =========================================================

@admin_bp.route(
    "/booking_growth/<int:target_id>",
    methods=["GET"]
)
@jwt_required()
@roles_required("admin")
def get_growth_rate(target_id):

    target = RevenueTarget.query.get(target_id)

    if not target:

        return jsonify({
            "message":
                "Target not found."
        }), 404

    end_datetime = target.end_date + timedelta(days=1)

    current_bookings = db.session.query(
        db.func.count(Booking.id)
    ).join(
        Departure,
        Booking.departure_id == Departure.id
    ).filter(
        Booking.status.in_(
            ["completed", "confirmed"]
        ),
        Departure.end_date >= target.start_date,
        Departure.end_date < end_datetime
    ).scalar()

    current_bookings = current_bookings or 0

    target_duration = (
        target.end_date
        - target.start_date
        + timedelta(days=1)
    )

    previous_startdate = (
        target.start_date
        - target_duration
    )

    previous_enddate = target.start_date

    previous_bookings = db.session.query(
        db.func.count(Booking.id)
    ).join(
        Departure,
        Booking.departure_id == Departure.id
    ).filter(
        Booking.status.in_(
            ["completed", "confirmed"]
        ),
        Departure.end_date >= previous_startdate,
        Departure.end_date < previous_enddate
    ).scalar()

    previous_bookings = previous_bookings or 0

    if previous_bookings == 0:

        booking_growth_rate = None

        growth_message = (
            "Growth rate cannot be calculated because "
            "the previous period had zero bookings; "
            "percentage growth from a zero baseline is undefined."
        )

    else:

        booking_growth_rate = (
            (
                current_bookings
                - previous_bookings
            )
            / previous_bookings
        ) * 100

        growth_message = (
            "Growth rate calculated successfully."
        )

    return jsonify({

        "booking_growth_rate":
            booking_growth_rate,

        "current_bookings":
            int(current_bookings),

        "previous_bookings":
            int(previous_bookings),

        "message":
            growth_message

    }), 200


# =========================================================
# CUSTOMER GROWTH RATE
# =========================================================

@admin_bp.route(
    "/customer_growth/<int:target_id>",
    methods=["GET"]
)
@jwt_required()
@roles_required("admin")
def get_customer_growth_rate(target_id):

    target = RevenueTarget.query.get(target_id)

    if not target:

        return jsonify({
            "message":
                "Target not found."
        }), 404

    end_datetime = target.end_date + timedelta(days=1)

    current_customers = db.session.query(
        db.func.count(
            db.distinct(
                Booking.user_id
            )
        )
    ).join(
        Departure,
        Booking.departure_id == Departure.id
    ).filter(
        Booking.status.in_(
            ["completed", "confirmed"]
        ),
        Departure.end_date >= target.start_date,
        Departure.end_date < end_datetime
    ).scalar()

    current_customers = current_customers or 0

    target_duration = (
        target.end_date
        - target.start_date
        + timedelta(days=1)
    )

    previous_startdate = (
        target.start_date
        - target_duration
    )

    previous_enddate = target.start_date

    previous_customers = db.session.query(
        db.func.count(
            db.distinct(
                Booking.user_id
            )
        )
    ).join(
        Departure,
        Booking.departure_id == Departure.id
    ).filter(
        Booking.status.in_(
            ["completed", "confirmed"]
        ),
        Departure.end_date >= previous_startdate,
        Departure.end_date < previous_enddate
    ).scalar()

    previous_customers = previous_customers or 0

    if previous_customers == 0:

        customer_growth_rate = None

        growth_message = (
            "Growth rate cannot be calculated because "
            "the previous period had zero customers; "
            "percentage growth from a zero baseline is undefined."
        )

    else:

        customer_growth_rate = (
            (
                current_customers
                - previous_customers
            )
            / previous_customers
        ) * 100

        growth_message = (
            "Growth rate calculated successfully."
        )

    return jsonify({

        "customer_growth_rate":
            customer_growth_rate,

        "current_customers":
            int(current_customers),

        "previous_customers":
            int(previous_customers),

        "message":
            growth_message

    }), 200


# =========================================================
# AVERAGE TRIP DURATION
# =========================================================

@admin_bp.route(
    "/average_trip/<int:target_id>",
    methods=["GET"]
)
@jwt_required()
@roles_required("admin")
def get_average_trip_duration(target_id):

    target = RevenueTarget.query.get(target_id)

    if not target:

        return jsonify({
            "message":
                "Target not found."
        }), 404

    end_datetime = target.end_date + timedelta(days=1)

    unique_departures = db.session.query(
        Departure.id
    ).join(
        Booking,
        Booking.departure_id == Departure.id
    ).filter(
        Booking.status == "completed",
        Departure.end_date >= target.start_date,
        Departure.end_date < end_datetime
    ).distinct().subquery()

    average_trip_duration = db.session.query(
        db.func.avg(
            db.func.datediff(
                Departure.end_date,
                Departure.start_date
            ) + 1
        )
    ).join(
        unique_departures,
        Departure.id == unique_departures.c.id
    ).scalar()

    average_trip_duration = (
        average_trip_duration or 0
    )

    return jsonify({

        "average_trip_duration":
            round(
                float(
                    average_trip_duration
                ),
                2
            )

    }), 200


# =========================================================
# REVENUE PER TOUR
# =========================================================

@admin_bp.route(
    "/revenue_tour/<int:target_id>",
    methods=["GET"]
)
@jwt_required()
@roles_required("admin")
def get_revenue_per_tour(target_id):

    target = RevenueTarget.query.get(target_id)

    if not target:

        return jsonify({
            "message":
                "Target not found."
        }), 404

    end_datetime = target.end_date + timedelta(days=1)

    successful_payments = db.session.query(
        Departure.tour_id,
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
        Departure.end_date >= target.start_date,
        Departure.end_date < end_datetime
    ).all()

    successful_refunds = db.session.query(
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
    ).group_by(
        Departure.tour_id
    ).filter(
        Refund.status == "successful",
        Refund.refunded_at >= target.start_date,
        Refund.refunded_at < end_datetime,
        Departure.end_date >= target.start_date,
        Departure.end_date < end_datetime
    ).all()

    payments_by_tour = {
        tour_id: payment_amount
        for tour_id, payment_amount
        in successful_payments
    }

    refunds_by_tour = {
        tour_id: refund_amount
        for tour_id, refund_amount
        in successful_refunds
    }

    actual_revenue_by_tour = {}

    for tour_id, payment_amount in \
            payments_by_tour.items():

        refund_amount = refunds_by_tour.get(
            tour_id,
            0
        )

        actual_revenue_by_tour[tour_id] = (
            payment_amount
            - refund_amount
        )

    revenue_per_tour = []

    for tour_id, actual_revenue in \
            actual_revenue_by_tour.items():

        tour = Tour.query.get(tour_id)

        if not tour:

            return jsonify({
                "message":
                    "Tour not found."
            }), 404

        revenue_per_tour.append({

            "tour_id":
                tour.id,

            "tour_name":
                tour.tour_name,

            "actual_revenue":
                float(actual_revenue)

        })

    return jsonify({

        "revenue_per_tour":
            revenue_per_tour

    }), 200