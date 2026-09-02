from models.base_model import BaseModel
from extensions import db

class Booking(BaseModel):

    __tablename__= "bookings"

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False
    )

    departure_id = db.Column(
        db.Integer,
        db.ForeignKey("departures.id"),
        nullable=False
    )

    price_per_person = db.Column(
        db.Numeric(10, 2),
        nullable=False
    )

    number_of_people = db.Column(
        db.Integer,
        nullable=False
    )

    #to ensure that the number of people is greater than 0
    __table_args__ =(
        db.CheckConstraint(
            "number_of_people > 0",
            name="check_positive_number_of_people"
        ),
    )

    status = db.Column(
        db.Enum("pending", "confirmed", "cancelled", "expired", "completed"),
        nullable=False,
        default="pending"
    )

    total_price = db.Column(
        db.Numeric(10, 2),
        nullable=False
    )

    expires_at = db.Column(
        db.DateTime,
        nullable=True
    )

    user = db.relationship(
        "User",
        back_populates="bookings"
    )

    departure = db.relationship(
        "Departure",
        back_populates="bookings"
    )

    payments = db.relationship(
        "Payment",
        back_populates = "booking"
    )

    