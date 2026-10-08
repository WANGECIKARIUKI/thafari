// =========================================================
// THAFARI BOOKING PAGE
// =========================================================
//
// This page allows an authenticated customer to:
//
// - Review a selected safari departure
// - Select the number of travellers
// - See the booking total
// - Create the booking
// - View the booking confirmation popup
// - Choose a payment method
// - Start Pesapal payment
// - Submit M-Pesa/Airtel direct payment
//
// IMPORTANT:
//
// Creating a booking does NOT mean payment has been made.
//
// The booking starts as:
//
//     PENDING
//
// Pesapal payments are verified automatically through
// Pesapal.
//
// Direct payments remain PENDING until an authorized
// admin/tour operator manually verifies them.
//
// =========================================================

import { useEffect, useMemo, useState } from "react"

import {
    Link,
    useNavigate,
    useParams,
    useLocation,
} from "react-router-dom"

import { useAuth } from "../context/AuthContext"

import { createBooking } from "../services/bookingService"

import {
    createPayment,
    getPaymentSettings,
    submitDirectPayment,
} from "../services/paymentService"

import "./Booking.css"


function Booking() {

    // =====================================================
    // ROUTER
    // =====================================================

    const { departureId } = useParams()

    const navigate = useNavigate()

    const location = useLocation()


    // =====================================================
    // AUTHENTICATION
    // =====================================================

    const {
        isAuthenticated,
        accessToken,
    } = useAuth()


    // =====================================================
    // STATE
    // =====================================================

    // =====================================================
    // SELECTED DEPARTURE
    // =====================================================
    //
    // The previous safari page stores the selected departure
    // in sessionStorage before sending the customer here.
    //
    // sessionStorage is synchronous, so we can read it during
    // render instead of using an effect that immediately calls
    // setState. This keeps the existing booking flow intact
    // while avoiding React cascading-render warnings.
    //
    // =====================================================

    const {
        departure,
        departureError,
    } = useMemo(() => {

        const savedDeparture =
            sessionStorage.getItem(
                `thafari_departure_${departureId}`
            )


        if (!savedDeparture) {

            return {
                departure: null,
                departureError:
                    "We could not find the selected departure.",
            }
        }


        try {

            const parsedDeparture =
                JSON.parse(savedDeparture)


            console.log(
                "Selected departure:",
                parsedDeparture
            )


            return {
                departure: parsedDeparture,
                departureError: "",
            }

        } catch (error) {

            console.error(
                "Failed to read departure:",
                error
            )


            return {
                departure: null,
                departureError:
                    "The selected departure could not be loaded.",
            }
        }

    }, [departureId])


    const [numberOfPeople, setNumberOfPeople] =
        useState(1)

    // The departure is read synchronously above, so there is
    // no separate departure-loading request.
    const loading = false

    const [submitting, setSubmitting] = useState(false)

    const [paymentLoading, setPaymentLoading] = useState(false)

    const [error, setError] = useState("")


    // =====================================================
    // BOOKING CONFIRMATION
    // =====================================================

    const [showConfirmation, setShowConfirmation] =
        useState(false)


    const [booking, setBooking] = useState(null)


    // =====================================================
    // PAYMENT UI STATE
    // =====================================================
    //
    // paymentStep:
    //
    //     "options"
    //         → customer chooses Pesapal or Direct Payment
    //
    //     "direct"
    //         → customer chooses M-Pesa/Airtel,
    //           makes the payment, then submits
    //           the payment for verification
    //
    //     "submitted"
    //         → direct payment was submitted successfully
    //
    // =====================================================

    const [paymentStep, setPaymentStep] =
        useState("options")


    const [paymentSettings, setPaymentSettings] =
        useState(null)


    const [paymentSettingsLoading, setPaymentSettingsLoading] =
        useState(false)


    const [paymentSettingsError, setPaymentSettingsError] =
        useState("")


    const [directPaymentMethod, setDirectPaymentMethod] =
        useState("")


    const [directPaymentSubmitting, setDirectPaymentSubmitting] =
        useState(false)


    const [submittedDirectPayment, setSubmittedDirectPayment] =
        useState(null)


    // =====================================================
    // PROTECT THE BOOKING PAGE
    // =====================================================

    useEffect(() => {

        if (!isAuthenticated) {

            navigate(
                "/login",
                {
                    state: {
                        from: location.pathname,
                    },
                }
            )
        }

    }, [
        isAuthenticated,
        navigate,
        location.pathname,
    ])


    // =====================================================
    // FORMAT PRICE
    // =====================================================

    const formatPrice = (price) => {

        return new Intl.NumberFormat(
            "en-KE",
            {
                style: "currency",
                currency: "KES",
                maximumFractionDigits: 0,
            }
        ).format(Number(price || 0))
    }


    // =====================================================
    // FORMAT DATE
    // =====================================================

    const formatDate = (date) => {

        if (!date) {
            return "Date unavailable"
        }

        return new Date(date).toLocaleDateString(
            "en-KE",
            {
                day: "numeric",
                month: "long",
                year: "numeric",
            }
        )
    }


    // =====================================================
    // INCREASE NUMBER OF PEOPLE
    // =====================================================

    const increasePeople = () => {

        if (!departure) {
            return
        }


        const availableSeats =
            Number(
                departure.available_seats || 0
            )


        if (numberOfPeople < availableSeats) {

            setNumberOfPeople(
                numberOfPeople + 1
            )
        }
    }


    // =====================================================
    // DECREASE NUMBER OF PEOPLE
    // =====================================================

    const decreasePeople = () => {

        if (numberOfPeople > 1) {

            setNumberOfPeople(
                numberOfPeople - 1
            )
        }
    }


    // =====================================================
    // PRICE CALCULATIONS
    // =====================================================

    const pricePerPerson =
        Number(
            departure?.price_per_person || 0
        )


    const estimatedTotal =
        pricePerPerson * numberOfPeople


    // A departure-loading problem is derived from sessionStorage,
    // while other errors are stored in the normal error state.
    const bookingError =
        error || departureError


    // =====================================================
    // CREATE BOOKING
    // =====================================================

    const handleCreateBooking = async () => {

        setError("")


        if (!accessToken) {

            setError(
                "Your login session has expired. Please log in again."
            )

            return
        }


        if (!departure) {

            setError(
                "No departure has been selected."
            )

            return
        }


        const selectedDepartureId =
            departure?.departure_id ??
            departure?.id


        console.log(
            "Departure being booked:",
            departure
        )


        console.log(
            "Selected departure ID:",
            selectedDepartureId
        )


        if (!selectedDepartureId) {

            setError(
                "We could not identify the selected departure. Please go back and select the departure again."
            )

            return
        }


        if (numberOfPeople < 1) {

            setError(
                "You must book at least one person."
            )

            return
        }


        if (
            departure.available_seats !== undefined &&
            numberOfPeople >
            Number(departure.available_seats)
        ) {

            setError(
                "There are not enough seats available for this booking."
            )

            return
        }


        setSubmitting(true)


        try {

            const data =
                await createBooking(
                    {
                        departure_id:
                            Number(selectedDepartureId),

                        number_of_people:
                            numberOfPeople,
                    },
                    accessToken
                )


            console.log(
                "Booking created successfully:",
                data
            )


            const createdBooking =
                data?.booking ||
                data?.data ||
                data


            // Prepare the payment settings UI before opening
            // the confirmation modal. This keeps the effect
            // below focused only on fetching external data.
            setPaymentSettings(null)
            setPaymentSettingsError("")
            setPaymentSettingsLoading(true)


            setBooking(
                createdBooking
            )


            setShowConfirmation(true)


            sessionStorage.removeItem(
                `thafari_departure_${departureId}`
            )

        } catch (error) {

            console.error(
                "Booking creation failed:",
                error
            )


            const backendMessage =
                error?.response?.data?.message ||
                error?.response?.data?.error


            setError(
                backendMessage ||
                "We could not create your booking. Please try again."
            )

        } finally {

            setSubmitting(false)
        }
    }


    // =====================================================
    // LOAD PAYMENT OPTIONS
    // =====================================================

    // Load the payment settings automatically when the
    // booking confirmation modal opens.
    //
    // M-Pesa and Airtel details therefore come from the
    // database instead of being hardcoded in React.

    useEffect(() => {

        if (!showConfirmation || !booking) {
            return
        }


        let cancelled = false


        const loadPaymentSettings = async () => {

            try {

                const data =
                    await getPaymentSettings()


                if (!cancelled) {

                    setPaymentSettings(
                        data?.payment_settings || null
                    )
                }

            } catch (error) {

                console.error(
                    "Failed to load payment settings:",
                    error
                )


                if (!cancelled) {

                    setPaymentSettingsError(
                        error?.response?.data?.message ||
                        "We could not load the direct payment options."
                    )
                }

            } finally {

                if (!cancelled) {
                    setPaymentSettingsLoading(false)
                }
            }
        }


        loadPaymentSettings()


        return () => {
            cancelled = true
        }

    }, [showConfirmation, booking])


    // =====================================================
    // START PESAPAL PAYMENT
    // =====================================================

    const handlePesapalPayment = async () => {

        setError("")


        if (!accessToken) {

            setError(
                "Your login session has expired. Please log in again."
            )

            return
        }


        const bookingId =
            booking?.booking_id ??
            booking?.id


        console.log(
            "Booking being sent for payment:",
            booking
        )


        console.log(
            "Payment booking ID:",
            bookingId
        )


        if (!bookingId) {

            setError(
                "We could not identify your booking. Please try creating the booking again."
            )

            return
        }


        setPaymentLoading(true)


        try {

            const data =
                await createPayment(
                    Number(bookingId),
                    accessToken
                )


            console.log(
                "Pesapal payment created:",
                data
            )


            if (!data?.redirect_url) {

                setError(
                    "The payment provider did not return a checkout URL. Please try again."
                )

                return
            }


            window.location.href =
                data.redirect_url

        } catch (error) {

            console.error(
                "Payment creation failed:",
                error
            )


            const backendMessage =
                error?.response?.data?.message ||
                error?.response?.data?.error


            setError(
                backendMessage ||
                "We could not start the payment. Please try again."
            )

        } finally {

            setPaymentLoading(false)
        }
    }


    // =====================================================
    // SELECT DIRECT PAYMENT
    // =====================================================

    const handleOpenDirectPayment = () => {

        setError("")

        setPaymentSettingsError("")

        setSubmittedDirectPayment(null)

        setPaymentStep("direct")
    }


    // =====================================================
    // SUBMIT DIRECT PAYMENT
    // =====================================================

    const handleSubmitDirectPayment = async () => {

        setError("")


        if (!accessToken) {

            setError(
                "Your login session has expired. Please log in again."
            )

            return
        }


        const bookingId =
            booking?.booking_id ??
            booking?.id


        if (!bookingId) {

            setError(
                "We could not identify your booking."
            )

            return
        }


        if (!directPaymentMethod) {

            setError(
                "Please select a direct payment method."
            )

            return
        }


        setDirectPaymentSubmitting(true)


        try {

            const data =
                await submitDirectPayment(
                    {
                        booking_id:
                            Number(bookingId),

                        payment_method:
                            directPaymentMethod,
                    },
                    accessToken
                )


            console.log(
                "Direct payment submitted:",
                data
            )


            setSubmittedDirectPayment(
                data?.payment || null
            )


            setPaymentStep("submitted")

        } catch (error) {

            console.error(
                "Direct payment submission failed:",
                error
            )


            const backendMessage =
                error?.response?.data?.message ||
                error?.response?.data?.error


            setError(
                backendMessage ||
                "We could not submit your payment. Please try again."
            )

        } finally {

            setDirectPaymentSubmitting(false)
        }
    }


    // =====================================================
    // CLOSE CONFIRMATION POPUP
    // =====================================================

    const closeConfirmation = () => {

        setShowConfirmation(false)

        setPaymentStep("options")

        setPaymentSettings(null)

        setPaymentSettingsError("")

        setDirectPaymentMethod("")

        setSubmittedDirectPayment(null)
    }


    // =====================================================
    // CLOSE BOOKING CONFIRMATION AND EXPLORE SAFARIS
    // =====================================================
    //
    // Once a booking has been created, closing the confirmation
    // popup takes the customer back to the safari listing so they
    // can continue exploring other safaris.
    //
    // The existing Review Booking button still uses
    // closeConfirmation() and therefore stays on the booking page.
    //
    const closeConfirmationAndExplore = () => {

        closeConfirmation()

        navigate("/tours")
    }


    // =====================================================
    // LOADING STATE
    // =====================================================

    if (loading) {

        return (
            <main className="booking-page">

                <div className="booking-loading">

                    <div className="booking-spinner"></div>

                    <p>
                        Preparing your booking...
                    </p>

                </div>

            </main>
        )
    }


    // =====================================================
    // ERROR STATE
    // =====================================================

    if (bookingError && !departure) {

        return (
            <main className="booking-page">

                <div className="booking-error">

                    <h1>
                        Something went wrong
                    </h1>

                    <p>
                        {bookingError}
                    </p>

                    <Link
                        to="/tours"
                        className="booking-back-button"
                    >
                        ← Explore Safaris
                    </Link>

                </div>

            </main>
        )
    }


    // =====================================================
    // MAIN BOOKING PAGE
    // =====================================================

    return (
        <main className="booking-page">

            <section className="booking-container">


                {/* =========================================
                    PAGE HEADER
                ========================================= */}

                <div className="booking-header">

                    <div>

                        <p className="booking-eyebrow">
                            THAFARI • YOUR ADVENTURE STARTS HERE
                        </p>

                        <h1>
                            Complete your booking
                        </h1>

                        <p>
                            Review your safari details and
                            confirm the number of travellers.
                        </p>

                    </div>

                </div>


                {/* =========================================
                    ERROR MESSAGE
                ========================================= */}

                {bookingError && (

                    <div className="booking-alert">

                        <strong>
                            Booking could not be completed
                        </strong>

                        <span>
                            {bookingError}
                        </span>

                    </div>
                )}


                {/* =========================================
                    BOOKING CONTENT
                ========================================= */}

                <div className="booking-layout">


                    {/* =====================================
                        LEFT SIDE
                    ===================================== */}

                    <section className="booking-details">


                        {/* ---------------------------------
                            SAFARI DETAILS
                        --------------------------------- */}

                        <div className="booking-card">

                            <p className="booking-card-label">
                                YOUR SAFARI
                            </p>

                            <h2>
                                {departure?.tour_name}
                            </h2>

                            <p className="booking-destination">
                                📍 {departure?.destination}
                            </p>


                            <div className="booking-info-grid">

                                <div>

                                    <span>
                                        Departure
                                    </span>

                                    <strong>
                                        {formatDate(
                                            departure?.start_date
                                        )}
                                    </strong>

                                </div>


                                <div>

                                    <span>
                                        Return
                                    </span>

                                    <strong>
                                        {formatDate(
                                            departure?.end_date
                                        )}
                                    </strong>

                                </div>


                                <div>

                                    <span>
                                        Price per person
                                    </span>

                                    <strong>
                                        {formatPrice(
                                            pricePerPerson
                                        )}
                                    </strong>

                                </div>


                                <div>

                                    <span>
                                        Available seats
                                    </span>

                                    <strong>
                                        {departure?.available_seats}
                                    </strong>

                                </div>

                            </div>

                        </div>


                        {/* ---------------------------------
                            TRAVELLERS
                        --------------------------------- */}

                        <div className="booking-card">

                            <p className="booking-card-label">
                                TRAVELLERS
                            </p>

                            <h2>
                                How many people are travelling?
                            </h2>

                            <p>
                                Select the number of people
                                included in this booking.
                            </p>


                            <div className="traveller-selector">

                                <button
                                    type="button"
                                    onClick={
                                        decreasePeople
                                    }
                                    disabled={
                                        numberOfPeople <= 1 ||
                                        submitting ||
                                        paymentLoading
                                    }
                                    aria-label="Decrease number of travellers"
                                >
                                    −
                                </button>


                                <div className="traveller-count">

                                    <strong>
                                        {numberOfPeople}
                                    </strong>

                                    <span>
                                        {numberOfPeople === 1
                                            ? "Traveller"
                                            : "Travellers"}
                                    </span>

                                </div>


                                <button
                                    type="button"
                                    onClick={
                                        increasePeople
                                    }
                                    disabled={
                                        submitting ||
                                        paymentLoading ||
                                        numberOfPeople >=
                                        Number(
                                            departure?.available_seats || 0
                                        )
                                    }
                                    aria-label="Increase number of travellers"
                                >
                                    +
                                </button>

                            </div>

                        </div>

                    </section>


                    {/* =====================================
                        RIGHT SIDE
                    ===================================== */}

                    <aside className="booking-summary">

                        <div className="booking-summary-card">

                            <p className="booking-card-label">
                                BOOKING SUMMARY
                            </p>

                            <h2>
                                Your trip
                            </h2>


                            <div className="summary-tour">

                                <strong>
                                    {departure?.tour_name}
                                </strong>

                                <span>
                                    {departure?.destination}
                                </span>

                            </div>


                            <div className="summary-line">

                                <span>
                                    {formatPrice(
                                        pricePerPerson
                                    )} × {numberOfPeople}
                                </span>

                                <strong>
                                    {formatPrice(
                                        estimatedTotal
                                    )}
                                </strong>

                            </div>


                            <div className="summary-total">

                                <span>
                                    Total
                                </span>

                                <strong>
                                    {formatPrice(
                                        estimatedTotal
                                    )}
                                </strong>

                            </div>


                            <button
                                type="button"
                                className="booking-confirm-button"
                                onClick={
                                    handleCreateBooking
                                }
                                disabled={
                                    submitting ||
                                    paymentLoading
                                }
                            >

                                {submitting
                                    ? "Creating booking..."
                                    : "Confirm booking"}

                                {!submitting && (
                                    <span>
                                        →
                                    </span>
                                )}

                            </button>


                            <p className="booking-note">
                                Your booking will be created as
                                pending until payment is completed.
                            </p>

                        </div>


                        <Link
                            to={`/tours/${departure?.tour_id}`}
                            className="booking-back-link"
                        >
                            ← Back to safari details
                        </Link>

                    </aside>

                </div>

            </section>


            {/* =================================================
                BOOKING CONFIRMATION MODAL
            ================================================= */}

            {showConfirmation && booking && (

                <div
                    className="booking-modal-overlay"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="booking-modal-title"
                >

                    <div className="booking-modal">


                        {/* =================================
                            CLOSE BUTTON
                        ================================= */}

                        <button
                            type="button"
                            className="booking-modal-close"
                            onClick={
                                closeConfirmationAndExplore
                            }
                            aria-label="Close booking confirmation"
                        >
                            ×
                        </button>


                        {/* =================================
                            SUCCESS ICON
                        ================================= */}

                        <div className="booking-modal-success-icon">
                            ✓
                        </div>


                        {/* =================================
                            HEADING
                        ================================= */}

                        <p className="booking-modal-eyebrow">
                            BOOKING CREATED
                        </p>

                        <h2 id="booking-modal-title">
                            Your safari is ready! 🎉
                        </h2>

                        <p className="booking-modal-message">
                            Your booking has been created successfully.
                            Choose a payment method below to confirm
                            your safari.
                        </p>


                        {/* =================================
                            PENDING PAYMENT STATUS
                        ================================= */}

                        <div className="booking-modal-pending">

                            <span className="booking-modal-pending-icon">
                                ⏳
                            </span>

                            <div>

                                <strong>
                                    Pending Payment
                                </strong>

                                <span>
                                    Your safari will be confirmed
                                    after successful payment.
                                </span>

                            </div>

                        </div>


                        {/* =================================
                            BOOKING SUMMARY
                        ================================= */}

                        <div className="booking-modal-summary">

                            <div className="booking-modal-summary-header">

                                <div>

                                    <span>
                                        SAFARI
                                    </span>

                                    <strong>
                                        {departure?.tour_name}
                                    </strong>

                                </div>


                                <span className="booking-modal-id">
                                    #
                                    {
                                        booking.booking_id ||
                                        booking.id ||
                                        "Pending"
                                    }
                                </span>

                            </div>


                            <div className="booking-modal-row">

                                <span>
                                    Destination
                                </span>

                                <strong>
                                    {departure?.destination ||
                                        "Not provided"}
                                </strong>

                            </div>


                            <div className="booking-modal-row">

                                <span>
                                    Departure
                                </span>

                                <strong>
                                    {formatDate(
                                        departure?.start_date
                                    )}
                                </strong>

                            </div>


                            <div className="booking-modal-row">

                                <span>
                                    Return
                                </span>

                                <strong>
                                    {formatDate(
                                        departure?.end_date
                                    )}
                                </strong>

                            </div>


                            <div className="booking-modal-row">

                                <span>
                                    Travellers
                                </span>

                                <strong>
                                    {
                                        booking.number_of_people ||
                                        numberOfPeople
                                    }
                                </strong>

                            </div>


                            <div className="booking-modal-row">

                                <span>
                                    Price per person
                                </span>

                                <strong>
                                    {formatPrice(
                                        booking.price_per_person ??
                                        pricePerPerson
                                    )}
                                </strong>

                            </div>


                            <div className="booking-modal-total">

                                <span>
                                    Total Amount
                                </span>

                                <strong>
                                    {formatPrice(
                                        booking.total_price ??
                                        estimatedTotal
                                    )}
                                </strong>

                            </div>

                        </div>


                        {/* =================================================
                            PAYMENT OPTIONS
                        ================================================= */}

                        {paymentStep === "options" && (

                            <div className="payment-options-section">

                                <div className="payment-options-heading">

                                    <span>
                                        PAYMENT
                                    </span>

                                    <h3>
                                        Choose how you'd like to pay
                                    </h3>

                                    <p>
                                        You can pay securely through
                                        Pesapal or make a direct M-Pesa
                                        or Airtel Money payment.
                                    </p>

                                </div>


                                {paymentSettingsLoading && (

                                    <div className="payment-settings-loading">

                                        <div className="payment-mini-spinner"></div>

                                        <span>
                                            Loading payment options...
                                        </span>

                                    </div>
                                )}


                                {paymentSettingsError && (

                                    <div className="payment-settings-error">

                                        {paymentSettingsError}

                                    </div>
                                )}


                                <div className="payment-option-list">

                                    {/* =================================
                                        PESAPAL
                                    ================================= */}

                                    <button
                                        type="button"
                                        className="payment-option-card payment-option-pesapal"
                                        onClick={
                                            handlePesapalPayment
                                        }
                                        disabled={
                                            paymentLoading ||
                                            paymentSettingsLoading
                                        }
                                    >

                                        <div className="payment-option-icon">
                                            💳
                                        </div>

                                        <div className="payment-option-content">

                                            <strong>
                                                Pay with Pesapal
                                            </strong>

                                            <span>
                                                M-Pesa, Visa, Mastercard
                                                and other supported
                                                payment methods.
                                            </span>

                                        </div>

                                        <span className="payment-option-arrow">
                                            →
                                        </span>

                                    </button>


                                    {/* =================================
                                        DIRECT PAYMENT
                                    ================================= */}

                                    <button
                                        type="button"
                                        className="payment-option-card payment-option-direct"
                                        onClick={
                                            handleOpenDirectPayment
                                        }
                                        disabled={
                                            paymentSettingsLoading
                                        }
                                    >

                                        <div className="payment-option-icon">
                                            📱
                                        </div>

                                        <div className="payment-option-content">

                                            <strong>
                                                Direct Payment
                                            </strong>

                                            <span>
                                                Pay directly with
                                                M-Pesa or Airtel Money,
                                                then submit the payment
                                                for verification.
                                            </span>

                                        </div>

                                        <span className="payment-option-arrow">
                                            →
                                        </span>

                                    </button>

                                </div>

                            </div>
                        )}


                        {/* =================================================
                            DIRECT PAYMENT
                        ================================================= */}

                        {paymentStep === "direct" && (

                            <div className="direct-payment-section">

                                <button
                                    type="button"
                                    className="payment-back-button"
                                    onClick={() => {
                                        setPaymentStep("options")
                                        setError("")
                                    }}
                                    disabled={
                                        directPaymentSubmitting
                                    }
                                >
                                    ← Back to payment options
                                </button>


                                <div className="direct-payment-heading">

                                    <span>
                                        DIRECT PAYMENT
                                    </span>

                                    <h3>
                                        Pay directly
                                    </h3>

                                    <p>
                                        Choose M-Pesa or Airtel Money,
                                        make your payment using the
                                        instructions below, then submit
                                        the payment for verification.
                                    </p>

                                </div>


                                {/* =================================
                                    PAYMENT METHOD BUTTONS
                                ================================= */}

                                <div className="direct-methods">

                                    {paymentSettings?.mpesa?.enabled && (

                                        <button
                                            type="button"
                                            className={
                                                `direct-method-button ${
                                                    directPaymentMethod === "mpesa"
                                                        ? "active"
                                                        : ""
                                                }`
                                            }
                                            onClick={() =>
                                                setDirectPaymentMethod(
                                                    "mpesa"
                                                )
                                            }
                                            disabled={
                                                directPaymentSubmitting
                                            }
                                        >

                                            <span>
                                                📱
                                            </span>

                                            <strong>
                                                M-Pesa
                                            </strong>

                                        </button>
                                    )}


                                    {paymentSettings?.airtel_money?.enabled && (

                                        <button
                                            type="button"
                                            className={
                                                `direct-method-button ${
                                                    directPaymentMethod === "airtel_money"
                                                        ? "active"
                                                        : ""
                                                }`
                                            }
                                            onClick={() =>
                                                setDirectPaymentMethod(
                                                    "airtel_money"
                                                )
                                            }
                                            disabled={
                                                directPaymentSubmitting
                                            }
                                        >

                                            <span>
                                                📱
                                            </span>

                                            <strong>
                                                Airtel Money
                                            </strong>

                                        </button>
                                    )}

                                </div>


                                {!paymentSettingsLoading &&
                                    paymentSettings &&
                                    !paymentSettings?.mpesa?.enabled &&
                                    !paymentSettings?.airtel_money?.enabled && (

                                    <div className="payment-settings-error">
                                        Direct payment is currently
                                        unavailable. Please choose
                                        Pesapal instead.
                                    </div>
                                )}


                                {/* =================================
                                    M-PESA DETAILS
                                ================================= */}

                                {directPaymentMethod === "mpesa" && (

                                    <div className="direct-payment-details">

                                        <div className="direct-payment-details-header">

                                            <span>
                                                M-PESA PAYMENT DETAILS
                                            </span>

                                            <strong>
                                                Thafari Safaris
                                            </strong>

                                        </div>


                                        {paymentSettings?.mpesa?.mode === "paybill" &&
                                            paymentSettings?.mpesa?.paybill && (

                                            <div className="direct-detail-row">

                                                <span>
                                                    Paybill
                                                </span>

                                                <strong>
                                                    {
                                                        paymentSettings
                                                            ?.mpesa
                                                            ?.paybill
                                                    }
                                                </strong>

                                            </div>
                                        )}


                                        {paymentSettings?.mpesa?.mode === "till" &&
                                            paymentSettings?.mpesa?.till && (

                                            <div className="direct-detail-row">

                                                <span>
                                                    Till Number
                                                </span>

                                                <strong>
                                                    {
                                                        paymentSettings
                                                            ?.mpesa
                                                            ?.till
                                                    }
                                                </strong>

                                            </div>
                                        )}


                                        <div className="direct-detail-row">

                                            <span>
                                                Business
                                            </span>

                                            <strong>
                                                {
                                                    paymentSettings
                                                        ?.mpesa
                                                        ?.business_name ||
                                                    "Thafari Safaris"
                                                }
                                            </strong>

                                        </div>

                                    </div>
                                )}


                                {/* =================================
                                    AIRTEL DETAILS
                                ================================= */}

                                {directPaymentMethod === "airtel_money" && (

                                    <div className="direct-payment-details">

                                        <div className="direct-payment-details-header">

                                            <span>
                                                AIRTEL MONEY DETAILS
                                            </span>

                                            <strong>
                                                Thafari Safaris
                                            </strong>

                                        </div>


                                        <div className="direct-detail-row">

                                            <span>
                                                Number
                                            </span>

                                            <strong>
                                                {
                                                    paymentSettings
                                                        ?.airtel_money
                                                        ?.number
                                                }
                                            </strong>

                                        </div>


                                        <div className="direct-detail-row">

                                            <span>
                                                Business
                                            </span>

                                            <strong>
                                                {
                                                    paymentSettings
                                                        ?.airtel_money
                                                        ?.business_name ||
                                                    "Thafari Safaris"
                                                }
                                            </strong>

                                        </div>

                                    </div>
                                )}


                                {/* =================================
                                    BOOKING REFERENCE
                                ================================= */}

                                <div className="direct-booking-reference">

                                    <span>
                                        YOUR BOOKING REFERENCE
                                    </span>

                                    <strong>
                                        THAFARI-
                                        {
                                            booking.booking_id ||
                                            booking.id
                                        }
                                    </strong>

                                    <div className="direct-payment-verification-notice">
                                        <strong>
                                            PAYMENT VERIFICATION NOTICE
                                        </strong>

                                        <p>
                                            Once you make the payment,
                                            please be patient for a few
                                            minutes while your payment is
                                            being verified.
                                        </p>
                                    </div>

                                </div>


                                {/* =================================
                                    INSTRUCTIONS
                                ================================= */}

                                {paymentSettings?.instructions && (

                                    <div className="direct-payment-instructions">

                                        <strong>
                                            Payment instructions
                                        </strong>

                                        <p>
                                            {
                                                paymentSettings
                                                    .instructions
                                            }
                                        </p>

                                    </div>
                                )}


                                {/* =================================
                                    PAYMENT SUBMISSION
                                ================================= */}

                                <div className="direct-payment-complete-step">

                                    <div className="direct-payment-complete-message">

                                    </div>


                                    <button
                                        type="button"
                                        className="direct-payment-submit"
                                        onClick={
                                            handleSubmitDirectPayment
                                        }
                                        disabled={
                                            directPaymentSubmitting ||
                                            !directPaymentMethod
                                        }
                                    >

                                        {directPaymentSubmitting
                                            ? "Submitting for verification..."
                                            : "I've made the payment — Submit for verification"}

                                        {!directPaymentSubmitting && (
                                            <span>
                                                →
                                            </span>
                                        )}

                                    </button>

                                </div>

                            </div>
                        )}


                        {/* =================================================
                            DIRECT PAYMENT SUBMITTED
                        ================================================= */}

                        {paymentStep === "submitted" && (

                            <div className="direct-payment-success">

                                <div className="direct-payment-success-icon">
                                    ✓
                                </div>

                                <span className="direct-payment-success-label">
                                    PAYMENT SUBMITTED
                                </span>

                                <h3>
                                    Your payment is awaiting verification
                                </h3>

                                <p>
                                    We recorded your payment submission.
                                    Your booking will be confirmed after
                                    an authorized Thafari user verifies
                                    that the payment was received.
                                </p>


                                <div className="direct-submission-summary">

                                    <div>

                                        <span>
                                            Booking
                                        </span>

                                        <strong>
                                            #
                                            {
                                                booking.booking_id ||
                                                booking.id
                                            }
                                        </strong>

                                    </div>


                                    <div>

                                        <span>
                                            Amount
                                        </span>

                                        <strong>
                                            {formatPrice(
                                                submittedDirectPayment
                                                    ?.amount
                                            )}
                                        </strong>

                                    </div>


                                    <div>

                                        <span>
                                            Payment method
                                        </span>

                                        <strong>
                                            {
                                                submittedDirectPayment
                                                    ?.payment_method ===
                                                "airtel_money"
                                                    ? "Airtel Money"
                                                    : "M-Pesa"
                                            }
                                        </strong>

                                    </div>


                                    <div>

                                        <span>
                                            Status
                                        </span>

                                        <strong className="pending-status">
                                            Awaiting verification
                                        </strong>

                                    </div>

                                </div>


                                <button
                                    type="button"
                                    className="booking-modal-close-button"
                                    onClick={
                                        closeConfirmationAndExplore
                                    }
                                >
                                    Close
                                </button>

                            </div>
                        )}


                        {/* =================================
                            PAYMENT OPTIONS FOOTER
                        ================================= */}

                        {paymentStep === "options" && (

                            <>

                                <button
                                    type="button"
                                    className="booking-modal-close-button payment-review-button"
                                    onClick={
                                        closeConfirmation
                                    }
                                    disabled={
                                        paymentLoading
                                    }
                                >
                                    Review Booking
                                </button>

                                {/*<div className="booking-after-create-actions">

                                   {/* <button
                                        type="button"
                                        className="booking-modal-close-button payment-review-button"
                                        onClick={() => navigate("/dashboard")}
                                    >
                                        Go to Dashboard
                                    </button>

                                    <button
                                        type="button"
                                        className="booking-modal-close-button payment-review-button"
                                        onClick={() => navigate("/tours")}
                                    >
                                        Explore More Safaris
                                    </button>

                                </div> */}

                            </>
                        )}

                    </div>

                </div>
            )}

        </main>
    )
}


export default Booking