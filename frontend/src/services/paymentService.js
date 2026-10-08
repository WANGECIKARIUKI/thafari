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
// Authentication is now handled by the HttpOnly authentication
// cookie configured in api.js.
//
// Existing accessToken parameters are temporarily retained in
// some function signatures so existing components continue to
// work during this security migration.
//
// The accessToken value is NEVER sent as a Bearer token.
//
// api.js automatically sends the HttpOnly cookie.
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

    // Keep the existing parameter for compatibility with
    // current components. It is intentionally not used
    // as an authentication credential.
    void accessToken

    const response = await api.post(
        "/payment",
        {
            booking_id: bookingId,
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

    // Kept for compatibility with existing callers.
    void accessToken

    const response = await api.get(
        `/booking/${bookingId}/payments`
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
// Backend route:
//
// POST /api/payment/direct
//
// =========================================================

export const submitDirectPayment = async (
    paymentData,
    accessToken
) => {

    // Kept for compatibility with existing callers.
    void accessToken

    const response = await api.post(
        "/payment/direct",
        paymentData
    )

    return response.data
}


// =========================================================
// GET DIRECT PAYMENTS
// =========================================================
//
// Original working direct-payment endpoint.
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

    // Kept because existing pages already call this function
    // with an accessToken argument.
    //
    // The value is NOT used for authentication.
    void accessToken

    const response = await api.get(
        "/admin/direct-payments",
        {
            params: {
                status: status,
            },
        }
    )

    return response.data
}


// =========================================================
// GET PENDING DIRECT PAYMENTS
// =========================================================
//
// Retrieves pending direct payments.
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
// Retrieves successfully verified direct payments.
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
// Backend status:
//
// failed
//
// Frontend display:
//
// Rejected
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
// Convenience helper used by the direct-payment management
// page.
//
// Frontend categories:
//
// pending
// successful
// rejected
//
// Backend categories:
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

    // Kept for compatibility with current callers.
    void accessToken

    // -----------------------------------------------------
    // PENDING
    // -----------------------------------------------------

    if (status === "pending") {

        return await getPendingDirectPayments()
    }


    // -----------------------------------------------------
    // SUCCESSFUL
    // -----------------------------------------------------

    if (status === "successful") {

        return await getSuccessfulDirectPayments()
    }


    // -----------------------------------------------------
    // REJECTED
    // -----------------------------------------------------

    if (status === "rejected") {

        return await getRejectedDirectPayments()
    }


    // -----------------------------------------------------
    // OTHER BACKEND-SUPPORTED STATUS
    // -----------------------------------------------------

    return await getDirectPayments(
        undefined,
        status
    )
}


// =========================================================
// GET ONE DIRECT PAYMENT
// =========================================================
//
// Retrieves one direct payment.
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

    // Kept for compatibility with existing callers.
    void accessToken

    const response = await api.get(
        `/admin/direct-payments/${paymentId}`
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

    // Kept for compatibility with existing callers.
    void accessToken

    const response = await api.patch(
        `/admin/direct-payments/${paymentId}/verify`,
        {}
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

    // Kept for compatibility with existing callers.
    void accessToken

    const response = await api.patch(
        `/admin/direct-payments/${paymentId}/reject`,
        {}
    )

    return response.data
}


// =========================================================
// GET ADMIN PAYMENT SETTINGS
// =========================================================
//
// Retrieves payment settings configured by the admin.
//
// Backend route:
//
// GET /api/admin/payment-settings
//
// =========================================================

export const getAdminPaymentSettings = async (
    accessToken
) => {

    // Kept for compatibility with existing callers.
    void accessToken

    const response = await api.get(
        "/admin/payment-settings"
    )

    return response.data
}


// =========================================================
// UPDATE ADMIN PAYMENT SETTINGS
// =========================================================
//
// Updates the platform payment settings configured by the
// admin.
//
// Includes:
//
// - M-Pesa enabled/disabled
// - M-Pesa mode
// - Paybill number
// - Till number
// - M-Pesa business name
// - Airtel settings
// - Payment instructions
//
// Backend route:
//
// PUT /api/admin/payment-settings
//
// =========================================================

export const updateAdminPaymentSettings = async (
    paymentSettings,
    accessToken
) => {

    // Kept for compatibility with existing callers.
    void accessToken

    const response = await api.put(
        "/admin/payment-settings",
        paymentSettings
    )

    return response.data
}