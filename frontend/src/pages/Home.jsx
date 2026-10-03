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
