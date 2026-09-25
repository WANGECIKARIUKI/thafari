"""app.py file
purpose: create and configure the flask application
responsibilities:
1. create the flask application
2. load application configurations
3. initialize extensions
4. register application routes
"""


# create the flask application
# flask - framework to build backend

from flask import Flask
from config.config import Config

from routes.auth import auth_bp
from routes.bookings import booking_bp
from routes.tours import tour_bp
from routes.departures import departure_bp
from routes.payments import payment_bp
from routes.admin import admin_bp
from routes.refund import refund_bp
from routes.messages import message_bp
from routes.notifications import notification_bp
from routes.tour_package import tour_package_bp

from sockets import messaging

from extensions import (
    db,
    migrate,
    socketio,
    mail,
    jwt,
    bcrypt,
    cors
)

from services.scheduler_service import start_scheduler

from services.jwt_service import configure_jwt_callbacks

import models


# function to create and configure the flask application
def create_app():

    # create the flask application
    # name is used to help Flask locate project resources

    app = Flask(__name__)

    # load all application configuration settings
    app.config.from_object(Config)

    # connect the extensions to the Flask app
    db.init_app(app)
    jwt.init_app(app)

    # Configure JWT security callbacks.
    configure_jwt_callbacks(jwt)
    
    mail.init_app(app)
    socketio.init_app(app)
    bcrypt.init_app(app)
    cors.init_app(app)
    migrate.init_app(app, db)

    # register authentication endpoint
    app.register_blueprint(
        auth_bp,
        url_prefix="/api/auth"
    )

    # register tour blueprint
    app.register_blueprint(
        tour_bp
    )

    # register booking blueprint
    app.register_blueprint(
        booking_bp
    )

    # register departure blueprint
    app.register_blueprint(
        departure_bp
    )

    # register payments blueprint
    app.register_blueprint(
        payment_bp
    )

    # register admin blueprint
    app.register_blueprint(
        admin_bp
    )

    # register refund blueprint
    app.register_blueprint(
        refund_bp
    )

    # register messaging blueprint
    app.register_blueprint(
        message_bp
    )

    # register notification blueprint
    app.register_blueprint(
        notification_bp
    )

    #register tour package blueprint
    app.register_blueprint(
        tour_package_bp
    )

    # Start the background scheduler.
    #
    # The scheduler runs jobs that are not triggered
    # directly by an HTTP request.
    start_scheduler(app)

    # return the completed Flask application
    return app