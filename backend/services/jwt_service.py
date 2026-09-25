from models.revoked_token import RevokedToken
from models.user import User


def configure_jwt_callbacks(jwt):
    """
    Configure JWT callbacks used by Thafari.

    These callbacks add extra security checks whenever
    Flask-JWT-Extended validates a JWT.

    Current checks:
    1. Check whether the JWT has been revoked.
    2. Check whether the user still exists.
    3. Check whether the user's account is active.
    """

    @jwt.token_in_blocklist_loader
    def check_if_token_revoked(jwt_header, jwt_payload):
        """
        Check whether the current JWT has been revoked
        or belongs to an inactive/non-existent user.

        Flask-JWT-Extended provides the JWT payload,
        including:

        - jti -> unique JWT identifier
        - sub -> user identity
        """

        # -------------------------------------------------
        # CHECK TOKEN REVOCATION
        # -------------------------------------------------

        # Get the unique JWT ID.
        jti = jwt_payload["jti"]

        # Look for the JWT in our revoked_tokens table.
        revoked_token = RevokedToken.query.filter_by(
            jti=jti
        ).first()

        # If the token has been explicitly revoked,
        # reject it immediately.
        if revoked_token:
            return True

        # -------------------------------------------------
        # CHECK USER ACCOUNT
        # -------------------------------------------------

        # Get the user ID stored inside the JWT.
        user_id = jwt_payload["sub"]

        # Find the user associated with the token.
        user = User.query.filter_by(
            id=int(user_id)
        ).first()

        # If the user no longer exists, the token should
        # no longer be trusted.
        if not user:
            return True

        # If an administrator has deactivated the account,
        # reject tokens that were issued before or after
        # the account was deactivated.
        if not user.is_active:
            return True

        # The token is valid and belongs to an active user.
        return False