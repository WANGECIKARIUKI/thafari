from functools import wraps

from flask import jsonify
from flask_jwt_extended import (
    get_jwt_identity,
    verify_jwt_in_request
)

from models.user import User


# ---------------------------------------------------------
# ROLE-BASED AUTHORIZATION
# ---------------------------------------------------------

def roles_required(*roles):
    """
    Restrict an endpoint to one or more user roles.

    Example:

        @roles_required("admin")

    Or:

        @roles_required("admin", "tour_operator")

    The decorator performs the authorization checks
    required before allowing the protected endpoint
    to execute.
    """

    # Make sure at least one role was provided.
    if not roles:
        raise ValueError(
            "roles_required() must specify at least one role."
        )

    # This receives the function being protected.
    def decorator(fn):

        # Preserve the original function's metadata.
        @wraps(fn)
        def wrapper(*args, **kwargs):

            # -------------------------------------------------
            # JWT AUTHENTICATION
            # -------------------------------------------------

            # Make sure the request contains a valid JWT.
            #
            # This means routes using roles_required() do not
            # have to depend on the developer remembering to
            # add @jwt_required() separately.
            verify_jwt_in_request()

            # -------------------------------------------------
            # GET CURRENT USER
            # -------------------------------------------------

            # Get the authenticated user's ID from the JWT.
            current_user_id = int(get_jwt_identity())

            # Find the user associated with the token.
            user = User.query.filter_by(
                id=current_user_id
            ).first()

            # The JWT may technically be valid even if the
            # corresponding database user no longer exists.
            #
            # Never authorize a user who does not exist.
            if not user:
                return jsonify({
                    "message": "User not found."
                }), 404

            # -------------------------------------------------
            # CHECK ACCOUNT STATUS
            # -------------------------------------------------

            # An inactive account must never be authorized
            # to access role-protected endpoints.
            if not user.is_active:
                return jsonify({
                    "message": "This account is inactive."
                }), 403

            # -------------------------------------------------
            # CHECK USER ROLE
            # -------------------------------------------------

            # Check whether the user's role is one of the
            # roles allowed by this endpoint.
            if user.role not in roles:
                return jsonify({
                    "message": "Access denied."
                }), 403

            # -------------------------------------------------
            # AUTHORIZATION SUCCESSFUL
            # -------------------------------------------------

            # The user:
            # 1. Has a valid JWT.
            # 2. Exists in the database.
            # 3. Has an active account.
            # 4. Has an authorized role.
            #
            # Therefore, allow the original endpoint to run.
            return fn(*args, **kwargs)

        return wrapper

    return decorator