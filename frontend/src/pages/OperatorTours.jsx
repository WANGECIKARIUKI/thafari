// =========================================================
// THAFARI TOUR OPERATOR TOURS
// =========================================================
//
// This page allows a TOUR OPERATOR to:
//
// - View only their own tours
// - Search tours
// - Filter tours by status
// - Create tours
// - Edit their own tours
// - Activate/deactivate tours
// - View departures inside the tour edit form
// - Add departures
// - Edit departures
// - Activate/deactivate departures
// - Manage itinerary, accommodation and FAQs
//
// IMPORTANT:
//
// The backend automatically assigns the currently logged-in
// tour operator when a new tour is created.
//
// Therefore this page does NOT ask the operator for
// tour_operator_id.
//
// =========================================================

import {
    useEffect,
    useMemo,
    useState,
} from "react"

import {
    Link,
    Navigate,
} from "react-router-dom"

import { useAuth } from "../context/AuthContext"

import {
    getManageableTours,
    createTour,
    updateTour,
    deactivateTour,
    reactivateTour,
} from "../services/tourService"

import {
    getManageableDepartures,
    createDeparture,
    updateDeparture,
    deactivateDeparture,
    reactivateDeparture,
} from "../services/departureService"

import {
    getTourPackage,
    createItinerary,
    updateItinerary,
    deleteItinerary,
    createAccommodation,
    updateAccommodation,
    deleteAccommodation,
    createTourFaq,
    updateTourFaq,
    deleteTourFaq,
} from "../services/tourService"

import "./OperatorTours.css"


function OperatorTours() {

    // =====================================================
    // AUTHENTICATION
    // =====================================================

    const {
        user,
        accessToken,
    } = useAuth()


    // =====================================================
    // TOUR STATE
    // =====================================================

    const [tours, setTours] = useState([])

    const [loading, setLoading] = useState(true)

    const [error, setError] = useState("")

    const [success, setSuccess] = useState("")


    // =====================================================
    // SEARCH / FILTER STATE
    // =====================================================

    const [searchTerm, setSearchTerm] = useState("")

    const [statusFilter, setStatusFilter] = useState("all")


    // =====================================================
    // TOUR FORM STATE
    // =====================================================

    // Controls whether the create/edit form is visible.
    const [showForm, setShowForm] = useState(false)

    // null = creating a new tour.
    // Object = editing an existing tour.
    const [editingTour, setEditingTour] = useState(null)


    // =====================================================
    // TOUR FORM DATA
    // =====================================================

    const [formData, setFormData] = useState({

        tour_name: "",

        destination: "",

        description: "",

        duration_days: "",

        duration_nights: "",

        charges: "",

        cover_image: "",

        gallery_images: "",

    })


    // =====================================================
    // DEPARTURE STATE
    // =====================================================

    // All departures belonging to the selected tour.
    const [tourDepartures, setTourDepartures] = useState([])

    // Loading state for departures.
    const [departuresLoading, setDeparturesLoading] =
        useState(false)

    // Controls the inline departure editor.
    const [showDepartureEditor, setShowDepartureEditor] =
        useState(false)

    // null = creating a departure.
    // Object = editing an existing departure.
    const [editingDeparture, setEditingDeparture] =
        useState(null)

    // Prevents duplicate departure submissions.
    const [departureSaving, setDepartureSaving] =
        useState(false)

    // Departure form fields.
    const [departureFormData, setDepartureFormData] = useState({

        start_date: "",

        end_date: "",

        capacity: "",

        price_per_person: "",

        is_active: true,

    })


    // =====================================================
    // TOUR PACKAGE STATE
    // =====================================================

    const [tourPackage, setTourPackage] = useState({
        itineraries: [],
        accommodations: [],
        faqs: [],
    })

    const [packageLoading, setPackageLoading] =
        useState(false)

    const [packageSaving, setPackageSaving] =
        useState(false)

    const [packageSection, setPackageSection] =
        useState("itinerary")

    const [editingItinerary, setEditingItinerary] =
        useState(null)

    const [editingAccommodation, setEditingAccommodation] =
        useState(null)

    const [editingFaq, setEditingFaq] =
        useState(null)

    const [itineraryFormData, setItineraryFormData] =
        useState({
            day_number: "",
            title: "",
            description: "",
        })

    const [accommodationFormData, setAccommodationFormData] =
        useState({
            name: "",
            category: "budget",
            location: "",
            room_type: "",
            meal_plan: "",
            description: "",
        })

    const [faqFormData, setFaqFormData] =
        useState({
            question: "",
            answer: "",
        })


    // =====================================================
    // LOAD TOURS
    // =====================================================
    //
    // This function is used after button actions such as:
    //
    // - creating a tour
    // - updating a tour
    // - activating/deactivating a tour
    //
    // The initial page load is handled separately inside
    // useEffect so React does not complain about synchronous
    // state updates triggered directly from an effect.
    // =====================================================

    const loadTours = async () => {

        try {

            setError("")

            const response =
                await getManageableTours(
                    accessToken
                )


            if (Array.isArray(response)) {

                setTours(response)

            } else {

                setTours(
                    response?.tours || []
                )
            }

        } catch (err) {

            console.error(
                "Failed to load operator tours:",
                err
            )

            setError(
                err.response?.data?.message ||
                err.response?.data?.error ||
                "Failed to load your tours."
            )
        }
    }


    // =====================================================
    // INITIAL TOUR LOAD
    // =====================================================
    //
    // We intentionally do NOT call loadTours() directly here.
    //
    // This avoids the React warning about state updates
    // happening synchronously inside an effect.
    // =====================================================

    useEffect(() => {

        let cancelled = false


        const loadInitialTours = async () => {

            if (!accessToken) {

                return
            }


            try {

                const response =
                    await getManageableTours(
                        accessToken
                    )


                if (cancelled) {

                    return
                }


                if (Array.isArray(response)) {

                    setTours(response)

                } else {

                    setTours(
                        response?.tours || []
                    )
                }

            } catch (err) {

                if (cancelled) {

                    return
                }


                console.error(
                    "Failed to load operator tours:",
                    err
                )

                setError(
                    err.response?.data?.message ||
                    err.response?.data?.error ||
                    "Failed to load your tours."
                )

            } finally {

                if (!cancelled) {

                    setLoading(false)
                }
            }
        }


        loadInitialTours()


        return () => {

            cancelled = true
        }

    }, [accessToken])


    // =====================================================
    // TOUR FORM INPUT
    // =====================================================

    const handleChange = (event) => {

        const {
            name,
            value,
        } = event.target


        setFormData((previous) => ({

            ...previous,

            [name]: value,

        }))
    }


    // =====================================================
    // RESET DEPARTURE FORM
    // =====================================================

    const resetDepartureForm = () => {

        setDepartureFormData({

            start_date: "",

            end_date: "",

            capacity: "",

            price_per_person: "",

            is_active: true,

        })

        setEditingDeparture(null)

        setShowDepartureEditor(false)
    }


    // =====================================================
    // RESET TOUR FORM
    // =====================================================

    const resetForm = () => {

        setFormData({

            tour_name: "",

            destination: "",

            description: "",

            duration_days: "",

            duration_nights: "",

            charges: "",

            cover_image: "",

            gallery_images: "",

        })

        setEditingTour(null)

        setTourDepartures([])

        setDeparturesLoading(false)

        setTourPackage({
            itineraries: [],
            accommodations: [],
            faqs: [],
        })

        setPackageSection("itinerary")

        setEditingItinerary(null)

        setEditingAccommodation(null)

        setEditingFaq(null)

        setItineraryFormData({
            day_number: "",
            title: "",
            description: "",
        })

        setAccommodationFormData({
            name: "",
            category: "budget",
            location: "",
            room_type: "",
            meal_plan: "",
            description: "",
        })

        setFaqFormData({
            question: "",
            answer: "",
        })

        setPackageLoading(false)

        setPackageSaving(false)

        resetDepartureForm()
    }


    // =====================================================
    // OPEN CREATE TOUR FORM
    // =====================================================

    const handleAddTour = () => {

        resetForm()

        setError("")

        setSuccess("")

        setShowForm(true)


        window.scrollTo({

            top: 0,

            behavior: "smooth",

        })
    }


    // =====================================================
    // LOAD DEPARTURES
    // =====================================================

    const loadDepartures = async (tourId) => {

        if (!tourId || !accessToken) {

            return
        }


        try {

            setDeparturesLoading(true)

            setError("")


            const response =
                await getManageableDepartures(
                    accessToken,
                    tourId
                )


            if (Array.isArray(response)) {

                setTourDepartures(response)

            } else {

                setTourDepartures(
                    response?.departures || []
                )
            }

        } catch (err) {

            console.error(
                "Failed to load departures:",
                err
            )

            setError(
                err.response?.data?.message ||
                err.response?.data?.error ||
                "Failed to load departures."
            )

            setTourDepartures([])

        } finally {

            setDeparturesLoading(false)
        }
    }


    // ---------------------------------------------------------
    // RESET PACKAGE FORMS
    // ---------------------------------------------------------

    const resetItineraryForm = () => {

        setItineraryFormData({
            day_number: "",
            title: "",
            description: "",
        })

        setEditingItinerary(null)
    }


    const resetAccommodationForm = () => {

        setAccommodationFormData({
            name: "",
            category: "budget",
            location: "",
            room_type: "",
            meal_plan: "",
            description: "",
        })

        setEditingAccommodation(null)
    }


    const resetFaqForm = () => {

        setFaqFormData({
            question: "",
            answer: "",
        })

        setEditingFaq(null)
    }


    // ---------------------------------------------------------
    // LOAD TOUR PACKAGE
    // ---------------------------------------------------------

    const loadTourPackage = async (tourId) => {

        try {

            setPackageLoading(true)

            const response =
                await getTourPackage(tourId)

            setTourPackage({
                itineraries:
                    Array.isArray(response?.itineraries)
                        ? response.itineraries
                        : [],

                accommodations:
                    Array.isArray(response?.accommodations)
                        ? response.accommodations
                        : [],

                faqs:
                    Array.isArray(response?.faqs)
                        ? response.faqs
                        : [],
            })

        } catch (err) {

            console.error(
                "Failed to load tour package:",
                err
            )

            setError(
                err.response?.data?.message ||
                err.response?.data?.error ||
                "Failed to load tour package."
            )

        } finally {

            setPackageLoading(false)
        }
    }


    // ---------------------------------------------------------
    // ITINERARY INPUT
    // ---------------------------------------------------------

    const handleItineraryChange = (event) => {

        const {
            name,
            value,
        } = event.target

        setItineraryFormData((previous) => ({
            ...previous,
            [name]: value,
        }))
    }


    // ---------------------------------------------------------
    // OPEN ITINERARY EDITOR
    // ---------------------------------------------------------

    const handleEditItinerary = (item) => {

        setEditingItinerary(item)

        setItineraryFormData({
            day_number:
                item.day_number ?? "",

            title:
                item.title || "",

            description:
                item.description || "",
        })

        setPackageSection("itinerary")
    }


    // ---------------------------------------------------------
    // SAVE ITINERARY
    // ---------------------------------------------------------

    const handleSaveItinerary = async () => {

        if (!editingTour) {

            setError(
                "Save the tour first before adding itinerary items."
            )

            return
        }

        if (
            !itineraryFormData.day_number ||
            !itineraryFormData.title.trim() ||
            !itineraryFormData.description.trim()
        ) {

            setError(
                "Please complete the itinerary day, title and description."
            )

            return
        }

        try {

            setPackageSaving(true)
            setError("")
            setSuccess("")

            const payload = {
                day_number:
                    Number(
                        itineraryFormData.day_number
                    ),

                title:
                    itineraryFormData.title.trim(),

                description:
                    itineraryFormData.description.trim(),
            }

            let response

            if (editingItinerary) {

                const itineraryId =
                    editingItinerary.itinerary_id ??
                    editingItinerary.id

                response =
                    await updateItinerary(
                        accessToken,
                        editingTour.id,
                        itineraryId,
                        payload
                    )

            } else {

                response =
                    await createItinerary(
                        accessToken,
                        editingTour.id,
                        payload
                    )
            }

            setSuccess(
                response.message ||
                (
                    editingItinerary
                        ? "Itinerary updated successfully."
                        : "Itinerary added successfully."
                )
            )

            await loadTourPackage(
                editingTour.id
            )

            resetItineraryForm()

        } catch (err) {

            console.error(
                "Failed to save itinerary:",
                err
            )

            setError(
                err.response?.data?.message ||
                err.response?.data?.error ||
                "Failed to save itinerary."
            )

        } finally {

            setPackageSaving(false)
        }
    }


    // ---------------------------------------------------------
    // DELETE ITINERARY
    // ---------------------------------------------------------

    const handleDeleteItinerary = async (item) => {

        if (!editingTour) {
            return
        }

        const confirmed =
            window.confirm(
                "Are you sure you want to delete this itinerary item?"
            )

        if (!confirmed) {
            return
        }

        try {

            setPackageSaving(true)
            setError("")
            setSuccess("")

            const itineraryId =
                item.itinerary_id ??
                item.id

            const response =
                await deleteItinerary(
                    accessToken,
                    editingTour.id,
                    itineraryId
                )

            setSuccess(
                response.message ||
                "Itinerary item deleted successfully."
            )

            if (
                editingItinerary &&
                (
                    editingItinerary.itinerary_id ??
                    editingItinerary.id
                ) === itineraryId
            ) {
                resetItineraryForm()
            }

            await loadTourPackage(
                editingTour.id
            )

        } catch (err) {

            console.error(
                "Failed to delete itinerary:",
                err
            )

            setError(
                err.response?.data?.message ||
                err.response?.data?.error ||
                "Failed to delete itinerary item."
            )

        } finally {

            setPackageSaving(false)
        }
    }


    // ---------------------------------------------------------
    // ACCOMMODATION INPUT
    // ---------------------------------------------------------

    const handleAccommodationChange = (event) => {

        const {
            name,
            value,
        } = event.target

        setAccommodationFormData((previous) => ({
            ...previous,
            [name]: value,
        }))
    }


    // ---------------------------------------------------------
    // OPEN ACCOMMODATION EDITOR
    // ---------------------------------------------------------

    const handleEditAccommodation = (item) => {

        setEditingAccommodation(item)

        setAccommodationFormData({
            name:
                item.name || "",

            category:
                item.category || "budget",

            location:
                item.location || "",

            room_type:
                item.room_type || "",

            meal_plan:
                item.meal_plan || "",

            description:
                item.description || "",
        })

        setPackageSection("accommodation")
    }


    // ---------------------------------------------------------
    // SAVE ACCOMMODATION
    // ---------------------------------------------------------

    const handleSaveAccommodation = async () => {

        if (!editingTour) {

            setError(
                "Save the tour first before adding accommodation."
            )

            return
        }

        if (
            !accommodationFormData.name.trim() ||
            !accommodationFormData.location.trim() ||
            !accommodationFormData.room_type.trim() ||
            !accommodationFormData.meal_plan.trim()
        ) {

            setError(
                "Please complete the accommodation name, location, room type and meal plan."
            )

            return
        }

        try {

            setPackageSaving(true)
            setError("")
            setSuccess("")

            const payload = {
                name:
                    accommodationFormData.name.trim(),

                category:
                    accommodationFormData.category,

                location:
                    accommodationFormData.location.trim(),

                room_type:
                    accommodationFormData.room_type.trim(),

                meal_plan:
                    accommodationFormData.meal_plan.trim(),

                description:
                    accommodationFormData.description.trim(),
            }

            let response

            if (editingAccommodation) {

                const accommodationId =
                    editingAccommodation.accommodation_id ??
                    editingAccommodation.id

                response =
                    await updateAccommodation(
                        accessToken,
                        editingTour.id,
                        accommodationId,
                        payload
                    )

            } else {

                response =
                    await createAccommodation(
                        accessToken,
                        editingTour.id,
                        payload
                    )
            }

            setSuccess(
                response.message ||
                (
                    editingAccommodation
                        ? "Accommodation updated successfully."
                        : "Accommodation added successfully."
                )
            )

            await loadTourPackage(
                editingTour.id
            )

            resetAccommodationForm()

        } catch (err) {

            console.error(
                "Failed to save accommodation:",
                err
            )

            setError(
                err.response?.data?.message ||
                err.response?.data?.error ||
                "Failed to save accommodation."
            )

        } finally {

            setPackageSaving(false)
        }
    }


    // ---------------------------------------------------------
    // DELETE ACCOMMODATION
    // ---------------------------------------------------------

    const handleDeleteAccommodation = async (item) => {

        if (!editingTour) {
            return
        }

        const confirmed =
            window.confirm(
                "Are you sure you want to delete this accommodation?"
            )

        if (!confirmed) {
            return
        }

        try {

            setPackageSaving(true)
            setError("")
            setSuccess("")

            const accommodationId =
                item.accommodation_id ??
                item.id

            const response =
                await deleteAccommodation(
                    accessToken,
                    editingTour.id,
                    accommodationId
                )

            setSuccess(
                response.message ||
                "Accommodation deleted successfully."
            )

            if (
                editingAccommodation &&
                (
                    editingAccommodation.accommodation_id ??
                    editingAccommodation.id
                ) === accommodationId
            ) {
                resetAccommodationForm()
            }

            await loadTourPackage(
                editingTour.id
            )

        } catch (err) {

            console.error(
                "Failed to delete accommodation:",
                err
            )

            setError(
                err.response?.data?.message ||
                err.response?.data?.error ||
                "Failed to delete accommodation."
            )

        } finally {

            setPackageSaving(false)
        }
    }


    // ---------------------------------------------------------
    // FAQ INPUT
    // ---------------------------------------------------------

    const handleFaqChange = (event) => {

        const {
            name,
            value,
        } = event.target

        setFaqFormData((previous) => ({
            ...previous,
            [name]: value,
        }))
    }


    // ---------------------------------------------------------
    // OPEN FAQ EDITOR
    // ---------------------------------------------------------

    const handleEditFaq = (item) => {

        setEditingFaq(item)

        setFaqFormData({
            question:
                item.question || "",

            answer:
                item.answer || "",
        })

        setPackageSection("faq")
    }


    // ---------------------------------------------------------
    // SAVE FAQ
    // ---------------------------------------------------------

    const handleSaveFaq = async () => {

        if (!editingTour) {

            setError(
                "Save the tour first before adding FAQs."
            )

            return
        }

        if (
            !faqFormData.question.trim() ||
            !faqFormData.answer.trim()
        ) {

            setError(
                "Please enter both the FAQ question and answer."
            )

            return
        }

        try {

            setPackageSaving(true)
            setError("")
            setSuccess("")

            const payload = {
                question:
                    faqFormData.question.trim(),

                answer:
                    faqFormData.answer.trim(),
            }

            let response

            if (editingFaq) {

                const faqId =
                    editingFaq.faq_id ??
                    editingFaq.id

                response =
                    await updateTourFaq(
                        accessToken,
                        editingTour.id,
                        faqId,
                        payload
                    )

            } else {

                response =
                    await createTourFaq(
                        accessToken,
                        editingTour.id,
                        payload
                    )
            }

            setSuccess(
                response.message ||
                (
                    editingFaq
                        ? "FAQ updated successfully."
                        : "FAQ added successfully."
                )
            )

            await loadTourPackage(
                editingTour.id
            )

            resetFaqForm()

        } catch (err) {

            console.error(
                "Failed to save FAQ:",
                err
            )

            setError(
                err.response?.data?.message ||
                err.response?.data?.error ||
                "Failed to save FAQ."
            )

        } finally {

            setPackageSaving(false)
        }
    }


    // ---------------------------------------------------------
    // DELETE FAQ
    // ---------------------------------------------------------

    const handleDeleteFaq = async (item) => {

        if (!editingTour) {
            return
        }

        const confirmed =
            window.confirm(
                "Are you sure you want to delete this FAQ?"
            )

        if (!confirmed) {
            return
        }

        try {

            setPackageSaving(true)
            setError("")
            setSuccess("")

            const faqId =
                item.faq_id ??
                item.id

            const response =
                await deleteTourFaq(
                    accessToken,
                    editingTour.id,
                    faqId
                )

            setSuccess(
                response.message ||
                "FAQ deleted successfully."
            )

            if (
                editingFaq &&
                (
                    editingFaq.faq_id ??
                    editingFaq.id
                ) === faqId
            ) {
                resetFaqForm()
            }

            await loadTourPackage(
                editingTour.id
            )

        } catch (err) {

            console.error(
                "Failed to delete FAQ:",
                err
            )

            setError(
                err.response?.data?.message ||
                err.response?.data?.error ||
                "Failed to delete FAQ."
            )

        } finally {

            setPackageSaving(false)
        }
    }




    // =====================================================
    // OPEN EDIT TOUR FORM
    // =====================================================

    const handleEditTour = async (tour) => {

        setEditingTour(tour)

        setFormData({

            tour_name:
                tour.tour_name || "",

            destination:
                tour.destination || "",

            description:
                tour.description || "",

            duration_days:
                tour.duration_days ?? "",

            duration_nights:
                tour.duration_nights ?? "",

            charges:
                tour.charges ?? "",

            cover_image:
                tour.cover_image || "",

            gallery_images:
                Array.isArray(
                    tour.gallery_images
                )
                    ? tour.gallery_images.join("\n")
                    : "",

        })


        setError("")

        setSuccess("")

        setShowForm(true)

        resetDepartureForm()


        // Load departures for this tour.
        await loadDepartures(tour.id)

        // Load itinerary, accommodation and FAQ content.
        await loadTourPackage(tour.id)


        window.scrollTo({

            top: 0,

            behavior: "smooth",

        })
    }


    // =====================================================
    // CLOSE TOUR FORM
    // =====================================================

    const handleCancelForm = () => {

        resetForm()

        setShowForm(false)

        setError("")
    }


    // =====================================================
    // CREATE / UPDATE TOUR
    // =====================================================

    const handleSubmit = async (event) => {

        event.preventDefault()

        setError("")

        setSuccess("")


        try {

            // Convert gallery URLs into an array.
            const galleryImages =
                formData.gallery_images

                    .split("\n")

                    .map(
                        (url) => url.trim()
                    )

                    .filter(Boolean)


            // Prepare request body.
            const tourData = {

                tour_name:
                    formData.tour_name.trim(),

                destination:
                    formData.destination.trim(),

                description:
                    formData.description.trim(),

                duration_days:
                    formData.duration_days
                        ? Number(
                            formData.duration_days
                        )
                        : null,

                duration_nights:
                    formData.duration_nights
                        ? Number(
                            formData.duration_nights
                        )
                        : null,

                charges:
                    formData.charges
                        ? Number(
                            formData.charges
                        )
                        : null,

                cover_image:
                    formData.cover_image.trim() ||
                    null,

                gallery_images:
                    galleryImages,

            }


            // =================================================
            // UPDATE EXISTING TOUR
            // =================================================

            if (editingTour) {

                const response =
                    await updateTour(

                        accessToken,

                        editingTour.id,

                        tourData

                    )


                const updatedTour =
                    response?.tour ||
                    response


                setEditingTour(
                    updatedTour
                )


                setSuccess(
                    response?.message ||
                    "Tour updated successfully."
                )


                // After editing an existing tour, return to the
                // main "My Tours" list automatically.
                // The operator no longer needs to close the form manually.
                await loadTours()

                resetForm()

                setShowForm(false)

                return
            }


            // =================================================
            // CREATE NEW TOUR
            // =================================================
            //
            // IMPORTANT:
            //
            // We do NOT send tour_operator_id.
            //
            // The backend automatically assigns the logged-in
            // tour operator.
            // =================================================

            const response =
                await createTour(

                    accessToken,

                    tourData

                )


            const createdTour =
                response?.tour ||
                response


            const createdTourId =
                createdTour?.id ||
                createdTour?.tour_id


            // Refresh the main list.
            await loadTours()


            // If the backend returned the newly created tour,
            // immediately switch the form into EDIT mode.
            //
            // This lets the operator add departures without
            // leaving the form.
            if (createdTourId) {

                const normalizedTour = {

                    ...createdTour,

                    id: createdTourId,

                }


                setEditingTour(
                    normalizedTour
                )


                setSuccess(
                    "Tour created successfully. You can now add departures below."
                )


                await loadDepartures(
                    createdTourId
                )

                return
            }


            // Fallback in case the backend response does not
            // include the created tour ID.
            setSuccess(
                response?.message ||
                "Tour created successfully."
            )

            resetForm()

            setShowForm(false)

        } catch (err) {

            console.error(
                "Failed to save operator tour:",
                err
            )

            setError(
                err.response?.data?.message ||
                err.response?.data?.error ||
                "Failed to save tour."
            )
        }
    }


    // =====================================================
    // ACTIVATE / DEACTIVATE TOUR
    // =====================================================

    const handleToggleStatus = async (tour) => {

        try {

            setError("")

            setSuccess("")


            if (tour.is_active) {

                await deactivateTour(

                    accessToken,

                    tour.id

                )


                setSuccess(
                    "Tour deactivated successfully."
                )

            } else {

                await reactivateTour(

                    accessToken,

                    tour.id

                )


                setSuccess(
                    "Tour reactivated successfully."
                )
            }


            await loadTours()

        } catch (err) {

            console.error(
                "Failed to change tour status:",
                err
            )

            setError(
                err.response?.data?.message ||
                err.response?.data?.error ||
                "Failed to change tour status."
            )
        }
    }


    // =====================================================
    // DEPARTURE FORM INPUT
    // =====================================================

    const handleDepartureChange = (event) => {

        const {
            name,
            value,
            type,
            checked,
        } = event.target


        setDepartureFormData((previous) => ({
            ...previous,

            [name]:
                type === "checkbox"
                    ? checked
                    : value,
        }))
    }


    // =====================================================
    // OPEN ADD DEPARTURE
    // =====================================================

    const handleAddDeparture = () => {

        resetDepartureForm()

        setShowDepartureEditor(true)

        setError("")

        setSuccess("")
    }


    // =====================================================
    // OPEN EDIT DEPARTURE
    // =====================================================

    const handleEditDeparture = (departure) => {

        setEditingDeparture(
            departure
        )


        setDepartureFormData({

            start_date:
                departure.start_date || "",

            end_date:
                departure.end_date || "",

            capacity:
                departure.capacity ?? "",

            price_per_person:
                departure.price_per_person ?? "",

            is_active:
                departure.is_active !== false,

        })


        setShowDepartureEditor(true)

        setError("")

        setSuccess("")
    }


    // =====================================================
    // SAVE DEPARTURE
    // =====================================================

    const handleDepartureSave = async () => {

        if (!editingTour?.id) {

            setError(
                "Save the tour before adding a departure."
            )

            return
        }


        setDepartureSaving(true)

        setError("")

        setSuccess("")


        try {

            const departureData = {

                start_date:
                    departureFormData.start_date,

                end_date:
                    departureFormData.end_date,

                capacity:
                    Number(
                        departureFormData.capacity
                    ),

                price_per_person:
                    Number(
                        departureFormData.price_per_person
                    ),

                is_active:
                    departureFormData.is_active,

                tour_id:
                    editingTour.id,

            }


            // =================================================
            // UPDATE EXISTING DEPARTURE
            // =================================================

            if (editingDeparture) {

                const response =
                    await updateDeparture(

                        accessToken,

                        editingDeparture.departure_id,

                        departureData

                    )


                setSuccess(
                    response?.message ||
                    "Departure updated successfully."
                )

            }


            // =================================================
            // CREATE NEW DEPARTURE
            // =================================================

            else {

                const response =
                    await createDeparture(

                        accessToken,

                        departureData

                    )


                setSuccess(
                    response?.message ||
                    "Departure created successfully."
                )
            }


            // Reload departures so available seats,
            // status and other values are fresh.
            await loadDepartures(
                editingTour.id
            )


            resetDepartureForm()

        } catch (err) {

            console.error(
                "Failed to save departure:",
                err
            )

            setError(
                err.response?.data?.message ||
                err.response?.data?.error ||
                "Failed to save departure."
            )

        } finally {

            setDepartureSaving(false)
        }
    }


    // =====================================================
    // ACTIVATE / DEACTIVATE DEPARTURE
    // =====================================================

    const handleToggleDepartureStatus =
        async (departure) => {

            try {

                setError("")

                setSuccess("")


                if (departure.is_active) {

                    await deactivateDeparture(

                        accessToken,

                        departure.departure_id

                    )


                    setSuccess(
                        "Departure deactivated successfully."
                    )

                } else {

                    await reactivateDeparture(

                        accessToken,

                        departure.departure_id

                    )


                    setSuccess(
                        "Departure reactivated successfully."
                    )
                }


                await loadDepartures(
                    editingTour.id
                )

            } catch (err) {

                console.error(
                    "Failed to change departure status:",
                    err
                )

                setError(
                    err.response?.data?.message ||
                    err.response?.data?.error ||
                    "Failed to change departure status."
                )
            }
        }


    // =====================================================
    // FILTER TOURS
    // =====================================================

    const filteredTours = useMemo(() => {

        const search =
            searchTerm
                .trim()
                .toLowerCase()


        return tours.filter((tour) => {

            const matchesSearch =
                !search ||

                (tour.tour_name || "")
                    .toLowerCase()
                    .includes(search) ||

                (tour.destination || "")
                    .toLowerCase()
                    .includes(search)


            const matchesStatus =
                statusFilter === "all" ||

                (
                    statusFilter === "active" &&
                    tour.is_active
                ) ||

                (
                    statusFilter === "inactive" &&
                    !tour.is_active
                )


            return (
                matchesSearch &&
                matchesStatus
            )
        })

    }, [
        tours,
        searchTerm,
        statusFilter,
    ])


    // =====================================================
    // STATISTICS
    // =====================================================

    const totalTours =
        tours.length


    const activeTours =
        tours.filter(
            (tour) => tour.is_active
        ).length


    const inactiveTours =
        tours.filter(
            (tour) => !tour.is_active
        ).length


    // =====================================================
    // ROLE PROTECTION
    // =====================================================

    if (
        user &&
        user.role !== "tour_operator"
    ) {

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

        <div className="admin-tours-page">

            {/* =================================================
                HERO
            ================================================= */}

            <section className="admin-tours-hero">

                <div className="admin-tours-hero-content">

                    <div className="admin-tours-breadcrumb">

                        <Link to="/dashboard">
                            Dashboard
                        </Link>

                        <span>
                            /
                        </span>

                        <span>
                            My Tours
                        </span>

                    </div>


                    <p className="admin-tours-eyebrow">
                        TOUR OPERATOR WORKSPACE
                    </p>


                    <h1>
                        My Tours
                    </h1>


                    <p className="admin-tours-subtitle">
                        Create and manage the safari
                        experiences you offer through
                        Thafari.
                    </p>

                </div>


                <button
                    type="button"
                    className="admin-add-tour-button"
                    onClick={handleAddTour}
                >
                    <span>
                        +
                    </span>

                    Add Tour
                </button>

            </section>


            {/* =================================================
                ALERTS
            ================================================= */}

            {success && (

                <div className="admin-tour-alert success">

                    <span>
                        ✓
                    </span>

                    <p>
                        {success}
                    </p>

                    <button
                        type="button"
                        onClick={() =>
                            setSuccess("")
                        }
                        aria-label="Close success message"
                    >
                        ×
                    </button>

                </div>
            )}


            {error && (

                <div className="admin-tour-alert error">

                    <span>
                        !
                    </span>

                    <p>
                        {error}
                    </p>

                    <button
                        type="button"
                        onClick={() =>
                            setError("")
                        }
                        aria-label="Close error message"
                    >
                        ×
                    </button>

                </div>
            )}


            {/* =================================================
                STATISTICS
            ================================================= */}

            <section className="admin-tour-stats">

                <article className="admin-tour-stat">

                    <div className="admin-tour-stat-icon">
                        🏕️
                    </div>

                    <div>

                        <span>
                            Total Tours
                        </span>

                        <strong>
                            {totalTours}
                        </strong>

                    </div>

                </article>


                <article className="admin-tour-stat">

                    <div className="admin-tour-stat-icon active-icon">
                        ✓
                    </div>

                    <div>

                        <span>
                            Active
                        </span>

                        <strong>
                            {activeTours}
                        </strong>

                    </div>

                </article>


                <article className="admin-tour-stat">

                    <div className="admin-tour-stat-icon inactive-icon">
                        ○
                    </div>

                    <div>

                        <span>
                            Inactive
                        </span>

                        <strong>
                            {inactiveTours}
                        </strong>

                    </div>

                </article>

            </section>


            {/* =================================================
                CREATE / EDIT TOUR FORM
            ================================================= */}

            {showForm && (

                <section className="admin-tour-form-panel">

                    <div className="admin-tour-form-header">

                        <div>

                            <p>
                                {editingTour
                                    ? "EDIT TOUR"
                                    : "NEW TOUR"
                                }
                            </p>

                            <h2>
                                {editingTour
                                    ? "Update safari details"
                                    : "Create a new safari"
                                }
                            </h2>

                        </div>


                        <button
                            type="button"
                            className="admin-tour-close-button"
                            onClick={handleCancelForm}
                            aria-label="Close form"
                        >
                            ×
                        </button>

                    </div>


                    <form
                        onSubmit={handleSubmit}
                        className="admin-tour-form"
                    >

                        {/* =====================================
                            SECTION 01
                        ===================================== */}

                        <div className="form-section">

                            <div className="form-section-title">

                                <span>
                                    01
                                </span>

                                <div>

                                    <h3>
                                        Basic information
                                    </h3>

                                    <p>
                                        Tell customers what
                                        this safari is about.
                                    </p>

                                </div>

                            </div>


                            <div className="admin-form-grid">

                                <div className="admin-form-group">

                                    <label htmlFor="tour_name">
                                        Tour name
                                    </label>

                                    <input
                                        id="tour_name"
                                        name="tour_name"
                                        type="text"
                                        value={
                                            formData.tour_name
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="e.g. Maasai Mara Safari"
                                        required
                                    />

                                </div>


                                <div className="admin-form-group">

                                    <label htmlFor="destination">
                                        Destination
                                    </label>

                                    <input
                                        id="destination"
                                        name="destination"
                                        type="text"
                                        value={
                                            formData.destination
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="e.g. Maasai Mara"
                                        required
                                    />

                                </div>


                                <div className="admin-form-group full-width">

                                    <label htmlFor="description">
                                        Description
                                    </label>

                                    <textarea
                                        id="description"
                                        name="description"
                                        value={
                                            formData.description
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="Describe the safari experience..."
                                        rows="5"
                                    />

                                </div>

                            </div>

                        </div>


                        {/* =====================================
                            SECTION 02
                        ===================================== */}

                        <div className="form-section">

                            <div className="form-section-title">

                                <span>
                                    02
                                </span>

                                <div>

                                    <h3>
                                        Trip details
                                    </h3>

                                    <p>
                                        Set the duration and
                                        starting price.
                                    </p>

                                </div>

                            </div>


                            <div className="admin-form-grid">

                                <div className="admin-form-group">

                                    <label htmlFor="duration_days">
                                        Duration — days
                                    </label>

                                    <input
                                        id="duration_days"
                                        name="duration_days"
                                        type="number"
                                        min="1"
                                        value={
                                            formData.duration_days
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="3"
                                    />

                                </div>


                                <div className="admin-form-group">

                                    <label htmlFor="duration_nights">
                                        Duration — nights
                                    </label>

                                    <input
                                        id="duration_nights"
                                        name="duration_nights"
                                        type="number"
                                        min="0"
                                        value={
                                            formData.duration_nights
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="2"
                                    />

                                </div>


                                <div className="admin-form-group">

                                    <label htmlFor="charges">
                                        Starting price
                                    </label>

                                    <div className="price-input-wrapper">

                                        <span>
                                            KES
                                        </span>

                                        <input
                                            id="charges"
                                            name="charges"
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={
                                                formData.charges
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            placeholder="50000"
                                        />

                                    </div>

                                </div>

                            </div>

                        </div>


                        {/* =====================================
                            SECTION 03
                        ===================================== */}

                        <div className="form-section">

                            <div className="form-section-title">

                                <span>
                                    03
                                </span>

                                <div>

                                    <h3>
                                        Tour imagery
                                    </h3>

                                    <p>
                                        Add images customers
                                        will see when browsing.
                                    </p>

                                </div>

                            </div>


                            <div className="admin-form-grid">

                                <div className="admin-form-group full-width">

                                    <label htmlFor="cover_image">
                                        Cover image URL
                                    </label>

                                    <input
                                        id="cover_image"
                                        name="cover_image"
                                        type="url"
                                        value={
                                            formData.cover_image
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="https://example.com/safari.jpg"
                                    />

                                </div>


                                <div className="admin-form-group full-width">

                                    <label htmlFor="gallery_images">
                                        Gallery image URLs
                                    </label>

                                    <textarea
                                        id="gallery_images"
                                        name="gallery_images"
                                        value={
                                            formData.gallery_images
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="Paste one image URL per line..."
                                        rows="5"
                                    />

                                    <small>
                                        Add one image URL on
                                        each line.
                                    </small>

                                </div>

                            </div>

                        </div>


                        {/* =================================================
                            DEPARTURE SCHEDULE
                        ================================================= */}

                        <div className="form-section departure-form-section">

                            <div className="form-section-title">

                                <span>
                                    04
                                </span>

                                <div>

                                    <h3>
                                        Departure schedule
                                    </h3>

                                    <p>
                                        Set the dates, capacity and
                                        price for each available departure.
                                    </p>

                                </div>

                            </div>



                            {!editingTour && (

                                <div className="departure-create-note">

                                    <span>
                                        💡
                                    </span>

                                    <div>

                                        <strong>
                                            Save the tour first
                                        </strong>

                                        <p>
                                            Once this tour has been created,
                                            you can add its departure dates
                                            from the edit form.
                                        </p>

                                    </div>

                                </div>
                            )}



                            {editingTour && (

                                <>

                                    {/* DEPARTURE LIST */}

                                    {departuresLoading ? (

                                        <div className="admin-departures-loading">

                                            <div className="departure-spinner"></div>

                                            <span>
                                                Loading departures...
                                            </span>

                                        </div>

                                    ) : (

                                        <div className="admin-departure-list">

                                            {tourDepartures.length === 0 ? (

                                                <div className="admin-departures-empty">

                                                    <span>
                                                        📅
                                                    </span>

                                                    <strong>
                                                        No departures yet
                                                    </strong>

                                                    <p>
                                                        Add the first departure
                                                        date for this safari.
                                                    </p>

                                                </div>

                                            ) : (

                                                tourDepartures.map(
                                                    (departure) => (

                                                        <div
                                                            className={
                                                                departure.is_active
                                                                    ? "admin-departure-card"
                                                                    : "admin-departure-card inactive"
                                                            }
                                                            key={
                                                                departure.departure_id
                                                            }
                                                        >

                                                            <div className="departure-card-top">

                                                                <div className="departure-date-range">

                                                                    <span>
                                                                        📅
                                                                    </span>

                                                                    <div>

                                                                        <strong>
                                                                            {departure.start_date}
                                                                        </strong>

                                                                        <span>
                                                                            →
                                                                        </span>

                                                                        <strong>
                                                                            {departure.end_date}
                                                                        </strong>

                                                                    </div>

                                                                </div>



                                                                <span
                                                                    className={
                                                                        departure.is_active
                                                                            ? "departure-status active"
                                                                            : "departure-status inactive"
                                                                    }
                                                                >
                                                                    {departure.is_active
                                                                        ? "Active"
                                                                        : "Inactive"
                                                                    }
                                                                </span>

                                                            </div>



                                                            <div className="departure-card-details">

                                                                <div>

                                                                    <span>
                                                                        Capacity
                                                                    </span>

                                                                    <strong>
                                                                        {departure.capacity}
                                                                    </strong>

                                                                </div>



                                                                <div>

                                                                    <span>
                                                                        Available
                                                                    </span>

                                                                    <strong>
                                                                        {departure.available_seats}
                                                                    </strong>

                                                                </div>



                                                                <div>

                                                                    <span>
                                                                        Price
                                                                    </span>

                                                                    <strong>
                                                                        KES{" "}
                                                                        {Number(
                                                                            departure.price_per_person
                                                                        ).toLocaleString()}
                                                                    </strong>

                                                                </div>

                                                            </div>



                                                            <div className="departure-card-actions">

                                                                <button
                                                                    type="button"
                                                                    className="departure-edit-button"
                                                                    onClick={() =>
                                                                        handleEditDeparture(
                                                                            departure
                                                                        )
                                                                    }
                                                                >
                                                                    Edit
                                                                </button>



                                                                <button
                                                                    type="button"
                                                                    className={
                                                                        departure.is_active
                                                                            ? "departure-deactivate-button"
                                                                            : "departure-reactivate-button"
                                                                    }
                                                                    onClick={() =>
                                                                        handleToggleDepartureStatus(
                                                                            departure
                                                                        )
                                                                    }
                                                                >
                                                                    {departure.is_active
                                                                        ? "Deactivate"
                                                                        : "Reactivate"
                                                                    }
                                                                </button>

                                                            </div>

                                                        </div>
                                                    )
                                                )
                                            )}

                                        </div>
                                    )}



                                    {/* ADD DEPARTURE BUTTON */}

                                    {!showDepartureEditor && (

                                        <button
                                            type="button"
                                            className="admin-add-departure-inline-button"
                                            onClick={
                                                handleAddDeparture
                                            }
                                        >
                                            <span>
                                                +
                                            </span>

                                            Add Departure
                                        </button>
                                    )}



                                    {/* DEPARTURE EDITOR */}

                                    {showDepartureEditor && (

                                        <div className="admin-departure-editor">

                                            <div className="admin-departure-editor-header">

                                                <div>

                                                    <p>
                                                        {editingDeparture
                                                            ? "EDIT DEPARTURE"
                                                            : "NEW DEPARTURE"
                                                        }
                                                    </p>

                                                    <h4>
                                                        {editingDeparture
                                                            ? "Update departure details"
                                                            : "Add a departure"
                                                        }
                                                    </h4>

                                                </div>



                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        resetDepartureForm()
                                                        setShowDepartureEditor(false)
                                                    }}
                                                    aria-label="Close departure editor"
                                                >
                                                    ×
                                                </button>

                                            </div>



                                            <div className="admin-departure-form-grid">

                                                <div className="admin-form-group">

                                                    <label>
                                                        Start date
                                                    </label>

                                                    <input
                                                        type="date"
                                                        value={
                                                            departureFormData.start_date
                                                        }
                                                        onChange={
                                                            handleDepartureChange
                                                        }
                                                        name="start_date"
                                                        required
                                                    />

                                                </div>



                                                <div className="admin-form-group">

                                                    <label>
                                                        End date
                                                    </label>

                                                    <input
                                                        type="date"
                                                        value={
                                                            departureFormData.end_date
                                                        }
                                                        onChange={
                                                            handleDepartureChange
                                                        }
                                                        name="end_date"
                                                        required
                                                    />

                                                </div>



                                                <div className="admin-form-group">

                                                    <label>
                                                        Capacity
                                                    </label>

                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={
                                                            departureFormData.capacity
                                                        }
                                                        onChange={
                                                            handleDepartureChange
                                                        }
                                                        name="capacity"
                                                        placeholder="20"
                                                        required
                                                    />

                                                </div>



                                                <div className="admin-form-group">

                                                    <label>
                                                        Price per person
                                                    </label>

                                                    <div className="departure-price-wrapper">

                                                        <span>
                                                            KES
                                                        </span>

                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            value={
                                                                departureFormData.price_per_person
                                                            }
                                                            onChange={
                                                                handleDepartureChange
                                                            }
                                                            name="price_per_person"
                                                            placeholder="85000"
                                                            required
                                                        />

                                                    </div>

                                                </div>

                                            </div>



                                            <label className="departure-active-checkbox">

                                                <input
                                                    type="checkbox"
                                                    name="is_active"
                                                    checked={
                                                        departureFormData.is_active
                                                    }
                                                    onChange={
                                                        handleDepartureChange
                                                    }
                                                />

                                                <span>
                                                    Departure is active
                                                </span>

                                            </label>



                                            <div className="admin-departure-form-actions">

                                                <button
                                                    type="button"
                                                    className="admin-departure-cancel-button"
                                                    onClick={() => {
                                                        resetDepartureForm()
                                                        setShowDepartureEditor(false)
                                                    }}
                                                    disabled={
                                                        departureSaving
                                                    }
                                                >
                                                    Cancel
                                                </button>



                                                <button
                                                    type="button"
                                                    className="admin-departure-save-button"
                                                    onClick={
                                                        handleDepartureSave
                                                    }
                                                    disabled={
                                                        departureSaving
                                                    }
                                                >
                                                    {departureSaving
                                                        ? "Saving..."
                                                        : editingDeparture
                                                            ? "Save Departure"
                                                            : "Add Departure"
                                                    }
                                                </button>

                                            </div>

                                        </div>
                                    )}

                                </>
                            )}

                        </div>



                        <div className="form-section admin-tour-package-section">

                            <div className="form-section-title">

                                <span>
                                    05
                                </span>

                                <div>

                                    <h3>
                                        Tour package
                                    </h3>

                                    <p>
                                        Build the itinerary, accommodation
                                        details and frequently asked questions
                                        customers will see on the tour page.
                                    </p>

                                </div>

                            </div>


                            {!editingTour && (

                                <div className="package-create-note">

                                    <span>
                                        💡
                                    </span>

                                    <div>

                                        <strong>
                                            Save the tour first
                                        </strong>

                                        <p>
                                            Once the tour is created, edit it
                                            to add itinerary items,
                                            accommodation and FAQs.
                                        </p>

                                    </div>

                                </div>

                            )}


                            {editingTour && (

                                <div className="admin-tour-package-manager">

                                    {/* PACKAGE TABS */}

                                    <div
                                        className="admin-package-tabs"
                                        role="tablist"
                                        aria-label="Tour package sections"
                                    >

                                        <button
                                            type="button"
                                            role="tab"
                                            aria-selected={
                                                packageSection === "itinerary"
                                            }
                                            className={
                                                packageSection === "itinerary"
                                                    ? "admin-package-tab active"
                                                    : "admin-package-tab"
                                            }
                                            onClick={() => {
                                                setPackageSection("itinerary")
                                                resetAccommodationForm()
                                                resetFaqForm()
                                            }}
                                        >
                                            <span className="admin-package-tab-icon">
                                                🗓️
                                            </span>

                                            <span className="admin-package-tab-label">
                                                Itinerary
                                            </span>

                                            <strong>
                                                {tourPackage.itineraries.length}
                                            </strong>
                                        </button>


                                        <button
                                            type="button"
                                            role="tab"
                                            aria-selected={
                                                packageSection === "accommodation"
                                            }
                                            className={
                                                packageSection === "accommodation"
                                                    ? "admin-package-tab active"
                                                    : "admin-package-tab"
                                            }
                                            onClick={() => {
                                                setPackageSection("accommodation")
                                                resetItineraryForm()
                                                resetFaqForm()
                                            }}
                                        >
                                            <span className="admin-package-tab-icon">
                                                🏨
                                            </span>

                                            <span className="admin-package-tab-label">
                                                Accommodation
                                            </span>

                                            <strong>
                                                {tourPackage.accommodations.length}
                                            </strong>
                                        </button>


                                        <button
                                            type="button"
                                            role="tab"
                                            aria-selected={
                                                packageSection === "faq"
                                            }
                                            className={
                                                packageSection === "faq"
                                                    ? "admin-package-tab active"
                                                    : "admin-package-tab"
                                            }
                                            onClick={() => {
                                                setPackageSection("faq")
                                                resetItineraryForm()
                                                resetAccommodationForm()
                                            }}
                                        >
                                            <span className="admin-package-tab-icon">
                                                ❓
                                            </span>

                                            <span className="admin-package-tab-label">
                                                FAQs
                                            </span>

                                            <strong>
                                                {tourPackage.faqs.length}
                                            </strong>
                                        </button>

                                    </div>


                                    {packageLoading ? (

                                        <div className="admin-package-loading">

                                            <div className="loading-spinner"></div>

                                            <p>
                                                Loading tour package...
                                            </p>

                                        </div>

                                    ) : (

                                        <>

                                            {/* =================================================
                                                ITINERARY
                                            ================================================= */}

                                            {packageSection === "itinerary" && (

                                                <div className="admin-package-content">

                                                    <div className="admin-package-content-header">

                                                        <div>

                                                            <p>
                                                                ITINERARY
                                                            </p>

                                                            <h4>
                                                                Day-by-day experience
                                                            </h4>

                                                        </div>

                                                        {!editingItinerary && (

                                                            <span className="admin-package-count">
                                                                {tourPackage.itineraries.length}{" "}
                                                                {tourPackage.itineraries.length === 1
                                                                    ? "day"
                                                                    : "days"}
                                                            </span>

                                                        )}

                                                    </div>


                                                    <div className="admin-package-items">

                                                        {tourPackage.itineraries.length === 0 ? (

                                                            <div className="admin-package-empty">

                                                                <span>
                                                                    🗺️
                                                                </span>

                                                                <strong>
                                                                    No itinerary added yet
                                                                </strong>

                                                                <p>
                                                                    Add the first day of
                                                                    this safari itinerary.
                                                                </p>

                                                            </div>

                                                        ) : (

                                                            tourPackage.itineraries.map(
                                                                (item, index) => (

                                                                    <article
                                                                        className="admin-package-item"
                                                                        key={
                                                                            item.itinerary_id ??
                                                                            item.id ??
                                                                            index
                                                                        }
                                                                    >

                                                                        <div className="admin-package-item-number">
                                                                            DAY{" "}
                                                                            {item.day_number}
                                                                        </div>

                                                                        <div className="admin-package-item-body">

                                                                            <h5>
                                                                                {item.title}
                                                                            </h5>

                                                                            <p>
                                                                                {item.description}
                                                                            </p>

                                                                        </div>

                                                                        <div className="admin-package-item-actions">

                                                                            <button
                                                                                type="button"
                                                                                onClick={() =>
                                                                                    handleEditItinerary(
                                                                                        item
                                                                                    )
                                                                                }
                                                                                disabled={
                                                                                    packageSaving
                                                                                }
                                                                            >
                                                                                Edit
                                                                            </button>

                                                                            <button
                                                                                type="button"
                                                                                className="danger"
                                                                                onClick={() =>
                                                                                    handleDeleteItinerary(
                                                                                        item
                                                                                    )
                                                                                }
                                                                                disabled={
                                                                                    packageSaving
                                                                                }
                                                                            >
                                                                                Delete
                                                                            </button>

                                                                        </div>

                                                                    </article>

                                                                )
                                                            )

                                                        )}

                                                    </div>


                                                    <div className="admin-package-editor">

                                                        <div className="admin-package-editor-header">

                                                            <div>

                                                                <p>
                                                                    {editingItinerary
                                                                        ? "EDIT ITINERARY"
                                                                        : "ADD ITINERARY"}
                                                                </p>

                                                                <h4>
                                                                    {editingItinerary
                                                                        ? "Update itinerary day"
                                                                        : "Add an itinerary day"}
                                                                </h4>

                                                            </div>

                                                            {editingItinerary && (

                                                                <button
                                                                    type="button"
                                                                    onClick={
                                                                        resetItineraryForm
                                                                    }
                                                                >
                                                                    Cancel edit
                                                                </button>

                                                            )}

                                                        </div>


                                                        <div className="admin-package-form-grid">

                                                            <div className="admin-form-group">

                                                                <label>
                                                                    Day number
                                                                </label>

                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    name="day_number"
                                                                    value={
                                                                        itineraryFormData.day_number
                                                                    }
                                                                    onChange={
                                                                        handleItineraryChange
                                                                    }
                                                                    placeholder="1"
                                                                />

                                                            </div>


                                                            <div className="admin-form-group">

                                                                <label>
                                                                    Day title
                                                                </label>

                                                                <input
                                                                    type="text"
                                                                    name="title"
                                                                    value={
                                                                        itineraryFormData.title
                                                                    }
                                                                    onChange={
                                                                        handleItineraryChange
                                                                    }
                                                                    placeholder="Arrival and game drive"
                                                                />

                                                            </div>


                                                            <div className="admin-form-group full-width">

                                                                <label>
                                                                    Description
                                                                </label>

                                                                <textarea
                                                                    name="description"
                                                                    rows="4"
                                                                    value={
                                                                        itineraryFormData.description
                                                                    }
                                                                    onChange={
                                                                        handleItineraryChange
                                                                    }
                                                                    placeholder="Describe what customers will experience on this day..."
                                                                />

                                                            </div>

                                                        </div>


                                                        <button
                                                            type="button"
                                                            className="admin-package-save-button"
                                                            onClick={
                                                                handleSaveItinerary
                                                            }
                                                            disabled={
                                                                packageSaving
                                                            }
                                                        >
                                                            {packageSaving
                                                                ? "Saving..."
                                                                : editingItinerary
                                                                    ? "Save Itinerary"
                                                                    : "Add Itinerary"}
                                                        </button>

                                                    </div>

                                                </div>

                                            )}


                                            {/* =================================================
                                                ACCOMMODATION
                                            ================================================= */}

                                            {packageSection === "accommodation" && (

                                                <div className="admin-package-content">

                                                    <div className="admin-package-content-header">

                                                        <div>

                                                            <p>
                                                                ACCOMMODATION
                                                            </p>

                                                            <h4>
                                                                Where customers will stay
                                                            </h4>

                                                        </div>

                                                        <span className="admin-package-count">
                                                            {tourPackage.accommodations.length}{" "}
                                                            {tourPackage.accommodations.length === 1
                                                                ? "property"
                                                                : "properties"}
                                                        </span>

                                                    </div>


                                                    <div className="admin-package-items">

                                                        {tourPackage.accommodations.length === 0 ? (

                                                            <div className="admin-package-empty">

                                                                <span>
                                                                    🏨
                                                                </span>

                                                                <strong>
                                                                    No accommodation added yet
                                                                </strong>

                                                                <p>
                                                                    Add accommodation details
                                                                    for this safari.
                                                                </p>

                                                            </div>

                                                        ) : (

                                                            tourPackage.accommodations.map(
                                                                (item, index) => (

                                                                    <article
                                                                        className="admin-package-item accommodation-item"
                                                                        key={
                                                                            item.accommodation_id ??
                                                                            item.id ??
                                                                            index
                                                                        }
                                                                    >

                                                                        <div className="admin-package-item-icon">
                                                                            🏨
                                                                        </div>

                                                                        <div className="admin-package-item-body">

                                                                            <div className="admin-package-item-title-row">

                                                                                <h5>
                                                                                    {item.name}
                                                                                </h5>

                                                                                <span className="admin-package-category">
                                                                                    {item.category}
                                                                                </span>

                                                                            </div>

                                                                            <p>
                                                                                📍{" "}
                                                                                {item.location}
                                                                            </p>

                                                                            <small>
                                                                                🛏️{" "}
                                                                                {item.room_type}
                                                                                {" · "}
                                                                                🍽️{" "}
                                                                                {item.meal_plan}
                                                                            </small>

                                                                            {item.description && (

                                                                                <p>
                                                                                    {item.description}
                                                                                </p>

                                                                            )}

                                                                        </div>

                                                                        <div className="admin-package-item-actions">

                                                                            <button
                                                                                type="button"
                                                                                onClick={() =>
                                                                                    handleEditAccommodation(
                                                                                        item
                                                                                    )
                                                                                }
                                                                                disabled={
                                                                                    packageSaving
                                                                                }
                                                                            >
                                                                                Edit
                                                                            </button>

                                                                            <button
                                                                                type="button"
                                                                                className="danger"
                                                                                onClick={() =>
                                                                                    handleDeleteAccommodation(
                                                                                        item
                                                                                    )
                                                                                }
                                                                                disabled={
                                                                                    packageSaving
                                                                                }
                                                                            >
                                                                                Delete
                                                                            </button>

                                                                        </div>

                                                                    </article>

                                                                )
                                                            )

                                                        )}

                                                    </div>


                                                    <div className="admin-package-editor">

                                                        <div className="admin-package-editor-header">

                                                            <div>

                                                                <p>
                                                                    {editingAccommodation
                                                                        ? "EDIT ACCOMMODATION"
                                                                        : "ADD ACCOMMODATION"}
                                                                </p>

                                                                <h4>
                                                                    {editingAccommodation
                                                                        ? "Update accommodation"
                                                                        : "Add accommodation"}
                                                                </h4>

                                                            </div>

                                                            {editingAccommodation && (

                                                                <button
                                                                    type="button"
                                                                    onClick={
                                                                        resetAccommodationForm
                                                                    }
                                                                >
                                                                    Cancel edit
                                                                </button>

                                                            )}

                                                        </div>


                                                        <div className="admin-package-form-grid">

                                                            <div className="admin-form-group">

                                                                <label>
                                                                    Property / lodge name
                                                                </label>

                                                                <input
                                                                    type="text"
                                                                    name="name"
                                                                    value={
                                                                        accommodationFormData.name
                                                                    }
                                                                    onChange={
                                                                        handleAccommodationChange
                                                                    }
                                                                    placeholder="e.g. Mara Serena Safari Lodge"
                                                                />

                                                            </div>


                                                            <div className="admin-form-group">

                                                                <label>
                                                                    Category
                                                                </label>

                                                                <select
                                                                    name="category"
                                                                    value={
                                                                        accommodationFormData.category
                                                                    }
                                                                    onChange={
                                                                        handleAccommodationChange
                                                                    }
                                                                >

                                                                    <option value="budget">
                                                                        Budget
                                                                    </option>

                                                                    <option value="mid_range">
                                                                        Mid-range
                                                                    </option>

                                                                    <option value="luxury">
                                                                        Luxury
                                                                    </option>

                                                                </select>

                                                            </div>


                                                            <div className="admin-form-group">

                                                                <label>
                                                                    Location
                                                                </label>

                                                                <input
                                                                    type="text"
                                                                    name="location"
                                                                    value={
                                                                        accommodationFormData.location
                                                                    }
                                                                    onChange={
                                                                        handleAccommodationChange
                                                                    }
                                                                    placeholder="e.g. Maasai Mara"
                                                                />

                                                            </div>


                                                            <div className="admin-form-group">

                                                                <label>
                                                                    Room type
                                                                </label>

                                                                <input
                                                                    type="text"
                                                                    name="room_type"
                                                                    value={
                                                                        accommodationFormData.room_type
                                                                    }
                                                                    onChange={
                                                                        handleAccommodationChange
                                                                    }
                                                                    placeholder="e.g. Deluxe Double Room"
                                                                />

                                                            </div>


                                                            <div className="admin-form-group">

                                                                <label>
                                                                    Meal plan
                                                                </label>

                                                                <input
                                                                    type="text"
                                                                    name="meal_plan"
                                                                    value={
                                                                        accommodationFormData.meal_plan
                                                                    }
                                                                    onChange={
                                                                        handleAccommodationChange
                                                                    }
                                                                    placeholder="e.g. Full Board"
                                                                />

                                                            </div>


                                                            <div className="admin-form-group full-width">

                                                                <label>
                                                                    Description
                                                                </label>

                                                                <textarea
                                                                    name="description"
                                                                    rows="4"
                                                                    value={
                                                                        accommodationFormData.description
                                                                    }
                                                                    onChange={
                                                                        handleAccommodationChange
                                                                    }
                                                                    placeholder="Describe the accommodation..."
                                                                />

                                                            </div>

                                                        </div>


                                                        <button
                                                            type="button"
                                                            className="admin-package-save-button"
                                                            onClick={
                                                                handleSaveAccommodation
                                                            }
                                                            disabled={
                                                                packageSaving
                                                            }
                                                        >
                                                            {packageSaving
                                                                ? "Saving..."
                                                                : editingAccommodation
                                                                    ? "Save Accommodation"
                                                                    : "Add Accommodation"}
                                                        </button>

                                                    </div>

                                                </div>

                                            )}


                                            {/* =================================================
                                                FAQ
                                            ================================================= */}

                                            {packageSection === "faq" && (

                                                <div className="admin-package-content">

                                                    <div className="admin-package-content-header">

                                                        <div>

                                                            <p>
                                                                FREQUENTLY ASKED QUESTIONS
                                                            </p>

                                                            <h4>
                                                                Help customers before they book
                                                            </h4>

                                                        </div>

                                                        <span className="admin-package-count">
                                                            {tourPackage.faqs.length}{" "}
                                                            {tourPackage.faqs.length === 1
                                                                ? "question"
                                                                : "questions"}
                                                        </span>

                                                    </div>


                                                    <div className="admin-package-items">

                                                        {tourPackage.faqs.length === 0 ? (

                                                            <div className="admin-package-empty">

                                                                <span>
                                                                    ❓
                                                                </span>

                                                                <strong>
                                                                    No FAQs added yet
                                                                </strong>

                                                                <p>
                                                                    Add common questions and
                                                                    answers customers may have.
                                                                </p>

                                                            </div>

                                                        ) : (

                                                            tourPackage.faqs.map(
                                                                (item, index) => (

                                                                    <article
                                                                        className="admin-package-item faq-item"
                                                                        key={
                                                                            item.faq_id ??
                                                                            item.id ??
                                                                            index
                                                                        }
                                                                    >

                                                                        <div className="admin-package-item-icon">
                                                                            ❓
                                                                        </div>

                                                                        <div className="admin-package-item-body">

                                                                            <h5>
                                                                                {item.question}
                                                                            </h5>

                                                                            <p>
                                                                                {item.answer}
                                                                            </p>

                                                                        </div>

                                                                        <div className="admin-package-item-actions">

                                                                            <button
                                                                                type="button"
                                                                                onClick={() =>
                                                                                    handleEditFaq(
                                                                                        item
                                                                                    )
                                                                                }
                                                                                disabled={
                                                                                    packageSaving
                                                                                }
                                                                            >
                                                                                Edit
                                                                            </button>

                                                                            <button
                                                                                type="button"
                                                                                className="danger"
                                                                                onClick={() =>
                                                                                    handleDeleteFaq(
                                                                                        item
                                                                                    )
                                                                                }
                                                                                disabled={
                                                                                    packageSaving
                                                                                }
                                                                            >
                                                                                Delete
                                                                            </button>

                                                                        </div>

                                                                    </article>

                                                                )
                                                            )

                                                        )}

                                                    </div>


                                                    <div className="admin-package-editor">

                                                        <div className="admin-package-editor-header">

                                                            <div>

                                                                <p>
                                                                    {editingFaq
                                                                        ? "EDIT FAQ"
                                                                        : "ADD FAQ"}
                                                                </p>

                                                                <h4>
                                                                    {editingFaq
                                                                        ? "Update frequently asked question"
                                                                        : "Add a frequently asked question"}
                                                                </h4>

                                                            </div>

                                                            {editingFaq && (

                                                                <button
                                                                    type="button"
                                                                    onClick={
                                                                        resetFaqForm
                                                                    }
                                                                >
                                                                    Cancel edit
                                                                </button>

                                                            )}

                                                        </div>


                                                        <div className="admin-package-form-grid">

                                                            <div className="admin-form-group full-width">

                                                                <label>
                                                                    Question
                                                                </label>

                                                                <input
                                                                    type="text"
                                                                    name="question"
                                                                    value={
                                                                        faqFormData.question
                                                                    }
                                                                    onChange={
                                                                        handleFaqChange
                                                                    }
                                                                    placeholder="e.g. What should I pack for the safari?"
                                                                />

                                                            </div>


                                                            <div className="admin-form-group full-width">

                                                                <label>
                                                                    Answer
                                                                </label>

                                                                <textarea
                                                                    name="answer"
                                                                    rows="5"
                                                                    value={
                                                                        faqFormData.answer
                                                                    }
                                                                    onChange={
                                                                        handleFaqChange
                                                                    }
                                                                    placeholder="Write the answer customers should see..."
                                                                />

                                                            </div>

                                                        </div>


                                                        <button
                                                            type="button"
                                                            className="admin-package-save-button"
                                                            onClick={
                                                                handleSaveFaq
                                                            }
                                                            disabled={
                                                                packageSaving
                                                            }
                                                        >
                                                            {packageSaving
                                                                ? "Saving..."
                                                                : editingFaq
                                                                    ? "Save FAQ"
                                                                    : "Add FAQ"}
                                                        </button>

                                                    </div>

                                                </div>

                                            )}

                                        </>

                                    )}

                                </div>

                            )}

                        </div>




                        {/* =====================================
                            TOUR FORM ACTIONS
                        ===================================== */}

                        <div className="admin-tour-form-actions">

                            <button
                                type="button"
                                className="admin-tour-cancel-button"
                                onClick={
                                    handleCancelForm
                                }
                            >
                                Close
                            </button>


                            <button
                                type="submit"
                                className="admin-tour-save-button"
                            >
                                {editingTour
                                    ? "Save Tour Changes"
                                    : "Create Tour"
                                }
                            </button>

                        </div>

                    </form>

                </section>
            )}


            {/* =================================================
                SEARCH / FILTER TOOLBAR
            ================================================= */}

            <section className="admin-tour-toolbar">

                <div className="admin-tour-search">

                    <span>
                        🔎
                    </span>

                    <input
                        type="text"
                        placeholder="Search tours or destinations..."
                        value={
                            searchTerm
                        }
                        onChange={(event) =>
                            setSearchTerm(
                                event.target.value
                            )
                        }
                    />


                    {searchTerm && (

                        <button
                            type="button"
                            onClick={() =>
                                setSearchTerm("")
                            }
                            aria-label="Clear search"
                        >
                            ×
                        </button>
                    )}

                </div>


                <div className="admin-tour-filters">

                    <button
                        type="button"
                        className={
                            statusFilter === "all"
                                ? "filter-button active"
                                : "filter-button"
                        }
                        onClick={() =>
                            setStatusFilter("all")
                        }
                    >
                        All
                    </button>


                    <button
                        type="button"
                        className={
                            statusFilter === "active"
                                ? "filter-button active"
                                : "filter-button"
                        }
                        onClick={() =>
                            setStatusFilter("active")
                        }
                    >
                        Active
                    </button>


                    <button
                        type="button"
                        className={
                            statusFilter === "inactive"
                                ? "filter-button active"
                                : "filter-button"
                        }
                        onClick={() =>
                            setStatusFilter("inactive")
                        }
                    >
                        Inactive
                    </button>

                </div>

            </section>


            {/* =================================================
                RESULTS COUNT
            ================================================= */}

            {!loading && (

                <div className="admin-tour-results">

                    <strong>
                        {
                            filteredTours.length
                        }
                    </strong>

                    <span>
                        {
                            filteredTours.length === 1
                                ? "tour"
                                : "tours"
                        }
                    </span>


                    {searchTerm && (

                        <>

                            <span>
                                matching
                            </span>

                            <strong>
                                "{searchTerm}"
                            </strong>

                        </>
                    )}

                </div>
            )}


            {/* =================================================
                LOADING
            ================================================= */}

            {loading && (

                <div className="admin-tour-loading">

                    <div className="loading-spinner"></div>

                    <p>
                        Loading your tours...
                    </p>

                </div>
            )}


            {/* =================================================
                EMPTY STATE
            ================================================= */}

            {!loading &&
                filteredTours.length === 0 && (

                    <div className="admin-tour-empty">

                        <div className="admin-tour-empty-icon">
                            🏕️
                        </div>

                        <h2>
                            {searchTerm
                                ? "No tours found"
                                : statusFilter === "inactive"
                                    ? "No inactive tours"
                                    : statusFilter === "active"
                                        ? "No active tours"
                                        : "Your tour collection is empty"
                            }
                        </h2>

                        <p>
                            {searchTerm
                                ? "Try changing your search or filter."
                                : statusFilter === "inactive"
                                    ? "There are no inactive tours in your collection right now."
                                    : statusFilter === "active"
                                        ? "There are no active tours in your collection right now."
                                        : "Create your first safari tour and it will appear here."
                            }
                        </p>


                        {!searchTerm &&
                            statusFilter !== "inactive" && (

                            <button
                                type="button"
                                className="admin-add-tour-button"
                                onClick={
                                    handleAddTour
                                }
                            >
                                <span>
                                    +
                                </span>

                                Create First Tour
                            </button>
                        )}

                    </div>
                )}


            {/* =================================================
                TOUR GRID
            ================================================= */}

            {!loading &&
                filteredTours.length > 0 && (

                    <section className="admin-tour-grid">

                        {filteredTours.map(
                            (tour) => (

                                <article
                                    className="admin-tour-card"
                                    key={tour.id}
                                >

                                    {/* IMAGE */}

                                    <div className="admin-tour-card-image">

                                        {tour.cover_image ? (

                                            <img
                                                src={
                                                    tour.cover_image
                                                }
                                                alt={
                                                    tour.tour_name
                                                }
                                            />

                                        ) : (

                                            <div className="admin-tour-card-no-image">

                                                <span>
                                                    🏕️
                                                </span>

                                                <small>
                                                    No image
                                                </small>

                                            </div>
                                        )}


                                        <span
                                            className={
                                                tour.is_active
                                                    ? "tour-status-badge active"
                                                    : "tour-status-badge inactive"
                                            }
                                        >

                                            <span>
                                                {tour.is_active
                                                    ? "●"
                                                    : "○"
                                                }
                                            </span>

                                            {tour.is_active
                                                ? "Active"
                                                : "Inactive"
                                            }

                                        </span>

                                    </div>


                                    {/* CONTENT */}

                                    <div className="admin-tour-card-content">

                                        <div className="admin-tour-card-title">

                                            <div>

                                                <p>
                                                    {
                                                        tour.destination
                                                    }
                                                </p>

                                                <h2>
                                                    {
                                                        tour.tour_name
                                                    }
                                                </h2>

                                            </div>

                                        </div>


                                        {tour.description && (

                                            <p className="admin-tour-card-description">
                                                {
                                                    tour.description
                                                }
                                            </p>
                                        )}


                                        <div className="admin-tour-card-details">

                                            {(
                                                tour.duration_days ||
                                                tour.duration_nights
                                            ) && (

                                                <span>
                                                    🕐{" "}
                                                    {
                                                        tour.duration_days ||
                                                        0
                                                    }{" "}
                                                    days
                                                    {" · "}
                                                    {
                                                        tour.duration_nights ||
                                                        0
                                                    }{" "}
                                                    nights
                                                </span>
                                            )}

                                        </div>


                                        {/* FOOTER */}

                                        <div className="admin-tour-card-footer">

                                            <div className="admin-tour-price">

                                                <small>
                                                    Starting from
                                                </small>

                                                <strong>

                                                    {tour.charges

                                                        ? `KES ${Number(
                                                            tour.charges
                                                        ).toLocaleString()}`

                                                        : "Price not set"

                                                    }

                                                </strong>

                                            </div>


                                            <div className="admin-tour-card-actions">

                                                <button
                                                    type="button"
                                                    className="tour-edit-button"
                                                    onClick={() =>
                                                        handleEditTour(
                                                            tour
                                                        )
                                                    }
                                                >
                                                    Edit
                                                </button>


                                                <button
                                                    type="button"
                                                    className={
                                                        tour.is_active
                                                            ? "tour-deactivate-button"
                                                            : "tour-reactivate-button"
                                                    }
                                                    onClick={() =>
                                                        handleToggleStatus(
                                                            tour
                                                        )
                                                    }
                                                >
                                                    {tour.is_active
                                                        ? "Deactivate"
                                                        : "Reactivate"
                                                    }
                                                </button>

                                            </div>

                                        </div>

                                    </div>

                                </article>
                            )
                        )}

                    </section>
                )}

        </div>
    )
}


export default OperatorTours