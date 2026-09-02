from extensions import db
from models.base_model import BaseModel


class Tour(BaseModel):
    __tablename__ = "tours"

    tour_name = db.Column(
        db.String(100),
        nullable=False
    )

    tour_operator_id = db.Column(
        db.Integer,
        #The id number must exist in the user table
        db.ForeignKey("users.id"), # foreign key links two tables(user and tour)
        nullable=False
    )

    charges = db.Column(
        db.Numeric(10, 2), # 10,2 means 10 is maximum total digits and 2 is the number of decimals after the digits.
        nullable = True
    )

    destination = db.Column(
        db.String(200),
        nullable = False
    )

    is_active = db.Column(
        db.Boolean,
        default=True
    )

    #every user has many tours(one-to-many r/ship) a tour can access it's operator
    operator = db.relationship(
        "User",
        back_populates="tours"
    )

    departures = db.relationship(
        "Departure",
        back_populates="tour",
        lazy=True
    )


