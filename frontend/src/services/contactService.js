// =========================================================
// THAFARI CONTACT API
// =========================================================
//
// This file contains all frontend API functions related
// to Thafari contact details.
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
// GET PUBLIC CONTACT DETAILS
// =========================================================
//
// Backend endpoint:
// GET /api/contact
//
// No authentication is required.
//
// Used by the public website to display the current
// Thafari WhatsApp number, email address and phone number.
//
// =========================================================

export const getContact = async () => {

    const response = await api.get(
        "/contact"
    )

    return response.data
}


// =========================================================
// GET ADMIN CONTACT DETAILS
// =========================================================
//
// Backend endpoint:
// GET /api/admin/contact
//
// Admin only.
//
// The backend determines whether the authenticated user
// has permission to access this resource.
//
// =========================================================

export const getAdminContact = async (
    accessToken
) => {

    // Compatibility only.
    // Authentication is handled by the HttpOnly cookie.
    void accessToken

    const response = await api.get(
        "/admin/contact"
    )

    return response.data
}


// =========================================================
// UPDATE ADMIN CONTACT DETAILS
// =========================================================
//
// Backend endpoint:
// PUT /api/admin/contact
//
// Expected data:
//
// {
//     whatsapp: "+254 700 000 000",
//     email: "hello@thafari.com",
//     phone_number: "+254 700 000 000"
// }
//
// The backend creates the first contact record when one
// does not exist yet, or updates the existing record.
//
// The api.js request interceptor automatically adds the
// CSRF token required for this PUT request.
//
// =========================================================

export const updateAdminContact = async (
    accessToken,
    contactData
) => {

    // Compatibility only.
    // Authentication is handled by the HttpOnly cookie.
    void accessToken

    const response = await api.put(
        "/admin/contact",
        contactData
    )

    return response.data
}