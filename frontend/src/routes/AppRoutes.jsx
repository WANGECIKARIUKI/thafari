// =========================================================
// THAFARI APPLICATION ROUTES
// =========================================================
//
// This file contains the frontend routes for the Thafari
// application.
//
// Public/customer pages and staff-management pages are kept
// inside the PublicLayout so the application's normal navbar
// and footer continue to be available.
//
// Direct payment management is separated into:
// - Pending
// - Successful
// - Rejected
//
// Cancellation request management is separated into:
// - Pending
// - Approved
// - Denied
//
// In-app messaging is separated into:
// - Conversations
// - Individual Chat
//
// Business Intelligence is available to administrators at:
// - /admin/business-intelligence
//
// =========================================================


import {
    Link,
    Navigate,
    Route,
    Routes,
} from "react-router-dom"

import { useAuth } from "../context/AuthContext"


// =========================================================
// LAYOUT
// =========================================================

import PublicLayout from "../layouts/PublicLayout"


// =========================================================
// PAGES
// =========================================================

import Home from "../pages/Home"

import About from "../pages/About"

import FAQs from "../pages/FAQs"

import Tours from "../pages/Tours"

import TourDetails from "../pages/TourDetails"

import Booking from "../pages/Booking"

import BookingView from "../pages/BookingView"

import PaymentResult from "../pages/PaymentResult"

import Register from "../pages/Register"

import Login from "../pages/Login"

import ForgotPassword from "../pages/ForgotPassword"

import ResetPassword from "../pages/ResetPassword"

import Dashboard from "../pages/Dashboard"

import Notifications from "../pages/Notifications"

import DirectPayments from "../pages/DirectPayments"

import CancellationRequests from "../pages/CancellationRequests"

import AdminTours from "../pages/AdminTours"

import AdminServices from "../pages/AdminServices"

import AdminContact from "../pages/AdminContact"

import OperatorTours from "../pages/OperatorTours"

import BusinessIntelligence from "../pages/BusinessIntelligence"

import Profile from "../pages/Profile"

import UserManagement from "../pages/UserManagement"

import AdminPaymentSettings from "../pages/AdminPaymentSettings"

import AdminReviews from "../pages/AdminReviews"

import AdminGuestInquiries from "../pages/AdminGuestInquiries"


// =========================================================
// CHAT PAGES
// =========================================================

import Conversations from "../pages/Conversations"

import Chat from "../pages/Chat"


// =========================================================
// PAGE STYLES
// =========================================================
//
// These are imported here so the chat pages receive their
// styling when their routes are loaded.
//
// =========================================================

import "../pages/Conversations.css"

import "../pages/Chat.css"


// =========================================================
// ACCESS DENIED / AUTHENTICATED ROUTE GUARD
// =========================================================
//
// Restricted pages use this wrapper so customers do not get
// silently redirected to the customer dashboard when they try
// to open an admin or tour-operator page manually.
//
// The backend remains the final authority. This component is a
// frontend UX/access layer only.
// =========================================================

function RoleProtectedRoute({
    allowedRoles,
    eyebrow,
    title,
    message,
    children,
}) {

    const {
        user,
        isAuthenticated,
        authLoading,
    } = useAuth()


    // ---------------------------------------------------------
    // AUTHENTICATION LOADING
    // ---------------------------------------------------------

    if (authLoading) {

        return (
            <main className="thafari-route-feedback-page">

                <section className="thafari-route-feedback-card">

                    <p className="thafari-route-feedback-eyebrow">
                        THAFARI
                    </p>

                    <h1>
                        Checking access...
                    </h1>

                    <p>
                        Please wait while we verify your session.
                    </p>

                </section>

            </main>
        )
    }


    // ---------------------------------------------------------
    // NOT AUTHENTICATED
    // ---------------------------------------------------------

    if (!isAuthenticated || !user) {

        return (
            <Navigate
                to="/login"
                replace
            />
        )
    }


    // ---------------------------------------------------------
    // ROLE NOT ALLOWED
    // ---------------------------------------------------------

    if (
        !allowedRoles.includes(
            user.role
        )
    ) {

        return (
            <main className="thafari-route-feedback-page">

                <section className="thafari-route-feedback-card">

                    <p className="thafari-route-feedback-eyebrow">
                        {eyebrow || "THAFARI • RESTRICTED AREA"}
                    </p>

                    <h1>
                        {title || "Access denied"}
                    </h1>

                    <p>
                        {message || "You do not have permission to access this area."}
                    </p>

                    <Link
                        to="/dashboard"
                        className="thafari-route-feedback-button"
                    >
                        Back to Dashboard
                    </Link>

                </section>

            </main>
        )
    }


    // ---------------------------------------------------------
    // AUTHORIZED
    // ---------------------------------------------------------

    return children
}


// =========================================================
// NOT FOUND PAGE
// =========================================================
//
// This catches URLs that do not match any registered route so
// users never land on a blank page.
// =========================================================

function NotFound() {

    return (
        <main className="thafari-route-feedback-page">

            <section className="thafari-route-feedback-card">

                <p className="thafari-route-feedback-code">
                    404
                </p>

                <p className="thafari-route-feedback-eyebrow">
                    THAFARI • PAGE NOT FOUND
                </p>

                <h1>
                    This page does not exist
                </h1>

                <p>
                    The page you are looking for does not exist,
                    may have moved, or the address may be incorrect.
                </p>

                <Link
                    to="/"
                    className="thafari-route-feedback-button"
                >
                    Back to Home
                </Link>

            </section>

        </main>
    )
}


// =========================================================
// ROUTE FEEDBACK STYLES
// =========================================================
//
// These styles live here so the new access-denied and 404
// screens work without requiring a separate CSS file.
// =========================================================

const routeFeedbackStyles = `
    .thafari-route-feedback-page {
        min-height: 60vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 60px 6%;
        background: #f7f6f1;
    }

    .thafari-route-feedback-card {
        width: 100%;
        max-width: 900px;
        padding: 56px 48px;
        text-align: center;
        background: #ffffff;
        border: 1px solid #e8e5de;
        border-radius: 24px;
        box-shadow: 0 18px 50px rgba(36, 56, 43, 0.08);
    }

    .thafari-route-feedback-code {
        margin: 0 0 8px;
        color: #bca878;
        font-size: 4.5rem;
        font-weight: 800;
        line-height: 1;
    }

    .thafari-route-feedback-eyebrow {
        margin: 0 0 12px;
        color: #61745f;
        font-size: 0.85rem;
        font-weight: 800;
        letter-spacing: 0.14em;
        text-transform: uppercase;
    }

    .thafari-route-feedback-card h1 {
        margin: 0 0 16px;
        color: #24382b;
        font-family: Georgia, "Times New Roman", serif;
        font-size: clamp(2rem, 5vw, 3.5rem);
        line-height: 1.1;
    }

    .thafari-route-feedback-card p:not(.thafari-route-feedback-eyebrow):not(.thafari-route-feedback-code) {
        max-width: 680px;
        margin: 0 auto 28px;
        color: #61745f;
        font-size: 1.05rem;
        line-height: 1.7;
    }

    .thafari-route-feedback-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 46px;
        padding: 0 22px;
        border-radius: 6px;
        background: #24382b;
        color: #ffffff;
        text-decoration: none;
        font-size: 0.95rem;
        font-weight: 700;
        transition: background-color 0.2s ease, transform 0.2s ease;
    }

    .thafari-route-feedback-button:hover {
        background: #17221b;
        transform: translateY(-1px);
    }

    @media (max-width: 600px) {
        .thafari-route-feedback-page {
            padding: 40px 5%;
        }

        .thafari-route-feedback-card {
            padding: 40px 24px;
            border-radius: 18px;
        }

        .thafari-route-feedback-code {
            font-size: 3.5rem;
        }
    }
`


function RouteFeedbackStyles() {

    return (
        <style>
            {routeFeedbackStyles}
        </style>
    )
}


// =========================================================
// APP ROUTES
// =========================================================

function AppRoutes() {

    return (

        <>

            <RouteFeedbackStyles />

            <Routes>


            {/* =====================================================
                PUBLIC LAYOUT
            ===================================================== */}

            <Route
                element={<PublicLayout />}
            >


                {/* =================================================
                    HOME
                ================================================= */}

                <Route
                    path="/"
                    element={<Home />}
                />


                {/* =================================================
                    ABOUT US
                ================================================= */}

                <Route
                    path="/about"
                    element={<About />}
                />


                {/* =================================================
                    FREQUENTLY ASKED QUESTIONS
                ================================================= */}

                <Route
                    path="/faqs"
                    element={<FAQs />}
                />


                {/* =================================================
                    PUBLIC TOURS
                ================================================= */}

                <Route
                    path="/tours"
                    element={<Tours />}
                />


                <Route
                    path="/tours/:tourId"
                    element={<TourDetails />}
                />


                {/* =================================================
                    BOOKING CREATION
                ================================================= */}

                <Route
                    path="/booking/:departureId"
                    element={<Booking />}
                />


                {/* =================================================
                    EXISTING BOOKING VIEW

                    Example:

                    /booking/view/37

                    This is used by booking notifications and
                    allows a customer to open an existing booking.
                ================================================= */}

                <Route
                    path="/booking/view/:bookingId"
                    element={<BookingView />}
                />


                {/* =================================================
                    PAYMENT RESULT
                ================================================= */}

                <Route
                    path="/payment/result"
                    element={<PaymentResult />}
                />


                {/* =================================================
                    AUTHENTICATION
                ================================================= */}

                <Route
                    path="/register"
                    element={<Register />}
                />


                <Route
                    path="/login"
                    element={<Login />}
                />


                <Route
                    path="/forgot-password"
                    element={<ForgotPassword />}
                />


                <Route
                    path="/reset-password"
                    element={<ResetPassword />}
                />


                {/* =================================================
                    MAIN DASHBOARD
                ================================================= */}

                <Route
                    path="/dashboard"
                    element={<Dashboard />}
                />


                {/* =================================================
                    MANAGE PROFILE
                =================================================

                    This page is shared by customers, tour operators
                    and administrators.

                    URL:

                    /profile
                ================================================= */}

                <Route
                    path="/profile"
                    element={<Profile />}
                />


                {/* =================================================
                    NOTIFICATIONS
                ================================================= */}

                <Route
                    path="/notifications"
                    element={<Notifications />}
                />


                {/* =================================================
                    IN-APP MESSAGING
                ================================================= */}

                {/* -----------------------------------------------
                    CONVERSATION LIST

                    Example:

                    /conversations

                    Displays all conversations belonging to the
                    currently authenticated user.
                ------------------------------------------------ */}

                <Route
                    path="/conversations"
                    element={<Conversations />}
                />


                {/* -----------------------------------------------
                    INDIVIDUAL CHAT

                    Example:

                    /chat/12

                    Opens conversation ID 12.
                ------------------------------------------------ */}

                <Route
                    path="/chat/:conversationId"
                    element={<Chat />}
                />


                {/* =================================================
                    DIRECT PAYMENTS

                    OLD /admin/direct-payments URL

                    Keep this route so existing notifications,
                    bookmarks or links do not break.

                    It simply redirects to the new Pending page.
                ================================================= */}

                <Route
                    path="/admin/direct-payments"
                    element={
                        <Navigate
                            to="/admin/direct-payments/pending"
                            replace
                        />
                    }
                />


                {/* =================================================
                    PENDING DIRECT PAYMENTS

                    This is where admin/operators review payments
                    that still require action.
                ================================================= */}

                <Route
                    path="/admin/direct-payments/pending"
                    element={
                        <RoleProtectedRoute
                            allowedRoles={["admin", "tour_operator"]}
                            eyebrow="THAFARI • PAYMENTS"
                            title="Access denied"
                            message="Only administrators and tour operators can manage direct payments."
                        >
                            <DirectPayments />
                        </RoleProtectedRoute>
                    }
                />


                {/* =================================================
                    SUCCESSFUL DIRECT PAYMENTS

                    This page displays payments that have already
                    been successfully verified.
                ================================================= */}

                <Route
                    path="/admin/direct-payments/successful"
                    element={
                        <RoleProtectedRoute
                            allowedRoles={["admin", "tour_operator"]}
                            eyebrow="THAFARI • PAYMENTS"
                            title="Access denied"
                            message="Only administrators and tour operators can manage direct payments."
                        >
                            <DirectPayments />
                        </RoleProtectedRoute>
                    }
                />


                {/* =================================================
                    REJECTED DIRECT PAYMENTS

                    This page displays payments that were rejected
                    and have a failed status in the backend.
                ================================================= */}

                <Route
                    path="/admin/direct-payments/rejected"
                    element={
                        <RoleProtectedRoute
                            allowedRoles={["admin", "tour_operator"]}
                            eyebrow="THAFARI • PAYMENTS"
                            title="Access denied"
                            message="Only administrators and tour operators can manage direct payments."
                        >
                            <DirectPayments />
                        </RoleProtectedRoute>
                    }
                />


                {/* =================================================
                    CANCELLATION REQUESTS

                    OLD /admin/cancellation-requests URL

                    Keep this route so direct links and future
                    notifications can safely open the cancellation
                    workspace.

                    It redirects to the Pending page.
                ================================================= */}

                <Route
                    path="/admin/cancellation-requests"
                    element={
                        <Navigate
                            to="/admin/cancellation-requests/pending"
                            replace
                        />
                    }
                />


                {/* =================================================
                    PENDING CANCELLATION REQUESTS

                    This is where admins and tour operators review
                    cancellation requests that still require action.
                ================================================= */}

                <Route
                    path="/admin/cancellation-requests/pending"
                    element={
                        <RoleProtectedRoute
                            allowedRoles={["admin", "tour_operator"]}
                            eyebrow="THAFARI • CANCELLATIONS"
                            title="Access denied"
                            message="Only administrators and tour operators can manage cancellation requests."
                        >
                            <CancellationRequests />
                        </RoleProtectedRoute>
                    }
                />


                {/* =================================================
                    APPROVED CANCELLATION REQUESTS

                    Displays cancellation requests that have been
                    approved by authorized staff.
                ================================================= */}

                <Route
                    path="/admin/cancellation-requests/approved"
                    element={
                        <RoleProtectedRoute
                            allowedRoles={["admin", "tour_operator"]}
                            eyebrow="THAFARI • CANCELLATIONS"
                            title="Access denied"
                            message="Only administrators and tour operators can manage cancellation requests."
                        >
                            <CancellationRequests />
                        </RoleProtectedRoute>
                    }
                />


                {/* =================================================
                    DENIED CANCELLATION REQUESTS

                    Displays cancellation requests that were denied.
                ================================================= */}

                <Route
                    path="/admin/cancellation-requests/denied"
                    element={
                        <RoleProtectedRoute
                            allowedRoles={["admin", "tour_operator"]}
                            eyebrow="THAFARI • CANCELLATIONS"
                            title="Access denied"
                            message="Only administrators and tour operators can manage cancellation requests."
                        >
                            <CancellationRequests />
                        </RoleProtectedRoute>
                    }
                />


                {/* =================================================
                    ADMIN TOUR MANAGEMENT
                ================================================= */}

                <Route
                    path="/admin/tours"
                    element={
                        <RoleProtectedRoute
                            allowedRoles={["admin"]}
                            eyebrow="THAFARI • ADMIN"
                            title="Access denied"
                            message="Only administrators can manage platform tours from this area."
                        >
                            <AdminTours />
                        </RoleProtectedRoute>
                    }
                />


                {/* =================================================
                    ADMIN SERVICES MANAGEMENT
                =================================================

                    This page allows administrators to add, edit,
                    activate/deactivate and remove the services
                    displayed on the public Thafari website.

                    URL:

                    /admin/services
                ================================================= */}

                <Route
                    path="/admin/services"
                    element={
                        <RoleProtectedRoute
                            allowedRoles={["admin"]}
                            eyebrow="THAFARI • ADMIN"
                            title="Access denied"
                            message="Only administrators can manage the services displayed on Thafari."
                        >
                            <AdminServices />
                        </RoleProtectedRoute>
                    }
                />


                {/* =================================================
                    ADMIN CONTACT MANAGEMENT
                =================================================

                    This page allows administrators to update the
                    WhatsApp number, email address and phone number
                    displayed publicly on Thafari.

                    URL:

                    /admin/contact
                ================================================= */}

                <Route
                    path="/admin/contact"
                    element={
                        <RoleProtectedRoute
                            allowedRoles={["admin"]}
                            eyebrow="THAFARI • ADMIN"
                            title="Access denied"
                            message="Only administrators can manage Thafari contact information."
                        >
                            <AdminContact />
                        </RoleProtectedRoute>
                    }
                />


                {/* =================================================
                    BUSINESS INTELLIGENCE
                =================================================

                    This is the main admin analytics dashboard.

                    The page contains:
                    - Revenue analytics
                    - Customer analytics
                    - Booking analytics
                    - Tour performance
                    - Revenue target information
                    - Business performance metrics

                    URL:

                    /admin/business-intelligence
                ================================================= */}

                <Route
                    path="/admin/business-intelligence"
                    element={
                        <RoleProtectedRoute
                            allowedRoles={["admin"]}
                            eyebrow="THAFARI • ADMIN"
                            title="Access denied"
                            message="Only administrators can access business intelligence and platform analytics."
                        >
                            <BusinessIntelligence />
                        </RoleProtectedRoute>
                    }
                />


                {/* =================================================
                    USER MANAGEMENT
                =================================================

                    This page allows administrators to view customers
                    and tour operators and change their platform role.

                    URL:

                    /admin/users
                ================================================= */}

                <Route
                    path="/admin/users"
                    element={
                        <RoleProtectedRoute
                            allowedRoles={["admin"]}
                            eyebrow="THAFARI • ADMIN"
                            title="Access denied"
                            message="Only administrators can manage platform users and roles."
                        >
                            <UserManagement />
                        </RoleProtectedRoute>
                    }
                />


                {/* =================================================
                    ADMIN PAYMENT SETTINGS
                =================================================

                    This page allows administrators to configure the
                    payment methods and M-Pesa destination used by
                    customers during the booking payment process.

                    URL:

                    /admin/payment-settings
                ================================================= */}

                <Route
                    path="/admin/payment-settings"
                    element={
                        <RoleProtectedRoute
                            allowedRoles={["admin"]}
                            eyebrow="THAFARI • ADMIN"
                            title="Access denied"
                            message="Only administrators can manage platform payment settings."
                        >
                            <AdminPaymentSettings />
                        </RoleProtectedRoute>
                    }
                />


                {/* =================================================
                    ADMIN REVIEW MANAGEMENT
                =================================================

                    This page allows administrators to view, search,
                    hide/show and delete customer reviews.

                    URL:

                    /admin/reviews
                ================================================= */}

                <Route
                    path="/admin/reviews"
                    element={
                        <RoleProtectedRoute
                            allowedRoles={["admin"]}
                            eyebrow="THAFARI • ADMIN"
                            title="Access denied"
                            message="Only administrators can manage customer reviews."
                        >
                            <AdminReviews />
                        </RoleProtectedRoute>
                    }
                />


                {/* =================================================
                    ADMIN / TOUR OPERATOR GUEST INQUIRIES
                =================================================

                    Allows authorized staff to manage public guest
                    inquiries submitted through Ask Thafari.

                    URL:

                    /admin/guest-inquiries
                ================================================= */}

                <Route
                    path="/admin/guest-inquiries"
                    element={
                        <RoleProtectedRoute
                            allowedRoles={["admin", "tour_operator"]}
                            eyebrow="THAFARI • GUEST SUPPORT"
                            title="Access denied"
                            message="Only administrators and tour operators can manage guest inquiries."
                        >
                            <AdminGuestInquiries />
                        </RoleProtectedRoute>
                    }
                />


                {/* =================================================
                    TOUR OPERATOR TOUR MANAGEMENT
                ================================================= */}

                <Route
                    path="/operator/tours"
                    element={
                        <RoleProtectedRoute
                            allowedRoles={["tour_operator"]}
                            eyebrow="THAFARI • TOUR OPERATOR"
                            title="Access denied"
                            message="Only tour operators can manage tours from this area."
                        >
                            <OperatorTours />
                        </RoleProtectedRoute>
                    }
                />


                {/* =================================================
                    CATCH-ALL / 404

                    Any URL that is not registered above will show
                    a proper Page Not Found screen instead of a blank
                    page.
                ================================================= */}

                <Route
                    path="*"
                    element={<NotFound />}
                />


            </Route>

            </Routes>

        </>
    )
}


export default AppRoutes