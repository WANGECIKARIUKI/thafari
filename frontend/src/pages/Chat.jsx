// =========================================================
// THAFARI - CHAT PAGE
// =========================================================
//
// This page handles one conversation between Thafari users.
//
// Features:
//
// - Loads the conversation history
// - Connects to Socket.IO for real-time messaging
// - Joins the current conversation room
// - Receives new messages in real time
// - Sends through Socket.IO when connected
// - Falls back to the REST API when Socket.IO is not ready
// - Allows the user to send messages while Socket.IO is
//   still connecting
// - Marks the conversation as read
// - Shows connection status without blocking the chat
//
// Backend REST endpoints:
//
// GET   /api/conversations
// GET   /api/conversations/<id>/messages
// POST  /api/conversations/<id>/messages
// PATCH /api/conversations/<id>/read
//
// Socket.IO events:
//
// join_conversation
// send_message
// new_message
// messages_read
//
// =========================================================

import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react"

import {
    Link,
    Navigate,
    useNavigate,
    useParams,
} from "react-router-dom"

import {
    io,
} from "socket.io-client"

import api from "../services/api"

import { useAuth } from "../context/AuthContext"

import "./Chat.css"


// =========================================================
// CHAT COMPONENT
// =========================================================

function Chat() {

    // -----------------------------------------------------
    // ROUTER
    // -----------------------------------------------------

    const {
        conversationId,
    } = useParams()


    const navigate =
        useNavigate()


    // -----------------------------------------------------
    // AUTHENTICATION
    // -----------------------------------------------------

    const {
        accessToken,
        isAuthenticated,
        authLoading,
        user,
    } = useAuth()


    // -----------------------------------------------------
    // STATE
    // -----------------------------------------------------

    const [
        conversation,
        setConversation,
    ] = useState(null)


    const [
        messages,
        setMessages,
    ] = useState([])


    const [
        messageText,
        setMessageText,
    ] = useState("")


    const [
        loading,
        setLoading,
    ] = useState(true)


    const [
        sending,
        setSending,
    ] = useState(false)


    const [
        error,
        setError,
    ] = useState("")


    // -----------------------------------------------------
    // SOCKET STATE
    // -----------------------------------------------------

    const [
        socketConnected,
        setSocketConnected,
    ] = useState(false)


    const [
        socketConnecting,
        setSocketConnecting,
    ] = useState(false)


    // -----------------------------------------------------
    // REFS
    // -----------------------------------------------------

    // Keep the socket instance outside normal React state.
    //
    // Changing a socket connection should not cause the
    // entire component to re-render.
    const socketRef =
        useRef(null)


    // Used to automatically scroll to the latest message.
    const messagesEndRef =
        useRef(null)


    // Used to prevent duplicate messages.
    const messageIdsRef =
        useRef(new Set())


    // Used to avoid state updates after an effect has
    // already been cleaned up.
    const mountedRef =
        useRef(true)


    // =====================================================
    // API BASE URL FOR SOCKET.IO
    // =====================================================
    //
    // VITE_API_URL is:
    //
    // http://127.0.0.1:5000/api
    //
    // Socket.IO connects to the server itself:
    //
    // http://127.0.0.1:5000
    //
    // Therefore we remove the /api part.
    //
    // =====================================================

    const getSocketUrl = () => {

        const apiUrl =
            import.meta.env.VITE_API_URL


        if (!apiUrl) {

            return window.location.origin
        }


        return apiUrl.replace(
            /\/api\/?$/,
            ""
        )
    }


    // =====================================================
    // SCROLL TO BOTTOM
    // =====================================================

    const scrollToBottom = (
        smooth = true
    ) => {

        messagesEndRef.current?.scrollIntoView({
            behavior:
                smooth
                    ? "smooth"
                    : "auto",
        })
    }


    // =====================================================
    // FORMAT DATE
    // =====================================================

    const formatMessageTime = (
        value
    ) => {

        if (!value) {
            return ""
        }


        const date =
            new Date(value)


        if (
            Number.isNaN(
                date.getTime()
            )
        ) {
            return ""
        }


        return date.toLocaleTimeString(
            "en-KE",
            {
                hour: "2-digit",
                minute: "2-digit",
            }
        )
    }


    // =====================================================
    // GET OTHER USER
    // =====================================================

    const getOtherUser = (
        conversationData
    ) => {

        return (
            conversationData?.other_user ||
            null
        )
    }


    // =====================================================
    // GET USER NAME
    // =====================================================

    const getUserName = (
        otherUser
    ) => {

        if (!otherUser) {
            return "Conversation"
        }


        const firstName =
            otherUser.first_name || ""


        const lastName =
            otherUser.last_name || ""


        const fullName =
            `${firstName} ${lastName}`.trim()


        if (fullName) {
            return fullName
        }


        if (otherUser.username) {
            return otherUser.username
        }


        return `User ${otherUser.user_id}`
    }


    // =====================================================
    // GET ROLE LABEL
    // =====================================================

    const getRoleLabel = (
        otherUser
    ) => {

        const role =
            otherUser?.role


        if (role === "tour_operator") {
            return "Tour Operator"
        }


        if (role === "customer") {
            return "Customer"
        }


        if (role === "admin") {
            return "Admin"
        }


        if (!role) {
            return "Thafari"
        }


        return role
            .replaceAll(
                "_",
                " "
            )
            .replace(
                /\b\w/g,
                (letter) =>
                    letter.toUpperCase()
            )
    }


    // =====================================================
    // ADD MESSAGE WITHOUT DUPLICATES
    // =====================================================

    const addMessageIfNew = (
        incomingMessage
    ) => {

        if (!incomingMessage) {
            return
        }


        const messageId =
            incomingMessage.message_id ||
            incomingMessage.id


        // -------------------------------------------------
        // If there is a database ID, use it to prevent
        // duplicate messages.
        // -------------------------------------------------

        if (messageId) {

            if (
                messageIdsRef.current.has(
                    messageId
                )
            ) {
                return
            }


            messageIdsRef.current.add(
                messageId
            )
        }


        setMessages(
            previousMessages => {

                // -------------------------------------------------
                // Extra duplicate protection.
                //
                // This also protects us if the backend sends
                // a message without a message_id.
                // -------------------------------------------------

                if (
                    messageId &&
                    previousMessages.some(
                        message =>
                            (
                                message.message_id ||
                                message.id
                            ) === messageId
                    )
                ) {

                    return previousMessages
                }


                return [
                    ...previousMessages,
                    incomingMessage,
                ]
            }
        )
    }


    // =====================================================
    // LOAD CONVERSATION + MESSAGES
    // =====================================================

    const loadChat = useCallback(
        async () => {

            if (
                !accessToken ||
                !conversationId
            ) {
                return
            }


            try {

                setLoading(true)

                setError("")


                // -------------------------------------------------
                // LOAD USER CONVERSATIONS
                // -------------------------------------------------

                const conversationsResponse =
                    await api.get(
                        "/conversations",
                        {
                            headers: {
                                Authorization:
                                    `Bearer ${accessToken}`,
                            },
                        }
                    )


                const conversations =
                    Array.isArray(
                        conversationsResponse
                            ?.data
                            ?.conversations
                    )
                        ? conversationsResponse
                            .data
                            .conversations
                        : []


                const currentConversation =
                    conversations.find(
                        item =>
                            String(
                                item.conversation_id
                            ) ===
                            String(
                                conversationId
                            )
                    )


                if (!currentConversation) {

                    setError(
                        "This conversation could not be found or you are not a participant."
                    )

                    return
                }


                if (!mountedRef.current) {
                    return
                }


                setConversation(
                    currentConversation
                )


                // -------------------------------------------------
                // LOAD MESSAGE HISTORY
                // -------------------------------------------------

                const messagesResponse =
                    await api.get(
                        `/conversations/${conversationId}/messages`,
                        {
                            headers: {
                                Authorization:
                                    `Bearer ${accessToken}`,
                            },
                        }
                    )


                const loadedMessages =
                    Array.isArray(
                        messagesResponse
                            ?.data
                            ?.messages
                    )
                        ? messagesResponse
                            .data
                            .messages
                        : []


                if (!mountedRef.current) {
                    return
                }


                // Reset duplicate tracking.
                messageIdsRef.current.clear()


                loadedMessages.forEach(
                    message => {

                        const messageId =
                            message.message_id ||
                            message.id


                        if (messageId) {

                            messageIdsRef.current.add(
                                messageId
                            )
                        }
                    }
                )


                setMessages(
                    loadedMessages
                )


                // -------------------------------------------------
                // MARK AS READ
                // -------------------------------------------------

                try {

                    await api.patch(
                        `/conversations/${conversationId}/read`,
                        {},
                        {
                            headers: {
                                Authorization:
                                    `Bearer ${accessToken}`,
                            },
                        }
                    )

                } catch (readError) {

                    // Marking as read should never prevent the
                    // user from opening the conversation.
                    console.error(
                        "Failed to mark conversation as read:",
                        readError
                    )
                }

            } catch (requestError) {

                console.error(
                    "Failed to load chat:",
                    requestError
                )


                if (
                    !mountedRef.current
                ) {
                    return
                }


                setError(
                    requestError
                        ?.response
                        ?.data
                        ?.message ||
                    requestError
                        ?.response
                        ?.data
                        ?.error ||
                    "Unable to load this conversation."
                )

            } finally {

                if (
                    mountedRef.current
                ) {

                    setLoading(false)
                }
            }

        },
        [
            accessToken,
            conversationId,
        ]
    )


    // =====================================================
    // LOAD CHAT WHEN PAGE OPENS
    // =====================================================

    useEffect(() => {

        mountedRef.current = true


        if (
            authLoading ||
            !isAuthenticated ||
            !accessToken
        ) {
            return
        }


        loadChat()


        return () => {

            mountedRef.current = false
        }

    }, [
        authLoading,
        isAuthenticated,
        accessToken,
        loadChat,
    ])


    // =====================================================
    // SOCKET.IO CONNECTION
    // =====================================================
    //
    // IMPORTANT:
    //
    // Socket.IO is NOT allowed to block sending.
    //
    // If it connects:
    //     → real-time messaging
    //
    // If it is connecting:
    //     → user can still send through REST
    //
    // If it disconnects:
    //     → user can still send through REST
    //
    // =====================================================

    useEffect(() => {

        if (
            authLoading ||
            !isAuthenticated ||
            !accessToken ||
            !conversationId
        ) {
            return
        }


        // -----------------------------------------------------
        // CREATE SOCKET
        // -----------------------------------------------------

        const socket =
            io(
                getSocketUrl(),
                {
                    auth: {
                        access_token:
                            accessToken,
                    },

                    // We want Socket.IO to reconnect
                    // automatically when possible.
                    reconnection: true,

                    reconnectionAttempts: Infinity,

                    reconnectionDelay: 1000,

                    reconnectionDelayMax: 5000,
                }
            )


        socketRef.current =
            socket


        // -----------------------------------------------------
        // INITIAL CONNECTION STATE
        // -----------------------------------------------------

        setSocketConnecting(true)

        setSocketConnected(false)


        // =====================================================
        // CONNECTED
        // =====================================================

        socket.on(
            "connect",
            () => {

                console.log(
                    "Thafari chat socket connected:",
                    socket.id
                )


                if (
                    !mountedRef.current
                ) {
                    return
                }


                setSocketConnected(true)

                setSocketConnecting(false)


                // -------------------------------------------------
                // JOIN CURRENT CONVERSATION
                // -------------------------------------------------

                socket.emit(
                    "join_conversation",
                    {
                        conversation_id:
                            Number(
                                conversationId
                            ),
                    }
                )


                // -------------------------------------------------
                // Mark the conversation as read after joining.
                // -------------------------------------------------

                socket.emit(
                    "mark_messages_read",
                    {
                        conversation_id:
                            Number(
                                conversationId
                            ),
                    }
                )
            }
        )


        // =====================================================
        // CONNECTION ERROR
        // =====================================================

        socket.on(
            "connect_error",
            (socketError) => {

                console.error(
                    "Thafari chat socket connection error:",
                    socketError
                )


                if (
                    !mountedRef.current
                ) {
                    return
                }


                setSocketConnected(false)

                setSocketConnecting(false)
            }
        )


        // =====================================================
        // RECONNECT ATTEMPT
        // =====================================================

        socket.io.on(
            "reconnect_attempt",
            () => {

                if (
                    !mountedRef.current
                ) {
                    return
                }


                setSocketConnecting(true)
            }
        )


        // =====================================================
        // DISCONNECTED
        // =====================================================

        socket.on(
            "disconnect",
            (reason) => {

                console.log(
                    "Thafari chat socket disconnected:",
                    reason
                )


                if (
                    !mountedRef.current
                ) {
                    return
                }


                setSocketConnected(false)

                setSocketConnecting(false)
            }
        )


        // =====================================================
        // NEW MESSAGE
        // =====================================================

        socket.on(
            "new_message",
            (incomingMessage) => {

                console.log(
                    "New Thafari message:",
                    incomingMessage
                )


                if (
                    !mountedRef.current
                ) {
                    return
                }


                // -------------------------------------------------
                // Only accept messages belonging to this
                // conversation.
                // -------------------------------------------------

                if (
                    incomingMessage?.conversation_id &&
                    String(
                        incomingMessage.conversation_id
                    ) !== String(
                        conversationId
                    )
                ) {

                    return
                }


                addMessageIfNew(
                    incomingMessage
                )


                // -------------------------------------------------
                // If the user is currently inside this chat,
                // immediately mark the new message as read.
                // -------------------------------------------------

                socket.emit(
                    "mark_messages_read",
                    {
                        conversation_id:
                            Number(
                                conversationId
                            ),
                    }
                )


                // Also update the REST record.
                api.patch(
                    `/conversations/${conversationId}/read`,
                    {},
                    {
                        headers: {
                            Authorization:
                                `Bearer ${accessToken}`,
                        },
                    }
                ).catch(
                    readError => {

                        console.error(
                            "Failed to mark incoming message as read:",
                            readError
                        )
                    }
                )
            }
        )


        // =====================================================
        // CLEANUP
        // =====================================================

        return () => {

            socket.off(
                "connect"
            )

            socket.off(
                "connect_error"
            )

            socket.off(
                "disconnect"
            )

            socket.off(
                "new_message"
            )

            socket.io.off(
                "reconnect_attempt"
            )


            socket.disconnect()


            if (
                socketRef.current ===
                socket
            ) {

                socketRef.current =
                    null
            }


            setSocketConnected(false)

            setSocketConnecting(false)
        }

    }, [
        authLoading,
        isAuthenticated,
        accessToken,
        conversationId,
    ])


    // =====================================================
    // AUTO-SCROLL WHEN MESSAGES CHANGE
    // =====================================================

    useEffect(() => {

        if (loading) {
            return
        }


        const timer =
            setTimeout(
                () => {

                    scrollToBottom(
                        true
                    )

                },
                50
            )


        return () => {

            clearTimeout(
                timer
            )
        }

    }, [
        messages,
        loading,
    ])


    // =====================================================
    // SEND MESSAGE THROUGH REST
    // =====================================================
    //
    // This is our fallback.
    //
    // The backend already supports:
    //
    // POST /api/conversations/<id>/messages
    //
    // So the user does NOT need to wait for Socket.IO.
    //
    // =====================================================

    const sendMessageWithRest =
        async (
            content
        ) => {

            const response =
                await api.post(
                    `/conversations/${conversationId}/messages`,
                    {
                        content,
                    },
                    {
                        headers: {
                            Authorization:
                                `Bearer ${accessToken}`,
                        },
                    }
                )


            const savedMessage =
                response?.data?.message


            if (
                savedMessage &&
                typeof savedMessage ===
                "object"
            ) {

                addMessageIfNew(
                    savedMessage
                )

            } else {

                // -------------------------------------------------
                // Some backend response versions return the
                // message fields directly instead of inside
                // "message".
                // -------------------------------------------------

                const fallbackMessage = {
                    message_id:
                        response?.data?.message_id ||
                        response?.data?.id,

                    conversation_id:
                        Number(
                            conversationId
                        ),

                    sender_id:
                        Number(
                            user?.id ||
                            user?.user_id
                        ),

                    content,

                    created_at:
                        response?.data?.created_at ||
                        new Date().toISOString(),
                }


                addMessageIfNew(
                    fallbackMessage
                )
            }
        }


    // =====================================================
    // SEND MESSAGE
    // =====================================================

    const handleSendMessage =
        async (
            event
        ) => {

            event?.preventDefault()


            const content =
                messageText.trim()


            // -------------------------------------------------
            // Do not send empty messages.
            // -------------------------------------------------

            if (!content) {
                return
            }


            if (
                sending ||
                !conversationId ||
                !accessToken
            ) {
                return
            }


            try {

                setSending(true)

                setError("")


                // -------------------------------------------------
                // SOCKET IS READY
                // -------------------------------------------------
                //
                // Let the backend Socket.IO handler save the
                // message and broadcast it.
                //
                // IMPORTANT:
                //
                // We do NOT add the message locally here.
                //
                // The backend emits "new_message" back into
                // the conversation room, and that event adds
                // the message.
                // -------------------------------------------------

                if (
                    socketRef.current &&
                    socketRef.current.connected
                ) {

                    socketRef.current.emit(
                        "send_message",
                        {
                            conversation_id:
                                Number(
                                    conversationId
                                ),

                            content,
                        }
                    )


                    setMessageText("")


                    return
                }


                // -------------------------------------------------
                // SOCKET NOT READY
                // -------------------------------------------------
                //
                // DO NOT BLOCK THE USER.
                //
                // Use the existing REST endpoint instead.
                // -------------------------------------------------

                await sendMessageWithRest(
                    content
                )


                setMessageText("")

            } catch (sendError) {

                console.error(
                    "Failed to send message:",
                    sendError
                )


                setError(
                    sendError
                        ?.response
                        ?.data
                        ?.message ||
                    sendError
                        ?.response
                        ?.data
                        ?.error ||
                    "Your message could not be sent. Please try again."
                )

            } finally {

                if (
                    mountedRef.current
                ) {

                    setSending(false)
                }
            }
        }


    // =====================================================
    // SEND WITH ENTER
    // =====================================================

    const handleMessageKeyDown =
        (event) => {

            if (
                event.key === "Enter" &&
                !event.shiftKey
            ) {

                event.preventDefault()


                handleSendMessage(
                    event
                )
            }
        }


    // =====================================================
    // CONNECTION STATUS
    // =====================================================

    const getConnectionLabel = () => {

        if (socketConnected) {
            return "Online"
        }


        if (socketConnecting) {
            return "Connecting..."
        }


        return "Offline • messages still available"
    }


    // =====================================================
    // CONNECTION STATUS CLASS
    // =====================================================

    const getConnectionClass = () => {

        if (socketConnected) {
            return "connected"
        }


        if (socketConnecting) {
            return "connecting"
        }


        return "disconnected"
    }


    // =====================================================
    // AUTH LOADING
    // =====================================================

    if (authLoading) {

        return (

            <div className="chat-page">

                <div className="chat-state">

                    <div className="chat-state-icon">
                        ⏳
                    </div>

                    <h2>
                        Loading chat...
                    </h2>

                </div>

            </div>
        )
    }


    // =====================================================
    // AUTH PROTECTION
    // =====================================================

    if (!isAuthenticated) {

        return (

            <Navigate
                to="/login"
                replace
                state={{
                    from:
                        `/chat/${conversationId}`,
                }}
            />
        )
    }


    // =====================================================
    // LOADING
    // =====================================================

    if (loading) {

        return (

            <div className="chat-page">

                <div className="chat-state">

                    <div className="chat-state-icon">
                        💬
                    </div>

                    <h2>
                        Opening conversation...
                    </h2>

                    <p>
                        Loading your messages.
                    </p>

                </div>

            </div>
        )
    }


    // =====================================================
    // ERROR
    // =====================================================

    if (error && !conversation) {

        return (

            <div className="chat-page">

                <div className="chat-state chat-error-state">

                    <div className="chat-state-icon">
                        ⚠️
                    </div>

                    <h2>
                        Conversation unavailable
                    </h2>

                    <p>
                        {error}
                    </p>


                    <div className="chat-state-actions">

                        <button
                            type="button"
                            onClick={() =>
                                navigate(
                                    "/conversations"
                                )
                            }
                        >
                            Back to Messages
                        </button>

                    </div>

                </div>

            </div>
        )
    }


    // =====================================================
    // HEADER DATA
    // =====================================================

    const otherUser =
        getOtherUser(
            conversation
        )


    const otherUserName =
        getUserName(
            otherUser
        )


    const otherUserRole =
        getRoleLabel(
            otherUser
        )


    const avatarLetter =
        otherUserName
            .charAt(0)
            .toUpperCase()


    // =====================================================
    // RENDER
    // =====================================================

    return (

        <div className="chat-page">


            {/* =================================================
                CHAT HEADER
            ================================================= */}

            <header className="chat-header">


                {/* ---------------------------------------------
                    BACK BUTTON
                --------------------------------------------- */}

                <button
                    type="button"
                    className="chat-back-button"
                    onClick={() =>
                        navigate(
                            "/conversations"
                        )
                    }
                    aria-label="Back to conversations"
                >
                    ←
                </button>


                {/* ---------------------------------------------
                    USER AVATAR
                --------------------------------------------- */}

                <div className="chat-avatar">

                    {avatarLetter}

                </div>


                {/* ---------------------------------------------
                    USER DETAILS
                --------------------------------------------- */}

                <div className="chat-user-details">

                    <h1>
                        {otherUserName}
                    </h1>


                    <div className="chat-user-status">

                        <span>
                            {otherUserRole}
                        </span>


                        <span
                            className={
                                `chat-connection-status ${
                                    getConnectionClass()
                                }`
                            }
                        >

                            <span className="chat-status-dot"></span>

                            {
                                getConnectionLabel()
                            }

                        </span>

                    </div>

                </div>

            </header>


            {/* =================================================
                ERROR / FALLBACK MESSAGE
            ================================================= */}

            {error && (

                <div className="chat-inline-error">

                    <span>
                        {error}
                    </span>


                    <button
                        type="button"
                        onClick={() =>
                            setError("")
                        }
                    >
                        ×
                    </button>

                </div>
            )}


            {/* =================================================
                MESSAGE AREA
            ================================================= */}

            <main className="chat-messages">


                {/* ---------------------------------------------
                    EMPTY CHAT
                --------------------------------------------- */}

                {messages.length === 0 && (

                    <div className="chat-empty">

                        <div className="chat-empty-icon">
                            💬
                        </div>


                        <h2>
                            Start the conversation
                        </h2>


                        <p>
                            Send a message to{" "}
                            <strong>
                                {otherUserName}
                            </strong>
                            .
                        </p>

                    </div>
                )}


                {/* ---------------------------------------------
                    MESSAGE LIST
                --------------------------------------------- */}

                {messages.map(
                    (
                        message,
                        index
                    ) => {

                        const senderId =
                            Number(
                                message.sender_id
                            )


                        const currentUserId =
                            Number(
                                user?.id ||
                                user?.user_id
                            )


                        const isOwnMessage =
                            senderId ===
                            currentUserId


                        const messageKey =
                            message.message_id ||
                            message.id ||
                            `${message.created_at}-${index}`


                        return (

                            <div
                                key={
                                    messageKey
                                }
                                className={
                                    `chat-message-row ${
                                        isOwnMessage
                                            ? "own"
                                            : "other"
                                    }`
                                }
                            >

                                <div
                                    className={
                                        `chat-message-bubble ${
                                            isOwnMessage
                                                ? "own"
                                                : "other"
                                        }`
                                    }
                                >

                                    <p>
                                        {
                                            message.content
                                        }
                                    </p>


                                    <span className="chat-message-time">

                                        {
                                            formatMessageTime(
                                                message.created_at
                                            )
                                        }

                                    </span>

                                </div>

                            </div>
                        )
                    }
                )}


                {/* ---------------------------------------------
                    AUTO-SCROLL TARGET
                --------------------------------------------- */}

                <div
                    ref={
                        messagesEndRef
                    }
                />

            </main>


            {/* =================================================
                MESSAGE INPUT
            ================================================= */}

            <form
                className="chat-input-area"
                onSubmit={
                    handleSendMessage
                }
            >

                <textarea
                    value={
                        messageText
                    }
                    onChange={(event) =>
                        setMessageText(
                            event.target.value
                        )
                    }
                    onKeyDown={
                        handleMessageKeyDown
                    }
                    placeholder={
                        "Type your message..."
                    }
                    rows={1}
                    disabled={
                        sending
                    }
                    aria-label="Message"
                />


                <button
                    type="submit"
                    disabled={
                        sending ||
                        !messageText.trim()
                    }
                >

                    {sending
                        ? "Sending..."
                        : "Send"
                    }

                </button>

            </form>


            {/* =================================================
                CONNECTION HELP TEXT
            ================================================= */}

            {!socketConnected && (

                <div className="chat-connection-help">

                    {socketConnecting
                        ? "Real-time connection is starting. You can still send messages."
                        : "Real-time connection is unavailable. Messages are being sent normally."
                    }

                </div>
            )}

        </div>
    )
}


export default Chat