// =========================================================
// THAFARI API CLIENT
// =========================================================
//
// Central Axios configuration for communicating with the
// Flask backend.
//
// SECURITY UPDATE:
//
// Thafari now uses JWT authentication through HttpOnly cookies.
//
// JavaScript does NOT:
// - receive the JWT
// - store the JWT
// - read the JWT
// - send the JWT in an Authorization header
//
// The browser automatically sends the authentication cookies
// because withCredentials is enabled.
//
// Because cookie authentication is vulnerable to CSRF,
// Flask-JWT-Extended also gives us a separate CSRF cookie.
//
// That CSRF cookie is intentionally readable by JavaScript.
//
// This file automatically reads the CSRF cookie and sends it
// in the X-CSRF-TOKEN header for protected state-changing
// requests.
//
// =========================================================


import axios from "axios"


// =========================================================
// BACKEND URL
// =========================================================
//
// Vite exposes variables beginning with VITE_ through
// import.meta.env.
//

const API_URL =
    import.meta.env.VITE_API_URL


// =========================================================
// CREATE AXIOS INSTANCE
// =========================================================
//
// withCredentials: true is REQUIRED so the browser sends
// Thafari's HttpOnly authentication cookies to the Flask API.
//

const api = axios.create({

    baseURL: API_URL,

    // Allow browser cookies to be sent with API requests.
    withCredentials: true,

    headers: {
        "Content-Type": "application/json",
    },

})


// =========================================================
// CSRF COOKIE HELPER
// =========================================================
//
// The authentication JWT cookies are HttpOnly and therefore
// CANNOT be read by JavaScript.
//
// The CSRF cookies are different:
// they are intentionally readable by JavaScript.
//
// We use the CSRF cookie value and place it into:
//
//     X-CSRF-TOKEN
//
// Flask-JWT-Extended then verifies that the CSRF header matches
// the CSRF value stored with the JWT cookie.
// =========================================================

const getCookieValue = (name) => {

    if (
        typeof document === "undefined"
    ) {

        return null
    }


    const cookies =
        document.cookie.split("; ")


    const matchingCookie =
        cookies.find(
            (cookie) =>
                cookie.startsWith(
                    `${name}=`
                )
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
// GET CSRF TOKEN FOR REQUEST
// =========================================================
//
// Most authenticated requests use the ACCESS JWT cookie.
//
// Therefore we normally use:
//
//     thafari_csrf_access
//
// The refresh endpoint is special because it is authenticated
// using the REFRESH JWT cookie.
//
// Therefore /auth/refresh uses:
//
//     thafari_csrf_refresh
// =========================================================

const getCsrfTokenForRequest = (config) => {

    const requestUrl =
        config?.url || ""


    // -----------------------------------------------------
    // REFRESH REQUEST
    // -----------------------------------------------------

    if (
        requestUrl.includes(
            "/auth/refresh"
        )
    ) {

        return getCookieValue(
            "thafari_csrf_refresh"
        )

    }


    // -----------------------------------------------------
    // NORMAL AUTHENTICATED REQUEST
    // -----------------------------------------------------

    return getCookieValue(
        "thafari_csrf_access"
    )

}


// =========================================================
// REQUEST INTERCEPTOR
// =========================================================
//
// Before every request, determine whether the request can
// change server-side state.
//
// GET / HEAD / OPTIONS are normally safe methods and do not
// need a CSRF token.
//
// POST / PUT / PATCH / DELETE can change data and therefore
// receive the CSRF token automatically.
// =========================================================

api.interceptors.request.use(

    (config) => {

        const method =
            (
                config.method || "get"
            ).toUpperCase()


        const unsafeMethods = [
            "POST",
            "PUT",
            "PATCH",
            "DELETE",
        ]


        // -------------------------------------------------
        // ONLY ADD CSRF HEADER TO STATE-CHANGING REQUESTS
        // -------------------------------------------------

        if (
            unsafeMethods.includes(method)
        ) {

            const csrfToken =
                getCsrfTokenForRequest(
                    config
                )


            if (csrfToken) {

                config.headers =
                    config.headers || {}


                config.headers[
                    "X-CSRF-TOKEN"
                ] = csrfToken

            }

        }


        return config

    },

    (error) => {

        return Promise.reject(
            error
        )

    }

)


// =========================================================
// EXPORT API CLIENT
// =========================================================

export default api