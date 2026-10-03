// =========================================================
// THAFARI CONVERSATIONS PAGE
// =========================================================
//
// This page displays all conversations belonging to the
// currently authenticated user.
//
// Conversations are now organised by customer ↔ tour operator,
// rather than by individual booking.
//
// The backend automatically makes sure that customers with
// bookings have the appropriate operator conversations.
//
// =========================================================

import {
    useCallback,
    useEffect,
    useState,
} from "react"

import {
    Navigate,
    useNavigate,
} from "react-router-dom"

import { useAuth } from "../context/AuthContext"

import {
    getConversations,
} from "../services/chatService"

import "./Conversations.css"


// =========================================================
// CONVERSATIONS COMPONENT
// =========================================================

function Conversations() {

    // ---------------------------------------------------------
    // AUTHENTICATION
    // ---------------------------------------------------------

    const {
        accessToken,
        isAuthenticated,
        authLoading,
    } = useAuth()


    // ---------------------------------------------------------
    // ROUTER
    // ---------------------------------------------------------

    const navigate = useNavigate()


    // ---------------------------------------------------------
    // PAGE STATE
    // ---------------------------------------------------------

    const [
        conversations,
        setConversations,
    ] = useState([])


    const [
        loading,
        setLoading,
    ] = useState(true)


    const [
        error,
        setError,
    ] = useState("")


    // =========================================================
    // LOAD CONVERSATIONS
    // =========================================================

    const loadConversations = useCallback(
        async () => {

            if (
                !isAuthenticated ||
                !accessToken
            ) {

                setConversations([])

                setLoading(false)

                return
            }


            try {

                setLoading(true)

                setError("")


                console.log(
                    "Loading conversations..."
                )


                // -------------------------------------------------
                // The backend now handles the customer ↔ operator
                // conversation logic.
                //
                // We no longer need to create a conversation from
                // a booking ID on the frontend.
                //
                // GET /api/conversations returns the customer's
                // available operator conversations.
                // -------------------------------------------------

                const data =
                    await getConversations(
                        accessToken
                    )


                console.log(
                    "Conversations response:",
                    data
                )


                const loadedConversations =
                    Array.isArray(
                        data?.conversations
                    )
                        ? data.conversations
                        : []


                setConversations(
                    loadedConversations
                )

            } catch (error) {

                console.error(
                    "Failed to load conversations:",
                    error
                )


                // -------------------------------------------------
                // SHOW THE ACTUAL BACKEND ERROR
                // -------------------------------------------------

                const status =
                    error?.response?.status


                const backendMessage =
                    error?.response?.data?.message ||
                    error?.response?.data?.error


                let errorMessage =
                    "Failed to load your conversations."


                if (status) {

                    errorMessage +=
                        ` Server returned ${status}.`

                }


                if (backendMessage) {

                    errorMessage +=
                        ` ${backendMessage}`

                }


                setError(
                    errorMessage
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


    // =========================================================
    // INITIAL LOAD
    // =========================================================

    useEffect(() => {

        if (authLoading) {
            return
        }


        loadConversations()

    }, [
        authLoading,
        loadConversations,
    ])


    // =========================================================
    // OPEN EXISTING CONVERSATION
    // =========================================================

    const handleOpenConversation = (
        conversationId
    ) => {

        if (!conversationId) {
            return
        }


        navigate(
            `/chat/${conversationId}`
        )

    }


    // =========================================================
    // AUTH LOADING
    // =========================================================

    if (authLoading) {

        return (

            <main className="conversations-page">

                <div className="conversations-loading">

                    <p>
                        Loading your messages...
                    </p>

                </div>

            </main>

        )
    }


    // =========================================================
    // AUTH PROTECTION
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
    // MAIN PAGE
    // =========================================================

    return (

        <main className="conversations-page">

            {/* =================================================
                WELCOME SECTION
            ================================================= */}

            <section className="conversations-welcome">

                <div className="conversations-welcome-content">

                    <span className="conversations-welcome-eyebrow">
                        THAFARI MESSAGES
                    </span>


                    <h1>
                        Jambo, Traveller! 👋🏽
                    </h1>


                    <p>
                        Your safari conversations live here.
                        Have a question about your booking,
                        departure, or adventure? Chat directly
                        with your tour operator.
                    </p>

                </div>


                <div
                    className="conversations-welcome-icon"
                    aria-hidden="true"
                >
                    💬
                </div>

            </section>


            {/* =================================================
                CONVERSATIONS HEADER
            ================================================= */}

            <section className="conversations-header">

                <div>

                    <h2>
                        Your Conversations
                    </h2>

                    <p>
                        Stay connected with your tour operators.
                    </p>

                </div>

            </section>


            {/* =================================================
                ERROR MESSAGE
            ================================================= */}

            {error && (

                <div
                    className="conversations-error"
                    role="alert"
                >

                    <div>

                        <strong>
                            Something went wrong
                        </strong>

                        <p>
                            {error}
                        </p>

                    </div>


                    <button
                        type="button"
                        onClick={loadConversations}
                        disabled={loading}
                    >
                        {loading
                            ? "Loading..."
                            : "Try Again"
                        }
                    </button>

                </div>

            )}


            {/* =================================================
                LOADING
            ================================================= */}

            {loading && (

                <div className="conversations-loading">

                    <p>
                        Loading your conversations...
                    </p>

                </div>

            )}


            {/* =================================================
                EMPTY STATE
            ================================================= */}

            {!loading &&
                !error &&
                conversations.length === 0 && (

                    <div className="conversations-empty">

                        <div className="conversations-empty-icon">
                            💬
                        </div>

                        <h2>
                            No conversations yet
                        </h2>

                        <p>
                            Once you have a booking with a tour
                            operator, your conversation will appear
                            here automatically.
                        </p>

                    </div>

                )}


            {/* =================================================
                CONVERSATION LIST
            ================================================= */}

            {!loading &&
                conversations.length > 0 && (

                    <section className="conversation-list">

                        {conversations.map(
                            (conversation) => {

                                const otherUser =
                                    conversation?.other_user


                                const latestMessage =
                                    conversation?.latest_message


                                const unreadCount =
                                    Number(
                                        conversation?.unread_count || 0
                                    )


                                const firstName =
                                    otherUser?.first_name || ""


                                const lastName =
                                    otherUser?.last_name || ""


                                const fullName =
                                    `${firstName} ${lastName}`
                                        .trim()


                                const displayName =
                                    fullName ||
                                    "Tour Operator"


                                return (

                                    <button
                                        type="button"
                                        className={`conversation-card ${
                                            unreadCount > 0
                                                ? "has-unread"
                                                : ""
                                        }`}
                                        key={
                                            conversation.conversation_id
                                        }
                                        onClick={() =>
                                            handleOpenConversation(
                                                conversation.conversation_id
                                            )
                                        }
                                    >

                                        {/* =================================
                                            AVATAR
                                        ================================= */}

                                        <div className="conversation-avatar">

                                            {firstName
                                                ? firstName
                                                    .charAt(0)
                                                    .toUpperCase()
                                                : "💬"
                                            }

                                        </div>


                                        {/* =================================
                                            CONTENT
                                        ================================= */}

                                        <div className="conversation-content">

                                            <div className="conversation-top-row">

                                                <div>

                                                    <h3>
                                                        {displayName}
                                                    </h3>

                                                    <span>
                                                        {otherUser?.role ===
                                                        "tour_operator"
                                                            ? "Tour Operator"
                                                            : otherUser?.role ||
                                                              "Participant"
                                                        }
                                                    </span>

                                                </div>


                                                {latestMessage?.created_at && (

                                                    <time>
                                                        {new Date(
                                                            latestMessage.created_at
                                                        ).toLocaleString(
                                                            "en-KE",
                                                            {
                                                                dateStyle:
                                                                    "medium",
                                                                timeStyle:
                                                                    "short",
                                                            }
                                                        )}
                                                    </time>

                                                )}

                                            </div>


                                            <div className="conversation-bottom-row">

                                                <p>

                                                    {latestMessage?.content ||
                                                        "No messages yet."
                                                    }

                                                </p>


                                                {unreadCount > 0 && (

                                                    <span className="conversation-unread-badge">

                                                        {unreadCount > 99
                                                            ? "99+"
                                                            : unreadCount
                                                        }

                                                    </span>

                                                )}

                                            </div>

                                        </div>

                                    </button>

                                )

                            }
                        )}

                    </section>

                )}

        </main>

    )
}


export default Conversations
