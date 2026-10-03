// =========================================================
// THAFARI MAIN ENTRY POINT
// =========================================================
//
// This is the entry point for the React application.
//
// It is responsible for:
//
// 1. Loading React.
// 2. Loading the global CSS.
// 3. Loading the universal Thafari image system.
// 4. Creating the React root.
// 5. Wrapping the application with BrowserRouter so that
//    react-router-dom works throughout the application.
// 6. Starting the App component.
//
// IMPORTANT:
//
// BrowserRouter MUST be above AppRoutes because AppRoutes
// contains <Routes>.
//
// Without BrowserRouter, React Router throws:
//
// "useRoutes() may be used only in the context of a
// <Router> component."
//
// =========================================================

import { StrictMode } from "react"

import {
    createRoot,
} from "react-dom/client"

import {
    BrowserRouter,
} from "react-router-dom"

import "./index.css"

import "./styles/ThafariImages.css"

import App from "./App.jsx"


// =========================================================
// CREATE REACT APPLICATION
// =========================================================
//
// BrowserRouter wraps the entire App so that every component
// inside the application can use:
//
// - <Routes>
// - <Route>
// - <Navigate>
// - useNavigate()
// - useLocation()
// - useParams()
// - Link
// - NavLink
//
// =========================================================

createRoot(
    document.getElementById("root")
).render(

    <StrictMode>

        <BrowserRouter>

            <App />

        </BrowserRouter>

    </StrictMode>
)