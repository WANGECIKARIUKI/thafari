// =========================================================
// THAFARI BOOKING SERVICE
// =========================================================
//
// This file contains functions that communicate with the
// backend booking-related API endpoints.
//
// Authentication is handled automatically by api.js using
// the HttpOnly authentication cookie.
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
// - Identify the logged-in customer from the JWT cookie
// - Check the departure
// - Check available seats
// - Check that the number of people is valid
// - Calculate the booking total
// - Create the booking as "pending"
// =========================================================

export const createBooking = async (
    bookingData
) => {

    const response = await api.post(
        "/booking",
        bookingData
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
// - Identify the logged-in customer from the JWT cookie
// - Return that customer's bookings
// - Include booking status, travellers, prices,
//   departure information and timestamps
//
// This function will be used by Dashboard.jsx.
// =========================================================

export const getBookings = async () => {

    const response = await api.get(
        "/bookings"
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
// - Identify the logged-in user from the JWT cookie
// - Find the requested booking
// - Allow the customer to view their own booking
// - Allow authorized staff to view bookings according
//   to their role
//
// This function is used by BookingView.jsx when a user
// clicks "View booking" from a notification.
// =========================================================

export const getBooking = async (
    bookingId
) => {

    const response = await api.get(
        `/booking/${bookingId}`
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
// - Identify the logged-in customer from the JWT cookie
// - Find the requested booking
// - Check whether the booking is still eligible
//   for unpaid cancellation
// - Change the booking status to "cancelled"
// =========================================================

export const cancelBooking = async (
    bookingId
) => {

    const response = await api.patch(
        `/booking/${bookingId}/cancel`,
        {}
    )

    return response.data
}


// =========================================================
// REQUEST BOOKING CANCELLATION
// =========================================================
//
// Used when a customer has already paid for a confirmed
// booking and wants to request cancellation/refund.
//
// IMPORTANT:
// - This does NOT cancel the booking immediately.
// - The booking remains confirmed while the request is pending.
// - The backend checks booking ownership.
// - The backend checks successful payment.
// - The backend checks the 72-hour cancellation policy.
// - The backend requires a cancellation reason.
// - The backend creates the cancellation request.
//
// Backend endpoint:
//
// POST /api/booking/<booking_id>/cancellation-request
//
// Authentication is handled automatically by api.js using
// the HttpOnly authentication cookie.
//
// =========================================================

export const requestCancellation = async (
    bookingId,
    reason
) => {

    const response = await api.post(
        `/booking/${bookingId}/cancellation-request`,
        {
            reason,
        }
    )

    return response.data
}