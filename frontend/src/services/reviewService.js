// =========================================================
// THAFARI REVIEW API
// =========================================================
//
// Frontend API functions for the Thafari Reviews feature.
//
// Handles:
//
// - Public review browsing
// - Customer review retrieval
// - Customer review lookup by booking
// - Customer review submission
// - Customer review editing
// - Admin review management
// - Admin review visibility control
// - Admin review deletion
//
// IMPORTANT:
//
// Authentication is now handled by the HttpOnly authentication
// cookie configured in api.js.
//
// Existing accessToken parameters are temporarily retained
// where needed for compatibility with existing components.
// They are NOT sent as Bearer tokens.
//
// =========================================================

import api from "./api"


// =========================================================
// GET PUBLIC REVIEWS
// =========================================================
//
// Backend endpoint:
// GET /api/reviews
//
// No authentication is required.
//
// Only visible reviews are returned.
// Newest reviews appear first.
//
// =========================================================

export const getPublicReviews = async () => {

    const response = await api.get(
        "/reviews"
    )

    return response.data
}


// =========================================================
// GET MY REVIEWS
// =========================================================
//
// Backend endpoint:
// GET /api/reviews/my
//
// Customer only.
//
// Returns reviews created by the authenticated customer.
//
// =========================================================

export const getMyReviews = async (
    accessToken
) => {

    void accessToken

    const response = await api.get(
        "/reviews/my"
    )

    return response.data
}


// =========================================================
// GET REVIEW FOR ONE BOOKING
// =========================================================
//
// Backend endpoint:
// GET /api/reviews/booking/<booking_id>
//
// Customer only.
//
// Returns:
// - the review when one exists
// - review: null when no review exists
//
// =========================================================

export const getBookingReview = async (
    bookingId,
    accessToken
) => {

    void accessToken

    const response = await api.get(
        `/reviews/booking/${bookingId}`
    )

    return response.data
}


// =========================================================
// CREATE REVIEW
// =========================================================
//
// Backend endpoint:
// POST /api/reviews
//
// Customer only.
//
// Expected data:
//
// {
//     booking_id: 123,
//     rating: 5,
//     comment: "Amazing safari experience!"
// }
//
// =========================================================

export const createReview = async (
    reviewData,
    accessToken
) => {

    void accessToken

    const response = await api.post(
        "/reviews",
        reviewData
    )

    return response.data
}


// =========================================================
// UPDATE REVIEW
// =========================================================
//
// Backend endpoint:
// PUT /api/reviews/<review_id>
//
// Customer only.
//
// Expected data:
//
// {
//     rating: 5,
//     comment: "Updated review."
// }
//
// =========================================================

export const updateReview = async (
    reviewId,
    reviewData,
    accessToken
) => {

    void accessToken

    const response = await api.put(
        `/reviews/${reviewId}`,
        reviewData
    )

    return response.data
}


// =========================================================
// GET ALL ADMIN REVIEWS
// =========================================================
//
// Backend endpoint:
// GET /api/admin/reviews
//
// Admin only.
//
// Includes both visible and hidden reviews.
//
// =========================================================

export const getAdminReviews = async (
    accessToken
) => {

    void accessToken

    const response = await api.get(
        "/admin/reviews"
    )

    return response.data
}


// =========================================================
// UPDATE REVIEW VISIBILITY
// =========================================================
//
// Backend endpoint:
// PATCH /api/admin/reviews/<review_id>/visibility
//
// Admin only.
//
// Expected data:
//
// {
//     is_visible: true
// }
//
// or:
//
// {
//     is_visible: false
// }
//
// =========================================================

export const updateReviewVisibility = async (
    reviewId,
    isVisible,
    accessToken
) => {

    void accessToken

    const response = await api.patch(
        `/admin/reviews/${reviewId}/visibility`,
        {
            is_visible: isVisible,
        }
    )

    return response.data
}


// =========================================================
// DELETE REVIEW
// =========================================================
//
// Backend endpoint:
// DELETE /api/admin/reviews/<review_id>
//
// Admin only.
//
// Permanently removes the review.
//
// =========================================================

export const deleteReview = async (
    reviewId,
    accessToken
) => {

    void accessToken

    const response = await api.delete(
        `/admin/reviews/${reviewId}`
    )

    return response.data
}