// =========================================================
// THAFARI NOTIFICATIONS PAGE
// =========================================================
//
// This page displays notifications belonging to the currently
// logged-in user.
//
// Customers, admins and tour operators can:
//
// - View notifications
// - See which notifications are unread
// - Mark individual notifications as read
// - Mark all notifications as read
// - Open a notification's destination when one exists
//
// A notification may optionally contain a "link".
//
// Example:
//
// notification.link = "/admin/direct-payments/42"
//
// Clicking "View payment" will:
// 1. Mark the notification as read.
// 2. Navigate to that page.
//
// Clicking "Mark as read" will:
// 1. Mark the notification as read.
// 2. Stay on this page.
//
// This makes the notification system flexible enough to
// support payments, bookings, messages, refunds, departures,
// and future Thafari features.
// =========================================================

import {
    useEffect,
    useState,
} from "react"


import {
    Link,
    useNavigate,
} from "react-router-dom"


import {
    useAuth,
} from "../context/AuthContext"


import {
    getNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
} from "../services/notificationService"


import "./Notifications.css"


function Notifications() {

    // ---------------------------------------------------------
    // TELL THE NAVBAR THAT NOTIFICATIONS CHANGED
    // ---------------------------------------------------------
    //
    // The Navbar is outside this page, so its unread badge does
    // not automatically know when a notification is marked read.
    // This event tells the Navbar to fetch the latest unread count.
    // ---------------------------------------------------------

    const notifyNavbarOfUpdate = () => {

        window.dispatchEvent(
            new Event(
                "thafari-notifications-updated"
            )
        )
    }

    // ---------------------------------------------------------
    // AUTHENTICATION
    // ---------------------------------------------------------

    const {
        accessToken,
        isAuthenticated,
    } = useAuth()


    // ---------------------------------------------------------
    // NAVIGATION
    // ---------------------------------------------------------
    //
    // Used when the user clicks a notification's
    // "View" / "Open" button.
    // ---------------------------------------------------------

    const navigate = useNavigate()


    // ---------------------------------------------------------
    // NOTIFICATION STATE
    // ---------------------------------------------------------

    const [
        notifications,
        setNotifications,
    ] = useState([])


    // ---------------------------------------------------------
    // PAGE STATE
    // ---------------------------------------------------------

    const [
        loading,
        setLoading,
    ] = useState(true)


    const [
        error,
        setError,
    ] = useState("")


    const [
        markingAllRead,
        setMarkingAllRead,
    ] = useState(false)


    // =========================================================
    // LOAD NOTIFICATIONS
    // =========================================================

    useEffect(() => {

        if (!isAuthenticated || !accessToken) {

            setNotifications([])

            setLoading(false)

            return
        }


        const loadNotifications = async () => {

            try {

                setLoading(true)

                setError("")


                const data =
                    await getNotifications(
                        accessToken
                    )


                // -------------------------------------------------
                // The backend returns:
                //
                // {
                //     notifications: [...]
                // }
                //
                // Each notification may now also contain:
                //
                // link
                //
                // Example:
                //
                // {
                //     id: 42,
                //     title: "New Direct Payment",
                //     message: "...",
                //     notification_type: "payment",
                //     is_read: false,
                //     link: "/admin/direct-payments/42"
                // }
                // -------------------------------------------------

                setNotifications(
                    data.notifications || []
                )

            } catch (error) {

                console.error(
                    "Failed to load notifications:",
                    error
                )


                setError(
                    error.response?.data?.message ||
                    "We couldn't load your notifications."
                )

            } finally {

                setLoading(false)

            }
        }


        loadNotifications()

    }, [
        accessToken,
        isAuthenticated,
    ])


    // =========================================================
    // MARK ONE NOTIFICATION AS READ
    // =========================================================

    const handleMarkAsRead = async (
        notificationId
    ) => {

        try {

            await markNotificationAsRead(
                accessToken,
                notificationId
            )


            // Refresh the Navbar unread badge immediately.
            notifyNavbarOfUpdate()


            // -------------------------------------------------
            // Update the notification locally.
            //
            // This makes the notification appear as read
            // immediately without another GET request.
            // -------------------------------------------------

            setNotifications(
                (previousNotifications) =>
                    previousNotifications.map(
                        (notification) =>
                            notification.id === notificationId
                                ? {
                                    ...notification,
                                    is_read: true,
                                }
                                : notification
                    )
            )

        } catch (error) {

            console.error(
                "Failed to mark notification as read:",
                error
            )

        }
    }


    // =========================================================
    // VIEW / OPEN NOTIFICATION
    // =========================================================
    //
    // This is intentionally different from the normal
    // "Mark as read" button.
    //
    // The user can choose to simply mark something as read,
    // OR they can choose to open the related feature.
    // =========================================================

    const handleOpenNotification = async (
        notification
    ) => {

        try {

            // -------------------------------------------------
            // First mark the notification as read.
            // -------------------------------------------------

            if (!notification.is_read) {

                await markNotificationAsRead(
                    accessToken,
                    notification.id
                )


                // Refresh the Navbar unread badge immediately.
                notifyNavbarOfUpdate()


                // -------------------------------------------------
                // Update the notification locally so the unread
                // count and styling change immediately.
                // -------------------------------------------------

                setNotifications(
                    (previousNotifications) =>
                        previousNotifications.map(
                            (item) =>
                                item.id === notification.id
                                    ? {
                                        ...item,
                                        is_read: true,
                                    }
                                    : item
                        )
                )
            }


            // -------------------------------------------------
            // Then navigate to the destination.
            //
            // We only navigate when the backend has provided
            // a link.
            // -------------------------------------------------

            if (notification.link) {

                navigate(notification.link)

            }

        } catch (error) {

            console.error(
                "Failed to open notification:",
                error
            )

        }
    }


    // =========================================================
    // MARK ALL AS READ
    // =========================================================

    const handleMarkAllAsRead = async () => {

        try {

            setMarkingAllRead(true)


            await markAllNotificationsAsRead(
                accessToken
            )


            // Refresh the Navbar unread badge immediately.
            notifyNavbarOfUpdate()


            // -------------------------------------------------
            // Update all notifications locally.
            // -------------------------------------------------

            setNotifications(
                (previousNotifications) =>
                    previousNotifications.map(
                        (notification) => ({
                            ...notification,
                            is_read: true,
                        })
                    )
            )

        } catch (error) {

            console.error(
                "Failed to mark all notifications as read:",
                error
            )

        } finally {

            setMarkingAllRead(false)

        }
    }


    // =========================================================
    // GET VIEW BUTTON LABEL
    // =========================================================
    //
    // Different notification types can have different
    // actions.
    //
    // We can expand this later as more Thafari features
    // are created.
    // =========================================================

    const getActionLabel = (
        notification
    ) => {

        switch (
            notification.notification_type
        ) {

            case "payment":

                return "Review payment"


            case "message":

                return "Open message"


            case "booking":

                return "View booking"


            case "refund":

                return "View refund"


            case "departure":

                return "View departure"


            default:

                return "Open"

        }
    }


    // =========================================================
    // PROTECT PAGE
    // =========================================================

    if (!isAuthenticated) {

        return (
            <div className="notifications-page">

                <div className="notifications-login-state">

                    <h1>
                        Please sign in
                    </h1>

                    <p>
                        You need to be logged in to view
                        your notifications.
                    </p>


                    <Link
                        to="/login"
                        className="notifications-primary-button"
                    >
                        Sign In
                    </Link>

                </div>

            </div>
        )
    }


    // =========================================================
    // COUNT UNREAD NOTIFICATIONS
    // =========================================================

    const unreadCount =
        notifications.filter(
            (notification) =>
                !notification.is_read
        ).length


    return (

        <div className="notifications-page">

            {/* =================================================
                PAGE HEADER
            ================================================= */}

            <section className="notifications-header">

                <div>

                    <p className="notifications-eyebrow">
                        YOUR THAFARI
                    </p>


                    <h1>
                        Notifications
                    </h1>


                    <p>
                        Stay updated on your bookings,
                        payments, messages and safari
                        experiences.
                    </p>

                </div>


                {/* ---------------------------------------------
                    MARK ALL AS READ
                --------------------------------------------- */}

                {unreadCount > 0 && (

                    <button
                        type="button"
                        className="notifications-mark-all"
                        onClick={handleMarkAllAsRead}
                        disabled={markingAllRead}
                    >

                        {markingAllRead
                            ? "Updating..."
                            : "Mark all as read"
                        }

                    </button>

                )}

            </section>


            {/* =================================================
                LOADING
            ================================================= */}

            {loading && (

                <div className="notifications-state">

                    <div className="notifications-state-icon">
                        🔔
                    </div>


                    <p>
                        Loading your notifications...
                    </p>

                </div>

            )}


            {/* =================================================
                ERROR
            ================================================= */}

            {!loading && error && (

                <div className="notifications-state notifications-error">

                    <div className="notifications-state-icon">
                        ⚠️
                    </div>


                    <p>
                        {error}
                    </p>


                    <button
                        type="button"
                        onClick={() => window.location.reload()}
                    >
                        Try Again
                    </button>

                </div>

            )}


            {/* =================================================
                EMPTY STATE
            ================================================= */}

            {!loading &&
                !error &&
                notifications.length === 0 && (

                    <div className="notifications-state">

                        <div className="notifications-state-icon">
                            🌿
                        </div>


                        <h2>
                            You're all caught up
                        </h2>


                        <p>
                            You don't have any notifications
                            yet. When something important
                            happens, we'll let you know here.
                        </p>


                        <Link
                            to="/dashboard"
                            className="notifications-primary-button"
                        >
                            Back to Dashboard
                        </Link>

                    </div>

                )}


            {/* =================================================
                NOTIFICATION LIST
            ================================================= */}

            {!loading &&
                !error &&
                notifications.length > 0 && (

                    <section className="notifications-list">

                        {notifications.map(
                            (notification) => (

                                <article
                                    key={notification.id}
                                    className={
                                        notification.is_read
                                            ? "notification-item"
                                            : "notification-item notification-unread"
                                    }
                                >

                                    {/* ---------------------------------
                                        NOTIFICATION ICON
                                    --------------------------------- */}

                                    <div className="notification-icon">

                                        {notification.notification_type === "booking"
                                            ? "🏕️"
                                            : notification.notification_type === "payment"
                                                ? "💳"
                                                : notification.notification_type === "refund"
                                                    ? "💰"
                                                    : notification.notification_type === "message"
                                                        ? "💬"
                                                        : notification.notification_type === "departure"
                                                            ? "🧳"
                                                            : "🔔"
                                        }

                                    </div>


                                    {/* ---------------------------------
                                        NOTIFICATION CONTENT
                                    --------------------------------- */}

                                    <div className="notification-content">

                                        <div className="notification-title-row">

                                            <h2>
                                                {notification.title}
                                            </h2>


                                            {!notification.is_read && (

                                                <span className="notification-unread-label">
                                                    New
                                                </span>

                                            )}

                                        </div>


                                        <p>
                                            {notification.message}
                                        </p>


                                        <div className="notification-meta">

                                            <span>
                                                {notification.notification_type}
                                            </span>


                                            <span>
                                                {notification.created_at
                                                    ? new Date(
                                                        notification.created_at
                                                    ).toLocaleString()
                                                    : ""
                                                }
                                            </span>

                                        </div>


                                        {/* ---------------------------------
                                            NOTIFICATION ACTIONS
                                        ---------------------------------
                                        
                                        "Mark as read" does NOT navigate.

                                        "View/Open" marks the notification
                                        as read and then navigates to the
                                        stored destination.
                                        --------------------------------- */}

                                        <div className="notification-actions">

                                            {!notification.is_read && (

                                                <button
                                                    type="button"
                                                    className="notification-read-button"
                                                    onClick={() =>
                                                        handleMarkAsRead(
                                                            notification.id
                                                        )
                                                    }
                                                >
                                                    Mark as read
                                                </button>

                                            )}


                                            {/* ---------------------------------
                                                VIEW / OPEN BUTTON
                                                
                                                This only appears when the
                                                backend has supplied a link.
                                            --------------------------------- */}

                                            {notification.link && (

                                                <button
                                                    type="button"
                                                    className="notification-open-button"
                                                    onClick={() =>
                                                        handleOpenNotification(
                                                            notification
                                                        )
                                                    }
                                                >
                                                    {getActionLabel(
                                                        notification
                                                    )}
                                                </button>

                                            )}

                                        </div>

                                    </div>

                                </article>

                            )
                        )}

                    </section>

                )}

        </div>
    )
}


export default Notifications