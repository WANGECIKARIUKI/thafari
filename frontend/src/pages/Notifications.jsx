
 // =========================================================
 // THAFARI NOTIFICATIONS PAGE
 // =========================================================
 //
 // Displays notifications for the logged-in user.
 // Supports marking notifications as read, opening links,
 // real-time updates and preserving authentication on refresh.
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

import { useAuth } from "../context/AuthContext"

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
    // AUTHENTICATION
    // ---------------------------------------------------------

    const {
        isAuthenticated,
        authLoading,
    } = useAuth()

    const navigate = useNavigate()

    // ---------------------------------------------------------
    // NOTIFICATION STATE
    // ---------------------------------------------------------

    const [notifications, setNotifications] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [markingAllRead, setMarkingAllRead] = useState(false)

    // ---------------------------------------------------------
    // TELL THE NAVBAR THAT NOTIFICATIONS CHANGED
    // ---------------------------------------------------------

    const notifyNavbarOfUpdate = () => {
        window.dispatchEvent(
            new Event("thafari-notifications-updated")
        )
    }

    // =========================================================
    // LOAD NOTIFICATIONS
    // =========================================================

    useEffect(() => {
        // Do not request notifications until authentication
        // restoration has completed and the user is authenticated.

        if (authLoading || !isAuthenticated) {
            return
        }

        let cancelled = false

        const loadNotifications = async () => {
            try {
                setLoading(true)
                setError("")

                const data = await getNotifications()

                if (!cancelled) {
                    setNotifications(data.notifications || [])
                }
            } catch (error) {
                console.error(
                    "Failed to load notifications:",
                    error
                )

                if (!cancelled) {
                    setError(
                        error.response?.data?.message ||
                        "We couldn't load your notifications."
                    )
                }
            } finally {
                if (!cancelled) {
                    setLoading(false)
                }
            }
        }

        loadNotifications()

        return () => {
            cancelled = true
        }
    }, [isAuthenticated, authLoading])

    // =========================================================
    // REAL-TIME NOTIFICATION LISTENER
    // =========================================================

    useEffect(() => {
        if (authLoading || !isAuthenticated) {
            return
        }

        const socket = io(getSocketUrl(), {
            withCredentials: true,
            transports: ["websocket", "polling"],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        })

        const refreshNotifications = async () => {
            try {
                const data = await getNotifications()

                setNotifications(data.notifications || [])
                setError("")
                notifyNavbarOfUpdate()
            } catch (error) {
                console.error(
                    "Failed to refresh notifications:",
                    error
                )
            }
        }

        const handleNewNotification = (notification) => {
            console.log(
                "New Thafari notification received:",
                notification
            )

            refreshNotifications()
        }

        socket.on(
            "new_notification",
            handleNewNotification
        )

        socket.on("connect_error", (error) => {
            console.warn(
                "Notification Socket.IO connection error:",
                error?.message || error
            )
        })

        return () => {
            socket.off(
                "new_notification",
                handleNewNotification
            )

            socket.disconnect()
        }
    }, [isAuthenticated, authLoading])

    // =========================================================
    // MARK ONE NOTIFICATION AS READ
    // =========================================================

    const handleMarkAsRead = async (notificationId) => {
        try {
            await markNotificationAsRead(notificationId)

            setNotifications((previousNotifications) =>
                previousNotifications.map((notification) =>
                    notification.id === notificationId
                        ? {
                            ...notification,
                            is_read: true,
                        }
                        : notification
                )
            )

            notifyNavbarOfUpdate()
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

    const handleOpenNotification = async (notification) => {
        try {
            if (!notification.is_read) {
                await markNotificationAsRead(notification.id)

                setNotifications((previousNotifications) =>
                    previousNotifications.map((item) =>
                        item.id === notification.id
                            ? {
                                ...item,
                                is_read: true,
                            }
                            : item
                    )
                )

                notifyNavbarOfUpdate()
            }

            if (notification.link) {
                // Support older direct-payment notification links.
                const paymentLinkMatch = notification.link.match(
                    /^\/admin\/direct-payments\/(\d+)(?:\?.*)?$/
                )

                if (paymentLinkMatch) {
                    const paymentId = paymentLinkMatch[1]

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

            setNotifications((previousNotifications) =>
                previousNotifications.map((notification) => ({
                    ...notification,
                    is_read: true,
                }))
            )

            notifyNavbarOfUpdate()
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
    // GET ACTION BUTTON LABEL
    // =========================================================

    const getActionLabel = (notification) => {
        switch (notification.notification_type) {
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
    // IMPORTANT:
    // After a browser refresh, React must restore authentication.
    // Wait for authLoading to finish before redirecting.
    // Otherwise, a logged-in user may be sent to Login too early.
    // =========================================================

    if (authLoading) {
        return (
            <div className="notifications-page">
                <div className="notifications-state">
                    <div className="notifications-state-icon">
                        🔔
                    </div>

                    <p>Restoring your session...</p>
                </div>
            </div>
        )
    }

    if (!isAuthenticated) {
        return (
            <Navigate
                to="/login"
                replace
                state={{ from: "/notifications" }}
            />
        )
    }

    // =========================================================
    // COUNT UNREAD NOTIFICATIONS
    // =========================================================

    const unreadCount = notifications.filter(
        (notification) => !notification.is_read
    ).length

    // =========================================================
    // PAGE UI
    // =========================================================

    return (
        <div className="notifications-page">

            {/* PAGE HEADER */}

            <section className="notifications-header">
                <div>
                    <p className="notifications-eyebrow">
                        YOUR THAFARI
                    </p>

                    <h1>Notifications</h1>

                    <p>
                        Stay updated on your bookings,
                        payments, messages and safari
                        experiences.
                    </p>
                </div>

                {unreadCount > 0 && (
                    <button
                        type="button"
                        className="notifications-mark-all"
                        onClick={handleMarkAllAsRead}
                        disabled={markingAllRead}
                    >
                        {markingAllRead
                            ? "Updating..."
                            : "Mark all as read"}
                    </button>
                )}
            </section>

            {/* LOADING */}

            {loading && (
                <div className="notifications-state">
                    <div className="notifications-state-icon">
                        🔔
                    </div>

                    <p>Loading your notifications...</p>
                </div>
            )}

            {/* ERROR */}

            {!loading && error && (
                <div className="notifications-state notifications-error">
                    <div className="notifications-state-icon">
                        ⚠️
                    </div>

                    <p>{error}</p>

                    <button
                        type="button"
                        onClick={() => window.location.reload()}
                    >
                        Try Again
                    </button>
                </div>
            )}

            {/* EMPTY STATE */}

            {!loading &&
                !error &&
                notifications.length === 0 && (
                    <div className="notifications-state">
                        <div className="notifications-state-icon">
                            🌿
                        </div>

                        <h2>You're all caught up</h2>

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

            {/* NOTIFICATION LIST */}

            {!loading &&
                !error &&
                notifications.length > 0 && (
                    <section className="notifications-list">
                        {notifications.map((notification) => (
                            <article
                                key={notification.id}
                                className={
                                    notification.is_read
                                        ? "notification-item"
                                        : "notification-item notification-unread"
                                }
                            >
                                {/* NOTIFICATION ICON */}

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
                                                        : "🔔"}
                                </div>

                                {/* NOTIFICATION CONTENT */}

                                <div className="notification-content">
                                    <div className="notification-title-row">
                                        <h2>{notification.title}</h2>

                                        {!notification.is_read && (
                                            <span className="notification-unread-label">
                                                New
                                            </span>
                                        )}
                                    </div>

                                    <p>{notification.message}</p>

                                    <div className="notification-meta">
                                        <span>
                                            {notification.notification_type}
                                        </span>

                                        <span>
                                            {notification.created_at
                                                ? new Date(
                                                    notification.created_at
                                                ).toLocaleString()
                                                : ""}
                                        </span>
                                    </div>

                                    {/* NOTIFICATION ACTIONS */}

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
                                                {getActionLabel(notification)}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </article>
                        ))}
                    </section>
                )}
        </div>
    )
}

export default Notifications
