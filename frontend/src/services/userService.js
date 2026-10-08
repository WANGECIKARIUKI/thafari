// =========================================================
// THAFARI USER SERVICE
// =========================================================
//
// This file contains frontend API functions for admin
// user management.
//
// Supported actions:
//
// - Get customers and tour operators
// - Change customer -> tour operator
// - Change tour operator -> customer
//
// Authentication is handled automatically by api.js using
// the HttpOnly authentication cookie.
//
// The accessToken parameters are retained only for
// compatibility with existing components.
//
// They are NOT used as credentials.
//
// The backend remains responsible for:
// - Authentication
// - Admin authorization
// - User-role validation
// - Permission checks
//
// =========================================================

import api from "./api"


// =========================================================
// GET MANAGEABLE USERS
// =========================================================
//
// Retrieves customers and tour operators for the admin
// user-management page.
//
// Backend:
//
// GET /api/auth/users
//
// Because the api instance already uses the backend API
// prefix, the frontend path here is:
//
// /auth/users
//
// =========================================================

export const getManageableUsers = async (
    accessToken
) => {

    // Compatibility only.
    // Authentication is handled by the HttpOnly cookie.
    void accessToken

    const response = await api.get(
        "/auth/users"
    )

    return response.data
}


// =========================================================
// CHANGE USER ROLE
// =========================================================
//
// Changes:
//
// customer -> tour_operator
//
// OR:
//
// tour_operator -> customer
//
// Backend:
//
// PATCH /api/auth/users/<user_id>/role
//
// The api.js request interceptor automatically adds the
// CSRF token required for this PATCH request.
//
// =========================================================

export const updateUserRole = async (
    userId,
    role,
    accessToken
) => {

    // Compatibility only.
    // Authentication is handled by the HttpOnly cookie.
    void accessToken

    const response = await api.patch(
        `/auth/users/${userId}/role`,
        {
            role: role,
        }
    )

    return response.data
}