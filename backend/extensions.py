#create flask extensions

#create JWT manager
#create Socketio services
#create migration manager
#create database instances 
#create mail services


#database ORM
from flask_sqlalchemy import SQLAlchemy

#migration tools
from flask_migrate import Migrate

#hash password
from flask_bcrypt import Bcrypt

#JWT authentication
from flask_jwt_extended import JWTManager

#support email
from flask_mail import Mail

#support real-time communication
from flask_socketio import SocketIO

#support frontend communication

from flask_cors import CORS

db = SQLAlchemy()
migrate= Migrate()
jwt = JWTManager()
mail = Mail()
bcrypt = Bcrypt()
socketio = SocketIO()
cors = CORS()


