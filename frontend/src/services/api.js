
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

// =========================================================
// AXIOS CONFIGURATION
// =========================================================

const api = axios.create({
    baseURL: API_URL,
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
    },
});

// =========================================================
// CSRF TOKEN STORAGE
// =========================================================

let csrfTokens = {
    access: null,
    refresh: null,
};

let csrfRequest = null;
let refreshPromise = null;

// =========================================================
// FETCH CSRF TOKENS
// =========================================================

const getCsrfTokens = async (forceRefresh = false) => {
    if (forceRefresh) {
        csrfTokens = {
            access: null,
            refresh: null,
        };
    }

    if (!csrfRequest) {
        csrfRequest = api
            .get("/auth/csrf")
            .then((response) => {
                csrfTokens = {
                    access: response.data?.access || null,
                    refresh: response.data?.refresh || null,
                };

                return csrfTokens;
            })
            .finally(() => {
                csrfRequest = null;
            });
    }

    return csrfRequest;
};

// =========================================================
// REQUEST INTERCEPTOR — CSRF PROTECTION
// =========================================================

api.interceptors.request.use(async (config) => {
    const method = (config.method || "get").toUpperCase();

    const unsafeMethods = [
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
    ];

    if (!unsafeMethods.includes(method)) {
        return config;
    }

    const url = config.url || "";
    const isRefreshRequest = url.includes("/auth/refresh");

    let csrfToken = isRefreshRequest
        ? csrfTokens.refresh
        : csrfTokens.access;

    if (!csrfToken) {
        const tokens = await getCsrfTokens();

        csrfToken = isRefreshRequest
            ? tokens.refresh
            : tokens.access;
    }

    if (csrfToken) {
        config.headers = config.headers || {};
        config.headers["X-CSRF-TOKEN"] = csrfToken;
    }

    return config;
});

// =========================================================
// RESPONSE INTERCEPTOR — AUTHENTICATION REFRESH
// =========================================================

api.interceptors.response.use(
    (response) => {
        const url = response.config?.url || "";

        if (url.includes("/auth/login")) {
            csrfTokens = {
                access: null,
                refresh: null,
            };
        }

        if (url.includes("/auth/refresh")) {
            // The backend has replaced the access cookie.
            // Fetch the new access CSRF token before retrying.
            csrfTokens.access = null;
        }

        if (url.includes("/auth/logout")) {
            csrfTokens = {
                access: null,
                refresh: null,
            };
        }

        return response;
    },

    async (error) => {
        const originalRequest = error.config;
        const status = error.response?.status;
        const url = originalRequest?.url || "";

        const message = String(
            error.response?.data?.msg ||
            error.response?.data?.message ||
            ""
        ).toLowerCase();

        const isExpiredAccessToken =
            message.includes("token has expired") ||
            message.includes("access token has expired");

        const excludedRoutes = [
            "/auth/login",
            "/auth/register",
            "/auth/refresh",
            "/auth/logout",
            "/auth/csrf",
        ];

        const isExcludedRoute = excludedRoutes.some(
            (route) => url.includes(route)
        );

        // Refresh only when the server identifies an expired
        // token. Do not refresh for every 401 response.
        if (
            status !== 401 ||
            !originalRequest ||
            originalRequest._retry ||
            isExcludedRoute ||
            !isExpiredAccessToken
        ) {
            return Promise.reject(error);
        }

        // Ensure the original request can only be retried once.
        originalRequest._retry = true;

        try {
            // Share one refresh request among simultaneous
            // failed requests.
            if (!refreshPromise) {
                refreshPromise = (async () => {
                    await api.post("/auth/refresh", {});

                    // The access cookie has changed. Retrieve
                    // the matching, fresh CSRF token.
                    const tokens = await getCsrfTokens(true);

                    if (!tokens.access) {
                        throw new Error(
                            "Unable to retrieve the new access CSRF token."
                        );
                    }

                    return tokens;
                })().finally(() => {
                    refreshPromise = null;
                });
            }

            const tokens = await refreshPromise;

            // Replace any stale CSRF header from the failed
            // request before retrying it.
            originalRequest.headers =
                originalRequest.headers || {};

            originalRequest.headers["X-CSRF-TOKEN"] =
                tokens.access;

            return api(originalRequest);
        } catch (refreshError) {
            return Promise.reject(refreshError);
        }
    }
);

export default api;
