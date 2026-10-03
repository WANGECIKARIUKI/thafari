// ---------------------------------------------------------
// THAFARI API CLIENT
// ---------------------------------------------------------
//
// Central Axios configuration for communicating with the
// Flask backend.
// ---------------------------------------------------------

import axios from "axios"


// ---------------------------------------------------------
// BACKEND URL
// ---------------------------------------------------------

// Vite exposes variables beginning with VITE_ through
// import.meta.env.
const API_URL = import.meta.env.VITE_API_URL


// ---------------------------------------------------------
// CREATE AXIOS INSTANCE
// ---------------------------------------------------------

const api = axios.create({
    baseURL: API_URL,

    headers: {
        "Content-Type": "application/json",
    },
})


// ---------------------------------------------------------
// EXPORT API CLIENT
// ---------------------------------------------------------

export default api