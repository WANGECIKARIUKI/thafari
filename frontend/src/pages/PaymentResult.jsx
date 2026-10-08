// =========================================================
// THAFARI PAYMENT RESULT PAGE
// =========================================================
//
// This page is shown after the customer returns from
// Pesapal.
//
// IMPORTANT:
//
// Returning from Pesapal does NOT automatically mean that
// the payment was successful.
//
// Pesapal sends an IPN to our Flask backend, and our backend
// updates the Payment record.
//
// This page therefore checks our own backend for the actual
// payment status.
//
// Possible states:
//
//     checking
//     processing
//     successful
//     failed
//     reversed
//     cancelled
//     error
//
// =========================================================

import {
    useEffect,
    useState,
} from "react"

import {
    Link,
    useSearchParams,
} from "react-router-dom"

import {
    useAuth,
} from "../context/AuthContext"

import {
    getBookingPayments,
} from "../services/paymentService"

import "./PaymentResult.css"


function PaymentResult() {

    // =====================================================
    // URL PARAMETERS
    // =====================================================

    const [searchParams] =
        useSearchParams()


    // The Flask Pesapal callback sends the booking ID
    // back to the React application.
    const bookingId =
        searchParams.get("booking_id")


    // =====================================================
    // AUTHENTICATION
    // =====================================================

    const {
        accessToken,
    } = useAuth()


    // =====================================================
    // STATE
    // =====================================================

    const [status, setStatus] =
        useState("checking")


    const [payment, setPayment] =
        useState(null)


    const [error, setError] =
        useState("")


    // =====================================================
    // CHECK PAYMENT STATUS
    // =====================================================
    //
    // The Pesapal callback and IPN do not necessarily reach
    // our backend at exactly the same time.
    //
    // Therefore, if the payment is still pending, we check
    // the backend again after a few seconds.
    //
    // =====================================================

    useEffect(() => {

        if (!accessToken) {

            setStatus("error")

            setError(
                "Your login session has expired. Please log in again."
            )

            return
        }


        if (!bookingId) {

            setStatus("error")

            setError(
                "We could not identify your booking."
            )

            return
        }


        let attempts = 0

        const maximumAttempts = 10

        let timeoutId = null

        let isMounted = true


        // =================================================
        // CHECK PAYMENT
        // =================================================

        const checkPayment = async () => {

            try {

                const data =
                    await getBookingPayments(
                        Number(bookingId),
                        accessToken
                    )


                // If the customer leaves the page while the
                // request is running, don't update React state.
                if (!isMounted) {
                    return
                }


                const payments =
                    Array.isArray(data?.payments)
                        ? data.payments
                        : []


                // -------------------------------------------------
                // Find the most recent payment.
                // -------------------------------------------------
                //
                // Our backend currently returns the latest
                // payment first.
                //
                // We still make a defensive copy and sort using
                // paid_at when available.
                //
                // -------------------------------------------------

                const sortedPayments =
                    [...payments].sort(
                        (a, b) => {

                            const dateA =
                                a?.paid_at
                                    ? new Date(a.paid_at).getTime()
                                    : 0

                            const dateB =
                                b?.paid_at
                                    ? new Date(b.paid_at).getTime()
                                    : 0

                            return dateB - dateA
                        }
                    )


                const latestPayment =
                    sortedPayments.length > 0
                        ? sortedPayments[0]
                        : null


                // -------------------------------------------------
                // No payment record yet.
                // -------------------------------------------------

                if (!latestPayment) {

                    attempts += 1


                    if (
                        attempts <
                        maximumAttempts
                    ) {

                        setStatus("processing")


                        timeoutId =
                            setTimeout(
                                checkPayment,
                                3000
                            )

                        return
                    }


                    setStatus("error")

                    setError(
                        "We could not find the payment record for this booking."
                    )

                    return
                }


                // Save the payment so the UI can display
                // transaction details.
                setPayment(
                    latestPayment
                )


                // -------------------------------------------------
                // SUCCESSFUL
                // -------------------------------------------------

                if (
                    latestPayment.status ===
                    "successful"
                ) {

                    setStatus("successful")

                    return
                }


                // -------------------------------------------------
                // FAILED
                // -------------------------------------------------

                if (
                    latestPayment.status ===
                    "failed"
                ) {

                    setStatus("failed")

                    return
                }


                // -------------------------------------------------
                // REVERSED
                // -------------------------------------------------

                if (
                    latestPayment.status ===
                    "reversed"
                ) {

                    setStatus("reversed")

                    return
                }


                // -------------------------------------------------
                // CANCELLED
                // -------------------------------------------------

                if (
                    latestPayment.status ===
                    "cancelled"
                ) {

                    setStatus("cancelled")

                    return
                }


                // -------------------------------------------------
                // STILL PROCESSING
                // -------------------------------------------------

                attempts += 1

                setStatus("processing")


                if (
                    attempts <
                    maximumAttempts
                ) {

                    timeoutId =
                        setTimeout(
                            checkPayment,
                            3000
                        )

                    return
                }


                // -------------------------------------------------
                // Still pending after polling.
                // -------------------------------------------------
                //
                // We deliberately DO NOT call this a failure.
                //
                // The payment may still be waiting for the
                // provider notification.
                //
                // -------------------------------------------------

                setStatus("processing")

            } catch (error) {

                console.error(
                    "Payment status check failed:",
                    error
                )


                if (!isMounted) {
                    return
                }


                attempts += 1


                if (
                    attempts <
                    maximumAttempts
                ) {

                    timeoutId =
                        setTimeout(
                            checkPayment,
                            3000
                        )

                    return
                }


                setStatus("error")

                setError(
                    error?.response?.data?.message ||
                    "We could not check your payment status."
                )
            }
        }


        // Start the first check immediately.
        checkPayment()


        // =================================================
        // CLEANUP
        // =================================================
        //
        // This is important.
        //
        // If the customer leaves the page while polling is
        // active, we cancel the scheduled timeout and prevent
        // future state updates.
        //
        // =================================================

        return () => {

            isMounted = false


            if (timeoutId) {

                clearTimeout(
                    timeoutId
                )

            }

        }

    }, [
        accessToken,
        bookingId,
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
        ).format(
            Number(price || 0)
        )
    }


    // =====================================================
    // FORMAT DATE
    // =====================================================

    const formatDate = (date) => {

        if (!date) {
            return "—"
        }


        const parsedDate =
            new Date(date)


        if (
            Number.isNaN(
                parsedDate.getTime()
            )
        ) {

            return "—"

        }


        return parsedDate.toLocaleString(
            "en-KE",
            {
                dateStyle: "medium",
                timeStyle: "short",
            }
        )
    }


    // =====================================================
    // FORMAT PAYMENT METHOD
    // =====================================================

    const formatPaymentMethod = (
        method
    ) => {

        if (!method) {
            return "Pesapal"
        }


        const methodNames = {

            mpesa: "M-Pesa",

            airtel_money:
                "Airtel Money",

            visa: "Visa",

            mastercard:
                "Mastercard",

            amex: "American Express",

            bank_transfer:
                "Bank Transfer",

        }


        return (
            methodNames[method] ||
            method
        )

    }


    // =====================================================
    // PAYMENT SUMMARY
    // =====================================================

    const renderPaymentSummary = () => {

        if (!payment) {
            return null
        }


        return (

            <div className="payment-result-summary">

                <div>

                    <span>
                        Booking ID
                    </span>

                    <strong>
                        #{bookingId}
                    </strong>

                </div>


                <div>

                    <span>
                        Amount paid
                    </span>

                    <strong>
                        {formatPrice(
                            payment.amount
                        )}
                    </strong>

                </div>


                <div>

                    <span>
                        Payment method
                    </span>

                    <strong>
                        {formatPaymentMethod(
                            payment.payment_method
                        )}
                    </strong>

                </div>


                {payment.paid_at && (

                    <div>

                        <span>
                            Payment date
                        </span>

                        <strong>
                            {formatDate(
                                payment.paid_at
                            )}
                        </strong>

                    </div>

                )}

            </div>

        )

    }


    // =====================================================
    // PROCESSING STATE
    // =====================================================

    if (
        status === "checking" ||
        status === "processing"
    ) {

        return (

            <main className="payment-result-page">

                <section className="payment-result-card">

                    <div className="payment-result-icon payment-result-icon-processing">
                        ⏳
                    </div>


                    <p className="payment-result-eyebrow">
                        PAYMENT PROCESSING
                    </p>


                    <h1>
                        We're confirming your payment
                    </h1>


                    <p className="payment-result-message">

                        Your payment has been submitted.
                        We're waiting for the payment provider
                        to confirm the transaction.

                    </p>


                    <div className="payment-result-loader">

                        <span></span>
                        <span></span>
                        <span></span>

                    </div>


                    <p className="payment-result-small">

                        Please don't make another payment.

                    </p>


                    {bookingId && (

                        <p className="payment-result-small">

                            Booking #{bookingId}

                        </p>

                    )}

                </section>

            </main>

        )
    }


    // =====================================================
    // SUCCESSFUL PAYMENT
    // =====================================================

    if (
        status === "successful"
    ) {

        return (

            <main className="payment-result-page">

                <section className="payment-result-card">

                    <div className="payment-result-icon payment-result-icon-success">
                        ✓
                    </div>


                    <p className="payment-result-eyebrow">
                        PAYMENT SUCCESSFUL
                    </p>


                    <h1>
                        Your safari is confirmed! 🎉
                    </h1>


                    <p className="payment-result-message">

                        Your payment has been successfully
                        received and your booking has been
                        confirmed.

                    </p>


                    {renderPaymentSummary()}


                    <div className="payment-result-actions">

                        <Link
                            to="/dashboard"
                            className="payment-result-primary-button"
                        >
                            Go to Dashboard
                        </Link>


                        <Link
                            to="/tours"
                            className="payment-result-secondary-button"
                        >
                            Explore More Safaris
                        </Link>

                    </div>

                </section>

            </main>

        )
    }


    // =====================================================
    // FAILED PAYMENT
    // =====================================================

    if (
        status === "failed"
    ) {

        return (

            <main className="payment-result-page">

                <section className="payment-result-card">

                    <div className="payment-result-icon payment-result-icon-failed">
                        !
                    </div>


                    <p className="payment-result-eyebrow">
                        PAYMENT FAILED
                    </p>


                    <h1>
                        Your payment was not completed
                    </h1>


                    <p className="payment-result-message">

                        The payment provider reported that
                        this payment failed.

                        Please check your payment details
                        and try again.

                    </p>


                    {renderPaymentSummary()}


                    <div className="payment-result-actions">

                        <Link
                            to="/dashboard"
                            className="payment-result-primary-button"
                        >
                            View My Booking
                        </Link>


                        <Link
                            to="/tours"
                            className="payment-result-secondary-button"
                        >
                            Back to Safaris
                        </Link>

                    </div>

                </section>

            </main>

        )
    }


    // =====================================================
    // REVERSED PAYMENT
    // =====================================================

    if (
        status === "reversed"
    ) {

        return (

            <main className="payment-result-page">

                <section className="payment-result-card">

                    <div className="payment-result-icon payment-result-icon-failed">
                        ↩
                    </div>


                    <p className="payment-result-eyebrow">
                        PAYMENT REVERSED
                    </p>


                    <h1>
                        Your payment was reversed
                    </h1>


                    <p className="payment-result-message">

                        The payment provider reversed this
                        transaction. Your booking has not been
                        confirmed by this payment.

                    </p>


                    {renderPaymentSummary()}


                    <div className="payment-result-actions">

                        <Link
                            to="/dashboard"
                            className="payment-result-primary-button"
                        >
                            View My Booking
                        </Link>


                        <Link
                            to="/tours"
                            className="payment-result-secondary-button"
                        >
                            Back to Safaris
                        </Link>

                    </div>

                </section>

            </main>

        )
    }


    // =====================================================
    // CANCELLED PAYMENT
    // =====================================================

    if (
        status === "cancelled"
    ) {

        return (

            <main className="payment-result-page">

                <section className="payment-result-card">

                    <div className="payment-result-icon payment-result-icon-failed">
                        ×
                    </div>


                    <p className="payment-result-eyebrow">
                        PAYMENT CANCELLED
                    </p>


                    <h1>
                        Payment was cancelled
                    </h1>


                    <p className="payment-result-message">

                        The payment was cancelled before it
                        could be completed.

                        Your booking has not been confirmed
                        by this payment.

                    </p>


                    {renderPaymentSummary()}


                    <div className="payment-result-actions">

                        <Link
                            to="/dashboard"
                            className="payment-result-primary-button"
                        >
                            View My Booking
                        </Link>


                        <Link
                            to="/tours"
                            className="payment-result-secondary-button"
                        >
                            Back to Safaris
                        </Link>

                    </div>

                </section>

            </main>

        )
    }


    // =====================================================
    // ERROR STATE
    // =====================================================

    return (

        <main className="payment-result-page">

            <section className="payment-result-card">

                <div className="payment-result-icon payment-result-icon-failed">
                    !
                </div>


                <p className="payment-result-eyebrow">
                    PAYMENT STATUS
                </p>


                <h1>
                    We couldn't confirm your payment yet
                </h1>


                <p className="payment-result-message">

                    {error}

                </p>


                <p className="payment-result-small">

                    Your payment may still be processing.
                    Please check your dashboard before trying
                    to make another payment.

                </p>


                {bookingId && (

                    <p className="payment-result-small">

                        Booking #{bookingId}

                    </p>

                )}


                <div className="payment-result-actions">

                    <Link
                        to="/dashboard"
                        className="payment-result-primary-button"
                    >
                        Go to Dashboard
                    </Link>


                    <Link
                        to="/tours"
                        className="payment-result-secondary-button"
                    >
                        Back to Safaris
                    </Link>

                </div>

            </section>

        </main>

    )

}


export default PaymentResult