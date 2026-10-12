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
    useLocation,
    useNavigate,
} from "react-router-dom"


import {
    useAuth,
} from "../context/AuthContext"


import {
    getUnreadNotificationCount,
} from "../services/notificationService"

import {
    getContact,
} from "../services/contactService"


import "./Navbar.css"
import "./Branding.css"


function Navbar() {

    const navigate = useNavigate()
    const location = useLocation()

    const [isContactMenuOpen, setIsContactMenuOpen] = useState(false)
    const [contactDetails, setContactDetails] = useState(null)

    // Load the public contact details for the navbar dropdown.
    useEffect(() => {
        let isMounted = true

        getContact()
            .then((response) => {
                if (isMounted) {
                    setContactDetails(response?.contact || null)
                }
            })
            .catch((error) => {
                // The navbar should remain usable even if contact details
                // have not been configured or the request temporarily fails.
                console.warn("Could not load public contact details:", error?.message || error)
            })

        return () => {
            isMounted = false
        }
    }, [])

    // Close the dropdown when clicking elsewhere or pressing Escape.
    useEffect(() => {
        if (!isContactMenuOpen) return undefined

        const handlePointerDown = (event) => {
            if (!event.target.closest(".navbar-contact-wrapper")) {
                setIsContactMenuOpen(false)
            }
        }

        const handleKeyDown = (event) => {
            if (event.key === "Escape") setIsContactMenuOpen(false)
        }

        document.addEventListener("pointerdown", handlePointerDown)
        document.addEventListener("keydown", handleKeyDown)

        return () => {
            document.removeEventListener("pointerdown", handlePointerDown)
            document.removeEventListener("keydown", handleKeyDown)
        }
    }, [isContactMenuOpen])

    // Section links must work both from other routes and from the homepage.
    // The homepage also waits for sections above the target to finish loading
    // before performing the final scroll, because their content changes layout.
    const handleHomeSectionClick = (sectionId) => (event) => {
        event.preventDefault()
        setIsContactMenuOpen(false)

        const targetHash = `#${sectionId}`

        if (location.pathname !== "/") {
            navigate({ pathname: "/", hash: targetHash })
            return
        }

        if (location.hash !== targetHash) {
            navigate({ pathname: "/", hash: targetHash }, { replace: false })
            return
        }

        document.getElementById(sectionId)?.scrollIntoView({
            behavior: "smooth",
            block: "start",
        })
    }

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
        let isLoadingUnreadCount = false


        // -----------------------------------------------------
        // LOAD CURRENT COUNT
        // -----------------------------------------------------

        const loadUnreadCount = async () => {

            // Prevent overlapping requests when the timer, tab
            // visibility event, and Socket.IO event fire together.
            if (isLoadingUnreadCount) {
                return
            }

            isLoadingUnreadCount = true

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
            } finally {
                isLoadingUnreadCount = false
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
                60000
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
                    onClick={handleHomeSectionClick("services")}
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

                <div className="navbar-contact-wrapper">
                    <a
                        href="/#contact"
                        className="navbar-contact"
                        aria-label="Go to Contact section"
                        title="Go to Contact section"
                        onClick={handleHomeSectionClick("contact")}
                    >
                        <span className="navbar-contact-icon" aria-hidden="true">
                            📞
                        </span>
                    </a>

                    <button
                        type="button"
                        className="navbar-contact-menu-toggle"
                        aria-label={isContactMenuOpen ? "Close contact details" : "Open contact details"}
                        aria-expanded={isContactMenuOpen}
                        aria-controls="navbar-contact-menu"
                        onClick={() => setIsContactMenuOpen((open) => !open)}
                    >
                        <span aria-hidden="true">⌄</span>
                    </button>

                    {isContactMenuOpen && (
                        <div className="navbar-contact-menu" id="navbar-contact-menu" role="dialog" aria-label="Thafari contact details">
                            <h3>Get in touch</h3>

                            {contactDetails?.phone_number && (
                                <a href={`tel:${contactDetails.phone_number}`} className="navbar-contact-detail">
                                    <span aria-hidden="true">📞</span>
                                    <span><strong>Phone</strong><small>{contactDetails.phone_number}</small></span>
                                </a>
                            )}

                            {contactDetails?.email && (
                                <a href={`mailto:${contactDetails.email}`} className="navbar-contact-detail">
                                    <span aria-hidden="true">✉️</span>
                                    <span><strong>Email</strong><small>{contactDetails.email}</small></span>
                                </a>
                            )}

                            {contactDetails?.whatsapp && (
                                <a
                                    href={`https://wa.me/${String(contactDetails.whatsapp).replace(/\D/g, "")}`}
                                    className="navbar-contact-detail"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <span aria-hidden="true">💬</span>
                                    <span><strong>WhatsApp</strong><small>{contactDetails.whatsapp}</small></span>
                                </a>
                            )}

                            {!contactDetails?.phone_number && !contactDetails?.email && !contactDetails?.whatsapp && (
                                <p className="navbar-contact-empty">Contact details are not available right now.</p>
                            )}

                        </div>
                    )}
                </div>


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