# This file handles conversations and messages between users.
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models.booking import Booking
from models.conversation import Conversation
from models.conversation_participant import ConversationParticipant
from models.message import Message
from datetime import datetime



message_bp = Blueprint(
    "messages",
    __name__,
    url_prefix="/api"
)

# ---------------------------------------------------------
# CREATE CONVERSATION
# ---------------------------------------------------------
# Creates a conversation connected to an existing booking.
#
# The customer only provides the booking ID.
# The backend determines:
#   1. The customer who owns the booking.
#   2. The tour operator responsible for the tour.
#
# This prevents users from creating conversations with
# arbitrary users.
# ---------------------------------------------------------

@message_bp.route("/conversations", methods=["POST"])
@jwt_required()
def create_conversation():

    # Get the logged-in user's ID from the JWT.
    current_user_id = int(get_jwt_identity())

    # Get request data.
    data = request.get_json()

    if not data:
        return jsonify({
            "message": "Request body is required."
        }), 400

    booking_id = data.get("booking_id")

    # Validate booking ID.
    if booking_id is None:
        return jsonify({
            "message": "Booking ID is required."
        }), 400

    try:
        booking_id = int(booking_id)

    except (TypeError, ValueError):
        return jsonify({
            "message": "Booking ID must be a valid integer."
        }), 400

    if booking_id <= 0:
        return jsonify({
            "message": "Booking ID must be greater than 0."
        }), 400

    # -----------------------------------------------------
    # Find the booking.
    # -----------------------------------------------------

    booking = Booking.query.get(booking_id)

    if not booking:
        return jsonify({
            "message": "Booking not found."
        }), 404

    # -----------------------------------------------------
    # Only the customer who owns the booking can create
    # the booking conversation.
    # -----------------------------------------------------

    if booking.user_id != current_user_id:
        return jsonify({
            "message": "You can only create a conversation for your own booking."
        }), 403

    # -----------------------------------------------------
    # Check whether a conversation already exists.
    #
    # A booking should have one main conversation.
    # -----------------------------------------------------

    existing_conversation = Conversation.query.filter_by(
        booking_id=booking.id
    ).first()

    if existing_conversation:
        return jsonify({
            "message": "A conversation already exists for this booking.",
            "conversation_id": existing_conversation.id
        }), 200

    # -----------------------------------------------------
    # Find the tour operator.
    #
    # Booking → Departure → Tour → Operator
    # -----------------------------------------------------

    departure = booking.departure

    if not departure:
        return jsonify({
            "message": "Departure associated with this booking was not found."
        }), 404

    tour = departure.tour

    if not tour:
        return jsonify({
            "message": "Tour associated with this departure was not found."
        }), 404

    operator = tour.operator

    if not operator:
        return jsonify({
            "message": "Tour operator could not be found."
        }), 404

    # -----------------------------------------------------
    # Prevent the customer from messaging themselves.
    # This should normally never happen, but it is a useful
    # defensive check.
    # -----------------------------------------------------

    if operator.id == current_user_id:
        return jsonify({
            "message": "A customer cannot create a conversation with themselves."
        }), 400

    # -----------------------------------------------------
    # Create the conversation.
    # -----------------------------------------------------

    conversation = Conversation(
        booking_id=booking.id,
        is_active=True
    )

    db.session.add(conversation)

    # Flush so SQLAlchemy generates the conversation ID.
    db.session.flush()

    # -----------------------------------------------------
    # Add the customer as a participant.
    # -----------------------------------------------------

    customer_participant = ConversationParticipant(
        conversation_id=conversation.id,
        user_id=booking.user_id
    )

    # -----------------------------------------------------
    # Add the tour operator as a participant.
    # -----------------------------------------------------

    operator_participant = ConversationParticipant(
        conversation_id=conversation.id,
        user_id=operator.id
    )

    db.session.add(customer_participant)
    db.session.add(operator_participant)

    # -----------------------------------------------------
    # Save everything.
    # -----------------------------------------------------

    try:
        db.session.commit()

    except Exception:
        db.session.rollback()

        return jsonify({
            "message": "Conversation could not be created."
        }), 500

    return jsonify({
        "message": "Conversation created successfully.",
        "conversation_id": conversation.id,
        "booking_id": booking.id,
        "participants": [
            {
                "user_id": booking.user_id,
                "role": "customer"
            },
            {
                "user_id": operator.id,
                "role": "tour_operator"
            }
        ]
    }), 201

# ---------------------------------------------------------
# GET USER CONVERSATIONS
# ---------------------------------------------------------
# Returns all conversations where the logged-in user is a
# participant.
#
# This ensures users only see conversations they belong to.
#their unread messages too.
# ---------------------------------------------------------

@message_bp.route("/conversations", methods=["GET"])
@jwt_required()
def get_conversations():

    # Get the currently authenticated user's ID from the JWT
    current_user_id = int(get_jwt_identity())

    # Get all conversations where the current user is a participant
    participations = (
        ConversationParticipant.query
        .filter_by(user_id=current_user_id)
        .all()
    )

    conversations = []

    for participation in participations:

        conversation = participation.conversation

        # Find the other participant in the conversation
        other_participant = (
            ConversationParticipant.query
            .filter(
                ConversationParticipant.conversation_id == conversation.id,
                ConversationParticipant.user_id != current_user_id
            )
            .first()
        )

        # Get the other user's details
        other_user = (
            other_participant.user
            if other_participant
            else None
        )

        # Get the latest message in the conversation
        latest_message = (
            Message.query
            .filter_by(conversation_id=conversation.id)
            .order_by(Message.created_at.desc())
            .first()
        )

        # Count only messages from other participants
        # that were sent after the current user's last read time.
        unread_query = Message.query.filter(
            Message.conversation_id == conversation.id,
            Message.sender_id != current_user_id  #only count messages that the sender is not the current user. i.e messages sent by the other user in the convo
        )

        if participation.last_read_at:
            unread_query = unread_query.filter(
                Message.created_at > participation.last_read_at
            )

        unread_count = unread_query.count()

        # Build the conversation response
        conversation_data = {
            "conversation_id": conversation.id,
            "booking_id": conversation.booking_id,
            "is_active": conversation.is_active,
            "created_at": conversation.created_at.isoformat(),

            # Information about the person the current user is chatting with
            "other_user": (
                {
                    "user_id": other_user.id,
                    "first_name": other_user.first_name,
                    "last_name": other_user.last_name,
                    "role": other_user.role
                }
                if other_user
                else None
            ),

            # Most recent message in the conversation
            "latest_message": (
                {
                    "message_id": latest_message.id,
                    "sender_id": latest_message.sender_id,
                    "content": latest_message.content,
                    "created_at": latest_message.created_at.isoformat()
                }
                if latest_message
                else None
            ),

            # Number of messages the current user has not read
            "unread_count": unread_count
        }

        conversations.append(conversation_data)

    # Sort conversations by newest conversation first
    conversations.sort(
        key=lambda conversation: conversation["created_at"],
        reverse=True
    )

    return jsonify({
        "conversations": conversations
    }), 200

# ---------------------------------------------------------
# SEND MESSAGE
# ---------------------------------------------------------
# Allows a participant to send a message inside a
# conversation.
#
# The user must belong to the conversation before a
# message can be created.
# ---------------------------------------------------------

@message_bp.route(
    "/conversations/<int:conversation_id>/messages",
    methods=["POST"]
)
@jwt_required()
def send_message(conversation_id):

    # Get the logged-in user's ID from the JWT.
    current_user_id = int(get_jwt_identity())

    # Get request data.
    data = request.get_json()

    if not data:
        return jsonify({
            "message": "Request body is required."
        }), 400

    content = data.get("content")

    # Validate that message content was provided.
    if content is None:
        return jsonify({
            "message": "Message content is required."
        }), 400

    # Convert to string and remove unnecessary spaces
    # from the beginning and end.
    content = str(content).strip()

    # Prevent empty messages.
    if not content:
        return jsonify({
            "message": "Message content cannot be empty."
        }), 400

    # -----------------------------------------------------
    # Find the conversation.
    # -----------------------------------------------------

    conversation = Conversation.query.get(conversation_id)

    if not conversation:
        return jsonify({
            "message": "Conversation not found."
        }), 404

    # -----------------------------------------------------
    # Check whether the conversation is active.
    # -----------------------------------------------------

    if not conversation.is_active:
        return jsonify({
            "message": "This conversation is no longer active."
        }), 400

    # -----------------------------------------------------
    # Check whether the current user is a participant.
    # -----------------------------------------------------

    participant = ConversationParticipant.query.filter_by(
        conversation_id=conversation.id,
        user_id=current_user_id
    ).first()

    if not participant:
        return jsonify({
            "message": "You are not a participant in this conversation."
        }), 403

    # -----------------------------------------------------
    # Create the message.
    # -----------------------------------------------------

    message = Message(
        conversation_id=conversation.id,
        sender_id=current_user_id,
        content=content
    )

    db.session.add(message)

    # Flush so SQLAlchemy generates the message ID and
    # timestamps before the response is created.
    db.session.flush()

    # -----------------------------------------------------
    # Save the message.
    # -----------------------------------------------------

    try:
        db.session.commit()

    except Exception:
        db.session.rollback()

        return jsonify({
            "message": "Message could not be sent."
        }), 500

    return jsonify({
        "message": "Message sent successfully.",
        "data": {
            "message_id": message.id,
            "conversation_id": message.conversation_id,
            "sender_id": message.sender_id,
            "content": message.content,
            "created_at": (
                message.created_at.isoformat()
                if message.created_at
                else None
            )
        }
    }), 201

# ---------------------------------------------------------
# GET CONVERSATION MESSAGES
# ---------------------------------------------------------
# Returns all messages belonging to a conversation.
#
# Only users who are participants in the conversation
# are allowed to view its messages.
# ---------------------------------------------------------

@message_bp.route(
    "/conversations/<int:conversation_id>/messages",
    methods=["GET"]
)
@jwt_required()
def get_messages(conversation_id):

    # Get the logged-in user's ID from the JWT.
    current_user_id = int(get_jwt_identity())

    # -----------------------------------------------------
    # Find the conversation.
    # -----------------------------------------------------

    conversation = Conversation.query.get(conversation_id)

    if not conversation:
        return jsonify({
            "message": "Conversation not found."
        }), 404

    # -----------------------------------------------------
    # Verify that the current user belongs to the
    # conversation.
    # -----------------------------------------------------

    participant = ConversationParticipant.query.filter_by(
        conversation_id=conversation.id,
        user_id=current_user_id
    ).first()

    if not participant:
        return jsonify({
            "message": "You are not a participant in this conversation."
        }), 403

    # -----------------------------------------------------
    # Get all messages in chronological order.
    # -----------------------------------------------------

    messages = (
        Message.query
        .filter_by(conversation_id=conversation.id)
        .order_by(Message.created_at.asc())
        .all()
    )

    message_list = []

    for message in messages:

        message_list.append({
            "message_id": message.id,
            "conversation_id": message.conversation_id,
            "sender_id": message.sender_id,
            "content": message.content,
            "created_at": (
                message.created_at.isoformat()
                if message.created_at
                else None
            )
        })

    return jsonify({
        "conversation_id": conversation.id,
        "messages": message_list
    }), 200

# Mark all messages in a conversation as read for the current user
@message_bp.route("/conversations/<int:conversation_id>/read", methods=["PATCH"])
@jwt_required()
def mark_conversation_as_read(conversation_id):

    # Get the currently authenticated user's ID from the JWT
    current_user_id = int(get_jwt_identity())

    # Find the conversation
    conversation = Conversation.query.filter_by(
        id=conversation_id
    ).first()

    if not conversation:
        return jsonify({
            "message": "Conversation not found."
        }), 404

    # Find the current user's participation in this conversation
    participant = ConversationParticipant.query.filter_by(
        conversation_id=conversation_id,
        user_id=current_user_id
    ).first()

    # Only participants can mark a conversation as read
    if not participant:
        return jsonify({
            "message": "You are not a participant in this conversation."
        }), 403

    try:
        # Record the time when the user last read the conversation
        participant.last_read_at = datetime.utcnow()

        db.session.commit()

        return jsonify({
            "message": "Conversation marked as read.",
            "conversation_id": conversation_id,
            "user_id": current_user_id,
            "last_read_at": participant.last_read_at.isoformat()
        }), 200

    except Exception as e:
        # Roll back the transaction if anything goes wrong
        db.session.rollback()

        return jsonify({
            "message": "Failed to mark conversation as read.",
            "error": str(e)
        }), 500