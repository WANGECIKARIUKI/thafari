// =========================================================
// THAFARI NOTIFICATION SERVICE
// =========================================================
//
// This file contains API requests related to notifications.
//
// Keeping notification requests here means our React pages
// and components do not need to know the exact backend URLs.
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
// The backend uses the JWT access token to determine which
// user's notifications should be returned.
// =========================================================

export const getNotifications = async (accessToken) => {

    const response = await api.get(
        "/notifications",
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        }
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
// This returns only notifications that have not been read.
// =========================================================

export const getUnreadNotifications = async (accessToken) => {

    const response = await api.get(
        "/notifications/unread",
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        }
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
// This is used by the Navbar notification bell.
// =========================================================

export const getUnreadNotificationCount = async (accessToken) => {

    const response = await api.get(
        "/notifications/unread-count",
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        }
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
// This marks one notification as read.
// =========================================================

export const markNotificationAsRead = async (
    accessToken,
    notificationId
) => {

    const response = await api.patch(
        `/notifications/${notificationId}/read`,
        {},
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        }
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
// This marks all notifications belonging to the current
// authenticated user as read.
// =========================================================

export const markAllNotificationsAsRead = async (
    accessToken
) => {

    const response = await api.patch(
        "/notifications/read-all",
        {},
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        }
    )

    return response.data
}