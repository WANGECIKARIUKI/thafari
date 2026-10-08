// =========================================================
// THAFARI GENERAL FAQ PAGE
// =========================================================
//
// This page contains general platform FAQs.
//
// IMPORTANT:
// These are different from tour-specific FAQs.
// Tour-specific FAQs continue to appear on TourDetails.jsx.
//
// Route intended for this page:
// /faqs
//
// =========================================================

import { useMemo, useState } from "react"
import { Link } from "react-router-dom"

import "./FAQs.css"


// =========================================================
// FAQ DATA
// =========================================================

const FAQ_CATEGORIES = [
    {
        id: "booking",
        label: "Booking & Reservations",
        icon: "🦁",
        description:
            "How to find, reserve and manage your safari experience.",
        questions: [
            {
                question: "How do I book a tour on Thafari?",
                answer:
                    "Browse the available tours, open the tour you are interested in, choose an available departure and continue to the booking page. You will be guided through the reservation and payment process.",
            },
            {
                question: "Do I need an account to make a booking?",
                answer:
                    "Yes. A Thafari account allows your booking to be linked to you so you can view its status, receive notifications and manage your travel information from your dashboard.",
            },
            {
                question: "Where can I see my bookings?",
                answer:
                    "After signing in, open your customer dashboard and go to your bookings. You can view the tours you have reserved together with their current booking status.",
            },
            {
                question: "What does a pending booking mean?",
                answer:
                    "A pending booking has been created but has not yet reached confirmed status. Depending on the payment method and booking flow, payment or verification may still be required.",
            },
            {
                question: "When is my booking confirmed?",
                answer:
                    "Your booking is confirmed once the required payment process has been completed and the booking has been successfully confirmed in Thafari.",
            },
        ],
    },
    {
        id: "payments",
        label: "Payments",
        icon: "💳",
        description:
            "Information about paying for your booking and payment verification.",
        questions: [
            {
                question: "How do I pay for a booking?",
                answer:
                    "After creating a booking, follow the payment options shown in Thafari. The available payment flow will guide you through the steps required to complete your payment.",
            },
            {
                question: "Why is my payment still pending?",
                answer:
                    "Some payments may require processing or verification before they are marked as successful. You can check your dashboard and notifications for updates to your payment and booking status.",
            },
            {
                question: "How will I know when my payment has been verified?",
                answer:
                    "Thafari updates the payment and booking status when verification is completed. You can also receive an in-app notification when there is an important update.",
            },
            {
                question: "Can I view my payment status later?",
                answer:
                    "Yes. Your account keeps your booking and payment information connected so you can return to your dashboard and check the latest status.",
            },
        ],
    },
    {
        id: "departures",
        label: "Departures",
        icon: "🗓️",
        description:
            "Travel dates, availability and choosing the right departure.",
        questions: [
            {
                question: "What is a departure?",
                answer:
                    "A departure is a scheduled travel date for a tour. A tour can have different departures, each with its own dates, availability and price information.",
            },
            {
                question: "How do I choose my travel date?",
                answer:
                    "Open the tour details page and review its upcoming departures. Select the departure that matches your preferred dates and continue to booking.",
            },
            {
                question: "What happens if a departure is fully booked?",
                answer:
                    "A fully booked departure cannot accept additional bookings. You can check whether the same tour has another available departure or explore other tours on Thafari.",
            },
            {
                question: "Where can I see how many seats are available?",
                answer:
                    "Available seat information is shown with the departure details when that information is available for booking.",
            },
        ],
    },
    {
        id: "cancellations",
        label: "Cancellations & Refunds",
        icon: "↩️",
        description:
            "What to expect when requesting a cancellation or refund.",
        questions: [
            {
                question: "Can I request to cancel a booking?",
                answer:
                    "If your booking is eligible for cancellation, you can submit a cancellation request through the available booking management options in your account.",
            },
            {
                question: "Does cancelling automatically mean I receive a refund?",
                answer:
                    "Not necessarily. Cancellation and refund handling are connected but are not the same action. Refund eligibility and processing depend on the booking and the applicable cancellation process.",
            },
            {
                question: "How can I check my cancellation request?",
                answer:
                    "Sign in to Thafari and review your booking and cancellation information. Status changes can also be communicated through your in-app notifications.",
            },
            {
                question: "How will I know if my refund status changes?",
                answer:
                    "You can review the relevant booking information in your account and check your notifications for updates during the refund process.",
            },
        ],
    },
    {
        id: "tours",
        label: "Tours & Travel",
        icon: "🧳",
        description:
            "Understanding tour packages before you reserve your adventure.",
        questions: [
            {
                question: "Where can I see what happens during a tour?",
                answer:
                    "Open the tour details page and review its itinerary. When provided by the tour operator, the itinerary gives you a day-by-day view of the experience.",
            },
            {
                question: "Where can I find accommodation information?",
                answer:
                    "Accommodation information is displayed on the tour details page when it has been provided for that tour. It can include the accommodation name, category, location, room type, meal plan and description.",
            },
            {
                question: "Do individual tours have their own FAQs?",
                answer:
                    "Yes. Tour operators can provide questions and answers that are specific to an individual tour. You will find those FAQs on the relevant tour details page when they are available.",
            },
            {
                question: "Are all tours the same length?",
                answer:
                    "No. Tour duration depends on the experience. Check the duration and itinerary on the individual tour page before booking.",
            },
        ],
    },
    {
        id: "account",
        label: "Your Account",
        icon: "👤",
        description:
            "Your profile, notifications and communication on Thafari.",
        questions: [
            {
                question: "What can I manage from my Thafari account?",
                answer:
                    "Your account gives you access to your profile and the customer features connected to your trips, including bookings, payment information, notifications and conversations.",
            },
            {
                question: "Why should I check my notifications?",
                answer:
                    "Notifications help you keep track of important activity such as booking, payment, cancellation, refund and other travel-related updates.",
            },
            {
                question: "Can I communicate with a tour operator on Thafari?",
                answer:
                    "Yes. Thafari includes in-app conversations so customers can communicate with tour operators through the platform.",
            },
            {
                question: "Can I update my profile?",
                answer:
                    "Thafari includes a profile area where you can view your account information. Available editing options depend on the profile features currently enabled for your account.",
            },
        ],
    },
]


// =========================================================
// FAQ PAGE
// =========================================================

function FAQs() {

    const [activeCategory, setActiveCategory] = useState("all")
    const [searchTerm, setSearchTerm] = useState("")


    // =====================================================
    // FILTER FAQS
    // =====================================================

    const visibleCategories = useMemo(() => {

        const query = searchTerm.trim().toLowerCase()

        return FAQ_CATEGORIES
            .filter(category =>
                activeCategory === "all" ||
                category.id === activeCategory
            )
            .map(category => {

                if (!query) {
                    return category
                }

                const questions = category.questions.filter(item =>
                    item.question.toLowerCase().includes(query) ||
                    item.answer.toLowerCase().includes(query) ||
                    category.label.toLowerCase().includes(query)
                )

                return {
                    ...category,
                    questions,
                }
            })
            .filter(category => category.questions.length > 0)

    }, [activeCategory, searchTerm])


    const totalQuestions = FAQ_CATEGORIES.reduce(
        (total, category) =>
            total + category.questions.length,
        0
    )


    // =====================================================
    // RENDER
    // =====================================================

    return (
        <main className="general-faq-page">

            {/* =================================================
                HERO
            ================================================= */}

            <section className="general-faq-hero">

                <div className="general-faq-hero-glow"></div>

                <div className="general-faq-hero-content">

                    <span className="general-faq-eyebrow">
                        THAFARI HELP CENTRE
                    </span>

                    <h1>
                        Frequently Asked Questions
                    </h1>

                    <p>
                        Everything you need to know about discovering,
                        booking and managing your next Thafari adventure.
                    </p>

                    <div className="general-faq-search">

                        <span
                            className="general-faq-search-icon"
                            aria-hidden="true"
                        >
                            ⌕
                        </span>

                        <input
                            type="search"
                            value={searchTerm}
                            onChange={event =>
                                setSearchTerm(event.target.value)
                            }
                            placeholder="Search questions..."
                            aria-label="Search frequently asked questions"
                        />

                        {searchTerm && (
                            <button
                                type="button"
                                className="general-faq-clear"
                                onClick={() => setSearchTerm("")}
                                aria-label="Clear FAQ search"
                            >
                                ×
                            </button>
                        )}

                    </div>

                </div>

            </section>


            {/* =================================================
                MAIN FAQ CONTENT
            ================================================= */}

            <section className="general-faq-content">

                <div className="general-faq-container">

                    <div className="general-faq-intro">

                        <div>

                            <span className="general-faq-section-label">
                                FIND YOUR ANSWER
                            </span>

                            <h2>
                                How can we help?
                            </h2>

                            <p>
                                Browse by topic or search across our
                                most common questions.
                            </p>

                        </div>

                        <div className="general-faq-count">

                            <strong>
                                {totalQuestions}
                            </strong>

                            <span>
                                helpful answers
                            </span>

                        </div>

                    </div>


                    {/* =============================================
                        CATEGORY NAVIGATION
                    ============================================= */}

                    <div
                        className="general-faq-category-marquee"
                        aria-label="FAQ categories"
                    >

                        <div className="general-faq-category-track">

                            <div
                                className="general-faq-category-set"
                                role="tablist"
                                aria-label="FAQ categories"
                            >

                                <button
                                    type="button"
                                    role="tab"
                                    aria-selected={activeCategory === "all"}
                                    className={
                                        activeCategory === "all"
                                            ? "general-faq-category active"
                                            : "general-faq-category"
                                    }
                                    onClick={() =>
                                        setActiveCategory("all")
                                    }
                                >
                                    <span>✦</span>
                                    All Questions
                                </button>


                                {FAQ_CATEGORIES.map(category => (

                                    <button
                                        key={category.id}
                                        type="button"
                                        role="tab"
                                        aria-selected={
                                            activeCategory === category.id
                                        }
                                        className={
                                            activeCategory === category.id
                                                ? "general-faq-category active"
                                                : "general-faq-category"
                                        }
                                        onClick={() =>
                                            setActiveCategory(category.id)
                                        }
                                    >
                                        <span>
                                            {category.icon}
                                        </span>

                                        {category.label}

                                    </button>

                                ))}

                            </div>


                            {/* Duplicate set creates a seamless automatic loop. */}
                            <div
                                className="general-faq-category-set"
                                aria-hidden="true"
                            >

                                <button
                                    type="button"
                                    tabIndex="-1"
                                    className={
                                        activeCategory === "all"
                                            ? "general-faq-category active"
                                            : "general-faq-category"
                                    }
                                    onClick={() =>
                                        setActiveCategory("all")
                                    }
                                >
                                    <span>✦</span>
                                    All Questions
                                </button>


                                {FAQ_CATEGORIES.map(category => (

                                    <button
                                        key={`duplicate-${category.id}`}
                                        type="button"
                                        tabIndex="-1"
                                        className={
                                            activeCategory === category.id
                                                ? "general-faq-category active"
                                                : "general-faq-category"
                                        }
                                        onClick={() =>
                                            setActiveCategory(category.id)
                                        }
                                    >
                                        <span>
                                            {category.icon}
                                        </span>

                                        {category.label}

                                    </button>

                                ))}

                            </div>

                        </div>

                    </div>


                    {/* =============================================
                        FAQ GROUPS
                    ============================================= */}

                    <div className="general-faq-groups">

                        {visibleCategories.length > 0 ? (

                            visibleCategories.map(category => (

                                <section
                                    className="general-faq-group"
                                    key={category.id}
                                >

                                    <div className="general-faq-group-heading">

                                        <div className="general-faq-group-icon">
                                            {category.icon}
                                        </div>

                                        <div>

                                            <h2>
                                                {category.label}
                                            </h2>

                                            <p>
                                                {category.description}
                                            </p>

                                        </div>

                                    </div>


                                    <div className="general-faq-list">

                                        {category.questions.map(
                                            (item, index) => (

                                                <details
                                                    className="general-faq-item"
                                                    key={`${category.id}-${index}`}
                                                >

                                                    <summary>

                                                        <span className="general-faq-question">
                                                            {item.question}
                                                        </span>

                                                        <span
                                                            className="general-faq-plus"
                                                            aria-hidden="true"
                                                        >
                                                            +
                                                        </span>

                                                    </summary>


                                                    <div className="general-faq-answer">

                                                        <p>
                                                            {item.answer}
                                                        </p>

                                                    </div>

                                                </details>

                                            )
                                        )}

                                    </div>

                                </section>

                            ))

                        ) : (

                            <div className="general-faq-empty">

                                <span>
                                    🔎
                                </span>

                                <h3>
                                    No matching questions
                                </h3>

                                <p>
                                    Try another search or browse all
                                    FAQ categories.
                                </p>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearchTerm("")
                                        setActiveCategory("all")
                                    }}
                                >
                                    View all questions
                                </button>

                            </div>

                        )}

                    </div>

                </div>

            </section>


            {/* =================================================
                TOUR-SPECIFIC FAQ NOTE
            ================================================= */}

            <section className="general-faq-tour-note">

                <div className="general-faq-tour-note-inner">

                    <div className="general-faq-tour-note-icon">
                        🐘
                    </div>

                    <div>

                        <span>
                            LOOKING FOR TOUR-SPECIFIC INFORMATION?
                        </span>

                        <h2>
                            Every adventure is different.
                        </h2>

                        <p>
                            Individual tours can include their own FAQs,
                            itinerary and accommodation information.
                            Open a tour to see the details provided for
                            that experience.
                        </p>

                    </div>

                    <Link
                        to="/tours"
                        className="general-faq-tours-link"
                    >
                        Explore tours
                        <span>
                            →
                        </span>
                    </Link>

                </div>

            </section>


            {/* =================================================
                FINAL CTA
            ================================================= */}

            <section className="general-faq-cta">

                <div className="general-faq-cta-content">

                    <span className="general-faq-eyebrow">
                        READY TO EXPLORE?
                    </span>

                    <h2>
                        Your next journey starts here.
                    </h2>

                    <p>
                        Discover safari experiences, compare departures
                        and find the adventure that fits your plans.
                    </p>

                    <Link
                        to="/tours"
                        className="general-faq-cta-button"
                    >
                        Discover tours
                        <span>
                            →
                        </span>
                    </Link>

                </div>

            </section>

        </main>
    )
}


export default FAQs