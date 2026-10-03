// =========================================================
// THAFARI FORGOT PASSWORD PAGE
// =========================================================
//
// This page allows a user to request a password reset email.
//
// The process is:
//
// 1. User enters their email
// 2. React sends the email to Flask
// 3. Flask creates a secure reset token
// 4. Flask sends the reset link to the user's email
// 5. User clicks the link in their email
// 6. The link opens the Reset Password page
//
// IMPORTANT:
// The backend intentionally returns the same response whether
// the email exists or not. This prevents people from discovering
// which email addresses have Thafari accounts.
// =========================================================

import { useState } from "react"
import { Link } from "react-router-dom"

import { requestPasswordReset } from "../services/passwordResetService"

import "./ForgotPassword.css"


function ForgotPassword() {

    // ---------------------------------------------------------
    // FORM STATE
    // ---------------------------------------------------------

    const [email, setEmail] = useState("")


    // ---------------------------------------------------------
    // UI STATE
    // ---------------------------------------------------------

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState(false)


    // ---------------------------------------------------------
    // HANDLE FORM SUBMISSION
    // ---------------------------------------------------------

    const handleSubmit = async (event) => {

        // Prevent the browser from refreshing
        event.preventDefault()

        // Clear previous messages
        setError("")
        setSuccess(false)


        // -----------------------------------------------------
        // FRONTEND VALIDATION
        // -----------------------------------------------------

        if (!email.trim()) {

            setError("Please enter your email address.")

            return
        }


        // -----------------------------------------------------
        // SEND PASSWORD RESET REQUEST
        // -----------------------------------------------------

        try {

            // Show loading state
            setLoading(true)


            // Send the email to our Flask backend
            await requestPasswordReset(email.trim())


            // -------------------------------------------------
            // SUCCESS
            // -------------------------------------------------
            //
            // The backend intentionally returns a generic
            // response whether the email exists or not.
            //
            // Therefore we always show the same message.
            // -------------------------------------------------

            setSuccess(true)

        } catch (error) {

            // -------------------------------------------------
            // LOG ERROR
            // -------------------------------------------------

            console.error(
                "Password reset request failed:",
                error
            )


            // -------------------------------------------------
            // GET BACKEND ERROR MESSAGE
            // -------------------------------------------------

            const message =
                error.response?.data?.message ||
                error.message ||
                "Something went wrong. Please try again."


            setError(message)

        } finally {

            // Stop loading
            setLoading(false)
        }
    }


    // ---------------------------------------------------------
    // PAGE UI
    // ---------------------------------------------------------

    return (

        <div className="forgot-password-page">

            <div className="forgot-password-card">

                {/* =================================================
                    BRAND / PAGE HEADER
                   ================================================= */}

                <div className="forgot-password-header">

                    <p className="section-eyebrow">
                        ACCOUNT RECOVERY
                    </p>

                    <h1>
                        Forgot your password?
                    </h1>

                    <p>
                        No worries. Enter the email address
                        associated with your Thafari account
                        and we'll send you a password reset link.
                    </p>

                </div>


                {/* =================================================
                    SUCCESS MESSAGE
                   ================================================= */}

                {success ? (

                    <div className="forgot-password-success">

                        <div className="forgot-password-success-icon">
                            ✓
                        </div>

                        <h2>
                            Check your email
                        </h2>

                        <p>
                            If an account is associated with that
                            email address, we've sent you a password
                            reset link.
                        </p>

                        <p>
                            The link will expire after 30 minutes.
                        </p>

                        <Link
                            to="/login"
                            className="forgot-password-back-link"
                        >
                            Back to login
                        </Link>

                    </div>

                ) : (

                    <>
                        {/* =================================================
                            ERROR MESSAGE
                           ================================================= */}

                        {error && (

                            <div className="forgot-password-message forgot-password-error">

                                {error}

                            </div>

                        )}


                        {/* =================================================
                            RESET REQUEST FORM
                           ================================================= */}

                        <form
                            className="forgot-password-form"
                            onSubmit={handleSubmit}
                        >

                            {/* -------------------------------------------------
                                EMAIL
                               ------------------------------------------------- */}

                            <div className="form-group">

                                <label htmlFor="forgot-email">
                                    Email address
                                </label>

                                <input
                                    id="forgot-email"
                                    name="email"
                                    type="email"
                                    value={email}
                                    onChange={(event) => {
                                        setEmail(event.target.value)
                                        setError("")
                                    }}
                                    placeholder="Enter your email address"
                                    autoComplete="email"
                                    disabled={loading}
                                />

                            </div>


                            {/* -------------------------------------------------
                                SUBMIT BUTTON
                               ------------------------------------------------- */}

                            <button
                                type="submit"
                                className="forgot-password-submit"
                                disabled={loading}
                            >

                                {loading
                                    ? "Sending..."
                                    : "Send reset link"
                                }

                            </button>

                        </form>


                        {/* =================================================
                            BACK TO LOGIN
                           ================================================= */}

                        <p className="forgot-password-login">

                            Remember your password?

                            {" "}

                            <Link to="/login">
                                Back to login
                            </Link>

                        </p>

                    </>

                )}

            </div>

        </div>
    )
}


export default ForgotPassword