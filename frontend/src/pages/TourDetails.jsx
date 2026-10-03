// =========================================================
// THAFARI TOUR DETAILS PAGE
// =========================================================
//
// This page displays the complete information about a safari.
//
// Information comes from:
// GET /api/tours/<tour_id>
//
// The backend provides:
// - Tour information
// - Cover image
// - Gallery images
// - Description
// - Duration
// - Itinerary
// - Accommodation
// - FAQs
// - Upcoming departures
//
// This page also loads other available tours so customers
// can continue exploring without going back to the tours page.
//
// =========================================================

import { useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"

import {
    getTourDetails,
    getTours
} from "../services/tourService"

import "./TourDetails.css"


// =========================================================
// TOUR DETAILS COMPONENT
// =========================================================

function TourDetails() {

    // Get the tour ID from the URL.
    //
    // Example:
    // /tours/5
    //
    // tourId = "5"

    const { tourId } = useParams()


    // useNavigate allows us to send the customer
    // to another page after clicking Book Now.

    const navigate = useNavigate()


    // =====================================================
    // STATE
    // =====================================================

    // Stores the complete tour currently being viewed.

    const [tour, setTour] = useState(null)


    // Stores other tours that can be recommended
    // at the bottom of the page.

    const [otherTours, setOtherTours] = useState([])


    // Loading state for the current tour.

    const [loading, setLoading] = useState(true)


    // Stores any API error for the current tour.

    const [error, setError] = useState("")


    // =====================================================
    // LOAD TOUR DETAILS
    // =====================================================

    useEffect(() => {

        const loadTour = async () => {

            try {

                setLoading(true)

                setError("")


                // Request the complete tour package.

                const data = await getTourDetails(tourId)


                setTour(data)

            } catch (err) {

                console.error(
                    "Failed to load tour:",
                    err
                )

                setError(
                    "We couldn't load this safari. Please try again."
                )

            } finally {

                setLoading(false)

            }
        }


        loadTour()

    }, [tourId])


    // =====================================================
    // LOAD OTHER TOURS
    // =====================================================

    useEffect(() => {

        const loadOtherTours = async () => {

            try {

                // Get all tours from the backend.

                const data = await getTours()


                const tours = Array.isArray(data?.tours)
                    ? data.tours
                    : []


                // Convert the URL tour ID into a number.

                const currentTourId = Number(tourId)


                // Remove the tour currently being viewed.
                //
                // Then show a maximum of three other tours.

                const filteredTours = tours
                    .filter(
                        item => item.tour_id !== currentTourId
                    )
                    .slice(0, 3)


                setOtherTours(filteredTours)

            } catch (err) {

                // Recommendations are an extra feature.
                //
                // If they fail to load, we don't want the
                // entire Tour Details page to break.

                console.error(
                    "Failed to load other tours:",
                    err
                )

                setOtherTours([])

            }
        }


        loadOtherTours()

    }, [tourId])


    // =====================================================
    // BOOKING NAVIGATION
    // =====================================================

    // This function runs when the customer clicks
    // "Book now".
    //
    // We temporarily save the selected departure in
    // sessionStorage so the Booking page can use it.
    //
    // Then we navigate to:
    //
    // /booking/<departure_id>
    //
    // =====================================================

    const handleBookNow = (departure) => {

        // Save the selected departure temporarily.

        sessionStorage.setItem(
            `thafari_departure_${departure.id}`,
            JSON.stringify({
                ...departure,
                tour_id: tour.tour_id,
                tour_name: tour.tour_name,
                destination: tour.destination
            })
        )


        // Send the customer to the dedicated booking page.

        navigate(
            `/booking/${departure.id}`
        )
    }


    // =====================================================
    // IMAGE FALLBACK HANDLER
    // =====================================================
    //
    // If an image URL exists but the image cannot be loaded,
    // we hide the broken image and display the Thafari
    // fallback instead.
    //
    // =====================================================

    const handleImageError = (event) => {

        event.currentTarget.style.display = "none"


        const fallback =
            event.currentTarget
                .parentElement
                ?.querySelector(
                    ".thafari-image-error"
                )


        if (fallback) {

            fallback.style.display = "flex"

        }
    }


    // =====================================================
    // LOADING STATE
    // =====================================================

    if (loading) {

        return (

            <div className="tour-details-state">

                <div className="tour-loading-spinner"></div>

                <p>
                    Preparing your safari experience...
                </p>

            </div>
        )
    }


    // =====================================================
    // ERROR STATE
    // =====================================================

    if (error) {

        return (

            <div className="tour-details-state">

                <div className="tour-state-icon">
                    !
                </div>

                <h2>
                    Something went wrong
                </h2>

                <p>
                    {error}
                </p>

            </div>
        )
    }


    // =====================================================
    // TOUR NOT FOUND
    // =====================================================

    if (!tour) {

        return (

            <div className="tour-details-state">

                <div className="tour-state-icon">
                    🦁
                </div>

                <h2>
                    Safari not found
                </h2>

                <p>
                    We couldn't find the safari you're looking for.
                </p>

            </div>
        )
    }


    // =====================================================
    // SAFE DATA
    // =====================================================

    const galleryImages = Array.isArray(tour.gallery_images)
        ? tour.gallery_images
        : []


    const itineraries = Array.isArray(tour.itineraries)
        ? tour.itineraries
        : []


    const accommodations = Array.isArray(tour.accommodations)
        ? tour.accommodations
        : []


    const faqs = Array.isArray(tour.faqs)
        ? tour.faqs
        : []


    const departures = Array.isArray(tour.departures)
        ? tour.departures
        : []


    // =====================================================
    // HERO IMAGE
    // =====================================================

    const heroImage =
        tour.cover_image ||
        galleryImages[0] ||
        ""


    // =====================================================
    // FORMAT PRICE
    // =====================================================

    const formatPrice = (price) => {

        if (
            price === null ||
            price === undefined ||
            price === ""
        ) {

            return "Price unavailable"

        }


        return `KES ${Number(price).toLocaleString()}`
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
                year: "numeric"
            }
        )
    }


    // =====================================================
    // CALCULATE STARTING PRICE
    // =====================================================

    const departurePrices = departures
        .map(
            departure =>
                Number(departure.price_per_person)
        )
        .filter(
            price => !Number.isNaN(price)
        )


    const startingPrice =
        departurePrices.length > 0
            ? Math.min(...departurePrices)
            : tour.charges


    // =====================================================
    // RENDER PAGE
    // =====================================================

    return (

        <main className="tour-details-page">


            {/* =================================================
                HERO SECTION
            ================================================= */}

            <section
                className="tour-hero thafari-image-detail-hero"
                style={{
                    backgroundImage: heroImage
                        ? `url("${heroImage}")`
                        : "none"
                }}
            >

                {/* Universal image overlay */}

                <div className="thafari-image-hero-overlay"></div>

                <div className="tour-hero-overlay"></div>


                {!heroImage && (

                    <div className="thafari-image-placeholder tour-hero-placeholder">

                        <div className="thafari-image-placeholder-content">

                            <span>
                                🦁
                            </span>

                            <small>
                                Safari image unavailable
                            </small>

                        </div>

                    </div>

                )}


                <div className="tour-hero-content">

                    <span className="tour-hero-eyebrow">
                        ✦ Explore Kenya
                    </span>


                    <h1>
                        {tour.tour_name}
                    </h1>


                    <div className="tour-hero-meta">

                        <span>
                            📍 {tour.destination}
                        </span>


                        {tour.duration_days && (

                            <span>
                                🗓️ {tour.duration_days} Days
                                {tour.duration_nights
                                    ? ` / ${tour.duration_nights} Nights`
                                    : ""
                                }
                            </span>

                        )}

                    </div>


                    {startingPrice && (

                        <div className="tour-hero-price">

                            <span>
                                From
                            </span>

                            <strong>
                                {formatPrice(startingPrice)}
                            </strong>

                            <small>
                                per person
                            </small>

                        </div>

                    )}

                </div>

            </section>



            {/* =================================================
                MAIN CONTENT
            ================================================= */}

            <div className="tour-details-container">


                {/* =================================================
                    PHOTO GALLERY
                ================================================= */}

                {galleryImages.length > 0 && (

                    <section className="tour-gallery-section">

                        <div className="tour-gallery">

                            {galleryImages
                                .slice(0, 3)
                                .map((image, index) => (

                                    <div
                                        className="tour-gallery-image thafari-image-container thafari-image-gallery"
                                        key={`${image}-${index}`}
                                    >

                                        <img
                                            className="thafari-image"
                                            src={image}
                                            alt={`${tour.tour_name} safari ${index + 1}`}
                                            loading="lazy"
                                            onError={handleImageError}
                                        />


                                        {/* Gallery fallback */}

                                        <div
                                            className="thafari-image-error"
                                            style={{
                                                display: "none"
                                            }}
                                        >

                                            <div className="thafari-image-placeholder-content">

                                                <span>
                                                    🦁
                                                </span>

                                                <small>
                                                    Image unavailable
                                                </small>

                                            </div>

                                        </div>

                                    </div>

                                ))}

                        </div>

                    </section>

                )}



                {/* =================================================
                    ABOUT THE SAFARI
                ================================================= */}

                <section className="tour-section tour-about-section">

                    <div className="tour-section-heading">

                        <span className="section-eyebrow">
                            THE EXPERIENCE
                        </span>

                        <h2>
                            About this safari
                        </h2>

                    </div>


                    <div className="tour-about-grid">

                        <div className="tour-about-content">

                            <p>
                                {tour.description ||
                                    "Experience an unforgettable safari adventure through some of Kenya's most beautiful destinations."
                                }
                            </p>

                        </div>


                        <div className="tour-highlights">

                            <div className="tour-highlight">

                                <span className="tour-highlight-icon">
                                    🗓️
                                </span>

                                <div>

                                    <strong>
                                        Duration
                                    </strong>

                                    <span>
                                        {tour.duration_days
                                            ? `${tour.duration_days} days`
                                            : "Flexible"
                                        }
                                    </span>

                                </div>

                            </div>


                            <div className="tour-highlight">

                                <span className="tour-highlight-icon">
                                    🌍
                                </span>

                                <div>

                                    <strong>
                                        Destination
                                    </strong>

                                    <span>
                                        {tour.destination}
                                    </span>

                                </div>

                            </div>


                            <div className="tour-highlight">

                                <span className="tour-highlight-icon">
                                    💰
                                </span>

                                <div>

                                    <strong>
                                        Starting from
                                    </strong>

                                    <span>
                                        {formatPrice(startingPrice)}
                                    </span>

                                </div>

                            </div>

                        </div>

                    </div>

                </section>



                {/* =================================================
                    ITINERARY
                ================================================= */}

                {itineraries.length > 0 && (

                    <section className="tour-section">

                        <div className="tour-section-heading">

                            <span className="section-eyebrow">
                                YOUR JOURNEY
                            </span>

                            <h2>
                                Safari itinerary
                            </h2>

                            <p>
                                A day-by-day look at your adventure.
                            </p>

                        </div>


                        <div className="tour-itinerary">

                            {itineraries.map((item, index) => (

                                <div
                                    className="itinerary-item"
                                    key={item.id || index}
                                >

                                    <div className="itinerary-marker">

                                        <span>
                                            {item.day_number}
                                        </span>

                                    </div>


                                    <div className="itinerary-line"></div>


                                    <div className="itinerary-content">

                                        <span className="itinerary-day">
                                            DAY {item.day_number}
                                        </span>

                                        <h3>
                                            {item.title}
                                        </h3>

                                        <p>
                                            {item.description}
                                        </p>

                                    </div>

                                </div>

                            ))}

                        </div>

                    </section>

                )}



                {/* =================================================
                    ACCOMMODATION
                ================================================= */}

                {accommodations.length > 0 && (

                    <section className="tour-section">

                        <div className="tour-section-heading">

                            <span className="section-eyebrow">
                                WHERE YOU'LL STAY
                            </span>

                            <h2>
                                Accommodation
                            </h2>

                        </div>


                        <div className="accommodation-grid">

                            {accommodations.map(
                                (accommodation, index) => (

                                    <article
                                        className="accommodation-card"
                                        key={
                                            accommodation.id ||
                                            index
                                        }
                                    >

                                        <div className="accommodation-card-top">

                                            <span className="accommodation-category">
                                                {accommodation.category}
                                            </span>

                                            <span className="accommodation-icon">
                                                🏕️
                                            </span>

                                        </div>


                                        <h3>
                                            {accommodation.name}
                                        </h3>


                                        <p className="accommodation-location">
                                            📍 {accommodation.location}
                                        </p>


                                        <div className="accommodation-details">

                                            <div>

                                                <span>
                                                    Room
                                                </span>

                                                <strong>
                                                    {accommodation.room_type}
                                                </strong>

                                            </div>


                                            <div>

                                                <span>
                                                    Meals
                                                </span>

                                                <strong>
                                                    {accommodation.meal_plan}
                                                </strong>

                                            </div>

                                        </div>


                                        {accommodation.description && (

                                            <p className="accommodation-description">
                                                {accommodation.description}
                                            </p>

                                        )}

                                    </article>

                                )
                            )}

                        </div>

                    </section>

                )}



                {/* =================================================
                    FAQ
                ================================================= */}

                {faqs.length > 0 && (

                    <section className="tour-section tour-faq-section">

                        <div className="tour-section-heading">

                            <span className="section-eyebrow">
                                GOOD TO KNOW
                            </span>

                            <h2>
                                Frequently asked questions
                            </h2>

                        </div>


                        <div className="faq-list">

                            {faqs.map((faq, index) => (

                                <details
                                    className="faq-item"
                                    key={faq.id || index}
                                >

                                    <summary>

                                        <span>
                                            {faq.question}
                                        </span>

                                        <span className="faq-plus">
                                            +
                                        </span>

                                    </summary>


                                    <div className="faq-answer">

                                        <p>
                                            {faq.answer}
                                        </p>

                                    </div>

                                </details>

                            ))}

                        </div>

                    </section>

                )}



                {/* =================================================
                    DEPARTURES / BOOKING
                ================================================= */}

                <section className="tour-section tour-departures-section">

                    <div className="tour-section-heading">

                        <span className="section-eyebrow">
                            PLAN YOUR ADVENTURE
                        </span>

                        <h2>
                            Upcoming departures
                        </h2>

                        <p>
                            Choose your preferred travel date and
                            reserve your place.
                        </p>

                    </div>


                    {departures.length > 0 ? (

                        <div className="departures-list">

                            {departures.map((departure, index) => (

                                <article
                                    className="departure-card"
                                    key={departure.id || index}
                                >

                                    <div className="departure-date">

                                        <span>
                                            DEPARTS
                                        </span>

                                        <strong>
                                            {formatDate(
                                                departure.start_date
                                            )}
                                        </strong>

                                    </div>


                                    <div className="departure-info">

                                        <div>

                                            <span>
                                                Return
                                            </span>

                                            <strong>
                                                {formatDate(
                                                    departure.end_date
                                                )}
                                            </strong>

                                        </div>


                                        <div>

                                            <span>
                                                Available seats
                                            </span>

                                            <strong>
                                                {departure.available_seats}
                                            </strong>

                                        </div>

                                    </div>


                                    <div className="departure-price">

                                        <span>
                                            Per person
                                        </span>

                                        <strong>
                                            {formatPrice(
                                                departure.price_per_person
                                            )}
                                        </strong>

                                    </div>


                                    <button
                                        type="button"
                                        className="departure-book-button"
                                        onClick={() =>
                                            handleBookNow(
                                                departure
                                            )
                                        }
                                        disabled={
                                            !departure.available_seats ||
                                            departure.available_seats <= 0
                                        }
                                    >

                                        {departure.available_seats > 0
                                            ? "Book now"
                                            : "Fully booked"
                                        }

                                        {departure.available_seats > 0 && (

                                            <span>
                                                →
                                            </span>

                                        )}

                                    </button>

                                </article>

                            ))}

                        </div>

                    ) : (

                        <div className="no-departures">

                            <div className="no-departures-icon">
                                🐾
                            </div>

                            <h3>
                                No departures available yet
                            </h3>

                            <p>
                                We're preparing the next adventure
                                for this safari. Check back soon.
                            </p>

                        </div>

                    )}

                </section>



                {/* =================================================
                    MORE SAFARI EXPERIENCES
                ================================================= */}

                {otherTours.length > 0 && (

                    <section className="tour-section more-tours-section">

                        <div className="more-tours-heading">

                            <div>

                                <span className="section-eyebrow">
                                    MORE TO EXPLORE
                                </span>

                                <h2>
                                    Your next adventure awaits
                                </h2>

                                <p>
                                    Discover more safari experiences
                                    without leaving this page.
                                </p>

                            </div>

                        </div>


                        <div className="more-tours-grid">

                            {otherTours.map((otherTour) => {

                                // Use the cover image first.
                                //
                                // If there is no cover image,
                                // use the first gallery image.

                                const tourImage =
                                    otherTour.cover_image ||
                                    (
                                        Array.isArray(
                                            otherTour.gallery_images
                                        )
                                            ? otherTour.gallery_images[0]
                                            : ""
                                    )


                                return (

                                    <article
                                        className="more-tour-card"
                                        key={otherTour.tour_id}
                                    >

                                        <div className="more-tour-image thafari-image-container thafari-image-recommended">

                                            {tourImage ? (

                                                <img
                                                    className="thafari-image"
                                                    src={tourImage}
                                                    alt={otherTour.tour_name}
                                                    loading="lazy"
                                                    onError={handleImageError}
                                                />

                                            ) : null}


                                            <div
                                                className="thafari-image-error"
                                                style={{
                                                    display: tourImage
                                                        ? "none"
                                                        : "flex"
                                                }}
                                            >

                                                <div className="thafari-image-placeholder-content">

                                                    <span>
                                                        🦁
                                                    </span>

                                                    <small>
                                                        Safari image unavailable
                                                    </small>

                                                </div>

                                            </div>

                                        </div>


                                        <div className="more-tour-content">

                                            <span className="more-tour-location">
                                                📍 {otherTour.destination}
                                            </span>


                                            <h3>
                                                {otherTour.tour_name}
                                            </h3>


                                            <div className="more-tour-bottom">

                                                <div className="more-tour-price">

                                                    <span>
                                                        From
                                                    </span>

                                                    <strong>
                                                        {formatPrice(
                                                            otherTour.starting_price
                                                        )}
                                                    </strong>

                                                </div>


                                                <Link
                                                    to={`/tours/${otherTour.tour_id}`}
                                                    className="more-tour-link"
                                                >
                                                    Explore

                                                    <span>
                                                        →
                                                    </span>

                                                </Link>

                                            </div>

                                        </div>

                                    </article>

                                )

                            })}

                        </div>

                    </section>

                )}

            </div>

        </main>
    )
}


export default TourDetails