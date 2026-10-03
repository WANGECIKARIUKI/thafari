// =========================================================
// THAFARI DEPARTURE SERVICE
// =========================================================
//
// This file contains API requests related to departures.
//
// A departure is a specific scheduled trip belonging to a
// tour.
//
// Example:
//
// Tour:
//     Maasai Mara Safari
//
// Departures:
//     10 Oct → 12 Oct
//     15 Nov → 17 Nov
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
// =========================================================

export const getManageableDepartures = async (
    accessToken,
    tourId
) => {

    const response = await api.get(
        `/tours/${tourId}/departures/manage`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        }
    )

    return response.data
}


// =========================================================
// CREATE DEPARTURE
// =========================================================
//
// POST /api/departure
// =========================================================

export const createDeparture = async (
    accessToken,
    departureData
) => {

    const response = await api.post(
        "/departure",
        departureData,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        }
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

    const response = await api.patch(
        `/departures/${departureId}`,
        departureData,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        }
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

    const response = await api.delete(
        `/departures/${departureId}`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        }
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

    const response = await api.patch(
        `/departures/${departureId}/reactivate`,
        {},
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        }
    )

    return response.data
}