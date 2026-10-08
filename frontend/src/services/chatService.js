// =========================================================
// THAFARI CHAT SERVICE
// =========================================================
//
// This file contains all API requests related to the
// Thafari in-app messaging system.
//
// Authentication is handled automatically by api.js using
// the HttpOnly authentication cookie.
//
// The accessToken parameters are retained only for
// compatibility with existing components.
//
// They are NOT used as credentials.
//
// The backend remains responsible for:
// - Authentication
// - Conversation participant checks
// - Booking ownership checks
// - Message authorization
// - Read-status authorization
//
// =========================================================

import api from "./api"


// =========================================================
// CREATE CONVERSATION
// =========================================================
//
// Calls:
//
// POST /api/conversations
//
// The current backend creates a conversation from an
// existing booking.
//
// The customer sends the booking ID.
//
// The backend then:
// - Checks that the booking belongs to the customer
// - Finds the booking's departure
// - Finds the tour
// - Finds the tour operator
// - Creates the conversation
// - Adds the customer as a participant
// - Adds the tour operator as a participant
//
// =========================================================

export const createConversation = async (
    bookingId,
    accessToken
) => {

    // Compatibility only.
    // Authentication is handled by the HttpOnly cookie.
    void accessToken

    const response = await api.post(
        "/conversations",
        {
            booking_id: bookingId,
        }
    )

    return response.data
}


// =========================================================
// GET ALL CONVERSATIONS
// =========================================================
//
// Calls:
//
// GET /api/conversations
//
// The backend returns conversations where the current
// authenticated user is a participant.
//
// Each conversation can contain:
//
// - conversation_id
// - booking_id
// - is_active
// - other_user
// - latest_message
// - unread_count
//
// =========================================================

export const getConversations = async (
    accessToken
) => {

    // Compatibility only.
    // Authentication is handled by the HttpOnly cookie.
    void accessToken

    const response = await api.get(
        "/conversations"
    )

    return response.data
}


// =========================================================
// GET CONVERSATION MESSAGES
// =========================================================
//
// Calls:
//
// GET /api/conversations/<conversation_id>/messages
//
// This loads the existing message history for a
// conversation.
//
// The backend verifies that the authenticated user
// is a participant in the conversation.
//
// =========================================================

export const getMessages = async (
    conversationId,
    accessToken
) => {

    // Compatibility only.
    // Authentication is handled by the HttpOnly cookie.
    void accessToken

    const response = await api.get(
        `/conversations/${conversationId}/messages`
    )

    return response.data
}


// =========================================================
// SEND MESSAGE
// =========================================================
//
// Calls:
//
// POST /api/conversations/<conversation_id>/messages
//
// This function is useful as the REST fallback for sending
// messages.
//
// Our main chat interface can use Socket.IO for real-time
// messaging.
//
// The api.js interceptor automatically adds the CSRF token
// for this POST request.
//
// =========================================================

export const sendMessage = async (
    conversationId,
    content,
    accessToken
) => {

    // Compatibility only.
    // Authentication is handled by the HttpOnly cookie.
    void accessToken

    const response = await api.post(
        `/conversations/${conversationId}/messages`,
        {
            content,
        }
    )

    return response.data
}


// =========================================================
// MARK CONVERSATION AS READ
// =========================================================
//
// Calls:
//
// PATCH /api/conversations/<conversation_id>/read
//
// This tells the backend that the authenticated user has
// read the messages in this conversation.
//
// The backend verifies that the authenticated user is
// actually a participant.
//
// The api.js interceptor automatically adds the CSRF token
// for this PATCH request.
//
// =========================================================

export const markConversationAsRead = async (
    conversationId,
    accessToken
) => {

    // Compatibility only.
    // Authentication is handled by the HttpOnly cookie.
    void accessToken

    const response = await api.patch(
        `/conversations/${conversationId}/read`,
        {}
    )

    return response.data
}