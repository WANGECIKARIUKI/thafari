"""app.py file
purpose: create and configure the flask application
responsibilities: 1. create the flask application.  2. load application configurations.  3. initialize extensions.  4. register application routes.
"""


# create the flask application
# flask- framework to build backend
#import the Flask class
#import config class
from flask import Flask
from config.config import Config
from routes.auth import auth_bp
from extensions import (db, migrate, socketio, mail, jwt, bcrypt, cors)
import models

#function to create and configure the flask application
def create_app():

    #create the flask application
    #name is used to help flask locate project resources

    app = Flask(__name__)
    #load all applications for the config settings
    app.config.from_object(Config)

    #connect the extensions to the flask app
    db.init_app(app)
    jwt.init_app(app)
    mail.init_app(app)
    socketio.init_app(app)
    bcrypt.init_app(app)
    cors.init_app(app)
    migrate.init_app(app, db) # has db to know which database it is managing
    #register authentication endpoint
    app.register_blueprint(
        auth_bp,
        url_prefix="/api/auth"
    )


#return the completed flask application
    return app 

