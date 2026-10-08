// =========================================================
// THAFARI SERVICE API
// =========================================================
//
// This file contains all frontend API functions related
// to services offered by Thafari.
//
// Authentication is handled automatically by api.js using
// HttpOnly authentication cookies.
//
// The accessToken parameters are retained only for
// compatibility with existing components that may still
// pass them. They are not used as credentials.
//
// =========================================================

import api from "./api"


// =========================================================
// GET PUBLIC SERVICES
// =========================================================
//
// Backend endpoint:
// GET /api/services
//
// No authentication is required.
//
// Only active services are returned.
// =========================================================

export const getServices = async () => {

    const response = await api.get(
        "/services"
    )

    return response.data
}


// =========================================================
// GET ALL ADMIN SERVICES
// =========================================================
//
// Backend endpoint:
// GET /api/admin/services
//
// Admin only.
//
// Returns both active and inactive services.
//
// =========================================================

export const getAdminServices = async (
    accessToken
) => {

    // Compatibility only.
    // Authentication is handled by the HttpOnly cookie.
    void accessToken

    const response = await api.get(
        "/admin/services"
    )

    return response.data
}


// =========================================================
// CREATE SERVICE
// =========================================================
//
// Backend endpoint:
// POST /api/admin/services
//
// Expected service data:
//
// {
//     name: "Safari & Tour Bookings",
//     description: "Book unforgettable safari experiences.",
//     is_active: true,
//     image_url: "...",
//     link_url: "/tours",
//     link_label: "Explore Safaris"
// }
//
// =========================================================

export const createService = async (
    accessToken,
    serviceData
) => {

    // Compatibility only.
    // Authentication is handled by the HttpOnly cookie.
    void accessToken

    const response = await api.post(
        "/admin/services",
        serviceData
    )

    return response.data
}


// =========================================================
// UPDATE SERVICE
// =========================================================
//
// Backend endpoint:
// PUT /api/admin/services/<service_id>
//
// Can update service details such as:
//
// - name
// - description
// - is_active
// - image_url
// - link_url
// - link_label
//
// =========================================================

export const updateService = async (
    accessToken,
    serviceId,
    serviceData
) => {

    // Compatibility only.
    // Authentication is handled by the HttpOnly cookie.
    void accessToken

    const response = await api.put(
        `/admin/services/${serviceId}`,
        serviceData
    )

    return response.data
}


// =========================================================
// DEACTIVATE SERVICE
// =========================================================
//
// This is a soft delete.
//
// The service remains in the database but is hidden
// from the public website.
//
// Backend endpoint:
// PUT /api/admin/services/<service_id>
// =========================================================

export const deactivateService = async (
    accessToken,
    serviceId
) => {

    // Compatibility only.
    // Authentication is handled by the HttpOnly cookie.
    void accessToken

    const response = await api.put(
        `/admin/services/${serviceId}`,
        {
            is_active: false,
        }
    )

    return response.data
}


// =========================================================
// REACTIVATE SERVICE
// =========================================================
//
// Makes the service visible on the public website again.
//
// Backend endpoint:
// PUT /api/admin/services/<service_id>
// =========================================================

export const reactivateService = async (
    accessToken,
    serviceId
) => {

    // Compatibility only.
    // Authentication is handled by the HttpOnly cookie.
    void accessToken

    const response = await api.put(
        `/admin/services/${serviceId}`,
        {
            is_active: true,
        }
    )

    return response.data
}


// =========================================================
// REMOVE SERVICE
// =========================================================
//
// Permanently removes a service from the database.
//
// Backend endpoint:
// DELETE /api/admin/services/<service_id>
//
// Use this only when the service should no longer exist.
//
// For temporary removal from the website, use
// deactivateService() instead.
//
// =========================================================

export const deleteService = async (
    accessToken,
    serviceId
) => {

    // Compatibility only.
    // Authentication is handled by the HttpOnly cookie.
    void accessToken

    const response = await api.delete(
        `/admin/services/${serviceId}`
    )

    return response.data
}