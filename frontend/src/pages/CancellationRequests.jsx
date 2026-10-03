// =========================================================
// THAFARI CANCELLATION REQUEST REVIEW
// =========================================================
//
// This page is used by:
//
// - Admins
// - Tour Operators
//
// It allows authorized staff to:
//
// 1. See pending cancellation requests.
// 2. See approved cancellation requests.
// 3. See denied cancellation requests.
// 4. Open cancellation-request details.
// 5. Approve a cancellation request.
// 6. Deny a cancellation request with a reason.
//
// IMPORTANT:
//
// The backend remains responsible for:
//
// - Authorization
// - Tour-operator ownership checks
// - Booking validation
// - Refund creation
// - Booking status changes
// - Notifications
// - Email notifications
//
// =========================================================


import {
    useEffect,
    useState,
} from "react"


import {
    Navigate,
    useParams,
} from "react-router-dom"


import {
    useAuth,
} from "../context/AuthContext"


import {
    getCancellationRequestHistory,
    approveCancellationRequest,
    denyCancellationRequest,
} from "../services/cancellationService"


import "./CancellationRequests.css"


// =========================================================
// HELPER: FORMAT MONEY
// =========================================================

const formatMoney = (amount) => {

    const number =
        Number(amount || 0)


    return new Intl.NumberFormat(
        "en-KE",
        {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }
    ).format(number)
}


// =========================================================
// HELPER: FORMAT DATE
// =========================================================

const formatDate = (value) => {

    if (!value) {
        return "—"
    }


    const date =
        new Date(value)


    if (Number.isNaN(date.getTime())) {
        return "—"
    }


    return date.toLocaleString(
        "en-KE",
        {
            dateStyle: "medium",
            timeStyle: "short",
        }
    )
}


// =========================================================
// HELPER: FORMAT DATE ONLY
// =========================================================
//
// Departure dates from the backend are returned as:
//
// YYYY-MM-DD
//
// We keep this helper separate because a departure date
// does not need to display a time.
//

const formatDepartureDate = (value) => {

    if (!value) {
        return "—"
    }


    const date =
        new Date(`${value}T00:00:00`)


    if (Number.isNaN(date.getTime())) {
        return "—"
    }


    return date.toLocaleDateString(
        "en-KE",
        {
            dateStyle: "medium",
        }
    )
}


// =========================================================
// HELPER: STATUS LABEL
// =========================================================

const statusLabel = (status) => {

    if (status === "pending") {
        return "Pending"
    }


    if (status === "approved") {
        return "Approved"
    }


    if (status === "denied") {
        return "Denied"
    }


    return status || "Unknown"
}


// =========================================================
// MAIN COMPONENT
// =========================================================

function CancellationRequests() {

    // ---------------------------------------------------------
    // AUTHENTICATION
    // ---------------------------------------------------------

    const {
        user,
        accessToken,
        isAuthenticated,
        authLoading,
    } = useAuth()


    // ---------------------------------------------------------
    // READ STATUS CATEGORY FROM URL
    // ---------------------------------------------------------
    //
    // The routes will be:
    //
    // /admin/cancellation-requests/pending
    // /admin/cancellation-requests/approved
    // /admin/cancellation-requests/denied
    //
    // All three routes intentionally use this same component.
    //
    // ---------------------------------------------------------

    const {
        status: routeStatus = "pending",
    } = useParams()


    // ---------------------------------------------------------
    // NORMALIZE STATUS
    // ---------------------------------------------------------

    const normalizeStatus = (status) => {

        if (status === "approved") {
            return "approved"
        }


        if (status === "denied") {
            return "denied"
        }


        return "pending"
    }


    const [
        activeFilter,
        setActiveFilter,
    ] = useState(
        normalizeStatus(routeStatus)
    )


    // ---------------------------------------------------------
    // PAGE STATE
    // ---------------------------------------------------------

    const [
        cancellationRequests,
        setCancellationRequests,
    ] = useState([])


    const [
        selectedRequest,
        setSelectedRequest,
    ] = useState(null)


    const [
        loading,
        setLoading,
    ] = useState(true)


    const [
        actionLoading,
        setActionLoading,
    ] = useState(false)


    const [
        error,
        setError,
    ] = useState("")


    const [
        successMessage,
        setSuccessMessage,
    ] = useState("")


    // ---------------------------------------------------------
    // DENIAL REASON
    // ---------------------------------------------------------

    const [
        denialReason,
        setDenialReason,
    ] = useState("")


    // ---------------------------------------------------------
    // REQUEST COUNTS
    // ---------------------------------------------------------
    //
    // We keep the counts separately from the currently
    // displayed list.
    //
    // This means the Pending, Approved and Denied cards
    // always show the actual totals.
    //
    // ---------------------------------------------------------

    const [
        requestCounts,
        setRequestCounts,
    ] = useState({
        all: 0,
        pending: 0,
        approved: 0,
        denied: 0,
    })


    // =========================================================
    // AUTOMATICALLY HIDE MESSAGES
    // =========================================================

    useEffect(() => {

        if (!successMessage && !error) {
            return
        }


        const toastTimer =
            setTimeout(() => {

                setSuccessMessage("")
                setError("")

            }, 3000)


        return () => {
            clearTimeout(toastTimer)
        }

    }, [
        successMessage,
        error,
    ])


    // =========================================================
    // LOAD CANCELLATION REQUEST HISTORY
    // =========================================================

    const loadCancellationHistory = async (
        statusOverride = null
    ) => {

        try {

            setLoading(true)
            setError("")
            setSuccessMessage("")


            // -------------------------------------------------
            // Determine which category should be displayed.
            // -------------------------------------------------

            const requestedStatus =
                statusOverride ||
                activeFilter


            // -------------------------------------------------
            // Load the currently selected category.
            // -------------------------------------------------

            const data =
                await getCancellationRequestHistory(
                    accessToken,
                    requestedStatus
                )


            setCancellationRequests(
                data.cancellation_requests || []
            )


            // -------------------------------------------------
            // Load all three categories separately.
            //
            // This keeps the summary counts accurate.
            // -------------------------------------------------

            const [
                pendingData,
                approvedData,
                deniedData,
            ] = await Promise.all([

                getCancellationRequestHistory(
                    accessToken,
                    "pending"
                ),

                getCancellationRequestHistory(
                    accessToken,
                    "approved"
                ),

                getCancellationRequestHistory(
                    accessToken,
                    "denied"
                ),
            ])


            const pendingCount =
                (
                    pendingData.cancellation_requests ||
                    []
                ).length


            const approvedCount =
                (
                    approvedData.cancellation_requests ||
                    []
                ).length


            const deniedCount =
                (
                    deniedData.cancellation_requests ||
                    []
                ).length


            setRequestCounts({
                pending: pendingCount,
                approved: approvedCount,
                denied: deniedCount,

                all:
                    pendingCount +
                    approvedCount +
                    deniedCount,
            })

        } catch (requestError) {

            console.error(
                "Failed to load cancellation requests:",
                requestError
            )


            setError(
                requestError.response?.data?.message ||
                requestError.message ||
                "Unable to load cancellation requests."
            )

        } finally {

            setLoading(false)
        }
    }


    // =========================================================
    // LOAD DATA WHEN PAGE OPENS
    // =========================================================

    useEffect(() => {

        if (
            authLoading ||
            !accessToken
        ) {
            return
        }


        if (
            user?.role !== "admin" &&
            user?.role !== "tour_operator"
        ) {
            return
        }


        // -----------------------------------------------------
        // Start the request asynchronously so the effect does
        // not synchronously update React state.
        // -----------------------------------------------------

        const loadTimer =
            setTimeout(() => {

                loadCancellationHistory()

            }, 0)


        return () => {
            clearTimeout(loadTimer)
        }

    }, [
        authLoading,
        accessToken,
        user,
        activeFilter,
    ])


    // =========================================================
    // KEEP ACTIVE FILTER IN SYNC WITH URL
    // =========================================================

    useEffect(() => {

        setActiveFilter(
            normalizeStatus(routeStatus)
        )

    }, [
        routeStatus,
    ])


    // =========================================================
    // OPEN CANCELLATION REQUEST DETAILS
    // =========================================================

    const handleViewRequest = (
        cancellationRequest
    ) => {

        setSelectedRequest(
            cancellationRequest
        )

        setDenialReason("")

        setError("")
        setSuccessMessage("")
    }


    // =========================================================
    // CLOSE DETAILS MODAL
    // =========================================================

    const handleCloseDetails = () => {

        if (actionLoading) {
            return
        }


        setSelectedRequest(null)

        setDenialReason("")

        setError("")
    }


    // =========================================================
    // APPROVE CANCELLATION REQUEST
    // =========================================================

    const handleApprove = async () => {

        if (
            !selectedRequest
                ?.cancellation_request_id
        ) {
            return
        }


        const requestId =
            selectedRequest.cancellation_request_id


        // -----------------------------------------------------
        // Confirmation before approving.
        // -----------------------------------------------------

        const confirmed =
            window.confirm(
                "Approve this cancellation request? This will initiate the refund process."
            )


        if (!confirmed) {
            return
        }


        try {

            setActionLoading(true)

            setError("")
            setSuccessMessage("")


            const data =
                await approveCancellationRequest(
                    requestId,
                    accessToken
                )


            // -------------------------------------------------
            // Close the review modal.
            // -------------------------------------------------

            setSelectedRequest(null)

            setDenialReason("")


            // -------------------------------------------------
            // Move to Approved category.
            // -------------------------------------------------

            setActiveFilter("approved")


            // -------------------------------------------------
            // Reload the approved category.
            // -------------------------------------------------

            await loadCancellationHistory(
                "approved"
            )


            // -------------------------------------------------
            // Display backend confirmation.
            // -------------------------------------------------

            setSuccessMessage(
                data.message ||
                "Cancellation request approved successfully."
            )

        } catch (requestError) {

            console.error(
                "Failed to approve cancellation request:",
                requestError
            )


            setError(
                requestError.response?.data?.message ||
                requestError.message ||
                "Unable to approve the cancellation request."
            )

        } finally {

            setActionLoading(false)
        }
    }


    // =========================================================
    // DENY CANCELLATION REQUEST
    // =========================================================

    const handleDeny = async () => {

        if (
            !selectedRequest
                ?.cancellation_request_id
        ) {
            return
        }


        // -----------------------------------------------------
        // Validate denial reason before sending the request.
        // -----------------------------------------------------

        if (
            !denialReason ||
            !denialReason.trim()
        ) {

            setError(
                "Please provide a reason for denying this cancellation request."
            )

            return
        }


        const requestId =
            selectedRequest.cancellation_request_id


        // -----------------------------------------------------
        // Confirmation before denying.
        // -----------------------------------------------------

        const confirmed =
            window.confirm(
                "Deny this cancellation request? The booking will remain confirmed."
            )


        if (!confirmed) {
            return
        }


        try {

            setActionLoading(true)

            setError("")
            setSuccessMessage("")


            const data =
                await denyCancellationRequest(
                    requestId,
                    denialReason.trim(),
                    accessToken
                )


            // -------------------------------------------------
            // Close the review modal.
            // -------------------------------------------------

            setSelectedRequest(null)

            setDenialReason("")


            // -------------------------------------------------
            // Move to Denied category.
            // -------------------------------------------------

            setActiveFilter("denied")


            // -------------------------------------------------
            // Reload the denied category.
            // -------------------------------------------------

            await loadCancellationHistory(
                "denied"
            )


            // -------------------------------------------------
            // Display backend confirmation.
            // -------------------------------------------------

            setSuccessMessage(
                data.message ||
                "Cancellation request denied successfully."
            )

        } catch (requestError) {

            console.error(
                "Failed to deny cancellation request:",
                requestError
            )


            setError(
                requestError.response?.data?.message ||
                requestError.message ||
                "Unable to deny the cancellation request."
            )

        } finally {

            setActionLoading(false)
        }
    }


    // =========================================================
    // AUTH LOADING
    // =========================================================

    if (authLoading) {

        return (

            <div className="cancellation-requests-page">

                <div className="cancellation-requests-loading">
                    Checking your account...
                </div>

            </div>
        )
    }


    // =========================================================
    // LOGIN PROTECTION
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
    // ROLE PROTECTION
    // =========================================================

    if (
        user?.role !== "admin" &&
        user?.role !== "tour_operator"
    ) {

        return (
            <Navigate
                to="/dashboard"
                replace
            />
        )
    }


    // =========================================================
    // PAGE UI
    // =========================================================

    return (

        <div className="cancellation-requests-page">

            {/* =================================================
                PAGE HEADER
            ================================================= */}

            <section className="cancellation-requests-header">

                <div>

                    <p className="cancellation-requests-eyebrow">
                        CANCELLATION MANAGEMENT
                    </p>


                    <h1>
                        Cancellation Requests
                    </h1>


                    <p>
                        Review and manage customer cancellation
                        requests and their refund decisions from
                        one workspace.
                    </p>

                </div>


                <div className="cancellation-requests-role">

                    {user.role === "admin"
                        ? "Administrator"
                        : "Tour Operator"
                    }

                </div>

            </section>


            {/* =================================================
                MESSAGES
            ================================================= */}

            {error && (

                <div className="cancellation-requests-message error">
                    {error}
                </div>

            )}


            {successMessage && (

                <div className="cancellation-requests-message success">
                    {successMessage}
                </div>

            )}


            {/* =================================================
                SUMMARY
            ================================================= */}

            <section className="cancellation-requests-summary">

                <div>

                    <span>
                        Total cancellation requests
                    </span>


                    <strong>
                        {requestCounts.all}
                    </strong>

                </div>


                <button
                    type="button"
                    className="cancellation-requests-refresh"
                    onClick={() =>
                        loadCancellationHistory()
                    }
                    disabled={
                        loading ||
                        actionLoading
                    }
                >

                    {loading
                        ? "Refreshing..."
                        : "Refresh requests"
                    }

                </button>

            </section>


            {/* =================================================
                REQUEST FILTERS
            ================================================= */}

            <section className="cancellation-requests-filters">

                {[
                    [
                        "pending",
                        "Pending",
                        requestCounts.pending,
                    ],

                    [
                        "approved",
                        "Approved",
                        requestCounts.approved,
                    ],

                    [
                        "denied",
                        "Denied",
                        requestCounts.denied,
                    ],

                ].map(
                    ([
                        value,
                        label,
                        count,
                    ]) => (

                        <button
                            key={value}
                            type="button"
                            className={`cancellation-requests-filter-button ${
                                activeFilter === value
                                    ? "active"
                                    : ""
                            }`}
                            onClick={() =>
                                setActiveFilter(value)
                            }
                            disabled={
                                loading ||
                                actionLoading
                            }
                        >

                            <span>
                                {label}
                            </span>


                            <strong>
                                {count}
                            </strong>

                        </button>
                    )
                )}

            </section>


            {/* =================================================
                REQUEST LIST
            ================================================= */}

            <section className="cancellation-requests-card">

                <div className="cancellation-requests-card-header">

                    <div>

                        <p>
                            CANCELLATION REQUEST HISTORY
                        </p>


                        <h2>

                            {activeFilter === "pending"
                                ? "Pending cancellation requests"
                                : activeFilter === "approved"
                                    ? "Approved cancellation requests"
                                    : "Denied cancellation requests"
                            }

                        </h2>

                    </div>

                </div>


                {loading ? (

                    <div className="cancellation-requests-empty">

                        Loading cancellation requests...

                    </div>

                ) : cancellationRequests.length === 0 ? (

                    <div className="cancellation-requests-empty">

                        <div className="cancellation-requests-empty-icon">
                            ✓
                        </div>


                        <h3>
                            No {statusLabel(activeFilter).toLowerCase()} cancellation requests
                        </h3>


                        <p>
                            There are no cancellation requests in
                            this category yet.
                        </p>

                    </div>

                ) : (

                    <div className="cancellation-requests-table-wrapper">

                        <table className="cancellation-requests-table">

                            <thead>

                                <tr>

                                    <th>
                                        Request
                                    </th>


                                    <th>
                                        Customer
                                    </th>


                                    <th>
                                        Safari
                                    </th>


                                    <th>
                                        Amount
                                    </th>


                                    <th>
                                        Submitted
                                    </th>


                                    <th>
                                        Status
                                    </th>


                                    <th>
                                        Action
                                    </th>

                                </tr>

                            </thead>


                            <tbody>

                                {cancellationRequests.map(
                                    (request) => (

                                        <tr
                                            key={
                                                request.cancellation_request_id
                                            }
                                        >

                                            {/* ---------------------------------
                                                REQUEST
                                            --------------------------------- */}

                                            <td>

                                                <div className="cancellation-request-id">

                                                    #
                                                    {
                                                        request.cancellation_request_id
                                                    }

                                                </div>


                                                <small>
                                                    Booking #
                                                    {
                                                        request.booking_id
                                                    }
                                                </small>

                                            </td>


                                            {/* ---------------------------------
                                                CUSTOMER
                                            --------------------------------- */}

                                            <td>

                                                <strong>
                                                    {
                                                        request.customer
                                                            ?.username ||
                                                        "Unknown customer"
                                                    }
                                                </strong>


                                                <small>
                                                    {
                                                        request.customer
                                                            ?.email ||
                                                        "—"
                                                    }
                                                </small>

                                            </td>


                                            {/* ---------------------------------
                                                SAFARI
                                            --------------------------------- */}

                                            <td>

                                                <strong>
                                                    {
                                                        request.tour
                                                            ?.tour_name ||
                                                        "Unknown tour"
                                                    }
                                                </strong>


                                                <small>
                                                    {
                                                        request.tour
                                                            ?.destination ||
                                                        "—"
                                                    }
                                                </small>

                                            </td>


                                            {/* ---------------------------------
                                                AMOUNT
                                            --------------------------------- */}

                                            <td>

                                                <strong>
                                                    KES{" "}
                                                    {
                                                        formatMoney(
                                                            request.booking
                                                                ?.total_price
                                                        )
                                                    }
                                                </strong>


                                                <small>
                                                    {
                                                        request.booking
                                                            ?.number_of_people
                                                    }{" "}
                                                    {
                                                        request.booking
                                                            ?.number_of_people === 1
                                                            ? "person"
                                                            : "people"
                                                    }
                                                </small>

                                            </td>


                                            {/* ---------------------------------
                                                SUBMITTED
                                            --------------------------------- */}

                                            <td>

                                                <span>
                                                    {
                                                        formatDate(
                                                            request.created_at
                                                        )
                                                    }
                                                </span>

                                            </td>


                                            {/* ---------------------------------
                                                STATUS
                                            --------------------------------- */}

                                            <td>

                                                <span
                                                    className={`cancellation-status-badge ${
                                                        request.status
                                                    }`}
                                                >

                                                    {
                                                        statusLabel(
                                                            request.status
                                                        )
                                                    }

                                                </span>

                                            </td>


                                            {/* ---------------------------------
                                                ACTION
                                            --------------------------------- */}

                                            <td>

                                                <button
                                                    type="button"
                                                    className="cancellation-requests-view-button"
                                                    onClick={() =>
                                                        handleViewRequest(
                                                            request
                                                        )
                                                    }
                                                    disabled={
                                                        actionLoading
                                                    }
                                                >

                                                    {
                                                        request.status === "pending"
                                                            ? "Review"
                                                            : "View details"
                                                    }

                                                </button>

                                            </td>

                                        </tr>

                                    )
                                )}

                            </tbody>

                        </table>

                    </div>

                )}

            </section>


            {/* =================================================
                CANCELLATION REQUEST DETAILS MODAL
            ================================================= */}

            {selectedRequest && (

                <div
                    className="cancellation-requests-overlay"
                    onMouseDown={(event) => {

                        if (
                            event.target ===
                            event.currentTarget
                        ) {

                            handleCloseDetails()
                        }

                    }}
                >

                    <div className="cancellation-requests-modal">

                        {/* -----------------------------------------
                            MODAL HEADER
                        ----------------------------------------- */}

                        <div className="cancellation-requests-modal-header">

                            <div>

                                <p>
                                    CANCELLATION REQUEST #
                                    {
                                        selectedRequest.cancellation_request_id
                                    }
                                </p>


                                <h2>
                                    {
                                        selectedRequest.status === "pending"
                                            ? "Review cancellation"
                                            : "Cancellation details"
                                    }
                                </h2>

                            </div>


                            <button
                                type="button"
                                className="cancellation-requests-close"
                                onClick={
                                    handleCloseDetails
                                }
                                disabled={
                                    actionLoading
                                }
                                aria-label="Close cancellation details"
                            >
                                ×
                            </button>

                        </div>


                        {/* -----------------------------------------
                            REQUEST SUMMARY
                        ----------------------------------------- */}

                        <div className="cancellation-requests-detail-grid">

                            <div className="detail-block">

                                <span>
                                    Request status
                                </span>


                                <strong
                                    className={`cancellation-status-badge ${
                                        selectedRequest.status
                                    }`}
                                >
                                    {
                                        statusLabel(
                                            selectedRequest.status
                                        )
                                    }
                                </strong>

                            </div>


                            <div className="detail-block">

                                <span>
                                    Submitted
                                </span>


                                <strong>
                                    {
                                        formatDate(
                                            selectedRequest.created_at
                                        )
                                    }
                                </strong>

                            </div>


                            <div className="detail-block">

                                <span>
                                    Booking ID
                                </span>


                                <strong>
                                    #
                                    {
                                        selectedRequest.booking_id
                                    }
                                </strong>

                            </div>


                            <div className="detail-block">

                                <span>
                                    Amount
                                </span>


                                <strong>
                                    KES{" "}
                                    {
                                        formatMoney(
                                            selectedRequest.booking
                                                ?.total_price
                                        )
                                    }
                                </strong>

                            </div>

                        </div>


                        {/* -----------------------------------------
                            CUSTOMER
                        ----------------------------------------- */}

                        <div className="cancellation-requests-section">

                            <h3>
                                Customer
                            </h3>


                            <div className="cancellation-requests-info-grid">

                                <div>

                                    <span>
                                        Username
                                    </span>


                                    <strong>
                                        {
                                            selectedRequest.customer
                                                ?.username ||
                                            "—"
                                        }
                                    </strong>

                                </div>


                                <div>

                                    <span>
                                        Email
                                    </span>


                                    <strong>
                                        {
                                            selectedRequest.customer
                                                ?.email ||
                                            "—"
                                        }
                                    </strong>

                                </div>


                                <div>

                                    <span>
                                        Customer ID
                                    </span>


                                    <strong>
                                        #
                                        {
                                            selectedRequest.customer
                                                ?.user_id ||
                                            "—"
                                        }
                                    </strong>

                                </div>

                            </div>

                        </div>


                        {/* -----------------------------------------
                            BOOKING
                        ----------------------------------------- */}

                        <div className="cancellation-requests-section">

                            <h3>
                                Booking
                            </h3>


                            <div className="cancellation-requests-info-grid">

                                <div>

                                    <span>
                                        Booking ID
                                    </span>


                                    <strong>
                                        #
                                        {
                                            selectedRequest.booking
                                                ?.booking_id ||
                                            selectedRequest.booking_id
                                        }
                                    </strong>

                                </div>


                                <div>

                                    <span>
                                        Travellers
                                    </span>


                                    <strong>
                                        {
                                            selectedRequest.booking
                                                ?.number_of_people ||
                                            0
                                        }{" "}
                                        {
                                            selectedRequest.booking
                                                ?.number_of_people === 1
                                                ? "person"
                                                : "people"
                                        }
                                    </strong>

                                </div>


                                <div>

                                    <span>
                                        Booking total
                                    </span>


                                    <strong>
                                        KES{" "}
                                        {
                                            formatMoney(
                                                selectedRequest.booking
                                                    ?.total_price
                                            )
                                        }
                                    </strong>

                                </div>


                                <div>

                                    <span>
                                        Booking status
                                    </span>


                                    <strong className="booking-status-text">
                                        {
                                            selectedRequest.booking
                                                ?.status ||
                                            "—"
                                        }
                                    </strong>

                                </div>

                            </div>

                        </div>


                        {/* -----------------------------------------
                            SAFARI
                        ----------------------------------------- */}

                        <div className="cancellation-requests-section">

                            <h3>
                                Safari
                            </h3>


                            <div className="cancellation-requests-info-grid">

                                <div>

                                    <span>
                                        Tour
                                    </span>


                                    <strong>
                                        {
                                            selectedRequest.tour
                                                ?.tour_name ||
                                            "—"
                                        }
                                    </strong>

                                </div>


                                <div>

                                    <span>
                                        Destination
                                    </span>


                                    <strong>
                                        {
                                            selectedRequest.tour
                                                ?.destination ||
                                            "—"
                                        }
                                    </strong>

                                </div>


                                <div>

                                    <span>
                                        Departure
                                    </span>


                                    <strong>
                                        {
                                            formatDepartureDate(
                                                selectedRequest.departure
                                                    ?.start_date
                                            )
                                        }
                                    </strong>

                                </div>


                                <div>

                                    <span>
                                        Departure ID
                                    </span>


                                    <strong>
                                        #
                                        {
                                            selectedRequest.departure
                                                ?.departure_id ||
                                            "—"
                                        }
                                    </strong>

                                </div>

                            </div>

                        </div>


                        {/* -----------------------------------------
                            CUSTOMER CANCELLATION REASON
                        ----------------------------------------- */}

                        <div className="cancellation-requests-section">

                            <h3>
                                Cancellation reason
                            </h3>


                            <div className="cancellation-reason-box">

                                <p>
                                    {
                                        selectedRequest.reason ||
                                        "No reason provided."
                                    }
                                </p>

                            </div>

                        </div>


                        {/* -----------------------------------------
                            ADMIN / OPERATOR REVIEW INFORMATION
                        ----------------------------------------- */}

                        {selectedRequest.status !== "pending" && (

                            <div className="cancellation-requests-section">

                                <h3>
                                    Review information
                                </h3>


                                <div className="cancellation-requests-info-grid">

                                    <div>

                                        <span>
                                            Decision
                                        </span>


                                        <strong>
                                            {
                                                statusLabel(
                                                    selectedRequest.status
                                                )
                                            }
                                        </strong>

                                    </div>


                                    <div>

                                        <span>
                                            Reviewed at
                                        </span>


                                        <strong>
                                            {
                                                formatDate(
                                                    selectedRequest.reviewed_at
                                                )
                                            }
                                        </strong>

                                    </div>


                                    <div>

                                        <span>
                                            Reviewed by
                                        </span>


                                        <strong>
                                            {
                                                selectedRequest.reviewed_by
                                                    ? `User #${selectedRequest.reviewed_by}`
                                                    : "—"
                                            }
                                        </strong>

                                    </div>


                                    {selectedRequest.status === "denied" && (

                                        <div>

                                            <span>
                                                Denial reason
                                            </span>


                                            <strong>
                                                {
                                                    selectedRequest.admin_reason ||
                                                    "—"
                                                }
                                            </strong>

                                        </div>

                                    )}

                                </div>

                            </div>

                        )}


                        {/* -----------------------------------------
                            DENIAL REASON
                        ----------------------------------------- */}

                        {selectedRequest.status === "pending" && (

                            <div className="cancellation-requests-section">

                                <h3>
                                    Denial reason
                                </h3>


                                <p className="cancellation-denial-help">

                                    If you deny this cancellation request,
                                    provide a clear reason for the customer.

                                </p>


                                <textarea
                                    className="cancellation-denial-textarea"
                                    value={denialReason}
                                    onChange={(event) =>
                                        setDenialReason(
                                            event.target.value
                                        )
                                    }
                                    placeholder="Enter the reason for denying this cancellation request..."
                                    rows={5}
                                    disabled={
                                        actionLoading
                                    }
                                />

                            </div>

                        )}


                        {/* -----------------------------------------
                            ACTIONS
                        ----------------------------------------- */}

                        {selectedRequest.status === "pending" && (

                            <div className="cancellation-requests-modal-actions">

                                <button
                                    type="button"
                                    className="cancellation-requests-deny-button"
                                    onClick={
                                        handleDeny
                                    }
                                    disabled={
                                        actionLoading
                                    }
                                >

                                    {
                                        actionLoading
                                            ? "Processing..."
                                            : "Deny Cancellation"
                                    }

                                </button>


                                <button
                                    type="button"
                                    className="cancellation-requests-approve-button"
                                    onClick={
                                        handleApprove
                                    }
                                    disabled={
                                        actionLoading
                                    }
                                >

                                    {
                                        actionLoading
                                            ? "Processing..."
                                            : "Approve Cancellation"
                                    }

                                </button>

                            </div>

                        )}

                    </div>

                </div>

            )}

        </div>
    )
}


// =========================================================
// EXPORT
// =========================================================

export default CancellationRequests