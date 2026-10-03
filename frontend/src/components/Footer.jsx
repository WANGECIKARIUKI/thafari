// ---------------------------------------------------------
// THAFARI FOOTER
// ---------------------------------------------------------
//
// Shared footer for the public-facing pages.
// ---------------------------------------------------------
import "./footer.css"


function Footer() {

    return (
        <footer className="footer">

            <div className="footer-content">

                <div className="footer-brand">

                    <h2>
                        THAFARI
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

                        <a href="/faqs">
                            FAQs
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
