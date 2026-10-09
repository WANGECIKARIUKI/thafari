import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
    getGuestInquiries,
    updateGuestInquiry,
} from "../services/guestInquiryService";

// ============================================================
// ADMIN / TOUR OPERATOR: GUEST INQUIRIES
// ============================================================

function AdminGuestInquiries() {
    const { user } = useAuth();

    const [inquiries, setInquiries] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [responseText, setResponseText] = useState("");

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    // --------------------------------------------------------
    // LOAD GUEST INQUIRIES
    // --------------------------------------------------------

    const loadInquiries = useCallback(async () => {
        try {
            const data = await getGuestInquiries();

            const records = Array.isArray(data.inquiries)
                ? data.inquiries
                : [];

            setInquiries(records);

            setSelectedId((currentId) => {
                if (
                    currentId !== null &&
                    records.some(
                        (inquiry) => inquiry.id === currentId
                    )
                ) {
                    return currentId;
                }

                return records.length > 0
                    ? records[0].id
                    : null;
            });
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "We could not load guest inquiries. Please try again."
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // Schedule the initial request outside the synchronous effect body.
        // This avoids React's set-state-in-effect lint warning.
        const timerId = setTimeout(() => {
            loadInquiries();
        }, 0);

        return () => clearTimeout(timerId);
    }, [loadInquiries]); 

    // Manual refresh is triggered by a user interaction, so it can
    // explicitly restore the loading state before requesting data.
    const handleRefresh = () => {
        setLoading(true);
        setError("");
        loadInquiries();
    };

    // --------------------------------------------------------
    // SELECTED INQUIRY
    // --------------------------------------------------------

    const selectedInquiry = useMemo(
        () =>
            inquiries.find(
                (inquiry) => inquiry.id === selectedId
            ) || null,
        [inquiries, selectedId]
    );

    // --------------------------------------------------------
    // FILTER INQUIRIES
    // --------------------------------------------------------

    const filteredInquiries = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();

        return inquiries.filter((inquiry) => {
            const matchesStatus =
                statusFilter === "all" ||
                inquiry.status === statusFilter;

            const searchableText = [
                inquiry.name,
                inquiry.email,
                inquiry.phone,
                inquiry.message,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            return (
                matchesStatus &&
                searchableText.includes(term)
            );
        });
    }, [inquiries, searchTerm, statusFilter]);

    const pendingCount = inquiries.filter(
        (item) => item.status === "pending"
    ).length;

    const inProgressCount = inquiries.filter(
        (item) => item.status === "in_progress"
    ).length;

    const resolvedCount = inquiries.filter(
        (item) => item.status === "resolved"
    ).length;

    // --------------------------------------------------------
    // FORMAT DATES
    // --------------------------------------------------------

    const formatDate = (dateValue) => {
        if (!dateValue) {
            return "Date unavailable";
        }

        const date = new Date(dateValue);

        if (Number.isNaN(date.getTime())) {
            return "Date unavailable";
        }

        return date.toLocaleString("en-KE", {
            dateStyle: "medium",
            timeStyle: "short",
        });
    };

    // --------------------------------------------------------
    // SELECT INQUIRY
    // Update selection and response draft directly on click.
    // This avoids synchronizing state inside a useEffect.
    // --------------------------------------------------------

    const handleSelectInquiry = (inquiry) => {
        setSelectedId(inquiry.id);
        setResponseText(inquiry.response || "");
        setNotice("");
        setError("");
    };

    // --------------------------------------------------------
    // SAVE AN INQUIRY UPDATE
    // --------------------------------------------------------

    const saveUpdate = async (inquiryId, updateData) => {
        setSaving(true);
        setError("");
        setNotice("");

        try {
            const result = await updateGuestInquiry(
                inquiryId,
                updateData
            );

            const updatedInquiry = result.inquiry;

            if (updatedInquiry) {
                setInquiries((current) =>
                    current.map((inquiry) =>
                        inquiry.id === updatedInquiry.id
                            ? updatedInquiry
                            : inquiry
                    )
                );

                // Keep the response editor synchronized when
                // the currently selected inquiry is updated.
                if (
                    updatedInquiry.id === selectedId &&
                    Object.prototype.hasOwnProperty.call(
                        updateData,
                        "response"
                    )
                ) {
                    setResponseText(
                        updatedInquiry.response || ""
                    );
                }
            } else {
                await loadInquiries();
            }

            setNotice(
                result.message ||
                "Guest inquiry updated successfully."
            );

            return true;
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Could not update this inquiry. Please try again."
            );

            return false;
        } finally {
            setSaving(false);
        }
    };

    // --------------------------------------------------------
    // CHANGE STATUS
    // --------------------------------------------------------

    const handleStatusChange = async (event) => {
        if (!selectedInquiry) {
            return;
        }

        const status = event.target.value;

        await saveUpdate(selectedInquiry.id, { status });
    };

    // --------------------------------------------------------
    // ASSIGN INQUIRY TO CURRENT STAFF MEMBER
    // --------------------------------------------------------

    const handleAssignToMe = async () => {
        if (!selectedInquiry) {
            return;
        }

        await saveUpdate(selectedInquiry.id, {
            assign_to_me: true,
        });
    };

    // --------------------------------------------------------
    // SAVE RESPONSE
    // --------------------------------------------------------

    const handleSaveResponse = async (event) => {
        event.preventDefault();

        if (!selectedInquiry) {
            return;
        }

        const success = await saveUpdate(
            selectedInquiry.id,
            { response: responseText }
        );

        if (success) {
            setNotice("Your response has been saved.");
        }
    };

    // --------------------------------------------------------
    // STATUS LABELS AND COLORS
    // --------------------------------------------------------

    const statusLabel = (status) => {
        const labels = {
            pending: "Pending",
            in_progress: "In Progress",
            resolved: "Resolved",
        };

        return labels[status] || status || "Unknown";
    };

    const statusStyle = (status) => {
        const styles = {
            pending: {
                background: "#fff2d8",
                color: "#885d14",
            },
            in_progress: {
                background: "#e5efff",
                color: "#2456a6",
            },
            resolved: {
                background: "#e1f5e8",
                color: "#216b40",
            },
        };

        return styles[status] || {
            background: "#eeeeee",
            color: "#555555",
        };
    };

    // --------------------------------------------------------
    // SHARED STYLES
    // --------------------------------------------------------

    const styles = {
        page: {
            minHeight: "70vh",
            padding: "36px 5%",
            background: "#f7f6f1",
            color: "#253b2c",
        },
        container: {
            maxWidth: "1400px",
            margin: "0 auto",
        },
        eyebrow: {
            margin: "0 0 8px",
            color: "#78866b",
            fontSize: "12px",
            fontWeight: 800,
            letterSpacing: "2px",
            textTransform: "uppercase",
        },
        heading: {
            margin: "0 0 10px",
            fontSize: "clamp(27px, 4vw, 38px)",
            lineHeight: 1.2,
        },
        muted: {
            color: "#777d75",
            lineHeight: 1.6,
        },
        panel: {
            background: "#ffffff",
            border: "1px solid #e8e7df",
            borderRadius: "16px",
            padding: "22px",
            minWidth: 0,
        },
        label: {
            display: "block",
            marginBottom: "8px",
            color: "#465447",
            fontSize: "13px",
            fontWeight: 700,
        },
        input: {
            width: "100%",
            minWidth: 0,
            boxSizing: "border-box",
            padding: "12px 13px",
            border: "1px solid #dedfd7",
            borderRadius: "9px",
            background: "#ffffff",
            color: "#253b2c",
            fontSize: "14px",
        },
        button: {
            border: "1px solid #d9ded5",
            borderRadius: "9px",
            padding: "11px 15px",
            background: "#ffffff",
            color: "#253b2c",
            fontWeight: 700,
            cursor: "pointer",
        },
        primaryButton: {
            border: "none",
            borderRadius: "9px",
            padding: "12px 17px",
            background: "#294d37",
            color: "#ffffff",
            fontWeight: 700,
            cursor: "pointer",
        },
    };

    // --------------------------------------------------------
    // RENDER PAGE
    // --------------------------------------------------------

    return (
        <main style={styles.page}>
            <div style={styles.container}>
                {/* PAGE HEADER */}

                <header
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "18px",
                        marginBottom: "28px",
                    }}
                >
                    <div>
                        <p style={styles.eyebrow}>
                            THAFARI • GUEST SUPPORT
                        </p>

                        <h1 style={styles.heading}>
                            Guest Inquiries
                        </h1>

                        <p style={styles.muted}>
                            Manage guest questions, follow up,
                            and prepare responses from one place.
                        </p>
                    </div>

                    <button
                        type="button"
                        style={styles.button}
                        onClick={handleRefresh}
                        disabled={loading || saving}
                    >
                        {loading ? "Refreshing..." : "↻ Refresh"}
                    </button>
                </header>

                {/* SUMMARY CARDS */}

                <section
                    style={{
                        display: "grid",
                        gridTemplateColumns:
                            "repeat(auto-fit, minmax(170px, 1fr))",
                        gap: "14px",
                        marginBottom: "24px",
                    }}
                >
                    {[
                        {
                            label: "Total inquiries",
                            count: inquiries.length,
                        },
                        {
                            label: "Pending",
                            count: pendingCount,
                        },
                        {
                            label: "In progress",
                            count: inProgressCount,
                        },
                        {
                            label: "Resolved",
                            count: resolvedCount,
                        },
                    ].map((item) => (
                        <article
                            key={item.label}
                            style={{
                                ...styles.panel,
                                padding: "20px",
                            }}
                        >
                            <p
                                style={{
                                    ...styles.muted,
                                    margin: "0 0 8px",
                                    fontSize: "13px",
                                }}
                            >
                                {item.label}
                            </p>

                            <strong
                                style={{
                                    fontSize: "30px",
                                    fontWeight: 800,
                                }}
                            >
                                {item.count}
                            </strong>
                        </article>
                    ))}
                </section>

                {/* ERROR AND SUCCESS MESSAGES */}

                {error && (
                    <div
                        role="alert"
                        style={{
                            padding: "13px 15px",
                            marginBottom: "18px",
                            borderRadius: "9px",
                            background: "#fff0ed",
                            color: "#a12f24",
                        }}
                    >
                        {error}
                    </div>
                )}

                {notice && (
                    <div
                        role="status"
                        style={{
                            padding: "13px 15px",
                            marginBottom: "18px",
                            borderRadius: "9px",
                            background: "#e8f5eb",
                            color: "#24663b",
                        }}
                    >
                        {notice}
                    </div>
                )}

                {/* SEARCH AND FILTERS */}

                <section
                    style={{
                        ...styles.panel,
                        marginBottom: "20px",
                    }}
                >
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns:
                                "repeat(auto-fit, minmax(220px, 1fr))",
                            gap: "16px",
                        }}
                    >
                        <div>
                            <label
                                htmlFor="inquiry-search"
                                style={styles.label}
                            >
                                Search inquiries
                            </label>

                            <input
                                id="inquiry-search"
                                type="search"
                                placeholder="Search name, email, phone..."
                                value={searchTerm}
                                onChange={(event) =>
                                    setSearchTerm(event.target.value)
                                }
                                style={styles.input}
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="inquiry-status-filter"
                                style={styles.label}
                            >
                                Filter by status
                            </label>

                            <select
                                id="inquiry-status-filter"
                                value={statusFilter}
                                onChange={(event) =>
                                    setStatusFilter(event.target.value)
                                }
                                style={styles.input}
                            >
                                <option value="all">
                                    All statuses
                                </option>
                                <option value="pending">
                                    Pending
                                </option>
                                <option value="in_progress">
                                    In Progress
                                </option>
                                <option value="resolved">
                                    Resolved
                                </option>
                            </select>
                        </div>
                    </div>
                </section>

                {/* INQUIRY LIST AND DETAILS */}

                <section
                    style={{
                        display: "grid",
                        gridTemplateColumns:
                            "repeat(auto-fit, minmax(min(100%, 340px), 1fr))",
                        alignItems: "start",
                        gap: "20px",
                    }}
                >
                    {/* LEFT: INQUIRY LIST */}

                    <div style={styles.panel}>
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                gap: "10px",
                                marginBottom: "16px",
                            }}
                        >
                            <h2
                                style={{
                                    margin: 0,
                                    fontSize: "18px",
                                }}
                            >
                                Inbox
                            </h2>

                            <span
                                style={{
                                    ...styles.muted,
                                    fontSize: "12px",
                                }}
                            >
                                {filteredInquiries.length} found
                            </span>
                        </div>

                        {loading ? (
                            <p style={styles.muted}>
                                Loading guest inquiries...
                            </p>
                        ) : filteredInquiries.length === 0 ? (
                            <div
                                style={{
                                    padding: "28px 10px",
                                    textAlign: "center",
                                }}
                            >
                                <p style={{ fontSize: "25px" }}>
                                    ✉
                                </p>

                                <strong>
                                    No inquiries found
                                </strong>

                                <p style={styles.muted}>
                                    Try another search or status filter.
                                </p>
                            </div>
                        ) : (
                            <div
                                style={{
                                    display: "grid",
                                    gap: "10px",
                                }}
                            >
                                {filteredInquiries.map((inquiry) => {
                                    const isSelected =
                                        inquiry.id === selectedId;

                                    return (
                                        <button
                                            type="button"
                                            key={inquiry.id}
                                            onClick={() =>
                                                handleSelectInquiry(inquiry)
                                            }
                                            style={{
                                                width: "100%",
                                                boxSizing: "border-box",
                                                padding: "15px",
                                                textAlign: "left",
                                                border: isSelected
                                                    ? "1px solid #55755b"
                                                    : "1px solid #e9e9e3",
                                                borderRadius: "11px",
                                                background: isSelected
                                                    ? "#f0f5ed"
                                                    : "#ffffff",
                                                color: "#253b2c",
                                                cursor: "pointer",
                                            }}
                                        >
                                            <div
                                                style={{
                                                    display: "flex",
                                                    justifyContent:
                                                        "space-between",
                                                    alignItems: "start",
                                                    gap: "10px",
                                                }}
                                            >
                                                <strong
                                                    style={{
                                                        overflowWrap:
                                                            "anywhere",
                                                    }}
                                                >
                                                    {inquiry.name}
                                                </strong>

                                                <span
                                                    style={{
                                                        ...statusStyle(
                                                            inquiry.status
                                                        ),
                                                        flexShrink: 0,
                                                        padding: "4px 8px",
                                                        borderRadius: "20px",
                                                        fontSize: "10px",
                                                        fontWeight: 800,
                                                    }}
                                                >
                                                    {statusLabel(
                                                        inquiry.status
                                                    )}
                                                </span>
                                            </div>

                                            <p
                                                style={{
                                                    margin: "9px 0",
                                                    color: "#70786e",
                                                    fontSize: "13px",
                                                    lineHeight: 1.5,
                                                }}
                                            >
                                                {inquiry.message}
                                            </p>

                                            <span
                                                style={{
                                                    color: "#8a8f86",
                                                    fontSize: "11px",
                                                }}
                                            >
                                                {formatDate(
                                                    inquiry.created_at
                                                )}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* RIGHT: INQUIRY DETAILS */}

                    <div style={styles.panel}>
                        {!selectedInquiry ? (
                            <div
                                style={{
                                    padding: "35px 10px",
                                    textAlign: "center",
                                }}
                            >
                                <h2>No inquiry selected</h2>

                                <p style={styles.muted}>
                                    Select a guest inquiry from the inbox
                                    to view its details.
                                </p>
                            </div>
                        ) : (
                            <>
                                <p style={styles.eyebrow}>
                                    INQUIRY #{selectedInquiry.id}
                                </p>

                                <h2
                                    style={{
                                        margin: "0 0 18px",
                                        fontSize: "23px",
                                        overflowWrap: "anywhere",
                                    }}
                                >
                                    {selectedInquiry.name}
                                </h2>

                                <div
                                    style={{
                                        display: "grid",
                                        gap: "12px",
                                        marginBottom: "22px",
                                    }}
                                >
                                    <div>
                                        <span style={styles.label}>
                                            Email
                                        </span>

                                        <p
                                            style={{
                                                margin: 0,
                                                overflowWrap: "anywhere",
                                            }}
                                        >
                                            {selectedInquiry.email ? (
                                                <a
                                                    href={`mailto:${selectedInquiry.email}`}
                                                    style={{
                                                        color: "#416b49",
                                                    }}
                                                >
                                                    {selectedInquiry.email}
                                                </a>
                                            ) : (
                                                "Not provided"
                                            )}
                                        </p>
                                    </div>

                                    <div>
                                        <span style={styles.label}>
                                            Phone
                                        </span>

                                        <p style={{ margin: 0 }}>
                                            {selectedInquiry.phone ? (
                                                <a
                                                    href={`tel:${selectedInquiry.phone}`}
                                                    style={{
                                                        color: "#416b49",
                                                    }}
                                                >
                                                    {selectedInquiry.phone}
                                                </a>
                                            ) : (
                                                "Not provided"
                                            )}
                                        </p>
                                    </div>

                                    <div>
                                        <span style={styles.label}>
                                            Received
                                        </span>

                                        <p style={{ margin: 0 }}>
                                            {formatDate(
                                                selectedInquiry.created_at
                                            )}
                                        </p>
                                    </div>
                                </div>

                                {/* GUEST MESSAGE */}

                                <div
                                    style={{
                                        padding: "16px",
                                        marginBottom: "22px",
                                        background: "#f7f6f1",
                                        borderRadius: "11px",
                                    }}
                                >
                                    <span style={styles.label}>
                                        Guest message
                                    </span>

                                    <p
                                        style={{
                                            margin: 0,
                                            lineHeight: 1.8,
                                            whiteSpace: "pre-wrap",
                                            overflowWrap: "anywhere",
                                        }}
                                    >
                                        {selectedInquiry.message}
                                    </p>
                                </div>

                                {/* STATUS */}

                                <div style={{ marginBottom: "20px" }}>
                                    <label
                                        htmlFor="inquiry-status"
                                        style={styles.label}
                                    >
                                        Inquiry status
                                    </label>

                                    <select
                                        id="inquiry-status"
                                        value={selectedInquiry.status}
                                        onChange={handleStatusChange}
                                        disabled={saving}
                                        style={styles.input}
                                    >
                                        <option value="pending">
                                            Pending
                                        </option>

                                        <option value="in_progress">
                                            In Progress
                                        </option>

                                        <option value="resolved">
                                            Resolved
                                        </option>
                                    </select>
                                </div>

                                {/* ASSIGNMENT */}

                                <div
                                    style={{
                                        padding: "15px",
                                        marginBottom: "22px",
                                        border: "1px solid #e8e7df",
                                        borderRadius: "11px",
                                    }}
                                >
                                    <span style={styles.label}>
                                        Assigned staff ID
                                    </span>

                                    <p
                                        style={{
                                            margin: "0 0 12px",
                                            fontSize: "14px",
                                        }}
                                    >
                                        {selectedInquiry.assigned_to != null
                                            ? selectedInquiry.assigned_to
                                            : "Not assigned"}
                                    </p>

                                    {String(selectedInquiry.assigned_to) ===
                                    String(user?.id) ? (
                                        <span
                                            style={{
                                                color: "#287344",
                                                fontSize: "13px",
                                                fontWeight: 700,
                                            }}
                                        >
                                            ✓ Assigned to you
                                        </span>
                                    ) : (
                                        <button
                                            type="button"
                                            style={styles.button}
                                            disabled={saving}
                                            onClick={handleAssignToMe}
                                        >
                                            {saving
                                                ? "Saving..."
                                                : "Assign to me"}
                                        </button>
                                    )}
                                </div>

                                {/* RESPONSE */}

                                <form onSubmit={handleSaveResponse}>
                                    <label
                                        htmlFor="guest-response"
                                        style={styles.label}
                                    >
                                        Staff response / draft
                                    </label>

                                    <textarea
                                        id="guest-response"
                                        value={responseText}
                                        onChange={(event) =>
                                            setResponseText(
                                                event.target.value
                                            )
                                        }
                                        maxLength={5000}
                                        rows={6}
                                        placeholder="Write a response to this guest..."
                                        style={{
                                            ...styles.input,
                                            resize: "vertical",
                                            lineHeight: 1.6,
                                            fontFamily: "inherit",
                                        }}
                                    />

                                    <p
                                        style={{
                                            ...styles.muted,
                                            margin: "7px 0 15px",
                                            fontSize: "12px",
                                        }}
                                    >
                                        {responseText.length}/5000 characters
                                    </p>

                                    <button
                                        type="submit"
                                        style={styles.primaryButton}
                                        disabled={saving}
                                    >
                                        {saving
                                            ? "Saving..."
                                            : "Save response"}
                                    </button>

                                    <p
                                        style={{
                                            ...styles.muted,
                                            marginTop: "12px",
                                            fontSize: "12px",
                                        }}
                                    >
                                        Saving a response stores it in
                                        Thafari. It does not send an email
                                        or message to the guest.
                                    </p>
                                </form>
                            </>
                        )}
                    </div>
                </section>
            </div>
        </main>
    );
}

export default AdminGuestInquiries;
