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
# 9. Admin role management
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

# Authorization decorator.
#
# This is used when an endpoint should only be accessible
# to users with specific roles.
from decorators.auth_decorator import roles_required


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
# CURRENT USER - UPDATE PROFILE
# =========================================================
#
# PATCH /api/auth/me
#
# Allows an authenticated user to update their own:
#
# - first_name
# - last_name
# - username
# - email
# - phone_number
#
# Role, verification status, account status and password
# are deliberately not changed by this endpoint.
# =========================================================

@auth_bp.route(
    "/me",
    methods=["PATCH"]
)
@jwt_required()
def update_me():

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

    data = request.get_json(silent=True)

    if not data:
        return jsonify({
            "message": "Request body is required."
        }), 400

    first_name = str(data.get("first_name", "")).strip()
    last_name = str(data.get("last_name", "")).strip()
    username = str(data.get("username", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    phone_number = str(data.get("phone_number", "")).strip()

    if not first_name:
        return jsonify({"message": "First name is required."}), 400

    if not last_name:
        return jsonify({"message": "Last name is required."}), 400

    if not username:
        return jsonify({"message": "Username is required."}), 400

    if not email:
        return jsonify({"message": "Email is required."}), 400

    existing_username = User.query.filter(
        User.username == username,
        User.id != current_user_id
    ).first()

    if existing_username:
        return jsonify({
            "message": "Username already exists."
        }), 400

    existing_email = User.query.filter(
        User.email == email,
        User.id != current_user_id
    ).first()

    if existing_email:
        return jsonify({
            "message": "Email already exists."
        }), 400

    user.first_name = first_name
    user.last_name = last_name
    user.username = username
    user.email = email
    user.phone_number = phone_number or None

    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({
            "message": "Username or email already exists."
        }), 400
    except Exception as e:
        db.session.rollback()
        print(f"Profile update error: {e}")
        return jsonify({
            "message": "Your profile could not be updated."
        }), 500

    return jsonify({
        "message": "Profile updated successfully.",
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


# =========================================================
# ADMIN - GET MANAGEABLE USERS
# =========================================================
#
# GET /api/auth/users
#
# Only administrators can use this endpoint.
#
# Returns:
#
# - Customers
# - Tour operators
#
# Admin accounts are deliberately excluded from the list.
# =========================================================

@auth_bp.route(
    "/users",
    methods=["GET"]
)
@jwt_required()
@roles_required("admin")
def get_users():

    # -----------------------------------------------------
    # GET CUSTOMERS AND TOUR OPERATORS
    # -----------------------------------------------------

    users = User.query.filter(
        User.role.in_([
            "customer",
            "tour_operator"
        ])
    ).order_by(
        User.id.desc()
    ).all()

    # -----------------------------------------------------
    # BUILD SAFE RESPONSE
    # -----------------------------------------------------
    #
    # Password hashes and other sensitive fields are never
    # returned to the frontend.
    # -----------------------------------------------------

    user_list = []

    for user in users:

        user_list.append({
            "id": user.id,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "is_active": user.is_active,
            "is_verified": user.is_verified
        })

    return jsonify({
        "users": user_list
    }), 200


# =========================================================
# ADMIN - CHANGE USER ROLE
# =========================================================
#
# PATCH /api/auth/users/<user_id>/role
#
# Only administrators can use this endpoint.
#
# This allows an admin to:
#
# - Promote a customer to tour_operator
# - Change a tour_operator back to customer
#
# Public registration still always creates customers.
#
# IMPORTANT:
#
# We deliberately do NOT allow this endpoint to assign
# the "admin" role.
#
# This prevents an administrator from accidentally or
# unnecessarily creating additional admin accounts through
# a normal user-management endpoint.
# =========================================================

@auth_bp.route(
    "/users/<int:user_id>/role",
    methods=["PATCH"]
)
@jwt_required()
@roles_required("admin")
def update_user_role(user_id):

    # -----------------------------------------------------
    # GET CURRENT ADMIN
    # -----------------------------------------------------
    #
    # The roles_required decorator already ensures that the
    # authenticated user has the admin role.
    #
    # We still retrieve the user ID here for clarity and
    # future auditing purposes.
    # -----------------------------------------------------

    current_admin_id = int(
        get_jwt_identity()
    )

    # -----------------------------------------------------
    # FIND TARGET USER
    # -----------------------------------------------------

    user = User.query.filter_by(
        id=user_id
    ).first()

    if not user:
        return jsonify({
            "message": "User not found."
        }), 404

    # -----------------------------------------------------
    # RECEIVE REQUEST DATA
    # -----------------------------------------------------

    data = request.get_json(silent=True)

    if not data:
        return jsonify({
            "message": "Request body is required."
        }), 400

    # -----------------------------------------------------
    # GET NEW ROLE
    # -----------------------------------------------------

    new_role = data.get("role")

    if not isinstance(new_role, str):
        return jsonify({
            "message": "Role must be text."
        }), 400

    # Normalize the role so values such as:
    #
    # "Tour_Operator"
    # "TOUR_OPERATOR"
    #
    # are converted into:
    #
    # "tour_operator"
    new_role = new_role.strip().lower()

    # -----------------------------------------------------
    # ALLOWED ROLES
    # -----------------------------------------------------
    #
    # Only customer and tour_operator can be assigned
    # through this endpoint.
    #
    # Admin is intentionally excluded.
    # -----------------------------------------------------

    allowed_roles = {
        "customer",
        "tour_operator"
    }

    if new_role not in allowed_roles:
        return jsonify({
            "message": (
                "Invalid role. The role must be either "
                "'customer' or 'tour_operator'."
            )
        }), 400

    # -----------------------------------------------------
    # PREVENT UNNECESSARY SELF-ROLE CHANGES
    # -----------------------------------------------------
    #
    # An administrator should not be able to change their
    # own role through this endpoint.
    #
    # This protects the current admin account from being
    # accidentally changed into a customer or operator.
    # -----------------------------------------------------

    if user.id == current_admin_id:
        return jsonify({
            "message": (
                "Administrators cannot change their own role "
                "through this endpoint."
            )
        }), 400

    # -----------------------------------------------------
    # CHECK WHETHER ROLE IS ALREADY SET
    # -----------------------------------------------------

    if user.role == new_role:
        return jsonify({
            "message": (
                f"User is already assigned the "
                f"'{new_role}' role."
            ),
            "user": {
                "id": user.id,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "username": user.username,
                "email": user.email,
                "role": user.role
            }
        }), 200

    # -----------------------------------------------------
    # STORE OLD ROLE
    # -----------------------------------------------------

    old_role = user.role

    # -----------------------------------------------------
    # UPDATE ROLE
    # -----------------------------------------------------

    user.role = new_role

    # -----------------------------------------------------
    # SAVE CHANGES
    # -----------------------------------------------------

    try:

        db.session.commit()

    except Exception as e:

        db.session.rollback()

        print(
            f"User role update error: {e}"
        )

        return jsonify({
            "message": "User role could not be updated."
        }), 500

    # -----------------------------------------------------
    # RETURN UPDATED USER
    # -----------------------------------------------------

    return jsonify({
        "message": (
            f"User role changed from '{old_role}' "
            f"to '{new_role}'."
        ),
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

    if not user.is_active:
        return jsonify(generic_response), 200

    # -----------------------------------------------------
    # INVALIDATE PREVIOUS UNUSED RESET TOKENS
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

    raw_token = secrets.token_urlsafe(48)

    # -----------------------------------------------------
    # HASH TOKEN
    # -----------------------------------------------------

    token_hash = hashlib.sha256(
        raw_token.encode("utf-8")
    ).hexdigest()

    # -----------------------------------------------------
    # SET EXPIRATION
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