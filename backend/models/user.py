#stores user information
#authentication processes
#differentiate user roles

#import sqlalchemy database instance
from extensions import db
#import parent model
from models.base_model import BaseModel

class User(BaseModel):
    #table name
    __tablename__ = "users"

    #personal information
    first_name = db.Column(
        db.String(100),
        nullable=False # this means you have to input
    )

    last_name = db.Column(
        db.String(100),
        nullable=False 
    )

    password = db.Column(
        db.String(255),
        nullable=False
    )

    email = db.Column(
        db.String(200),
        unique=True, #each person has a unique password
        nullable=False
    )

    phone_number = db.Column(
        db.String(20),
        nullable=True #this means you do not have to input it.
    )

    role = db.Column(
        db.String(50),
        default="customer"
    )

    is_active = db.Column(
        db.Boolean,
        default=True
    )