// =========================================================
// THAFARI BOOKING SERVICE
// =========================================================
//
// This file contains functions that communicate with the
// backend booking-related API endpoints.
//
// =========================================================

import api from "./api"


// =========================================================
// CREATE BOOKING
// =========================================================
//
// Sends the customer's booking details to the backend.
//
// The backend will:
// - Identify the logged-in customer from the JWT
// - Check the departure
// - Check available seats
// - Check that the number of people is valid
// - Calculate the booking total
// - Create the booking as "pending"
// =========================================================

export const createBooking = async (bookingData, accessToken) => {

    const response = await api.post(
        "/booking",
        bookingData,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        }
    )

    return response.data
}


// =========================================================
// GET ALL CUSTOMER BOOKINGS
// =========================================================
//
// Gets the booking history for the logged-in customer.
//
// The backend will:
// - Identify the logged-in customer from the JWT
// - Return that customer's bookings
// - Include booking status, travellers, prices,
//   departure information and timestamps
//
// This function will be used by Dashboard.jsx to display
// the customer's booking history.
// =========================================================

export const getBookings = async (accessToken) => {

    const response = await api.get(
        "/bookings",
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        }
    )

    return response.data
}


// =========================================================
// GET SINGLE BOOKING
// =========================================================
//
// Gets the details of one specific booking.
//
// The backend will:
// - Identify the logged-in user from the JWT
// - Find the requested booking
// - Allow the customer to view their own booking
// - Allow authorized staff to view bookings according
//   to their role
//
// This function is used by BookingView.jsx when a user
// clicks "View booking" from a notification.
// =========================================================

export const getBooking = async (bookingId, accessToken) => {

    const response = await api.get(
        `/booking/${bookingId}`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        }
    )

    return response.data
}


// =========================================================
// CANCEL BOOKING
// =========================================================
//
// Cancels a pending booking belonging to the logged-in
// customer.
//
// The backend will:
// - Identify the logged-in customer from the JWT
// - Find the requested booking
// - Check whether the booking is still eligible
//   for unpaid cancellation
// - Change the booking status to "cancelled"
// =========================================================

export const cancelBooking = async (bookingId, accessToken) => {

    const response = await api.patch(
        `/booking/${bookingId}/cancel`,
        {},
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        }
    )

    return response.data
}


// =========================================================
// REQUEST BOOKING CANCELLATION
// =========================================================
//
// Sends a cancellation request for a confirmed,
// successfully paid booking.
//
// The backend will:
// - Identify the logged-in customer
// - Check that the booking belongs to the customer
// - Check the cancellation policy
// - Save the customer's cancellation reason
// - Create a pending cancellation request
//
// IMPORTANT:
// This does NOT immediately cancel the booking.
// The booking remains confirmed while the request
// is waiting for admin review.
// =========================================================

export const requestCancellation = async (
    bookingId,
    reason,
    accessToken
) => {

    const response = await api.post(
        `/booking/${bookingId}/cancellation-request`,
        {
            reason,
        },
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        }
    )

    return response.data
}