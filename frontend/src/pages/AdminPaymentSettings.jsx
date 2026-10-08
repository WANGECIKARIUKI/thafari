// =========================================================
// THAFARI ADMIN PAYMENT SETTINGS
// =========================================================
//
// This page allows an administrator to configure the payment
// methods customers see when making direct payments.
//
// Settings include:
//
// - M-Pesa enabled/disabled
// - Active M-Pesa mode: Paybill or Till Number
// - M-Pesa Paybill number
// - M-Pesa Till Number
// - M-Pesa business name
// - Airtel Money enabled/disabled
// - Airtel Money number
// - Airtel Money business name
// - Payment instructions
//
// IMPORTANT:
//
// This page is intentionally separate from the Direct Payments
// verification page.
//
// Direct Payments:
// - Used to verify/reject customer payment submissions.
//
// Payment Settings:
// - Used to configure where customers should make payments.
//
// =========================================================

import { useEffect, useState } from "react"

import { useAuth } from "../context/AuthContext"

import { useNavigate } from "react-router-dom"

import {
    getAdminPaymentSettings,
    updateAdminPaymentSettings,
} from "../services/paymentService"

import "./AdminPaymentSettings.css"


function AdminPaymentSettings() {

    // =====================================================
    // AUTHENTICATION
    // =====================================================

    const {
        accessToken,
        user,
    } = useAuth()


    const navigate = useNavigate()


    // =====================================================
    // STATE
    // =====================================================

    const [saving, setSaving] = useState(false)

    const [error, setError] = useState("")

    const [success, setSuccess] = useState("")

    // Store the token whose payment settings have finished loading.
    const [loadedToken, setLoadedToken] = useState(null)


    const [formData, setFormData] = useState({
        mpesa_enabled: true,
        mpesa_mode: "paybill",
        mpesa_paybill: "",
        mpesa_till: "",
        mpesa_business_name: "",
        airtel_enabled: false,
        airtel_money_number: "",
        airtel_business_name: "",
        instructions: "",
    })


    // =====================================================
    // LOAD SETTINGS
    // =====================================================

    useEffect(() => {

        if (!accessToken) {
            return
        }


        let cancelled = false


        const loadSettings = async () => {

            try {

                const data =
                    await getAdminPaymentSettings(
                        accessToken
                    )


                if (cancelled) {
                    return
                }


                const settings =
                    data?.payment_settings ||
                    data?.settings ||
                    data ||
                    {}


                const mpesa =
                    settings?.mpesa || {}

                const airtel =
                    settings?.airtel_money || {}


                setFormData({
                    mpesa_enabled:
                        settings?.mpesa_enabled ??
                        mpesa?.enabled ??
                        true,

                    mpesa_mode:
                        settings?.mpesa_mode ||
                        mpesa?.mode ||
                        "paybill",

                    mpesa_paybill:
                        settings?.mpesa_paybill ??
                        mpesa?.paybill ??
                        "",

                    mpesa_till:
                        settings?.mpesa_till ??
                        mpesa?.till ??
                        "",

                    mpesa_business_name:
                        settings?.mpesa_business_name ??
                        mpesa?.business_name ??
                        "",

                    airtel_enabled:
                        settings?.airtel_enabled ??
                        airtel?.enabled ??
                        false,

                    airtel_money_number:
                        settings?.airtel_money_number ??
                        airtel?.number ??
                        "",

                    airtel_business_name:
                        settings?.airtel_business_name ??
                        airtel?.business_name ??
                        "",

                    instructions:
                        settings?.instructions ??
                        "",
                })

            } catch (error) {

                if (cancelled) {
                    return
                }


                console.error(
                    "Failed to load admin payment settings:",
                    error
                )


                setError(
                    error?.response?.data?.message ||
                    error?.response?.data?.error ||
                    "We could not load the payment settings."
                )

            } finally {

                if (!cancelled) {
                    // Mark loading as finished without setState.
                    setLoadedToken(accessToken)

                    // Trigger a render using an existing state update.
                    setError((current) => current)
                }
            }
        }


        loadSettings()


        return () => {
            cancelled = true
        }

    }, [accessToken])


    // =====================================================
    // HANDLE INPUT CHANGES
    // =====================================================

    const handleChange = (event) => {

        const {
            name,
            value,
            type,
            checked,
        } = event.target


        setFormData((current) => ({
            ...current,

            [name]:
                type === "checkbox"
                    ? checked
                    : value,
        }))


        setError("")

        setSuccess("")
    }


    // =====================================================
    // SAVE SETTINGS
    // =====================================================

    const handleSubmit = async (event) => {

        event.preventDefault()

        setError("")

        setSuccess("")


        if (!accessToken) {

            setError(
                "Your login session has expired. Please log in again."
            )

            return
        }


        if (
            formData.mpesa_enabled &&
            !formData.mpesa_mode
        ) {

            setError(
                "Please select an M-Pesa payment mode."
            )

            return
        }


        if (
            formData.mpesa_enabled &&
            formData.mpesa_mode === "paybill" &&
            !formData.mpesa_paybill.trim()
        ) {

            setError(
                "Please enter the M-Pesa Paybill number."
            )

            return
        }


        if (
            formData.mpesa_enabled &&
            formData.mpesa_mode === "till" &&
            !formData.mpesa_till.trim()
        ) {

            setError(
                "Please enter the M-Pesa Till Number."
            )

            return
        }


        if (
            formData.airtel_enabled &&
            !formData.airtel_money_number.trim()
        ) {

            setError(
                "Please enter the Airtel Money number."
            )

            return
        }


        setSaving(true)

        try {

            await updateAdminPaymentSettings(
                {
                    mpesa_enabled:
                        formData.mpesa_enabled,

                    mpesa_mode:
                        formData.mpesa_mode,

                    mpesa_paybill:
                        formData.mpesa_paybill.trim(),

                    mpesa_till:
                        formData.mpesa_till.trim(),

                    mpesa_business_name:
                        formData.mpesa_business_name.trim(),

                    airtel_enabled:
                        formData.airtel_enabled,

                    airtel_money_number:
                        formData.airtel_money_number.trim(),

                    airtel_business_name:
                        formData.airtel_business_name.trim(),

                    instructions:
                        formData.instructions.trim(),
                },
                accessToken
            )


            setSuccess(
                "Payment settings updated successfully."
            )

            // Give the administrator a moment to see the saved
            // confirmation, then return them to the dashboard.
            setTimeout(() => {
                navigate("/dashboard")
            }, 1200)

        } catch (error) {

            console.error(
                "Failed to update payment settings:",
                error
            )

            setError(
                error?.response?.data?.message ||
                error?.response?.data?.error ||
                "We could not update the payment settings."
            )

        } finally {

            setSaving(false)
        }
    }


    // =====================================================
    // ACCESS CHECK
    // =====================================================

    if (
        user &&
        user.role &&
        user.role !== "admin"
    ) {

        return (
            <main className="admin-payment-settings-page">

                <section className="admin-payment-settings-card">

                    <div className="admin-payment-settings-header">

                        <span>
                            THAFARI • ADMIN
                        </span>

                        <h1>
                            Access denied
                        </h1>

                        <p>
                            Only administrators can manage
                            platform payment settings.
                        </p>

                    </div>

                </section>

            </main>
        )
    }


    // =====================================================
    // SESSION CHECK
    // =====================================================

    if (!accessToken) {

        return (
            <main className="admin-payment-settings-page">

                <section className="admin-payment-settings-card">

                    <div className="admin-payment-settings-loading">

                        <p>
                            Your login session has expired.
                            Please log in again.
                        </p>

                    </div>

                </section>

            </main>
        )
    }


    // =====================================================
    // LOADING STATE
    // =====================================================

    if (loadedToken !== accessToken) {

        return (
            <main className="admin-payment-settings-page">

                <section className="admin-payment-settings-card">

                    <div className="admin-payment-settings-loading">

                        <div className="admin-payment-settings-spinner"></div>

                        <p>
                            Loading payment settings...
                        </p>

                    </div>

                </section>

            </main>
        )
    }


    // =====================================================
    // MAIN PAGE
    // =====================================================

    return (
        <main className="admin-payment-settings-page">

            <section className="admin-payment-settings-container">

                {/* =================================================
                    PAGE HEADER
                ================================================= */}

                <header className="admin-payment-settings-header">

                    <div>

                        <span className="admin-payment-settings-eyebrow">
                            THAFARI • ADMINISTRATION
                        </span>

                        <h1>
                            Payment Settings
                        </h1>

                        <p>
                            Configure the payment methods and
                            payment details customers see when
                            making direct payments.
                        </p>

                    </div>

                </header>


                {/* =================================================
                    ALERTS
                ================================================= */}

                {error && (

                    <div className="admin-payment-settings-alert error">

                        <strong>
                            Something went wrong
                        </strong>

                        <span>
                            {error}
                        </span>

                    </div>
                )}


                {success && (

                    <div className="admin-payment-settings-alert success">

                        <strong>
                            Settings saved
                        </strong>

                        <span>
                            {success}
                        </span>

                    </div>
                )}


                <form
                    className="admin-payment-settings-form"
                    onSubmit={handleSubmit}
                >

                    {/* =================================================
                        M-PESA SETTINGS
                    ================================================= */}

                    <section className="admin-payment-settings-section">

                        <div className="admin-payment-settings-section-heading">

                            <div>

                                <span>
                                    M-PESA
                                </span>

                                <h2>
                                    M-Pesa Payment Settings
                                </h2>

                                <p>
                                    Choose whether customers should
                                    pay using your Paybill or Till
                                    Number.
                                </p>

                            </div>


                            <label className="admin-payment-settings-toggle">

                                <input
                                    type="checkbox"
                                    name="mpesa_enabled"
                                    checked={
                                        formData.mpesa_enabled
                                    }
                                    onChange={handleChange}
                                />

                                <span>
                                    {formData.mpesa_enabled
                                        ? "Enabled"
                                        : "Disabled"}
                                </span>

                            </label>

                        </div>


                        {formData.mpesa_enabled && (

                            <div className="admin-payment-settings-fields">

                                {/* -----------------------------------------
                                    M-PESA MODE
                                ----------------------------------------- */}

                                <div className="admin-payment-settings-field">

                                    <label htmlFor="mpesa_mode">
                                        Active M-Pesa Mode
                                    </label>

                                    <select
                                        id="mpesa_mode"
                                        name="mpesa_mode"
                                        value={
                                            formData.mpesa_mode
                                        }
                                        onChange={handleChange}
                                    >

                                        <option value="paybill">
                                            Paybill
                                        </option>

                                        <option value="till">
                                            Till Number
                                        </option>

                                    </select>

                                    <small>
                                        Customers will only see the
                                        selected payment option.
                                    </small>

                                </div>


                                {/* -----------------------------------------
                                    PAYBILL
                                ----------------------------------------- */}

                                <div className="admin-payment-settings-field">

                                    <label htmlFor="mpesa_paybill">
                                        M-Pesa Paybill Number
                                    </label>

                                    <input
                                        id="mpesa_paybill"
                                        type="text"
                                        name="mpesa_paybill"
                                        value={
                                            formData.mpesa_paybill
                                        }
                                        onChange={handleChange}
                                        placeholder="Enter Paybill number"
                                    />

                                </div>


                                {/* -----------------------------------------
                                    TILL
                                ----------------------------------------- */}

                                <div className="admin-payment-settings-field">

                                    <label htmlFor="mpesa_till">
                                        M-Pesa Till Number
                                    </label>

                                    <input
                                        id="mpesa_till"
                                        type="text"
                                        name="mpesa_till"
                                        value={
                                            formData.mpesa_till
                                        }
                                        onChange={handleChange}
                                        placeholder="Enter Till Number"
                                    />

                                </div>


                                {/* -----------------------------------------
                                    BUSINESS NAME
                                ----------------------------------------- */}

                                <div className="admin-payment-settings-field">

                                    <label htmlFor="mpesa_business_name">
                                        M-Pesa Business Name
                                    </label>

                                    <input
                                        id="mpesa_business_name"
                                        type="text"
                                        name="mpesa_business_name"
                                        value={
                                            formData.mpesa_business_name
                                        }
                                        onChange={handleChange}
                                        placeholder="e.g. Thafari Safaris"
                                    />

                                </div>

                            </div>
                        )}

                    </section>


                    {/* =================================================
                        AIRTEL MONEY SETTINGS
                    ================================================= */}

                    <section className="admin-payment-settings-section">

                        <div className="admin-payment-settings-section-heading">

                            <div>

                                <span>
                                    AIRTEL MONEY
                                </span>

                                <h2>
                                    Airtel Money Settings
                                </h2>

                                <p>
                                    Configure the Airtel Money details
                                    available to customers.
                                </p>

                            </div>


                            <label className="admin-payment-settings-toggle">

                                <input
                                    type="checkbox"
                                    name="airtel_enabled"
                                    checked={
                                        formData.airtel_enabled
                                    }
                                    onChange={handleChange}
                                />

                                <span>
                                    {formData.airtel_enabled
                                        ? "Enabled"
                                        : "Disabled"}
                                </span>

                            </label>

                        </div>


                        {formData.airtel_enabled && (

                            <div className="admin-payment-settings-fields">

                                <div className="admin-payment-settings-field">

                                    <label htmlFor="airtel_money_number">
                                        Airtel Money Number
                                    </label>

                                    <input
                                        id="airtel_money_number"
                                        type="text"
                                        name="airtel_money_number"
                                        value={
                                            formData.airtel_money_number
                                        }
                                        onChange={handleChange}
                                        placeholder="Enter Airtel Money number"
                                    />

                                </div>


                                <div className="admin-payment-settings-field">

                                    <label htmlFor="airtel_business_name">
                                        Airtel Money Business Name
                                    </label>

                                    <input
                                        id="airtel_business_name"
                                        type="text"
                                        name="airtel_business_name"
                                        value={
                                            formData.airtel_business_name
                                        }
                                        onChange={handleChange}
                                        placeholder="e.g. Thafari Safaris"
                                    />

                                </div>

                            </div>
                        )}

                    </section>


                    {/* =================================================
                        PAYMENT INSTRUCTIONS
                    ================================================= */}

                    <section className="admin-payment-settings-section">

                        <div className="admin-payment-settings-section-heading">

                            <div>

                                <span>
                                    CUSTOMER INSTRUCTIONS
                                </span>

                                <h2>
                                    Payment Instructions
                                </h2>

                                <p>
                                    These instructions are displayed
                                    to customers on the booking payment
                                    screen.
                                </p>

                            </div>

                        </div>


                        <div className="admin-payment-settings-field">

                            <label htmlFor="instructions">
                                Instructions
                            </label>

                            <textarea
                                id="instructions"
                                name="instructions"
                                value={
                                    formData.instructions
                                }
                                onChange={handleChange}
                                rows="6"
                                placeholder="Enter payment instructions for customers..."
                            />

                        </div>

                    </section>


                    {/* =================================================
                        SAVE BUTTON
                    ================================================= */}

                    <div className="admin-payment-settings-actions">

                        <button
                            type="submit"
                            className="admin-payment-settings-save"
                            disabled={saving}
                        >

                            {saving
                                ? "Saving settings..."
                                : success
                                    ? "Saved ✓"
                                    : "Save Payment Settings"}

                            {!saving && !success && (
                                <span>
                                    →
                                </span>
                            )}

                            {!saving && success && (
                                <span>
                                    ✓
                                </span>
                            )}

                        </button>

                    </div>

                </form>

            </section>

        </main>
    )
}


export default AdminPaymentSettings
