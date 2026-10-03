// =========================================================
// THAFARI BACK TO TOP BUTTON
// =========================================================
// Floating button that appears after scrolling down and
// smoothly takes the user back to the top of the page.
// =========================================================

import { useEffect, useState } from "react"
import "./BackToTop.css"

function BackToTop() {
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        const handleScroll = () => {
            setIsVisible(window.scrollY > 500)
        }

        window.addEventListener("scroll", handleScroll, { passive: true })
        handleScroll()

        return () => {
            window.removeEventListener("scroll", handleScroll)
        }
    }, [])

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: "smooth",
        })
    }

    if (!isVisible) {
        return null
    }

    return (
        <button
            type="button"
            className="back-to-top"
            onClick={scrollToTop}
            aria-label="Back to top"
            title="Back to top"
        >
            ↑
        </button>
    )
}

export default BackToTop
