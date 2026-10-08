// =========================================================
// THAFARI DEPARTURE SERVICE
// =========================================================
//
// This file contains API requests related to departures.
//
// A departure is a specific scheduled trip belonging to a
// tour.
//
// Authentication is handled automatically by api.js using
// the HttpOnly authentication cookie.
//
// The accessToken parameters are retained only for
// compatibility with existing components.
//
// They are NOT used as credentials.
//
// =========================================================

import api from "./api"


// =========================================================
// GET PUBLIC TOUR DEPARTURES
// =========================================================
//
// Used by customers when viewing a tour.
//
// GET /api/tours/<tourId>/departures
//
// Only active upcoming departures are returned.
// =========================================================

export const getTourDepartures = async (
    tourId
) => {

    const response = await api.get(
        `/tours/${tourId}/departures`
    )

    return response.data
}


// =========================================================
// GET MANAGEABLE DEPARTURES
// =========================================================
//
// Used by Admin and Tour Operator management pages.
//
// GET /api/tours/<tourId>/departures/manage
//
// Admin:
//     Can access any tour.
//
// Tour operator:
//     Can access only their own tour.
//
// The backend is responsible for applying the correct
// role and ownership checks.
// =========================================================

export const getManageableDepartures = async (
    accessToken,
    tourId
) => {

    // Compatibility only.
    // Authentication is handled by the HttpOnly cookie.
    void accessToken

    const response = await api.get(
        `/tours/${tourId}/departures/manage`
    )

    return response.data
}


// =========================================================
// CREATE DEPARTURE
// =========================================================
//
// POST /api/departure
//
// The backend is responsible for authentication,
// authorization and tour ownership checks.
// =========================================================

export const createDeparture = async (
    accessToken,
    departureData
) => {

    // Compatibility only.
    // Authentication is handled by the HttpOnly cookie.
    void accessToken

    const response = await api.post(
        "/departure",
        departureData
    )

    return response.data
}


// =========================================================
// UPDATE DEPARTURE
// =========================================================
//
// PATCH /api/departures/<departureId>
// =========================================================

export const updateDeparture = async (
    accessToken,
    departureId,
    departureData
) => {

    // Compatibility only.
    // Authentication is handled by the HttpOnly cookie.
    void accessToken

    const response = await api.patch(
        `/departures/${departureId}`,
        departureData
    )

    return response.data
}


// =========================================================
// DEACTIVATE DEPARTURE
// =========================================================
//
// DELETE /api/departures/<departureId>
//
// This is a soft delete.
// =========================================================

export const deactivateDeparture = async (
    accessToken,
    departureId
) => {

    // Compatibility only.
    // Authentication is handled by the HttpOnly cookie.
    void accessToken

    const response = await api.delete(
        `/departures/${departureId}`
    )

    return response.data
}


// =========================================================
// REACTIVATE DEPARTURE
// =========================================================
//
// PATCH /api/departures/<departureId>/reactivate
// =========================================================

export const reactivateDeparture = async (
    accessToken,
    departureId
) => {

    // Compatibility only.
    // Authentication is handled by the HttpOnly cookie.
    void accessToken

    const response = await api.patch(
        `/departures/${departureId}/reactivate`,
        {}
    )

    return response.data
}