// =========================================================
// THAFARI APPLICATION
// =========================================================
//
// This is the main React component.
//
// AuthProvider wraps the application so that authentication
// information is available throughout Thafari.
// =========================================================

import AppRoutes from "./routes/AppRoutes"
import { AuthProvider } from "./context/AuthContext"
import BackToTop from "./pages/BackToTop"

function App() {
    return (
        <AuthProvider>
            <AppRoutes />

            {/* Global back-to-top button */}
            <BackToTop />
        </AuthProvider>
    )
}

export default App
