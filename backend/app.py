"""
app.py file
purpose: create and configure the flask application
responsibilities:
1. create the flask application
2. load application configurations
3. initialize extensions
4. register application routes
"""


# create the flask application
# flask - framework to build backend

from flask import Flask, jsonify, request, g
import os
import time


from config.config import Config


# =========================================================
# APPLICATION ROUTES
# =========================================================

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
from routes.services import service_bp
from routes.contact import contact_bp
from routes.reviews import review_bp
from routes.chatbot import chatbot_bp
from routes.guest_inquiries import guest_inquiry_bp


# =========================================================
# SOCKETS
# =========================================================

from sockets import messaging


# =========================================================
# FLASK EXTENSIONS
# =========================================================
#
# The rate limiter is imported from extensions.py so the
# entire application uses ONE shared limiter instance.
#
# This is important because individual route files such as
# auth.py will use the same limiter object.
# =========================================================

from extensions import (
    db,
    migrate,
    socketio,
    mail,
    jwt,
    bcrypt,
    cors,
    limiter
)


# =========================================================
# SERVICES
# =========================================================

from services.scheduler_service import start_scheduler

from services.jwt_service import configure_jwt_callbacks


# =========================================================
# MODELS
# =========================================================

import models


# =========================================================
# CREATE AND CONFIGURE APPLICATION
# =========================================================

def create_app():

    # -----------------------------------------------------
    # CREATE FLASK APPLICATION
    # -----------------------------------------------------
    #
    # name is used to help Flask locate project resources.
    # -----------------------------------------------------

    app = Flask(__name__)


    # -----------------------------------------------------
    # LOAD APPLICATION CONFIGURATION
    # -----------------------------------------------------

    app.config.from_object(Config)

    # -----------------------------------------------------
    # TEMPORARY REQUEST TIMING DIAGNOSTICS
    # -----------------------------------------------------
    # Measure time spent inside Flask for API requests.
    # Do not log query strings, headers, cookies, or bodies.
    # Remove this block after the production investigation.
    # -----------------------------------------------------

    @app.before_request
    def _start_api_request_timer():
        if request.path.startswith("/api/"):
            g._api_request_started_at = time.perf_counter()

    @app.after_request
    def _log_api_request_duration(response):
        started_at = getattr(g, "_api_request_started_at", None)

        if started_at is not None:
            duration_ms = (time.perf_counter() - started_at) * 1000
            endpoint = request.endpoint or "unmatched"
            app.logger.info(
                "API_TIMING method=%s endpoint=%s status=%s duration_ms=%.2f",
                request.method,
                endpoint,
                response.status_code,
                duration_ms,
            )

        return response


    # =========================================================
    # RATE LIMITING
    # =========================================================
    #
    # Rate limiting protects Thafari from excessive automated
    # requests such as:
    #
    # - brute-force login attempts
    # - registration abuse
    # - password-reset abuse
    # - automated API abuse
    # - excessive request traffic
    #
    # The limiter instance itself is created centrally in
    # extensions.py.
    #
    # This app configuration controls the limiter's storage,
    # strategy and baseline limits.
    #
    # LOCAL DEVELOPMENT
    # -----------------
    # If RATELIMIT_STORAGE_URI is not configured, Thafari
    # uses the in-memory backend.
    #
    # PRODUCTION
    # ----------
    # Production should provide a shared Redis URL through:
    #
    #     RATELIMIT_STORAGE_URI=redis://...
    #
    # A shared storage backend is important when Thafari runs
    # across multiple workers or application instances because
    # rate-limit counters must be shared between them.
    #
    # Sensitive authentication endpoints will receive stricter
    # route-specific limits in routes/auth.py.
    # =========================================================


    # -----------------------------------------------------
    # RATE LIMIT STORAGE
    # -----------------------------------------------------

    app.config["RATELIMIT_STORAGE_URI"] = os.getenv(
        "RATELIMIT_STORAGE_URI",
        "memory://"
    )


    # -----------------------------------------------------
    # RATE LIMIT STRATEGY
    # -----------------------------------------------------

    app.config["RATELIMIT_STRATEGY"] = os.getenv(
        "RATELIMIT_STRATEGY",
        "fixed-window"
    )


    # -----------------------------------------------------
    # DEFAULT PER-ROUTE LIMIT
    # -----------------------------------------------------
    #
    # This is the baseline applied to routes which do not
    # define their own stricter limit.
    # -----------------------------------------------------

    app.config["RATELIMIT_DEFAULT"] = (
        "300 per minute"
    )


    # -----------------------------------------------------
    # APPLICATION-WIDE LIMIT
    # -----------------------------------------------------
    #
    # This is an additional overall application protection
    # layer.
    # -----------------------------------------------------

    app.config["RATELIMIT_APPLICATION"] = (
        "600 per minute"
    )


    # -----------------------------------------------------
    # RATE LIMIT RESPONSE HEADERS
    # -----------------------------------------------------
    #
    # Lets clients receive rate-limit information in response
    # headers where supported by Flask-Limiter.
    # -----------------------------------------------------

    app.config["RATELIMIT_HEADERS_ENABLED"] = True


    # -----------------------------------------------------
    # INITIALIZE THE SHARED LIMITER
    # -----------------------------------------------------

    limiter.init_app(app)


    # =========================================================
    # RATE LIMIT EXCEEDED RESPONSE
    # =========================================================
    #
    # Flask-Limiter returns HTTP 429 when a configured rate
    # limit is exceeded.
    #
    # Since Thafari is an API backend, return JSON instead of
    # an HTML error page.
    # =========================================================

    @app.errorhandler(429)
    def handle_rate_limit_exceeded(error):

        return jsonify({
            "message": (
                "Too many requests. "
                "Please wait a moment and try again."
            )
        }), 429


    # =========================================================
    # INITIALIZE APPLICATION EXTENSIONS
    # =========================================================

    # Database
    db.init_app(app)


    # JWT authentication
    jwt.init_app(app)


    # Configure JWT security callbacks.
    configure_jwt_callbacks(jwt)


    # Email
    mail.init_app(app)


    # Password hashing
    bcrypt.init_app(app)


    # Database migrations
    migrate.init_app(app, db)


    # =========================================================
    # CORS SECURITY
    # =========================================================
    #
    # Authentication now uses HttpOnly cookies.
    #
    # The React frontend and Flask backend run on different
    # origins during local development and in production.
    #
    # Credentialed requests therefore need explicit CORS
    # configuration.
    #
    # IMPORTANT:
    # We do NOT use "*".
    #
    # Wildcard origins cannot be used with credentials.
    # =========================================================

    frontend_url = (
        app.config.get("FRONTEND_URL") or ""
    ).rstrip("/")


    allowed_origins = [

        # Vite may use either port when running locally.
        "http://localhost:5173",
        "http://localhost:5174"

    ]


    if (
        frontend_url
        and frontend_url not in allowed_origins
    ):

        allowed_origins.append(
            frontend_url
        )


    # =========================================================
    # FLASK HTTP / API CORS
    # =========================================================

    cors.init_app(
        app,

        resources={
            r"/api/*": {
                "origins": allowed_origins
            }
        },

        supports_credentials=True
    )


    # =========================================================
    # SOCKET.IO CORS
    # =========================================================
    #
    # Credentials are enabled because Socket.IO authentication
    # uses the HttpOnly access cookie.
    # =========================================================

    socketio.init_app(
        app,

        cors_allowed_origins=allowed_origins,

        cors_credentials=True
    )


    # =========================================================
    # REGISTER AUTHENTICATION BLUEPRINT
    # =========================================================

    app.register_blueprint(
        auth_bp,
        url_prefix="/api/auth"
    )


    # =========================================================
    # REGISTER TOUR BLUEPRINT
    # =========================================================

    app.register_blueprint(
        tour_bp
    )


    # =========================================================
    # REGISTER BOOKING BLUEPRINT
    # =========================================================

    app.register_blueprint(
        booking_bp
    )


    # =========================================================
    # REGISTER DEPARTURE BLUEPRINT
    # =========================================================

    app.register_blueprint(
        departure_bp
    )


    # =========================================================
    # REGISTER PAYMENT BLUEPRINT
    # =========================================================

    app.register_blueprint(
        payment_bp
    )


    # =========================================================
    # REGISTER ADMIN BLUEPRINT
    # =========================================================

    app.register_blueprint(
        admin_bp
    )


    # =========================================================
    # REGISTER REFUND BLUEPRINT
    # =========================================================

    app.register_blueprint(
        refund_bp
    )


    # =========================================================
    # REGISTER MESSAGING BLUEPRINT
    # =========================================================

    app.register_blueprint(
        message_bp
    )


    # =========================================================
    # REGISTER NOTIFICATION BLUEPRINT
    # =========================================================

    app.register_blueprint(
        notification_bp
    )


    # =========================================================
    # REGISTER TOUR PACKAGE BLUEPRINT
    # =========================================================

    app.register_blueprint(
        tour_package_bp
    )


    # =========================================================
    # REGISTER SERVICES BLUEPRINT
    # =========================================================

    app.register_blueprint(
        service_bp
    )


    # =========================================================
    # REGISTER CONTACT BLUEPRINT
    # =========================================================

    app.register_blueprint(
        contact_bp
    )


    # =========================================================
    # REGISTER REVIEWS BLUEPRINT
    # =========================================================

    app.register_blueprint(
        review_bp
    )


    # =========================================================
    # REGISTER CHATBOT BLUEPRINT
    # =========================================================

    app.register_blueprint(
        chatbot_bp
    )


    # =========================================================
    # REGISTER GUEST INQUIRY BLUEPRINT
    # =========================================================

    app.register_blueprint(
        guest_inquiry_bp
    )


    # =========================================================
    # START BACKGROUND SCHEDULER
    # =========================================================
    #
    # The scheduler runs jobs that are not triggered
    # directly by an HTTP request.
    # =========================================================

    start_scheduler(app)


    # =========================================================
    # RETURN COMPLETED FLASK APPLICATION
    # =========================================================

    return app