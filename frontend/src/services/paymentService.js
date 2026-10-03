// =========================================================
// THAFARI PAYMENT SERVICE
// =========================================================
//
// This file handles frontend requests related to payments.
//
// It supports:
//
// - Pesapal payments
// - Booking payment history
// - Public direct-payment settings
// - Customer direct-payment submissions
// - Admin/Tour Operator direct-payment review
//
// IMPORTANT:
//
// The direct-payment admin routes in this file match the
// original working backend architecture:
//
// GET   /api/admin/direct-payments?status=pending
// GET   /api/admin/direct-payments?status=successful
// GET   /api/admin/direct-payments?status=failed
//
// PATCH /api/admin/direct-payments/<payment_id>/verify
// PATCH /api/admin/direct-payments/<payment_id>/reject
//
// =========================================================

import api from "./api"


// =========================================================
// CREATE PESAPAL PAYMENT
// =========================================================
//
// Creates a Pesapal payment for a booking.
//
// Backend route:
//
// POST /api/payment
//
// =========================================================

export const createPayment = async (
    bookingId,
    accessToken
) => {

    const response = await api.post(
        "/payment",
        {
            booking_id: bookingId,
        },
        {
            headers: {
                Authorization:
                    `Bearer ${accessToken}`,
            },
        }
    )

    return response.data
}


// =========================================================
// GET BOOKING PAYMENTS
// =========================================================
//
// Retrieves all payments belonging to one booking.
//
// Backend route:
//
// GET /api/booking/<booking_id>/payments
//
// =========================================================

export const getBookingPayments = async (
    bookingId,
    accessToken
) => {

    const response = await api.get(
        `/booking/${bookingId}/payments`,
        {
            headers: {
                Authorization:
                    `Bearer ${accessToken}`,
            },
        }
    )

    return response.data
}


// =========================================================
// GET PUBLIC PAYMENT SETTINGS
// =========================================================
//
// Retrieves the payment instructions/settings shown to
// customers before making a direct payment.
//
// Backend route:
//
// GET /api/payment-settings
//
// This endpoint does not require authentication.
//
// =========================================================

export const getPaymentSettings = async () => {

    const response = await api.get(
        "/payment-settings"
    )

    return response.data
}


// =========================================================
// SUBMIT DIRECT PAYMENT
// =========================================================
//
// The customer submits that they have made a direct
// payment using M-Pesa or Airtel Money.
//
// IMPORTANT:
//
// The customer does NOT enter a transaction reference.
//
// The backend creates the internal transaction reference.
//
// =========================================================

export const submitDirectPayment = async (
    paymentData,
    accessToken
) => {

    const response = await api.post(
        "/payment/direct",
        paymentData,
        {
            headers: {
                Authorization:
                    `Bearer ${accessToken}`,
            },
        }
    )

    return response.data
}


// =========================================================
// GET DIRECT PAYMENTS
// =========================================================
//
// This is the ORIGINAL working direct-payment endpoint.
//
// Backend route:
//
// GET /api/admin/direct-payments?status=pending
//
// Supported statuses:
//
// - pending
// - successful
// - failed
// - cancelled
// - reversed
//
// Admin:
// - sees all direct payments.
//
// Tour operator:
// - sees direct payments belonging to their own tours.
//
// =========================================================

export const getDirectPayments = async (
    accessToken,
    status = "pending"
) => {

    const response = await api.get(
        "/admin/direct-payments",
        {
            params: {
                status: status,
            },

            headers: {
                Authorization:
                    `Bearer ${accessToken}`,
            },
        }
    )

    return response.data
}


// =========================================================
// GET PENDING DIRECT PAYMENTS
// =========================================================
//
// Convenience function for the pending-payment page.
//
// It uses the ORIGINAL backend endpoint:
//
// GET /api/admin/direct-payments?status=pending
//
// =========================================================

export const getPendingDirectPayments = async (
    accessToken
) => {

    return await getDirectPayments(
        accessToken,
        "pending"
    )
}


// =========================================================
// GET SUCCESSFUL DIRECT PAYMENTS
// =========================================================
//
// Retrieves direct payments that have been successfully
// verified.
//
// Backend route:
//
// GET /api/admin/direct-payments?status=successful
//
// =========================================================

export const getSuccessfulDirectPayments = async (
    accessToken
) => {

    return await getDirectPayments(
        accessToken,
        "successful"
    )
}


// =========================================================
// GET REJECTED DIRECT PAYMENTS
// =========================================================
//
// The backend stores rejected direct payments using:
//
// status = "failed"
//
// The frontend can display these as:
//
// "Rejected"
//
// Backend route:
//
// GET /api/admin/direct-payments?status=failed
//
// =========================================================

export const getRejectedDirectPayments = async (
    accessToken
) => {

    return await getDirectPayments(
        accessToken,
        "failed"
    )
}


// =========================================================
// GET DIRECT PAYMENT BY STATUS
// =========================================================
//
// This helper allows the DirectPayments page to request
// whichever category it needs.
//
// Frontend category:
//
// pending
// successful
// rejected
//
// Backend category:
//
// pending
// successful
// failed
//
// =========================================================

export const getDirectPaymentHistory = async (
    accessToken,
    status = "pending"
) => {

    // -----------------------------------------------------
    // Pending
    // -----------------------------------------------------

    if (status === "pending") {

        return await getPendingDirectPayments(
            accessToken
        )
    }


    // -----------------------------------------------------
    // Successful
    // -----------------------------------------------------

    if (status === "successful") {

        return await getSuccessfulDirectPayments(
            accessToken
        )
    }


    // -----------------------------------------------------
    // Rejected
    // -----------------------------------------------------
    //
    // The frontend calls this "rejected".
    //
    // The backend stores it as "failed".
    //
    // -----------------------------------------------------

    if (status === "rejected") {

        return await getRejectedDirectPayments(
            accessToken
        )
    }


    // -----------------------------------------------------
    // Any other backend-supported status
    // -----------------------------------------------------

    return await getDirectPayments(
        accessToken,
        status
    )
}


// =========================================================
// GET ONE DIRECT PAYMENT
// =========================================================
//
// Retrieves the details of one direct payment.
//
// Backend route:
//
// GET /api/admin/direct-payments/<payment_id>
//
// =========================================================

export const getDirectPayment = async (
    paymentId,
    accessToken
) => {

    const response = await api.get(
        `/admin/direct-payments/${paymentId}`,
        {
            headers: {
                Authorization:
                    `Bearer ${accessToken}`,
            },
        }
    )

    return response.data
}


// =========================================================
// VERIFY DIRECT PAYMENT
// =========================================================
//
// Marks a pending direct payment as successful.
//
// Backend route:
//
// PATCH /api/admin/direct-payments/<payment_id>/verify
//
// The backend is responsible for:
//
// - authorization
// - updating payment status
// - recording the verifier
// - recording verification time
// - updating the booking
// - sending notifications
// - sending emails
//
// =========================================================

export const verifyDirectPayment = async (
    paymentId,
    accessToken
) => {

    const response = await api.patch(
        `/admin/direct-payments/${paymentId}/verify`,
        {},
        {
            headers: {
                Authorization:
                    `Bearer ${accessToken}`,
            },
        }
    )

    return response.data
}


// =========================================================
// REJECT DIRECT PAYMENT
// =========================================================
//
// Marks a pending direct payment as failed.
//
// Backend route:
//
// PATCH /api/admin/direct-payments/<payment_id>/reject
//
// The frontend displays failed payments as:
//
// "Rejected"
//
// =========================================================

export const rejectDirectPayment = async (
    paymentId,
    accessToken
) => {

    const response = await api.patch(
        `/admin/direct-payments/${paymentId}/reject`,
        {},
        {
            headers: {
                Authorization:
                    `Bearer ${accessToken}`,
            },
        }
    )

    return response.data
}