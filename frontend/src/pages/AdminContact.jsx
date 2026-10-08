// =========================================================
// THAFARI ADMIN CONTACT DETAILS
// =========================================================
//
// Admin-only page for managing the contact information
// displayed publicly on Thafari.
//
// Admin can update:
// - WhatsApp
// - Email
// - Phone number
//
// The backend controls the actual authorization.
// =========================================================

import {
    useEffect,
    useState,
} from "react"

import {
    Navigate,
    useNavigate,
} from "react-router-dom"

import { useAuth } from "../context/AuthContext"

import {
    getAdminContact,
    updateAdminContact,
} from "../services/contactService"

import "./AdminContact.css"


function AdminContact() {

    // =====================================================
    // AUTHENTICATION
    // =====================================================

    const {
        user,
        accessToken,
        isAuthenticated,
        authLoading,
    } = useAuth()


    // =====================================================
    // ROUTER
    // =====================================================

    const navigate = useNavigate()


    // =====================================================
    // FORM STATE
    // =====================================================

    const [
        formData,
        setFormData,
    ] = useState({
        whatsapp: "",
        email: "",
        phone_number: "",
    })


    // =====================================================
    // PAGE STATE
    // =====================================================

    const [
        loading,
        setLoading,
    ] = useState(true)


    const [
        saving,
        setSaving,
    ] = useState(false)


    const [
        error,
        setError,
    ] = useState("")


    const [
        successMessage,
        setSuccessMessage,
    ] = useState("")


    // =====================================================
    // LOAD CONTACT DETAILS
    // =====================================================

    useEffect(() => {

        if (
            authLoading ||
            !isAuthenticated ||
            !accessToken ||
            user?.role !== "admin"
        ) {
            return
        }


        const loadContact = async () => {

            setLoading(true)

            setError("")

            setSuccessMessage("")


            try {

                const response =
                    await getAdminContact(
                        accessToken
                    )


                const contact =
                    response?.contact


                if (contact) {

                    setFormData({
                        whatsapp:
                            contact.whatsapp || "",

                        email:
                            contact.email || "",

                        phone_number:
                            contact.phone_number || "",
                    })
                }

            } catch (err) {

                console.error(
                    "Failed to load contact details:",
                    err
                )


                // -------------------------------------------------
                // A 404 simply means contact details have not been
                // configured yet. The admin can still enter and
                // save the first set of details.
                // -------------------------------------------------

                if (
                    err?.response?.status === 404
                ) {

                    setFormData({
                        whatsapp: "",
                        email: "",
                        phone_number: "",
                    })

                } else {

                    setError(
                        err?.response?.data?.message ||
                        "We could not load the contact details right now."
                    )

                }

            } finally {

                setLoading(false)

            }
        }


        loadContact()

    }, [
        authLoading,
        isAuthenticated,
        accessToken,
        user?.role,
    ])


    // =====================================================
    // HANDLE INPUT CHANGES
    // =====================================================

    const handleChange = (event) => {

        const {
            name,
            value,
        } = event.target


        setFormData((currentData) => ({
            ...currentData,
            [name]: value,
        }))


        // Clear old messages while the admin edits.
        setError("")

        setSuccessMessage("")
    }


    // =====================================================
    // SAVE CONTACT DETAILS
    // =====================================================

    const handleSubmit = async (event) => {

        event.preventDefault()


        if (!accessToken) {
            return
        }


        setSaving(true)

        setError("")

        setSuccessMessage("")


        try {

            const response =
                await updateAdminContact(
                    accessToken,
                    {
                        whatsapp:
                            formData.whatsapp.trim(),

                        email:
                            formData.email.trim(),

                        phone_number:
                            formData.phone_number.trim(),
                    }
                )


            const contact =
                response?.contact


            if (contact) {

                setFormData({
                    whatsapp:
                        contact.whatsapp || "",

                    email:
                        contact.email || "",

                    phone_number:
                        contact.phone_number || "",
                })
            }


            setSuccessMessage(
                "Contact details saved successfully."
            )


        } catch (err) {

            console.error(
                "Failed to save contact details:",
                err
            )


            setError(
                err?.response?.data?.message ||
                "We could not save the contact details. Please try again."
            )

        } finally {

            setSaving(false)

        }
    }


    // =====================================================
    // WAIT FOR AUTHENTICATION TO RESTORE
    // =====================================================

    if (authLoading) {

        return (
            <main className="admin-contact-page">

                <section className="admin-contact-panel">

                    <div className="admin-contact-loading">

                        Loading contact settings...

                    </div>

                </section>

            </main>
        )
    }


    // =====================================================
    // REQUIRE LOGIN
    // =====================================================

    if (!isAuthenticated) {

        return (
            <Navigate
                to="/login"
                replace
            />
        )
    }


    // =====================================================
    // ADMIN ONLY
    // =====================================================

    if (user?.role !== "admin") {

        return (
            <Navigate
                to="/dashboard"
                replace
            />
        )
    }


    // =====================================================
    // PAGE
    // =====================================================

    return (

        <main className="admin-contact-page">

            <section className="admin-contact-container">

                {/* =================================================
                    PAGE HEADER
                ================================================= */}

                <div className="admin-contact-header">

                    <div>

                        <p className="admin-contact-eyebrow">
                            THAFARI ADMIN
                        </p>

                        <h1>
                            Contact Details
                        </h1>

                        <p className="admin-contact-intro">
                            Keep Thafari's public contact
                            information up to date so
                            customers always know how to
                            reach you.
                        </p>

                    </div>


                    <button
                        type="button"
                        className="admin-contact-back-button"
                        onClick={() =>
                            navigate("/dashboard")
                        }
                    >
                        ← Dashboard
                    </button>

                </div>


                {/* =================================================
                    CONTENT
                ================================================= */}

                <section className="admin-contact-panel">

                    {loading ? (

                        <div className="admin-contact-loading">

                            Loading contact details...

                        </div>

                    ) : (

                        <form
                            className="admin-contact-form"
                            onSubmit={handleSubmit}
                        >

                            {/* =====================================
                                INFORMATION
                            ===================================== */}

                            <div className="admin-contact-info-box">

                                <strong>
                                    Public Contact Information
                                </strong>

                                <p>
                                    These details will be
                                    displayed publicly on
                                    Thafari so customers can
                                    contact your business.
                                </p>

                            </div>


                            {/* =====================================
                                WHATSAPP
                            ===================================== */}

                            <div className="admin-contact-field">

                                <label htmlFor="whatsapp">
                                    WhatsApp Number
                                </label>

                                <input
                                    id="whatsapp"
                                    name="whatsapp"
                                    type="text"
                                    value={
                                        formData.whatsapp
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    placeholder="+254 700 000 000"
                                    maxLength={30}
                                    required
                                />

                                <small>
                                    The WhatsApp number
                                    customers should use
                                    to contact Thafari.
                                </small>

                            </div>


                            {/* =====================================
                                EMAIL
                            ===================================== */}

                            <div className="admin-contact-field">

                                <label htmlFor="email">
                                    Email Address
                                </label>

                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    value={
                                        formData.email
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    placeholder="hello@thafari.com"
                                    maxLength={150}
                                    required
                                />

                                <small>
                                    The main email address
                                    customers should use
                                    for enquiries.
                                </small>

                            </div>


                            {/* =====================================
                                PHONE
                            ===================================== */}

                            <div className="admin-contact-field">

                                <label htmlFor="phone_number">
                                    Phone Number
                                </label>

                                <input
                                    id="phone_number"
                                    name="phone_number"
                                    type="text"
                                    value={
                                        formData.phone_number
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    placeholder="+254 700 000 000"
                                    maxLength={30}
                                    required
                                />

                                <small>
                                    The main phone number
                                    customers can call.
                                </small>

                            </div>


                            {/* =====================================
                                ERROR
                            ===================================== */}

                            {error && (

                                <div className="admin-contact-error">

                                    {error}

                                </div>

                            )}


                            {/* =====================================
                                SUCCESS
                            ===================================== */}

                            {successMessage && (

                                <div className="admin-contact-success">

                                    {successMessage}

                                </div>

                            )}


                            {/* =====================================
                                ACTIONS
                            ===================================== */}

                            <div className="admin-contact-actions">

                                <button
                                    type="button"
                                    className="admin-contact-cancel-button"
                                    onClick={() =>
                                        navigate("/dashboard")
                                    }
                                    disabled={saving}
                                >
                                    Cancel
                                </button>


                                <button
                                    type="submit"
                                    className="admin-contact-save-button"
                                    disabled={saving}
                                >

                                    {saving
                                        ? "Saving..."
                                        : "Save Contact Details"
                                    }

                                </button>

                            </div>

                        </form>

                    )}

                </section>

            </section>

        </main>
    )
}


export default AdminContact