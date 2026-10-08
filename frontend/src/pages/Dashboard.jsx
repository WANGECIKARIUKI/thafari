// =========================================================
// THAFARI DASHBOARD
// =========================================================
//
// This dashboard changes depending on the logged-in user's role.
//
// CUSTOMER
// - Sees their travel/customer workspace.
//
// ADMIN
// - Sees the platform administration workspace.
//
// TOUR OPERATOR
// - Sees the tour-management workspace.
//
// IMPORTANT:
// We keep the dashboard role-aware instead of giving every
// user the same customer dashboard.
// =========================================================

import { Link, Navigate, useLocation } from "react-router-dom"

import { useEffect, useState } from "react"

import { useAuth } from "../context/AuthContext"

import api from "../services/api"

import { getUnreadNotificationCount } from "../services/notificationService"
import {
    getBookings,
    cancelBooking,
    requestCancellation,
} from "../services/bookingService"

import {
    getBookingReview,
    createReview,
    updateReview,
} from "../services/reviewService"

import "./Dashboard.css"


function Dashboard() {

    const location = useLocation()

    // ---------------------------------------------------------
    // GET CURRENT USER
    // ---------------------------------------------------------

    const {
        user,
        accessToken,
        isAuthenticated,
        authLoading,
    } = useAuth()


    // ---------------------------------------------------------
    // NOTIFICATION STATE
    // ---------------------------------------------------------

    const [unreadNotificationCount, setUnreadNotificationCount] =
        useState(0)


    // ---------------------------------------------------------
    // CUSTOMER BOOKING STATE
    // ---------------------------------------------------------

    const [bookings, setBookings] = useState([])

    const [bookingsLoading, setBookingsLoading] = useState(false)

    const [bookingsError, setBookingsError] = useState("")


    // ---------------------------------------------------------
    // SORT CUSTOMER BOOKINGS
    // ---------------------------------------------------------
    // Always show the newest booking first.
    // created_at is the primary sort field, while booking_id
    // provides a deterministic fallback for equal/missing dates.
    // ---------------------------------------------------------

    const sortBookingsNewestFirst = (bookingList = []) => {

        return [...bookingList].sort((firstBooking, secondBooking) => {

            const firstDate =
                firstBooking?.created_at
                    ? new Date(firstBooking.created_at).getTime()
                    : 0

            const secondDate =
                secondBooking?.created_at
                    ? new Date(secondBooking.created_at).getTime()
                    : 0


            if (secondDate !== firstDate) {
                return secondDate - firstDate
            }


            return (
                Number(secondBooking?.booking_id || 0) -
                Number(firstBooking?.booking_id || 0)
            )
        })
    }

    // ---------------------------------------------------------
    // CUSTOMER BOOKING HISTORY FILTER
    // ---------------------------------------------------------
    // Customers can switch between all bookings and individual
    // booking statuses without leaving the dashboard.
    // ---------------------------------------------------------

    const [bookingFilter, setBookingFilter] = useState("all")

    // ---------------------------------------------------------
    // CUSTOMER REVIEW STATE
    // ---------------------------------------------------------

    const [reviewBooking, setReviewBooking] = useState(null)

    const [existingReview, setExistingReview] = useState(null)

    const [reviewRating, setReviewRating] = useState(0)

    const [reviewComment, setReviewComment] = useState("")

    const [reviewLoading, setReviewLoading] = useState(false)

    const [reviewSaving, setReviewSaving] = useState(false)

    const [reviewError, setReviewError] = useState("")

    const [reviewMessage, setReviewMessage] = useState("")

    const [cancellingBookingId, setCancellingBookingId] = useState(null)

    const [cancellationMessage, setCancellationMessage] = useState("")

    const [cancellationError, setCancellationError] = useState("")

    // ---------------------------------------------------------
    // CUSTOMER CANCELLATION REQUEST STATE
    // ---------------------------------------------------------

    const [cancellationRequestBooking, setCancellationRequestBooking] =
        useState(null)

    const [cancellationRequestReason, setCancellationRequestReason] =
        useState("")

    const [cancellationRequestLoading, setCancellationRequestLoading] =
        useState(false)

    const [cancellationRequestMessage, setCancellationRequestMessage] =
        useState("")

    const [cancellationRequestError, setCancellationRequestError] =
        useState("")

    const [cancellationRequestPolicy, setCancellationRequestPolicy] =
        useState(null)

    const [cancellationRequestSubmitted, setCancellationRequestSubmitted] =
        useState(false)

    const [cancellationRequestStatuses, setCancellationRequestStatuses] =
        useState({})


    // ---------------------------------------------------------
    // STAFF CANCELLATION REVIEW STATE
    // ---------------------------------------------------------

    const [reviewCancellationRequest, setReviewCancellationRequest] =
        useState(null)

    const [reviewCancellationLoading, setReviewCancellationLoading] =
        useState(false)

    const [reviewCancellationActionLoading, setReviewCancellationActionLoading] =
        useState(false)

    const [reviewCancellationError, setReviewCancellationError] =
        useState("")

    const [reviewCancellationMessage, setReviewCancellationMessage] =
        useState("")

    const [denialReason, setDenialReason] =
        useState("")


    // ---------------------------------------------------------
    // LOAD UNREAD NOTIFICATIONS
    // ---------------------------------------------------------

    useEffect(() => {

        if (!isAuthenticated || !accessToken) {
            return
        }


        const loadUnreadCount = async () => {

            try {

                const data = await getUnreadNotificationCount(
                    accessToken
                )


                setUnreadNotificationCount(
                    data.unread_count || 0
                )

            } catch (error) {

                console.error(
                    "Failed to load dashboard notification count:",
                    error
                )

                setUnreadNotificationCount(0)
            }
        }


        loadUnreadCount()

    }, [accessToken, isAuthenticated])


    // ---------------------------------------------------------
    // LOAD CUSTOMER BOOKINGS
    // ---------------------------------------------------------
    //
    // Only customers need booking history here.
    // Admins and tour operators keep their existing dashboard
    // behavior and do not make this request.
    // ---------------------------------------------------------

    useEffect(() => {

        if (!isAuthenticated || !accessToken || user?.role !== "customer") {
            return
        }


        const loadBookings = async () => {

            setBookingsLoading(true)
            setBookingsError("")

            try {

                const data = await getBookings(accessToken)

                setBookings(
                    sortBookingsNewestFirst(
                        data.bookings || []
                    )
                )

            } catch (error) {

                console.error(
                    "Failed to load customer bookings:",
                    error
                )

                setBookings([])
                setBookingsError(
                    "We could not load your bookings right now. Please try again."
                )

            } finally {

                setBookingsLoading(false)
            }
        }


        loadBookings()

    }, [accessToken, isAuthenticated, user?.role])


    // ---------------------------------------------------------
    // OPEN CUSTOMER REVIEW MODAL
    // ---------------------------------------------------------

    const openReviewModal = async (booking) => {

        if (booking.status !== "completed") {
            return
        }

        setReviewBooking(booking)
        setExistingReview(null)
        setReviewRating(0)
        setReviewComment("")
        setReviewError("")
        setReviewMessage("")
        setReviewLoading(true)

        try {

            const data = await getBookingReview(
                booking.booking_id,
                accessToken
            )

            const review = data.review || null

            setExistingReview(review)

            if (review) {
                setReviewRating(review.rating || 0)
                setReviewComment(review.comment || "")
            }

        } catch (error) {

            console.error(
                "Failed to load booking review:",
                error
            )

            setReviewError(
                error?.response?.data?.message ||
                "We could not load this review right now. Please try again."
            )

        } finally {

            setReviewLoading(false)
        }
    }


    // ---------------------------------------------------------
    // CLOSE CUSTOMER REVIEW MODAL
    // ---------------------------------------------------------

    const closeReviewModal = () => {

        if (reviewSaving) {
            return
        }

        setReviewBooking(null)
        setExistingReview(null)
        setReviewRating(0)
        setReviewComment("")
        setReviewLoading(false)
        setReviewSaving(false)
        setReviewError("")
        setReviewMessage("")
    }


    // ---------------------------------------------------------
    // SUBMIT CUSTOMER REVIEW
    // ---------------------------------------------------------

    const handleReviewSubmit = async (event) => {

        event.preventDefault()

        setReviewError("")
        setReviewMessage("")

        if (!reviewBooking) {
            return
        }

        if (
            !Number.isInteger(reviewRating) ||
            reviewRating < 1 ||
            reviewRating > 5
        ) {
            setReviewError(
                "Please select a rating from 1 to 5 stars."
            )
            return
        }

        if (!reviewComment.trim()) {
            setReviewError(
                "Please write a review before submitting."
            )
            return
        }

        setReviewSaving(true)

        try {

            const payload = {
                rating: reviewRating,
                comment: reviewComment.trim(),
            }

            let response

            if (existingReview?.review_id) {

                response = await updateReview(
                    existingReview.review_id,
                    payload,
                    accessToken
                )

            } else {

                response = await createReview(
                    {
                        booking_id: reviewBooking.booking_id,
                        ...payload,
                    },
                    accessToken
                )
            }

            const savedReview = response.review || null

            setExistingReview(savedReview)
            setReviewMessage(
                existingReview
                    ? "Your review was updated successfully."
                    : "Thank you for sharing your safari experience."
            )

        } catch (error) {

            console.error(
                "Failed to save customer review:",
                error
            )

            setReviewError(
                error?.response?.data?.message ||
                "We could not save your review right now. Please try again."
            )

        } finally {

            setReviewSaving(false)
        }
    }


    // ---------------------------------------------------------
    // OPEN CANCELLATION REQUEST FROM NOTIFICATION LINK
    // ---------------------------------------------------------

    useEffect(() => {

        if (
            !isAuthenticated ||
            !accessToken ||
            (user?.role !== "admin" && user?.role !== "tour_operator")
        ) {
            return
        }

        const params = new URLSearchParams(location.search)
        const requestId = Number(
            params.get("cancellation_request")
        )

        if (!Number.isInteger(requestId) || requestId <= 0) {
            return
        }

        let cancelled = false

        const loadCancellationRequest = async () => {

            setReviewCancellationLoading(true)
            setReviewCancellationError("")
            setReviewCancellationMessage("")
            setDenialReason("")

            try {

                const data = await getBookings(accessToken)

                const matchingBooking = (data.bookings || []).find(
                    (booking) =>
                        Number(booking.cancellation_request?.id) ===
                        requestId
                )

                if (!matchingBooking) {
                    if (!cancelled) {
                        setReviewCancellationError(
                            "This cancellation request could not be found or is no longer awaiting review."
                        )
                        setReviewCancellationRequest(null)
                    }
                    return
                }

                if (!cancelled) {
                    setReviewCancellationRequest({
                        ...matchingBooking,
                        cancellation_request: {
                            ...matchingBooking.cancellation_request,
                            id: requestId,
                        },
                    })
                }

            } catch (error) {

                console.error(
                    "Failed to load cancellation request:",
                    error
                )

                if (!cancelled) {
                    setReviewCancellationError(
                        error?.response?.data?.message ||
                        "We could not load this cancellation request right now."
                    )
                }

            } finally {

                if (!cancelled) {
                    setReviewCancellationLoading(false)
                }
            }
        }

        loadCancellationRequest()

        return () => {
            cancelled = true
        }

    }, [
        accessToken,
        isAuthenticated,
        location.search,
        user?.role,
    ])


    // ---------------------------------------------------------
    // REVIEW CANCELLATION REQUEST
    // ---------------------------------------------------------

    const approveCancellationRequest = async () => {

        if (!reviewCancellationRequest?.cancellation_request?.id) {
            return
        }

        const requestId =
            reviewCancellationRequest.cancellation_request.id

        const shouldApprove = window.confirm(
            `Approve the cancellation request for Booking #${reviewCancellationRequest.booking_id}?`
        )

        if (!shouldApprove) {
            return
        }

        setReviewCancellationActionLoading(true)
        setReviewCancellationError("")
        setReviewCancellationMessage("")

        try {

            const response = await api.patch(
                `/admin/cancellation-requests/${requestId}/approve`,
                {}
            )

            setReviewCancellationRequest((previous) => ({
                ...previous,
                status: response.data?.booking_status || previous.status,
                cancellation_request: {
                    ...previous.cancellation_request,
                    status: response.data?.cancellation_request?.status || "approved",
                },
            }))

            setReviewCancellationMessage(
                response.data?.message ||
                "Cancellation request approved successfully. Refund processing has been initiated."
            )

        } catch (error) {

            console.error(
                "Failed to approve cancellation request:",
                error
            )

            setReviewCancellationError(
                error?.response?.data?.message ||
                "We could not approve this cancellation request right now."
            )

        } finally {

            setReviewCancellationActionLoading(false)
        }
    }


    const denyCancellationRequest = async () => {

        if (!reviewCancellationRequest?.cancellation_request?.id) {
            return
        }

        const reason = denialReason.trim()

        if (!reason) {
            setReviewCancellationError(
                "Please provide a reason before denying this cancellation request."
            )
            return
        }

        const requestId =
            reviewCancellationRequest.cancellation_request.id

        setReviewCancellationActionLoading(true)
        setReviewCancellationError("")
        setReviewCancellationMessage("")

        try {

            const response = await api.patch(
                `/admin/cancellation-requests/${requestId}/deny`,
                {
                    reason,
                }
            )

            setReviewCancellationRequest((previous) => ({
                ...previous,
                cancellation_request: {
                    ...previous.cancellation_request,
                    status: response.data?.cancellation_request?.status || "denied",
                    admin_reason: response.data?.cancellation_request?.admin_reason || reason,
                },
            }))

            setReviewCancellationMessage(
                response.data?.message ||
                "Cancellation request denied successfully."
            )

            setDenialReason("")

        } catch (error) {

            console.error(
                "Failed to deny cancellation request:",
                error
            )

            setReviewCancellationError(
                error?.response?.data?.message ||
                "We could not deny this cancellation request right now."
            )

        } finally {

            setReviewCancellationActionLoading(false)
        }
    }


    // ---------------------------------------------------------
    // AUTO-DISMISS BOOKING FEEDBACK
    // ---------------------------------------------------------
    //
    // Success and error messages stay visible for 3 seconds,
    // then disappear automatically.
    // ---------------------------------------------------------

    useEffect(() => {

        if (!cancellationMessage && !cancellationError) {
            return
        }


        const timeoutId = setTimeout(() => {

            setCancellationMessage("")
            setCancellationError("")

        }, 3000)


        return () => clearTimeout(timeoutId)

    }, [cancellationMessage, cancellationError])


    // ---------------------------------------------------------
    // CUSTOMER BOOKING COUNTS
    // ---------------------------------------------------------

    const activeBookingCount = bookings.filter(
        (booking) =>
            booking.status === "pending" ||
            booking.status === "confirmed"
    ).length


    // ---------------------------------------------------------
    // FILTERED CUSTOMER BOOKINGS
    // ---------------------------------------------------------

    const filteredBookings =
        bookingFilter === "all"
            ? bookings
            : bookings.filter(
                (booking) => booking.status === bookingFilter
            )


    // ---------------------------------------------------------
    // BOOKING STATUS COUNTS
    // ---------------------------------------------------------

    const bookingStatusCounts = {
        all: bookings.length,
        pending: bookings.filter(
            (booking) => booking.status === "pending"
        ).length,
        confirmed: bookings.filter(
            (booking) => booking.status === "confirmed"
        ).length,
        completed: bookings.filter(
            (booking) => booking.status === "completed"
        ).length,
        cancelled: bookings.filter(
            (booking) => booking.status === "cancelled"
        ).length,
        expired: bookings.filter(
            (booking) => booking.status === "expired"
        ).length,
    }


    // ---------------------------------------------------------
    // BOOKING STATUS LABEL
    // ---------------------------------------------------------

    const getBookingStatusLabel = (status) => {

        if (!status) {
            return "Unknown"
        }

        return status.charAt(0).toUpperCase() + status.slice(1)
    }


    // ---------------------------------------------------------
    // BOOKING AMOUNT FORMATTER
    // ---------------------------------------------------------

    const formatBookingAmount = (amount) => {

        return `KES ${Number(amount || 0).toLocaleString()}`
    }


    // ---------------------------------------------------------
    // CUSTOMER CANCELLATION REQUEST HANDLERS
    // ---------------------------------------------------------

    const openCancellationRequest = (booking) => {

        setCancellationRequestBooking(booking)
        setCancellationRequestReason("")
        setCancellationRequestLoading(false)
        setCancellationRequestMessage("")
        setCancellationRequestError("")
        setCancellationRequestPolicy(null)
        setCancellationRequestSubmitted(false)
    }


    const closeCancellationRequest = () => {

        if (cancellationRequestLoading) {
            return
        }

        setCancellationRequestBooking(null)
        setCancellationRequestReason("")
        setCancellationRequestMessage("")
        setCancellationRequestError("")
        setCancellationRequestPolicy(null)
        setCancellationRequestSubmitted(false)
    }


    const handleCancellationRequest = async () => {

        if (!cancellationRequestBooking) {
            return
        }

        const reason = cancellationRequestReason.trim()

        if (!reason) {
            setCancellationRequestError(
                "Please provide a reason for your cancellation request."
            )
            return
        }

        setCancellationRequestLoading(true)
        setCancellationRequestMessage("")
        setCancellationRequestError("")

        try {

            const data = await requestCancellation(
                cancellationRequestBooking.booking_id,
                reason,
                accessToken
            )

            setCancellationRequestPolicy(data.policy || null)

            setCancellationRequestMessage(
                data.message ||
                "Cancellation request submitted successfully."
            )

            setCancellationRequestSubmitted(true)

            setCancellationRequestStatuses((previous) => ({
                ...previous,
                [cancellationRequestBooking.booking_id]: "pending",
            }))

        } catch (error) {

            console.error(
                "Failed to submit cancellation request:",
                error
            )

            setCancellationRequestPolicy(
                error?.response?.data?.policy || null
            )

            setCancellationRequestError(
                error?.response?.data?.message ||
                "We could not submit your cancellation request right now. Please try again."
            )

        } finally {

            setCancellationRequestLoading(false)
        }
    }


    // ---------------------------------------------------------
    // WAIT FOR AUTHENTICATION RESTORATION
    // ---------------------------------------------------------

    if (authLoading) {

        return (

            <div className="dashboard-page">

                <div className="dashboard-empty-state">

                    <div className="dashboard-empty-icon">
                        ⏳
                    </div>

                    <h3>
                        Loading your dashboard...
                    </h3>

                </div>

            </div>
        )
    }


    // ---------------------------------------------------------
    // PROTECT THE DASHBOARD
    // ---------------------------------------------------------

    if (!isAuthenticated) {

        return (
            <Navigate
                to="/login"
                replace
            />
        )
    }


    // ---------------------------------------------------------
    // IDENTIFY USER ROLE
    // ---------------------------------------------------------

    const isAdmin =
        user?.role === "admin"


    const isTourOperator =
        user?.role === "tour_operator"


    // ---------------------------------------------------------
    // ADMIN / TOUR OPERATOR CANCELLATION REVIEW MODAL
    // ---------------------------------------------------------

    const cancellationReviewModal =
        (isAdmin || isTourOperator) &&
        (reviewCancellationRequest ||
            reviewCancellationLoading ||
            reviewCancellationError) ? (

            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="staff-cancellation-review-title"
                style={{
                    position: "fixed",
                    inset: 0,
                    zIndex: 1100,
                    background: "rgba(15, 23, 42, 0.58)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "24px",
                }}
            >

                <div
                    style={{
                        width: "100%",
                        maxWidth: "650px",
                        maxHeight: "90vh",
                        overflowY: "auto",
                        background: "#fff",
                        borderRadius: "18px",
                        padding: "28px",
                        boxShadow: "0 20px 60px rgba(15, 23, 42, 0.25)",
                    }}
                >

                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            marginBottom: "22px",
                        }}
                    >
                        <div>
                            <p className="dashboard-section-eyebrow">
                                CANCELLATION REVIEW
                            </p>

                            <h2 id="staff-cancellation-review-title">
                                Review cancellation request
                            </h2>
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                setReviewCancellationRequest(null)
                                setReviewCancellationError("")
                                setReviewCancellationMessage("")
                                setDenialReason("")
                            }}
                            disabled={reviewCancellationActionLoading}
                            aria-label="Close cancellation review"
                            style={{
                                border: "none",
                                background: "transparent",
                                fontSize: "24px",
                                cursor: "pointer",
                            }}
                        >
                            ×
                        </button>
                    </div>


                    {reviewCancellationLoading ? (

                        <div className="dashboard-empty-state">
                            <div className="dashboard-empty-icon">⏳</div>
                            <h3>
                                Loading cancellation request...
                            </h3>
                        </div>

                    ) : reviewCancellationError && !reviewCancellationRequest ? (

                        <div
                            className="dashboard-feedback-message dashboard-error-message"
                            role="alert"
                        >
                            <span
                                className="dashboard-feedback-icon"
                                aria-hidden="true"
                            >
                                !
                            </span>
                            <div className="dashboard-feedback-content">
                                <strong>
                                    Unable to load request
                                </strong>
                                <span>
                                    {reviewCancellationError}
                                </span>
                            </div>
                        </div>

                    ) : reviewCancellationRequest ? (

                        <>
                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                                    gap: "12px",
                                    marginBottom: "20px",
                                }}
                            >
                                <div style={{ background: "#f8fafc", borderRadius: "12px", padding: "14px" }}>
                                    <small>Booking</small>
                                    <strong style={{ display: "block", marginTop: "4px" }}>
                                        #{reviewCancellationRequest.booking_id}
                                    </strong>
                                </div>

                                <div style={{ background: "#f8fafc", borderRadius: "12px", padding: "14px" }}>
                                    <small>Booking status</small>
                                    <strong style={{ display: "block", marginTop: "4px" }}>
                                        {getBookingStatusLabel(reviewCancellationRequest.status)}
                                    </strong>
                                </div>

                                <div style={{ background: "#f8fafc", borderRadius: "12px", padding: "14px" }}>
                                    <small>Departure</small>
                                    <strong style={{ display: "block", marginTop: "4px" }}>
                                        #{reviewCancellationRequest.departure_id}
                                    </strong>
                                </div>

                                <div style={{ background: "#f8fafc", borderRadius: "12px", padding: "14px" }}>
                                    <small>Travellers</small>
                                    <strong style={{ display: "block", marginTop: "4px" }}>
                                        {reviewCancellationRequest.number_of_people}
                                    </strong>
                                </div>

                                <div style={{ background: "#f8fafc", borderRadius: "12px", padding: "14px" }}>
                                    <small>Total amount</small>
                                    <strong style={{ display: "block", marginTop: "4px" }}>
                                        {formatBookingAmount(reviewCancellationRequest.total_price)}
                                    </strong>
                                </div>

                                <div style={{ background: "#f8fafc", borderRadius: "12px", padding: "14px" }}>
                                    <small>Customer ID</small>
                                    <strong style={{ display: "block", marginTop: "4px" }}>
                                        #{reviewCancellationRequest.user_id}
                                    </strong>
                                </div>
                            </div>

                            <div
                                style={{
                                    background: "#fffbeb",
                                    borderRadius: "12px",
                                    padding: "16px",
                                    marginBottom: "20px",
                                    border: "1px solid #fde68a",
                                }}
                            >
                                <strong>Cancellation request</strong>
                                <p style={{ marginBottom: 0 }}>
                                    Request #{reviewCancellationRequest.cancellation_request.id}
                                </p>
                                <p style={{ marginBottom: 0, marginTop: "8px" }}>
                                    <strong>Status:</strong>{" "}
                                    {getBookingStatusLabel(
                                        reviewCancellationRequest.cancellation_request.status
                                    )}
                                </p>
                                <p style={{ marginBottom: 0, marginTop: "8px" }}>
                                    <strong>Reason:</strong>{" "}
                                    {reviewCancellationRequest.cancellation_request.reason ||
                                        "No reason provided."}
                                </p>
                                {reviewCancellationRequest.cancellation_request.admin_reason && (
                                    <p style={{ marginBottom: 0, marginTop: "8px" }}>
                                        <strong>Review reason:</strong>{" "}
                                        {reviewCancellationRequest.cancellation_request.admin_reason}
                                    </p>
                                )}
                            </div>

                            {reviewCancellationMessage && (
                                <div
                                    className="dashboard-feedback-message dashboard-success-message"
                                    role="status"
                                >
                                    <span className="dashboard-feedback-icon" aria-hidden="true">
                                        ✓
                                    </span>
                                    <div className="dashboard-feedback-content">
                                        <strong>Action completed</strong>
                                        <span>{reviewCancellationMessage}</span>
                                    </div>
                                </div>
                            )}

                            {reviewCancellationError && (
                                <div
                                    className="dashboard-feedback-message dashboard-error-message"
                                    role="alert"
                                >
                                    <span className="dashboard-feedback-icon" aria-hidden="true">
                                        !
                                    </span>
                                    <div className="dashboard-feedback-content">
                                        <strong>Action unsuccessful</strong>
                                        <span>{reviewCancellationError}</span>
                                    </div>
                                </div>
                            )}

                            {reviewCancellationRequest.cancellation_request.status === "pending" ? (
                                <>
                                    <label
                                        htmlFor="cancellation-denial-reason"
                                        style={{
                                            display: "block",
                                            fontWeight: "600",
                                            marginTop: "18px",
                                            marginBottom: "8px",
                                        }}
                                    >
                                        Denial reason
                                    </label>

                                    <textarea
                                        id="cancellation-denial-reason"
                                        value={denialReason}
                                        onChange={(event) =>
                                            setDenialReason(event.target.value)
                                        }
                                        placeholder="Enter the reason if you decide to deny this request..."
                                        rows={4}
                                        disabled={reviewCancellationActionLoading}
                                        style={{
                                            width: "100%",
                                            boxSizing: "border-box",
                                            resize: "vertical",
                                            border: "1px solid #cbd5e1",
                                            borderRadius: "10px",
                                            padding: "12px",
                                            font: "inherit",
                                        }}
                                    />

                                    <div
                                        style={{
                                            display: "flex",
                                            justifyContent: "flex-end",
                                            gap: "10px",
                                            marginTop: "20px",
                                        }}
                                    >
                                        <button
                                            type="button"
                                            onClick={denyCancellationRequest}
                                            disabled={
                                                reviewCancellationActionLoading ||
                                                !denialReason.trim()
                                            }
                                            className="dashboard-secondary-button"
                                        >
                                            {reviewCancellationActionLoading
                                                ? "Processing..."
                                                : "Deny Cancellation"}
                                        </button>

                                        <button
                                            type="button"
                                            onClick={approveCancellationRequest}
                                            disabled={reviewCancellationActionLoading}
                                            className="dashboard-primary-button"
                                        >
                                            {reviewCancellationActionLoading
                                                ? "Processing..."
                                                : "Approve Cancellation"}
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "flex-end",
                                        marginTop: "20px",
                                    }}
                                >
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setReviewCancellationRequest(null)
                                            setReviewCancellationError("")
                                            setReviewCancellationMessage("")
                                        }}
                                        className="dashboard-primary-button"
                                    >
                                        Done
                                    </button>
                                </div>
                            )}
                        </>

                    ) : null}

                </div>
            </div>
        ) : null


    // ---------------------------------------------------------
    // ADMIN DASHBOARD
    // ---------------------------------------------------------

    if (isAdmin) {

        return (

            <div className="dashboard-page staff-dashboard">

                {cancellationReviewModal}

                {/* =================================================
                    ADMIN HEADER
                ================================================= */}

                <section className="dashboard-header">

                    <div>

                        <p className="dashboard-eyebrow">
                            THAFARI ADMINISTRATION
                        </p>

                        <h1>
                            Welcome back,{" "}
                            {user?.first_name || "Admin"} 👋
                        </h1>

                        <p>
                            Manage the Thafari platform, payments,
                            tours, bookings and users from one place.
                        </p>

                    </div>


                    <Link
                        to="/notifications"
                        className="dashboard-primary-button"
                    >
                        🔔 Notifications

                        {unreadNotificationCount > 0 && (

                            <span className="dashboard-button-badge">
                                {unreadNotificationCount}
                            </span>

                        )}

                    </Link>

                </section>


                {/* =================================================
                    ADMIN OVERVIEW
                ================================================= */}

                <section className="dashboard-stats">

                    <article className="dashboard-stat-card">

                        <div className="dashboard-stat-icon">
                            🏕️
                        </div>

                        <div>

                            <p>
                                Tour Management
                            </p>

                            <h2>
                                Manage
                            </h2>

                        </div>

                    </article>


                    <article className="dashboard-stat-card">

                        <div className="dashboard-stat-icon">
                            💳
                        </div>

                        <div>

                            <p>
                                Direct Payments
                            </p>

                            <h2>
                                Review
                            </h2>

                        </div>

                    </article>


                    <article className="dashboard-stat-card">

                        <div className="dashboard-stat-icon">
                            🔔
                        </div>

                        <div>

                            <p>
                                Notifications
                            </p>

                            <h2>
                                {unreadNotificationCount}
                            </h2>

                        </div>

                    </article>

                </section>


                {/* =================================================
                    ADMIN WORKSPACE
                ================================================= */}

                <section className="dashboard-content">

                    <div className="dashboard-main-card">

                        <div className="dashboard-section-header">

                            <div>

                                <p className="dashboard-section-eyebrow">
                                    PLATFORM MANAGEMENT
                                </p>

                                <h2>
                                    Administration
                                </h2>

                            </div>

                        </div>


                        <div className="staff-management-grid">

                            {/* =================================================
                                MANAGE TOURS
                            ================================================= */}

                            <Link
                                to="/admin/tours"
                                className="staff-management-card"
                            >

                                <span className="staff-management-icon">
                                    🏕️
                                </span>

                                <strong>
                                    Manage Tours
                                </strong>

                                <small>
                                    Add, edit and manage Thafari tours.
                                </small>

                                <span className="staff-management-arrow">
                                    →
                                </span>

                            </Link>


                            {/* =================================================
                                MANAGE SERVICES
                            ================================================= */}

                            <Link
                                to="/admin/services"
                                className="staff-management-card"
                            >

                                <span className="staff-management-icon">
                                    🧭
                                </span>

                                <strong>
                                    Manage Services
                                </strong>

                                <small>
                                    Add, edit and manage the services offered by Thafari.
                                </small>

                                <span className="staff-management-arrow">
                                    →
                                </span>

                            </Link>



                            {/* =================================================
                                MANAGE REVIEWS
                            ================================================= */}

                            <Link
                                to="/admin/reviews"
                                className="staff-management-card"
                            >

                                <span className="staff-management-icon">
                                    ⭐
                                </span>

                                <strong>
                                    Manage Reviews
                                </strong>

                                <small>
                                    View, hide or delete customer reviews.
                                </small>

                                <span className="staff-management-arrow">
                                    →
                                </span>

                            </Link>


                            {/* =================================================
                                CONTACT DETAILS
                            ================================================= */}

                            <Link
                                to="/admin/contact"
                                className="staff-management-card"
                            >

                                <span className="staff-management-icon">
                                    📞
                                </span>

                                <strong>
                                    Contact Details
                                </strong>

                                <small>
                                    Update the WhatsApp number, email and phone
                                    number customers use to reach Thafari.
                                </small>

                                <span className="staff-management-arrow">
                                    →
                                </span>

                            </Link>


                            {/* =================================================
                                BUSINESS INTELLIGENCE
                            ================================================= */}

                            <Link
                                to="/admin/business-intelligence"
                                className="staff-management-card"
                            >

                                <span className="staff-management-icon">
                                    📊
                                </span>

                                <strong>
                                    Business Intelligence
                                </strong>

                                <small>
                                    View revenue, customer, booking and
                                    tour performance analytics.
                                </small>

                                <span className="staff-management-arrow">
                                    →
                                </span>

                            </Link>


                            {/* =================================================
                                USER MANAGEMENT
                            ================================================= */}

                            <Link
                                to="/admin/users"
                                className="staff-management-card"
                            >

                                <span className="staff-management-icon">
                                    👥
                                </span>

                                <strong>
                                    User Management
                                </strong>

                                <small>
                                    Manage customers and tour-operator roles.
                                </small>

                                <span className="staff-management-arrow">
                                    →
                                </span>

                            </Link>


                            {/* =================================================
                                PAYMENT SETTINGS
                            ================================================= */}

                            <Link
                                to="/admin/payment-settings"
                                className="staff-management-card"
                            >

                                <span className="staff-management-icon">
                                    ⚙️
                                </span>

                                <strong>
                                    Payment Settings
                                </strong>

                                <small>
                                    Configure M-Pesa and Airtel payment options.
                                </small>

                                <span className="staff-management-arrow">
                                    →
                                </span>

                            </Link>


                            {/* =================================================
                                DIRECT PAYMENTS

                                The payment workspace now opens directly
                                on the pending-review page.
                            ================================================= */}

                            <Link
                                to="/admin/direct-payments/pending"
                                className="staff-management-card"
                            >

                                <span className="staff-management-icon">
                                    💳
                                </span>

                                <strong>
                                    Direct Payments
                                </strong>

                                <small>
                                    Review pending customer payments.
                                </small>

                                <span className="staff-management-arrow">
                                    →
                                </span>

                            </Link>


                            {/* =================================================
                                CANCELLATION REQUESTS
                            ================================================= */}

                            <Link
                                to="/admin/cancellation-requests/pending"
                                className="staff-management-card"
                            >

                                <span className="staff-management-icon">
                                    ↩️
                                </span>

                                <strong>
                                    Cancellation Requests
                                </strong>

                                <small>
                                    Review customer cancellation requests.
                                </small>

                                <span className="staff-management-arrow">
                                    →
                                </span>

                            </Link>


                            {/* =================================================
                                NOTIFICATIONS
                            ================================================= */}

                            <Link
                                to="/notifications"
                                className="staff-management-card"
                            >

                                <span className="staff-management-icon">
                                    🔔
                                </span>

                                <strong>
                                    Notifications
                                </strong>

                                <small>
                                    View platform notifications and
                                    payment alerts.
                                </small>

                                <span className="staff-management-arrow">
                                    →
                                </span>

                            </Link>


                            {/* =================================================
                                ADMIN PROFILE
                            ================================================= */}

                            <Link
                                to="/profile"
                                className="staff-management-card"
                            >

                                <span className="staff-management-icon">
                                    👤
                                </span>

                                <strong>
                                    Admin Profile
                                </strong>

                                <small>
                                    Manage your administrator account.
                                </small>

                                <span className="staff-management-arrow">
                                    →
                                </span>

                            </Link>

                        </div>

                    </div>


                    {/* =================================================
                        ADMIN QUICK ACTIONS
                    ================================================= */}

                    <aside className="dashboard-side-card">

                        <p className="dashboard-section-eyebrow">
                            ADMIN QUICK ACTIONS
                        </p>

                        <h2>
                            Platform controls
                        </h2>


                        <div className="dashboard-actions">

                            {/* =================================================
                                REVIEW PENDING PAYMENTS
                            ================================================= */}

                            <Link
                                to="/admin/direct-payments/pending"
                                className="dashboard-action"
                            >

                                <span>
                                    💳
                                </span>

                                <div>

                                    <strong>
                                        Review Payments
                                    </strong>

                                    <small>
                                        Check pending direct payments
                                    </small>

                                </div>

                                <span>
                                    →
                                </span>

                            </Link>



                            {/* =================================================
                                REVIEW CANCELLATION REQUESTS
                            ================================================= */}

                            <Link
                                to="/admin/cancellation-requests/pending"
                                className="dashboard-action"
                            >

                                <span>
                                    ↩️
                                </span>

                                <div>

                                    <strong>
                                        Review Cancellations
                                    </strong>

                                    <small>
                                        Review pending cancellation requests
                                    </small>

                                </div>

                                <span>
                                    →
                                </span>

                            </Link>



                            {/* =================================================
                                MANAGE TOURS
                            ================================================= */}

                            <Link
                                to="/admin/tours"
                                className="dashboard-action"
                            >

                                <span>
                                    🏕️
                                </span>

                                <div>

                                    <strong>
                                        Manage Tours
                                    </strong>

                                    <small>
                                        Add, edit and manage tours
                                    </small>

                                </div>

                                <span>
                                    →
                                </span>

                            </Link>


                            {/* =================================================
                                USER MANAGEMENT
                            ================================================= */}

                            <Link
                                to="/admin/users"
                                className="dashboard-action"
                            >

                                <span>
                                    👥
                                </span>

                                <div>

                                    <strong>
                                        User Management
                                    </strong>

                                    <small>
                                        Manage customers and tour-operator roles
                                    </small>

                                </div>

                                <span>
                                    →
                                </span>

                            </Link>


                            {/* =================================================
                                NOTIFICATIONS
                            ================================================= */}

                            <Link
                                to="/notifications"
                                className="dashboard-action"
                            >

                                <span>
                                    🔔
                                </span>

                                <div>

                                    <strong>
                                        Notifications
                                    </strong>

                                    <small>

                                        {unreadNotificationCount} unread
                                        notification
                                        {unreadNotificationCount === 1
                                            ? ""
                                            : "s"}

                                    </small>

                                </div>

                                <span>
                                    →
                                </span>

                            </Link>

                        </div>

                    </aside>

                </section>

            </div>
        )
    }


    // ---------------------------------------------------------
    // TOUR OPERATOR DASHBOARD
    // ---------------------------------------------------------

    if (isTourOperator) {

        return (

            <div className="dashboard-page staff-dashboard">

                {cancellationReviewModal}

                {/* =================================================
                    TOUR OPERATOR HEADER
                ================================================= */}

                <section className="dashboard-header">

                    <div>

                        <p className="dashboard-eyebrow">
                            TOUR OPERATOR WORKSPACE
                        </p>

                        <h1>
                            Welcome back,{" "}
                            {user?.first_name || "Tour Operator"} 👋
                        </h1>

                        <p>
                            Manage your safari tours, payments,
                            bookings and customer communication.
                        </p>

                    </div>


                    <Link
                        to="/notifications"
                        className="dashboard-primary-button"
                    >
                        🔔 Notifications

                        {unreadNotificationCount > 0 && (

                            <span className="dashboard-button-badge">
                                {unreadNotificationCount}
                            </span>

                        )}

                    </Link>

                </section>


                {/* =================================================
                    TOUR OPERATOR OVERVIEW
                ================================================= */}

                <section className="dashboard-stats">

                    <article className="dashboard-stat-card">

                        <div className="dashboard-stat-icon">
                            🏕️
                        </div>

                        <div>

                            <p>
                                My Tours
                            </p>

                            <h2>
                                Manage
                            </h2>

                        </div>

                    </article>


                    <article className="dashboard-stat-card">

                        <div className="dashboard-stat-icon">
                            💳
                        </div>

                        <div>

                            <p>
                                Direct Payments
                            </p>

                            <h2>
                                Review
                            </h2>

                        </div>

                    </article>


                    <article className="dashboard-stat-card">

                        <div className="dashboard-stat-icon">
                            🔔
                        </div>

                        <div>

                            <p>
                                Notifications
                            </p>

                            <h2>
                                {unreadNotificationCount}
                            </h2>

                        </div>

                    </article>

                </section>


                {/* =================================================
                    TOUR OPERATOR WORKSPACE
                ================================================= */}

                <section className="dashboard-content">

                    <div className="dashboard-main-card">

                        <div className="dashboard-section-header">

                            <div>

                                <p className="dashboard-section-eyebrow">
                                    YOUR BUSINESS
                                </p>

                                <h2>
                                    Tour Management
                                </h2>

                            </div>

                        </div>


                        <div className="staff-management-grid">

                            {/* =================================================
                                MY TOURS

                                IMPORTANT:
                                This is the dedicated tour-operator
                                management page.
                            ================================================= */}

                            <Link
                                to="/operator/tours"
                                className="staff-management-card"
                            >

                                <span className="staff-management-icon">
                                    🏕️
                                </span>

                                <strong>
                                    My Tours
                                </strong>

                                <small>
                                    View and manage your safari tours.
                                </small>

                                <span className="staff-management-arrow">
                                    →
                                </span>

                            </Link>


                            {/* =================================================
                                VERIFY PAYMENTS

                                Tour operators open the pending page
                                because pending payments are the ones
                                requiring action.
                            ================================================= */}

                            <Link
                                to="/admin/direct-payments/pending"
                                className="staff-management-card"
                            >

                                <span className="staff-management-icon">
                                    💳
                                </span>

                                <strong>
                                    Verify Payments
                                </strong>

                                <small>
                                    Review pending direct payments from
                                    your customers.
                                </small>

                                <span className="staff-management-arrow">
                                    →
                                </span>

                            </Link>



                            {/* =================================================
                                CANCELLATION REQUESTS
                            ================================================= */}

                            <Link
                                to="/admin/cancellation-requests/pending"
                                className="staff-management-card"
                            >

                                <span className="staff-management-icon">
                                    ↩️
                                </span>

                                <strong>
                                    Cancellation Requests
                                </strong>

                                <small>
                                    Review cancellation requests from your customers.
                                </small>

                                <span className="staff-management-arrow">
                                    →
                                </span>

                            </Link>


                            {/* =================================================
                                NOTIFICATIONS
                            ================================================= */}

                            <Link
                                to="/notifications"
                                className="staff-management-card"
                            >

                                <span className="staff-management-icon">
                                    🔔
                                </span>

                                <strong>
                                    Notifications
                                </strong>

                                <small>
                                    See payment and platform updates.
                                </small>

                                <span className="staff-management-arrow">
                                    →
                                </span>

                            </Link>


                            {/* =================================================
                                PROFILE
                            ================================================= */}

                            <Link
                                to="/profile"
                                className="staff-management-card"
                            >

                                <span className="staff-management-icon">
                                    👤
                                </span>

                                <strong>
                                    My Profile
                                </strong>

                                <small>
                                    Manage your account details.
                                </small>

                                <span className="staff-management-arrow">
                                    →
                                </span>

                            </Link>

                        </div>

                    </div>


                    <aside className="dashboard-side-card">

                        <p className="dashboard-section-eyebrow">
                            QUICK ACTIONS
                        </p>

                        <h2>
                            Manage your business
                        </h2>


                        <div className="dashboard-actions">

                            {/* =================================================
                                MY TOURS
                            ================================================= */}

                            <Link
                                to="/operator/tours"
                                className="dashboard-action"
                            >

                                <span>
                                    🏕️
                                </span>

                                <div>

                                    <strong>
                                        Manage My Tours
                                    </strong>

                                    <small>
                                        View and manage your tours
                                    </small>

                                </div>

                                <span>
                                    →
                                </span>

                            </Link>


                            {/* =================================================
                                REVIEW PENDING PAYMENTS
                            ================================================= */}

                            <Link
                                to="/admin/direct-payments/pending"
                                className="dashboard-action"
                            >

                                <span>
                                    💳
                                </span>

                                <div>

                                    <strong>
                                        Review Payments
                                    </strong>

                                    <small>
                                        Verify pending customer payments
                                    </small>

                                </div>

                                <span>
                                    →
                                </span>

                            </Link>


                            {/* =================================================
                                NOTIFICATIONS
                            ================================================= */}

                            <Link
                                to="/notifications"
                                className="dashboard-action"
                            >

                                <span>
                                    🔔
                                </span>

                                <div>

                                    <strong>
                                        Notifications
                                    </strong>

                                    <small>
                                        {unreadNotificationCount} unread
                                    </small>

                                </div>

                                <span>
                                    →
                                </span>

                            </Link>

                        </div>

                    </aside>

                </section>

            </div>
        )
    }


    // ---------------------------------------------------------
    // CUSTOMER DASHBOARD
    // ---------------------------------------------------------
    //
    // Customers continue to get the original travel-focused
    // dashboard.
    // ---------------------------------------------------------

    return (

        <div className="dashboard-page">

            {/* =================================================
                CUSTOMER HEADER
            ================================================= */}

            <section className="dashboard-header">

                <div>

                    <p className="dashboard-eyebrow">
                        MY THAFARI
                    </p>

                    <h1>
                        Welcome back,{" "}
                        {user?.first_name || "Traveler"} 👋
                    </h1>

                    <p>
                        Your Thafari workspace is ready.
                    </p>

                </div>


                <Link
                    to="/tours"
                    className="dashboard-primary-button"
                >
                    Explore Safaris
                </Link>

            </section>


            {/* =================================================
                CUSTOMER STATISTICS
            ================================================= */}

            <section className="dashboard-stats">

                <article className="dashboard-stat-card">

                    <div className="dashboard-stat-icon">
                        🏕️
                    </div>

                    <div>

                        <p>
                            Total Bookings
                        </p>

                        <h2>
                            {bookings.length}
                        </h2>

                    </div>

                </article>


                <article className="dashboard-stat-card">

                    <div className="dashboard-stat-icon">
                        📋
                    </div>

                    <div>

                        <p>
                            Active Bookings
                        </p>

                        <h2>
                            {activeBookingCount}
                        </h2>

                    </div>

                </article>


                <article className="dashboard-stat-card">

                    <div className="dashboard-stat-icon">
                        🔔
                    </div>

                    <div>

                        <p>
                            Notifications
                        </p>

                        <h2>
                            {unreadNotificationCount}
                        </h2>

                    </div>

                </article>

            </section>


            {/* =================================================
                CUSTOMER CONTENT
            ================================================= */}

            <section className="dashboard-content">

                <div className="dashboard-main-card">

                    <div className="dashboard-section-header">

                        <div>

                            <p className="dashboard-section-eyebrow">
                                YOUR JOURNEY
                            </p>

                            <h2>
                                Booking History
                            </h2>

                        </div>


                        <Link to="/tours">
                            Explore Safaris →
                        </Link>

                    </div>


                    {bookingsLoading ? (

                        <div className="dashboard-empty-state">

                            <div className="dashboard-empty-icon">
                                ⏳
                            </div>

                            <h3>
                                Loading your bookings...
                            </h3>

                            <p>
                                We are getting your Thafari booking history.
                            </p>

                        </div>

                    ) : bookingsError ? (

                        <div className="dashboard-empty-state">

                            <div className="dashboard-empty-icon">
                                ⚠️
                            </div>

                            <h3>
                                Unable to load bookings
                            </h3>

                            <p>
                                {bookingsError}
                            </p>

                        </div>

                    ) : bookings.length === 0 ? (

                        <div className="dashboard-empty-state">

                            <div className="dashboard-empty-icon">
                                🦁
                            </div>

                            <h3>
                                No bookings yet
                            </h3>

                            <p>
                                Your safari adventures will appear
                                here once you make your first booking.
                            </p>

                            <Link
                                to="/tours"
                                className="dashboard-secondary-button"
                            >
                                Find Your Safari
                            </Link>

                        </div>

                    ) : (

                        <div className="dashboard-booking-history">

                            <div
                                className="dashboard-booking-filters"
                                role="tablist"
                                aria-label="Filter booking history"
                            >

                                {[
                                    { key: "all", label: "All" },
                                    { key: "pending", label: "Pending" },
                                    { key: "confirmed", label: "Confirmed" },
                                    { key: "completed", label: "Completed" },
                                    { key: "cancelled", label: "Cancelled" },
                                    { key: "expired", label: "Expired" },
                                ].map((filter) => (

                                    <button
                                        key={filter.key}
                                        type="button"
                                        className={
                                            `dashboard-booking-filter ${
                                                bookingFilter === filter.key
                                                    ? "active"
                                                    : ""
                                            }`
                                        }
                                        role="tab"
                                        aria-selected={
                                            bookingFilter === filter.key
                                        }
                                        onClick={() =>
                                            setBookingFilter(filter.key)
                                        }
                                    >
                                        <span>{filter.label}</span>
                                        <span className="dashboard-booking-filter-count">
                                            {bookingStatusCounts[filter.key]}
                                        </span>
                                    </button>

                                ))}

                            </div>


                            {cancellationMessage && (

                                <div
                                    className="dashboard-feedback-message dashboard-success-message"
                                    role="status"
                                    aria-live="polite"
                                >

                                    <span
                                        className="dashboard-feedback-icon"
                                        aria-hidden="true"
                                    >
                                        ✓
                                    </span>

                                    <div className="dashboard-feedback-content">

                                        <strong>
                                            Booking cancelled
                                        </strong>

                                        <span>
                                            {cancellationMessage}
                                        </span>

                                    </div>

                                </div>

                            )}


                            {cancellationError && (

                                <div
                                    className="dashboard-feedback-message dashboard-error-message"
                                    role="alert"
                                    aria-live="assertive"
                                >

                                    <span
                                        className="dashboard-feedback-icon"
                                        aria-hidden="true"
                                    >
                                        !
                                    </span>

                                    <div className="dashboard-feedback-content">

                                        <strong>
                                            Cancellation unsuccessful
                                        </strong>

                                        <span>
                                            {cancellationError}
                                        </span>

                                    </div>

                                </div>

                            )}


                            {filteredBookings.length === 0 ? (

                                <div className="dashboard-filter-empty-state">
                                    <div className="dashboard-empty-icon">🦁</div>
                                    <h3>
                                        No {bookingFilter} bookings
                                    </h3>
                                    <p>
                                        You do not have any bookings in this status yet.
                                    </p>
                                    <button
                                        type="button"
                                        className="dashboard-secondary-button"
                                        onClick={() => setBookingFilter("all")}
                                    >
                                        View All Bookings
                                    </button>
                                </div>

                            ) : (

                            <div className="dashboard-actions">

                            {filteredBookings.map((booking) => (

                                <article
                                    key={booking.booking_id}
                                    className="dashboard-booking-item"
                                >

                                    <div className="dashboard-booking-icon">
                                        📋
                                    </div>

                                    <div className="dashboard-booking-main">

                                        <div className="dashboard-booking-title">

                                            <strong>
                                                Booking #{booking.booking_id}
                                            </strong>

                                            <span
                                                className={`dashboard-booking-status ${
                                                    booking.status || "unknown"
                                                }`}
                                            >
                                                {getBookingStatusLabel(
                                                    booking.status
                                                )}
                                            </span>

                                        </div>

                                        <div className="dashboard-booking-meta">

                                            <span>
                                                🗺️ Departure #{booking.departure_id}
                                            </span>

                                            <span>
                                                👥 {booking.number_of_people}{" "}
                                                {booking.number_of_people === 1
                                                    ? "traveller"
                                                    : "travellers"}
                                            </span>

                                        </div>

                                    </div>

                                    <div className="dashboard-booking-total">
                                        <small>Total</small>
                                        <strong>
                                            {formatBookingAmount(
                                                booking.total_price
                                            )}
                                        </strong>
                                    </div>

                                    <div className="dashboard-booking-actions">

                                        <Link
                                            to={`/booking/view/${booking.booking_id}`}
                                            className="dashboard-booking-view"
                                            aria-label={`View booking ${booking.booking_id}`}
                                        >
                                            View Booking
                                            <span aria-hidden="true">→</span>
                                        </Link>

                                        {booking.status === "completed" && (

                                            <button
                                                type="button"
                                                className="dashboard-booking-review"
                                                onClick={() =>
                                                    openReviewModal(booking)
                                                }
                                            >
                                                Leave a Review
                                                <span aria-hidden="true">★</span>
                                            </button>

                                        )}

                                        {booking.status === "pending" && (

                                            <button
                                                type="button"
                                                className="dashboard-booking-cancel"
                                                disabled={
                                                    cancellingBookingId ===
                                                    booking.booking_id
                                                }
                                                onClick={async () => {

                                                    const shouldCancel = window.confirm(
                                                        `Are you sure you want to cancel Booking #${booking.booking_id}?`
                                                    )

                                                    if (!shouldCancel) {
                                                        return
                                                    }

                                                    setCancellationMessage("")
                                                    setCancellationError("")
                                                    setCancellingBookingId(
                                                        booking.booking_id
                                                    )

                                                    try {

                                                        await cancelBooking(
                                                            booking.booking_id,
                                                            accessToken
                                                        )

                                                        const data =
                                                            await getBookings(
                                                                accessToken
                                                            )

                                                        setBookings(
                                                            sortBookingsNewestFirst(
                                                                data.bookings || []
                                                            )
                                                        )

                                                        setCancellationMessage(
                                                            `Booking #${booking.booking_id} was cancelled successfully.`
                                                        )

                                                    } catch (error) {

                                                        console.error(
                                                            "Failed to cancel booking:",
                                                            error
                                                        )

                                                        setCancellationError(
                                                            error?.response?.data?.message ||
                                                            "We could not cancel this booking right now. Please try again."
                                                        )

                                                    } finally {

                                                        setCancellingBookingId(null)
                                                    }
                                                }}
                                            >
                                                {cancellingBookingId ===
                                                booking.booking_id
                                                    ? "Cancelling..."
                                                    : "Cancel Booking"}
                                            </button>

                                        )}

                                        {booking.status === "confirmed" && (() => {

                                            const cancellationStatus =
                                                booking.cancellation_request?.status ||
                                                cancellationRequestStatuses[
                                                    booking.booking_id
                                                ]

                                            if (cancellationStatus === "pending") {
                                                return (
                                                    <button
                                                        type="button"
                                                        className="dashboard-booking-cancel"
                                                        disabled
                                                    >
                                                        Cancellation Requested
                                                    </button>
                                                )
                                            }

                                            if (cancellationStatus === "approved") {
                                                return (
                                                    <button
                                                        type="button"
                                                        className="dashboard-booking-cancel"
                                                        disabled
                                                    >
                                                        Cancellation Approved
                                                    </button>
                                                )
                                            }

                                            if (cancellationStatus === "denied") {
                                                return (
                                                    <button
                                                        type="button"
                                                        className="dashboard-booking-cancel"
                                                        disabled
                                                    >
                                                        Cancellation Denied
                                                    </button>
                                                )
                                            }

                                            return (
                                                <button
                                                    type="button"
                                                    className="dashboard-booking-cancel"
                                                    onClick={() =>
                                                        openCancellationRequest(
                                                            booking
                                                        )
                                                    }
                                                >
                                                    Request Cancellation
                                                </button>
                                            )
                                        })()}

                                    </div>

                                </article>

                            ))}

                            </div>

                            )}

                        </div>

                    )}

                </div>


                <aside className="dashboard-side-card">

                    <p className="dashboard-section-eyebrow">
                        QUICK ACTIONS
                    </p>

                    <h2>
                        What would you like to do?
                    </h2>


                    <div className="dashboard-actions">

                        <Link
                            to="/tours"
                            className="dashboard-action"
                        >

                            <span>
                                🏕️
                            </span>

                            <div>

                                <strong>
                                    Explore Safaris
                                </strong>

                                <small>
                                    Discover your next adventure
                                </small>

                            </div>

                            <span>
                                →
                            </span>

                        </Link>


                        <Link
                            to="/profile"
                            className="dashboard-action"
                        >

                            <span>
                                👤
                            </span>

                            <div>

                                <strong>
                                    My Profile
                                </strong>

                                <small>
                                    Manage your account
                                </small>

                            </div>

                            <span>
                                →
                            </span>

                        </Link>


                        <Link
                            to="/notifications"
                            className="dashboard-action"
                        >

                            <span>
                                🔔
                            </span>

                            <div>

                                <strong>
                                    Notifications
                                </strong>

                                <small>
                                    View your latest updates
                                </small>

                            </div>

                            <span>
                                →
                            </span>

                        </Link>

                    </div>

                </aside>

            </section>


            {/* =================================================
                CUSTOMER REVIEW PANEL
            ================================================= */}

            {reviewBooking && (

                <div
                    className="dashboard-modal-backdrop"
                    role="presentation"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            closeReviewModal()
                        }
                    }}
                >

                    <div
                        className="dashboard-modal-card dashboard-review-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="review-modal-title"
                    >

                        <div className="dashboard-modal-header">

                            <div>

                                <p className="dashboard-section-eyebrow">
                                    SHARE YOUR EXPERIENCE
                                </p>

                                <h2 id="review-modal-title">
                                    {existingReview
                                        ? "Edit Your Review"
                                        : "Review Your Safari"}
                                </h2>

                                <p>
                                    Booking #{reviewBooking.booking_id}
                                </p>

                            </div>

                            <button
                                type="button"
                                className="dashboard-modal-close"
                                onClick={closeReviewModal}
                                disabled={reviewSaving}
                                aria-label="Close review form"
                            >
                                ×
                            </button>

                        </div>


                        {reviewLoading ? (

                            <div className="dashboard-modal-loading">
                                <span aria-hidden="true">⏳</span>
                                <p>Loading your review...</p>
                            </div>

                        ) : (

                            <form
                                className="dashboard-review-form"
                                onSubmit={handleReviewSubmit}
                            >

                                {reviewError && (

                                    <div
                                        className="dashboard-feedback-message dashboard-error-message"
                                        role="alert"
                                    >
                                        <span
                                            className="dashboard-feedback-icon"
                                            aria-hidden="true"
                                        >
                                            !
                                        </span>
                                        <div className="dashboard-feedback-content">
                                            <strong>Review not saved</strong>
                                            <span>{reviewError}</span>
                                        </div>
                                    </div>

                                )}


                                {reviewMessage && (

                                    <div
                                        className="dashboard-feedback-message dashboard-success-message"
                                        role="status"
                                        aria-live="polite"
                                    >
                                        <span
                                            className="dashboard-feedback-icon"
                                            aria-hidden="true"
                                        >
                                            ✓
                                        </span>
                                        <div className="dashboard-feedback-content">
                                            <strong>Review saved</strong>
                                            <span>{reviewMessage}</span>
                                        </div>
                                    </div>

                                )}


                                <div className="dashboard-review-rating-group">

                                    <label>
                                        How would you rate your safari?
                                    </label>

                                    <div
                                        className="dashboard-review-stars"
                                        role="radiogroup"
                                        aria-label="Safari rating"
                                    >

                                        {[1, 2, 3, 4, 5].map((star) => (

                                            <button
                                                key={star}
                                                type="button"
                                                className={
                                                    `dashboard-review-star ${
                                                        reviewRating >= star
                                                            ? "active"
                                                            : ""
                                                    }`
                                                }
                                                onClick={() => setReviewRating(star)}
                                                role="radio"
                                                aria-checked={reviewRating === star}
                                                aria-label={`${star} out of 5 stars`}
                                            >
                                                ★
                                            </button>

                                        ))}

                                    </div>

                                    <small>
                                        {reviewRating > 0
                                            ? `${reviewRating} out of 5 stars`
                                            : "Select a rating"}
                                    </small>

                                </div>


                                <div className="dashboard-review-comment-group">

                                    <label htmlFor="review-comment">
                                        Tell us about your experience
                                    </label>

                                    <textarea
                                        id="review-comment"
                                        value={reviewComment}
                                        onChange={(event) =>
                                            setReviewComment(event.target.value)
                                        }
                                        maxLength={2000}
                                        rows={6}
                                        placeholder="What did you enjoy about your safari?"
                                        disabled={reviewSaving}
                                    />

                                    <small>
                                        {reviewComment.length}/2000 characters
                                    </small>

                                </div>


                                <div className="dashboard-modal-actions">

                                    <button
                                        type="button"
                                        className="dashboard-secondary-button"
                                        onClick={closeReviewModal}
                                        disabled={reviewSaving}
                                    >
                                        Close
                                    </button>

                                    <button
                                        type="submit"
                                        className="dashboard-primary-button"
                                        disabled={reviewSaving}
                                    >
                                        {reviewSaving
                                            ? "Saving..."
                                            : existingReview
                                                ? "Update Review"
                                                : "Submit Review"}
                                    </button>

                                </div>

                            </form>

                        )}

                    </div>

                </div>
            )}


            {/* =================================================
                CANCELLATION REQUEST PANEL
            ================================================= */}

            {cancellationRequestBooking && (

                <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="cancellation-request-title"
                    style={{
                        position: "fixed",
                        inset: 0,
                        zIndex: 1000,
                        background: "rgba(15, 23, 42, 0.55)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "24px",
                    }}
                >

                    <div
                        style={{
                            width: "100%",
                            maxWidth: "560px",
                            maxHeight: "90vh",
                            overflowY: "auto",
                            background: "#fff",
                            borderRadius: "18px",
                            padding: "28px",
                            boxShadow: "0 20px 60px rgba(15, 23, 42, 0.25)",
                        }}
                    >

                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "flex-start",
                                marginBottom: "20px",
                            }}
                        >

                            <div>
                                <p className="dashboard-section-eyebrow">
                                    CANCELLATION REQUEST
                                </p>

                                <h2 id="cancellation-request-title">
                                    Request cancellation
                                </h2>

                                <p>
                                    Booking #{cancellationRequestBooking.booking_id}
                                </p>
                            </div>

                            {!cancellationRequestSubmitted && (
                                <button
                                    type="button"
                                    onClick={closeCancellationRequest}
                                    disabled={cancellationRequestLoading}
                                    aria-label="Close cancellation request"
                                    style={{
                                        border: "none",
                                        background: "transparent",
                                        fontSize: "24px",
                                        cursor: "pointer",
                                    }}
                                >
                                    ×
                                </button>
                            )}

                        </div>


                        {!cancellationRequestSubmitted ? (

                            <>
                                <div
                                    style={{
                                        background: "#f8fafc",
                                        borderRadius: "12px",
                                        padding: "16px",
                                        marginBottom: "20px",
                                    }}
                                >
                                    <strong>Before you submit</strong>

                                    <ul
                                        style={{
                                            marginTop: "10px",
                                            paddingLeft: "20px",
                                        }}
                                    >
                                        <li>
                                            Requests should be submitted at
                                            least 72 hours before departure.
                                        </li>

                                        <li>
                                            Your booking remains confirmed
                                            while the request is reviewed.
                                        </li>

                                        <li>
                                            This request does not immediately
                                            cancel the booking or issue a refund.
                                        </li>

                                        <li>
                                            The system will verify your
                                            successful payment and policy
                                            eligibility when submitted.
                                        </li>
                                    </ul>
                                </div>


                                {cancellationRequestPolicy && (

                                    <div
                                        style={{
                                            background:
                                                cancellationRequestPolicy.eligible
                                                    ? "#f0fdf4"
                                                    : "#fef2f2",
                                            borderRadius: "12px",
                                            padding: "14px",
                                            marginBottom: "18px",
                                        }}
                                    >
                                        <strong>Cancellation policy</strong>

                                        {cancellationRequestPolicy.departure_date && (
                                            <p>
                                                Departure:{" "}
                                                {new Date(
                                                    cancellationRequestPolicy.departure_date
                                                ).toLocaleString()}
                                            </p>
                                        )}

                                        {cancellationRequestPolicy.minimum_notice_hours && (
                                            <p>
                                                Minimum notice:{" "}
                                                {cancellationRequestPolicy.minimum_notice_hours}{" "}
                                                hours
                                            </p>
                                        )}

                                        {typeof cancellationRequestPolicy.eligible ===
                                            "boolean" && (
                                            <p>
                                                Eligibility:{" "}
                                                {cancellationRequestPolicy.eligible
                                                    ? "Eligible"
                                                    : "Not eligible"}
                                            </p>
                                        )}
                                    </div>
                                )}


                                {cancellationRequestError && (

                                    <div
                                        className="dashboard-feedback-message dashboard-error-message"
                                        role="alert"
                                        aria-live="assertive"
                                    >
                                        <span
                                            className="dashboard-feedback-icon"
                                            aria-hidden="true"
                                        >
                                            !
                                        </span>

                                        <div className="dashboard-feedback-content">
                                            <strong>Request unsuccessful</strong>

                                            <span>
                                                {cancellationRequestError}
                                            </span>
                                        </div>
                                    </div>
                                )}


                                <label
                                    htmlFor="cancellation-request-reason"
                                    style={{
                                        display: "block",
                                        fontWeight: "600",
                                        marginTop: "18px",
                                        marginBottom: "8px",
                                    }}
                                >
                                    Reason for cancellation
                                </label>

                                <textarea
                                    id="cancellation-request-reason"
                                    value={cancellationRequestReason}
                                    onChange={(event) =>
                                        setCancellationRequestReason(
                                            event.target.value
                                        )
                                    }
                                    placeholder="Tell us why you need to cancel this booking..."
                                    rows={5}
                                    disabled={cancellationRequestLoading}
                                    style={{
                                        width: "100%",
                                        boxSizing: "border-box",
                                        resize: "vertical",
                                        border: "1px solid #cbd5e1",
                                        borderRadius: "10px",
                                        padding: "12px",
                                        font: "inherit",
                                    }}
                                />


                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "flex-end",
                                        gap: "10px",
                                        marginTop: "20px",
                                    }}
                                >
                                    <button
                                        type="button"
                                        onClick={closeCancellationRequest}
                                        disabled={cancellationRequestLoading}
                                        className="dashboard-secondary-button"
                                    >
                                        Close
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleCancellationRequest}
                                        disabled={
                                            cancellationRequestLoading ||
                                            !cancellationRequestReason.trim()
                                        }
                                        className="dashboard-primary-button"
                                    >
                                        {cancellationRequestLoading
                                            ? "Submitting..."
                                            : "Submit Request"}
                                    </button>
                                </div>
                            </>

                        ) : (

                            <div>

                                <div
                                    className="dashboard-feedback-message dashboard-success-message"
                                    role="status"
                                    aria-live="polite"
                                >
                                    <span
                                        className="dashboard-feedback-icon"
                                        aria-hidden="true"
                                    >
                                        ✓
                                    </span>

                                    <div className="dashboard-feedback-content">
                                        <strong>
                                            Cancellation request submitted
                                        </strong>

                                        <span>
                                            {cancellationRequestMessage}
                                        </span>
                                    </div>
                                </div>


                                {cancellationRequestPolicy && (

                                    <div
                                        style={{
                                            background: "#f8fafc",
                                            borderRadius: "12px",
                                            padding: "16px",
                                            marginTop: "18px",
                                        }}
                                    >
                                        <strong>Request details</strong>

                                        {cancellationRequestPolicy.departure_date && (
                                            <p>
                                                Departure:{" "}
                                                {new Date(
                                                    cancellationRequestPolicy.departure_date
                                                ).toLocaleString()}
                                            </p>
                                        )}

                                        {cancellationRequestPolicy.minimum_notice_hours && (
                                            <p>
                                                Minimum notice:{" "}
                                                {cancellationRequestPolicy.minimum_notice_hours}{" "}
                                                hours
                                            </p>
                                        )}
                                    </div>
                                )}


                                <p>
                                    Your booking remains confirmed while the
                                    cancellation request is awaiting review.
                                    If approved, the refund process will be
                                    initiated.
                                </p>


                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "flex-end",
                                        marginTop: "24px",
                                    }}
                                >
                                    <button
                                        type="button"
                                        onClick={closeCancellationRequest}
                                        className="dashboard-primary-button"
                                    >
                                        Done
                                    </button>
                                </div>

                            </div>
                        )}

                    </div>

                </div>
            )}

        </div>
    )
}


export default Dashboard