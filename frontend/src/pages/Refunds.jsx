// =========================================================
// THAFARI REFUND HISTORY
// =========================================================
// Read-only refund history for administrators and tour operators.
// Refund statuses are updated by the verified payment-provider
// workflow, not by manually editing records in this dashboard.
// =========================================================

import { useEffect, useState } from "react"
import { Navigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import api from "../services/api"
import { formatKenyaDateTime } from "../utils/dateTime"
import "./Refunds.css"

const STATUSES = [
    { value: "pending", label: "Pending" },
    { value: "successful", label: "Received" },
    { value: "failed", label: "Failed" },
]

const formatMoney = (amount) => new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
}).format(Number(amount || 0))

const formatDate = (value) => value ? formatKenyaDateTime(value) : "—"

export default function Refunds() {
    const { user, isAuthenticated, authLoading } = useAuth()
    const [status, setStatus] = useState("pending")
    const [refunds, setRefunds] = useState([])
    const [counts, setCounts] = useState({ pending: 0, successful: 0, failed: 0 })
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    useEffect(() => {
        if (authLoading || !isAuthenticated || !["admin", "tour_operator"].includes(user?.role)) {
            return undefined
        }

        let cancelled = false

        const loadRefunds = async () => {
            setLoading(true)
            setError("")

            try {
                // Load the selected list and all status counts together.
                const [selected, pending, successful, failed] = await Promise.all([
                    api.get("/admin/refunds", { params: { status } }),
                    api.get("/admin/refunds", { params: { status: "pending" } }),
                    api.get("/admin/refunds", { params: { status: "successful" } }),
                    api.get("/admin/refunds", { params: { status: "failed" } }),
                ])

                if (cancelled) return

                setRefunds(Array.isArray(selected.data?.refunds) ? selected.data.refunds : [])
                setCounts({
                    pending: Number(pending.data?.count || 0),
                    successful: Number(successful.data?.count || 0),
                    failed: Number(failed.data?.count || 0),
                })
            } catch (requestError) {
                if (!cancelled) {
                    setError(
                        requestError.response?.data?.message ||
                        "Unable to load refund history. Please try again."
                    )
                    setRefunds([])
                }
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        loadRefunds()

        return () => {
            cancelled = true
        }
    }, [authLoading, isAuthenticated, user?.role, status])

    if (authLoading) {
        return <main className="refunds-page"><p>Checking your account…</p></main>
    }

    if (!isAuthenticated) return <Navigate to="/login" replace />
    if (!["admin", "tour_operator"].includes(user?.role)) {
        return <Navigate to="/dashboard" replace />
    }

    const activeStatusLabel = STATUSES.find((item) => item.value === status)?.label || "Refund"

    return (
        <main className="refunds-page">
            <header className="refunds-header">
                <div>
                    <p className="refunds-eyebrow">THAFARI • PAYMENTS</p>
                    <h1>Refunds</h1>
                    <p>Track refund requests and whether money has been returned to customers.</p>
                </div>
                <span className="refunds-readonly-note">
                    Read-only · Status updates come from refund confirmation
                </span>
            </header>

            <section className="refunds-status-tabs" aria-label="Refund status filters">
                {STATUSES.map((item) => (
                    <button
                        key={item.value}
                        type="button"
                        className={status === item.value ? "active" : ""}
                        onClick={() => setStatus(item.value)}
                        disabled={loading}
                        aria-pressed={status === item.value}
                    >
                        <span>{item.label}</span>
                        <strong>{counts[item.value]}</strong>
                    </button>
                ))}
            </section>

            {error && <div className="refunds-message error" role="alert">{error}</div>}

            <section className="refunds-card">
                <div className="refunds-card-header">
                    <h2>{activeStatusLabel} refunds</h2>
                    <span>{refunds.length} record{refunds.length === 1 ? "" : "s"}</span>
                </div>

                {loading ? (
                    <div className="refunds-empty">Loading refund records…</div>
                ) : refunds.length === 0 ? (
                    <div className="refunds-empty">No {status} refunds found.</div>
                ) : (
                    <div className="refunds-table-wrap">
                        <table className="refunds-table">
                            <thead>
                                <tr>
                                    <th>Refund</th>
                                    <th>Customer</th>
                                    <th>Safari / Booking</th>
                                    <th>Amount</th>
                                    <th>Requested</th>
                                    <th>Status date</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {refunds.map((refund) => (
                                    <tr key={refund.refund_id}>
                                        <td>
                                            <strong>#{refund.refund_id}</strong>
                                            <small>{refund.refund_reference || "—"}</small>
                                        </td>
                                        <td>
                                            <strong>{refund.customer?.username || "Unknown customer"}</strong>
                                            <small>{refund.customer?.email || "—"}</small>
                                        </td>
                                        <td>
                                            <strong>{refund.tour?.tour_name || "Tour unavailable"}</strong>
                                            <small>Booking #{refund.booking_id ?? "—"}</small>
                                        </td>
                                        <td className="refunds-amount">{formatMoney(refund.amount)}</td>
                                        <td>{formatDate(refund.created_at)}</td>
                                        <td>{formatDate(
                                            refund.status === "pending"
                                                ? refund.created_at
                                                : refund.refunded_at || refund.created_at
                                        )}</td>
                                        <td>
                                            <span className={`refunds-status ${refund.status}`}>
                                                {refund.status === "successful" ? "Received" : refund.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </main>
    )
}
