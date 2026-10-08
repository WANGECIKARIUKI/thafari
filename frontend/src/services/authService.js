// =========================================================
// THAFARI AUTH SERVICE
// =========================================================
//
// This file contains API requests related to authentication.
//
// IMPORTANT SECURITY CHANGE:
//
// Authentication JWTs are stored by Flask in secure
// HttpOnly cookies.
//
// JavaScript does NOT:
// - receive the JWT
// - store the JWT
// - read the JWT
// - send the JWT in an Authorization header
//
// The browser automatically sends the authentication cookies
// because api.js uses withCredentials: true.
//
// The separate CSRF cookie CAN be read by JavaScript.
// It is used only to protect state-changing requests.
//
// =========================================================

import api from "./api"


// =========================================================
// CSRF COOKIE HELPER
// =========================================================
//
// JWT cookies are HttpOnly and cannot be read by JavaScript.
//
// Flask-JWT-Extended creates a separate CSRF cookie which
// JavaScript is allowed to read.
//
// We send that value in the X-CSRF-TOKEN header for protected
// state-changing authentication requests.
//
// =========================================================

const getCookieValue = (name) => {

    const cookies =
        document.cookie.split("; ")

    const matchingCookie =
        cookies.find(
            (cookie) =>
                cookie.startsWith(`${name}=`)
        )

    if (!matchingCookie) {
        return null
    }

    return decodeURIComponent(
        matchingCookie.substring(
            name.length + 1
        )
    )
}


// =========================================================
// REGISTER USER
// =========================================================
//
// Sends registration data to the Flask backend.
//
// No JWT is required for registration.
//
// =========================================================

export const registerUser = async (userData) => {

    const response =
        await api.post(
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
//
// IMPORTANT:
//
// Flask now places the access and refresh JWTs into HttpOnly
// cookies.
//
// Therefore this function does NOT return JWTs to JavaScript.
//
// It only returns the safe response from Flask.
//
// =========================================================

export const loginUser = async (credentials) => {

    const response =
        await api.post(
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
// Backend endpoint:
//
// GET /api/auth/me
//
// The browser automatically sends the HttpOnly access JWT
// cookie.
//
// JavaScript does NOT need to provide an access token.
//
// =========================================================

export const getCurrentUser = async () => {

    const response =
        await api.get(
            "/auth/me"
        )

    return response.data
}


// =========================================================
// REFRESH ACCESS TOKEN
// =========================================================
//
// Backend endpoint:
//
// POST /api/auth/refresh
//
// The browser automatically sends the HttpOnly refresh JWT.
//
// The CSRF token belonging to the refresh cookie is sent in
// the X-CSRF-TOKEN header.
//
// Flask creates a new access JWT and replaces the access
// cookie.
//
// The new access JWT is NEVER returned to JavaScript.
//
// =========================================================

export const refreshAccessToken = async () => {

    // ---------------------------------------------------------
    // GET REFRESH CSRF TOKEN
    // ---------------------------------------------------------

    const csrfToken =
        getCookieValue(
            "thafari_csrf_refresh"
        )


    // ---------------------------------------------------------
    // BUILD REQUEST CONFIG
    // ---------------------------------------------------------

    const requestConfig =
        csrfToken
            ? {
                headers: {
                    "X-CSRF-TOKEN":
                        csrfToken,
                },
            }
            : undefined


    // ---------------------------------------------------------
    // SEND REFRESH REQUEST
    // ---------------------------------------------------------

    const response =
        await api.post(
            "/auth/refresh",
            {},
            requestConfig
        )

    return response.data
}


// =========================================================
// LOGOUT USER
// =========================================================
//
// Backend endpoint:
//
// POST /api/auth/logout
//
// The browser automatically sends the HttpOnly access and
// refresh cookies.
//
// The access-cookie CSRF token is sent in the request header.
//
// Flask will:
// - revoke the access JWT
// - revoke the refresh JWT
// - clear both authentication cookies
//
// =========================================================

export const logoutUser = async () => {

    // ---------------------------------------------------------
    // GET ACCESS CSRF TOKEN
    // ---------------------------------------------------------

    const csrfToken =
        getCookieValue(
            "thafari_csrf_access"
        )


    // ---------------------------------------------------------
    // BUILD REQUEST CONFIG
    // ---------------------------------------------------------

    const requestConfig =
        csrfToken
            ? {
                headers: {
                    "X-CSRF-TOKEN":
                        csrfToken,
                },
            }
            : undefined


    // ---------------------------------------------------------
    // SEND LOGOUT REQUEST
    // ---------------------------------------------------------

    const response =
        await api.post(
            "/auth/logout",
            {},
            requestConfig
        )

    return response.data
}