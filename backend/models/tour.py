from extensions import db
from datetime import datetime
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
        db.Numeric(10, 2),
        nullable = True
    )

    destination = db.Column(
        db.String(200),
        nullable = False
    )

    departure_date = db.Column(
        db.DateTime,
        nullable=False
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


