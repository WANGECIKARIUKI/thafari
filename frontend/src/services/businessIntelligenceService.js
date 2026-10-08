// =========================================================
// THAFARI BUSINESS INTELLIGENCE SERVICE
// =========================================================
//
// This file handles all frontend requests for the Business
// Intelligence dashboard.
//
// Backend blueprint:
// admin_bp
//
// Backend URL prefix:
// /api
//
// All Business Intelligence endpoints are protected by
// backend authentication and require the admin role.
//
// IMPORTANT SECURITY CHANGE:
//
// Authentication is now handled by api.js using the
// HttpOnly authentication cookie.
//
// The accessToken parameters are retained only for
// compatibility with existing components.
//
// They are NOT used as credentials.
// =========================================================

import api from "./api"


// =========================================================
// GET ALL REVENUE TARGETS
// =========================================================
//
// Backend:
// GET /api/revenue_targets
//
// Returns the revenue periods that the admin can select.
//
// =========================================================

export const getRevenueTargets = async (
    accessToken
) => {

    // Compatibility only.
    // Authentication is handled by the HttpOnly cookie.
    void accessToken

    const response = await api.get(
        "/revenue_targets"
    )

    return response.data
}


// =========================================================
// GET TOTAL REVENUE
// =========================================================
//
// Backend:
// GET /api/total_revenue/<target_id>
//
// Calculates actual revenue for the selected target period.
//
// =========================================================

export const getTotalRevenue = async (
    targetId,
    accessToken
) => {

    void accessToken

    const response = await api.get(
        `/total_revenue/${targetId}`
    )

    return response.data
}


// =========================================================
// GET POPULAR TOUR
// =========================================================
//
// Backend:
// GET /api/popular_tours/<target_id>
//
// Uses the number of people booked to determine the most
// popular tour during the selected period.
//
// =========================================================

export const getPopularTour = async (
    targetId,
    accessToken
) => {

    void accessToken

    const response = await api.get(
        `/popular_tours/${targetId}`
    )

    return response.data
}


// =========================================================
// GET TOTAL CUSTOMERS
// =========================================================
//
// Backend:
// GET /api/total_customers/<target_id>
//
// Customer count is based on Booking.number_of_people,
// matching the BI backend definition.
//
// =========================================================

export const getTotalCustomers = async (
    targetId,
    accessToken
) => {

    void accessToken

    const response = await api.get(
        `/total_customers/${targetId}`
    )

    return response.data
}


// =========================================================
// GET CONFIRMED BOOKINGS
// =========================================================
//
// Backend:
// GET /api/confirmed_bookings/<target_id>
//
// =========================================================

export const getConfirmedBookings = async (
    targetId,
    accessToken
) => {

    void accessToken

    const response = await api.get(
        `/confirmed_bookings/${targetId}`
    )

    return response.data
}


// =========================================================
// GET COMPLETED BOOKINGS
// =========================================================
//
// Backend:
// GET /api/completed_bookings/<target_id>
//
// =========================================================

export const getCompletedBookings = async (
    targetId,
    accessToken
) => {

    void accessToken

    const response = await api.get(
        `/completed_bookings/${targetId}`
    )

    return response.data
}


// =========================================================
// GET CANCELLED BOOKINGS
// =========================================================
//
// Backend:
// GET /api/cancelled_bookings/<target_id>
//
// =========================================================

export const getCancelledBookings = async (
    targetId,
    accessToken
) => {

    void accessToken

    const response = await api.get(
        `/cancelled_bookings/${targetId}`
    )

    return response.data
}


// =========================================================
// GET EXPIRED BOOKINGS
// =========================================================
//
// Backend:
// GET /api/expired_bookings/<target_id>
//
// =========================================================

export const getExpiredBookings = async (
    targetId,
    accessToken
) => {

    void accessToken

    const response = await api.get(
        `/expired_bookings/${targetId}`
    )

    return response.data
}


// =========================================================
// GET COMPLETION RATE
// =========================================================
//
// Backend:
// GET /api/completion_rate/<target_id>
//
// =========================================================

export const getCompletionRate = async (
    targetId,
    accessToken
) => {

    void accessToken

    const response = await api.get(
        `/completion_rate/${targetId}`
    )

    return response.data
}


// =========================================================
// GET CANCELLATION RATE
// =========================================================
//
// Backend:
// GET /api/cancellation_rate/<target_id>
//
// =========================================================

export const getCancellationRate = async (
    targetId,
    accessToken
) => {

    void accessToken

    const response = await api.get(
        `/cancellation_rate/${targetId}`
    )

    return response.data
}


// =========================================================
// GET AVERAGE BOOKING SIZE
// =========================================================
//
// Backend:
// GET /api/average_size/<target_id>
//
// Represents the average number of people per booking.
//
// =========================================================

export const getAverageBookingSize = async (
    targetId,
    accessToken
) => {

    void accessToken

    const response = await api.get(
        `/average_size/${targetId}`
    )

    return response.data
}


// =========================================================
// GET AVERAGE REVENUE PER BOOKING
// =========================================================
//
// Backend:
// GET /api/average_revenue/<target_id>
//
// =========================================================

export const getAverageRevenue = async (
    targetId,
    accessToken
) => {

    void accessToken

    const response = await api.get(
        `/average_revenue/${targetId}`
    )

    return response.data
}


// =========================================================
// GET TOP REVENUE TOUR
// =========================================================
//
// Backend:
// GET /api/top_revenue/<target_id>
//
// =========================================================

export const getTopRevenueTour = async (
    targetId,
    accessToken
) => {

    void accessToken

    const response = await api.get(
        `/top_revenue/${targetId}`
    )

    return response.data
}


// =========================================================
// GET REVENUE PER CUSTOMER
// =========================================================
//
// Backend:
// GET /api/customer_revenue/<target_id>
//
// =========================================================

export const getRevenuePerCustomer = async (
    targetId,
    accessToken
) => {

    void accessToken

    const response = await api.get(
        `/customer_revenue/${targetId}`
    )

    return response.data
}


// =========================================================
// GET CUSTOMER RETENTION
// =========================================================
//
// Backend:
// GET /api/customer_booking/<target_id>
//
// Calculates repeat-customer behaviour from completed
// bookings.
//
// =========================================================

export const getCustomerRetention = async (
    targetId,
    accessToken
) => {

    void accessToken

    const response = await api.get(
        `/customer_booking/${targetId}`
    )

    return response.data
}


// =========================================================
// GET OCCUPANCY RATE
// =========================================================
//
// Backend:
// GET /api/occupancy_rate/<target_id>
//
// Compares customers with available departure capacity.
//
// =========================================================

export const getOccupancyRate = async (
    targetId,
    accessToken
) => {

    void accessToken

    const response = await api.get(
        `/occupancy_rate/${targetId}`
    )

    return response.data
}


// =========================================================
// GET BOOKING GROWTH
// =========================================================
//
// Backend:
// GET /api/booking_growth/<target_id>
//
// Compares the selected period with the previous
// equal-length period.
//
// =========================================================

export const getBookingGrowth = async (
    targetId,
    accessToken
) => {

    void accessToken

    const response = await api.get(
        `/booking_growth/${targetId}`
    )

    return response.data
}


// =========================================================
// GET CUSTOMER GROWTH
// =========================================================
//
// Backend:
// GET /api/customer_growth/<target_id>
//
// Compares customer activity with the previous
// equal-length period.
//
// =========================================================

export const getCustomerGrowth = async (
    targetId,
    accessToken
) => {

    void accessToken

    const response = await api.get(
        `/customer_growth/${targetId}`
    )

    return response.data
}


// =========================================================
// GET AVERAGE TRIP DURATION
// =========================================================
//
// Backend:
// GET /api/average_trip/<target_id>
//
// Calculates the average duration of completed trips.
//
// =========================================================

export const getAverageTripDuration = async (
    targetId,
    accessToken
) => {

    void accessToken

    const response = await api.get(
        `/average_trip/${targetId}`
    )

    return response.data
}


// =========================================================
// GET REVENUE BY TOUR
// =========================================================
//
// Backend:
// GET /api/revenue_tour/<target_id>
//
// Returns the revenue generated by individual tours.
//
// =========================================================

export const getRevenueByTour = async (
    targetId,
    accessToken
) => {

    void accessToken

    const response = await api.get(
        `/revenue_tour/${targetId}`
    )

    return response.data
}