// =========================================================
// THAFARI CHAT SERVICE
// =========================================================
//
// This file contains all API requests related to the
// Thafari in-app messaging system.
//
// The backend supports:
//
// - Creating a conversation from a booking
// - Getting the user's conversations
// - Getting messages inside a conversation
// - Sending messages
// - Marking a conversation as read
//
// Keeping these requests here means our React pages do not
// need to know the exact backend API URLs.
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

    const response = await api.post(
        "/conversations",
        {
            booking_id: bookingId,
        },
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
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

    const response = await api.get(
        "/conversations",
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        }
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
// The messages are returned in chronological order by
// the backend.
//
// =========================================================

export const getMessages = async (
    conversationId,
    accessToken
) => {

    const response = await api.get(
        `/conversations/${conversationId}/messages`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        }
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
// Our main chat interface will eventually use Socket.IO
// for real-time messaging.
//
// =========================================================

export const sendMessage = async (
    conversationId,
    content,
    accessToken
) => {

    const response = await api.post(
        `/conversations/${conversationId}/messages`,
        {
            content,
        },
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
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
// This is important for keeping unread message counts
// accurate.
//
// =========================================================

export const markConversationAsRead = async (
    conversationId,
    accessToken
) => {

    const response = await api.patch(
        `/conversations/${conversationId}/read`,
        {},
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        }
    )

    return response.data
}