import { useEffect, useRef, useState } from "react";
import "./AskThafari.css";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getContact } from "../services/contactService";

// ============================================================
// ASK THAFARI - PUBLIC FAQ CHATBOT
//
// Guests can get answers to prepared FAQ topics only.
// Questions outside the supported topics receive contact options
// instead of an invented answer.
// ============================================================

const FAQS = [
    {
        id: "tours",
        icon: "🦁",
        question: "What tours do you offer?",
        answer:
            "Thafari lists available safari tours and destinations on the Tours page. Browse the tours to view each experience, destination, and available details.",
        keywords: ["tour", "tours", "safari", "safaris", "destination", "destinations"],
    },
    {
        id: "prices",
        icon: "💰",
        question: "How much are your tours?",
        answer:
            "Tour prices depend on the tour or safari you choose. Open a tour to see its current price and package details.",
        keywords: ["price", "prices", "cost", "how much", "charges", "fee", "fees"],
    },
    {
        id: "departures",
        icon: "📅",
        question: "What departures are available?",
        answer:
            "Available departure dates depend on the tour. Open a tour and check its departure options to see the dates currently listed.",
        keywords: ["departure", "departures", "date", "dates", "when does", "schedule"],
    },
    {
        id: "booking",
        icon: "📝",
        question: "How do I make a booking?",
        answer:
            "Browse the available tours, choose the tour you want, select an available departure, and follow the booking steps. You may be asked to register or log in to continue.",
        keywords: ["book", "booking", "bookings", "reserve", "reservation", "reservations"],
    },
    {
        id: "payments",
        icon: "💳",
        question: "What payment methods do you accept?",
        answer:
            "Thafari displays the available payment options and instructions during the booking process. Please follow the instructions shown for your booking.",
        keywords: ["payment", "payments", "pay", "mpesa", "m-pesa", "airtel", "money"],
    },
    {
        id: "cancellations",
        icon: "↩️",
        question: "How do cancellations and refunds work?",
        answer:
            "Cancellation and refund options depend on your booking and the applicable Thafari policy. For help with a specific booking or refund, please register or log in and contact the Thafari team.",
        keywords: ["cancel", "cancellation", "cancellations", "refund", "refunds"],
    },
    {
        id: "account",
        icon: "👤",
        question: "Do I need an account?",
        answer:
            "You can browse the public tours without an account. Register or log in when you are ready to continue with features that require an account, such as managing your bookings.",
        keywords: ["account", "register", "registration", "sign up", "signup", "login", "log in"],
    },
];

// Convert saved contact numbers to the format required by tel: and wa.me.
function normalizePhoneNumber(value) {
    let digits = String(value || "").replace(/\D/g, "");

    // Convert Kenyan local numbers (07..., 01...) to country code 254.
    if (digits.startsWith("0")) {
        digits = `254${digits.slice(1)}`;
    }

    return digits;
}

function normalizeText(value) {
    return value
        .toLowerCase()
        .replace(/[^\w\s-]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function findFaq(question) {
    const normalizedQuestion = normalizeText(question);

    if (!normalizedQuestion) {
        return null;
    }

    // Check more specific topics first so, for example,
    // "How do I book a safari?" matches booking rather than tours.
    const priorityOrder = [
        "cancellations",
        "payments",
        "booking",
        "departures",
        "prices",
        "account",
        "tours",
    ];

    for (const faqId of priorityOrder) {
        const faq = FAQS.find((item) => item.id === faqId);

        if (
            faq &&
            faq.keywords.some((keyword) => {
                const normalizedKeyword = normalizeText(keyword);

                return (
                    normalizedQuestion === normalizedKeyword ||
                    normalizedQuestion.includes(normalizedKeyword)
                );
            })
        ) {
            return faq;
        }
    }

    return null;
}

function AskThafari() {
    const { isAuthenticated, authLoading } = useAuth();

    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState([
        {
            id: 1,
            sender: "assistant",
            text:
                "Hi! 👋 Welcome to Ask Thafari. Choose one of the questions below, or type a question about tours, prices, departures, bookings, payments, cancellations, or accounts.",
        },
    ]);
    const [showFaqs, setShowFaqs] = useState(true);
    const [contactDetails, setContactDetails] = useState(null);
    const messagesEndRef = useRef(null);

    // Load the public contact details maintained from Thafari's admin page.
    useEffect(() => {
        let isMounted = true;

        const loadContactDetails = async () => {
            try {
                const data = await getContact();

                if (isMounted) {
                    setContactDetails(data.contact || data);
                }
            } catch {
                // Keep the FAQ chatbot usable if public contact details
                // have not been configured or the API is unavailable.
                if (isMounted) {
                    setContactDetails(null);
                }
            }
        };

        loadContactDetails();

        return () => {
            isMounted = false;
        };
    }, []);

    // Keep the newest answer visible when the conversation changes.
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "end",
        });
    }, [messages]);

    // The chatbot is for public visitors only.
    if (authLoading || isAuthenticated) {
        return null;
    }

    const answerFaq = (faq) => {
        setMessages((previousMessages) => [
            ...previousMessages,
            {
                id: `${Date.now()}-user`,
                sender: "user",
                text: faq.question,
            },
            {
                id: `${Date.now()}-assistant`,
                sender: "assistant",
                text: faq.answer,
            },
        ]);
        setShowFaqs(false);
    };

    const handleSendMessage = (event) => {
        event?.preventDefault();

        const question = input.trim();

        if (!question) {
            return;
        }

        setInput("");

        const faq = findFaq(question);

        if (!faq) {
            setMessages((previousMessages) => [
                ...previousMessages,
                {
                    id: `${Date.now()}-user`,
                    sender: "user",
                    text: question,
                },
                {
                    id: `${Date.now()}-assistant`,
                    sender: "assistant",
                    text:
                        "I don't have a prepared answer for that question, and I don't want to guess. Choose a prepared FAQ topic or use the contact options below.",
                },
            ]);
            setShowFaqs(false);
            return;
        }

        setMessages((previousMessages) => [
            ...previousMessages,
            {
                id: `${Date.now()}-user`,
                sender: "user",
                text: question,
            },
            {
                id: `${Date.now()}-assistant`,
                sender: "assistant",
                text: faq.answer,
            },
        ]);
        setShowFaqs(false);
    };

    const handleFaqClick = (faq) => {
        answerFaq(faq);
    };

    const handleOpenChat = () => {
        setIsOpen(true);
    };

    const handleCloseChat = () => {
        setIsOpen(false);
    };

    const phoneNumber = normalizePhoneNumber(
        contactDetails?.phone_number
    );

    const whatsappNumber = normalizePhoneNumber(
        contactDetails?.whatsapp || contactDetails?.phone_number
    );

    const whatsappUrl = whatsappNumber
        ? `https://wa.me/${whatsappNumber}`
        : null;

    const phoneUrl = phoneNumber
        ? `tel:+${phoneNumber}`
        : null;

    return (
        <>
            {/* FLOATING ASK THAFARI BUTTON */}
            <button
                type="button"
                className="ask-thafari-launcher"
                onClick={handleOpenChat}
                aria-label="Open Ask Thafari"
                aria-expanded={isOpen}
            >
                <span className="ask-thafari-launcher-icon">✦</span>
                <span className="ask-thafari-launcher-text">
                    Ask Thafari
                </span>
            </button>

            {/* CHAT WINDOW */}
            {isOpen && (
                <div className="ask-thafari-wrapper">
                    <section
                        className="ask-thafari-window"
                        aria-label="Ask Thafari FAQ chatbot"
                    >
                        {/* HEADER */}
                        <header className="ask-thafari-header">
                            <div className="ask-thafari-header-info">
                                <div className="ask-thafari-avatar">T</div>
                                <div>
                                    <h2>Ask Thafari</h2>
                                    <p>Quick answers about your safari</p>
                                </div>
                            </div>

                            <button
                                type="button"
                                className="ask-thafari-close"
                                onClick={handleCloseChat}
                                aria-label="Close Ask Thafari"
                            >
                                ×
                            </button>
                        </header>

                        {/* CHAT CONTENT */}
                        <div className="ask-thafari-content">
                            <div className="ask-thafari-welcome">
                                <div className="ask-thafari-welcome-icon">
                                    👋
                                </div>

                                <h3>Welcome to Ask Thafari!</h3>

                                <p>
                                    Choose a question to see an approved
                                    answer. For personal assistance, register
                                    or contact our team.
                                </p>
                            </div>

                            {/* MESSAGES */}
                            <div
                                className="ask-thafari-messages"
                                aria-live="polite"
                                aria-relevant="additions"
                            >
                                {messages.map((message) => (
                                    <div
                                        key={message.id}
                                        className={`ask-thafari-message ${
                                            message.sender === "user"
                                                ? "ask-thafari-message-user"
                                                : "ask-thafari-message-assistant"
                                        }`}
                                    >
                                        {message.text}
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* PREPARED FAQ QUESTIONS */}
                            <div className="ask-thafari-questions">
                                <button
                                    type="button"
                                    className="ask-thafari-section-title"
                                    onClick={() => setShowFaqs((visible) => !visible)}
                                    aria-expanded={showFaqs}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        gap: "12px",
                                        width: "100%",
                                        border: 0,
                                        background: "transparent",
                                        padding: "8px 0",
                                        cursor: "pointer",
                                        textAlign: "left",
                                    }}
                                >
                                    <span>
                                        {showFaqs
                                            ? "Frequently asked questions"
                                            : "Choose another question"}
                                    </span>
                                    <span aria-hidden="true">
                                        {showFaqs ? "−" : "+"}
                                    </span>
                                </button>

                                {showFaqs && FAQS.map((faq) => (
                                    <button
                                        key={faq.id}
                                        type="button"
                                        className="ask-thafari-question"
                                        onClick={() => handleFaqClick(faq)}
                                    >
                                        <span aria-hidden="true">
                                            {faq.icon}
                                        </span>
                                        <span>{faq.question}</span>
                                    </button>
                                ))}
                            </div>

                            {/* HUMAN SUPPORT OPTIONS */}
                            <div className="ask-thafari-human-card">
                                <div>
                                    <strong>Need personal assistance?</strong>
                                    <p>
                                        Register or log in, or contact the
                                        Thafari team directly.
                                    </p>
                                </div>

                                <div
                                    className="ask-thafari-contact-actions"
                                    style={{
                                        display: "grid",
                                        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                                        gap: "10px",
                                        marginTop: "16px",
                                    }}
                                >
                                    <Link
                                        to="/register"
                                        onClick={handleCloseChat}
                                        className="ask-thafari-contact-button ask-thafari-contact-button-secondary"
                                        style={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            gap: "8px",
                                            minHeight: "44px",
                                            padding: "10px 12px",
                                            border: "1px solid #dce6dc",
                                            borderRadius: "12px",
                                            background: "#ffffff",
                                            color: "#294d37",
                                            fontSize: "13px",
                                            fontWeight: 700,
                                            textDecoration: "none",
                                            boxSizing: "border-box",
                                            transition: "all 160ms ease",
                                        }}
                                    >
                                        <span aria-hidden="true">✦</span>
                                        <span>Register</span>
                                    </Link>

                                    <Link
                                        to="/login"
                                        onClick={handleCloseChat}
                                        className="ask-thafari-contact-button ask-thafari-contact-button-secondary"
                                        style={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            gap: "8px",
                                            minHeight: "44px",
                                            padding: "10px 12px",
                                            border: "1px solid #dce6dc",
                                            borderRadius: "12px",
                                            background: "#ffffff",
                                            color: "#294d37",
                                            fontSize: "13px",
                                            fontWeight: 700,
                                            textDecoration: "none",
                                            boxSizing: "border-box",
                                            transition: "all 160ms ease",
                                        }}
                                    >
                                        <span aria-hidden="true">↪</span>
                                        <span>Log in</span>
                                    </Link>

                                    {phoneUrl && (
                                        <a
                                            href={phoneUrl}
                                            className="ask-thafari-contact-button ask-thafari-contact-button-call"
                                            style={{
                                                display: "inline-flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                gap: "8px",
                                                minHeight: "46px",
                                                padding: "10px 12px",
                                                border: "1px solid #294d37",
                                                borderRadius: "12px",
                                                background: "#294d37",
                                                color: "#ffffff",
                                                fontSize: "13px",
                                                fontWeight: 700,
                                                textDecoration: "none",
                                                boxSizing: "border-box",
                                                transition: "all 160ms ease",
                                            }}
                                        >
                                            <svg
                                                width="17"
                                                height="17"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                aria-hidden="true"
                                            >
                                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 11.19 18a19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.09 3.18 2 2 0 0 1 4.08 1h3a2 2 0 0 1 2 1.72c.12.96.36 1.9.7 2.8a2 2 0 0 1-.45 2.11L8.06 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.84.58 2.8.7A2 2 0 0 1 22 16.92z" />
                                            </svg>
                                            <span>Call Thafari</span>
                                        </a>
                                    )}

                                    {whatsappUrl && (
                                        <a
                                            href={whatsappUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="ask-thafari-contact-button ask-thafari-contact-button-whatsapp"
                                            style={{
                                                display: "inline-flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                gap: "8px",
                                                minHeight: "46px",
                                                padding: "10px 12px",
                                                border: "1px solid #168c55",
                                                borderRadius: "12px",
                                                background: "#168c55",
                                                color: "#ffffff",
                                                fontSize: "13px",
                                                fontWeight: 700,
                                                textDecoration: "none",
                                                boxSizing: "border-box",
                                                transition: "all 160ms ease",
                                            }}
                                        >
                                            <svg
                                                width="18"
                                                height="18"
                                                viewBox="0 0 24 24"
                                                fill="currentColor"
                                                aria-hidden="true"
                                            >
                                                <path d="M20.52 3.48A11.82 11.82 0 0 0 12.08 0C5.5 0 .15 5.34.15 11.92c0 2.1.55 4.15 1.6 5.96L0 24l6.3-1.65a11.9 11.9 0 0 0 5.78 1.47h.01c6.58 0 11.92-5.35 11.92-11.92 0-3.18-1.24-6.17-3.49-8.42ZM12.08 21.8h-.01a9.9 9.9 0 0 1-5.04-1.38l-.36-.21-3.74.98 1-3.65-.24-.38a9.84 9.84 0 0 1-1.51-5.24c0-5.46 4.44-9.9 9.91-9.9 2.65 0 5.14 1.03 7.01 2.9a9.84 9.84 0 0 1 2.9 7.01c0 5.46-4.44 9.9-9.92 9.9Zm5.43-7.41c-.3-.15-1.77-.87-2.05-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.47-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.49s1.07 2.89 1.22 3.09c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.5 1.69.64.71.23 1.36.2 1.87.12.57-.08 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35Z" />
                                            </svg>
                                            <span>WhatsApp</span>
                                        </a>
                                    )}

                                    {!phoneUrl && !whatsappUrl && (
                                        <p
                                            style={{
                                                gridColumn: "1 / -1",
                                                margin: "4px 0 0",
                                                fontSize: "12px",
                                                lineHeight: 1.5,
                                                color: "#6b776e",
                                            }}
                                        >
                                            {contactDetails
                                                ? "Add a phone number and WhatsApp number in the Admin Contact settings to enable direct contact."
                                                : "Contact details could not be loaded. You can still register or log in, or try again later."}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* QUESTION INPUT */}
                        <form
                            className="ask-thafari-input-area"
                            onSubmit={handleSendMessage}
                        >
                            <input
                                type="text"
                                className="ask-thafari-input"
                                placeholder="Ask about a supported FAQ..."
                                aria-label="Ask a question about Thafari"
                                value={input}
                                onChange={(event) =>
                                    setInput(event.target.value)
                                }
                                maxLength={500}
                            />

                            <button
                                type="submit"
                                className="ask-thafari-send"
                                disabled={!input.trim()}
                                aria-label="Submit question"
                            >
                                ➤
                            </button>
                        </form>
                    </section>
                </div>
            )}
        </>
    );
}

export default AskThafari;
