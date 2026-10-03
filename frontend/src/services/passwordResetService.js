import api from "./api"

// Request a password reset email.
// The backend intentionally gives the same response whether
// the email exists or not, to protect user accounts from enumeration.
export const requestPasswordReset = async (email) => {
    const response = await api.post("/auth/forgot-password", {
        email,
    })

    return response.data
}


// Reset the password using the token received in the email.
export const resetPassword = async (token, newPassword) => {
    const response = await api.post("/auth/reset-password", {
        token,
        new_password: newPassword,
    })

    return response.data
}