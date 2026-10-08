# =========================================================
# THAFARI FLASK EXTENSIONS
# =========================================================
#
# Centralized extension instances used by the Flask
# application.
#
# Keeping extension objects here avoids circular imports
# and ensures the same instances are used throughout
# Thafari.
# =========================================================


# =========================================================
# DATABASE
# =========================================================

from flask_sqlalchemy import SQLAlchemy


# =========================================================
# DATABASE MIGRATIONS
# =========================================================

from flask_migrate import Migrate


# =========================================================
# PASSWORD HASHING
# =========================================================

from flask_bcrypt import Bcrypt


# =========================================================
# JWT AUTHENTICATION
# =========================================================

from flask_jwt_extended import JWTManager


# =========================================================
# EMAIL
# =========================================================

from flask_mail import Mail


# =========================================================
# SOCKET.IO
# =========================================================

from flask_socketio import SocketIO


# =========================================================
# CORS
# =========================================================

from flask_cors import CORS


# =========================================================
# RATE LIMITING
# =========================================================

from flask_limiter import Limiter

from flask_limiter.util import get_remote_address


# =========================================================
# EXTENSION INSTANCES
# =========================================================

db = SQLAlchemy()

migrate = Migrate()

jwt = JWTManager()

mail = Mail()

bcrypt = Bcrypt()

socketio = SocketIO()

cors = CORS()


# =========================================================
# SHARED RATE LIMITER
# =========================================================
#
# This is the ONE limiter used by the entire Thafari
# application.
#
# app.py initializes this limiter with the Flask app.
#
# Individual route files can then apply stricter limits,
# for example:
#
#     @limiter.limit("5 per minute")
#
# This prevents each route from accidentally creating
# its own separate rate-limiter instance.
#
# The default key is the requesting client's IP address.
# =========================================================

limiter = Limiter(
    key_func=get_remote_address
)