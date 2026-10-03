// =========================================================
// THAFARI TOURS PAGE
// =========================================================
//
// This page displays all safari tours retrieved from the
// Flask backend.
//
// Each tour contains:
// - tour_id
// - tour_name
// - destination
// - starting_price
// - cover_image
// - gallery_images
//
// The starting price comes from the cheapest future
// bookable departure.
//
// If there are no future departures, we display:
// "No upcoming departures"
//
// =========================================================

import { useEffect, useState } from "react"

import {
    useNavigate,
} from "react-router-dom"

import {
    getTours,
} from "../services/tourService"

import "./Tours.css"


function Tours() {

    // =========================================================
    // STATE
    // =========================================================

    // Stores all tours returned from the backend.
    const [tours, setTours] = useState([])

    // Tracks whether tours are still loading.
    const [loading, setLoading] = useState(true)

    // Stores an error message if loading fails.
    const [error, setError] = useState("")


    // =========================================================
    // NAVIGATION
    // =========================================================

    const navigate = useNavigate()


    // =========================================================
    // FETCH TOURS
    // =========================================================

    useEffect(() => {

        const fetchTours = async () => {

            try {

                // Start loading.
                setLoading(true)

                // Clear any previous error.
                setError("")


                // Get tours from Flask.
                const data = await getTours()


                // The backend returns:
                //
                // {
                //     "tours": [...]
                // }
                //
                // Therefore we store data.tours.
                setTours(data.tours || [])

            } catch (error) {

                console.error(
                    "Error fetching tours:",
                    error
                )

                setError(
                    "We couldn't load the tours right now. Please try again."
                )

            } finally {

                // Loading has finished.
                setLoading(false)
            }
        }


        fetchTours()

    }, [])


    // =========================================================
    // LOADING STATE
    // =========================================================

    if (loading) {

        return (

            <div className="tours-page">

                <div className="tours-message">

                    <p>
                        Loading tours...
                    </p>

                </div>

            </div>
        )
    }


    // =========================================================
    // ERROR STATE
    // =========================================================

    if (error) {

        return (

            <div className="tours-page">

                <div className="tours-message error-message">

                    <p>
                        {error}
                    </p>


                    <button
                        onClick={() => window.location.reload()}
                    >
                        Try Again
                    </button>

                </div>

            </div>
        )
    }


    // =========================================================
    // TOURS PAGE
    // =========================================================

    return (

        <div className="tours-page">

            {/* =================================================
                PAGE HEADER
            ================================================= */}

            <section className="tours-header">

                <p className="tours-eyebrow">
                    EXPLORE THAFARI
                </p>


                <h1>
                    Find Your Next Adventure
                </h1>


                <p>
                    Discover amazing destinations and choose
                    a safari that matches your travel plans.
                </p>

            </section>


            {/* =================================================
                TOURS
            ================================================= */}

            <section className="tours-container">

                {tours.length === 0 ? (

                    // -------------------------------------------------
                    // NO TOURS
                    // -------------------------------------------------

                    <div className="tours-message">

                        <p>
                            No tours are currently available.
                        </p>

                    </div>

                ) : (

                    <div className="tours-grid">

                        {tours.map((tour) => {

                            // -------------------------------------------------
                            // CHECK FOR STARTING PRICE
                            // -------------------------------------------------
                            //
                            // The backend returns null when the tour
                            // has no future bookable departures.
                            // -------------------------------------------------

                            const hasStartingPrice =
                                tour.starting_price !== null &&
                                tour.starting_price !== undefined &&
                                tour.starting_price !== ""


                            // -------------------------------------------------
                            // TOUR IMAGE
                            // -------------------------------------------------
                            //
                            // Image priority:
                            //
                            // 1. Cover image
                            // 2. First gallery image
                            // 3. Thafari placeholder
                            //
                            // This means tour operators/admins can provide
                            // either a cover image or gallery images and
                            // the card will still display an image.
                            // -------------------------------------------------

                            const tourImage =
                                tour.cover_image ||
                                (
                                    Array.isArray(
                                        tour.gallery_images
                                    )
                                        ? tour.gallery_images[0]
                                        : ""
                                )


                            return (

                                <article
                                    className="tour-card"
                                    key={tour.tour_id}
                                >

                                    {/* =================================================
                                        TOUR IMAGE
                                    ================================================= */}

                                    <div className="tour-image thafari-image-container thafari-image-tour-cover">

                                        {tourImage ? (

                                            <img
                                                className="thafari-image"
                                                src={tourImage}
                                                alt={`${tour.tour_name} safari`}
                                                loading="lazy"
                                                onError={(event) => {

                                                    // Prevent the browser from
                                                    // repeatedly trying to load
                                                    // a broken image.
                                                    event.currentTarget.style.display =
                                                        "none"

                                                    // Show the fallback.
                                                    const fallback =
                                                        event.currentTarget
                                                            .parentElement
                                                            ?.querySelector(
                                                                ".thafari-image-error"
                                                            )

                                                    if (fallback) {
                                                        fallback.style.display =
                                                            "flex"
                                                    }
                                                }}
                                            />

                                        ) : null}


                                        {/* -------------------------------------------------
                                            IMAGE FALLBACK
                                        ------------------------------------------------- */}

                                        <div
                                            className="thafari-image-error"
                                            style={{
                                                display: tourImage
                                                    ? "none"
                                                    : "flex",
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


                                    {/* =================================================
                                        TOUR INFORMATION
                                    ================================================= */}

                                    <div className="tour-card-content">

                                        {/* Destination */}

                                        <p className="tour-destination">

                                            📍{" "}
                                            {tour.destination}

                                        </p>


                                        {/* Tour name */}

                                        <h2>
                                            {tour.tour_name}
                                        </h2>


                                        {/* =================================================
                                            TOUR PRICE
                                        ================================================= */}

                                        <div className="tour-price">

                                            {hasStartingPrice ? (

                                                <>

                                                    <span>
                                                        Starting from
                                                    </span>

                                                    <strong>
                                                        KES{" "}
                                                        {Number(
                                                            tour.starting_price
                                                        ).toLocaleString()}
                                                    </strong>

                                                </>

                                            ) : (

                                                <span className="tour-no-price">
                                                    No upcoming departures
                                                </span>

                                            )}

                                        </div>


                                        {/* =================================================
                                            VIEW DETAILS
                                        ================================================= */}

                                        <button
                                            className="view-tour-button"
                                            onClick={() =>
                                                navigate(
                                                    `/tours/${tour.tour_id}`
                                                )
                                            }
                                        >
                                            View Details
                                        </button>

                                    </div>

                                </article>

                            )
                        })}

                    </div>

                )}

            </section>

        </div>
    )
}


export default Tours