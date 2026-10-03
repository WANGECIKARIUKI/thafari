// =========================================================
// THAFARI TOUR SERVICE
// =========================================================
//
// This file contains all frontend API functions related
// to tours.
//
// It handles:
//
// - Public tour browsing
// - Tour details
// - Tour departures
// - Admin/operator tour management
// - Creating tours
// - Updating tours
// - Deactivating tours
// - Reactivating tours
// - Tour itineraries
// - Tour accommodations
// - Tour FAQs
//
// =========================================================

import api from "./api"


// =========================================================
// NORMALIZE TOUR
// =========================================================

const normalizeTour = (tour) => {

    if (!tour) {
        return tour
    }

    return {
        ...tour,

        id: tour.id ?? tour.tour_id,
    }
}


// =========================================================
// NORMALIZE TOUR LIST
// =========================================================

const normalizeTourResponse = (data) => {

    if (Array.isArray(data)) {

        return data.map(normalizeTour)
    }

    if (data && Array.isArray(data.tours)) {

        return {
            ...data,

            tours: data.tours.map(normalizeTour),
        }
    }

    return data
}


// =========================================================
// GET PUBLIC TOURS
// =========================================================

export const getTours = async () => {

    const response = await api.get("/tours")

    return normalizeTourResponse(
        response.data
    )
}


// =========================================================
// GET TOUR DETAILS
// =========================================================

export const getTourDetails = async (tourId) => {

    const response = await api.get(
        `/tours/${tourId}`
    )

    return normalizeTour(
        response.data
    )
}


// =========================================================
// GET TOUR DEPARTURES
// =========================================================

export const getTourDepartures = async (tourId) => {

    const response = await api.get(
        `/tours/${tourId}/departures`
    )

    return response.data
}


// =========================================================
// GET MANAGEABLE TOURS
// =========================================================

export const getManageableTours = async (
    accessToken
) => {

    const response = await api.get(
        "/tours/manage",
        {
            headers: {
                Authorization:
                    `Bearer ${accessToken}`,
            },
        }
    )

    return normalizeTourResponse(
        response.data
    )
}


// =========================================================
// CREATE TOUR
// =========================================================

export const createTour = async (
    accessToken,
    tourData
) => {

    const response = await api.post(
        "/tour",
        tourData,
        {
            headers: {
                Authorization:
                    `Bearer ${accessToken}`,
            },
        }
    )

    if (response.data?.tour) {

        return {
            ...response.data,

            tour: normalizeTour(
                response.data.tour
            ),
        }
    }

    return response.data
}


// =========================================================
// UPDATE TOUR
// =========================================================

export const updateTour = async (
    accessToken,
    tourId,
    tourData
) => {

    const response = await api.patch(
        `/tours/${tourId}`,
        tourData,
        {
            headers: {
                Authorization:
                    `Bearer ${accessToken}`,
            },
        }
    )

    if (response.data?.tour) {

        return {
            ...response.data,

            tour: normalizeTour(
                response.data.tour
            ),
        }
    }

    return response.data
}


// =========================================================
// DEACTIVATE TOUR
// =========================================================

export const deactivateTour = async (
    accessToken,
    tourId
) => {

    const response = await api.delete(
        `/tours/${tourId}`,
        {
            headers: {
                Authorization:
                    `Bearer ${accessToken}`,
            },
        }
    )

    return response.data
}


// =========================================================
// REACTIVATE TOUR
// =========================================================

export const reactivateTour = async (
    accessToken,
    tourId
) => {

    const response = await api.patch(
        `/tours/${tourId}`,
        {
            is_active: true,
        },
        {
            headers: {
                Authorization:
                    `Bearer ${accessToken}`,
            },
        }
    )

    return response.data
}


// =========================================================
// =========================================================
// TOUR PACKAGE / ITINERARY / ACCOMMODATION / FAQ
// =========================================================
// =========================================================
//
// These functions are kept inside tourService.js.
// There is NO separate tourPackageService.js.
//
// =========================================================


// =========================================================
// GET COMPLETE TOUR PACKAGE
// =========================================================
//
// Public endpoint.
//
// Returns:
//
// - itineraries
// - accommodations
// - faqs
//
// =========================================================

export const getTourPackage = async (
    tourId
) => {

    const response = await api.get(
        `/tours/${tourId}/package`
    )

    return response.data
}


// =========================================================
// GET TOUR ITINERARIES
// =========================================================
//
// Public endpoint.
// Customers can view the itinerary.
//
// =========================================================

export const getItineraries = async (
    tourId
) => {

    const response = await api.get(
        `/tours/${tourId}/itinerary`
    )

    return response.data
}


// =========================================================
// CREATE ITINERARY
// =========================================================

export const createItinerary = async (
    accessToken,
    tourId,
    itineraryData
) => {

    const response = await api.post(
        `/tours/${tourId}/itinerary`,
        itineraryData,
        {
            headers: {
                Authorization:
                    `Bearer ${accessToken}`,
            },
        }
    )

    return response.data
}


// =========================================================
// UPDATE ITINERARY
// =========================================================

export const updateItinerary = async (
    accessToken,
    tourId,
    itineraryId,
    itineraryData
) => {

    const response = await api.patch(
        `/tours/${tourId}/itinerary/${itineraryId}`,
        itineraryData,
        {
            headers: {
                Authorization:
                    `Bearer ${accessToken}`,
            },
        }
    )

    return response.data
}


// =========================================================
// DELETE ITINERARY
// =========================================================

export const deleteItinerary = async (
    accessToken,
    tourId,
    itineraryId
) => {

    const response = await api.delete(
        `/tours/${tourId}/itinerary/${itineraryId}`,
        {
            headers: {
                Authorization:
                    `Bearer ${accessToken}`,
            },
        }
    )

    return response.data
}


// =========================================================
// GET TOUR ACCOMMODATIONS
// =========================================================
//
// Public endpoint.
//
// =========================================================

export const getAccommodations = async (
    tourId
) => {

    const response = await api.get(
        `/tours/${tourId}/accommodation`
    )

    return response.data
}


// =========================================================
// CREATE ACCOMMODATION
// =========================================================

export const createAccommodation = async (
    accessToken,
    tourId,
    accommodationData
) => {

    const response = await api.post(
        `/tours/${tourId}/accommodation`,
        accommodationData,
        {
            headers: {
                Authorization:
                    `Bearer ${accessToken}`,
            },
        }
    )

    return response.data
}


// =========================================================
// UPDATE ACCOMMODATION
// =========================================================

export const updateAccommodation = async (
    accessToken,
    tourId,
    accommodationId,
    accommodationData
) => {

    const response = await api.patch(
        `/tours/${tourId}/accommodation/${accommodationId}`,
        accommodationData,
        {
            headers: {
                Authorization:
                    `Bearer ${accessToken}`,
            },
        }
    )

    return response.data
}


// =========================================================
// DELETE ACCOMMODATION
// =========================================================

export const deleteAccommodation = async (
    accessToken,
    tourId,
    accommodationId
) => {

    const response = await api.delete(
        `/tours/${tourId}/accommodation/${accommodationId}`,
        {
            headers: {
                Authorization:
                    `Bearer ${accessToken}`,
            },
        }
    )

    return response.data
}


// =========================================================
// GET TOUR FAQs
// =========================================================
//
// Public endpoint.
//
// Customers can view frequently asked questions
// without being authenticated.
//
// =========================================================

export const getTourFaqs = async (
    tourId
) => {

    const response = await api.get(
        `/tours/${tourId}/faq`
    )

    return response.data
}


// =========================================================
// CREATE TOUR FAQ
// =========================================================

export const createTourFaq = async (
    accessToken,
    tourId,
    faqData
) => {

    const response = await api.post(
        `/tours/${tourId}/faq`,
        faqData,
        {
            headers: {
                Authorization:
                    `Bearer ${accessToken}`,
            },
        }
    )

    return response.data
}


// =========================================================
// UPDATE TOUR FAQ
// =========================================================

export const updateTourFaq = async (
    accessToken,
    tourId,
    faqId,
    faqData
) => {

    const response = await api.patch(
        `/tours/${tourId}/faq/${faqId}`,
        faqData,
        {
            headers: {
                Authorization:
                    `Bearer ${accessToken}`,
            },
        }
    )

    return response.data
}


// =========================================================
// DELETE TOUR FAQ
// =========================================================

export const deleteTourFaq = async (
    accessToken,
    tourId,
    faqId
) => {

    const response = await api.delete(
        `/tours/${tourId}/faq/${faqId}`,
        {
            headers: {
                Authorization:
                    `Bearer ${accessToken}`,
            },
        }
    )

    return response.data
}