// =========================================================
// THAFARI NOTIFICATION SERVICE
// =========================================================
//
// This file contains API requests related to notifications.
//
// Authentication is handled automatically by api.js using
// the HttpOnly authentication cookie.
//
// React pages and components do not need to know the exact
// backend authentication mechanism.
//
// =========================================================

import api from "./api"


// =========================================================
// GET ALL NOTIFICATIONS
// =========================================================
//
// Calls:
//
// GET /api/notifications
//
// The backend determines which notifications belong to the
// authenticated user using the HttpOnly authentication cookie.
//
// =========================================================

export const getNotifications = async () => {

    const response = await api.get(
        "/notifications"
    )

    return response.data
}


// =========================================================
// GET UNREAD NOTIFICATIONS
// =========================================================
//
// Calls:
//
// GET /api/notifications/unread
//
// Returns only notifications that have not been read.
//
// =========================================================

export const getUnreadNotifications = async () => {

    const response = await api.get(
        "/notifications/unread"
    )

    return response.data
}


// =========================================================
// GET UNREAD NOTIFICATION COUNT
// =========================================================
//
// Calls:
//
// GET /api/notifications/unread-count
//
// Used by the Navbar notification bell.
//
// Authentication is supplied by the HttpOnly cookie.
//
// =========================================================

export const getUnreadNotificationCount = async () => {

    const response = await api.get(
        "/notifications/unread-count"
    )

    return response.data
}


// =========================================================
// MARK ONE NOTIFICATION AS READ
// =========================================================
//
// Calls:
//
// PATCH /api/notifications/<notification_id>/read
//
// Marks one notification as read.
//
// The api.js request interceptor automatically supplies the
// CSRF token required for this unsafe request.
//
// =========================================================

export const markNotificationAsRead = async (
    notificationId
) => {

    const response = await api.patch(
        `/notifications/${notificationId}/read`,
        {}
    )

    return response.data
}


// =========================================================
// MARK ALL NOTIFICATIONS AS READ
// =========================================================
//
// Calls:
//
// PATCH /api/notifications/read-all
//
// Marks all notifications belonging to the currently
// authenticated user as read.
//
// The api.js request interceptor automatically supplies the
// CSRF token required for this unsafe request.
//
// =========================================================

export const markAllNotificationsAsRead = async () => {

    const response = await api.patch(
        "/notifications/read-all",
        {}
    )

    return response.data
}