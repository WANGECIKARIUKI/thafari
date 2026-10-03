// =========================================================
// THAFARI DIRECT PAYMENT REVIEW
// =========================================================
//
// This page is used by:
//
// - Admins
// - Tour operators
//
// It allows authorized staff to:
//
// 1. See pending direct payments.
// 2. Open payment details.
// 3. Review the customer, booking, tour and payment.
// 4. Verify a genuine payment.
// 5. Reject a payment that cannot be verified.
//
// The backend remains responsible for authorization and all
// payment/booking business rules.
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
    getDirectPaymentHistory,
    getDirectPayment,
    verifyDirectPayment,
    rejectDirectPayment,
} from "../services/paymentService"

import "./DirectPayments.css"


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
// HELPER: PAYMENT METHOD LABEL
// =========================================================

const paymentMethodLabel = (method) => {

    if (method === "mpesa") {
        return "M-Pesa"
    }


    if (method === "airtel_money") {
        return "Airtel Money"
    }


    return method || "Unknown"
}


// =========================================================
// MAIN COMPONENT
// =========================================================

function DirectPayments() {

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
    // READ THE PAYMENT CATEGORY FROM THE URL
    // ---------------------------------------------------------
    //
    // The routes are:
    //
    // /admin/direct-payments/pending
    // /admin/direct-payments/successful
    // /admin/direct-payments/rejected
    //
    // All three routes intentionally use this same component.
    // The URL tells us which category should be displayed.
    //
    // The backend history endpoint returns the complete direct
    // payment history. We filter that response here so we do
    // not need separate backend endpoints for successful and
    // rejected payments.
    // ---------------------------------------------------------

    const { status: routeStatus = "pending" } = useParams()


    const normalizeStatus = (status) => {

        if (status === "successful") {
            return "successful"
        }

        if (status === "rejected") {
            return "rejected"
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
        payments,
        setPayments,
    ] = useState([])


    const [
        selectedPayment,
        setSelectedPayment,
    ] = useState(null)


    const [
        loading,
        setLoading,
    ] = useState(true)


    const [
        detailLoading,
        setDetailLoading,
    ] = useState(false)


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
    // PAYMENT COUNTS
    // ---------------------------------------------------------
    //
    // These counts are kept separately from the currently
    // displayed payment list. This is important because the
    // backend returns one status category at a time.
    //
    // Without separate counts, the Successful count would show
    // 0 while the Pending category is loaded, even when there
    // are successful payments in the database.
    // ---------------------------------------------------------

    const [
        paymentCounts,
        setPaymentCounts,
    ] = useState({
        all: 0,
        pending: 0,
        successful: 0,
        rejected: 0,
    })


    // Automatically hide success/error toast messages after 3 seconds.
    // The timeout is cleaned up if the message changes or the page unmounts.
    useEffect(() => {

        if (!successMessage && !error) {
            return
        }

        const toastTimer = setTimeout(() => {
            setSuccessMessage("")
            setError("")
        }, 3000)

        return () => {
            clearTimeout(toastTimer)
        }

    }, [successMessage, error])


    // =========================================================
    // LOAD DIRECT PAYMENT HISTORY
    // =========================================================

    const loadPaymentHistory = async (statusOverride = null) => {

        try {

            setLoading(true)
            setError("")
            setSuccessMessage("")


            const requestedStatus =
                statusOverride ||
                (activeFilter === "successful"
                    ? "successful"
                    : activeFilter === "rejected"
                        ? "rejected"
                        : "pending")


            // Load the selected category for the payment table.
            const data =
                await getDirectPaymentHistory(
                    accessToken,
                    requestedStatus
                )


            setPayments(
                data.payments || []
            )


            // Load all three status categories separately so the
            // summary cards always show the real totals, regardless
            // of which category is currently selected.
            const [
                pendingData,
                successfulData,
                rejectedData,
            ] = await Promise.all([

                getDirectPaymentHistory(
                    accessToken,
                    "pending"
                ),

                getDirectPaymentHistory(
                    accessToken,
                    "successful"
                ),

                getDirectPaymentHistory(
                    accessToken,
                    "rejected"
                ),
            ])


            const pendingCount =
                (pendingData.payments || []).length


            const successfulCount =
                (successfulData.payments || []).length


            const rejectedCount =
                (rejectedData.payments || []).length


            setPaymentCounts({
                pending: pendingCount,
                successful: successfulCount,
                rejected: rejectedCount,
                all:
                    pendingCount +
                    successfulCount +
                    rejectedCount,
            })

        } catch (requestError) {

            console.error(
                "Failed to load direct payment history:",
                requestError
            )


            setError(
                requestError.response?.data?.message ||
                requestError.message ||
                "Unable to load direct payment history."
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


        // Start the data load asynchronously so the effect does not
        // synchronously update React state during the effect itself.
        const loadTimer = setTimeout(() => {
            loadPaymentHistory()
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
    // OPEN PAYMENT DETAILS
    // =========================================================

    const handleViewPayment = async (paymentId) => {

        try {

            setDetailLoading(true)
            setError("")
            setSuccessMessage("")


            const data =
                await getDirectPayment(
                    paymentId,
                    accessToken
                )


            setSelectedPayment(data)

        } catch (requestError) {

            console.error(
                "Failed to load direct payment details:",
                requestError
            )


            setError(
                requestError.response?.data?.message ||
                requestError.message ||
                "Unable to load payment details."
            )

        } finally {

            setDetailLoading(false)
        }
    }


    // =========================================================
    // CLOSE DETAILS
    // =========================================================

    const handleCloseDetails = () => {

        if (actionLoading) {
            return
        }


        setSelectedPayment(null)
        setError("")
    }


    // =========================================================
    // VERIFY PAYMENT
    // =========================================================

    const handleVerify = async () => {

        if (!selectedPayment?.payment?.payment_id) {
            return
        }


        const paymentId =
            selectedPayment.payment.payment_id


        const confirmed =
            window.confirm(
                "Verify this payment as genuine? This will mark it as successful."
            )


        if (!confirmed) {
            return
        }


        try {

            setActionLoading(true)
            setError("")
            setSuccessMessage("")


            const data =
                await verifyDirectPayment(
                    paymentId,
                    accessToken
                )


            // Move to the Successful category and reload it so the
            // payment does not simply disappear from the screen.
            setActiveFilter("successful")
            await loadPaymentHistory("successful")


            // Close the review panel.
            setSelectedPayment(null)


            // Display the backend confirmation.
            setSuccessMessage(
                data.message ||
                "Direct payment verified successfully."
            )

        } catch (requestError) {

            console.error(
                "Failed to verify direct payment:",
                requestError
            )


            setError(
                requestError.response?.data?.message ||
                requestError.message ||
                "Unable to verify the payment."
            )

        } finally {

            setActionLoading(false)
        }
    }


    // =========================================================
    // REJECT PAYMENT
    // =========================================================

    const handleReject = async () => {

        if (!selectedPayment?.payment?.payment_id) {
            return
        }


        const paymentId =
            selectedPayment.payment.payment_id


        const confirmed =
            window.confirm(
                "Reject this payment? The payment will be marked as failed."
            )


        if (!confirmed) {
            return
        }


        try {

            setActionLoading(true)
            setError("")
            setSuccessMessage("")


            const data =
                await rejectDirectPayment(
                    paymentId,
                    accessToken
                )


            // Move to the Rejected category and reload it so the
            // payment does not simply disappear from the screen.
            setActiveFilter("rejected")
            await loadPaymentHistory("rejected")


            // Close the review panel.
            setSelectedPayment(null)


            setSuccessMessage(
                data.message ||
                "Direct payment rejected successfully."
            )

        } catch (requestError) {

            console.error(
                "Failed to reject direct payment:",
                requestError
            )


            setError(
                requestError.response?.data?.message ||
                requestError.message ||
                "Unable to reject the payment."
            )

        } finally {

            setActionLoading(false)
        }
    }


    // =========================================================
    // FILTER PAYMENT HISTORY
    // =========================================================

    const filteredPayments =
        activeFilter === "all"
            ? payments
            : payments.filter(
                (payment) => {

                    if (activeFilter === "successful") {
                        return payment.status === "successful"
                    }

                    if (activeFilter === "rejected") {
                        return payment.status === "failed"
                    }

                    return payment.status === activeFilter
                }
            )


    const statusLabel = (status) => {

        if (status === "successful") {
            return "Successful"
        }

        if (status === "failed") {
            return "Rejected"
        }

        if (status === "pending") {
            return "Pending"
        }

        return status || "Unknown"
    }


    // =========================================================
    // AUTH LOADING
    // =========================================================

    if (authLoading) {

        return (

            <div className="direct-payments-page">

                <div className="direct-payments-loading">
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

        <div className="direct-payments-page">

            {/* =================================================
                PAGE HEADER
            ================================================= */}

            <section className="direct-payments-header">

                <div>

                    <p className="direct-payments-eyebrow">
                        PAYMENT REVIEW
                    </p>

                    <h1>
                        Direct Payments
                    </h1>

                    <p>
                        Review and track customer M-Pesa and Airtel Money
                        submissions from one payment history.
                    </p>

                </div>


                <div className="direct-payments-role">

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

                <div className="direct-payments-message error">
                    {error}
                </div>

            )}


            {successMessage && (

                <div className="direct-payments-message success">
                    {successMessage}
                </div>

            )}


            {/* =================================================
                SUMMARY
            ================================================= */}

            <section className="direct-payments-summary">

                <div>

                    <span>
                        Total direct payments
                    </span>

                    <strong>
                        {paymentCounts.all}
                    </strong>

                </div>


                <button
                    type="button"
                    className="direct-payments-refresh"
                    onClick={loadPaymentHistory}
                    disabled={loading || actionLoading}
                >
                    {loading
                        ? "Refreshing..."
                        : "Refresh history"
                    }
                </button>

            </section>


            {/* =================================================
                PAYMENT FILTERS
            ================================================= */}

            <section className="direct-payments-filters">

                {[
                    ["all", "All", paymentCounts.all],
                    ["pending", "Pending", paymentCounts.pending],
                    ["successful", "Successful", paymentCounts.successful],
                    ["rejected", "Rejected", paymentCounts.rejected],
                ].map(([value, label, count]) => (

                    <button
                        key={value}
                        type="button"
                        className={`direct-payments-filter-button ${
                            activeFilter === value
                                ? "active"
                                : ""
                        }`}
                        onClick={() => setActiveFilter(value)}
                    >
                        <span>{label}</span>
                        <strong>{count}</strong>
                    </button>

                ))}

            </section>


            {/* =================================================
                PAYMENT LIST
            ================================================= */}

            <section className="direct-payments-card">

                <div className="direct-payments-card-header">

                    <div>

                        <p>
                            PAYMENT HISTORY
                        </p>

                        <h2>
                            {activeFilter === "all"
                                ? "All direct payments"
                                : `${statusLabel(activeFilter)} payments`
                            }
                        </h2>

                    </div>

                </div>


                {loading ? (

                    <div className="direct-payments-empty">
                        Loading payment history...
                    </div>

                ) : filteredPayments.length === 0 ? (

                    <div className="direct-payments-empty">

                        <div className="direct-payments-empty-icon">
                            ✓
                        </div>

                        <h3>
                            No {statusLabel(activeFilter).toLowerCase()} payments
                        </h3>

                        <p>
                            There are no direct payments in this
                            category yet.
                        </p>

                    </div>

                ) : (

                    <div className="direct-payments-table-wrapper">

                        <table className="direct-payments-table">

                            <thead>

                                <tr>

                                    <th>
                                        Payment
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

                                {filteredPayments.map((payment) => (

                                    <tr
                                        key={payment.payment_id}
                                    >

                                        <td>

                                            <div className="payment-id">
                                                #{payment.payment_id}
                                            </div>

                                            <span
                                                className={`payment-method ${payment.payment_method}`}
                                            >
                                                {paymentMethodLabel(
                                                    payment.payment_method
                                                )}
                                            </span>

                                        </td>


                                        <td>

                                            <strong>
                                                {payment.customer?.first_name}{" "}
                                                {payment.customer?.last_name}
                                            </strong>

                                            <small>
                                                {payment.customer?.email}
                                            </small>

                                        </td>


                                        <td>

                                            <strong>
                                                {payment.tour?.tour_name}
                                            </strong>

                                            <small>
                                                {payment.tour?.destination}
                                            </small>

                                        </td>


                                        <td>

                                            <strong>
                                                KES{" "}
                                                {formatMoney(
                                                    payment.amount
                                                )}
                                            </strong>

                                        </td>


                                        <td>

                                            <span>
                                                {formatDate(
                                                    payment.created_at
                                                )}
                                            </span>

                                        </td>


                                        <td>

                                            <span
                                                className={`payment-status-badge ${
                                                    payment.status === "successful"
                                                        ? "successful"
                                                        : payment.status === "failed"
                                                            ? "rejected"
                                                            : "pending"
                                                }`}
                                            >
                                                {statusLabel(payment.status)}
                                            </span>

                                        </td>


                                        <td>

                                            <button
                                                type="button"
                                                className="direct-payments-view-button"
                                                onClick={() =>
                                                    handleViewPayment(
                                                        payment.payment_id
                                                    )
                                                }
                                                disabled={
                                                    detailLoading ||
                                                    actionLoading
                                                }
                                            >
                                                {detailLoading
                                                    ? "Loading..."
                                                    : payment.status === "pending"
                                                        ? "Review"
                                                        : "View details"
                                                }
                                            </button>

                                        </td>

                                    </tr>

                                ))}

                            </tbody>

                        </table>

                    </div>

                )}

            </section>


            {/* =================================================
                PAYMENT DETAILS MODAL
            ================================================= */}

            {selectedPayment && (

                <div
                    className="direct-payments-overlay"
                    onMouseDown={(event) => {

                        if (
                            event.target ===
                            event.currentTarget
                        ) {
                            handleCloseDetails()
                        }

                    }}
                >

                    <div className="direct-payments-modal">

                        {/* -----------------------------------------
                            MODAL HEADER
                        ----------------------------------------- */}

                        <div className="direct-payments-modal-header">

                            <div>

                                <p>
                                    PAYMENT #{selectedPayment.payment?.payment_id}
                                </p>

                                <h2>
                                    Review payment
                                </h2>

                            </div>


                            <button
                                type="button"
                                className="direct-payments-close"
                                onClick={handleCloseDetails}
                                disabled={actionLoading}
                                aria-label="Close payment details"
                            >
                                ×
                            </button>

                        </div>


                        {/* -----------------------------------------
                            PAYMENT INFORMATION
                        ----------------------------------------- */}

                        <div className="direct-payments-detail-grid">

                            <div className="detail-block">

                                <span>
                                    Payment method
                                </span>

                                <strong>
                                    {paymentMethodLabel(
                                        selectedPayment.payment?.payment_method
                                    )}
                                </strong>

                            </div>


                            <div className="detail-block">

                                <span>
                                    Amount
                                </span>

                                <strong>
                                    KES{" "}
                                    {formatMoney(
                                        selectedPayment.payment?.amount
                                    )}
                                </strong>

                            </div>


                            <div className="detail-block">

                                <span>
                                    Status
                                </span>

                                <strong
                                    className={`payment-status-badge ${
                                        selectedPayment.payment?.status === "successful"
                                            ? "successful"
                                            : selectedPayment.payment?.status === "failed"
                                                ? "rejected"
                                                : "pending"
                                    }`}
                                >
                                    {statusLabel(
                                        selectedPayment.payment?.status
                                    )}
                                </strong>

                            </div>


                            <div className="detail-block">

                                <span>
                                    Submitted
                                </span>

                                <strong>
                                    {formatDate(
                                        selectedPayment.payment?.created_at
                                    )}
                                </strong>

                            </div>

                        </div>


                        {/* -----------------------------------------
                            TRANSACTION REFERENCE
                        ----------------------------------------- */}

                        <div className="direct-payments-reference">

                            <span>
                                Transaction reference
                            </span>

                            <strong>
                                {selectedPayment.payment?.transaction_reference ||
                                    "Not available"}
                            </strong>

                        </div>


                        {/* -----------------------------------------
                            CUSTOMER
                        ----------------------------------------- */}

                        <div className="direct-payments-section">

                            <h3>
                                Customer
                            </h3>


                            <div className="direct-payments-info-grid">

                                <div>

                                    <span>
                                        Name
                                    </span>

                                    <strong>
                                        {selectedPayment.customer?.first_name}{" "}
                                        {selectedPayment.customer?.last_name}
                                    </strong>

                                </div>


                                <div>

                                    <span>
                                        Username
                                    </span>

                                    <strong>
                                        {selectedPayment.customer?.username || "—"}
                                    </strong>

                                </div>


                                <div>

                                    <span>
                                        Email
                                    </span>

                                    <strong>
                                        {selectedPayment.customer?.email || "—"}
                                    </strong>

                                </div>


                                <div>

                                    <span>
                                        Phone
                                    </span>

                                    <strong>
                                        {selectedPayment.customer?.phone_number || "—"}
                                    </strong>

                                </div>

                            </div>

                        </div>


                        {/* -----------------------------------------
                            BOOKING
                        ----------------------------------------- */}

                        <div className="direct-payments-section">

                            <h3>
                                Booking
                            </h3>


                            <div className="direct-payments-info-grid">

                                <div>

                                    <span>
                                        Booking ID
                                    </span>

                                    <strong>
                                        #{selectedPayment.booking?.booking_id}
                                    </strong>

                                </div>


                                <div>

                                    <span>
                                        People
                                    </span>

                                    <strong>
                                        {selectedPayment.booking?.number_of_people}
                                    </strong>

                                </div>


                                <div>

                                    <span>
                                        Booking total
                                    </span>

                                    <strong>
                                        KES{" "}
                                        {formatMoney(
                                            selectedPayment.booking?.total_price
                                        )}
                                    </strong>

                                </div>


                                <div>

                                    <span>
                                        Already paid
                                    </span>

                                    <strong>
                                        KES{" "}
                                        {formatMoney(
                                            selectedPayment.booking?.total_paid
                                        )}
                                    </strong>

                                </div>


                                <div>

                                    <span>
                                        Remaining balance
                                    </span>

                                    <strong>
                                        KES{" "}
                                        {formatMoney(
                                            selectedPayment.booking?.remaining_balance
                                        )}
                                    </strong>

                                </div>


                                <div>

                                    <span>
                                        Booking status
                                    </span>

                                    <strong>
                                        {selectedPayment.booking?.status}
                                    </strong>

                                </div>

                            </div>

                        </div>


                        {/* -----------------------------------------
                            SAFARI
                        ----------------------------------------- */}

                        <div className="direct-payments-section">

                            <h3>
                                Safari
                            </h3>


                            <div className="direct-payments-info-grid">

                                <div>

                                    <span>
                                        Tour
                                    </span>

                                    <strong>
                                        {selectedPayment.tour?.tour_name}
                                    </strong>

                                </div>


                                <div>

                                    <span>
                                        Destination
                                    </span>

                                    <strong>
                                        {selectedPayment.tour?.destination}
                                    </strong>

                                </div>


                                <div>

                                    <span>
                                        Departure
                                    </span>

                                    <strong>
                                        {formatDate(
                                            selectedPayment.departure?.start_date
                                        )}
                                    </strong>

                                </div>


                                <div>

                                    <span>
                                        Return
                                    </span>

                                    <strong>
                                        {formatDate(
                                            selectedPayment.departure?.end_date
                                        )}
                                    </strong>

                                </div>

                            </div>

                        </div>


                        {/* -----------------------------------------
                            ACTIONS
                        ----------------------------------------- */}

                        {selectedPayment.payment?.status === "pending" && (

                            <div className="direct-payments-modal-actions">

                            <button
                                type="button"
                                className="direct-payments-reject-button"
                                onClick={handleReject}
                                disabled={actionLoading}
                            >
                                {actionLoading
                                    ? "Processing..."
                                    : "Reject Payment"
                                }
                            </button>


                            <button
                                type="button"
                                className="direct-payments-verify-button"
                                onClick={handleVerify}
                                disabled={actionLoading}
                            >
                                {actionLoading
                                    ? "Processing..."
                                    : "Verify Payment"
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


export default DirectPayments
