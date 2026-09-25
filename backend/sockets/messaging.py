from flask import request
from flask_socketio import join_room, emit

from flask_jwt_extended import decode_token

from extensions import socketio, db

from models.conversation import Conversation
from models.conversation_participant import ConversationParticipant
from models.message import Message


# ============================================================
# CONNECTED USERS
# ============================================================

# Stores the authenticated user ID for each Socket.IO connection.
#
# Example:
# {
#     "socket-session-id": 9,
#     "another-session-id": 8
# }
#
# This is fine for our current development/single-server setup.
# A production multi-worker deployment would need shared state.
connected_users = {}


# ============================================================
# SOCKET.IO CONNECTION
# ============================================================

@socketio.on("connect")
def handle_connect(auth):

    # Make sure the client supplied authentication data.
    if not auth or not auth.get("access_token"):
        return False

    access_token = auth.get("access_token")

    try:
        # Decode and validate the JWT.
        decoded_token = decode_token(access_token)

        # JWT identity is stored as a string,
        # so convert it to an integer for database queries.
        current_user_id = int(decoded_token["sub"])

    except Exception as e:

        print(f"Socket.IO authentication failed: {e}")

        # Returning False rejects the Socket.IO connection.
        return False

    # Store the authenticated user against this socket session.
    connected_users[request.sid] = current_user_id

    # ========================================================
    # PRIVATE USER NOTIFICATION ROOM
    # ========================================================

    # Every authenticated user gets their own private room.
    #
    # Example:
    # User 9 -> user_9
    # User 8 -> user_8
    #
    # Notifications can then be sent only to that user.
    user_room = f"user_{current_user_id}"

    join_room(user_room)

    print(
        f"Socket.IO user {current_user_id} "
        f"connected with session {request.sid}"
    )

    print(
        f"User {current_user_id} joined private room {user_room}"
    )


# ============================================================
# SOCKET.IO DISCONNECT
# ============================================================

@socketio.on("disconnect")
def handle_disconnect():

    # Remove the user's socket session from memory.
    user_id = connected_users.pop(request.sid, None)

    print(
        f"Socket.IO user {user_id} disconnected."
    )


# ============================================================
# JOIN CONVERSATION
# ============================================================

@socketio.on("join_conversation")
def handle_join_conversation(data):

    # Get the authenticated user associated with this socket.
    current_user_id = connected_users.get(request.sid)

    if not current_user_id:
        emit("error", {
            "message": "Socket connection is not authenticated."
        })
        return

    # Validate request data.
    if not data:
        emit("error", {
            "message": "Request data is required."
        })
        return

    conversation_id = data.get("conversation_id")

    if not conversation_id:
        emit("error", {
            "message": "conversation_id is required."
        })
        return

    # Make sure conversation_id is an integer.
    try:
        conversation_id = int(conversation_id)

    except (TypeError, ValueError):

        emit("error", {
            "message": "conversation_id must be an integer."
        })
        return

    # ========================================================
    # PARTICIPANT AUTHORIZATION
    # ========================================================

    participant = ConversationParticipant.query.filter_by(
        conversation_id=conversation_id,
        user_id=current_user_id
    ).first()

    if not participant:

        emit("error", {
            "message": "You are not a participant in this conversation."
        })
        return

    # ========================================================
    # JOIN CONVERSATION ROOM
    # ========================================================

    room = f"conversation_{conversation_id}"

    join_room(room)

    emit("joined_conversation", {
        "conversation_id": conversation_id,
        "message": "Successfully joined conversation."
    })


# ============================================================
# SEND MESSAGE
# ============================================================

# ============================================================
# SEND MESSAGE
# ============================================================

@socketio.on("send_message")
def handle_send_message(data):

    # Get authenticated user.
    current_user_id = connected_users.get(request.sid)

    if not current_user_id:
        emit("error", {
            "message": "Socket connection is not authenticated."
        })
        return

    # Validate request data.
    if not data:
        emit("error", {
            "message": "Request data is required."
        })
        return

    conversation_id = data.get("conversation_id")

    if not conversation_id:
        emit("error", {
            "message": "conversation_id is required."
        })
        return

    # Validate conversation ID.
    try:
        conversation_id = int(conversation_id)

    except (TypeError, ValueError):

        emit("error", {
            "message": "conversation_id must be an integer."
        })
        return

    # Get message content.
    content = data.get("content")

    if not content or not content.strip():

        emit("error", {
            "message": "Message content is required."
        })
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

        emit("error", {
            "message": "Conversation not found."
        })
        return

    # Do not allow messages in inactive conversations.
    if not conversation.is_active:

        emit("error", {
            "message": "This conversation is no longer active."
        })
        return

    # ========================================================
    # PARTICIPANT AUTHORIZATION
    # ========================================================

    participant = ConversationParticipant.query.filter_by(
        conversation_id=conversation_id,
        user_id=current_user_id
    ).first()

    if not participant:

        emit("error", {
            "message": (
                "You are not a participant in this conversation."
            )
        })
        return

    # ========================================================
    # FIND OTHER PARTICIPANTS
    # ========================================================

    # We send the notification to the OTHER participants,
    # not the person who sent the message.
    #
    # Example:
    #
    # Customer 9 sends message
    #       ↓
    # Operator 8 receives notification
    #
    # The sender already knows they sent the message.

    other_participants = ConversationParticipant.query.filter(
        ConversationParticipant.conversation_id == conversation_id,
        ConversationParticipant.user_id != current_user_id
    ).all()

    # ========================================================
    # CREATE MESSAGE + NOTIFICATIONS
    # ========================================================

    try:

        # ----------------------------------------------------
        # Create the message.
        # ----------------------------------------------------

        message = Message(
            conversation_id=conversation_id,
            sender_id=current_user_id,
            content=content
        )

        db.session.add(message)

        # ----------------------------------------------------
        # Flush so the message gets its database ID and
        # created_at value.
        # ----------------------------------------------------

        db.session.flush()

        # ----------------------------------------------------
        # Import notification service here.
        #
        # This avoids unnecessary module-level coupling.
        # ----------------------------------------------------

        from services.notification_service import (
            create_notification,
            emit_notification
        )

        # ----------------------------------------------------
        # Create notifications for the other participants.
        #
        # create_notification() does NOT commit.
        #
        # Therefore the notifications are part of the SAME
        # database transaction as the message.
        # ----------------------------------------------------

        notifications = []

        for other_participant in other_participants:

            notification = create_notification(
                user_id=other_participant.user_id,
                title="New Message",
                message=(
                    "You have a new message in "
                    f"conversation #{conversation_id}."
                ),
                notification_type="message"
            )

            notifications.append(notification)

        # ----------------------------------------------------
        # COMMIT MESSAGE + NOTIFICATIONS TOGETHER
        # ----------------------------------------------------

        db.session.commit()

        # ----------------------------------------------------
        # Prepare message data AFTER successful commit.
        # ----------------------------------------------------

        message_data = {
            "message_id": message.id,
            "conversation_id": message.conversation_id,
            "sender_id": message.sender_id,
            "content": message.content,
            "created_at": message.created_at.isoformat()
        }

        # ====================================================
        # EMIT MESSAGE AFTER COMMIT
        # ====================================================

        room = f"conversation_{conversation_id}"

        emit(
            "new_message",
            message_data,
            to=room
        )

        # ====================================================
        # EMIT NOTIFICATIONS AFTER COMMIT
        # ====================================================

        for notification in notifications:

            try:

                emit_notification(
                    notification
                )

            except Exception as e:

                # The message and notification are already
                # committed.
                #
                # Socket.IO delivery failure must NOT roll
                # back the message.
                print(
                    "Message notification could not be "
                    f"delivered: {e}"
                )

    except Exception as e:

        # ----------------------------------------------------
        # If anything fails BEFORE the commit, roll back the
        # entire transaction.
        #
        # This prevents:
        #
        # Message saved
        # but notification missing
        #
        # OR
        #
        # Notification saved
        # but message missing
        # ----------------------------------------------------

        db.session.rollback()

        emit("error", {
            "message": "Failed to send message.",
            "error": str(e)
        })


# ============================================================
# MARK CONVERSATION MESSAGES AS READ
# ============================================================

@socketio.on("mark_messages_read")
def handle_mark_messages_read(data):

    # Get authenticated user.
    current_user_id = connected_users.get(request.sid)

    if not current_user_id:

        emit("error", {
            "message": "Socket connection is not authenticated."
        })
        return

    # Validate request data.
    if not data:

        emit("error", {
            "message": "Request data is required."
        })
        return

    conversation_id = data.get("conversation_id")

    if not conversation_id:

        emit("error", {
            "message": "conversation_id is required."
        })
        return

    # Validate conversation ID.
    try:
        conversation_id = int(conversation_id)

    except (TypeError, ValueError):

        emit("error", {
            "message": "conversation_id must be an integer."
        })
        return

    # ========================================================
    # FIND CONVERSATION
    # ========================================================

    conversation = Conversation.query.filter_by(
        id=conversation_id
    ).first()

    if not conversation:

        emit("error", {
            "message": "Conversation not found."
        })
        return

    # ========================================================
    # PARTICIPANT AUTHORIZATION
    # ========================================================

    participant = ConversationParticipant.query.filter_by(
        conversation_id=conversation_id,
        user_id=current_user_id
    ).first()

    if not participant:

        emit("error", {
            "message": "You are not a participant in this conversation."
        })
        return

    # ========================================================
    # MARK AS READ
    # ========================================================

    try:

        from datetime import datetime

        participant.last_read_at = datetime.utcnow()

        db.session.commit()

        read_data = {
            "conversation_id": conversation_id,
            "user_id": current_user_id,
            "last_read_at": participant.last_read_at.isoformat()
        }

        # Tell the current user that the operation succeeded.
        emit(
            "messages_read",
            read_data
        )

        # Tell the other participants that this user
        # has read the conversation.
        room = f"conversation_{conversation_id}"

        emit(
            "user_read_messages",
            read_data,
            to=room,
            include_self=False
        )

    except Exception as e:

        db.session.rollback()

        emit("error", {
            "message": "Failed to mark messages as read.",
            "error": str(e)
        })