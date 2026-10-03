// =========================================================
// THAFARI REGISTER PAGE
// =========================================================
//
// This page allows a new customer to create a Thafari account.
// =========================================================

import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"

import { registerUser } from "../services/authService"

import "./Register.css"


function Register() {

    // ---------------------------------------------------------
    // FORM STATE
    // ---------------------------------------------------------

    const [formData, setFormData] = useState({
        first_name: "",
        last_name: "",
        username: "",
        email: "",
        phone_number: "",
        password: "",
        confirm_password: "",
    })


    // ---------------------------------------------------------
    // UI STATE
    // ---------------------------------------------------------

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")


    // ---------------------------------------------------------
    // NAVIGATION
    // ---------------------------------------------------------

    const navigate = useNavigate()


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


    // ---------------------------------------------------------
    // HANDLE FORM SUBMISSION
    // ---------------------------------------------------------

    const handleSubmit = async (event) => {

        event.preventDefault()

        // Clear previous messages
        setError("")
        setSuccess("")


        // -----------------------------------------------------
        // FRONTEND VALIDATION
        // -----------------------------------------------------

        if (
            !formData.first_name ||
            !formData.last_name ||
            !formData.username ||
            !formData.email ||
            !formData.password
        ) {
            setError("Please fill in all required fields.")
            return
        }


        // -----------------------------------------------------
        // CHECK PASSWORDS
        // -----------------------------------------------------

        if (formData.password !== formData.confirm_password) {
            setError("Passwords do not match.")
            return
        }


        // -----------------------------------------------------
        // SEND DATA TO BACKEND
        // -----------------------------------------------------

        try {

            setLoading(true)

            const userData = {
                first_name: formData.first_name,
                last_name: formData.last_name,
                username: formData.username,
                email: formData.email,
                phone_number: formData.phone_number,
                password: formData.password,
            }


            const data = await registerUser(userData)


            // -------------------------------------------------
            // REGISTRATION SUCCESS
            // -------------------------------------------------

            setSuccess(
                data.message || "Account created successfully!"
            )


            // -------------------------------------------------
            // REDIRECT TO LOGIN
            // -------------------------------------------------

            setTimeout(() => {
                navigate("/login")
            }, 1500)

        } catch (error) {

            console.error(
                "Registration failed:",
                error
            )


            // -------------------------------------------------
            // BACKEND ERROR MESSAGE
            // -------------------------------------------------

            const message =
                error.response?.data?.message ||
                "Something went wrong. Please try again."


            setError(message)

        } finally {

            setLoading(false)

        }
    }


    // ---------------------------------------------------------
    // PAGE UI
    // ---------------------------------------------------------

    return (
        <div className="register-page">

            <div className="register-container">

                {/* =================================================
                    LEFT SIDE — BRANDING
                   ================================================= */}

                <div className="register-intro">

                    <p className="register-eyebrow">
                        WELCOME TO THAFARI
                    </p>

                    <h1>
                        Your next adventure
                        starts here.
                    </h1>

                    <p>
                        Create your account and start
                        discovering unforgettable safari
                        experiences across Kenya.
                    </p>

                </div>


                {/* =================================================
                    RIGHT SIDE — FORM
                   ================================================= */}

                <div className="register-form-container">

                    <div className="register-form-header">

                        <p className="section-eyebrow">
                            CREATE ACCOUNT
                        </p>

                        <h2>
                            Join Thafari
                        </h2>

                        <p>
                            Create your account to start
                            planning your next adventure.
                        </p>

                    </div>


                    {/* =================================================
                        ERROR MESSAGE
                       ================================================= */}

                    {error && (
                        <div className="register-message register-error">
                            {error}
                        </div>
                    )}


                    {/* =================================================
                        SUCCESS MESSAGE
                       ================================================= */}

                    {success && (
                        <div className="register-message register-success">
                            {success}
                        </div>
                    )}


                    {/* =================================================
                        REGISTRATION FORM
                       ================================================= */}

                    <form
                        className="register-form"
                        onSubmit={handleSubmit}
                    >

                        {/* First name */}

                        <div className="form-row">

                            <div className="form-group">

                                <label htmlFor="first_name">
                                    First name
                                </label>

                                <input
                                    id="first_name"
                                    name="first_name"
                                    type="text"
                                    value={formData.first_name}
                                    onChange={handleChange}
                                    placeholder="Wangeci"
                                />

                            </div>


                            {/* Last name */}

                            <div className="form-group">

                                <label htmlFor="last_name">
                                    Last name
                                </label>

                                <input
                                    id="last_name"
                                    name="last_name"
                                    type="text"
                                    value={formData.last_name}
                                    onChange={handleChange}
                                    placeholder="Kariuki"
                                />

                            </div>

                        </div>


                        {/* Username */}

                        <div className="form-group">

                            <label htmlFor="username">
                                Username
                            </label>

                            <input
                                id="username"
                                name="username"
                                type="text"
                                value={formData.username}
                                onChange={handleChange}
                                placeholder="Choose a username"
                            />

                        </div>


                        {/* Email */}

                        <div className="form-group">

                            <label htmlFor="email">
                                Email address
                            </label>

                            <input
                                id="email"
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="you@example.com"
                            />

                        </div>


                        {/* Phone */}

                        <div className="form-group">

                            <label htmlFor="phone_number">
                                Phone number
                                <span> (optional)</span>
                            </label>

                            <input
                                id="phone_number"
                                name="phone_number"
                                type="tel"
                                value={formData.phone_number}
                                onChange={handleChange}
                                placeholder="+254..."
                            />

                        </div>


                        {/* Password */}

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
                                placeholder="Create a password"
                            />

                            <small>
                                At least 8 characters with letters
                                and numbers.
                            </small>

                        </div>


                        {/* Confirm password */}

                        <div className="form-group">

                            <label htmlFor="confirm_password">
                                Confirm password
                            </label>

                            <input
                                id="confirm_password"
                                name="confirm_password"
                                type="password"
                                value={formData.confirm_password}
                                onChange={handleChange}
                                placeholder="Enter your password again"
                            />

                        </div>


                        {/* Submit */}

                        <button
                            type="submit"
                            className="register-submit"
                            disabled={loading}
                        >

                            {loading
                                ? "Creating account..."
                                : "Create account"
                            }

                        </button>

                    </form>


                    {/* =================================================
                        LOGIN LINK
                       ================================================= */}

                    <p className="register-login">

                        Already have an account?

                        {" "}

                        <Link to="/login">
                            Login
                        </Link>

                    </p>

                </div>

            </div>

        </div>
    )
}


export default Register