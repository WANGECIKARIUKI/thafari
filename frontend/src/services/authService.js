// =========================================================
// THAFARI AUTH SERVICE
// =========================================================
//
// This file contains API requests related to authentication.
//
// Keeping authentication requests here means our React pages
// don't need to know the exact backend URLs.
// =========================================================

import api from "./api"


// =========================================================
// REGISTER USER
// =========================================================
//
// Sends registration data to the Flask backend.
// =========================================================

export const registerUser = async (userData) => {

    const response = await api.post(
        "/auth/register",
        userData
    )

    return response.data
}


// =========================================================
// LOGIN USER
// =========================================================
//
// The Flask login endpoint expects:
//
// {
//     "login": "email@example.com",
//     "password": "password"
// }
//
// The "login" value can be either:
// - the user's email
// - the user's username
//
// Our frontend form uses the "email" property internally,
// so we convert it into the "login" property expected by
// Flask.
// =========================================================

export const loginUser = async (credentials) => {

    const response = await api.post(
        "/auth/login",
        {
            login: credentials.email,
            password: credentials.password,
        }
    )

    return response.data
}


// =========================================================
// GET CURRENT USER
// =========================================================
//
// This calls:
//
// GET /api/auth/me
//
// The access token is sent in the Authorization header.
//
// The backend uses the JWT to determine which user is
// currently authenticated.
// =========================================================

export const getCurrentUser = async (accessToken) => {

    const response = await api.get(
        "/auth/me",
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        }
    )

    return response.data
}