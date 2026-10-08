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


import { io } from "socket.io-client"


import {
    Link,
    Navigate,
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


const getSocketUrl = () => {

    const apiUrl = import.meta.env.VITE_API_URL


    if (apiUrl) {

        return apiUrl.replace(/\/api\/?$/, "")

    }


    return window.location.origin
}


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

        // -----------------------------------------------------
        // Logged-out users are handled by the protected render
        // below.
        //
        // Do not synchronously call setState here.
        // React can treat those state updates inside the effect
        // as cascading renders.
        // -----------------------------------------------------

        if (!isAuthenticated) {

            return
        }


        const loadNotifications = async () => {

            try {

                setLoading(true)

                setError("")


                const data =
                    await getNotifications()


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
        isAuthenticated,
    ])


    // =========================================================
    // REAL-TIME NOTIFICATION LISTENER
    // =========================================================
    //
    // The backend emits "new_notification" to the logged-in
    // user's private Socket.IO room whenever a new notification
    // is created.
    //
    // When this page is already open, we fetch the latest list
    // so the new notification appears immediately without the
    // user needing to refresh the page.
    // =========================================================

    useEffect(() => {

        if (!isAuthenticated) {

            return
        }


        const socketUrl = getSocketUrl()


        const socket = io(
            socketUrl,
            {
                // Authentication is handled by the HttpOnly
                // access cookie. We deliberately do not send a
                // JWT from JavaScript.
                withCredentials: true,
                transports: ["websocket", "polling"],
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000,
            }
        )


        const refreshNotifications = async () => {

            try {

                const data = await getNotifications()


                setNotifications(
                    data.notifications || []
                )


                setError("")

            } catch (error) {

                console.error(
                    "Failed to refresh notifications after a real-time update:",
                    error
                )

            }
        }


        const handleNewNotification = (
            notification
        ) => {

            console.log(
                "New Thafari notification received:",
                notification
            )


            // Refresh the complete list from the backend.
            // This keeps ordering, read status and notification
            // fields exactly in sync with the database.
            refreshNotifications()


            // Keep the Navbar unread badge synchronized too.
            notifyNavbarOfUpdate()

        }


        socket.on(
            "new_notification",
            handleNewNotification
        )


        socket.on(
            "connect_error",
            (error) => {

                console.warn(
                    "Notification Socket.IO connection error:",
                    error?.message || error
                )

            }
        )


        return () => {

            socket.off(
                "new_notification",
                handleNewNotification
            )

            socket.disconnect()

        }

    }, [
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

                // -------------------------------------------------
                // BACKWARD-COMPATIBLE ADMIN PAYMENT LINKS
                // -------------------------------------------------
                // Older/newly-created payment notifications may use:
                //
                //     /admin/direct-payments/<payment_id>
                //
                // Thafari now uses the pending direct-payments page
                // as the review workspace. The old URL does not have
                // a matching React route, so navigating to it would
                // produce a blank page.
                //
                // Send those links to the real review workspace.
                // The payment ID is preserved in the query string so
                // the payment workspace can identify the exact payment
                // when it supports direct opening.
                // -------------------------------------------------

                const paymentLinkMatch =
                    notification.link.match(
                        /^\/admin\/direct-payments\/(\d+)(?:\?.*)?$/
                    )


                if (paymentLinkMatch) {

                    const paymentId =
                        paymentLinkMatch[1]

                    navigate(
                        `/admin/direct-payments/pending?paymentId=${paymentId}`
                    )

                } else {

                    navigate(notification.link)

                }

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


            await markAllNotificationsAsRead()


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
    //
    // Logged-out users are sent directly to the login page.
    // There is no intermediate "Please sign in" screen.
    // =========================================================

    if (!isAuthenticated) {

        return (
            <Navigate
                to="/login"
                replace
            />
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