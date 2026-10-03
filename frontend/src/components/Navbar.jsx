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

import {
    useEffect,
    useState,
} from "react"

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


function Navbar() {

    // ---------------------------------------------------------
    // GET AUTHENTICATION INFORMATION
    // ---------------------------------------------------------

    const {
        user,
        accessToken,
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
    // LOAD UNREAD NOTIFICATION COUNT
    // =========================================================

    useEffect(() => {

        // If the user is not logged in, there are no
        // notifications to retrieve.
        if (!isAuthenticated || !accessToken) {

            setUnreadCount(0)

            return
        }


        // Load the latest unread notification count.
        const loadUnreadCount = async () => {

            try {

                const data =
                    await getUnreadNotificationCount(
                        accessToken
                    )


                setUnreadCount(
                    data.unread_count || 0
                )

            } catch (error) {

                console.error(
                    "Failed to load notification count:",
                    error
                )

                // Keep the Navbar working even if the
                // notification request fails.
                setUnreadCount(0)
            }
        }


        // Load immediately.
        loadUnreadCount()


        // ---------------------------------------------------------
        // REFRESH AFTER NOTIFICATIONS ARE MARKED AS READ
        // ---------------------------------------------------------
        //
        // Notifications.jsx dispatches this event after a
        // notification is successfully marked as read.
        //
        // This makes the Navbar badge update immediately without
        // requiring the user to refresh the browser.
        // ---------------------------------------------------------

        const handleNotificationsUpdated = () => {

            loadUnreadCount()
        }


        window.addEventListener(
            "thafari-notifications-updated",
            handleNotificationsUpdated
        )


        // ---------------------------------------------------------
        // CLEANUP
        // ---------------------------------------------------------

        return () => {

            window.removeEventListener(
                "thafari-notifications-updated",
                handleNotificationsUpdated
            )
        }

    }, [
        accessToken,
        isAuthenticated,
    ])



    // =========================================================
    // LOGOUT
    // =========================================================

    const handleLogout = () => {

        logout()
    }


    return (

        <header className="navbar">

            {/* =================================================
                BRAND
            ================================================= */}

            <Link
                to="/"
                className="navbar-brand"
            >
                THAFARI
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

                            {user?.first_name || "Traveler"}

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