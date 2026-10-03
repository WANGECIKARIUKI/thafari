// =========================================================
// THAFARI PROFILE PAGE
// =========================================================
//
// This page is the account management workspace for every
// authenticated Thafari user.
//
// Supported roles:
// - Customer
// - Tour Operator
// - Admin
//
// The page intentionally keeps role and verification status
// read-only. Those values are controlled by the backend.
//
// Profile details are loaded from:
// GET /api/auth/me
//
// Saving profile details will use:
// PATCH /api/auth/me
//
// The PATCH endpoint will be added to the backend as the next
// part of the profile feature.
// =========================================================

import {
    useEffect,
    useMemo,
    useState,
} from "react"

import {
    Navigate,
    useNavigate,
} from "react-router-dom"

import api from "../services/api"

import { useAuth } from "../context/AuthContext"

import "./Profile.css"


// =========================================================
// PROFILE PAGE
// =========================================================

export default function Profile() {

    const navigate = useNavigate()

    const {
        accessToken,
        user,
        isAuthenticated,
        authLoading,
    } = useAuth()


    // ---------------------------------------------------------
    // FORM STATE
    // ---------------------------------------------------------

    const [formData, setFormData] = useState({
        first_name: "",
        last_name: "",
        username: "",
        email: "",
        phone_number: "",
    })


    // ---------------------------------------------------------
    // PAGE STATE
    // ---------------------------------------------------------

    const [loading, setLoading] = useState(Boolean(accessToken))
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")
    const [isEditing, setIsEditing] = useState(false)


    // =========================================================
    // AUTHORIZATION HEADER
    // =========================================================

    const authConfig = useMemo(() => {

        return {
            headers: {
                Authorization:
                    `Bearer ${accessToken}`,
            },
        }

    }, [accessToken])


    // =========================================================
    // LOAD CURRENT PROFILE
    // =========================================================

    useEffect(() => {

        if (!accessToken) {
            return
        }


        const loadProfile = async () => {

            try {

                const response = await api.get(
                    "/auth/me",
                    authConfig
                )

                const currentUser =
                    response.data?.user ||
                    response.data


                setFormData({
                    first_name:
                        currentUser?.first_name || "",
                    last_name:
                        currentUser?.last_name || "",
                    username:
                        currentUser?.username || "",
                    email:
                        currentUser?.email || "",
                    phone_number:
                        currentUser?.phone_number || "",
                })

            } catch (requestError) {

                console.error(
                    "Failed to load profile:",
                    requestError
                )

                setError(
                    requestError.response?.data?.message ||
                    "We could not load your profile. Please try again."
                )

            } finally {

                setLoading(false)

            }

        }


        loadProfile()

    }, [accessToken, authConfig])

    // =========================================================
    // HANDLE INPUT
    // =========================================================

    const handleChange = (event) => {

        const {
            name,
            value,
        } = event.target


        setFormData((previous) => ({
            ...previous,
            [name]: value,
        }))


        if (error) {
            setError("")
        }

        if (success) {
            setSuccess("")
        }

    }


    // =========================================================
    // CANCEL EDITING
    // =========================================================

    const handleCancel = () => {

        setFormData({
            first_name:
                user?.first_name || "",
            last_name:
                user?.last_name || "",
            username:
                user?.username || "",
            email:
                user?.email || "",
            phone_number:
                user?.phone_number || "",
        })

        setError("")
        setSuccess("")
        setIsEditing(false)

    }


    // =========================================================
    // SAVE PROFILE
    // =========================================================

    const handleSubmit = async (event) => {

        event.preventDefault()

        setError("")
        setSuccess("")


        // -----------------------------------------------------
        // FRONTEND VALIDATION
        // -----------------------------------------------------

        if (!formData.first_name.trim()) {
            setError("First name is required.")
            return
        }

        if (!formData.last_name.trim()) {
            setError("Last name is required.")
            return
        }

        if (!formData.username.trim()) {
            setError("Username is required.")
            return
        }

        if (!formData.email.trim()) {
            setError("Email is required.")
            return
        }


        try {

            setSaving(true)

            const response = await api.patch(
                "/auth/me",
                {
                    first_name:
                        formData.first_name.trim(),
                    last_name:
                        formData.last_name.trim(),
                    username:
                        formData.username.trim(),
                    email:
                        formData.email.trim(),
                    phone_number:
                        formData.phone_number.trim(),
                },
                authConfig
            )


            const updatedUser =
                response.data?.user ||
                response.data


            setFormData({
                first_name:
                    updatedUser?.first_name ||
                    formData.first_name.trim(),
                last_name:
                    updatedUser?.last_name ||
                    formData.last_name.trim(),
                username:
                    updatedUser?.username ||
                    formData.username.trim(),
                email:
                    updatedUser?.email ||
                    formData.email.trim(),
                phone_number:
                    updatedUser?.phone_number ||
                    formData.phone_number.trim(),
            })


            setSuccess(
                response.data?.message ||
                "Your profile has been updated successfully."
            )

            setIsEditing(false)

        } catch (requestError) {

            console.error(
                "Failed to update profile:",
                requestError
            )

            setError(
                requestError.response?.data?.message ||
                "We could not update your profile. Please try again."
            )

        } finally {

            setSaving(false)

        }

    }


    // =========================================================
    // DERIVED DISPLAY VALUES
    // =========================================================

    const displayName =
        `${formData.first_name} ${formData.last_name}`.trim() ||
        formData.username ||
        "Thafari User"


    const initials =
        `${formData.first_name?.charAt(0) || ""}${
            formData.last_name?.charAt(0) || ""
        }`.toUpperCase() ||
        formData.username?.charAt(0)?.toUpperCase() ||
        "T"


    const roleLabel = {
        admin: "Administrator",
        tour_operator: "Tour Operator",
        customer: "Traveller",
    }[user?.role] || "Thafari User"


    // =========================================================
    // AUTH LOADING
    // =========================================================

    if (authLoading || loading) {

        return (

            <div className="profile-page profile-loading-page">

                <div className="profile-loading-card">

                    <div className="profile-loading-spinner" />

                    <h2>
                        Loading your profile...
                    </h2>

                    <p>
                        Please wait while we retrieve your
                        Thafari account information.
                    </p>

                </div>

            </div>

        )

    }


    // =========================================================
    // PROTECT PAGE
    // =========================================================

    if (!isAuthenticated) {

        return (
            <Navigate
                to="/login"
                replace
            />
        )

    }


    // =========================================================
    // PAGE UI
    // =========================================================

    return (

        <div className="profile-page">

            {/* =================================================
                PAGE HEADER
            ================================================= */}

            <section className="profile-hero">

                <div className="profile-hero-content">

                    <button
                        type="button"
                        className="profile-back-button"
                        onClick={() => navigate("/dashboard")}
                    >
                        ← Back to Dashboard
                    </button>

                    <p className="profile-eyebrow">
                        MY ACCOUNT
                    </p>

                    <h1>
                        Manage your profile
                    </h1>

                    <p className="profile-hero-text">
                        Keep your personal details up to date so
                        Thafari can keep your account and travel
                        communication accurate.
                    </p>

                </div>

            </section>


            {/* =================================================
                PROFILE CONTENT
            ================================================= */}

            <main className="profile-content">

                {/* ---------------------------------------------
                    PROFILE SUMMARY
                --------------------------------------------- */}

                <section className="profile-summary-card">

                    <div className="profile-avatar">
                        {initials}
                    </div>

                    <div className="profile-summary-details">

                        <h2>
                            {displayName}
                        </h2>

                        <p>
                            @{formData.username || "username"}
                        </p>

                        <div className="profile-badges">

                            <span className="profile-role-badge">
                                {roleLabel}
                            </span>

                            {user?.is_verified && (
                                <span className="profile-verified-badge">
                                    ✓ Verified account
                                </span>
                            )}

                        </div>

                    </div>

                </section>


                {/* ---------------------------------------------
                    STATUS MESSAGES
                --------------------------------------------- */}

                {error && (
                    <div
                        className="profile-message profile-error-message"
                        role="alert"
                    >
                        <span>!</span>
                        <p>{error}</p>
                    </div>
                )}


                {success && (
                    <div
                        className="profile-message profile-success-message"
                        role="status"
                    >
                        <span>✓</span>
                        <p>{success}</p>
                    </div>
                )}


                {/* ---------------------------------------------
                    PROFILE FORM
                --------------------------------------------- */}

                <section className="profile-card">

                    <div className="profile-card-header">

                        <div>

                            <p className="profile-section-eyebrow">
                                PERSONAL INFORMATION
                            </p>

                            <h2>
                                Your account details
                            </h2>

                            <p>
                                Update the information associated
                                with your Thafari account.
                            </p>

                        </div>

                        {!isEditing && (
                            <button
                                type="button"
                                className="profile-edit-button"
                                onClick={() => {
                                    setError("")
                                    setSuccess("")
                                    setIsEditing(true)
                                }}
                            >
                                Edit Profile
                            </button>
                        )}

                    </div>


                    <form
                        className="profile-form"
                        onSubmit={handleSubmit}
                    >

                        <div className="profile-form-grid">

                            <div className="profile-field">

                                <label htmlFor="first_name">
                                    First name
                                </label>

                                <input
                                    id="first_name"
                                    name="first_name"
                                    type="text"
                                    value={formData.first_name}
                                    onChange={handleChange}
                                    disabled={!isEditing || saving}
                                    autoComplete="given-name"
                                />

                            </div>


                            <div className="profile-field">

                                <label htmlFor="last_name">
                                    Last name
                                </label>

                                <input
                                    id="last_name"
                                    name="last_name"
                                    type="text"
                                    value={formData.last_name}
                                    onChange={handleChange}
                                    disabled={!isEditing || saving}
                                    autoComplete="family-name"
                                />

                            </div>


                            <div className="profile-field">

                                <label htmlFor="username">
                                    Username
                                </label>

                                <input
                                    id="username"
                                    name="username"
                                    type="text"
                                    value={formData.username}
                                    onChange={handleChange}
                                    disabled={!isEditing || saving}
                                    autoComplete="username"
                                />

                                <small>
                                    Your username must remain unique.
                                </small>

                            </div>


                            <div className="profile-field">

                                <label htmlFor="email">
                                    Email address
                                </label>

                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    disabled={!isEditing || saving}
                                    autoComplete="email"
                                />

                            </div>


                            <div className="profile-field profile-field-full">

                                <label htmlFor="phone_number">
                                    Phone number
                                </label>

                                <input
                                    id="phone_number"
                                    name="phone_number"
                                    type="tel"
                                    value={formData.phone_number}
                                    onChange={handleChange}
                                    disabled={!isEditing || saving}
                                    autoComplete="tel"
                                    placeholder="Enter your phone number"
                                />

                            </div>

                        </div>


                        {isEditing && (

                            <div className="profile-form-actions">

                                <button
                                    type="button"
                                    className="profile-cancel-button"
                                    onClick={handleCancel}
                                    disabled={saving}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="profile-save-button"
                                    disabled={saving}
                                >
                                    {saving
                                        ? "Saving..."
                                        : "Save Changes"
                                    }
                                </button>

                            </div>

                        )}

                    </form>

                </section>


                {/* ---------------------------------------------
                    ACCOUNT INFORMATION
                --------------------------------------------- */}

                <section className="profile-card profile-account-card">

                    <div className="profile-card-header">

                        <div>

                            <p className="profile-section-eyebrow">
                                ACCOUNT INFORMATION
                            </p>

                            <h2>
                                Account status
                            </h2>

                            <p>
                                Some account settings are controlled
                                by Thafari for security and access
                                management.
                            </p>

                        </div>

                    </div>


                    <div className="profile-account-grid">

                        <div className="profile-account-item">
                            <span>Account type</span>
                            <strong>{roleLabel}</strong>
                        </div>

                        <div className="profile-account-item">
                            <span>Verification</span>
                            <strong>
                                {user?.is_verified
                                    ? "Verified"
                                    : "Not verified"
                                }
                            </strong>
                        </div>

                        <div className="profile-account-item">
                            <span>Account ID</span>
                            <strong>
                                #{user?.id || "—"}
                            </strong>
                        </div>

                    </div>

                </section>


                {/* ---------------------------------------------
                    SECURITY NOTE
                --------------------------------------------- */}

                <section className="profile-security-note">

                    <div className="profile-security-icon">
                        🔐
                    </div>

                    <div>

                        <h3>
                            Your account security matters
                        </h3>

                        <p>
                            Never share your password or access token
                            with anyone. If you believe your account
                            has been compromised, contact the Thafari
                            support team.
                        </p>

                    </div>

                </section>

            </main>

        </div>

    )
}
