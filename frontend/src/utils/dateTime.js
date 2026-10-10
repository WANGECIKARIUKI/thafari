// Shared Thafari date/time formatting helpers.
// Date-time strings without an explicit timezone are treated as UTC.
// Date-only strings (YYYY-MM-DD) are kept as calendar dates and never shifted.
const KENYA_TIME_ZONE = "Africa/Nairobi";
const KENYA_LOCALE = "en-KE";

const isDateOnly = (value) =>
    typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);

const parseDateTime = (value) => {
    if (value instanceof Date) return value;
    if (typeof value !== "string" && typeof value !== "number") return null;

    let normalized = value;
    if (typeof value === "string" && !isDateOnly(value)) {
        // Backend SQLAlchemy ISO strings can be naive UTC timestamps,
        // e.g. 2026-10-10T12:30:00. Append Z only when no offset exists.
        const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value);
        if (!hasTimezone && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
            normalized = `${value}Z`;
        }
    }

    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? null : date;
};

export const formatKenyaDate = (
    value,
    options = { day: "numeric", month: "long", year: "numeric" }
) => {
    if (!value) return "—";

    // Date-only values are calendar dates, not instants in time.
    if (isDateOnly(value)) {
        const date = parseDateTime(`${value}T00:00:00Z`);
        return date
            ? new Intl.DateTimeFormat(KENYA_LOCALE, {
                ...options,
                timeZone: "UTC",
            }).format(date)
            : "—";
    }

    const date = parseDateTime(value);
    return date
        ? new Intl.DateTimeFormat(KENYA_LOCALE, {
            ...options,
            timeZone: KENYA_TIME_ZONE,
        }).format(date)
        : "—";
};

export const formatKenyaDateTime = (
    value,
    options = { dateStyle: "medium", timeStyle: "short" }
) => {
    if (!value) return "—";
    const date = parseDateTime(value);
    return date
        ? new Intl.DateTimeFormat(KENYA_LOCALE, {
            ...options,
            timeZone: KENYA_TIME_ZONE,
        }).format(date)
        : "—";
};

export const formatKenyaTime = (
    value,
    options = { hour: "2-digit", minute: "2-digit" }
) => {
    if (!value) return "";
    const date = parseDateTime(value);
    return date
        ? new Intl.DateTimeFormat(KENYA_LOCALE, {
            ...options,
            timeZone: KENYA_TIME_ZONE,
        }).format(date)
        : "";
};
