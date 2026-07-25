# define common fields shared by data models
#create unique id, store created and updated timestamps


from datetime import datetime
from extensions import db

#parent model for all database tables

#every table will inherit id, created_at and updated_at


class BaseModel(db.Model):
    #this is to ensure a table with the below is not created
    __abstract__ = True
    #primary key
    id = db.Column(
        db.Integer,
        primary_key=True
    )

    #create time

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    #update time

    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

