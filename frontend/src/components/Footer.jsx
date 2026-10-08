// ---------------------------------------------------------
// THAFARI FOOTER
// ---------------------------------------------------------
//
// Shared footer for the public-facing pages.
// ---------------------------------------------------------
import "./Footer.css"
import "./Branding.css"


function Footer() {

    return (
        <footer className="footer">

            <div className="footer-content">

                <div className="footer-brand">

                    <h2 className="footer-brand-wordmark">
                        <span className="thafari-wordmark">
                            <span className="thafari-wordmark-main">
                                THA
                            </span>
                            <span className="thafari-wordmark-highlight">
                                FARI
                            </span>
                            <span
                                className="thafari-wordmark-accent"
                                aria-hidden="true"
                            />
                        </span>
                    </h2>

                    <p>
                        Discover. Explore. Experience.
                    </p>

                </div>


                <div className="footer-links">

                    <div>

                        <h3>
                            Explore
                        </h3>

                        <a href="/tours">
                            Safaris
                        </a>

                        <a href="/about">
                            About Us
                        </a>

                        <a href="/#contact">
                            Contact Us
                        </a>

                    </div>


                    <div>

                        <h3>
                            Account
                        </h3>

                        <a href="/login">
                            Login
                        </a>

                        <a href="/register">
                            Register
                        </a>

                    </div>

                </div>

            </div>


            <div className="footer-bottom">

                <p>
                    © 2026 Thafari. All rights reserved.
                </p>

            </div>

        </footer>
    )
}


export default Footer
