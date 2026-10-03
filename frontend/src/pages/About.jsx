// =========================================================
// THAFARI ABOUT US PAGE
// =========================================================
//
// This page introduces Thafari as a broader travel platform,
// rather than positioning the brand as a Kenya-only tour site.
//
// It is intentionally content-focused and does not depend on
// backend data, so it can be displayed publicly without login.
//
// =========================================================

import {
    Link,
} from "react-router-dom"

import "./About.css"


// =========================================================
// ABOUT PAGE
// =========================================================

function About() {

    return (

        <main className="about-page">


            {/* =================================================
                HERO
            ================================================= */}

            <section className="about-hero">

                <div className="about-hero-overlay"></div>

                <div className="about-container about-hero-content">

                    <p className="about-eyebrow">
                        THAFARI • TRAVEL WITHOUT LIMITS
                    </p>

                    <h1>
                        More than a destination.
                        <span>
                            It is the journey.
                        </span>
                    </h1>

                    <p className="about-hero-text">
                        Thafari is a travel platform built to connect
                        travellers with unforgettable tours, safaris
                        and experiences across Africa and, as we grow,
                        destinations beyond it.
                    </p>

                    <div className="about-hero-actions">

                        <Link
                            to="/tours"
                            className="about-primary-button"
                        >
                            Explore experiences
                            <span>→</span>
                        </Link>

                        <Link
                            to="/register"
                            className="about-secondary-button"
                        >
                            Join Thafari
                        </Link>

                    </div>

                </div>

            </section>


            {/* =================================================
                INTRODUCTION
            ================================================= */}

            <section className="about-section about-introduction">

                <div className="about-container about-two-column">

                    <div className="about-section-heading">

                        <p className="about-eyebrow">
                            WHO WE ARE
                        </p>

                        <h2>
                            Travel should feel
                            <span>
                                exciting from the start.
                            </span>
                        </h2>

                    </div>

                    <div className="about-section-copy">

                        <p>
                            Thafari brings travellers and tour operators
                            together in one place, making it easier to
                            discover experiences, compare options, plan
                            adventures and make bookings.
                        </p>

                        <p>
                            We started with a strong connection to East
                            African travel, but the vision is bigger than
                            one country. Thafari is designed to grow into
                            a platform where travellers can discover
                            different landscapes, cultures, cities,
                            wildlife experiences and adventures across
                            Africa and beyond.
                        </p>

                        <p>
                            Whether you are planning a weekend escape,
                            a wildlife adventure, a cultural experience
                            or a longer journey, Thafari is built around
                            one simple idea: making the journey easier
                            to discover and enjoy.
                        </p>

                    </div>

                </div>

            </section>


            {/* =================================================
                WHAT THAFARI DOES
            ================================================= */}

            <section className="about-section about-platform-section">

                <div className="about-container">

                    <div className="about-centered-heading">

                        <p className="about-eyebrow">
                            THE THAFARI EXPERIENCE
                        </p>

                        <h2>
                            Everything you need to
                            <span>
                                plan the adventure.
                            </span>
                        </h2>

                        <p>
                            Thafari brings the important parts of the
                            travel journey together so travellers and
                            tour operators can focus on the experience.
                        </p>

                    </div>


                    <div className="about-feature-grid">


                        <article className="about-feature-card">

                            <div className="about-feature-icon">
                                🌍
                            </div>

                            <h3>
                                Discover
                            </h3>

                            <p>
                                Explore tours, safaris and experiences
                                and discover places you may not have
                                considered before.
                            </p>

                        </article>


                        <article className="about-feature-card">

                            <div className="about-feature-icon">
                                🗺️
                            </div>

                            <h3>
                                Plan
                            </h3>

                            <p>
                                Understand what an experience includes,
                                explore itineraries and choose an option
                                that fits your travel plans.
                            </p>

                        </article>


                        <article className="about-feature-card">

                            <div className="about-feature-icon">
                                🧳
                            </div>

                            <h3>
                                Book
                            </h3>

                            <p>
                                Move from discovering an experience to
                                making a booking through a clear,
                                structured process.
                            </p>

                        </article>


                        <article className="about-feature-card">

                            <div className="about-feature-icon">
                                💬
                            </div>

                            <h3>
                                Connect
                            </h3>

                            <p>
                                Stay connected with tour operators and
                                receive important updates throughout
                                your booking journey.
                            </p>

                        </article>


                    </div>

                </div>

            </section>


            {/* =================================================
                FOR TRAVELLERS
            ================================================= */}

            <section className="about-section about-travellers-section">

                <div className="about-container about-two-column">

                    <div className="about-image-panel about-traveller-panel">

                        <div className="about-image-panel-content">

                            <span>
                                FOR TRAVELLERS
                            </span>

                            <strong>
                                Your next story
                                starts somewhere.
                            </strong>

                        </div>

                    </div>


                    <div className="about-content-panel">

                        <p className="about-eyebrow">
                            FOR TRAVELLERS
                        </p>

                        <h2>
                            Find experiences worth
                            <span>
                                remembering.
                            </span>
                        </h2>

                        <p>
                            Travelling is more than getting from one
                            place to another. It is the people you meet,
                            the places you see and the moments you carry
                            home.
                        </p>

                        <p>
                            Thafari gives travellers a place to discover
                            experiences, understand what is included,
                            review departure options and move through
                            the booking process with confidence.
                        </p>

                        <Link
                            to="/tours"
                            className="about-text-link"
                        >
                            Discover tours
                            <span>→</span>
                        </Link>

                    </div>

                </div>

            </section>


            {/* =================================================
                FOR TOUR OPERATORS
            ================================================= */}

            <section className="about-section about-operators-section">

                <div className="about-container about-two-column reverse">

                    <div className="about-content-panel">

                        <p className="about-eyebrow">
                            FOR TOUR OPERATORS
                        </p>

                        <h2>
                            Put your experiences
                            <span>
                                in front of travellers.
                            </span>
                        </h2>

                        <p>
                            Tour operators are an important part of the
                            Thafari ecosystem. The platform is designed
                            to help operators present their tours,
                            manage departures, communicate with
                            customers and keep their experiences
                            organised.
                        </p>

                        <p>
                            From tour information and imagery to
                            packages, itineraries and customer
                            communication, Thafari brings the operational
                            side of travel into one workspace.
                        </p>

                        <Link
                            to="/register"
                            className="about-text-link"
                        >
                            Join Thafari
                            <span>→</span>
                        </Link>

                    </div>


                    <div className="about-image-panel about-operator-panel">

                        <div className="about-image-panel-content">

                            <span>
                                FOR TOUR OPERATORS
                            </span>

                            <strong>
                                Share the experiences
                                you create.
                            </strong>

                        </div>

                    </div>

                </div>

            </section>


            {/* =================================================
                VALUES
            ================================================= */}

            <section className="about-section about-values-section">

                <div className="about-container">

                    <div className="about-centered-heading">

                        <p className="about-eyebrow">
                            WHAT MATTERS TO US
                        </p>

                        <h2>
                            Built around the way
                            <span>
                                people travel.
                            </span>
                        </h2>

                    </div>


                    <div className="about-values-grid">


                        <article className="about-value">

                            <span>
                                01
                            </span>

                            <div>

                                <h3>
                                    Discovery
                                </h3>

                                <p>
                                    We want travel to open doors to
                                    places, people and experiences that
                                    travellers might otherwise miss.
                                </p>

                            </div>

                        </article>


                        <article className="about-value">

                            <span>
                                02
                            </span>

                            <div>

                                <h3>
                                    Simplicity
                                </h3>

                                <p>
                                    Travel planning can be complicated.
                                    We aim to make discovering and
                                    booking experiences easier to
                                    understand.
                                </p>

                            </div>

                        </article>


                        <article className="about-value">

                            <span>
                                03
                            </span>

                            <div>

                                <h3>
                                    Connection
                                </h3>

                                <p>
                                    Great travel involves people.
                                    Thafari creates a direct connection
                                    between travellers and the operators
                                    behind their experiences.
                                </p>

                            </div>

                        </article>


                        <article className="about-value">

                            <span>
                                04
                            </span>

                            <div>

                                <h3>
                                    Growth
                                </h3>

                                <p>
                                    Our vision is not limited to one
                                    destination. We are building a
                                    platform that can grow with the
                                    travellers and operators who use it.
                                </p>

                            </div>

                        </article>


                    </div>

                </div>

            </section>


            {/* =================================================
                VISION
            ================================================= */}

            <section className="about-vision">

                <div className="about-container">

                    <div className="about-vision-card">

                        <p className="about-eyebrow">
                            OUR VISION
                        </p>

                        <h2>
                            A world where discovering
                            your next adventure is simple.
                        </h2>

                        <p>
                            Today, Thafari is growing from its East
                            African roots. Tomorrow, the platform can
                            connect travellers with experiences across
                            more destinations, cultures and landscapes.
                        </p>

                    </div>

                </div>

            </section>


            {/* =================================================
                FINAL CTA
            ================================================= */}

            <section className="about-section about-cta-section">

                <div className="about-container about-cta-content">

                    <p className="about-eyebrow">
                        YOUR NEXT ADVENTURE
                    </p>

                    <h2>
                        Where will your journey
                        <span>
                            take you?
                        </span>
                    </h2>

                    <p>
                        Explore Thafari and start discovering experiences
                        made for curious travellers.
                    </p>

                    <div className="about-cta-actions">

                        <Link
                            to="/tours"
                            className="about-primary-button"
                        >
                            Explore tours
                            <span>→</span>
                        </Link>

                        <Link
                            to="/"
                            className="about-secondary-button"
                        >
                            Back home
                        </Link>

                    </div>

                </div>

            </section>


        </main>
    )
}


export default About
