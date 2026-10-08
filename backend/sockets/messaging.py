# ============================================================
# THAFARI SOCKET.IO MESSAGING
# ============================================================
#
# This file handles real-time:
#
# - Socket.IO authentication
# - Private user notification rooms
# - Conversation rooms
# - Sending messages
# - Message notifications
# - Marking messages as read
#
# ============================================================
#
# SECURITY UPDATE
# ============================================================
#
# Thafari authentication now uses JWTs stored inside
# HttpOnly cookies.
#
# The frontend MUST NOT send the JWT through Socket.IO auth data.
#
# The Socket.IO connection therefore authenticates using the
# access JWT stored in the browser's HttpOnly cookie.
#
# JavaScript cannot read the JWT itself.
#
# ============================================================


# ============================================================
# FLASK IMPORTS
# ============================================================

from flask import (
    request,
    current_app
)


# ============================================================
# SOCKET.IO IMPORTS
# ============================================================

from flask_socketio import (
    join_room,
    emit
)


# ============================================================
# JWT IMPORTS
# ============================================================

from flask_jwt_extended import (
    decode_token
)


# ============================================================
# APPLICATION EXTENSIONS
# ============================================================

from extensions import (
    socketio,
    db
)


# ============================================================
# MODELS
# ============================================================

from models.conversation import (
    Conversation
)

from models.conversation_participant import (
    ConversationParticipant
)

from models.message import (
    Message
)

from models.revoked_token import (
    RevokedToken
)


# ============================================================
# CONNECTED USERS
# ============================================================

# Stores the authenticated user ID for each Socket.IO
# connection.
#
# The cookie remains the source of authentication truth.
#
# This mapping is mainly useful for keeping track of connected
# sessions.
#
# Example:
#
# {
#     "socket-session-id": 9,
#     "another-session-id": 8
# }
#
# This is fine for our current single-server setup.
#
# A production multi-worker deployment would need shared
# Socket.IO state such as Redis.
#
connected_users = {}


# ============================================================
# SOCKET AUTHENTICATION HELPER
# ============================================================

def get_authenticated_socket_user():

    # --------------------------------------------------------
    # GET CONFIGURED ACCESS COOKIE NAME
    # --------------------------------------------------------
    #
    # This comes from config.py.
    #
    # Example:
    #
    # JWT_ACCESS_COOKIE_NAME =
    #     "thafari_access_cookie"
    #
    access_cookie_name = current_app.config.get(
        "JWT_ACCESS_COOKIE_NAME",
        "access_token_cookie"
    )


    # --------------------------------------------------------
    # READ ACCESS JWT FROM HTTPONLY COOKIE
    # --------------------------------------------------------
    #
    # JavaScript cannot read the HttpOnly cookie.
    #
    # The browser sends it automatically during the
    # Socket.IO connection.
    #
    access_token = request.cookies.get(
        access_cookie_name
    )


    # --------------------------------------------------------
    # REQUIRE ACCESS COOKIE
    # --------------------------------------------------------

    if not access_token:

        return None


    # --------------------------------------------------------
    # DECODE AND VALIDATE JWT
    # --------------------------------------------------------

    try:

        decoded_token = decode_token(
            access_token
        )

    except Exception as e:

        print(
            f"Socket.IO JWT validation failed: {e}"
        )

        return None


    # --------------------------------------------------------
    # ONLY ACCESS TOKENS ARE ALLOWED
    # --------------------------------------------------------

    if decoded_token.get("type") != "access":

        return None


    # --------------------------------------------------------
    # REQUIRE JWT ID
    # --------------------------------------------------------
    #
    # Every JWT has a JTI that uniquely identifies it.
    #
    token_jti = decoded_token.get(
        "jti"
    )


    if not token_jti:

        return None


    # --------------------------------------------------------
    # CHECK TOKEN REVOCATION
    # --------------------------------------------------------
    #
    # This is important because decode_token() validates the JWT
    # itself but our application also supports token revocation.
    #
    # A token that was successfully decoded may still have been
    # revoked after the user logged out.
    #
    revoked_token = RevokedToken.query.filter_by(
        jti=token_jti
    ).first()


    if revoked_token:

        return None


    # --------------------------------------------------------
    # GET USER ID FROM JWT
    # --------------------------------------------------------

    token_subject = decoded_token.get(
        "sub"
    )


    if token_subject is None:

        return None


    # --------------------------------------------------------
    # CONVERT USER ID TO INTEGER
    # --------------------------------------------------------

    try:

        current_user_id = int(
            token_subject
        )

    except (
        TypeError,
        ValueError
    ):

        return None


    return current_user_id


# ============================================================
# SOCKET.IO CONNECTION
# ============================================================

@socketio.on("connect")
def handle_connect(auth):

    # --------------------------------------------------------
    # AUTHENTICATE USING HTTPONLY COOKIE
    # --------------------------------------------------------
    #
    # The browser sends the authentication cookie.
    #
    # JavaScript does NOT send:
    #
    #     auth: {
    #         access_token: ...
    #     }
    #
    # anymore.
    #
    current_user_id = get_authenticated_socket_user()


    # --------------------------------------------------------
    # REJECT INVALID CONNECTION
    # --------------------------------------------------------

    if not current_user_id:

        print(
            "Socket.IO authentication failed: "
            "missing, invalid, expired or revoked access cookie."
        )

        # Returning False rejects the Socket.IO connection.
        return False


    # --------------------------------------------------------
    # STORE AUTHENTICATED USER
    # --------------------------------------------------------

    connected_users[
        request.sid
    ] = current_user_id


    # ========================================================
    # PRIVATE USER NOTIFICATION ROOM
    # ========================================================
    #
    # Every authenticated user gets their own private room.
    #
    # Example:
    #
    # User 9 -> user_9
    # User 8 -> user_8
    #
    user_room = (
        f"user_{current_user_id}"
    )


    join_room(
        user_room
    )


    # --------------------------------------------------------
    # LOG SUCCESSFUL CONNECTION
    # --------------------------------------------------------

    print(
        f"Socket.IO user {current_user_id} "
        f"connected with session {request.sid}"
    )


    print(
        f"User {current_user_id} "
        f"joined private room {user_room}"
    )


# ============================================================
# SOCKET.IO DISCONNECT
# ============================================================

@socketio.on("disconnect")
def handle_disconnect():

    # --------------------------------------------------------
    # REMOVE SOCKET SESSION
    # --------------------------------------------------------

    user_id = connected_users.pop(
        request.sid,
        None
    )


    print(
        f"Socket.IO user {user_id} disconnected."
    )


# ============================================================
# JOIN CONVERSATION
# ============================================================

@socketio.on("join_conversation")
def handle_join_conversation(data):

    # --------------------------------------------------------
    # AUTHENTICATE THE SOCKET USER
    # --------------------------------------------------------

    current_user_id = (
        get_authenticated_socket_user()
    )


    if not current_user_id:

        emit(
            "error",
            {
                "message":
                    "Socket connection is not authenticated."
            }
        )

        return


    # --------------------------------------------------------
    # VALIDATE REQUEST DATA
    # --------------------------------------------------------

    if not data:

        emit(
            "error",
            {
                "message":
                    "Request data is required."
            }
        )

        return


    # --------------------------------------------------------
    # GET CONVERSATION ID
    # --------------------------------------------------------

    conversation_id = data.get(
        "conversation_id"
    )


    if not conversation_id:

        emit(
            "error",
            {
                "message":
                    "conversation_id is required."
            }
        )

        return


    # --------------------------------------------------------
    # VALIDATE CONVERSATION ID
    # --------------------------------------------------------

    try:

        conversation_id = int(
            conversation_id
        )

    except (
        TypeError,
        ValueError
    ):

        emit(
            "error",
            {
                "message":
                    "conversation_id must be an integer."
            }
        )

        return


    # ========================================================
    # PARTICIPANT AUTHORIZATION
    # ========================================================
    #
    # A user can only join conversations they belong to.
    #
    participant = ConversationParticipant.query.filter_by(
        conversation_id=conversation_id,
        user_id=current_user_id
    ).first()


    if not participant:

        emit(
            "error",
            {
                "message":
                    "You are not a participant in this conversation."
            }
        )

        return


    # --------------------------------------------------------
    # JOIN CONVERSATION ROOM
    # --------------------------------------------------------

    room = (
        f"conversation_{conversation_id}"
    )


    join_room(
        room
    )


    # --------------------------------------------------------
    # CONFIRM SUCCESS
    # --------------------------------------------------------

    emit(
        "joined_conversation",
        {
            "conversation_id":
                conversation_id,

            "message":
                "Successfully joined conversation."
        }
    )


# ============================================================
# SEND MESSAGE
# ============================================================

@socketio.on("send_message")
def handle_send_message(data):

    # --------------------------------------------------------
    # AUTHENTICATE SOCKET USER
    # --------------------------------------------------------

    current_user_id = (
        get_authenticated_socket_user()
    )


    if not current_user_id:

        emit(
            "error",
            {
                "message":
                    "Socket connection is not authenticated."
            }
        )

        return


    # --------------------------------------------------------
    # VALIDATE REQUEST DATA
    # --------------------------------------------------------

    if not data:

        emit(
            "error",
            {
                "message":
                    "Request data is required."
            }
        )

        return


    # --------------------------------------------------------
    # GET CONVERSATION ID
    # --------------------------------------------------------

    conversation_id = data.get(
        "conversation_id"
    )


    if not conversation_id:

        emit(
            "error",
            {
                "message":
                    "conversation_id is required."
            }
        )

        return


    # --------------------------------------------------------
    # VALIDATE CONVERSATION ID
    # --------------------------------------------------------

    try:

        conversation_id = int(
            conversation_id
        )

    except (
        TypeError,
        ValueError
    ):

        emit(
            "error",
            {
                "message":
                    "conversation_id must be an integer."
            }
        )

        return


    # --------------------------------------------------------
    # GET MESSAGE CONTENT
    # --------------------------------------------------------

    content = data.get(
        "content"
    )


    if not content or not content.strip():

        emit(
            "error",
            {
                "message":
                    "Message content is required."
            }
        )

        return


    # Remove unnecessary whitespace.
    content = content.strip()


    # ========================================================
    # FIND CONVERSATION
    # ========================================================

    conversation = Conversation.query.filter_by(
        id=conversation_id
    ).first()


    if not conversation:

        emit(
            "error",
            {
                "message":
                    "Conversation not found."
            }
        )

        return


    # ========================================================
    # CHECK CONVERSATION STATUS
    # ========================================================

    if not conversation.is_active:

        emit(
            "error",
            {
                "message":
                    "This conversation is no longer active."
            }
        )

        return


    # ========================================================
    # PARTICIPANT AUTHORIZATION
    # ========================================================
    #
    # The authenticated user must actually belong to this
    # conversation.
    #
    participant = ConversationParticipant.query.filter_by(
        conversation_id=conversation_id,
        user_id=current_user_id
    ).first()


    if not participant:

        emit(
            "error",
            {
                "message":
                    "You are not a participant in this conversation."
            }
        )

        return


    # ========================================================
    # FIND OTHER PARTICIPANTS
    # ========================================================
    #
    # Notifications are sent to everyone else in the
    # conversation, not to the sender.
    #
    other_participants = (
        ConversationParticipant.query
        .filter(
            ConversationParticipant.conversation_id
            == conversation_id,

            ConversationParticipant.user_id
            != current_user_id
        )
        .all()
    )


    # ========================================================
    # CREATE MESSAGE + NOTIFICATIONS
    # ========================================================

    try:

        # ----------------------------------------------------
        # CREATE MESSAGE
        # ----------------------------------------------------

        message = Message(
            conversation_id=conversation_id,
            sender_id=current_user_id,
            content=content
        )


        db.session.add(
            message
        )


        # ----------------------------------------------------
        # FLUSH
        # ----------------------------------------------------
        #
        # This gives the message its database ID before
        # preparing notification/event data.
        #
        db.session.flush()


        # ----------------------------------------------------
        # IMPORT NOTIFICATION SERVICE
        # ----------------------------------------------------
        #
        # Imported here to avoid unnecessary module-level
        # coupling.
        #
        from services.notification_service import (
            create_notification,
            emit_notification
        )


        # ----------------------------------------------------
        # CREATE NOTIFICATIONS
        # ----------------------------------------------------
        #
        # create_notification() does not commit.
        #
        # Therefore the message and its notifications are
        # saved together in one transaction.
        #
        notifications = []


        for other_participant in other_participants:

            notification = create_notification(

                user_id=
                    other_participant.user_id,

                title=
                    "New Message",

                message=(
                    "You have a new message in "
                    f"conversation #{conversation_id}."
                ),

                notification_type=
                    "message"
            )


            notifications.append(
                notification
            )


        # ----------------------------------------------------
        # COMMIT MESSAGE + NOTIFICATIONS TOGETHER
        # ----------------------------------------------------

        db.session.commit()


        # ====================================================
        # PREPARE MESSAGE DATA
        # ====================================================

        message_data = {

            "message_id":
                message.id,

            "conversation_id":
                message.conversation_id,

            "sender_id":
                message.sender_id,

            "content":
                message.content,

            "created_at":
                message.created_at.isoformat()
        }


        # ====================================================
        # EMIT MESSAGE
        # ====================================================

        room = (
            f"conversation_{conversation_id}"
        )


        emit(
            "new_message",
            message_data,
            to=room
        )


        # ====================================================
        # EMIT NOTIFICATIONS
        # ====================================================

        for notification in notifications:

            try:

                emit_notification(
                    notification
                )

            except Exception as e:

                # The database transaction has already succeeded.
                #
                # A Socket.IO delivery problem should not roll
                # back the message itself.
                #
                print(
                    "Message notification could not be "
                    f"delivered: {e}"
                )


    except Exception as e:

        # ----------------------------------------------------
        # ROLLBACK FAILED TRANSACTION
        # ----------------------------------------------------

        db.session.rollback()


        # ----------------------------------------------------
        # RETURN SAFE ERROR TO CLIENT
        # ----------------------------------------------------
        #
        # Do NOT expose the raw backend exception to the browser.
        #
        emit(
            "error",
            {
                "message":
                    "Failed to send message."
            }
        )


        # Log the real error server-side only.
        print(
            f"Socket.IO message error: {e}"
        )


# ============================================================
# MARK CONVERSATION MESSAGES AS READ
# ============================================================

@socketio.on("mark_messages_read")
def handle_mark_messages_read(data):

    # --------------------------------------------------------
    # AUTHENTICATE SOCKET USER
    # --------------------------------------------------------

    current_user_id = (
        get_authenticated_socket_user()
    )


    if not current_user_id:

        emit(
            "error",
            {
                "message":
                    "Socket connection is not authenticated."
            }
        )

        return


    # --------------------------------------------------------
    # VALIDATE REQUEST DATA
    # --------------------------------------------------------

    if not data:

        emit(
            "error",
            {
                "message":
                    "Request data is required."
            }
        )

        return


    # --------------------------------------------------------
    # GET CONVERSATION ID
    # --------------------------------------------------------

    conversation_id = data.get(
        "conversation_id"
    )


    if not conversation_id:

        emit(
            "error",
            {
                "message":
                    "conversation_id is required."
            }
        )

        return


    # --------------------------------------------------------
    # VALIDATE CONVERSATION ID
    # --------------------------------------------------------

    try:

        conversation_id = int(
            conversation_id
        )

    except (
        TypeError,
        ValueError
    ):

        emit(
            "error",
            {
                "message":
                    "conversation_id must be an integer."
            }
        )

        return


    # ========================================================
    # FIND CONVERSATION
    # ========================================================

    conversation = Conversation.query.filter_by(
        id=conversation_id
    ).first()


    if not conversation:

        emit(
            "error",
            {
                "message":
                    "Conversation not found."
            }
        )

        return


    # ========================================================
    # PARTICIPANT AUTHORIZATION
    # ========================================================

    participant = ConversationParticipant.query.filter_by(
        conversation_id=conversation_id,
        user_id=current_user_id
    ).first()


    if not participant:

        emit(
            "error",
            {
                "message":
                    "You are not a participant in this conversation."
            }
        )

        return


    # ========================================================
    # MARK AS READ
    # ========================================================

    try:

        from datetime import datetime


        participant.last_read_at = (
            datetime.utcnow()
        )


        db.session.commit()


        # ----------------------------------------------------
        # PREPARE READ DATA
        # ----------------------------------------------------

        read_data = {

            "conversation_id":
                conversation_id,

            "user_id":
                current_user_id,

            "last_read_at":
                participant.last_read_at.isoformat()
        }


        # ----------------------------------------------------
        # TELL CURRENT USER
        # ----------------------------------------------------

        emit(
            "messages_read",
            read_data
        )


        # ----------------------------------------------------
        # TELL OTHER PARTICIPANTS
        # ----------------------------------------------------

        room = (
            f"conversation_{conversation_id}"
        )


        emit(
            "user_read_messages",
            read_data,
            to=room,
            include_self=False
        )


    except Exception as e:

        # ----------------------------------------------------
        # ROLLBACK
        # ----------------------------------------------------

        db.session.rollback()


        # ----------------------------------------------------
        # SAFE CLIENT ERROR
        # ----------------------------------------------------

        emit(
            "error",
            {
                "message":
                    "Failed to mark messages as read."
            }
        )


        # Log actual error server-side only.
        print(
            f"Socket.IO read-status error: {e}"
        )