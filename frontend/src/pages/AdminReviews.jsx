// =========================================================
// THAFARI ADMIN REVIEWS
// =========================================================
//
// This page allows administrators to:
//
// - View all customer reviews
// - Search reviews
// - Filter reviews by visibility
// - View customer and safari information
// - Hide/show reviews
// - Permanently delete reviews
//
// IMPORTANT:
//
// This page is for ADMIN users only.
//
// =========================================================

import { useEffect, useMemo, useState } from "react"

import {
    Link,
    Navigate,
} from "react-router-dom"

import { useAuth } from "../context/AuthContext"

import {
    getAdminReviews,
    updateReviewVisibility,
    deleteReview,
} from "../services/reviewService"

import "./AdminReviews.css"


function AdminReviews() {

    // ---------------------------------------------------------
    // AUTHENTICATION
    // ---------------------------------------------------------

    const {
        user,
        accessToken,
    } = useAuth()


    // ---------------------------------------------------------
    // REVIEW STATE
    // ---------------------------------------------------------

    const [reviews, setReviews] = useState([])

    const [loading, setLoading] = useState(true)

    const [error, setError] = useState("")

    const [success, setSuccess] = useState("")

    const [searchTerm, setSearchTerm] = useState("")

    const [visibilityFilter, setVisibilityFilter] =
        useState("all")

    const [actionLoadingId, setActionLoadingId] =
        useState(null)


    // =========================================================
    // INITIAL LOAD
    // =========================================================

    useEffect(() => {

        if (!accessToken) {
            return
        }

        let cancelled = false

        const fetchReviews = async () => {

            setLoading(true)

            try {

                const response =
                    await getAdminReviews(
                        accessToken
                    )

                if (cancelled) {
                    return
                }

                setReviews(
                    response.reviews || []
                )

                setError("")

            } catch (err) {

                if (cancelled) {
                    return
                }

                console.error(
                    "Failed to load admin reviews:",
                    err
                )

                setError(
                    err.response?.data?.message ||
                    err.response?.data?.error ||
                    "Failed to load reviews."
                )

            } finally {

                if (!cancelled) {
                    setLoading(false)
                }
            }
        }


        fetchReviews()


        return () => {
            cancelled = true
        }

    }, [accessToken])


    // =========================================================
    // FILTER REVIEWS
    // =========================================================

    const filteredReviews = useMemo(() => {

        const term =
            searchTerm
                .trim()
                .toLowerCase()

        return reviews.filter(
            (review) => {

                const matchesVisibility =
                    visibilityFilter === "all" ||
                    (
                        visibilityFilter === "visible" &&
                        review.is_visible
                    ) ||
                    (
                        visibilityFilter === "hidden" &&
                        !review.is_visible
                    )

                if (!matchesVisibility) {
                    return false
                }

                if (!term) {
                    return true
                }

                const customerName =
                    review.customer?.name || ""

                const username =
                    review.customer?.username || ""

                const tourName =
                    review.tour?.tour_name || ""

                const destination =
                    review.tour?.destination || ""

                const comment =
                    review.comment || ""

                const searchableText = [
                    customerName,
                    username,
                    tourName,
                    destination,
                    comment,
                    review.booking_id,
                ]
                    .join(" ")
                    .toLowerCase()

                return searchableText.includes(term)
            }
        )

    }, [
        reviews,
        searchTerm,
        visibilityFilter,
    ])


    // =========================================================
    // REVIEW COUNTS
    // =========================================================

    const visibleCount = reviews.filter(
        (review) => review.is_visible
    ).length

    const hiddenCount = reviews.filter(
        (review) => !review.is_visible
    ).length


    // =========================================================
    // CHANGE VISIBILITY
    // =========================================================

    const handleVisibilityChange = async (
        review
    ) => {

        const nextVisibility =
            !review.is_visible

        setActionLoadingId(
            review.review_id
        )

        setError("")
        setSuccess("")

        try {

            const response =
                await updateReviewVisibility(
                    review.review_id,
                    nextVisibility,
                    accessToken
                )

            const updatedReview =
                response.review

            setReviews(
                (currentReviews) =>
                    currentReviews.map(
                        (item) =>
                            item.review_id ===
                            review.review_id
                                ? updatedReview
                                : item
                    )
            )

            setSuccess(
                nextVisibility
                    ? "Review is now visible to the public."
                    : "Review has been hidden from the public."
            )

        } catch (err) {

            console.error(
                "Failed to update review visibility:",
                err
            )

            setError(
                err.response?.data?.message ||
                err.response?.data?.error ||
                "Unable to update review visibility."
            )

        } finally {

            setActionLoadingId(null)
        }
    }


    // =========================================================
    // DELETE REVIEW
    // =========================================================

    const handleDeleteReview = async (
        review
    ) => {

        const confirmed =
            window.confirm(
                `Delete the review from ${
                    review.customer?.name ||
                    "this customer"
                } permanently?`
            )

        if (!confirmed) {
            return
        }

        setActionLoadingId(
            review.review_id
        )

        setError("")
        setSuccess("")

        try {

            await deleteReview(
                review.review_id,
                accessToken
            )

            setReviews(
                (currentReviews) =>
                    currentReviews.filter(
                        (item) =>
                            item.review_id !==
                            review.review_id
                    )
            )

            setSuccess(
                "Review deleted successfully."
            )

        } catch (err) {

            console.error(
                "Failed to delete review:",
                err
            )

            setError(
                err.response?.data?.message ||
                err.response?.data?.error ||
                "Unable to delete the review."
            )

        } finally {

            setActionLoadingId(null)
        }
    }


    // =========================================================
    // FORMAT DATE
    // =========================================================

    const formatDate = (
        value
    ) => {

        if (!value) {
            return "Not available"
        }

        const date =
            new Date(value)

        if (
            Number.isNaN(
                date.getTime()
            )
        ) {
            return "Not available"
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
    // FORMAT STARS
    // =========================================================

    const renderStars = (
        rating
    ) => {

        return (
            <span
                className="admin-review-stars"
                aria-label={`${rating} out of 5 stars`}
            >
                {[1, 2, 3, 4, 5].map(
                    (star) => (
                        <span
                            key={star}
                            className={
                                star <= rating
                                    ? "filled"
                                    : "empty"
                            }
                            aria-hidden="true"
                        >
                            ★
                        </span>
                    )
                )}
            </span>
        )
    }


    // =========================================================
    // AUTH PROTECTION
    // =========================================================

    if (!user || user.role !== "admin") {

        return (
            <Navigate
                to="/dashboard"
                replace
            />
        )
    }


    // =========================================================
    // RENDER
    // =========================================================

    return (

        <div className="admin-reviews-page">

            {/* =================================================
                HEADER
            ================================================= */}

            <section className="admin-reviews-header">

                <div>

                    <p className="admin-reviews-eyebrow">
                        PLATFORM FEEDBACK
                    </p>

                    <h1>
                        Manage Reviews
                    </h1>

                    <p>
                        Review customer feedback and control
                        which experiences appear publicly on
                        Thafari.
                    </p>

                </div>


                <Link
                    to="/dashboard"
                    className="admin-reviews-back-button"
                >
                    ← Back to Dashboard
                </Link>

            </section>


            {/* =================================================
                SUMMARY
            ================================================= */}

            <section className="admin-reviews-stats">

                <article className="admin-review-stat-card">

                    <span className="admin-review-stat-icon">
                        ★
                    </span>

                    <div>

                        <small>
                            Total Reviews
                        </small>

                        <strong>
                            {reviews.length}
                        </strong>

                    </div>

                </article>


                <article className="admin-review-stat-card">

                    <span className="admin-review-stat-icon">
                        ✓
                    </span>

                    <div>

                        <small>
                            Public
                        </small>

                        <strong>
                            {visibleCount}
                        </strong>

                    </div>

                </article>


                <article className="admin-review-stat-card">

                    <span className="admin-review-stat-icon">
                        ◐
                    </span>

                    <div>

                        <small>
                            Hidden
                        </small>

                        <strong>
                            {hiddenCount}
                        </strong>

                    </div>

                </article>

            </section>


            {/* =================================================
                CONTENT
            ================================================= */}

            <section className="admin-reviews-panel">

                <div className="admin-reviews-toolbar">

                    <div>

                        <h2>
                            Customer Reviews
                        </h2>

                        <p>
                            Moderate feedback before it appears
                            on the public website.
                        </p>

                    </div>


                    <div className="admin-reviews-filters">

                        <input
                            type="search"
                            value={searchTerm}
                            onChange={(event) =>
                                setSearchTerm(
                                    event.target.value
                                )
                            }
                            placeholder="Search customer, safari or review..."
                            aria-label="Search reviews"
                        />


                        <select
                            value={visibilityFilter}
                            onChange={(event) =>
                                setVisibilityFilter(
                                    event.target.value
                                )
                            }
                            aria-label="Filter reviews by visibility"
                        >
                            <option value="all">
                                All Reviews
                            </option>

                            <option value="visible">
                                Public
                            </option>

                            <option value="hidden">
                                Hidden
                            </option>
                        </select>

                    </div>

                </div>


                {error && (

                    <div
                        className="admin-review-feedback admin-review-error"
                        role="alert"
                    >
                        {error}
                    </div>

                )}


                {success && (

                    <div
                        className="admin-review-feedback admin-review-success"
                        role="status"
                        aria-live="polite"
                    >
                        {success}
                    </div>

                )}


                {loading ? (

                    <div className="admin-reviews-empty">

                        <span>
                            ⏳
                        </span>

                        <h3>
                            Loading reviews...
                        </h3>

                        <p>
                            We are retrieving the latest customer feedback.
                        </p>

                    </div>

                ) : filteredReviews.length === 0 ? (

                    <div className="admin-reviews-empty">

                        <span>
                            ☆
                        </span>

                        <h3>
                            No reviews found
                        </h3>

                        <p>
                            Reviews matching your current filters
                            will appear here.
                        </p>

                    </div>

                ) : (

                    <div className="admin-reviews-list">

                        {filteredReviews.map(
                            (review) => {

                                const busy =
                                    actionLoadingId ===
                                    review.review_id

                                return (

                                    <article
                                        key={review.review_id}
                                        className={
                                            `admin-review-card ${
                                                review.is_visible
                                                    ? ""
                                                    : "hidden-review"
                                            }`
                                        }
                                    >

                                        <div className="admin-review-card-header">

                                            <div>

                                                <div className="admin-review-customer">

                                                    <span className="admin-review-avatar">
                                                        {
                                                            (
                                                                review.customer?.name ||
                                                                "T"
                                                            )
                                                                .charAt(0)
                                                                .toUpperCase()
                                                        }
                                                    </span>

                                                    <div>

                                                        <strong>
                                                            {
                                                                review.customer?.name ||
                                                                "Thafari Traveller"
                                                            }
                                                        </strong>

                                                        <small>
                                                            {
                                                                review.customer?.username
                                                                    ? `@${review.customer.username}`
                                                                    : "Customer"
                                                            }
                                                        </small>

                                                    </div>

                                                </div>

                                            </div>


                                            <span
                                                className={
                                                    review.is_visible
                                                        ? "admin-review-visibility public"
                                                        : "admin-review-visibility hidden"
                                                }
                                            >
                                                {review.is_visible
                                                    ? "Public"
                                                    : "Hidden"}
                                            </span>

                                        </div>


                                        <div className="admin-review-rating-row">

                                            {renderStars(
                                                review.rating
                                            )}

                                            <span>
                                                {review.rating}/5
                                            </span>

                                        </div>


                                        <p className="admin-review-comment">
                                            “{review.comment}”
                                        </p>


                                        <div className="admin-review-details">

                                            <div>
                                                <small>
                                                    Booking
                                                </small>

                                                <strong>
                                                    #{review.booking_id}
                                                </strong>
                                            </div>


                                            <div>
                                                <small>
                                                    Safari
                                                </small>

                                                <strong>
                                                    {
                                                        review.tour?.tour_name ||
                                                        "Not available"
                                                    }
                                                </strong>
                                            </div>


                                            <div>
                                                <small>
                                                    Destination
                                                </small>

                                                <strong>
                                                    {
                                                        review.tour?.destination ||
                                                        "Not available"
                                                    }
                                                </strong>
                                            </div>


                                            <div>
                                                <small>
                                                    Submitted
                                                </small>

                                                <strong>
                                                    {
                                                        formatDate(
                                                            review.created_at
                                                        )
                                                    }
                                                </strong>
                                            </div>

                                        </div>


                                        <div className="admin-review-card-actions">

                                            <button
                                                type="button"
                                                className="admin-review-toggle-button"
                                                disabled={busy}
                                                onClick={() =>
                                                    handleVisibilityChange(
                                                        review
                                                    )
                                                }
                                            >
                                                {busy
                                                    ? "Saving..."
                                                    : review.is_visible
                                                        ? "Hide Review"
                                                        : "Show Review"}
                                            </button>


                                            <button
                                                type="button"
                                                className="admin-review-delete-button"
                                                disabled={busy}
                                                onClick={() =>
                                                    handleDeleteReview(
                                                        review
                                                    )
                                                }
                                            >
                                                Delete
                                            </button>

                                        </div>

                                    </article>

                                )
                            }
                        )}

                    </div>

                )}

            </section>

        </div>
    )
}


export default AdminReviews
