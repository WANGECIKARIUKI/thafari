// =========================================================
// THAFARI LOGIN PAGE
// =========================================================
//
// This page allows a user to log into Thafari.
//
// Authentication itself is handled by AuthContext.
// The Login page:
// - collects the credentials
// - calls the login function
// - displays errors
// - redirects the user after successful login
//
// ROLE-BASED REDIRECTION:
//
// CUSTOMER
// → Home page (/)
//
// ADMIN
// → Dashboard (/dashboard)
//
// TOUR OPERATOR
// → Dashboard (/dashboard)
//
// If a customer was redirected here because they tried
// to access a protected page, we return them to that page
// after successful login.
//
// Example:
//
// /booking/12
//      ↓
// /login
//      ↓
// successful customer login
//      ↓
// /booking/12
//
// Admin and tour operators always go to /dashboard
// unless they were intentionally redirected from another
// protected page.
// =========================================================

import { useState } from "react"

import {
    Link,
    useLocation,
    useNavigate
} from "react-router-dom"

import { useAuth } from "../context/AuthContext"

import "./Login.css"


function Login() {

    // ---------------------------------------------------------
    // FORM STATE
    // ---------------------------------------------------------
    //
    // The user can enter either their email or username.
    // ---------------------------------------------------------

    const [formData, setFormData] = useState({
        email: "",
        password: "",
    })


    // ---------------------------------------------------------
    // UI STATE
    // ---------------------------------------------------------

    const [loading, setLoading] = useState(false)

    const [error, setError] = useState("")


    // ---------------------------------------------------------
    // NAVIGATION
    // ---------------------------------------------------------

    const navigate = useNavigate()


    // ---------------------------------------------------------
    // CURRENT LOCATION
    // ---------------------------------------------------------
    //
    // React Router allows another page to send information
    // to this page through location.state.
    //
    // For example:
    //
    // {
    //     from: "/booking/12"
    // }
    //
    // This allows us to return a customer to the page they
    // originally wanted after logging in.
    // ---------------------------------------------------------

    const location = useLocation()


    // ---------------------------------------------------------
    // AUTHENTICATION
    // ---------------------------------------------------------
    //
    // AuthContext handles:
    //
    // - JWT tokens
    // - localStorage
    // - authenticated user
    // - logout
    // - inactivity timeout
    //
    // The login function also RETURNS the authenticated user.
    // ---------------------------------------------------------

    const { login } = useAuth()


    // ---------------------------------------------------------
    // HANDLE INPUT CHANGES
    // ---------------------------------------------------------

    const handleChange = (event) => {

        const { name, value } = event.target

        setFormData((previousData) => ({
            ...previousData,
            [name]: value,
        }))
    }


    // =========================================================
    // HANDLE LOGIN
    // =========================================================

    const handleSubmit = async (event) => {

        // Prevent the browser from refreshing the page.
        event.preventDefault()


        // Clear any previous error.
        setError("")


        // -----------------------------------------------------
        // FRONTEND VALIDATION
        // -----------------------------------------------------

        if (!formData.email || !formData.password) {

            setError(
                "Please enter your email or username and password."
            )

            return
        }


        // -----------------------------------------------------
        // SEND LOGIN REQUEST
        // -----------------------------------------------------

        try {

            // Tell the UI that login is currently happening.
            setLoading(true)


            // -------------------------------------------------
            // CALL AUTH CONTEXT LOGIN
            // -------------------------------------------------
            //
            // IMPORTANT:
            //
            // AuthContext returns the authenticated user.
            //
            // Example:
            //
            // {
            //     id: 1,
            //     username: "admin",
            //     email: "admin@example.com",
            //     role: "admin"
            // }
            //
            // We use the returned role below to decide where
            // the user should go.
            // -------------------------------------------------

            const authenticatedUser = await login({
                email: formData.email,
                password: formData.password,
            })


            // =================================================
            // ROLE-BASED REDIRECTION
            // =================================================
            //
            // Customers should normally go to the homepage.
            //
            // Admins and tour operators should go directly to
            // the dashboard.
            // =================================================


            // -------------------------------------------------
            // ADMIN
            // -------------------------------------------------
            //
            // Admin users go directly to the dashboard.
            // -------------------------------------------------

            if (authenticatedUser?.role === "admin") {

                navigate("/dashboard", {
                    replace: true
                })

                return
            }


            // -------------------------------------------------
            // TOUR OPERATOR
            // -------------------------------------------------
            //
            // Tour operators also go directly to the dashboard.
            // -------------------------------------------------

            if (
                authenticatedUser?.role === "tour_operator"
            ) {

                navigate("/dashboard", {
                    replace: true
                })

                return
            }


            // -------------------------------------------------
            // CUSTOMER
            // -------------------------------------------------
            //
            // Customers should normally go to the homepage.
            //
            // However, if the customer originally tried to
            // access a protected page, return them there.
            //
            // Example:
            //
            // Customer clicks:
            // /booking/12
            //
            // They are redirected to:
            // /login
            //
            // After login:
            // /booking/12
            // -------------------------------------------------

            const redirectPath =
                location.state?.from || "/"


            navigate(redirectPath, {
                replace: true
            })

        } catch (error) {

            // -------------------------------------------------
            // LOG LOGIN ERROR
            // -------------------------------------------------

            console.error(
                "Login failed:",
                error
            )


            // -------------------------------------------------
            // GET BACKEND ERROR MESSAGE
            // -------------------------------------------------

            const message =
                error.response?.data?.message ||
                error.message ||
                "Login failed. Please check your details."


            // Display error to the user.
            setError(message)

        } finally {

            // Login request has finished.
            setLoading(false)
        }
    }


    // =========================================================
    // PAGE UI
    // =========================================================

    return (

        <div className="login-page">

            <div className="login-container">

                {/* =================================================
                    LEFT SIDE — BRANDING
                   ================================================= */}

                <div className="login-intro">

                    <p className="login-eyebrow">
                        WELCOME BACK
                    </p>

                    <h1>
                        Your next adventure
                        is waiting.
                    </h1>

                    <p>
                        Sign in to continue exploring
                        unforgettable safari experiences
                        across Kenya.
                    </p>

                </div>


                {/* =================================================
                    RIGHT SIDE — LOGIN FORM
                   ================================================= */}

                <div className="login-form-container">

                    <div className="login-form-header">

                        <p className="section-eyebrow">
                            SIGN IN
                        </p>

                        <h2>
                            Welcome back
                        </h2>

                        <p>
                            Sign in to your Thafari account
                            to continue your journey.
                        </p>

                    </div>


                    {/* =================================================
                        ERROR MESSAGE
                       ================================================= */}

                    {error && (

                        <div className="login-message login-error">

                            {error}

                        </div>

                    )}


                    {/* =================================================
                        LOGIN FORM
                       ================================================= */}

                    <form
                        className="login-form"
                        onSubmit={handleSubmit}
                    >

                        {/* -------------------------------------------------
                            EMAIL OR USERNAME
                           ------------------------------------------------- */}

                        <div className="form-group">

                            <label htmlFor="email">
                                Email or username
                            </label>

                            <input
                                id="email"
                                name="email"
                                type="text"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="Email or username"
                                autoComplete="username"
                            />

                        </div>


                        {/* -------------------------------------------------
                            PASSWORD
                           ------------------------------------------------- */}

                        <div className="form-group">

                            <label htmlFor="password">
                                Password
                            </label>

                            <input
                                id="password"
                                name="password"
                                type="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="Enter your password"
                                autoComplete="current-password"
                            />

                        </div>


                        {/* -------------------------------------------------
                            FORGOT PASSWORD
                           ------------------------------------------------- */}

                        <div className="forgot-password-link">

                            <Link to="/forgot-password">
                                Forgot password?
                            </Link>

                        </div>


                        {/* -------------------------------------------------
                            SUBMIT BUTTON
                           ------------------------------------------------- */}

                        <button
                            type="submit"
                            className="login-submit"
                            disabled={loading}
                        >

                            {loading
                                ? "Signing in..."
                                : "Sign in"
                            }

                        </button>

                    </form>


                    {/* =================================================
                        REGISTER LINK
                       ================================================= */}

                    <p className="login-register">

                        Don't have an account?

                        {" "}

                        <Link to="/register">
                            Create an account
                        </Link>

                    </p>

                </div>

            </div>

        </div>
    )
}


export default Login