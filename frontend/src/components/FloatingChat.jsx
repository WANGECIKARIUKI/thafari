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

import {
    getConversations,
} from "../services/chatService"

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
    //
    // The conversations endpoint already returns:
    //
    // unread_count
    //
    // for every conversation belonging to the current user.
    //
    // We simply add those values together.
    //
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


                    const data =
                        await getConversations(
                            accessToken
                        )


                    const conversations =
                        Array.isArray(
                            data?.conversations
                        )
                            ? data.conversations
                            : []


                    const totalUnread =
                        conversations.reduce(
                            (
                                total,
                                conversation
                            ) => {

                                const count =
                                    Number(
                                        conversation?.unread_count ||
                                        0
                                    )


                                return (
                                    total +
                                    (
                                        Number.isFinite(
                                            count
                                        )
                                            ? count
                                            : 0
                                    )
                                )

                            },
                            0
                        )


                    setUnreadCount(
                        totalUnread
                    )

                } catch (error) {

                    // -------------------------------------------------
                    // The floating button should never break the rest
                    // of the application if the unread-count request
                    // fails.
                    // -------------------------------------------------

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
            !accessToken
        ) {

            setUnreadCount(0)

            return
        }


        loadUnreadCount()

    }, [
        isAuthenticated,
        accessToken,
        loadUnreadCount,
    ])


    // =====================================================
    // REFRESH UNREAD COUNT
    // =====================================================
    //
    // We refresh periodically so the floating button can
    // notice messages received while the user is elsewhere
    // in Thafari.
    //
    // We intentionally use a reasonable interval rather
    // than making a request every second.
    //
    // =====================================================

    useEffect(() => {

        if (
            !isAuthenticated ||
            !accessToken
        ) {
            return
        }


        const interval =
            window.setInterval(
                () => {

                    loadUnreadCount()

                },
                15000
            )


        return () => {

            window.clearInterval(
                interval
            )
        }

    }, [
        isAuthenticated,
        accessToken,
        loadUnreadCount,
    ])


    // =====================================================
    // REFRESH WHEN USER RETURNS TO THE TAB
    // =====================================================

    useEffect(() => {

        if (
            !isAuthenticated ||
            !accessToken
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