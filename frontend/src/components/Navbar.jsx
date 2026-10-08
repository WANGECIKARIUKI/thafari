// =========================================================
// THAFARI NAVBAR
// =========================================================
//
// This is the main navigation bar for Thafari.
//
// The Navbar changes depending on whether the user is:
// - Logged out
// - Logged in
//
// When the user is logged in, the Navbar also displays a
// notification bell with the number of unread notifications.
//
// =========================================================
//
// SECURITY UPDATE
// =========================================================
//
// Thafari now uses JWT authentication through HttpOnly cookies.
//
// IMPORTANT:
//
// The frontend does NOT send the JWT through Socket.IO.
//
// The browser automatically sends the HttpOnly authentication
// cookie during the Socket.IO connection.
//
// Socket.IO is therefore configured with:
//
//     withCredentials: true
//
// The actual JWT remains inaccessible to JavaScript.
//
// =========================================================


import {
    useEffect,
    useState,
} from "react"


import {
    io,
} from "socket.io-client"


import {
    Link,
} from "react-router-dom"


import {
    useAuth,
} from "../context/AuthContext"


import {
    getUnreadNotificationCount,
} from "../services/notificationService"


import "./Navbar.css"
import "./Branding.css"


function Navbar() {

    // ---------------------------------------------------------
    // GET AUTHENTICATION INFORMATION
    // ---------------------------------------------------------
    //
    // We only need to know whether a user is authenticated and
    // which user is currently loaded into React state.
    //
    // The actual JWT is NOT available here anymore.
    //
    const {
        user,
        isAuthenticated,
        logout,
    } = useAuth()


    // ---------------------------------------------------------
    // NOTIFICATION STATE
    // ---------------------------------------------------------

    // Stores the number of unread notifications belonging
    // to the currently logged-in user.
    const [
        unreadCount,
        setUnreadCount,
    ] = useState(0)


    // =========================================================
    // LOAD AND SYNC UNREAD NOTIFICATION COUNT
    // =========================================================
    //
    // Notifications can arrive while the user is already inside
    // the application.
    //
    // We therefore use three layers:
    //
    // 1. Load the current count immediately.
    // 2. Listen for real-time Socket.IO notifications.
    // 3. Refresh the count periodically as a reliable fallback.
    //
    // The database remains the source of truth.
    //
    // =========================================================

    useEffect(() => {

        if (!isAuthenticated) {

            setUnreadCount(0)

            return
        }


        let isMounted = true


        // -----------------------------------------------------
        // LOAD CURRENT COUNT
        // -----------------------------------------------------

        const loadUnreadCount = async () => {

            try {

                const data =
                    await getUnreadNotificationCount()


                if (isMounted) {

                    setUnreadCount(
                        Number(
                            data?.unread_count || 0
                        )
                    )
                }

            } catch (error) {

                console.error(
                    "Failed to load notification count:",
                    error
                )

                // Do not erase a working badge just because
                // one refresh failed.
                if (isMounted) {

                    setUnreadCount(
                        (current) => current
                    )

                }
            }
        }


        // Load immediately.
        loadUnreadCount()


        // -----------------------------------------------------
        // BROWSER EVENT SYNC
        // -----------------------------------------------------
        //
        // Notifications.jsx dispatches this event after a
        // notification is marked as read.
        //

        const handleNotificationsUpdated = () => {

            loadUnreadCount()

        }


        window.addEventListener(
            "thafari-notifications-updated",
            handleNotificationsUpdated
        )


        // =====================================================
        // SOCKET.IO REAL-TIME SYNC
        // =====================================================
        //
        // IMPORTANT SECURITY CHANGE:
        //
        // We DO NOT send:
        //
        //     auth: {
        //         access_token: accessToken
        //     }
        //
        // anymore.
        //
        // The browser sends the HttpOnly cookie automatically.
        //
        // withCredentials: true is required so cookies can be
        // sent when the frontend and backend are on different
        // origins.
        //
        // =====================================================

        const apiUrl =
            import.meta.env.VITE_API_URL || ""


        // Example:
        //
        // VITE_API_URL =
        // https://thafari-production.up.railway.app/api
        //
        // Socket.IO itself runs from the backend origin, so
        // remove the /api part.
        const socketUrl =
            apiUrl.replace(
                /\/api\/?$/,
                ""
            )


        let notificationSocket = null


        if (socketUrl) {

            notificationSocket = io(
                socketUrl,
                {

                    // -------------------------------------------------
                    // SEND BROWSER COOKIES
                    // -------------------------------------------------
                    //
                    // This allows the browser to send the HttpOnly
                    // authentication cookie to the Socket.IO server.
                    //
                    withCredentials: true,


                    // -------------------------------------------------
                    // TRANSPORTS
                    // -------------------------------------------------

                    transports: [
                        "websocket",
                        "polling",
                    ],

                }
            )


            // -----------------------------------------------------
            // SOCKET CONNECTED
            // -----------------------------------------------------

            notificationSocket.on(
                "connect",
                () => {

                    console.log(
                        "Thafari notification socket connected."
                    )


                    // Re-sync after connection in case a
                    // notification arrived while connecting.
                    loadUnreadCount()

                }
            )


            // -----------------------------------------------------
            // NEW NOTIFICATION
            // -----------------------------------------------------

            notificationSocket.on(
                "new_notification",
                () => {

                    // Do not blindly increment the badge.
                    //
                    // Fetch the database count so the badge remains
                    // accurate even if several notifications arrive
                    // together.

                    loadUnreadCount()

                }
            )


            // -----------------------------------------------------
            // SOCKET CONNECTION ERROR
            // -----------------------------------------------------

            notificationSocket.on(
                "connect_error",
                (error) => {

                    console.warn(
                        "Notification socket connection failed:",
                        error?.message ||
                        error
                    )

                }
            )

        }


        // =====================================================
        // PERIODIC FALLBACK SYNC
        // =====================================================
        //
        // This keeps notification counts working even if the
        // Socket.IO connection temporarily fails.
        //
        // =====================================================

        const refreshInterval =
            window.setInterval(
                loadUnreadCount,
                15000
            )


        // -----------------------------------------------------
        // REFRESH WHEN USER RETURNS TO TAB
        // -----------------------------------------------------

        const handleVisibilityChange = () => {

            if (
                document.visibilityState ===
                "visible"
            ) {

                loadUnreadCount()

            }

        }


        document.addEventListener(
            "visibilitychange",
            handleVisibilityChange
        )


        // =====================================================
        // CLEANUP
        // =====================================================

        return () => {

            isMounted = false


            window.removeEventListener(
                "thafari-notifications-updated",
                handleNotificationsUpdated
            )


            document.removeEventListener(
                "visibilitychange",
                handleVisibilityChange
            )


            window.clearInterval(
                refreshInterval
            )


            if (notificationSocket) {

                notificationSocket.disconnect()

            }

        }

    }, [
        isAuthenticated,
    ])


    // =========================================================
    // LOGOUT
    // =========================================================

    const handleLogout = () => {

        logout()

    }


    // =========================================================
    // RENDER
    // =========================================================

    return (

        <header className="navbar">

            {/* =================================================
                BRAND
            ================================================= */}

            <Link
                to="/"
                className="navbar-brand"
                aria-label="Thafari home"
            >

                <span className="thafari-wordmark">

                    <span className="thafari-wordmark-main">
                        THA
                    </span>

                    <span className="thafari-wordmark-highlight">
                        FARI
                    </span>

                    <span
                        className="thafari-wordmark-accent"
                        aria-hidden="true"
                    />

                </span>

            </Link>


            {/* =================================================
                MAIN NAVIGATION
            ================================================= */}

            <nav className="navbar-links">

                <Link to="/">
                    Home
                </Link>


                {/* ---------------------------------------------
                    TOURS
                --------------------------------------------- */}

                <Link to="/tours">
                    Explore Safaris
                </Link>


                {/* ---------------------------------------------
                    SERVICES
                ---------------------------------------------
                    
                    Opens the Services Offered section on the
                    homepage.
                --------------------------------------------- */}

                <a
                    href="/#services"
                    className="navbar-section-link"
                >
                    Services
                </a>


                <Link to="/about">
                    About
                </Link>


                <Link to="/faqs">
                    FAQs
                </Link>

            </nav>


            {/* =================================================
                USER ACTIONS
            ================================================= */}

            <div className="navbar-actions">

                {/* ---------------------------------------------
                    CONTACT US
                    ---------------------------------------------
                    
                    This icon opens the Contact Thafari section
                    on the homepage.
                --------------------------------------------- */}

                <a
                    href="/#contact"
                    className="navbar-contact"
                    aria-label="Contact Us"
                    title="Contact Us"
                >

                    <span
                        className="navbar-contact-icon"
                        aria-hidden="true"
                    >
                        📞
                    </span>

                </a>


                {isAuthenticated ? (

                    <>

                        {/* -------------------------------------
                            NOTIFICATION BELL
                        ------------------------------------- */}

                        <Link
                            to="/notifications"
                            className="navbar-notification"
                            aria-label="Notifications"
                            title="Notifications"
                        >

                            <span className="notification-bell">
                                🔔
                            </span>


                            {/* Unread notification count */}

                            {unreadCount > 0 && (

                                <span className="notification-badge">

                                    {unreadCount > 99
                                        ? "99+"
                                        : unreadCount
                                    }

                                </span>

                            )}

                        </Link>


                        {/* -------------------------------------
                            USER GREETING
                        ------------------------------------- */}

                        <span className="navbar-welcome">

                            Hi,{" "}

                            {user?.first_name ||
                                "Traveler"}

                            👋

                        </span>


                        {/* -------------------------------------
                            DASHBOARD
                        ------------------------------------- */}

                        <Link
                            to="/dashboard"
                            className="navbar-dashboard"
                        >
                            Dashboard
                        </Link>


                        {/* -------------------------------------
                            LOGOUT
                        ------------------------------------- */}

                        <button
                            type="button"
                            className="navbar-logout"
                            onClick={handleLogout}
                        >
                            Logout
                        </button>

                    </>

                ) : (

                    <>

                        {/* -------------------------------------
                            LOGIN
                        ------------------------------------- */}

                        <Link
                            to="/login"
                            className="navbar-login"
                        >
                            Login
                        </Link>


                        {/* -------------------------------------
                            REGISTER
                        ------------------------------------- */}

                        <Link
                            to="/register"
                            className="navbar-register"
                        >
                            Get Started
                        </Link>

                    </>

                )}

            </div>

        </header>

    )

}


export default Navbar