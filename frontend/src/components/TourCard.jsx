// =========================================================
// THAFARI TOUR CARD
// =========================================================
//
// Displays a single safari tour.
//
// The card shows:
// - Tour image
// - Destination
// - Tour name
// - Starting price
// - View Details button
//
// Image priority:
// 1. Cover image
// 2. First gallery image
// 3. Thafari fallback
//
// If the tour has no upcoming departures, we display:
// "No upcoming departures"
//
// =========================================================

import { Link } from "react-router-dom"

import "./TourCard.css"


function TourCard({ tour }) {

    // ---------------------------------------------------------
    // CHECK WHETHER THE TOUR HAS A STARTING PRICE
    // ---------------------------------------------------------
    //
    // The backend returns:
    //
    // "starting_price": "18000.00"
    //
    // when there is an upcoming departure.
    //
    // If there are no upcoming departures, it returns:
    //
    // "starting_price": null
    //
    // We check for null before trying to format the price.
    // ---------------------------------------------------------

    const hasStartingPrice =
        tour.starting_price !== null &&
        tour.starting_price !== undefined &&
        tour.starting_price !== ""


    // ---------------------------------------------------------
    // TOUR IMAGE
    // ---------------------------------------------------------
    //
    // Use the cover image first.
    //
    // If there is no cover image, use the first gallery image.
    //
    // If neither exists, the Thafari fallback is displayed.
    // ---------------------------------------------------------

    const tourImage =
        tour.cover_image ||
        (
            Array.isArray(tour.gallery_images)
                ? tour.gallery_images[0]
                : ""
        )


    // ---------------------------------------------------------
    // IMAGE ERROR HANDLER
    // ---------------------------------------------------------
    //
    // If an image URL exists but the image cannot be loaded,
    // hide the broken image and show the Thafari fallback.
    // ---------------------------------------------------------

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


    return (

        <article className="tour-card">

            {/* =================================================
                TOUR IMAGE AREA
            ================================================= */}

            <div className="tour-card-image thafari-image-container thafari-image-tour-cover">

                {tourImage ? (

                    <img
                        className="thafari-image"
                        src={tourImage}
                        alt={`${tour.tour_name} safari`}
                        loading="lazy"
                        onError={handleImageError}
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


            {/* =================================================
                TOUR CONTENT
            ================================================= */}

            <div className="tour-card-content">

                {/* Destination */}

                <p className="tour-card-destination">
                    📍 {tour.destination}
                </p>


                {/* Tour name */}

                <h3>
                    {tour.tour_name}
                </h3>


                {/* =================================================
                    CARD FOOTER
                ================================================= */}

                <div className="tour-card-footer">

                    {/* ---------------------------------------------
                        STARTING PRICE
                    --------------------------------------------- */}

                    <div className="tour-card-price">

                        {hasStartingPrice ? (

                            <>

                                <span className="tour-card-price-label">
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

                            <span className="tour-card-no-price">
                                No upcoming departures
                            </span>

                        )}

                    </div>


                    {/* ---------------------------------------------
                        VIEW DETAILS
                    --------------------------------------------- */}

                    <Link
                        to={`/tours/${tour.tour_id}`}
                        className="tour-card-button"
                    >
                        View Details
                    </Link>

                </div>

            </div>

        </article>
    )
}


export default TourCard