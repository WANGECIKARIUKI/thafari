// =========================================================
// THAFARI ADMIN SERVICES
// =========================================================
//
// This page allows administrators to:
//
// - View all Thafari services
// - Search services
// - Filter services by status
// - Add a service
// - Edit a service
// - Activate/deactivate a service
// - Permanently remove a service
//
// IMPORTANT:
// This page is for ADMIN users only.
//
// =========================================================

import { useEffect, useMemo, useState } from "react"

import {
    Link,
    Navigate,
} from "react-router-dom"

import { useAuth } from "../context/AuthContext"

import {
    getAdminServices,
    createService,
    updateService,
    deactivateService,
    reactivateService,
    deleteService,
} from "../services/serviceService"

import "./AdminServices.css"



function AdminServices() {

    // ---------------------------------------------------------
    // AUTHENTICATION
    // ---------------------------------------------------------

    const {
        user,
        accessToken,
    } = useAuth()



    // ---------------------------------------------------------
    // SERVICE STATE
    // ---------------------------------------------------------

    const [services, setServices] = useState([])

    const [loading, setLoading] = useState(true)

    const [error, setError] = useState("")

    const [success, setSuccess] = useState("")



    // ---------------------------------------------------------
    // SEARCH / FILTER STATE
    // ---------------------------------------------------------

    const [searchTerm, setSearchTerm] = useState("")

    const [statusFilter, setStatusFilter] = useState("all")



    // ---------------------------------------------------------
    // FORM STATE
    // ---------------------------------------------------------

    const [showForm, setShowForm] = useState(false)

    const [editingService, setEditingService] =
        useState(null)

    const [formData, setFormData] = useState({
        name: "",
        description: "",
        image_url: "",
        link_url: "",
        link_label: "",
        is_active: true,
    })



    // =========================================================
    // LOAD SERVICES
    // =========================================================

    const loadServices = async () => {

        try {

            setError("")

            const response =
                await getAdminServices(
                    accessToken
                )



            if (Array.isArray(response)) {

                setServices(response)

            } else {

                setServices(
                    response.services || []
                )
            }

        } catch (err) {

            console.error(
                "Failed to load services:",
                err
            )



            setError(
                err.response?.data?.message ||
                err.response?.data?.error ||
                "Failed to load services."
            )
        }
    }



    // =========================================================
    // INITIAL LOAD
    // =========================================================

    useEffect(() => {

        if (!accessToken) {
            return
        }



        let cancelled = false



        const fetchServices = async () => {

            try {

                const response =
                    await getAdminServices(
                        accessToken
                    )



                if (cancelled) {
                    return
                }



                if (Array.isArray(response)) {

                    setServices(response)

                } else {

                    setServices(
                        response.services || []
                    )
                }

            } catch (err) {

                if (cancelled) {
                    return
                }



                console.error(
                    "Failed to load services:",
                    err
                )



                setError(
                    err.response?.data?.message ||
                    err.response?.data?.error ||
                    "Failed to load services."
                )

            } finally {

                if (!cancelled) {

                    setLoading(false)
                }
            }
        }



        fetchServices()



        return () => {

            cancelled = true
        }

    }, [accessToken])



    // =========================================================
    // FILTER SERVICES
    // =========================================================

    const filteredServices = useMemo(() => {

        const search =
            searchTerm
                .trim()
                .toLowerCase()



        return services.filter(
            (service) => {

                const matchesSearch =
                    !search ||
                    service.name
                        ?.toLowerCase()
                        .includes(search) ||
                    service.description
                        ?.toLowerCase()
                        .includes(search)



                const matchesStatus =
                    statusFilter === "all" ||
                    (
                        statusFilter === "active" &&
                        service.is_active
                    ) ||
                    (
                        statusFilter === "inactive" &&
                        !service.is_active
                    )



                return (
                    matchesSearch &&
                    matchesStatus
                )
            }
        )

    }, [
        services,
        searchTerm,
        statusFilter,
    ])



    // =========================================================
    // STATISTICS
    // =========================================================

    const totalServices =
        services.length



    const activeServices =
        services.filter(
            (service) => service.is_active
        ).length



    const inactiveServices =
        services.filter(
            (service) => !service.is_active
        ).length



    // =========================================================
    // FORM INPUT
    // =========================================================

    const handleChange = (event) => {

        const {
            name,
            value,
            type,
            checked,
        } = event.target



        setFormData((previous) => ({
            ...previous,

            [name]:
                type === "checkbox"
                    ? checked
                    : value,
        }))
    }



    // =========================================================
    // RESET FORM
    // =========================================================

    const resetForm = () => {

        setFormData({
            name: "",
            description: "",
            image_url: "",
            link_url: "",
            link_label: "",
            is_active: true,
        })

        setEditingService(null)
    }



    // =========================================================
    // OPEN ADD FORM
    // =========================================================

    const handleAddService = () => {

        resetForm()

        setError("")

        setSuccess("")

        setShowForm(true)



        window.scrollTo({
            top: 0,
            behavior: "smooth",
        })
    }



    // =========================================================
    // OPEN EDIT FORM
    // =========================================================

    const handleEditService = (service) => {

        setEditingService(service)



        setFormData({
            name: service.name || "",
            description: service.description || "",
            image_url: service.image_url || "",
            link_url: service.link_url || "",
            link_label: service.link_label || "",
            is_active:
                service.is_active !== false,
        })



        setError("")

        setSuccess("")

        setShowForm(true)



        window.scrollTo({
            top: 0,
            behavior: "smooth",
        })
    }



    // =========================================================
    // CLOSE FORM
    // =========================================================

    const handleCancelForm = () => {

        resetForm()

        setShowForm(false)

        setError("")
    }



    // =========================================================
    // CREATE / UPDATE SERVICE
    // =========================================================

    const handleSubmit = async (event) => {

        event.preventDefault()

        setError("")

        setSuccess("")



        const name =
            formData.name.trim()

        const description =
            formData.description.trim()

        const imageUrl =
            formData.image_url.trim()

        const linkUrl =
            formData.link_url.trim()

        const linkLabel =
            formData.link_label.trim()



        if (!name) {

            setError(
                "Service name is required."
            )

            return
        }



        if (!description) {

            setError(
                "Service description is required."
            )

            return
        }



        try {

            const serviceData = {
                name,
                description,
                image_url: imageUrl || null,
                link_url: linkUrl || null,
                link_label: linkLabel || null,
                is_active:
                    formData.is_active,
            }



            // -------------------------------------------------
            // UPDATE EXISTING SERVICE
            // -------------------------------------------------

            if (editingService) {

                const response =
                    await updateService(
                        accessToken,
                        editingService.id,
                        serviceData
                    )



                setSuccess(
                    response.message ||
                    "Service updated successfully."
                )

            }



            // -------------------------------------------------
            // CREATE NEW SERVICE
            // -------------------------------------------------

            else {

                const response =
                    await createService(
                        accessToken,
                        serviceData
                    )



                setSuccess(
                    response.message ||
                    "Service created successfully."
                )
            }



            await loadServices()



            resetForm()

            setShowForm(false)

        } catch (err) {

            console.error(
                "Failed to save service:",
                err
            )



            setError(
                err.response?.data?.message ||
                err.response?.data?.error ||
                "Failed to save service."
            )
        }
    }



    // =========================================================
    // ACTIVATE / DEACTIVATE SERVICE
    // =========================================================

    const handleToggleStatus = async (service) => {

        setError("")

        setSuccess("")



        try {

            if (service.is_active) {

                await deactivateService(
                    accessToken,
                    service.id
                )



                setSuccess(
                    "Service deactivated successfully."
                )

            } else {

                await reactivateService(
                    accessToken,
                    service.id
                )



                setSuccess(
                    "Service reactivated successfully."
                )
            }



            await loadServices()

        } catch (err) {

            console.error(
                "Failed to change service status:",
                err
            )



            setError(
                err.response?.data?.message ||
                err.response?.data?.error ||
                "Failed to change service status."
            )
        }
    }



    // =========================================================
    // DELETE SERVICE
    // =========================================================

    const handleDeleteService = async (service) => {

        const confirmed =
            window.confirm(
                `Remove "${service.name}" permanently? This cannot be undone.`
            )



        if (!confirmed) {
            return
        }



        setError("")

        setSuccess("")



        try {

            await deleteService(
                accessToken,
                service.id
            )



            setSuccess(
                "Service removed successfully."
            )



            await loadServices()

        } catch (err) {

            console.error(
                "Failed to remove service:",
                err
            )



            setError(
                err.response?.data?.message ||
                err.response?.data?.error ||
                "Failed to remove service."
            )
        }
    }



    // =========================================================
    // ROLE PROTECTION
    // =========================================================

    if (
        user &&
        user.role !== "admin"
    ) {

        return (
            <Navigate
                to="/dashboard"
                replace
            />
        )
    }



    // =========================================================
    // PAGE
    // =========================================================

    return (

        <div className="admin-services-page">

            {/* =================================================
                HERO
            ================================================= */}

            <section className="admin-services-hero">

                <div className="admin-services-hero-content">

                    <div className="admin-services-breadcrumb">

                        <Link to="/dashboard">
                            Dashboard
                        </Link>

                        <span>
                            /
                        </span>

                        <span>
                            Services
                        </span>

                    </div>



                    <p className="admin-services-eyebrow">
                        PLATFORM MANAGEMENT
                    </p>



                    <h1>
                        Manage Services
                    </h1>



                    <p className="admin-services-subtitle">
                        Add, update and control the services
                        displayed on the Thafari website.
                    </p>

                </div>



                <button
                    type="button"
                    className="admin-add-service-button"
                    onClick={handleAddService}
                >

                    <span>
                        +
                    </span>

                    Add Service

                </button>

            </section>



            {/* =================================================
                ALERTS
            ================================================= */}

            {success && (

                <div className="admin-service-alert success">

                    <span>
                        ✓
                    </span>

                    <p>
                        {success}
                    </p>

                    <button
                        type="button"
                        onClick={() => setSuccess("")}
                        aria-label="Close success message"
                    >
                        ×
                    </button>

                </div>
            )}



            {error && (

                <div className="admin-service-alert error">

                    <span>
                        !
                    </span>

                    <p>
                        {error}
                    </p>

                    <button
                        type="button"
                        onClick={() => setError("")}
                        aria-label="Close error message"
                    >
                        ×
                    </button>

                </div>
            )}



            {/* =================================================
                STATISTICS
            ================================================= */}

            <section className="admin-service-stats">

                <article className="admin-service-stat">

                    <div className="admin-service-stat-icon">
                        🧳
                    </div>

                    <div>

                        <span>
                            Total Services
                        </span>

                        <strong>
                            {totalServices}
                        </strong>

                    </div>

                </article>



                <article className="admin-service-stat">

                    <div className="admin-service-stat-icon active-icon">
                        ✓
                    </div>

                    <div>

                        <span>
                            Active
                        </span>

                        <strong>
                            {activeServices}
                        </strong>

                    </div>

                </article>



                <article className="admin-service-stat">

                    <div className="admin-service-stat-icon inactive-icon">
                        ○
                    </div>

                    <div>

                        <span>
                            Inactive
                        </span>

                        <strong>
                            {inactiveServices}
                        </strong>

                    </div>

                </article>

            </section>



            {/* =================================================
                CREATE / EDIT FORM
            ================================================= */}

            {showForm && (

                <section className="admin-services-form-panel">

                    <div className="admin-services-form-header">

                        <div>

                            <p className="admin-services-form-eyebrow">
                                {editingService
                                    ? "EDIT SERVICE"
                                    : "NEW SERVICE"}
                            </p>

                            <h2>
                                {editingService
                                    ? "Update Service"
                                    : "Add a Service"}
                            </h2>

                        </div>

                    </div>



                    <form
                        className="admin-services-form"
                        onSubmit={handleSubmit}
                    >

                        <div className="admin-services-form-group">

                            <label htmlFor="service-name">
                                Service Name
                            </label>

                            <input
                                id="service-name"
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="e.g. Safari & Tour Bookings"
                                maxLength={150}
                                required
                            />

                        </div>



                        <div className="admin-services-form-group">

                            <label htmlFor="service-description">
                                Description
                            </label>

                            <textarea
                                id="service-description"
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                placeholder="Describe the service offered by Thafari."
                                rows={5}
                                required
                            />

                        </div>



                        <div className="admin-services-form-group">

                            <label htmlFor="service-image-url">
                                Image URL
                            </label>

                            <input
                                id="service-image-url"
                                type="url"
                                name="image_url"
                                value={formData.image_url}
                                onChange={handleChange}
                                placeholder="e.g. /services/safari-bookings.jpg"
                                maxLength={500}
                            />

                            <small>
                                Add the image URL that should appear on the public service card.
                            </small>

                        </div>



                        <div className="admin-services-form-group">

                            <label htmlFor="service-link-url">
                                Service Link
                            </label>

                            <input
                                id="service-link-url"
                                type="text"
                                name="link_url"
                                value={formData.link_url}
                                onChange={handleChange}
                                placeholder="e.g. /tours or /#contact"
                                maxLength={255}
                            />

                            <small>
                                Choose where the customer should go when they click the service action.
                            </small>

                        </div>



                        <div className="admin-services-form-group">

                            <label htmlFor="service-link-label">
                                Link Label
                            </label>

                            <input
                                id="service-link-label"
                                type="text"
                                name="link_label"
                                value={formData.link_label}
                                onChange={handleChange}
                                placeholder="e.g. Explore Safaris"
                                maxLength={100}
                            />

                            <small>
                                Example labels: Explore Safaris, Contact Us, Learn More.
                            </small>

                        </div>



                        <label className="admin-service-checkbox">

                            <input
                                type="checkbox"
                                name="is_active"
                                checked={formData.is_active}
                                onChange={handleChange}
                            />

                            <span>
                                Show this service on the public website
                            </span>

                        </label>



                        <div className="admin-services-form-actions">

                            <button
                                type="button"
                                className="admin-service-cancel-button"
                                onClick={handleCancelForm}
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                className="admin-service-save-button"
                            >
                                {editingService
                                    ? "Save Changes"
                                    : "Create Service"}
                            </button>

                        </div>

                    </form>

                </section>
            )}



            {/* =================================================
                SEARCH / FILTER
            ================================================= */}

            <section className="admin-services-toolbar">

                <div className="admin-services-search">

                    <label htmlFor="service-search">
                        Search
                    </label>

                    <input
                        id="service-search"
                        type="search"
                        value={searchTerm}
                        onChange={(event) =>
                            setSearchTerm(
                                event.target.value
                            )
                        }
                        placeholder="Search services..."
                    />

                </div>



                <div className="admin-services-filter">

                    <label htmlFor="service-status-filter">
                        Status
                    </label>

                    <select
                        id="service-status-filter"
                        value={statusFilter}
                        onChange={(event) =>
                            setStatusFilter(
                                event.target.value
                            )
                        }
                    >

                        <option value="all">
                            All
                        </option>

                        <option value="active">
                            Active
                        </option>

                        <option value="inactive">
                            Inactive
                        </option>

                    </select>

                </div>

            </section>



            {/* =================================================
                SERVICE LIST
            ================================================= */}

            <section className="admin-services-list-section">

                <div className="admin-services-section-heading">

                    <div>

                        <p>
                            SERVICES
                        </p>

                        <h2>
                            Available Services
                        </h2>

                    </div>

                    <span>
                        {filteredServices.length}
                    </span>

                </div>



                {loading && (

                    <div className="admin-services-empty-state">
                        Loading services...
                    </div>
                )}



                {!loading &&
                    filteredServices.length === 0 && (

                    <div className="admin-services-empty-state">

                        <div>
                            🧳
                        </div>

                        <h3>
                            No services found
                        </h3>

                        <p>
                            Add your first service or change
                            the current search/filter.
                        </p>

                    </div>
                )}



                {!loading &&
                    filteredServices.length > 0 && (

                    <div className="admin-services-grid">

                        {filteredServices.map(
                            (service) => (

                            <article
                                key={service.id}
                                className={
                                    `admin-service-card ${
                                        service.is_active
                                            ? ""
                                            : "inactive"
                                    }`
                                }
                            >

                                <div className="admin-service-card-top">

                                    <span className="admin-service-card-icon">
                                        🧭
                                    </span>

                                    <span
                                        className={
                                            `admin-service-status ${
                                                service.is_active
                                                    ? "active"
                                                    : "inactive"
                                            }`
                                        }
                                    >
                                        {service.is_active
                                            ? "Active"
                                            : "Inactive"}
                                    </span>

                                </div>



                                <h3>
                                    {service.name}
                                </h3>



                                <p>
                                    {service.description}
                                </p>



                                <div className="admin-service-card-actions">

                                    <button
                                        type="button"
                                        className="admin-service-edit-button"
                                        onClick={() =>
                                            handleEditService(
                                                service
                                            )
                                        }
                                    >
                                        Edit
                                    </button>



                                    <button
                                        type="button"
                                        className="admin-service-toggle-button"
                                        onClick={() =>
                                            handleToggleStatus(
                                                service
                                            )
                                        }
                                    >
                                        {service.is_active
                                            ? "Deactivate"
                                            : "Activate"}
                                    </button>



                                    <button
                                        type="button"
                                        className="admin-service-delete-button"
                                        onClick={() =>
                                            handleDeleteService(
                                                service
                                            )
                                        }
                                    >
                                        Remove
                                    </button>

                                </div>

                            </article>

                        ))}

                    </div>
                )}

            </section>

        </div>
    )
}


export default AdminServices
