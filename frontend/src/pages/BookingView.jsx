import { formatKenyaDate, formatKenyaDateTime, formatKenyaTime } from "../utils/dateTime";
// =========================================================
// THAFARI BOOKING VIEW PAGE
// =========================================================
//
// This page is different from Booking.jsx.
//
// Booking.jsx:
// - creates a NEW booking
// - uses a departure ID
//
// BookingView.jsx:
// - displays an EXISTING booking
// - uses a booking ID
//
// This page is used by:
// - "View booking" notification buttons
// - future "My Bookings" dashboard links
//
// Backend endpoint:
// GET /api/booking/<booking_id>
//
// =========================================================

import { useEffect, useState } from "react"

import {
    Link,
    Navigate,
    useNavigate,
    useParams,
} from "react-router-dom"

import { useAuth } from "../context/AuthContext"

import { getBooking } from "../services/bookingService"

import "./BookingView.css"


// =========================================================
// HELPER: FORMAT MONEY
// =========================================================

function formatPrice(value) {

    const amount = Number(value)

    if (Number.isNaN(amount)) {
        return "KES 0.00"
    }

    return new Intl.NumberFormat(
        "en-KE",
        {
            style: "currency",
            currency: "KES",
            minimumFractionDigits: 2,
        }
    ).format(amount)
}


// =========================================================
// HELPER: FORMAT DATE
// =========================================================

function formatDate(value) {

    if (!value) {
        return "Not available"
    }

    const formatted = formatKenyaDateTime(value)
    return formatted === "—" ? "Not available" : formatted
}


// =========================================================
// HELPER: FORMAT STATUS
// =========================================================

function getStatusClass(status) {

    switch (status) {

        case "confirmed":
            return "confirmed"

        case "cancelled":
            return "cancelled"

        case "expired":
            return "expired"

        case "completed":
            return "completed"

        case "pending":
        default:
            return "pending"
    }
}


// =========================================================
// BOOKING VIEW COMPONENT
// =========================================================

function BookingView() {

    // -----------------------------------------------------
    // ROUTER
    // -----------------------------------------------------

    // Example:
    //
    // /booking/view/25
    //
    // bookingId = "25"

    const {
        bookingId,
    } = useParams()


    const navigate = useNavigate()


    // -----------------------------------------------------
    // AUTHENTICATION
    // -----------------------------------------------------

    const {
        isAuthenticated,
        accessToken,
        authLoading,
        user,
    } = useAuth()


    // -----------------------------------------------------
    // PAGE STATE
    // -----------------------------------------------------

    const [
        booking,
        setBooking,
    ] = useState(null)


    const [
        loading,
        setLoading,
    ] = useState(true)


    const [
        error,
        setError,
    ] = useState("")


    // =====================================================
    // LOAD BOOKING
    // =====================================================

    useEffect(() => {

        // Wait until AuthContext finishes restoring the
        // current login session.
        if (
            authLoading ||
            !isAuthenticated ||
            !accessToken
        ) {
            return
        }


        let cancelled = false


        const loadBooking = async () => {

            try {

                setLoading(true)

                setError("")


                // Validate the URL parameter before sending it
                // to the backend.
                const numericBookingId =
                    Number(bookingId)


                if (
                    !Number.isInteger(
                        numericBookingId
                    ) ||
                    numericBookingId <= 0
                ) {

                    setError(
                        "The booking ID is invalid."
                    )

                    return
                }


                // Request the existing booking.
                const response =
                    await getBooking(
                        numericBookingId,
                        accessToken
                    )


                if (!cancelled) {

                    setBooking(
                        response?.booking ||
                        response?.data ||
                        response
                    )
                }

            } catch (err) {

                console.error(
                    "Failed to load booking:",
                    err
                )


                if (!cancelled) {

                    setError(
                        err?.response?.data?.message ||
                        "We could not load this booking. Please try again."
                    )
                }

            } finally {

                if (!cancelled) {
                    setLoading(false)
                }
            }
        }


        loadBooking()


        return () => {

            cancelled = true
        }

    }, [
        bookingId,
        accessToken,
        isAuthenticated,
        authLoading,
    ])


    // =====================================================
    // AUTH LOADING
    // =====================================================

    if (authLoading) {

        return (

            <div className="booking-view-page">

                <div className="booking-view-state">

                    <div className="booking-view-state-icon">
                        ⏳
                    </div>

                    <h2>
                        Loading your booking...
                    </h2>

                </div>

            </div>
        )
    }


    // =====================================================
    // PROTECT THE PAGE
    // =====================================================

    if (!isAuthenticated) {

        return (

            <Navigate
                to="/login"
                replace
                state={{
                    from:
                        `/booking/view/${bookingId}`,
                }}
            />
        )
    }


    // =====================================================
    // LOADING
    // =====================================================

    if (loading) {

        return (

            <div className="booking-view-page">

                <div className="booking-view-state">

                    <div className="booking-view-state-icon">
                        🦁
                    </div>

                    <h2>
                        Loading your safari booking...
                    </h2>

                    <p>
                        We're retrieving your booking
                        details.
                    </p>

                </div>

            </div>
        )
    }


    // =====================================================
    // ERROR
    // =====================================================

    if (error || !booking) {

        return (

            <div className="booking-view-page">

                <div className="booking-view-state booking-view-error">

                    <div className="booking-view-state-icon">
                        ⚠️
                    </div>

                    <h2>
                        Booking unavailable
                    </h2>

                    <p>
                        {error ||
                            "We could not find this booking."
                        }
                    </p>

                    <Link
                        to="/dashboard"
                        className="booking-view-primary-button"
                    >
                        Back to Dashboard
                    </Link>

                </div>

            </div>
        )
    }


    // =====================================================
    // NORMALIZE BOOKING DATA
    // =====================================================

    // The backend currently returns booking_id.
    // These fallbacks make the page tolerant of the older
    // booking response shape as well.

    const id =
        booking.booking_id ||
        booking.id


    const status =
        booking.status ||
        "pending"


    const statusClass =
        getStatusClass(status)


    // =====================================================
    // CHECK CUSTOMER ROLE
    // =====================================================
    //
    // The current backend conversation creation endpoint
    // creates a conversation from a customer's booking.
    //
    // Therefore the "Message Tour Operator" action is
    // currently shown to customers only.
    //
    // =====================================================

    const isCustomer =
        user?.role === "customer"


    // =====================================================
    // START CHAT
    // =====================================================

    const handleMessageTourOperator = () => {

        if (!id) {
            return
        }

        navigate(
            `/conversations?booking_id=${id}`
        )
    }


    // =====================================================
    // PAGE
    // =====================================================

    return (

        <div className="booking-view-page">

            {/* =================================================
                HERO
            ================================================= */}

            <section className="booking-view-hero">

                <div className="booking-view-hero-content">

                    <div className="booking-view-breadcrumb">

                        <Link to="/dashboard">
                            Dashboard
                        </Link>

                        <span>
                            /
                        </span>

                        <span>
                            Booking #{id}
                        </span>

                    </div>


                    <p className="booking-view-eyebrow">
                        THAFARI • YOUR JOURNEY
                    </p>


                    <h1>
                        {booking.tour_name || `Booking #${id}`}
                    </h1>

                    {booking.destination && (
                        <p className="booking-view-safari-destination">
                            📍 {booking.destination}
                        </p>
                    )}

                    <p>
                        Booking #{id} · Here are the details of your
                        safari reservation.
                    </p>

                </div>

            </section>


            {/* =================================================
                MAIN CONTENT
            ================================================= */}

            <main className="booking-view-container">

                {/* =================================================
                    STATUS CARD
                ================================================= */}

                <section className="booking-view-status-card">

                    <div>

                        <span className="booking-view-label">
                            BOOKING STATUS
                        </span>

                        <h2>
                            {status
                                .charAt(0)
                                .toUpperCase() +
                                status.slice(1)
                            }
                        </h2>

                    </div>


                    <span
                        className={
                            `booking-view-status ${statusClass}`
                        }
                    >
                        {status}
                    </span>

                </section>


                {/* =================================================
                    BOOKING DETAILS
                ================================================= */}

                <section className="booking-view-grid">

                    <article className="booking-view-card">

                        <p className="booking-view-card-label">
                            RESERVATION
                        </p>

                        <h2>
                            Booking details
                        </h2>


                        <div className="booking-view-detail-list">

                            <div>

                                <span>
                                    Booking ID
                                </span>

                                <strong>
                                    #{id}
                                </strong>

                            </div>


                            <div>
                                <span>Safari name</span>
                                <strong>{booking.tour_name || "Not available"}</strong>
                            </div>

                            <div>
                                <span>Destination</span>
                                <strong>{booking.destination || "Not available"}</strong>
                            </div>

                            <div>
                                <span>Departure date</span>
                                <strong>
                                    {booking.departure_date
                                        ? formatKenyaDate(booking.departure_date)
                                        : "Not available"}
                                </strong>
                            </div>

                            <div>
                                <span>Return date</span>
                                <strong>
                                    {booking.return_date
                                        ? formatKenyaDate(booking.return_date)
                                        : "Not available"}
                                </strong>
                            </div>

                            <div>

                                <span>
                                    Departure ID
                                </span>

                                <strong>
                                    #
                                    {
                                        booking.departure_id ||
                                        "N/A"
                                    }
                                </strong>

                            </div>


                            <div>

                                <span>
                                    Travellers
                                </span>

                                <strong>
                                    {
                                        booking.number_of_people
                                    }
                                </strong>

                            </div>


                            <div>

                                <span>
                                    Price per person
                                </span>

                                <strong>
                                    {
                                        formatPrice(
                                            booking.price_per_person
                                        )
                                    }
                                </strong>

                            </div>


                            <div className="booking-view-total">

                                <span>
                                    Total amount
                                </span>

                                <strong>
                                    {
                                        formatPrice(
                                            booking.total_price
                                        )
                                    }
                                </strong>

                            </div>

                        </div>

                    </article>


                    <article className="booking-view-card">

                        <p className="booking-view-card-label">
                            TIMELINE
                        </p>

                        <h2>
                            Reservation activity
                        </h2>


                        <div className="booking-view-detail-list">

                            <div>

                                <span>
                                    Created
                                </span>

                                <strong>
                                    {
                                        formatDate(
                                            booking.created_at
                                        )
                                    }
                                </strong>

                            </div>


                            <div>

                                <span>
                                    Last updated
                                </span>

                                <strong>
                                    {
                                        formatDate(
                                            booking.updated_at
                                        )
                                    }
                                </strong>

                            </div>


                            <div>

                                <span>
                                    Payment window
                                </span>

                                <strong>
                                    {
                                        booking.expires_at
                                            ? formatDate(
                                                booking.expires_at
                                            )
                                            : "No active payment window"
                                    }
                                </strong>

                            </div>

                        </div>

                    </article>

                </section>


                {/* =================================================
                    CANCELLATION HISTORY
                ================================================= */}

                <section className="booking-view-card booking-view-cancellation-history">

                    <p className="booking-view-card-label">
                        CANCELLATION HISTORY
                    </p>

                    <h2>Cancellation requests</h2>

                    <p className="booking-view-history-description">
                        Track the status and review outcome of your
                        cancellation requests.
                    </p>

                    {!Array.isArray(booking.cancellation_history) ||
                    booking.cancellation_history.length === 0 ? (

                        <div className="booking-view-history-empty">
                            <span aria-hidden="true">📋</span>
                            <p>
                                No cancellation requests have been made
                                for this booking.
                            </p>
                        </div>

                    ) : (

                        <div className="booking-view-history-list">

                            {booking.cancellation_history.map((item) => (

                                <article
                                    key={item.id}
                                    className="booking-view-history-item"
                                >

                                    <div className="booking-view-history-heading">

                                        <strong>
                                            Request #{item.id}
                                        </strong>

                                        <span
                                            className={`booking-view-history-status ${item.status || "pending"}`}
                                        >
                                            {(item.status || "pending").charAt(0).toUpperCase() +
                                                (item.status || "pending").slice(1)}
                                        </span>

                                    </div>

                                    <div className="booking-view-history-date">
                                        <span>Requested</span>
                                        <strong>
                                            {formatDate(item.created_at)}
                                        </strong>
                                    </div>

                                    <div className="booking-view-history-reason">
                                        <span>Your reason</span>
                                        <p>{item.reason || "No reason provided."}</p>
                                    </div>

                                    {item.reviewed_at && (
                                        <div className="booking-view-history-date">
                                            <span>Reviewed</span>
                                            <strong>
                                                {formatDate(item.reviewed_at)}
                                            </strong>
                                        </div>
                                    )}

                                    {item.admin_reason && (
                                        <div className="booking-view-history-reason">
                                            <span>Staff response</span>
                                            <p>{item.admin_reason}</p>
                                        </div>
                                    )}

                                </article>

                            ))}

                        </div>

                    )}

                </section>


                {/* =================================================
                    ACTIONS
                ================================================= */}

                <section className="booking-view-actions">

                    <Link
                        to="/dashboard"
                        className="booking-view-primary-button"
                    >
                        ← Back to Dashboard
                    </Link>


                    {isCustomer && (

                        <button
                            type="button"
                            className="booking-view-secondary-button"
                            onClick={
                                handleMessageTourOperator
                            }
                        >
                            💬 Message Tour Operator
                        </button>
                    )}


                    <Link
                        to="/notifications"
                        className="booking-view-secondary-button"
                    >
                        View Notifications
                    </Link>

                </section>


            </main>

        </div>
    )
}


export default BookingView