// ---------------------------------------------------------
// THAFARI HOME PAGE
// ---------------------------------------------------------
//
// Public landing page for Thafari.
//
// The homepage hero uses the shared Thafari image system.
// The hero asset should be placed in:
//
//     public/thafari-safari-hero.png
//
// The featured safari section continues to use live tour
// data from the Flask backend.
// ---------------------------------------------------------

import { useEffect, useState } from "react"

import { useNavigate } from "react-router-dom"

import { useAuth } from "../context/AuthContext"

import { getTours } from "../services/tourService"

import { getServices } from "../services/serviceService"

import { getContact } from "../services/contactService"

import { getPublicReviews } from "../services/reviewService"

import TourCard from "../components/TourCard"

import "./Home.css"


function Home() {

    const navigate = useNavigate()

    const { logout } = useAuth()


    const handleStartJourney = () => {

        logout()

        navigate("/register")

    }


    // -----------------------------------------------------
    // HERO IMAGE
    // -----------------------------------------------------
    //
    // The image is stored in /public so the homepage does not
    // depend on an external image host.
    // -----------------------------------------------------

    const heroImage = "/thafari-safari-hero.png"


    // -----------------------------------------------------
    // STATE
    // -----------------------------------------------------

    const [tours, setTours] = useState([])

    const [loading, setLoading] = useState(true)

    const [error, setError] = useState("")


    const [services, setServices] = useState([])

    const [servicesLoading, setServicesLoading] = useState(true)

    const [servicesError, setServicesError] = useState("")


    const [contact, setContact] = useState(null)

    const [contactLoading, setContactLoading] = useState(true)

    const [contactError, setContactError] = useState("")

    const [reviews, setReviews] = useState([])

    const [reviewsLoading, setReviewsLoading] = useState(true)

    const [reviewsError, setReviewsError] = useState("")


    // -----------------------------------------------------
    // FETCH TOURS
    // -----------------------------------------------------

    useEffect(() => {

        const loadTours = async () => {

            try {

                setLoading(true)

                setError("")

                const data = await getTours()

                setTours(data.tours || [])

            } catch (error) {

                console.error(
                    "Failed to load tours:",
                    error
                )

                setError(
                    "We couldn't load the safari experiences right now."
                )

            } finally {

                setLoading(false)

            }

        }


        loadTours()

    }, [])


    // -----------------------------------------------------
    // FETCH SERVICES
    // -----------------------------------------------------

    useEffect(() => {

        const loadServices = async () => {

            try {

                setServicesLoading(true)

                setServicesError("")

                const data = await getServices()

                setServices(data.services || [])

            } catch (error) {

                console.error(
                    "Failed to load services:",
                    error
                )

                setServicesError(
                    "We couldn't load our services right now."
                )

            } finally {

                setServicesLoading(false)

            }

        }


        loadServices()

    }, [])


    // -----------------------------------------------------
    // FETCH CONTACT DETAILS
    // -----------------------------------------------------

    useEffect(() => {

        const loadContact = async () => {

            try {

                setContactLoading(true)

                setContactError("")

                const data = await getContact()

                setContact(data.contact || null)

            } catch (error) {

                console.error(
                    "Failed to load contact details:",
                    error
                )

                setContactError(
                    "We couldn't load our contact details right now."
                )

            } finally {

                setContactLoading(false)

            }

        }


        loadContact()

    }, [])


    // -----------------------------------------------------
    // FETCH PUBLIC REVIEWS
    // -----------------------------------------------------

    useEffect(() => {

        const loadReviews = async () => {

            try {

                setReviewsLoading(true)

                setReviewsError("")

                const data = await getPublicReviews()

                setReviews(data.reviews || [])

            } catch (error) {

                console.error(
                    "Failed to load public reviews:",
                    error
                )

                setReviews([])

                setReviewsError(
                    "We couldn't load customer reviews right now."
                )

            } finally {

                setReviewsLoading(false)

            }

        }


        loadReviews()

    }, [])


    // -----------------------------------------------------
    // BUILD WHATSAPP LINK
    // -----------------------------------------------------

    const getWhatsAppLink = (number) => {

        const digits = String(number || "")
            .replace(/\D/g, "")


        if (!digits) {
            return "#"
        }


        const internationalNumber =
            digits.startsWith("0")
                ? `254${digits.slice(1)}`
                : digits


        return `https://wa.me/${internationalNumber}`
    }




    const getServiceFallbackIcon = (serviceName) => {

        const name = String(serviceName || "").toLowerCase()

        if (name.includes("airport")) return "✈️"
        if (name.includes("planning")) return "🗺️"
        if (name.includes("custom")) return "🦒"
        return "🦁"
    }

    const averageRating = reviews.length > 0

        ? (
            reviews.reduce(
                (sum, review) =>
                    sum + Number(review.rating || 0),
                0
            ) / reviews.length
        ).toFixed(1)

        : "0.0"


    return (

        <div className="home-page">


            {/* =================================================
                HERO
            ================================================= */}

            <section className="hero-section">

                <div className="thafari-image-hero">

                    <img
                        src={heroImage}
                        alt="African safari landscape with wildlife and a safari vehicle at sunset"
                    />

                </div>


                <div
                    className="thafari-image-hero-overlay"
                    aria-hidden="true"
                />


                <div className="hero-content">

                    <p className="hero-eyebrow">
                        YOUR NEXT ADVENTURE AWAITS
                    </p>

                    <h1>
                        Discover the wild.
                        <br />
                        Experience Africa.
                    </h1>

                    <p className="hero-description">
                        Explore unforgettable safari experiences,
                        discover breathtaking destinations and
                        create memories that last a lifetime.
                    </p>

                    <div className="hero-actions">

                        <a
                            href="/tours"
                            className="primary-button"
                        >
                            Explore Safaris
                        </a>

                        <button
                            type="button"
                            className="secondary-button"
                            onClick={handleStartJourney}
                        >
                            Start Your Journey
                        </button>

                    </div>

                </div>

            </section>


            {/* =================================================
                INTRODUCTION
            ================================================= */}

            <section className="intro-section">

                <p className="section-eyebrow">
                    WHY THAFARI
                </p>

                <h2>
                    Your safari.
                    <br />
                    Your adventure.
                    <br />
                    Your story.
                </h2>

                <p>
                    Thafari connects travelers with unforgettable
                    safari experiences across Kenya. Find your
                    destination, choose your adventure and let the
                    journey begin.
                </p>

            </section>


            {/* =================================================
                SERVICES OFFERED
            ================================================= */}

            <section
                id="services"
                className="services-section"
            >

                <div className="section-heading">

                    <div>

                        <p className="section-eyebrow">
                            WHAT WE OFFER
                        </p>

                        <h2>
                            Services Offered
                        </h2>

                    </div>

                </div>


                {servicesLoading && (

                    <div className="service-status">

                        <p>
                            Loading our services...
                        </p>

                    </div>

                )}


                {!servicesLoading && servicesError && (

                    <div className="service-status service-error">

                        <p>
                            {servicesError}
                        </p>

                    </div>

                )}


                {!servicesLoading &&
                    !servicesError &&
                    services.length === 0 && (

                    <div className="service-status">

                        <p>
                            Our services are being updated.
                            Please check back soon.
                        </p>

                    </div>

                )}


                {!servicesLoading &&
                    !servicesError &&
                    services.length > 0 && (

                    <div className="services-grid">

                        {services.map((service, index) => (

                            <article
                                key={service.id}
                                className="service-card"
                            >

                                <div className="service-card-image-wrap">

                                    {service.image_url ? (

                                        <img
                                            src={service.image_url}
                                            alt={service.name}
                                            className="service-card-image"
                                            onError={(event) => {
                                                event.currentTarget.style.display = "none"
                                            }}
                                        />

                                    ) : (

                                        <div className="service-card-image-fallback">
                                            {getServiceFallbackIcon(service.name)}
                                        </div>

                                    )}

                                    <div
                                        className="service-card-image-overlay"
                                        aria-hidden="true"
                                    />

                                    <span className="service-card-number">
                                        {String(index + 1).padStart(2, "0")}
                                    </span>

                                </div>

                                <div className="service-card-content">

                                    <h3>
                                        {service.name}
                                    </h3>

                                    <p>
                                        {service.description}
                                    </p>

                                    {service.link_url && (

                                        <a
                                            href={service.link_url}
                                            className="service-card-link"
                                        >
                                            {service.link_label || "Learn More"}
                                            <span aria-hidden="true">→</span>
                                        </a>

                                    )}

                                </div>

                            </article>

                        ))}

                    </div>

                )}

            </section>


            {/* =================================================
                FEATURED TOURS
            ================================================= */}

            <section className="featured-section">

                <div className="section-heading">

                    <div>

                        <p className="section-eyebrow">
                            EXPLORE
                        </p>

                        <h2>
                            Featured Safaris
                        </h2>

                    </div>

                    <a href="/tours">
                        View all safaris →
                    </a>

                </div>


                {loading && (

                    <div className="tour-status">

                        <p>
                            Discovering safari experiences...
                        </p>

                    </div>

                )}


                {!loading && error && (

                    <div className="tour-status tour-error">

                        <p>
                            {error}
                        </p>

                    </div>

                )}


                {!loading && !error && tours.length === 0 && (

                    <div className="tour-status">

                        <p>
                            No safari experiences are available
                            right now.
                        </p>

                    </div>

                )}


                {!loading && !error && tours.length > 0 && (

                    <div className="tour-grid">

                        {tours.map((tour) => (

                            <TourCard
                                key={
                                    tour.tour_id ||
                                    tour.tour_name
                                }
                                tour={tour}
                            />

                        ))}

                    </div>

                )}

            </section>


            {/* =================================================
                CUSTOMER REVIEWS
            ================================================= */}

            <section
                id="reviews"
                className="reviews-section"
            >

                <div className="section-heading">

                    <div>

                        <p className="section-eyebrow">
                            TRAVELLER STORIES
                        </p>

                        <h2>
                            What our travellers say
                        </h2>

                        <p>
                            Real experiences from customers who have
                            explored Kenya with Thafari.
                        </p>

                    </div>

                    {reviews.length > 0 && (

                        <div className="reviews-summary">

                            <strong>
                                {averageRating}
                            </strong>

                            <div>

                                <span className="reviews-summary-stars">
                                    {"★".repeat(
                                        Math.round(Number(averageRating))
                                    )}
                                </span>

                                <small>
                                    Based on {reviews.length}{" "}
                                    {reviews.length === 1
                                        ? "review"
                                        : "reviews"}
                                </small>

                            </div>

                        </div>

                    )}

                </div>


                {reviewsLoading && (

                    <div className="reviews-status">

                        <p>
                            Loading traveller reviews...
                        </p>

                    </div>

                )}


                {!reviewsLoading && reviewsError && (

                    <div className="reviews-status reviews-error">

                        <p>
                            {reviewsError}
                        </p>

                    </div>

                )}


                {!reviewsLoading &&
                    !reviewsError &&
                    reviews.length === 0 && (

                    <div className="reviews-status">

                        <p>
                            Our first traveller reviews will appear here
                            after completed safari experiences.
                        </p>

                    </div>

                )}


                {!reviewsLoading &&
                    !reviewsError &&
                    reviews.length > 0 && (

                    <div
                        className="reviews-marquee"
                        aria-label="Customer reviews carousel"
                    >

                        <div
                            className={`reviews-track ${
                                reviews.length < 3
                                    ? "reviews-track-static"
                                    : ""
                            }`}
                        >

                            {reviews.slice(0, 6).map((review) => (

                                <article
                                    key={`review-${review.review_id}`}
                                    className="review-card"
                                >

                                    <div className="review-card-top">

                                        <div
                                            className="review-stars"
                                            aria-label={`${review.rating} out of 5 stars`}
                                        >
                                            {"★".repeat(review.rating)}
                                        </div>

                                        <span className="review-card-rating">
                                            {review.rating}/5
                                        </span>

                                    </div>


                                    <p className="review-card-comment">
                                        “{review.comment}”
                                    </p>


                                    <div className="review-card-footer">

                                        <div>

                                            <strong>
                                                {review.customer?.name ||
                                                    "Thafari Traveller"}
                                            </strong>

                                            {review.tour?.tour_name && (

                                                <small>
                                                    {review.tour.tour_name}
                                                </small>

                                            )}

                                        </div>

                                        <span
                                            className="review-card-verified"
                                        >
                                            ✓ Verified traveller
                                        </span>

                                    </div>

                                </article>

                            ))}

                            {reviews.length >= 3 && (
                                <>
                                    {/* Duplicate the cards only when there are enough reviews
                                        to make the automatic marquee worthwhile. */}
                                    {reviews.slice(0, 6).map((review) => (

                                <article
                                    key={`review-copy-${review.review_id}`}
                                    className="review-card"
                                    aria-hidden="true"
                                >

                                    <div className="review-card-top">

                                        <div className="review-stars">
                                            {"★".repeat(review.rating)}
                                        </div>

                                        <span className="review-card-rating">
                                            {review.rating}/5
                                        </span>

                                    </div>


                                    <p className="review-card-comment">
                                        “{review.comment}”
                                    </p>


                                    <div className="review-card-footer">

                                        <div>

                                            <strong>
                                                {review.customer?.name ||
                                                    "Thafari Traveller"}
                                            </strong>

                                            {review.tour?.tour_name && (

                                                <small>
                                                    {review.tour.tour_name}
                                                </small>

                                            )}

                                        </div>

                                        <span
                                            className="review-card-verified"
                                        >
                                            ✓ Verified traveller
                                        </span>

                                    </div>

                                </article>

                                    ))}
                                </>
                            )}

                        </div>

                    </div>

                )}

            </section>


            {/* =================================================
                CONTACT THAFARI
            ================================================= */}

            <section
                id="contact"
                className="contact-section"
            >

                <div className="section-heading">

                    <div>

                        <p className="section-eyebrow">
                            GET IN TOUCH
                        </p>

                        <h2>
                            Contact Thafari
                        </h2>

                        <p>
                            Have a question about a safari, booking or
                            travel experience? Reach out to us.
                        </p>

                    </div>

                </div>


                {contactLoading && (

                    <div className="contact-status">

                        <p>
                            Loading contact details...
                        </p>

                    </div>

                )}


                {!contactLoading && contactError && (

                    <div className="contact-status contact-error">

                        <p>
                            {contactError}
                        </p>

                    </div>

                )}


                {!contactLoading &&
                    !contactError &&
                    !contact && (

                    <div className="contact-status">

                        <p>
                            Our contact details are being updated.
                            Please check back soon.
                        </p>

                    </div>

                )}


                {!contactLoading &&
                    !contactError &&
                    contact && (

                    <div className="contact-grid">

                        <a
                            href={getWhatsAppLink(contact.whatsapp)}
                            className="contact-card"
                            target="_blank"
                            rel="noreferrer"
                        >

                            <span className="contact-card-icon">
                                💬
                            </span>

                            <div>

                                <span className="contact-card-label">
                                    WhatsApp
                                </span>

                                <strong>
                                    {contact.whatsapp}
                                </strong>

                            </div>

                            <span className="contact-card-arrow">
                                →
                            </span>

                        </a>


                        <a
                            href={`mailto:${contact.email}`}
                            className="contact-card"
                        >

                            <span className="contact-card-icon">
                                ✉️
                            </span>

                            <div>

                                <span className="contact-card-label">
                                    Email
                                </span>

                                <strong>
                                    {contact.email}
                                </strong>

                            </div>

                            <span className="contact-card-arrow">
                                →
                            </span>

                        </a>


                        <a
                            href={`tel:${contact.phone_number}`}
                            className="contact-card"
                        >

                            <span className="contact-card-icon">
                                📞
                            </span>

                            <div>

                                <span className="contact-card-label">
                                    Phone
                                </span>

                                <strong>
                                    {contact.phone_number}
                                </strong>

                            </div>

                            <span className="contact-card-arrow">
                                →
                            </span>

                        </a>

                    </div>

                )}

            </section>


            {/* =================================================
                CALL TO ACTION
            ================================================= */}

            <section className="cta-section">

                <div>

                    <p className="section-eyebrow">
                        READY TO EXPLORE?
                    </p>

                    <h2>
                        Your next adventure starts here.
                    </h2>

                    <p>
                        Find a safari and start planning your
                        unforgettable journey.
                    </p>

                    <a
                        href="/tours"
                        className="primary-button"
                    >
                        Explore Safaris
                    </a>

                </div>

            </section>

        </div>

    )

}


export default Home
