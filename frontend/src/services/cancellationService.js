// =========================================================
// THAFARI CANCELLATION SERVICE
// =========================================================
//
// This file handles frontend requests related to
// booking cancellation requests.
//
// It supports:
//
// - Admin cancellation requests
// - Tour Operator cancellation requests
// - Approving cancellation requests
// - Denying cancellation requests
//
// IMPORTANT:
//
// The backend remains responsible for:
// - Authorization
// - Checking booking ownership
// - Checking cancellation-request status
// - Creating refunds
// - Updating booking status
// - Sending notifications/emails
//
// =========================================================

import api from "./api"


// =========================================================
// GET CANCELLATION REQUESTS
// =========================================================
//
// Retrieves cancellation requests for Admins and
// Tour Operators.
//
// Backend route:
//
// GET /api/admin/cancellation-requests?status=pending
//
// Admin:
// - Can see cancellation requests across the system.
//
// Tour Operator:
// - Can see cancellation requests belonging to
//   their own tours.
//
// The backend is responsible for applying the
// correct role-based filtering.
//
// =========================================================

export const getCancellationRequests = async (
    accessToken,
    status = "pending"
) => {

    const response = await api.get(
        "/admin/cancellation-requests",
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
// GET PENDING CANCELLATION REQUESTS
// =========================================================
//
// Convenience function used by the pending
// cancellation-request page.
//
// Backend route:
//
// GET /api/admin/cancellation-requests?status=pending
//
// =========================================================

export const getPendingCancellationRequests = async (
    accessToken
) => {

    return await getCancellationRequests(
        accessToken,
        "pending"
    )
}


// =========================================================
// GET APPROVED CANCELLATION REQUESTS
// =========================================================
//
// Retrieves cancellation requests that have already
// been approved.
//
// Backend route:
//
// GET /api/admin/cancellation-requests?status=approved
//
// =========================================================

export const getApprovedCancellationRequests = async (
    accessToken
) => {

    return await getCancellationRequests(
        accessToken,
        "approved"
    )
}


// =========================================================
// GET DENIED CANCELLATION REQUESTS
// =========================================================
//
// Retrieves cancellation requests that have been denied.
//
// Backend route:
//
// GET /api/admin/cancellation-requests?status=denied
//
// =========================================================

export const getDeniedCancellationRequests = async (
    accessToken
) => {

    return await getCancellationRequests(
        accessToken,
        "denied"
    )
}


// =========================================================
// GET CANCELLATION REQUEST HISTORY
// =========================================================
//
// This helper allows the frontend page to request
// whichever cancellation category it needs.
//
// Frontend categories:
//
// - pending
// - approved
// - denied
//
// The backend receives the same status values.
//
// =========================================================

export const getCancellationRequestHistory = async (
    accessToken,
    status = "pending"
) => {

    return await getCancellationRequests(
        accessToken,
        status
    )
}


// =========================================================
// APPROVE CANCELLATION REQUEST
// =========================================================
//
// Approves a customer's cancellation request.
//
// Backend route:
//
// PATCH /api/admin/cancellation-requests/<request_id>/approve
//
// IMPORTANT:
//
// Approval starts the refund process.
//
// The backend is responsible for:
// - Checking authorization
// - Checking that the request is still pending
// - Creating the refund
// - Updating the cancellation request
// - Handling the booking/refund workflow
//
// =========================================================

export const approveCancellationRequest = async (
    cancellationRequestId,
    accessToken
) => {

    const response = await api.patch(
        `/admin/cancellation-requests/${cancellationRequestId}/approve`,
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
// DENY CANCELLATION REQUEST
// =========================================================
//
// Denies a customer's cancellation request.
//
// Backend route:
//
// PATCH /api/admin/cancellation-requests/<request_id>/deny
//
// The backend requires a reason for denying the request.
//
// Example:
//
// {
//     "reason": "Cancellation request does not meet
//                the cancellation policy."
// }
//
// =========================================================

export const denyCancellationRequest = async (
    cancellationRequestId,
    reason,
    accessToken
) => {

    const response = await api.patch(
        `/admin/cancellation-requests/${cancellationRequestId}/deny`,
        {
            reason: reason,
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