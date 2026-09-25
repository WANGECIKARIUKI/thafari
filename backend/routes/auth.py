# =========================================================
# THAFARI AUTHENTICATION ROUTES
# =========================================================
#
# This file handles:
#
# 1. User registration
# 2. User login
# 3. Changing passwords
# 4. Forgot password
# 5. Reset password
# 6. Refreshing access tokens
# 7. Logging out
# 8. Retrieving the currently authenticated user
#
# Authentication answers:
# "Who are you?"
#
# Authorization is handled separately through roles_required
# where an endpoint needs a specific role.
# =========================================================


# ---------------------------------------------------------
# STANDARD LIBRARY IMPORTS
# ---------------------------------------------------------

from datetime import datetime, timedelta
import hashlib
import re
import secrets


# ---------------------------------------------------------
# FLASK IMPORTS
# ---------------------------------------------------------

from flask import (
    Blueprint,
    request,
    jsonify,
    current_app
)


# ---------------------------------------------------------
# JWT IMPORTS
# ---------------------------------------------------------

from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    jwt_required,
    get_jwt_identity,
    get_jwt,
    decode_token
)


# ---------------------------------------------------------
# SQLAlchemy IMPORTS
# ---------------------------------------------------------

from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError


# ---------------------------------------------------------
# PROJECT IMPORTS
# ---------------------------------------------------------

from extensions import db

from models.user import User

from models.revoked_token import RevokedToken

from models.password_reset_token import PasswordResetToken

from services.email_service import send_email


# ---------------------------------------------------------
# BLUEPRINT
# ---------------------------------------------------------

auth_bp = Blueprint(
    "auth",
    __name__
)


# =========================================================
# PASSWORD VALIDATION HELPER
# =========================================================

def validate_password(password):
    """
    Validate the minimum password requirements.

    Thafari requires:

    - At least 8 characters
    - At least one letter
    - At least one number

    This does not enforce an unnecessarily complicated
    password policy, but prevents extremely weak passwords.
    """

    if len(password) < 8:
        return False

    if not re.search(r"[A-Za-z]", password):
        return False

    if not re.search(r"\d", password):
        return False

    return True


# =========================================================
# REGISTER
# =========================================================

@auth_bp.route("/register", methods=["POST"])
def register():

    # -----------------------------------------------------
    # RECEIVE DATA
    # -----------------------------------------------------

    data = request.get_json(silent=True)

    if not data:
        return jsonify({
            "message": "Request body is required."
        }), 400

    # -----------------------------------------------------
    # EXTRACT AND NORMALIZE REGISTRATION DATA
    # -----------------------------------------------------

    first_name = str(
        data.get("first_name", "")
    ).strip()

    last_name = str(
        data.get("last_name", "")
    ).strip()

    username = str(
        data.get("username", "")
    ).strip()

    email = str(
        data.get("email", "")
    ).strip().lower()

    password = data.get("password")

    # -----------------------------------------------------
    # VALIDATION
    # -----------------------------------------------------

    if not first_name:
        return jsonify({
            "message": "First name is required."
        }), 400

    if not last_name:
        return jsonify({
            "message": "Last name is required."
        }), 400

    if not username:
        return jsonify({
            "message": "Username is required."
        }), 400

    if not email:
        return jsonify({
            "message": "Email is required."
        }), 400

    if not password:
        return jsonify({
            "message": "Password is required."
        }), 400

    # -----------------------------------------------------
    # PASSWORD STRENGTH
    # -----------------------------------------------------

    if not isinstance(password, str):
        return jsonify({
            "message": "Password must be text."
        }), 400

    if not validate_password(password):
        return jsonify({
            "message": (
                "Password must be at least 8 characters long "
                "and contain at least one letter and one number."
            )
        }), 400

    # -----------------------------------------------------
    # CHECK FOR EXISTING USER
    # -----------------------------------------------------

    existing_email = User.query.filter_by(
        email=email
    ).first()

    if existing_email:
        return jsonify({
            "message": "Email already exists."
        }), 400

    existing_username = User.query.filter_by(
        username=username
    ).first()

    if existing_username:
        return jsonify({
            "message": "Username already exists."
        }), 400

    # -----------------------------------------------------
    # CREATE USER
    # -----------------------------------------------------
    #
    # Public registration must NEVER allow the client
    # to choose an administrative role.
    #
    # Every account created through public registration
    # starts as a customer.
    # -----------------------------------------------------

    new_user = User(
        first_name=first_name,
        last_name=last_name,
        username=username,
        email=email,
        role="customer"
    )

    # Hash password before saving.
    new_user.set_password(password)

    db.session.add(new_user)

    # -----------------------------------------------------
    # COMMIT USER
    # -----------------------------------------------------

    try:

        db.session.commit()

    except IntegrityError:

        db.session.rollback()

        return jsonify({
            "message": (
                "Username or email already exists."
            )
        }), 400

    except Exception as e:

        db.session.rollback()

        print(
            f"Registration error: {e}"
        )

        return jsonify({
            "message": (
                "An error occurred while registering the user."
            )
        }), 500

    return jsonify({
        "message": "New user registered."
    }), 201


# =========================================================
# LOGIN
# =========================================================

@auth_bp.route("/login", methods=["POST"])
def login():

    # -----------------------------------------------------
    # RECEIVE LOGIN DATA
    # -----------------------------------------------------

    data = request.get_json(silent=True)

    if not data:
        return jsonify({
            "message": "Request body is required."
        }), 400

    # -----------------------------------------------------
    # EXTRACT CREDENTIALS
    # -----------------------------------------------------

    login = str(
        data.get("login", "")
    ).strip()

    password = data.get("password")

    # -----------------------------------------------------
    # VALIDATION
    # -----------------------------------------------------

    if not login:
        return jsonify({
            "message": "Email or Username is required."
        }), 400

    if not password:
        return jsonify({
            "message": "Password is required."
        }), 400

    # -----------------------------------------------------
    # FIND USER
    # -----------------------------------------------------

    normalized_login = login.lower()

    user = User.query.filter(
        or_(
            User.email == normalized_login,
            User.username == login
        )
    ).first()

    if not user:
        return jsonify({
            "message": "Invalid email/username or password."
        }), 401

    # -----------------------------------------------------
    # CHECK ACCOUNT STATUS
    # -----------------------------------------------------

    if not user.is_active:
        return jsonify({
            "message": "This account is inactive"
        }), 403

    # -----------------------------------------------------
    # CHECK PASSWORD
    # -----------------------------------------------------

    if not user.check_password(password):
        return jsonify({
            "message": "Invalid email/username or password."
        }), 401

    # -----------------------------------------------------
    # CREATE JWT TOKENS
    # -----------------------------------------------------

    access_token = create_access_token(
        identity=str(user.id)
    )

    refresh_token = create_refresh_token(
        identity=str(user.id)
    )

    return jsonify({
        "message": "Login successful!",
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": {
            "id": user.id,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "username": user.username,
            "email": user.email,
            "role": user.role
        }
    }), 200


# =========================================================
# CHANGE PASSWORD
# =========================================================

@auth_bp.route("/change-password", methods=["POST"])
@jwt_required()
def change_password():

    # -----------------------------------------------------
    # GET CURRENT USER
    # -----------------------------------------------------

    current_user_id = int(
        get_jwt_identity()
    )

    user = User.query.filter_by(
        id=current_user_id
    ).first()

    if not user:
        return jsonify({
            "message": "User not found."
        }), 404

    # -----------------------------------------------------
    # RECEIVE PASSWORD DATA
    # -----------------------------------------------------

    data = request.get_json(silent=True)

    if not data:
        return jsonify({
            "message": "Request body is required."
        }), 400

    current_password = data.get("current_password")
    new_password = data.get("new_password")

    # -----------------------------------------------------
    # REQUIRED FIELDS
    # -----------------------------------------------------

    if not current_password:
        return jsonify({
            "message": "Current password is required."
        }), 400

    if not new_password:
        return jsonify({
            "message": "New password is required."
        }), 400

    # -----------------------------------------------------
    # PASSWORD TYPE
    # -----------------------------------------------------

    if not isinstance(new_password, str):
        return jsonify({
            "message": "New password must be text."
        }), 400

    # -----------------------------------------------------
    # VERIFY CURRENT PASSWORD
    # -----------------------------------------------------

    if not user.check_password(current_password):
        return jsonify({
            "message": "Current password is incorrect."
        }), 401

    # -----------------------------------------------------
    # NEW PASSWORD MUST BE DIFFERENT
    # -----------------------------------------------------

    if current_password == new_password:
        return jsonify({
            "message": (
                "New password must be different from "
                "your current password."
            )
        }), 400

    # -----------------------------------------------------
    # VALIDATE NEW PASSWORD
    # -----------------------------------------------------

    if not validate_password(new_password):
        return jsonify({
            "message": (
                "New password must be at least 8 characters "
                "long and contain at least one letter and "
                "one number."
            )
        }), 400

    # -----------------------------------------------------
    # UPDATE PASSWORD
    # -----------------------------------------------------

    user.set_password(new_password)

    # -----------------------------------------------------
    # SAVE
    # -----------------------------------------------------

    try:

        db.session.commit()

    except Exception as e:

        db.session.rollback()

        print(
            f"Password change error: {e}"
        )

        return jsonify({
            "message": "Password could not be changed."
        }), 500

    return jsonify({
        "message": "Password changed successfully."
    }), 200


# =========================================================
# FORGOT PASSWORD
# =========================================================
#
# This endpoint starts the password recovery process.
#
# IMPORTANT SECURITY RULE:
#
# We return the same response whether the email exists
# or does not exist.
#
# This prevents someone from using this endpoint to discover
# which email addresses have Thafari accounts.
# =========================================================

@auth_bp.route("/forgot-password", methods=["POST"])
def forgot_password():

    # -----------------------------------------------------
    # RECEIVE REQUEST DATA
    # -----------------------------------------------------

    data = request.get_json(silent=True)

    if not data:
        return jsonify({
            "message": (
                "If an account exists for that email, "
                "password reset instructions have been sent."
            )
        }), 200

    # -----------------------------------------------------
    # NORMALIZE EMAIL
    # -----------------------------------------------------

    email = str(
        data.get("email", "")
    ).strip().lower()

    # -----------------------------------------------------
    # GENERIC RESPONSE
    # -----------------------------------------------------
    #
    # We use this response regardless of whether the account
    # exists.
    # -----------------------------------------------------

    generic_response = {
        "message": (
            "If an account exists for that email, "
            "password reset instructions have been sent."
        )
    }

    # If no email was supplied, return the same generic
    # response instead of revealing account information.
    if not email:
        return jsonify(generic_response), 200

    # -----------------------------------------------------
    # FIND USER
    # -----------------------------------------------------

    user = User.query.filter_by(
        email=email
    ).first()

    # -----------------------------------------------------
    # DO NOT REVEAL WHETHER USER EXISTS
    # -----------------------------------------------------

    if not user:
        return jsonify(generic_response), 200

    # -----------------------------------------------------
    # DO NOT CREATE RESET LINKS FOR INACTIVE ACCOUNTS
    # -----------------------------------------------------
    #
    # We still return the generic response so that the caller
    # cannot determine whether the account exists.
    # -----------------------------------------------------

    if not user.is_active:
        return jsonify(generic_response), 200

    # -----------------------------------------------------
    # INVALIDATE PREVIOUS UNUSED RESET TOKENS
    # -----------------------------------------------------
    #
    # If the user requests another reset link, previous
    # unused reset tokens should no longer be valid.
    # -----------------------------------------------------

    previous_tokens = PasswordResetToken.query.filter_by(
        user_id=user.id,
        used_at=None
    ).all()

    current_time = datetime.utcnow()

    for previous_token in previous_tokens:

        previous_token.used_at = current_time

    # -----------------------------------------------------
    # GENERATE SECURE RANDOM TOKEN
    # -----------------------------------------------------
    #
    # secrets.token_urlsafe() uses Python's cryptographically
    # secure random number generator.
    #
    # This raw token will be sent through the email.
    # -----------------------------------------------------

    raw_token = secrets.token_urlsafe(48)

    # -----------------------------------------------------
    # HASH TOKEN
    # -----------------------------------------------------
    #
    # IMPORTANT:
    #
    # We store ONLY the hash in MySQL.
    #
    # The raw token exists only long enough to create the
    # email link.
    # -----------------------------------------------------

    token_hash = hashlib.sha256(
        raw_token.encode("utf-8")
    ).hexdigest()

    # -----------------------------------------------------
    # SET EXPIRATION
    # -----------------------------------------------------
    #
    # Reset links are valid for 30 minutes.
    # -----------------------------------------------------

    expires_at = datetime.utcnow() + timedelta(
        minutes=30
    )

    # -----------------------------------------------------
    # CREATE RESET TOKEN RECORD
    # -----------------------------------------------------

    reset_token = PasswordResetToken(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=expires_at
    )

    db.session.add(reset_token)

    # -----------------------------------------------------
    # SAVE TOKEN
    # -----------------------------------------------------

    try:

        db.session.commit()

    except Exception as e:

        db.session.rollback()

        print(
            f"Password reset token error: {e}"
        )

        # Still return the generic response.
        return jsonify(generic_response), 200

    # =====================================================
    # BUILD RESET URL
    # =====================================================

    frontend_url = current_app.config.get(
        "FRONTEND_URL",
        "http://localhost:5173"
    ).rstrip("/")

    reset_url = (
        f"{frontend_url}/reset-password"
        f"?token={raw_token}"
    )

    # =====================================================
    # BUILD EMAIL
    # =====================================================

    email_subject = "Reset your Thafari password"

    email_body = f"""
Hello {user.first_name},

We received a request to reset your Thafari password.

Use the link below to create a new password:

{reset_url}

This password reset link will expire in 30 minutes.

If you did not request a password reset, you can safely
ignore this email. Your password will remain unchanged.

For your security, this link can only be used once.

Best regards,

The Thafari Team
""".strip()

    # -----------------------------------------------------
    # SEND EMAIL
    # -----------------------------------------------------
    #
    # If email delivery fails, we log the problem but still
    # return the generic response.
    #
    # This prevents account-existence information from
    # leaking through different API responses.
    # -----------------------------------------------------

    try:

        send_email(
            user.email,
            email_subject,
            email_body
        )

    except Exception as e:

        print(
            f"Password reset email error: {e}"
        )

    return jsonify(generic_response), 200


# =========================================================
# RESET PASSWORD
# =========================================================
#
# This endpoint receives:
#
# {
#     "token": "...",
#     "new_password": "..."
# }
#
# The raw token is hashed and compared with the hash stored
# in MySQL.
# =========================================================

@auth_bp.route("/reset-password", methods=["POST"])
def reset_password():

    # -----------------------------------------------------
    # RECEIVE REQUEST DATA
    # -----------------------------------------------------

    data = request.get_json(silent=True)

    if not data:
        return jsonify({
            "message": "Request body is required."
        }), 400

    raw_token = str(
        data.get("token", "")
    ).strip()

    new_password = data.get("new_password")

    # -----------------------------------------------------
    # REQUIRED FIELDS
    # -----------------------------------------------------

    if not raw_token:
        return jsonify({
            "message": "Reset token is required."
        }), 400

    if not new_password:
        return jsonify({
            "message": "New password is required."
        }), 400

    # -----------------------------------------------------
    # PASSWORD TYPE
    # -----------------------------------------------------

    if not isinstance(new_password, str):
        return jsonify({
            "message": "New password must be text."
        }), 400

    # -----------------------------------------------------
    # PASSWORD STRENGTH
    # -----------------------------------------------------

    if not validate_password(new_password):
        return jsonify({
            "message": (
                "New password must be at least 8 characters "
                "long and contain at least one letter and "
                "one number."
            )
        }), 400

    # -----------------------------------------------------
    # HASH SUPPLIED TOKEN
    # -----------------------------------------------------
    #
    # We never search the database using the raw token.
    # -----------------------------------------------------

    token_hash = hashlib.sha256(
        raw_token.encode("utf-8")
    ).hexdigest()

    # -----------------------------------------------------
    # FIND RESET TOKEN
    # -----------------------------------------------------

    reset_token = PasswordResetToken.query.filter_by(
        token_hash=token_hash
    ).first()

    if not reset_token:
        return jsonify({
            "message": (
                "This password reset link is invalid or "
                "has expired."
            )
        }), 400

    # -----------------------------------------------------
    # CHECK WHETHER TOKEN WAS ALREADY USED
    # -----------------------------------------------------

    if reset_token.used_at is not None:
        return jsonify({
            "message": (
                "This password reset link is invalid or "
                "has expired."
            )
        }), 400

    # -----------------------------------------------------
    # CHECK TOKEN EXPIRATION
    # -----------------------------------------------------

    if datetime.utcnow() > reset_token.expires_at:
        return jsonify({
            "message": (
                "This password reset link is invalid or "
                "has expired."
            )
        }), 400

    # -----------------------------------------------------
    # GET USER
    # -----------------------------------------------------

    user = User.query.filter_by(
        id=reset_token.user_id
    ).first()

    if not user:
        return jsonify({
            "message": "User not found."
        }), 404

    # -----------------------------------------------------
    # CHECK ACCOUNT STATUS
    # -----------------------------------------------------

    if not user.is_active:
        return jsonify({
            "message": "This account is inactive."
        }), 403

    # -----------------------------------------------------
    # UPDATE PASSWORD
    # -----------------------------------------------------

    user.set_password(
        new_password
    )

    # -----------------------------------------------------
    # INVALIDATE RESET TOKEN
    # -----------------------------------------------------
    #
    # This makes the token single-use.
    # -----------------------------------------------------

    reset_token.used_at = datetime.utcnow()

    # -----------------------------------------------------
    # SAVE EVERYTHING TOGETHER
    # -----------------------------------------------------

    try:

        db.session.commit()

    except Exception as e:

        db.session.rollback()

        print(
            f"Password reset error: {e}"
        )

        return jsonify({
            "message": "Password could not be reset."
        }), 500

    return jsonify({
        "message": (
            "Password reset successfully. "
            "You can now log in with your new password."
        )
    }), 200


# =========================================================
# REFRESH ACCESS TOKEN
# =========================================================

@auth_bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():

    # -----------------------------------------------------
    # GET CURRENT USER
    # -----------------------------------------------------

    current_user_id = int(
        get_jwt_identity()
    )

    user = User.query.filter_by(
        id=current_user_id
    ).first()

    if not user:
        return jsonify({
            "message": "User not found."
        }), 404

    # -----------------------------------------------------
    # CHECK ACCOUNT STATUS
    # -----------------------------------------------------

    if not user.is_active:
        return jsonify({
            "message": "This account is inactive."
        }), 403

    # -----------------------------------------------------
    # CREATE NEW ACCESS TOKEN
    # -----------------------------------------------------

    access_token = create_access_token(
        identity=str(user.id)
    )

    return jsonify({
        "message": "Access token refreshed successfully.",
        "access_token": access_token
    }), 200


# =========================================================
# LOGOUT
# =========================================================

@auth_bp.route("/logout", methods=["POST"])
@jwt_required()
def logout():

    # -----------------------------------------------------
    # GET CURRENT ACCESS TOKEN
    # -----------------------------------------------------

    access_jwt = get_jwt()

    access_jti = access_jwt["jti"]
    access_token_type = access_jwt["type"]

    current_user_id = int(
        get_jwt_identity()
    )

    # -----------------------------------------------------
    # GET REFRESH TOKEN
    # -----------------------------------------------------

    data = request.get_json(silent=True) or {}

    refresh_token = data.get("refresh_token")

    if not refresh_token:
        return jsonify({
            "message": "Refresh token is required."
        }), 400

    # -----------------------------------------------------
    # VALIDATE REFRESH TOKEN
    # -----------------------------------------------------

    try:

        refresh_jwt = decode_token(
            refresh_token
        )

    except Exception:

        return jsonify({
            "message": "Invalid or expired refresh token."
        }), 401

    # -----------------------------------------------------
    # VERIFY TOKEN TYPE
    # -----------------------------------------------------

    if refresh_jwt.get("type") != "refresh":
        return jsonify({
            "message": (
                "The supplied token is not a refresh token."
            )
        }), 401

    # -----------------------------------------------------
    # GET REFRESH TOKEN USER
    # -----------------------------------------------------

    refresh_user_id = int(
        refresh_jwt["sub"]
    )

    # -----------------------------------------------------
    # VERIFY SAME USER
    # -----------------------------------------------------

    if refresh_user_id != current_user_id:
        return jsonify({
            "message": (
                "Refresh token does not belong to "
                "the authenticated user."
            )
        }), 403

    refresh_jti = refresh_jwt["jti"]

    # -----------------------------------------------------
    # CHECK EXISTING REVOCATIONS
    # -----------------------------------------------------

    existing_access_token = RevokedToken.query.filter_by(
        jti=access_jti
    ).first()

    existing_refresh_token = RevokedToken.query.filter_by(
        jti=refresh_jti
    ).first()

    # -----------------------------------------------------
    # REVOKE ACCESS TOKEN
    # -----------------------------------------------------

    if not existing_access_token:

        access_expires_at = datetime.fromtimestamp(
            access_jwt["exp"]
        )

        revoked_access_token = RevokedToken(
            jti=access_jti,
            token_type=access_token_type,
            user_id=current_user_id,
            expires_at=access_expires_at
        )

        db.session.add(
            revoked_access_token
        )

    # -----------------------------------------------------
    # REVOKE REFRESH TOKEN
    # -----------------------------------------------------

    if not existing_refresh_token:

        refresh_expires_at = datetime.fromtimestamp(
            refresh_jwt["exp"]
        )

        revoked_refresh_token = RevokedToken(
            jti=refresh_jti,
            token_type="refresh",
            user_id=current_user_id,
            expires_at=refresh_expires_at
        )

        db.session.add(
            revoked_refresh_token
        )

    # -----------------------------------------------------
    # COMMIT
    # -----------------------------------------------------

    try:

        db.session.commit()

    except Exception as e:

        db.session.rollback()

        print(
            f"Logout error: {e}"
        )

        return jsonify({
            "message": "Logout could not be completed."
        }), 500

    return jsonify({
        "message": (
            "Logout successful. Access and refresh "
            "tokens have been revoked."
        )
    }), 200


# =========================================================
# CURRENT USER
# =========================================================

@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def get_me():

    # -----------------------------------------------------
    # GET CURRENT USER ID
    # -----------------------------------------------------

    current_user_id = int(
        get_jwt_identity()
    )

    user = User.query.filter_by(
        id=current_user_id
    ).first()

    if not user:
        return jsonify({
            "message": "User not found."
        }), 404

    # -----------------------------------------------------
    # RETURN USER INFORMATION
    # -----------------------------------------------------
    #
    # Password hashes are NEVER returned to the client.
    # -----------------------------------------------------

    return jsonify({
        "user": {
            "id": user.id,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "username": user.username,
            "email": user.email,
            "phone_number": user.phone_number,
            "role": user.role,
            "is_verified": user.is_verified
        }
    }), 200