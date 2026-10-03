// =========================================================
// THAFARI AUTHENTICATION CONTEXT
// =========================================================
//
// This file manages authentication for the entire React
// application.
//
// It stores:
// - Access token
// - Refresh token
// - Logged-in user
// - Login
// - Logout
//
// It also restores the logged-in user after a browser refresh.
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


// =========================================================
// CREATE AUTH CONTEXT
// =========================================================

const AuthContext = createContext(null)


// =========================================================
// AUTH PROVIDER
// =========================================================

export function AuthProvider({ children }) {

    // ---------------------------------------------------------
    // GET SAVED TOKENS
    // ---------------------------------------------------------
    //
    // These are read when the application starts.
    //
    // If tokens exist, we attempt to restore the user below.
    // ---------------------------------------------------------

    const savedAccessToken =
        localStorage.getItem("thafari_access_token")


    const savedRefreshToken =
        localStorage.getItem("thafari_refresh_token")


    // ---------------------------------------------------------
    // AUTHENTICATION STATE
    // ---------------------------------------------------------

    const [accessToken, setAccessToken] =
        useState(savedAccessToken)


    const [refreshToken, setRefreshToken] =
        useState(savedRefreshToken)


    const [user, setUser] =
        useState(null)


    // ---------------------------------------------------------
    // USER LOADING STATE
    // ---------------------------------------------------------
    //
    // If an access token exists, authentication restoration
    // starts in the loading state.
    //
    // If there is no access token, authentication is already
    // known to be finished.
    // ---------------------------------------------------------

    const [authLoading, setAuthLoading] =
        useState(Boolean(savedAccessToken))


    // =========================================================
    // LOGOUT
    // =========================================================
    //
    // This function is declared before the inactivity effect
    // because the inactivity timer uses it.
    // =========================================================

    const logout = () => {

        // -----------------------------------------------------
        // DETERMINE WHERE THE USER SHOULD GO AFTER LOGOUT
        // -----------------------------------------------------
        //
        // Admins and tour operators return to the login page.
        //
        // Customers return to the public Thafari home page.
        //
        // We determine the destination BEFORE clearing the user
        // from React state.
        // -----------------------------------------------------

        const logoutDestination =
            user?.role === "admin" ||
            user?.role === "tour_operator"
                ? "/login"
                : "/"


        // -----------------------------------------------------
        // REMOVE ACCESS TOKEN
        // -----------------------------------------------------

        localStorage.removeItem(
            "thafari_access_token"
        )


        // -----------------------------------------------------
        // REMOVE REFRESH TOKEN
        // -----------------------------------------------------

        localStorage.removeItem(
            "thafari_refresh_token"
        )


        // -----------------------------------------------------
        // CLEAR REACT AUTHENTICATION STATE
        // -----------------------------------------------------

        setAccessToken(null)

        setRefreshToken(null)

        setUser(null)


        // -----------------------------------------------------
        // AUTHENTICATION RESTORATION IS COMPLETE
        // -----------------------------------------------------

        setAuthLoading(false)


        // -----------------------------------------------------
        // REDIRECT AFTER LOGOUT
        // -----------------------------------------------------
        //
        // Admin / Tour Operator → Login
        // Customer → Home
        //
        // Using window.location.href also ensures the application
        // starts from a clean unauthenticated state.
        // -----------------------------------------------------

        window.location.href =
            logoutDestination
    }


    // =========================================================
    // RESTORE USER AFTER PAGE REFRESH
    // =========================================================
    //
    // When the browser refreshes, React state is lost.
    //
    // localStorage still contains the access token, so we use
    // that token to ask Flask for the current user.
    // =========================================================

    useEffect(() => {

        // -----------------------------------------------------
        // THERE IS NOTHING TO RESTORE
        // -----------------------------------------------------
        //
        // authLoading is already initialized to false when
        // there is no saved access token.
        //
        // Therefore we do NOT call setAuthLoading(false) here.
        // This avoids the React cascading-render warning.
        // -----------------------------------------------------

        if (!accessToken) {

            return
        }


        // -----------------------------------------------------
        // USER ALREADY RESTORED
        // -----------------------------------------------------
        //
        // Nothing else needs to happen.
        // -----------------------------------------------------

        if (user) {

            return
        }


        // -----------------------------------------------------
        // RESTORE USER
        // -----------------------------------------------------

        const restoreUser = async () => {

            try {

                // Ask the backend who owns the access token.
                const currentUser =
                    await getCurrentUser(accessToken)


                // The backend may return the user directly
                // or inside a "user" property.
                const authenticatedUser =
                    currentUser.user || currentUser


                // Save the authenticated user.
                setUser(
                    authenticatedUser
                )

            } catch (error) {

                console.error(
                    "Failed to restore authenticated user:",
                    error
                )


                // -------------------------------------------------
                // INVALID SESSION
                // -------------------------------------------------
                //
                // If the saved token is no longer valid, remove
                // the saved authentication information.
                // -------------------------------------------------

                localStorage.removeItem(
                    "thafari_access_token"
                )


                localStorage.removeItem(
                    "thafari_refresh_token"
                )


                setAccessToken(null)

                setRefreshToken(null)

                setUser(null)

            } finally {

                // Authentication restoration has finished.
                setAuthLoading(false)
            }
        }


        restoreUser()

    }, [
        accessToken,
        user,
    ])


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

    const inactivityTimerRef = useRef(null)


    useEffect(() => {

        // -----------------------------------------------------
        // ONLY CUSTOMERS USE THE INACTIVITY TIMER
        // -----------------------------------------------------

        if (
            !user ||
            user.role !== "customer" ||
            !accessToken
        ) {

            // Clear any existing timer.
            if (inactivityTimerRef.current) {

                clearTimeout(
                    inactivityTimerRef.current
                )

                inactivityTimerRef.current = null
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

        const handleInactivityLogout = () => {

            console.log(
                "Customer session expired after 15 minutes of inactivity."
            )


            // Clear authentication state.
            logout()


            // AuthContext does not use React Router directly,
            // so redirect through the browser.
            window.location.href = "/login"
        }


        // -----------------------------------------------------
        // RESET INACTIVITY TIMER
        // -----------------------------------------------------

        const resetInactivityTimer = () => {

            // Clear the previous timer.
            if (inactivityTimerRef.current) {

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
        activityEvents.forEach((eventName) => {

            window.addEventListener(
                eventName,
                resetInactivityTimer,
                { passive: true }
            )
        })


        // Start the initial countdown.
        resetInactivityTimer()


        // -----------------------------------------------------
        // CLEANUP
        // -----------------------------------------------------

        return () => {

            // Clear the timer.
            if (inactivityTimerRef.current) {

                clearTimeout(
                    inactivityTimerRef.current
                )

                inactivityTimerRef.current = null
            }


            // Remove all activity listeners.
            activityEvents.forEach((eventName) => {

                window.removeEventListener(
                    eventName,
                    resetInactivityTimer
                )
            })
        }

    }, [
        user,
        accessToken,
    ])


    // =========================================================
    // LOGIN
    // =========================================================
    //
    // This function:
    //
    // 1. Sends credentials to Flask.
    // 2. Receives JWT tokens.
    // 3. Saves the tokens.
    // 4. Gets the authenticated user.
    // 5. Saves the user in React state.
    // 6. RETURNS THE USER.
    //
    // Returning the user allows Login.jsx to determine the
    // correct destination after authentication.
    // =========================================================

    const login = async (credentials) => {

        // Authentication is currently being processed.
        setAuthLoading(true)


        try {

            // -------------------------------------------------
            // SEND LOGIN REQUEST
            // -------------------------------------------------

            const data =
                await loginUser(credentials)


            // -------------------------------------------------
            // GET TOKENS
            // -------------------------------------------------

            const newAccessToken =
                data.access_token


            const newRefreshToken =
                data.refresh_token


            // -------------------------------------------------
            // CHECK THAT TOKENS EXIST
            // -------------------------------------------------

            if (
                !newAccessToken ||
                !newRefreshToken
            ) {

                throw new Error(
                    "Login succeeded but authentication tokens were not returned."
                )
            }


            // -------------------------------------------------
            // SAVE ACCESS TOKEN
            // -------------------------------------------------

            localStorage.setItem(
                "thafari_access_token",
                newAccessToken
            )


            // -------------------------------------------------
            // SAVE REFRESH TOKEN
            // -------------------------------------------------

            localStorage.setItem(
                "thafari_refresh_token",
                newRefreshToken
            )


            // -------------------------------------------------
            // UPDATE REACT TOKEN STATE
            // -------------------------------------------------

            setAccessToken(
                newAccessToken
            )


            setRefreshToken(
                newRefreshToken
            )


            // -------------------------------------------------
            // GET CURRENT USER
            // -------------------------------------------------
            //
            // The login response provides authentication tokens.
            //
            // We then ask the backend for the actual user so
            // we know their role.
            // -------------------------------------------------

            const currentUser =
                await getCurrentUser(newAccessToken)


            // -------------------------------------------------
            // NORMALIZE USER RESPONSE
            // -------------------------------------------------

            const authenticatedUser =
                currentUser.user || currentUser


            // -------------------------------------------------
            // SAVE USER
            // -------------------------------------------------

            setUser(
                authenticatedUser
            )


            // -------------------------------------------------
            // RETURN USER
            // -------------------------------------------------
            //
            // Login.jsx will use this value to decide whether
            // to send the user to:
            //
            // Customer → Home
            // Admin → Dashboard
            // Tour Operator → Dashboard
            // -------------------------------------------------

            return authenticatedUser

        } finally {

            // Login/Authentication process is finished.
            setAuthLoading(false)
        }
    }


    // =========================================================
    // AUTHENTICATION STATUS
    // =========================================================

    const isAuthenticated =
        Boolean(accessToken)


    // =========================================================
    // PROVIDE AUTH DATA
    // =========================================================

    return (

        <AuthContext.Provider
            value={{
                accessToken,
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

// =========================================================
// USE AUTH HOOK
// =========================================================
//
// This custom hook gives components access to AuthContext.
//
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