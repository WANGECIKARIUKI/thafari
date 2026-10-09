
import api from "./api";

// ============================================================
// SUBMIT GUEST INQUIRY
// Allows guests to submit inquiries through Ask Thafari.
// ============================================================

export const submitGuestInquiry = async (inquiryData) => {
    const response = await api.post(
        "/guest-inquiries",
        inquiryData
    );

    return response.data;
};

// ============================================================
// GET GUEST INQUIRIES
// Retrieves inquiries for administrators and tour operators.
// ============================================================

export const getGuestInquiries = async () => {
    const response = await api.get(
        "/admin/guest-inquiries"
    );

    return response.data;
};

// ============================================================
// UPDATE GUEST INQUIRY
// Updates an inquiry's status, assignment, or response.
// ============================================================

export const updateGuestInquiry = async (
    inquiryId,
    updateData
) => {
    const response = await api.patch(
        `/admin/guest-inquiries/${inquiryId}`,
        updateData
    );

    return response.data;
};
