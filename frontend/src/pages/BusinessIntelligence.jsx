// =========================================================
// THAFARI BUSINESS INTELLIGENCE
// =========================================================
//
// This page is the admin Business Intelligence dashboard.
//
// The page connects to the real BI backend endpoints
// through businessIntelligenceService.js.
//
// The dashboard is driven by Revenue Targets.
// Once an admin selects a target period, the page loads the
// analytics belonging to that period.
//
// =========================================================

import {
    useEffect,
    useMemo,
    useState,
} from "react"


import {
    useAuth,
} from "../context/AuthContext"


import {
    getRevenueTargets,
    getTotalRevenue,
    getPopularTour,
    getTotalCustomers,
    getConfirmedBookings,
    getCompletedBookings,
    getCancelledBookings,
    getExpiredBookings,
    getCompletionRate,
    getCancellationRate,
    getAverageBookingSize,
    getAverageRevenue,
    getTopRevenueTour,
    getRevenuePerCustomer,
    getCustomerRetention,
    getOccupancyRate,
    getBookingGrowth,
    getCustomerGrowth,
    getAverageTripDuration,
    getRevenueByTour,
} from "../services/businessIntelligenceService"


import "./BusinessIntelligence.css"


// =========================================================
// FORMATTING HELPERS
// =========================================================

const formatCurrency = (value) => {

    const number = Number(value)

    if (!Number.isFinite(number)) {
        return "—"
    }

    return `KES ${number.toLocaleString(
        "en-KE",
        {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }
    )}`

}


const formatNumber = (value) => {

    const number = Number(value)

    if (!Number.isFinite(number)) {
        return "—"
    }

    return number.toLocaleString(
        "en-KE"
    )

}


const formatPercentage = (value) => {

    const number = Number(value)

    if (!Number.isFinite(number)) {
        return "—"
    }

    return `${number.toFixed(2)}%`

}


const formatDate = (value) => {

    if (!value) {
        return "—"
    }

    const date = new Date(
        `${value}T00:00:00`
    )

    if (Number.isNaN(date.getTime())) {
        return value
    }

    return date.toLocaleDateString(
        "en-KE",
        {
            day: "numeric",
            month: "short",
            year: "numeric",
        }
    )

}


// =========================================================
// SAFE API VALUE HELPER
// =========================================================

const getResponseValue = (
    response,
    key
) => {

    if (!response) {
        return null
    }

    return response[key] ?? null

}


// =========================================================
// BUSINESS INTELLIGENCE COMPONENT
// =========================================================

function BusinessIntelligence() {

    // =====================================================
    // AUTHENTICATION
    // =====================================================

    const {
        accessToken,
        isAuthenticated,
        authLoading,
    } = useAuth()


    // =====================================================
    // REVENUE TARGETS
    // =====================================================

    const [
        revenueTargets,
        setRevenueTargets,
    ] = useState([])


    const [
        selectedTarget,
        setSelectedTarget,
    ] = useState("")


    const [
        isPeriodCalendarOpen,
        setIsPeriodCalendarOpen,
    ] = useState(false)


    // =====================================================
    // PAGE STATE
    // =====================================================

    const [
        loadingTargets,
        setLoadingTargets,
    ] = useState(true)


    const [
        loadingAnalytics,
        setLoadingAnalytics,
    ] = useState(false)


    const [
        error,
        setError,
    ] = useState("")


    // =====================================================
    // ANALYTICS STATE
    // =====================================================

    const [
        analytics,
        setAnalytics,
    ] = useState(null)


    // =====================================================
    // CLOSE PERIOD CALENDAR WHEN CLICKING OUTSIDE
    // =====================================================

    useEffect(() => {

        const handleOutsideClick = (event) => {

            if (
                !event.target.closest(
                    ".bi-calendar-selector"
                )
            ) {

                setIsPeriodCalendarOpen(false)

            }

        }

        document.addEventListener(
            "mousedown",
            handleOutsideClick
        )

        return () => {

            document.removeEventListener(
                "mousedown",
                handleOutsideClick
            )

        }

    }, [])


    // =====================================================
    // LOAD REVENUE TARGETS
    // =====================================================

    useEffect(() => {

        if (
            authLoading ||
            !isAuthenticated ||
            !accessToken
        ) {

            setLoadingTargets(false)

            return
        }


        let cancelled = false


        const loadTargets = async () => {

            try {

                setLoadingTargets(true)

                setError("")


                const response =
                    await getRevenueTargets(
                        accessToken
                    )


                if (cancelled) {
                    return
                }


                const targets =
                    Array.isArray(
                        response?.revenue_targets
                    )
                        ? response.revenue_targets
                        : []


                setRevenueTargets(
                    targets
                )


                // -------------------------------------------------
                // Automatically select the most recent target.
                // -------------------------------------------------

                if (targets.length > 0) {

                    const sortedTargets =
                        [...targets].sort(
                            (first, second) =>
                                new Date(
                                    second.end_date
                                ) -
                                new Date(
                                    first.end_date
                                )
                        )


                    setSelectedTarget(
                        String(
                            sortedTargets[0].id
                        )
                    )

                } else {

                    setSelectedTarget("")

                }

            } catch (requestError) {

                if (cancelled) {
                    return
                }


                console.error(
                    "Failed to load BI revenue targets:",
                    requestError
                )


                setError(
                    requestError?.response?.data?.message ||
                    requestError?.response?.data?.error ||
                    "We could not load the Business Intelligence periods."
                )

            } finally {

                if (!cancelled) {

                    setLoadingTargets(
                        false
                    )

                }
            }
        }


        loadTargets()


        return () => {

            cancelled = true

        }

    }, [
        authLoading,
        isAuthenticated,
        accessToken,
    ])


    // =====================================================
    // LOAD ANALYTICS FOR SELECTED TARGET
    // =====================================================

    useEffect(() => {

        if (
            authLoading ||
            !isAuthenticated ||
            !accessToken ||
            !selectedTarget
        ) {

            setAnalytics(null)

            setLoadingAnalytics(false)

            return
        }


        let cancelled = false


        const targetId =
            Number(
                selectedTarget
            )


        const loadAnalytics = async () => {

            try {

                setLoadingAnalytics(true)

                setError("")


                // -------------------------------------------------
                // Load all BI metrics independently.
                //
                // Promise.allSettled is intentional.
                //
                // One unavailable metric should not prevent the
                // rest of the dashboard from loading.
                // -------------------------------------------------

                const results =
                    await Promise.allSettled([

                        getTotalRevenue(
                            targetId,
                            accessToken
                        ),

                        getPopularTour(
                            targetId,
                            accessToken
                        ),

                        getTotalCustomers(
                            targetId,
                            accessToken
                        ),

                        getConfirmedBookings(
                            targetId,
                            accessToken
                        ),

                        getCompletedBookings(
                            targetId,
                            accessToken
                        ),

                        getCancelledBookings(
                            targetId,
                            accessToken
                        ),

                        getExpiredBookings(
                            targetId,
                            accessToken
                        ),

                        getCompletionRate(
                            targetId,
                            accessToken
                        ),

                        getCancellationRate(
                            targetId,
                            accessToken
                        ),

                        getAverageBookingSize(
                            targetId,
                            accessToken
                        ),

                        getAverageRevenue(
                            targetId,
                            accessToken
                        ),

                        getTopRevenueTour(
                            targetId,
                            accessToken
                        ),

                        getRevenuePerCustomer(
                            targetId,
                            accessToken
                        ),

                        getCustomerRetention(
                            targetId,
                            accessToken
                        ),

                        getOccupancyRate(
                            targetId,
                            accessToken
                        ),

                        getBookingGrowth(
                            targetId,
                            accessToken
                        ),

                        getCustomerGrowth(
                            targetId,
                            accessToken
                        ),

                        getAverageTripDuration(
                            targetId,
                            accessToken
                        ),

                        getRevenueByTour(
                            targetId,
                            accessToken
                        ),

                    ])


                if (cancelled) {
                    return
                }


                const [
                    totalRevenueResult,
                    popularTourResult,
                    totalCustomersResult,
                    confirmedBookingsResult,
                    completedBookingsResult,
                    cancelledBookingsResult,
                    expiredBookingsResult,
                    completionRateResult,
                    cancellationRateResult,
                    averageBookingSizeResult,
                    averageRevenueResult,
                    topRevenueTourResult,
                    revenuePerCustomerResult,
                    customerRetentionResult,
                    occupancyRateResult,
                    bookingGrowthResult,
                    customerGrowthResult,
                    averageTripResult,
                    revenueByTourResult,
                ] = results


                // -------------------------------------------------
                // Only show an error if every request failed.
                // -------------------------------------------------

                const rejectedRequests =
                    results.filter(
                        (result) =>
                            result.status === "rejected"
                    )


                if (
                    rejectedRequests.length ===
                    results.length
                ) {

                    const firstError =
                        rejectedRequests[0]?.reason


                    throw firstError

                }


                setAnalytics({

                    totalRevenue:
                        totalRevenueResult.status === "fulfilled"
                            ? totalRevenueResult.value
                            : null,

                    popularTour:
                        popularTourResult.status === "fulfilled"
                            ? popularTourResult.value
                            : null,

                    totalCustomers:
                        totalCustomersResult.status === "fulfilled"
                            ? totalCustomersResult.value
                            : null,

                    confirmedBookings:
                        confirmedBookingsResult.status === "fulfilled"
                            ? confirmedBookingsResult.value
                            : null,

                    completedBookings:
                        completedBookingsResult.status === "fulfilled"
                            ? completedBookingsResult.value
                            : null,

                    cancelledBookings:
                        cancelledBookingsResult.status === "fulfilled"
                            ? cancelledBookingsResult.value
                            : null,

                    expiredBookings:
                        expiredBookingsResult.status === "fulfilled"
                            ? expiredBookingsResult.value
                            : null,

                    completionRate:
                        completionRateResult.status === "fulfilled"
                            ? completionRateResult.value
                            : null,

                    cancellationRate:
                        cancellationRateResult.status === "fulfilled"
                            ? cancellationRateResult.value
                            : null,

                    averageBookingSize:
                        averageBookingSizeResult.status === "fulfilled"
                            ? averageBookingSizeResult.value
                            : null,

                    averageRevenue:
                        averageRevenueResult.status === "fulfilled"
                            ? averageRevenueResult.value
                            : null,

                    topRevenueTour:
                        topRevenueTourResult.status === "fulfilled"
                            ? topRevenueTourResult.value
                            : null,

                    revenuePerCustomer:
                        revenuePerCustomerResult.status === "fulfilled"
                            ? revenuePerCustomerResult.value
                            : null,

                    customerRetention:
                        customerRetentionResult.status === "fulfilled"
                            ? customerRetentionResult.value
                            : null,

                    occupancyRate:
                        occupancyRateResult.status === "fulfilled"
                            ? occupancyRateResult.value
                            : null,

                    bookingGrowth:
                        bookingGrowthResult.status === "fulfilled"
                            ? bookingGrowthResult.value
                            : null,

                    customerGrowth:
                        customerGrowthResult.status === "fulfilled"
                            ? customerGrowthResult.value
                            : null,

                    averageTrip:
                        averageTripResult.status === "fulfilled"
                            ? averageTripResult.value
                            : null,

                    revenueByTour:
                        revenueByTourResult.status === "fulfilled"
                            ? revenueByTourResult.value
                            : null,

                })


            } catch (requestError) {

                if (cancelled) {
                    return
                }


                console.error(
                    "Failed to load BI analytics:",
                    requestError
                )


                setAnalytics(null)


                setError(
                    requestError?.response?.data?.message ||
                    requestError?.response?.data?.error ||
                    "We could not load the Business Intelligence data."
                )

            } finally {

                if (!cancelled) {

                    setLoadingAnalytics(
                        false
                    )

                }
            }
        }


        loadAnalytics()


        return () => {

            cancelled = true

        }

    }, [
        authLoading,
        isAuthenticated,
        accessToken,
        selectedTarget,
    ])


    // =====================================================
    // SELECTED REVENUE TARGET
    // =====================================================

    const selectedTargetData =
        useMemo(() => {

            return revenueTargets.find(
                (target) =>
                    String(target.id) ===
                    String(selectedTarget)
            ) || null

        }, [
            revenueTargets,
            selectedTarget,
        ])


    // =====================================================
    // REVENUE TARGET ACHIEVEMENT
    // =====================================================

    const targetAchievement =
        analytics?.totalRevenue?.achievement_percentage


    // =====================================================
    // REVENUE BY TOUR
    // =====================================================

    const revenuePerTour =
        Array.isArray(
            analytics?.revenueByTour?.revenue_per_tour
        )
            ? analytics.revenueByTour.revenue_per_tour
            : []


    const maxTourRevenue =
        revenuePerTour.length > 0
            ? Math.max(
                ...revenuePerTour.map(
                    (tour) =>
                        Number(
                            tour.actual_revenue
                        ) || 0
                )
            )
            : 0


    // =====================================================
    // BOOKING STATUS VISUALS
    // =====================================================

    const bookingStatusItems = [
        {
            key: "confirmed",
            label: "Confirmed",
            value: Number(
                getResponseValue(
                    analytics?.confirmedBookings,
                    "confirmed_bookings"
                )
            ) || 0,
        },
        {
            key: "completed",
            label: "Completed",
            value: Number(
                getResponseValue(
                    analytics?.completedBookings,
                    "completed_bookings"
                )
            ) || 0,
        },
        {
            key: "cancelled",
            label: "Cancelled",
            value: Number(
                getResponseValue(
                    analytics?.cancelledBookings,
                    "cancelled_bookings"
                )
            ) || 0,
        },
        {
            key: "expired",
            label: "Expired",
            value: Number(
                getResponseValue(
                    analytics?.expiredBookings,
                    "expired_bookings"
                )
            ) || 0,
        },
    ]

    const totalBookingStatuses =
        bookingStatusItems.reduce(
            (total, item) => total + item.value,
            0
        )


    // =====================================================
    // AUTH LOADING
    // =====================================================

    if (authLoading) {

        return (

            <main className="business-intelligence-page">

                <section className="bi-page-header">

                    <div className="bi-header-content">

                        <span className="bi-eyebrow">
                            THAFARI ANALYTICS
                        </span>

                        <h1>
                            Business Intelligence
                        </h1>

                        <p>
                            Preparing your business analytics...
                        </p>

                    </div>

                </section>

            </main>

        )
    }


    // =====================================================
    // MAIN PAGE
    // =====================================================

    return (

        <main className="business-intelligence-page">

            {/* =================================================
                PAGE HEADER
            ================================================= */}

            <section className="bi-page-header">

                <div className="bi-header-content">

                    <span className="bi-eyebrow">
                        THAFARI ANALYTICS
                    </span>

                    <h1>
                        Business Intelligence
                    </h1>

                    <p>
                        Understand your business performance,
                        customer activity, revenue, and tour
                        performance from one place.
                    </p>

                </div>


                {/* =============================================
                    ANALYTICS PERIOD SELECTOR
                ============================================= */}

                <div className="bi-period-selector">

                    <label htmlFor="bi-target">
                        Analytics Period
                    </label>

                    <div className="bi-calendar-selector">

                        <button
                            type="button"
                            className="bi-calendar-trigger"
                            aria-haspopup="listbox"
                            aria-expanded={isPeriodCalendarOpen}
                            disabled={
                                loadingTargets ||
                                revenueTargets.length === 0
                            }
                            onClick={() =>
                                setIsPeriodCalendarOpen(
                                    (current) => !current
                                )
                            }
                        >

                            <span className="bi-calendar-trigger-icon">📅</span>

                            <span className="bi-calendar-trigger-copy">

                                <strong>
                                    {selectedTarget
                                        ? (() => {
                                            const target = revenueTargets.find(
                                                (item) =>
                                                    String(item.id) ===
                                                    String(selectedTarget)
                                            )

                                            return target
                                                ? `${formatDate(target.start_date)} — ${formatDate(target.end_date)}`
                                                : "Select analytics period"
                                        })()
                                        : loadingTargets
                                            ? "Loading periods..."
                                            : "Select analytics period"
                                    }
                                </strong>

                                <small>
                                    Revenue target period
                                </small>

                            </span>

                            <span
                                className={`bi-calendar-chevron ${
                                    isPeriodCalendarOpen
                                        ? "is-open"
                                        : ""
                                }`}
                            >
                                ▾
                            </span>

                        </button>


                        {isPeriodCalendarOpen &&
                            revenueTargets.length > 0 && (

                            <div
                                className="bi-calendar-dropdown"
                                role="listbox"
                                aria-label="Analytics periods"
                            >

                                <div className="bi-calendar-dropdown-header">

                                    <span>
                                        ANALYTICS PERIOD
                                    </span>

                                    <strong>
                                        Choose a reporting period
                                    </strong>

                                </div>


                                <div className="bi-calendar-period-list">

                                    {revenueTargets.map((target) => {

                                        const isSelected =
                                            String(target.id) ===
                                            String(selectedTarget)

                                        return (

                                            <button
                                                type="button"
                                                role="option"
                                                aria-selected={isSelected}
                                                key={target.id}
                                                className={`bi-calendar-period-option ${
                                                    isSelected
                                                        ? "is-selected"
                                                        : ""
                                                }`}
                                                onClick={() => {
                                                    setSelectedTarget(
                                                        String(target.id)
                                                    )
                                                    setIsPeriodCalendarOpen(
                                                        false
                                                    )
                                                }}
                                            >

                                                <span className="bi-calendar-option-icon">📅</span>

                                                <span className="bi-calendar-option-copy">
                                                    <strong>
                                                        {formatDate(target.start_date)}
                                                        {" — "}
                                                        {formatDate(target.end_date)}
                                                    </strong>

                                                    <small>
                                                        Target: {formatCurrency(target.target_amount)}
                                                    </small>
                                                </span>

                                                {isSelected && (
                                                    <span className="bi-calendar-option-check">
                                                        ✓
                                                    </span>
                                                )}

                                            </button>

                                        )

                                    })}

                                </div>

                            </div>

                        )}

                    </div>

                </div>

            </section>


            {/* =================================================
                ERROR MESSAGE
            ================================================= */}

            {error && (

                <div className="bi-alert">

                    <strong>
                        Business Intelligence notice
                    </strong>

                    <span>
                        {error}
                    </span>

                </div>

            )}


            {/* =================================================
                SELECTED PERIOD SUMMARY
            ================================================= */}

            {selectedTargetData && (

                <section className="bi-period-summary">

                    <div>

                        <span>
                            SELECTED PERIOD
                        </span>

                        <strong>
                            {formatDate(
                                selectedTargetData.start_date
                            )}
                            {" — "}
                            {formatDate(
                                selectedTargetData.end_date
                            )}
                        </strong>

                    </div>


                    <div>

                        <span>
                            REVENUE TARGET
                        </span>

                        <strong>
                            {formatCurrency(
                                selectedTargetData.target_amount
                            )}
                        </strong>

                    </div>

                </section>

            )}


            {/* =================================================
                LOADING ANALYTICS
            ================================================= */}

            {loadingAnalytics && (

                <div className="bi-loading">

                    <div className="bi-loading-spinner"></div>

                    <span>
                        Loading business analytics...
                    </span>

                </div>

            )}


            {/* =================================================
                KPI CARDS
            ================================================= */}

            <section className="bi-kpi-grid">

                <article className="bi-kpi-card">

                    <div className="bi-kpi-icon">
                        💰
                    </div>

                    <div className="bi-kpi-content">

                        <span>
                            Total Revenue
                        </span>

                        <strong>
                            {formatCurrency(
                                getResponseValue(
                                    analytics?.totalRevenue,
                                    "actual_revenue"
                                )
                            )}
                        </strong>

                        <small>
                            After successful refunds
                        </small>

                    </div>

                </article>


                <article className="bi-kpi-card">

                    <div className="bi-kpi-icon">
                        👥
                    </div>

                    <div className="bi-kpi-content">

                        <span>
                            Total Customers
                        </span>

                        <strong>
                            {formatNumber(
                                getResponseValue(
                                    analytics?.totalCustomers,
                                    "total_customers"
                                )
                            )}
                        </strong>

                        <small>
                            Based on people booked
                        </small>

                    </div>

                </article>


                <article className="bi-kpi-card">

                    <div className="bi-kpi-icon">
                        🧾
                    </div>

                    <div className="bi-kpi-content">

                        <span>
                            Confirmed Bookings
                        </span>

                        <strong>
                            {formatNumber(
                                getResponseValue(
                                    analytics?.confirmedBookings,
                                    "confirmed_bookings"
                                )
                            )}
                        </strong>

                        <small>
                            Current analytics period
                        </small>

                    </div>

                </article>


                <article className="bi-kpi-card">

                    <div className="bi-kpi-icon">
                        🎯
                    </div>

                    <div className="bi-kpi-content">

                        <span>
                            Target Achievement
                        </span>

                        <strong>
                            {formatPercentage(
                                targetAchievement
                            )}
                        </strong>

                        <small>
                            Revenue target progress
                        </small>

                    </div>

                </article>

            </section>


            {/* =================================================
                PERFORMANCE OVERVIEW
            ================================================= */}

            <section className="bi-section">

                <div className="bi-section-header">

                    <div>

                        <span className="bi-section-eyebrow">
                            PERFORMANCE
                        </span>

                        <h2>
                            Business Overview
                        </h2>

                        <p>
                            Track the key indicators that describe
                            how Thafari is performing.
                        </p>

                    </div>

                </div>


                <div className="bi-overview-grid">

                    <article className="bi-metric-card">

                        <div className="bi-metric-card-header">

                            <span>
                                Booking Completion
                            </span>

                            <span className="bi-metric-icon">
                                ✓
                            </span>

                        </div>

                        <strong>
                            {formatPercentage(
                                getResponseValue(
                                    analytics?.completionRate,
                                    "completion_rate"
                                )
                            )}
                        </strong>

                        <p>
                            Percentage of bookings completed
                            successfully.
                        </p>

                    </article>


                    <article className="bi-metric-card">

                        <div className="bi-metric-card-header">

                            <span>
                                Cancellation Rate
                            </span>

                            <span className="bi-metric-icon">
                                ↩
                            </span>

                        </div>

                        <strong>
                            {formatPercentage(
                                getResponseValue(
                                    analytics?.cancellationRate,
                                    "cancellation_rate"
                                )
                            )}
                        </strong>

                        <p>
                            Percentage of bookings that were
                            cancelled.
                        </p>

                    </article>


                    <article className="bi-metric-card">

                        <div className="bi-metric-card-header">

                            <span>
                                Occupancy Rate
                            </span>

                            <span className="bi-metric-icon">
                                🚌
                            </span>

                        </div>

                        <strong>
                            {formatPercentage(
                                getResponseValue(
                                    analytics?.occupancyRate,
                                    "occupancy_rate"
                                )
                            )}
                        </strong>

                        <p>
                            Customers compared with available
                            departure capacity.
                        </p>

                    </article>


                    <article className="bi-metric-card">

                        <div className="bi-metric-card-header">

                            <span>
                                Average Booking Size
                            </span>

                            <span className="bi-metric-icon">
                                👤
                            </span>

                        </div>

                        <strong>
                            {formatNumber(
                                getResponseValue(
                                    analytics?.averageBookingSize,
                                    "average_booking_size"
                                )
                            )}
                        </strong>

                        <p>
                            Average number of people per booking.
                        </p>

                    </article>

                </div>

            </section>


            {/* =================================================
                REVENUE & TOUR PERFORMANCE
            ================================================= */}

            <section className="bi-chart-grid">

                <article className="bi-chart-card bi-chart-card-large">

                    <div className="bi-chart-header">

                        <div>

                            <span className="bi-section-eyebrow">
                                REVENUE
                            </span>

                            <h2>
                                Revenue by Tour
                            </h2>

                            <p>
                                Compare the revenue generated by
                                each tour.
                            </p>

                        </div>

                    </div>


                    {revenuePerTour.length === 0 ? (

                        <div className="bi-chart-placeholder">

                            <span>
                                📊
                            </span>

                            <p>
                                No tour revenue data is available
                                for this period.
                            </p>

                        </div>

                    ) : (

                        <div className="bi-revenue-bars">

                            {revenuePerTour.map(
                                (tour) => {

                                    const revenue =
                                        Number(
                                            tour.actual_revenue
                                        ) || 0


                                    const width =
                                        maxTourRevenue > 0
                                            ? (
                                                revenue /
                                                maxTourRevenue
                                            ) * 100
                                            : 0


                                    return (

                                        <div
                                            className="bi-revenue-row"
                                            key={tour.tour_id}
                                        >

                                            <div className="bi-revenue-row-label">

                                                <span>
                                                    {tour.tour_name}
                                                </span>

                                                <strong>
                                                    {formatCurrency(
                                                        revenue
                                                    )}
                                                </strong>

                                            </div>


                                            <div className="bi-revenue-track">

                                                <div
                                                    className="bi-revenue-fill"
                                                    style={{
                                                        width:
                                                            `${width}%`,
                                                    }}
                                                />

                                            </div>

                                        </div>

                                    )

                                }
                            )}

                        </div>

                    )}

                </article>


                <article className="bi-chart-card">

                    <div className="bi-chart-header">

                        <div>

                            <span className="bi-section-eyebrow">
                                POPULARITY
                            </span>

                            <h2>
                                Popular Tour
                            </h2>

                            <p>
                                The tour attracting the most
                                customers.
                            </p>

                        </div>

                    </div>


                    {analytics?.popularTour?.tour_name ? (

                        <div className="bi-featured-placeholder">

                            <div className="bi-featured-icon">
                                🦁
                            </div>

                            <span className="bi-featured-label">
                                MOST POPULAR
                            </span>

                            <strong>
                                {analytics.popularTour.tour_name}
                            </strong>

                            <p>
                                {analytics.popularTour.destination}
                            </p>

                            <div className="bi-featured-stat">
                                <strong>
                                    {formatNumber(
                                        analytics.popularTour.total_customers
                                    )}
                                </strong>

                                <span>
                                    customers
                                </span>
                            </div>

                        </div>

                    ) : (

                        <div className="bi-featured-placeholder">

                            <div className="bi-featured-icon">
                                🦁
                            </div>

                            <span className="bi-featured-label">
                                MOST POPULAR
                            </span>

                            <strong>
                                No popular tour data
                            </strong>

                            <p>
                                There are no qualifying bookings
                                for this period.
                            </p>

                        </div>

                    )}

                </article>

            </section>


            {/* =================================================
                BOOKING & CUSTOMER ANALYTICS
            ================================================= */}

            <section className="bi-chart-grid">

                <article className="bi-chart-card">

                    <div className="bi-chart-header">

                        <div>

                            <span className="bi-section-eyebrow">
                                BOOKINGS
                            </span>

                            <h2>
                                Booking Performance
                            </h2>

                            <p>
                                See how bookings are progressing
                                across their different statuses.
                            </p>

                        </div>

                    </div>


                    <div className="bi-booking-status-list">

                        {bookingStatusItems.map((item) => {

                            const percentage =
                                totalBookingStatuses > 0
                                    ? (item.value / totalBookingStatuses) * 100
                                    : 0

                            return (
                                <div
                                    className={`bi-booking-status-item bi-booking-status-${item.key}`}
                                    key={item.key}
                                >

                                    <div className="bi-booking-status-topline">

                                        <span>
                                            {item.label}
                                        </span>

                                        <strong>
                                            {formatNumber(item.value)}
                                        </strong>

                                    </div>

                                    <div
                                        className="bi-booking-status-track"
                                        aria-hidden="true"
                                    >

                                        <div
                                            className="bi-booking-status-fill"
                                            style={{
                                                width: `${percentage}%`,
                                            }}
                                        />

                                    </div>

                                    <small>
                                        {totalBookingStatuses > 0
                                            ? `${percentage.toFixed(1)}% of bookings`
                                            : "No bookings in this period"}
                                    </small>

                                </div>
                            )
                        })}

                    </div>

                </article>


                <article className="bi-chart-card">

                    <div className="bi-chart-header">

                        <div>

                            <span className="bi-section-eyebrow">
                                CUSTOMERS
                            </span>

                            <h2>
                                Customer Insights
                            </h2>

                            <p>
                                Understand customer growth,
                                retention, and revenue.
                            </p>

                        </div>

                    </div>


                    <div className="bi-customer-metrics">

                        <div className="bi-customer-metric-item">

                            <div className="bi-customer-metric-icon">
                                👥
                            </div>

                            <div className="bi-customer-metric-copy">

                                <span>
                                    Repeat Customers
                                </span>

                                <small>
                                    Customers who booked more than once
                                </small>

                            </div>

                            <strong>
                                {formatNumber(
                                    getResponseValue(
                                        analytics?.customerRetention,
                                        "repeat_customers"
                                    )
                                )}
                            </strong>

                        </div>


                        <div className="bi-customer-metric-item">

                            <div className="bi-customer-metric-icon">
                                📈
                            </div>

                            <div className="bi-customer-metric-copy">

                                <span>
                                    Customer Growth
                                </span>

                                <small>
                                    Compared with the previous period
                                </small>

                            </div>

                            <strong>
                                {formatPercentage(
                                    getResponseValue(
                                        analytics?.customerGrowth,
                                        "customer_growth_rate"
                                    )
                                )}
                            </strong>

                        </div>


                        <div className="bi-customer-metric-item">

                            <div className="bi-customer-metric-icon">
                                💰
                            </div>

                            <div className="bi-customer-metric-copy">

                                <span>
                                    Revenue per Customer
                                </span>

                                <small>
                                    Revenue generated per customer
                                </small>

                            </div>

                            <strong>
                                {formatCurrency(
                                    getResponseValue(
                                        analytics?.revenuePerCustomer,
                                        "revenue_per_customer"
                                    )
                                )}
                            </strong>

                        </div>

                    </div>

                </article>

            </section>


            {/* =================================================
                ADDITIONAL INSIGHTS
            ================================================= */}

            <section className="bi-section">

                <div className="bi-section-header">

                    <div>

                        <span className="bi-section-eyebrow">
                            INSIGHTS
                        </span>

                        <h2>
                            Additional Business Metrics
                        </h2>

                        <p>
                            Supporting indicators for understanding
                            operational performance.
                        </p>

                    </div>

                </div>


                <div className="bi-insights-grid">

                    <article className="bi-insight-card">

                        <span>
                            Booking Growth
                        </span>

                        <strong>
                            {formatPercentage(
                                getResponseValue(
                                    analytics?.bookingGrowth,
                                    "booking_growth_rate"
                                )
                            )}
                        </strong>

                        <small>
                            Compared with the previous period
                        </small>

                    </article>


                    <article className="bi-insight-card">

                        <span>
                            Average Revenue per Booking
                        </span>

                        <strong>
                            {formatCurrency(
                                getResponseValue(
                                    analytics?.averageRevenue,
                                    "average_revenue_per_booking"
                                )
                            )}
                        </strong>

                        <small>
                            Based on successful payments
                        </small>

                    </article>


                    <article className="bi-insight-card">

                        <span>
                            Average Trip Duration
                        </span>

                        <strong>
                            {getResponseValue(
                                analytics?.averageTrip,
                                "average_trip_duration"
                            ) !== null
                                ? `${getResponseValue(
                                    analytics?.averageTrip,
                                    "average_trip_duration"
                                )} days`
                                : "—"
                            }
                        </strong>

                        <small>
                            Completed departures
                        </small>

                    </article>


                    <article className="bi-insight-card">

                        <span>
                            Revenue per Customer
                        </span>

                        <strong>
                            {formatCurrency(
                                getResponseValue(
                                    analytics?.revenuePerCustomer,
                                    "revenue_per_customer"
                                )
                            )}
                        </strong>

                        <small>
                            Revenue generated per customer
                        </small>

                    </article>

                </div>

            </section>


            {/* =================================================
                TARGET STATUS
            ================================================= */}

            {analytics?.totalRevenue && (

                <section className="bi-target-card">

                    <div>

                        <span className="bi-section-eyebrow">
                            REVENUE TARGET
                        </span>

                        <h2>
                            {formatCurrency(
                                analytics.totalRevenue.actual_revenue
                            )}
                            {" "}
                            of{" "}
                            {formatCurrency(
                                analytics.totalRevenue.target_amount
                            )}
                        </h2>

                        <p>
                            {analytics.totalRevenue.status ===
                            "above_target"
                                ? "Revenue is above the selected target."
                                : analytics.totalRevenue.status ===
                                    "on_target"
                                    ? "Revenue is exactly on the selected target."
                                    : "Revenue is below the selected target."
                            }
                        </p>

                    </div>


                    <div className="bi-target-progress">

                        <div className="bi-target-progress-track">

                            <div
                                className="bi-target-progress-fill"
                                style={{
                                    width:
                                        `${Math.min(
                                            Math.max(
                                                Number(
                                                    analytics.totalRevenue
                                                        .achievement_percentage
                                                ) || 0,
                                                0
                                            ),
                                            100
                                        )}%`,
                                }}
                            />

                        </div>

                        <strong>
                            {formatPercentage(
                                analytics.totalRevenue
                                    .achievement_percentage
                            )}
                        </strong>

                    </div>

                </section>

            )}

        </main>

    )
}


export default BusinessIntelligence