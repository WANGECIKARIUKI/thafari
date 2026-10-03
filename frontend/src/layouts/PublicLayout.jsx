// ---------------------------------------------------------
// PUBLIC LAYOUT
// ---------------------------------------------------------
//
// This layout wraps pages that visitors can access without
// being authenticated.
//
// It provides:
// - Navbar
// - Page content
// - Footer
// - Floating chat button
//
// Later we will have separate layouts for:
// - Customers
// - Tour operators
// - Administrators
// ---------------------------------------------------------

import { Outlet } from "react-router-dom"


import Navbar from "../components/Navbar"
import Footer from "../components/Footer"
import FloatingChat from "../components/FloatingChat"


function PublicLayout() {

    return (

        <div className="public-layout">

            <Navbar />


            <main className="main-content">

                <Outlet />

            </main>


            <Footer />


            {/* =================================================
                FLOATING CHAT
            =================================================
            
            This appears globally for authenticated users.

            FloatingChat itself decides:
            - whether the user is logged in
            - whether there are unread messages
            - whether it should hide on chat pages
            ================================================= */}

            <FloatingChat />


        </div>
    )
}


export default PublicLayout