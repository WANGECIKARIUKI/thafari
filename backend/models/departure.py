from models.base_model import BaseModel
from extensions import db



class Departure(BaseModel):
    __tablename__ = "departures"

    tour_id = db.Column(
        db.Integer,
        db.ForeignKey("tours.id"),
        nullable=False
    )

    capacity =  db.Column(
        db.Integer,
        nullable=False
    )

    start_date = db.Column(
        db.Date,
        nullable=False
    )

    end_date = db.Column(
        db.Date,
        nullable=False
    )

    is_active = db.Column(
        db.Boolean,
        default=True,
        nullable=False
    )

    price_per_person = db.Column(
        db.Numeric(10, 2),
        nullable=False
    )

    __table_args__ = (
        db.CheckConstraint(
            "capacity > 0",
            name="check_positive_departure_capacity"
        ),

        db.CheckConstraint(
            "end_date >= start_date",
            name="check_valid_departure_dates"
        )
    )

    tour = db.relationship(
        "Tour",
        back_populates="departures"
    )

    bookings = db.relationship(
        "Booking",
        back_populates="departure"
    )

   