// =========================================================
// THAFARI RESET PASSWORD PAGE
// =========================================================
//
// This page allows a user to create a new password after
// clicking the password reset link sent to their email.
//
// The reset link looks like:
//
// /reset-password?token=YOUR_RESET_TOKEN
//
// The token is read from the URL and sent to the Flask
// backend together with the user's new password.
// =========================================================

import { useState } from "react"
import { Link, useSearchParams } from "react-router-dom"

import { resetPassword } from "../services/passwordResetService"

import "./ResetPassword.css"


function ResetPassword() {

    // ---------------------------------------------------------
    // READ TOKEN FROM URL
    // ---------------------------------------------------------
    //
    // When the user clicks the email link, the URL contains:
    //
    // /reset-password?token=abc123
    //
    // useSearchParams allows us to read that token.
    // ---------------------------------------------------------

    const [searchParams] = useSearchParams()

    const token = searchParams.get("token")


    // ---------------------------------------------------------
    // FORM STATE
    // ---------------------------------------------------------

    const [formData, setFormData] = useState({
        password: "",
        confirmPassword: "",
    })


    // ---------------------------------------------------------
    // PASSWORD VISIBILITY STATE
    // ---------------------------------------------------------
    //
    // These control whether the password inputs display:
    //
    // type="password" → password is hidden
    // type="text"     → password is visible
    // ---------------------------------------------------------

    const [showPassword, setShowPassword] = useState(false)

    const [showConfirmPassword, setShowConfirmPassword] =
        useState(false)


    // ---------------------------------------------------------
    // UI STATE
    // ---------------------------------------------------------

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState(false)


    // ---------------------------------------------------------
    // HANDLE INPUT CHANGES
    // ---------------------------------------------------------

    const handleChange = (event) => {

        const { name, value } = event.target

        setFormData((previousData) => ({
            ...previousData,
            [name]: value,
        }))

        // Clear previous error when the user starts typing again
        setError("")
    }


    // ---------------------------------------------------------
    // PASSWORD LENGTH CHECK
    // ---------------------------------------------------------
    //
    // The reset button becomes enabled once the password
    // reaches at least 8 characters.
    //
    // The other password requirements are still checked when
    // the user submits the form.
    // ---------------------------------------------------------

    const passwordHasMinimumLength =
        formData.password.length >= 8


    // ---------------------------------------------------------
    // HANDLE PASSWORD RESET
    // ---------------------------------------------------------

    const handleSubmit = async (event) => {

        // Prevent browser refresh
        event.preventDefault()

        // Clear previous error
        setError("")


        // -----------------------------------------------------
        // CHECK WHETHER TOKEN EXISTS
        // -----------------------------------------------------

        if (!token) {

            setError(
                "This password reset link is missing or invalid."
            )

            return
        }


        // -----------------------------------------------------
        // FRONTEND PASSWORD VALIDATION
        // -----------------------------------------------------
        //
        // These rules match the Flask backend:
        //
        // - At least 8 characters
        // - At least one letter
        // - At least one number
        // -----------------------------------------------------

        if (formData.password.length < 8) {

            setError(
                "Password must be at least 8 characters long."
            )

            return
        }


        if (!/[A-Za-z]/.test(formData.password)) {

            setError(
                "Password must contain at least one letter."
            )

            return
        }


        if (!/\d/.test(formData.password)) {

            setError(
                "Password must contain at least one number."
            )

            return
        }


        // -----------------------------------------------------
        // CONFIRM PASSWORD
        // -----------------------------------------------------

        if (
            formData.password !==
            formData.confirmPassword
        ) {

            setError(
                "Passwords do not match."
            )

            return
        }


        // -----------------------------------------------------
        // SEND RESET REQUEST
        // -----------------------------------------------------

        try {

            // Show loading state
            setLoading(true)


            // Send the token and new password to Flask
            await resetPassword(
                token,
                formData.password
            )


            // Password was successfully changed
            setSuccess(true)

        } catch (error) {

            // -------------------------------------------------
            // LOG ERROR
            // -------------------------------------------------

            console.error(
                "Password reset failed:",
                error
            )


            // -------------------------------------------------
            // GET BACKEND ERROR MESSAGE
            // -------------------------------------------------

            const message =
                error.response?.data?.message ||
                error.message ||
                "Unable to reset your password. Please try again."


            setError(message)

        } finally {

            // Stop loading
            setLoading(false)
        }
    }


    // ---------------------------------------------------------
    // SUCCESS STATE
    // ---------------------------------------------------------

    if (success) {

        return (

            <div className="reset-password-page">

                <div className="reset-password-card">

                    <div className="reset-password-success">

                        <div className="reset-password-success-icon">
                            ✓
                        </div>

                        <p className="section-eyebrow">
                            PASSWORD UPDATED
                        </p>

                        <h1>
                            You're all set!
                        </h1>

                        <p>
                            Your Thafari password has been
                            successfully changed.
                        </p>

                        <p>
                            You can now sign in using your
                            new password.
                        </p>

                        <Link
                            to="/login"
                            className="reset-password-login-button"
                        >
                            Go to login
                        </Link>

                    </div>

                </div>

            </div>
        )
    }


    // ---------------------------------------------------------
    // INVALID / MISSING TOKEN STATE
    // ---------------------------------------------------------

    if (!token) {

        return (

            <div className="reset-password-page">

                <div className="reset-password-card">

                    <div className="reset-password-header">

                        <p className="section-eyebrow">
                            PASSWORD RESET
                        </p>

                        <h1>
                            Invalid reset link
                        </h1>

                        <p>
                            This password reset link is missing
                            the required security token.
                        </p>

                        <Link
                            to="/forgot-password"
                            className="reset-password-back-link"
                        >
                            Request a new reset link
                        </Link>

                    </div>

                </div>

            </div>
        )
    }


    // ---------------------------------------------------------
    // PASSWORD RESET FORM
    // ---------------------------------------------------------

    return (

        <div className="reset-password-page">

            <div className="reset-password-card">

                {/* =================================================
                    HEADER
                   ================================================= */}

                <div className="reset-password-header">

                    <p className="section-eyebrow">
                        PASSWORD RESET
                    </p>

                    <h1>
                        Create a new password
                    </h1>

                    <p>
                        Choose a strong password for your
                        Thafari account.
                    </p>

                </div>


                {/* =================================================
                    ERROR MESSAGE
                   ================================================= */}

                {error && (

                    <div className="reset-password-message reset-password-error">

                        {error}

                    </div>

                )}


                {/* =================================================
                    RESET PASSWORD FORM
                   ================================================= */}

                <form
                    className="reset-password-form"
                    onSubmit={handleSubmit}
                >

                    {/* -------------------------------------------------
                        NEW PASSWORD
                       ------------------------------------------------- */}

                    <div className="form-group">

                        <label htmlFor="password">
                            New password
                        </label>


                        {/* ---------------------------------------------
                            PASSWORD INPUT
                           --------------------------------------------- */}

                        <div className="password-input-wrapper">

                            <input
                                id="password"
                                name="password"
                                type={
                                    showPassword
                                        ? "text"
                                        : "password"
                                }
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="Enter your new password"
                                autoComplete="new-password"
                                disabled={loading}
                            />


                            {/* -----------------------------------------
                                PASSWORD VISIBILITY ICON
                               ----------------------------------------- */}

                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => {
                                    setShowPassword(!showPassword)
                                }}
                                disabled={loading}
                                aria-label={
                                    showPassword
                                        ? "Hide password"
                                        : "Show password"
                                }
                                title={
                                    showPassword
                                        ? "Hide password"
                                        : "Show password"
                                }
                            >

                                {showPassword ? (

                                    // ---------------------------------
                                    // EYE WITH SLASH
                                    // Password is currently visible
                                    // ---------------------------------

                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        aria-hidden="true"
                                    >
                                        <path d="M3 3l18 18" />

                                        <path d="M10.58 10.58a2 2 0 0 0 2.83 2.83" />

                                        <path d="M9.88 4.24A9.77 9.77 0 0 1 12 4c5 0 9.27 3.11 11 8a9.8 9.8 0 0 1-2.16 3.19" />

                                        <path d="M6.61 6.61A9.77 9.77 0 0 0 1 12c1.73 4.89 6 8 11 8a9.77 9.77 0 0 0 5.39-1.61" />
                                    </svg>

                                ) : (

                                    // ---------------------------------
                                    // NORMAL EYE
                                    // Password is currently hidden
                                    // ---------------------------------

                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        aria-hidden="true"
                                    >
                                        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />

                                        <circle
                                            cx="12"
                                            cy="12"
                                            r="3"
                                        />
                                    </svg>

                                )}

                            </button>

                        </div>


                        <small>
                            At least 8 characters, including
                            one letter and one number.
                        </small>

                    </div>


                    {/* -------------------------------------------------
                        CONFIRM PASSWORD
                       ------------------------------------------------- */}

                    <div className="form-group">

                        <label htmlFor="confirmPassword">
                            Confirm new password
                        </label>


                        {/* ---------------------------------------------
                            CONFIRM PASSWORD INPUT
                           --------------------------------------------- */}

                        <div className="password-input-wrapper">

                            <input
                                id="confirmPassword"
                                name="confirmPassword"
                                type={
                                    showConfirmPassword
                                        ? "text"
                                        : "password"
                                }
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                placeholder="Confirm your new password"
                                autoComplete="new-password"
                                disabled={loading}
                            />


                            {/* -----------------------------------------
                                CONFIRM PASSWORD VISIBILITY ICON
                               ----------------------------------------- */}

                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => {
                                    setShowConfirmPassword(
                                        !showConfirmPassword
                                    )
                                }}
                                disabled={loading}
                                aria-label={
                                    showConfirmPassword
                                        ? "Hide password"
                                        : "Show password"
                                }
                                title={
                                    showConfirmPassword
                                        ? "Hide password"
                                        : "Show password"
                                }
                            >

                                {showConfirmPassword ? (

                                    // ---------------------------------
                                    // EYE WITH SLASH
                                    // Password is currently visible
                                    // ---------------------------------

                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        aria-hidden="true"
                                    >
                                        <path d="M3 3l18 18" />

                                        <path d="M10.58 10.58a2 2 0 0 0 2.83 2.83" />

                                        <path d="M9.88 4.24A9.77 9.77 0 0 1 12 4c5 0 9.27 3.11 11 8a9.8 9.8 0 0 1-2.16 3.19" />

                                        <path d="M6.61 6.61A9.77 9.77 0 0 0 1 12c1.73 4.89 6 8 11 8a9.77 9.77 0 0 0 5.39-1.61" />
                                    </svg>

                                ) : (

                                    // ---------------------------------
                                    // NORMAL EYE
                                    // Password is currently hidden
                                    // ---------------------------------

                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        aria-hidden="true"
                                    >
                                        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />

                                        <circle
                                            cx="12"
                                            cy="12"
                                            r="3"
                                        />
                                    </svg>

                                )}

                            </button>

                        </div>

                    </div>


                    {/* -------------------------------------------------
                        SUBMIT BUTTON
                       -------------------------------------------------
                       
                       The button stays disabled until the password
                       reaches at least 8 characters.
                       ------------------------------------------------- */}

                    <button
                        type="submit"
                        className="reset-password-submit"
                        disabled={
                            loading ||
                            !passwordHasMinimumLength
                        }
                    >

                        {loading
                            ? "Updating password..."
                            : "Reset password"
                        }

                    </button>

                </form>


                {/* =================================================
                    BACK TO LOGIN
                   ================================================= */}

                <p className="reset-password-login">

                    Remember your password?

                    {" "}

                    <Link to="/login">
                        Back to login
                    </Link>

                </p>

            </div>

        </div>
    )
}


export default ResetPassword