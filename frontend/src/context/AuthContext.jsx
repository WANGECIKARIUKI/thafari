// =========================================================
// THAFARI AUTHENTICATION CONTEXT
// =========================================================
//
// This file manages authentication for the entire React
// application.
//
// IMPORTANT SECURITY CHANGE:
//
// Authentication JWTs are NO LONGER stored in localStorage
// and are NO LONGER exposed to JavaScript.
//
// Flask now stores the access and refresh JWTs in secure
// HttpOnly cookies.
//
// This context therefore stores only:
// - Logged-in user
// - Authentication status
// - Authentication loading state
// - Login
// - Logout
//
// It also restores the logged-in user after a browser refresh
// by asking the backend to identify the current cookie session.
//
// IMPORTANT ROLE BEHAVIOUR:
//
// CUSTOMER
// - Has a 15-minute inactivity timeout.
//
// ADMIN
// - Does NOT have the customer inactivity timeout.
//
// TOUR OPERATOR
// - Does NOT have the customer inactivity timeout.
//
// The login function returns the authenticated user so
// Login.jsx can decide where the user should go after login.
//
// NOTE:
// accessToken is retained in the context temporarily as a
// NON-SECRET compatibility marker for existing components
// that still expect the property to exist.
//
// It is NOT the real JWT.
// The real JWT never enters React state or localStorage.
// =========================================================


import {
    createContext,
    useContext,
    useEffect,
    useRef,
    useState,
} from "react"


import {
    loginUser,
    getCurrentUser,
} from "../services/authService"


import api from "../services/api"


// =========================================================
// CREATE AUTH CONTEXT
// =========================================================

const AuthContext = createContext(null)


// =========================================================
// READ CSRF COOKIE
// =========================================================
//
// JWT authentication cookies are HttpOnly and cannot be read
// by JavaScript.
//
// Flask-JWT-Extended also creates a separate CSRF cookie.
// That cookie is intentionally readable by JavaScript so the
// frontend can send the value in the X-CSRF-TOKEN header.
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
// AUTH PROVIDER
// =========================================================

export function AuthProvider({ children }) {

    // ---------------------------------------------------------
    // AUTHENTICATION STATE
    // ---------------------------------------------------------
    //
    // There are NO JWT values here.
    //
    // The compatibility marker is only used so older parts of
    // the frontend that expect an "accessToken" property do
    // not immediately crash during this migration.
    // ---------------------------------------------------------

    const [accessToken, setAccessToken] =
        useState(null)


    // Refresh token is deliberately removed from React state.
    //
    // The real refresh token lives only inside the HttpOnly
    // browser cookie managed by Flask.
    const refreshToken = null


    const [user, setUser] =
        useState(null)


    // ---------------------------------------------------------
    // USER LOADING STATE
    // ---------------------------------------------------------
    //
    // We start in the loading state because the browser may
    // already have a valid authentication cookie.
    //
    // The backend is responsible for telling us whether the
    // current browser session is authenticated.
    // ---------------------------------------------------------

    const [authLoading, setAuthLoading] =
        useState(true)


    // =========================================================
    // LOGOUT
    // =========================================================
    //
    // The logout request is sent to Flask.
    //
    // Flask:
    // 1. Reads the JWT cookies.
    // 2. Revokes the access JWT.
    // 3. Revokes the refresh JWT when available.
    // 4. Clears the authentication cookies.
    //
    // JavaScript never receives either JWT.
    // =========================================================

    const logout = async () => {

        // -----------------------------------------------------
        // DETERMINE WHERE THE USER SHOULD GO AFTER LOGOUT
        // -----------------------------------------------------
        //
        // Admins and tour operators return to the login page.
        //
        // Customers return to the public Thafari home page.
        //
        // We determine the destination BEFORE clearing the user.
        // -----------------------------------------------------

        const logoutDestination =
            user?.role === "admin" ||
            user?.role === "tour_operator"
                ? "/login"
                : "/"


        // -----------------------------------------------------
        // GET CSRF TOKEN
        // -----------------------------------------------------
        //
        // This token is NOT the JWT.
        //
        // It is specifically used to protect cookie-authenticated
        // state-changing requests from CSRF attacks.
        // -----------------------------------------------------

        const csrfToken =
            getCookieValue(
                "thafari_csrf_access"
            )


        try {

            // -------------------------------------------------
            // ASK BACKEND TO LOG OUT
            // -------------------------------------------------

            await api.post(
                "/auth/logout",
                {},
                csrfToken
                    ? {
                        headers: {
                            "X-CSRF-TOKEN":
                                csrfToken,
                        },
                    }
                    : undefined
            )

        } catch (error) {

            // -------------------------------------------------
            // LOGOUT FAILURE
            // -------------------------------------------------
            //
            // Even if the network request fails, clear local
            // React authentication state so the user is not
            // left viewing an authenticated UI.
            //
            // The browser may still hold a cookie if the server
            // did not receive the logout request, so the next
            // authentication restoration will determine the
            // real server-side session state.
            // -------------------------------------------------

            console.error(
                "Logout request failed:",
                error
            )

        } finally {

            // -------------------------------------------------
            // CLEAR FRONTEND AUTHENTICATION STATE
            // -------------------------------------------------

            setAccessToken(null)

            setUser(null)

            setAuthLoading(false)


            // -------------------------------------------------
            // REDIRECT
            // -------------------------------------------------

            window.location.href =
                logoutDestination
        }
    }


    // =========================================================
    // RESTORE USER AFTER PAGE REFRESH
    // =========================================================
    //
    // When the browser refreshes, React state disappears.
    //
    // The HttpOnly JWT cookie remains inside the browser.
    //
    // We ask Flask for /auth/me and Flask reads the cookie.
    // =========================================================

    useEffect(() => {

        // -----------------------------------------------------
        // REMOVE LEGACY LOCALSTORAGE TOKENS
        // -----------------------------------------------------
        //
        // These keys may still exist from an older Thafari
        // session before the security migration.
        //
        // They are not used anymore.
        // -----------------------------------------------------

        localStorage.removeItem(
            "thafari_access_token"
        )

        localStorage.removeItem(
            "thafari_refresh_token"
        )


        // -----------------------------------------------------
        // RESTORE AUTHENTICATED USER
        // -----------------------------------------------------

        const restoreUser = async () => {

            try {

                // -------------------------------------------------
                // ASK FLASK WHO OWNS THE CURRENT COOKIE SESSION
                // -------------------------------------------------

                const currentUser =
                    await getCurrentUser()


                // -------------------------------------------------
                // NORMALIZE USER RESPONSE
                // -------------------------------------------------

                const authenticatedUser =
                    currentUser.user ||
                    currentUser


                // -------------------------------------------------
                // SAVE USER
                // -------------------------------------------------

                setUser(
                    authenticatedUser
                )


                // -------------------------------------------------
                // NON-SECRET COMPATIBILITY MARKER
                // -------------------------------------------------
                //
                // Existing frontend code still expects an
                // accessToken property.
                //
                // IMPORTANT:
                // This value is NOT a JWT and cannot be used
                // to authenticate without the browser cookie.
                // -------------------------------------------------

                setAccessToken(
                    "cookie-authenticated"
                )

            } catch (error) {

                // -------------------------------------------------
                // NO VALID AUTHENTICATED SESSION
                // -------------------------------------------------

                console.info(
                    "No active Thafari authentication session.",
                    error
                )

                setAccessToken(null)
                setUser(null)

            } finally {

                // -------------------------------------------------
                // AUTHENTICATION RESTORATION IS COMPLETE
                // -------------------------------------------------

                setAuthLoading(false)
            }
        }


        restoreUser()

    }, [])


    // =========================================================
    // CUSTOMER INACTIVITY TIMEOUT
    // =========================================================
    //
    // Customers are automatically logged out after 15 minutes
    // without activity.
    //
    // Activity includes:
    //
    // - Mouse movement
    // - Mouse clicks
    // - Keyboard input
    // - Scrolling
    // - Touch interaction
    //
    // Admins and tour operators are intentionally excluded.
    // =========================================================

    const inactivityTimerRef =
        useRef(null)


    useEffect(() => {

        // -----------------------------------------------------
        // ONLY CUSTOMERS USE THE INACTIVITY TIMER
        // -----------------------------------------------------

        if (
            !user ||
            user.role !== "customer"
        ) {

            // Clear any existing timer.
            if (
                inactivityTimerRef.current
            ) {

                clearTimeout(
                    inactivityTimerRef.current
                )

                inactivityTimerRef.current =
                    null
            }

            return
        }


        // -----------------------------------------------------
        // INACTIVITY LIMIT
        // -----------------------------------------------------
        //
        // 15 minutes:
        //
        // 15 minutes
        // × 60 seconds
        // × 1000 milliseconds
        //
        // During testing you can temporarily use:
        //
        // const INACTIVITY_LIMIT = 30 * 1000
        //
        // Then change it back to 15 minutes.
        // -----------------------------------------------------

        const INACTIVITY_LIMIT =
            15 * 60 * 1000


        // -----------------------------------------------------
        // HANDLE CUSTOMER INACTIVITY
        // -----------------------------------------------------

        const handleInactivityLogout =
            async () => {

                console.log(
                    "Customer session expired after 15 minutes of inactivity."
                )

                await logout()
            }


        // -----------------------------------------------------
        // RESET INACTIVITY TIMER
        // -----------------------------------------------------

        const resetInactivityTimer =
            () => {

                // Clear the previous timer.
                if (
                    inactivityTimerRef.current
                ) {

                    clearTimeout(
                        inactivityTimerRef.current
                    )
                }


                // Start a new inactivity countdown.
                inactivityTimerRef.current =
                    setTimeout(
                        handleInactivityLogout,
                        INACTIVITY_LIMIT
                    )
            }


        // -----------------------------------------------------
        // USER ACTIVITY EVENTS
        // -----------------------------------------------------

        const activityEvents = [
            "mousemove",
            "mousedown",
            "keydown",
            "scroll",
            "touchstart",
            "click",
        ]


        // Add the activity listeners.
        activityEvents.forEach(
            (eventName) => {

                window.addEventListener(
                    eventName,
                    resetInactivityTimer,
                    {
                        passive: true,
                    }
                )
            }
        )


        // Start the initial countdown.
        resetInactivityTimer()


        // -----------------------------------------------------
        // CLEANUP
        // -----------------------------------------------------

        return () => {

            // Clear the timer.
            if (
                inactivityTimerRef.current
            ) {

                clearTimeout(
                    inactivityTimerRef.current
                )

                inactivityTimerRef.current =
                    null
            }


            // Remove all activity listeners.
            activityEvents.forEach(
                (eventName) => {

                    window.removeEventListener(
                        eventName,
                        resetInactivityTimer
                    )
                }
            )
        }

    }, [user])


    // =========================================================
    // LOGIN
    // =========================================================
    //
    // This function:
    //
    // 1. Sends credentials to Flask.
    // 2. Flask creates the JWTs.
    // 3. Flask stores both JWTs in HttpOnly cookies.
    // 4. The frontend asks Flask for the authenticated user.
    // 5. The user is saved in React state.
    // 6. The user is returned to Login.jsx.
    //
    // IMPORTANT:
    //
    // The frontend does NOT receive or store either JWT.
    // =========================================================

    const login = async (credentials) => {

        // Authentication is currently being processed.
        setAuthLoading(true)


        try {

            // -------------------------------------------------
            // SEND LOGIN REQUEST
            // -------------------------------------------------
            //
            // loginUser uses the Axios client with
            // withCredentials enabled, so Flask can set the
            // authentication cookies.
            // -------------------------------------------------

            await loginUser(
                credentials
            )


            // -------------------------------------------------
            // GET CURRENT USER
            // -------------------------------------------------
            //
            // The browser automatically sends the HttpOnly
            // access cookie to Flask.
            // -------------------------------------------------

            const currentUser =
                await getCurrentUser()


            // -------------------------------------------------
            // NORMALIZE USER RESPONSE
            // -------------------------------------------------

            const authenticatedUser =
                currentUser.user ||
                currentUser


            // -------------------------------------------------
            // SAVE USER
            // -------------------------------------------------

            setUser(
                authenticatedUser
            )


            // -------------------------------------------------
            // NON-SECRET COMPATIBILITY MARKER
            // -------------------------------------------------
            //
            // This replaces the old real access token in React
            // state.
            //
            // It is intentionally NOT an authentication secret.
            // -------------------------------------------------

            setAccessToken(
                "cookie-authenticated"
            )


            // -------------------------------------------------
            // RETURN USER
            // -------------------------------------------------
            //
            // Login.jsx uses this to determine whether to send
            // the user to:
            //
            // Customer → Home
            // Admin → Dashboard
            // Tour Operator → Dashboard
            // -------------------------------------------------

            return authenticatedUser

        } catch (error) {

            // -------------------------------------------------
            // CLEAR AUTHENTICATION STATE IF LOGIN FAILED
            // -------------------------------------------------

            setAccessToken(null)
            setUser(null)

            throw error

        } finally {

            // Login/authentication process is finished.
            setAuthLoading(false)
        }
    }


    // =========================================================
    // AUTHENTICATION STATUS
    // =========================================================
    //
    // Authentication is based on the authenticated user in
    // React state, not on a token stored in JavaScript.
    // =========================================================

    const isAuthenticated =
        Boolean(user)


    // =========================================================
    // PROVIDE AUTH DATA
    // =========================================================

    return (

        <AuthContext.Provider
            value={{
                // Temporary compatibility property.
                //
                // IMPORTANT:
                // This is NEVER the real JWT.
                accessToken,

                // The real refresh JWT is HttpOnly and never
                // enters JavaScript.
                refreshToken,

                user,
                isAuthenticated,
                authLoading,
                login,
                logout,
            }}
        >

            {children}

        </AuthContext.Provider>
    )
}


// =========================================================
// USE AUTH HOOK
// =========================================================
//
// This custom hook gives components access to AuthContext.
// =========================================================


// The ESLint rule below is disabled for this export because
// this file intentionally contains both:
//
// - AuthProvider — the React component
// - useAuth — the custom hook used by the application
//
// This does not affect the functionality of the hook.
// =========================================================

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {

    const context =
        useContext(AuthContext)


    if (!context) {

        throw new Error(
            "useAuth must be used inside an AuthProvider."
        )
    }


    return context
}