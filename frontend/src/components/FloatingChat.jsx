// =========================================================
// THAFARI - FLOATING CHAT LAUNCHER
// =========================================================
//
// This component provides the floating chat button that
// appears throughout the authenticated Thafari application.
//
// Features:
//
// - Floating chat button
// - Unread message badge
// - Automatically refreshes unread count
// - Opens the conversations inbox
// - Hidden while already viewing the chat/inbox
// - Only visible to authenticated users
//
// =========================================================

import {
    useCallback,
    useEffect,
    useState,
} from "react"

import {
    useLocation,
    useNavigate,
} from "react-router-dom"

import {
    useAuth,
} from "../context/AuthContext"

import api from "../services/api"

import "./FloatingChat.css"


// =========================================================
// FLOATING CHAT COMPONENT
// =========================================================

function FloatingChat() {

    // -----------------------------------------------------
    // AUTHENTICATION
    // -----------------------------------------------------

    const {
        accessToken,
        isAuthenticated,
    } = useAuth()


    // -----------------------------------------------------
    // ROUTING
    // -----------------------------------------------------

    const navigate =
        useNavigate()


    const location =
        useLocation()


    // -----------------------------------------------------
    // STATE
    // -----------------------------------------------------

    const [
        unreadCount,
        setUnreadCount,
    ] = useState(0)


    const [
        loading,
        setLoading,
    ] = useState(false)


    // =====================================================
    // CHECK WHETHER CHAT PAGE IS OPEN
    // =====================================================

    const isChatRoute =
        location.pathname === "/conversations" ||
        location.pathname.startsWith(
            "/chat/"
        )


    // =====================================================
    // LOAD UNREAD MESSAGES
    // =====================================================
    // Use the lightweight endpoint instead of loading every
    // conversation and message preview just to calculate a badge.
    // =====================================================

    const loadUnreadCount =
        useCallback(
            async () => {

                if (
                    !isAuthenticated ||
                    !accessToken
                ) {
                    setUnreadCount(0)
                    return
                }

                try {
                    setLoading(true)

                    const response = await api.get(
                        "/conversations/unread-count"
                    )

                    const count = Number(
                        response.data?.unread_count ?? 0
                    )

                    setUnreadCount(
                        Number.isFinite(count) && count > 0
                            ? count
                            : 0
                    )

                } catch (error) {
                    // A badge failure should not break the application.
                    console.error(
                        "Failed to load unread chat count:",
                        error
                    )

                } finally {
                    setLoading(false)
                }
            },
            [
                accessToken,
                isAuthenticated,
            ]
        )


    // =====================================================
    // LOAD COUNT WHEN USER LOGS IN
    // =====================================================

    useEffect(() => {

        if (
            !isAuthenticated ||
            !accessToken ||
            isChatRoute
        ) {

            setUnreadCount(0)

            return
        }


        loadUnreadCount()

    }, [
        isAuthenticated,
        accessToken,
        isChatRoute,
        loadUnreadCount,
    ])


    // =====================================================
    // REFRESH UNREAD COUNT
    // =====================================================
    //
    // Refresh periodically while the floating launcher is visible.
    // The launcher is hidden on the inbox/chat routes, so it does
    // not poll while the user is already viewing messages.
    // A 60-second interval reduces repeated full conversation-list
    // requests while still updating the badge periodically.
    //
    // =====================================================

    useEffect(() => {

        if (
            !isAuthenticated ||
            !accessToken ||
            isChatRoute
        ) {
            return
        }


        const interval =
            window.setInterval(
                () => {

                    loadUnreadCount()

                },
                60000
            )


        return () => {

            window.clearInterval(
                interval
            )
        }

    }, [
        isAuthenticated,
        accessToken,
        isChatRoute,
        loadUnreadCount,
    ])


    // =====================================================
    // REFRESH WHEN USER RETURNS TO THE TAB
    // =====================================================

    useEffect(() => {

        if (
            !isAuthenticated ||
            !accessToken ||
            isChatRoute
        ) {
            return
        }


        const handleVisibilityChange =
            () => {

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


        return () => {

            document.removeEventListener(
                "visibilitychange",
                handleVisibilityChange
            )
        }

    }, [
        isAuthenticated,
        accessToken,
        isChatRoute,
        loadUnreadCount,
    ])


    // =====================================================
    // OPEN MESSAGES
    // =====================================================

    const handleOpenChat = () => {

        navigate(
            "/conversations"
        )
    }


    // =====================================================
    // DON'T RENDER FOR LOGGED-OUT USERS
    // =====================================================

    if (
        !isAuthenticated ||
        !accessToken
    ) {
        return null
    }


    // =====================================================
    // DON'T SHOW WHILE ALREADY IN CHAT
    // =====================================================

    if (isChatRoute) {
        return null
    }


    // =====================================================
    // DISPLAY COUNT
    // =====================================================

    const displayCount =
        unreadCount > 99
            ? "99+"
            : unreadCount


    // =====================================================
    // RENDER
    // =====================================================

    return (

        <button
            type="button"
            className={
                `floating-chat-button ${
                    unreadCount > 0
                        ? "has-unread"
                        : ""
                }`
            }
            onClick={
                handleOpenChat
            }
            aria-label={
                unreadCount > 0
                    ? `Open messages. ${unreadCount} unread messages.`
                    : "Open messages"
            }
            title="Messages"
            disabled={loading && false}
        >

            {/* =================================================
                CHAT ICON
            ================================================= */}

            <span
                className="floating-chat-icon"
                aria-hidden="true"
            >
                💬
            </span>


            {/* =================================================
                UNREAD BADGE
            ================================================= */}

            {unreadCount > 0 && (

                <span
                    className="floating-chat-badge"
                    aria-label={
                        `${unreadCount} unread messages`
                    }
                >
                    {displayCount}
                </span>

            )}


            {/* =================================================
                SCREEN READER LABEL
            ================================================= */}

            <span className="floating-chat-label">
                Messages
            </span>

        </button>
    )
}


export default FloatingChat