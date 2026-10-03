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
    Navigate,
    Route,
    Routes,
} from "react-router-dom"


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

import OperatorTours from "../pages/OperatorTours"

import BusinessIntelligence from "../pages/BusinessIntelligence"

import Profile from "../pages/Profile"

import UserManagement from "../pages/UserManagement"


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
// APP ROUTES
// =========================================================

function AppRoutes() {

    return (

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
                    element={<DirectPayments />}
                />


                {/* =================================================
                    SUCCESSFUL DIRECT PAYMENTS

                    This page displays payments that have already
                    been successfully verified.
                ================================================= */}

                <Route
                    path="/admin/direct-payments/successful"
                    element={<DirectPayments />}
                />


                {/* =================================================
                    REJECTED DIRECT PAYMENTS

                    This page displays payments that were rejected
                    and have a failed status in the backend.
                ================================================= */}

                <Route
                    path="/admin/direct-payments/rejected"
                    element={<DirectPayments />}
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
                    element={<CancellationRequests />}
                />


                {/* =================================================
                    APPROVED CANCELLATION REQUESTS

                    Displays cancellation requests that have been
                    approved by authorized staff.
                ================================================= */}

                <Route
                    path="/admin/cancellation-requests/approved"
                    element={<CancellationRequests />}
                />


                {/* =================================================
                    DENIED CANCELLATION REQUESTS

                    Displays cancellation requests that were denied.
                ================================================= */}

                <Route
                    path="/admin/cancellation-requests/denied"
                    element={<CancellationRequests />}
                />


                {/* =================================================
                    ADMIN TOUR MANAGEMENT
                ================================================= */}

                <Route
                    path="/admin/tours"
                    element={<AdminTours />}
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
                    element={<BusinessIntelligence />}
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
                    element={<UserManagement />}
                />


                {/* =================================================
                    TOUR OPERATOR TOUR MANAGEMENT
                ================================================= */}

                <Route
                    path="/operator/tours"
                    element={<OperatorTours />}
                />


            </Route>

        </Routes>
    )
}


export default AppRoutes