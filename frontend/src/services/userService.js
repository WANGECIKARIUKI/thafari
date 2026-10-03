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
// Backend endpoints:
//
// GET   /api/auth/users
// PATCH /api/auth/users/<user_id>/role
//
// Only the backend can authorize the operation.
// The frontend simply sends the authenticated admin token.
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
// GET /api/auth/users
//
// Because the api instance already uses the backend API
// prefix, the frontend path here is simply:
//
// /auth/users
//
// =========================================================

export const getManageableUsers = async (
    accessToken
) => {

    const response = await api.get(
        "/auth/users",
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
// PATCH /api/auth/users/<user_id>/role
//
// =========================================================

export const updateUserRole = async (
    userId,
    role,
    accessToken
) => {

    const response = await api.patch(
        `/auth/users/${userId}/role`,
        {
            role: role,
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