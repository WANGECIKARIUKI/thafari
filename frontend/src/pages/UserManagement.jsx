// =========================================================
// THAFARI USER MANAGEMENT
// =========================================================
//
// Admin-only frontend page for managing customer and
// tour-operator roles.
//
// The backend remains responsible for authorization.
// Only an authenticated admin can successfully change
// a user's role.
//
// Supported role changes:
//
// customer -> tour_operator
// tour_operator -> customer
// =========================================================

import { useEffect, useState } from "react"

import { useAuth } from "../context/AuthContext"

import {
    getManageableUsers,
    updateUserRole,
} from "../services/userService"

import "./UserManagement.css"


function UserManagement() {

    // ---------------------------------------------------------
    // AUTHENTICATED ADMIN
    // ---------------------------------------------------------

    const {
        user,
        accessToken,
        isAuthenticated,
        authLoading,
    } = useAuth()


    // ---------------------------------------------------------
    // USERS
    // ---------------------------------------------------------

    const [users, setUsers] = useState([])

    const [loading, setLoading] = useState(true)

    const [error, setError] = useState("")

    const [successMessage, setSuccessMessage] = useState("")


    // ---------------------------------------------------------
    // ROLE CHANGE STATE
    // ---------------------------------------------------------

    const [selectedUser, setSelectedUser] = useState(null)

    const [changingRole, setChangingRole] = useState(false)


    // =========================================================
    // LOAD USERS
    // =========================================================

    useEffect(() => {

        if (
            authLoading ||
            !isAuthenticated ||
            !accessToken ||
            user?.role !== "admin"
        ) {
            return
        }


        const loadUsers = async () => {

            setLoading(true)

            setError("")

            try {

                const data =
                    await getManageableUsers(
                        accessToken
                    )

                setUsers(
                    Array.isArray(data?.users)
                        ? data.users
                        : []
                )

            } catch (err) {

                console.error(
                    "Failed to load users:",
                    err
                )

                setError(
                    err?.response?.data?.message ||
                    "We could not load users right now. Please try again."
                )

            } finally {

                setLoading(false)

            }
        }


        loadUsers()

    }, [
        authLoading,
        isAuthenticated,
        accessToken,
        user?.role,
    ])


    // =========================================================
    // OPEN ROLE CHANGE CONFIRMATION
    // =========================================================

    const openRoleChange = (targetUser) => {

        setError("")

        setSuccessMessage("")

        setSelectedUser(targetUser)
    }


    // =========================================================
    // CLOSE ROLE CHANGE CONFIRMATION
    // =========================================================

    const closeRoleChange = () => {

        if (changingRole) {
            return
        }

        setSelectedUser(null)
    }


    // =========================================================
    // CONFIRM ROLE CHANGE
    // =========================================================

    const confirmRoleChange = async () => {

        if (
            !selectedUser ||
            !accessToken
        ) {
            return
        }


        const newRole =
            selectedUser.role === "customer"
                ? "tour_operator"
                : "customer"


        setChangingRole(true)

        setError("")

        setSuccessMessage("")


        try {

            const data =
                await updateUserRole(
                    selectedUser.id,
                    newRole,
                    accessToken
                )


            // -------------------------------------------------
            // UPDATE THE USER IN THE CURRENT LIST
            // -------------------------------------------------

            const updatedUser =
                data?.user


            setUsers((currentUsers) =>
                currentUsers.map((item) => {

                    if (
                        item.id !== selectedUser.id
                    ) {
                        return item
                    }


                    return {
                        ...item,
                        role:
                            updatedUser?.role ||
                            newRole,
                    }
                })
            )


            // -------------------------------------------------
            // SUCCESS MESSAGE
            // -------------------------------------------------

            setSuccessMessage(
                data?.message ||
                "User role updated successfully."
            )


            // -------------------------------------------------
            // CLOSE MODAL
            // -------------------------------------------------

            setSelectedUser(null)

        } catch (err) {

            console.error(
                "Failed to update user role:",
                err
            )

            setError(
                err?.response?.data?.message ||
                "The user's role could not be updated. Please try again."
            )

        } finally {

            setChangingRole(false)

        }
    }


    // =========================================================
    // ROLE LABEL
    // =========================================================

    const getRoleLabel = (role) => {

        if (role === "tour_operator") {
            return "Tour Operator"
        }

        return "Customer"
    }


    // =========================================================
    // ROLE CHANGE LABEL
    // =========================================================

    const getChangeLabel = (role) => {

        if (role === "customer") {
            return "Change to Tour Operator"
        }

        return "Change to Customer"
    }


    // =========================================================
    // AUTH LOADING
    // =========================================================

    if (authLoading) {

        return (
            <main className="user-management-page">

                <section className="user-management-card">

                    <div className="user-management-loading">

                        <div className="user-management-spinner" />

                        <p>
                            Checking administrator access...
                        </p>

                    </div>

                </section>

            </main>
        )
    }


    // =========================================================
    // AUTHORIZATION
    // =========================================================

    if (
        !isAuthenticated ||
        user?.role !== "admin"
    ) {

        return (
            <main className="user-management-page">

                <section className="user-management-card">

                    <div className="user-management-empty">

                        <span className="user-management-empty-icon">
                            🔒
                        </span>

                        <h2>
                            Administrator access required
                        </h2>

                        <p>
                            You do not have permission to manage
                            user roles.
                        </p>

                    </div>

                </section>

            </main>
        )
    }


    // =========================================================
    // PAGE
    // =========================================================

    return (

        <main className="user-management-page">

            <div className="user-management-container">


                {/* =================================================
                    PAGE HEADER
                ================================================= */}

                <section className="user-management-header">

                    <div>

                        <p className="user-management-eyebrow">
                            THAFARI ADMINISTRATION
                        </p>

                        <h1>
                            User Management
                        </h1>

                        <p className="user-management-intro">
                            Manage customer and tour-operator
                            accounts and change their platform role.
                        </p>

                    </div>


                    <div className="user-management-summary">

                        <span>
                            👥
                        </span>

                        <div>

                            <strong>
                                {users.length}
                            </strong>

                            <small>
                                Manageable users
                            </small>

                        </div>

                    </div>

                </section>


                {/* =================================================
                    SUCCESS MESSAGE
                ================================================= */}

                {successMessage && (

                    <div
                        className="user-management-alert user-management-success"
                        role="status"
                    >

                        <span>
                            ✓
                        </span>

                        <p>
                            {successMessage}
                        </p>

                        <button
                            type="button"
                            onClick={() =>
                                setSuccessMessage("")
                            }
                            aria-label="Dismiss success message"
                        >
                            ×
                        </button>

                    </div>

                )}


                {/* =================================================
                    ERROR MESSAGE
                ================================================= */}

                {error && (

                    <div
                        className="user-management-alert user-management-error"
                        role="alert"
                    >

                        <span>
                            !
                        </span>

                        <p>
                            {error}
                        </p>

                        <button
                            type="button"
                            onClick={() =>
                                setError("")
                            }
                            aria-label="Dismiss error message"
                        >
                            ×
                        </button>

                    </div>

                )}


                {/* =================================================
                    USER LIST
                ================================================= */}

                <section className="user-management-card">

                    <div className="user-management-card-header">

                        <div>

                            <p className="user-management-section-eyebrow">
                                ACCOUNT ROLES
                            </p>

                            <h2>
                                Customers & Tour Operators
                            </h2>

                        </div>

                        <span className="user-management-count">
                            {users.length} users
                        </span>

                    </div>


                    {loading ? (

                        <div className="user-management-loading">

                            <div className="user-management-spinner" />

                            <p>
                                Loading users...
                            </p>

                        </div>

                    ) : users.length === 0 ? (

                        <div className="user-management-empty">

                            <span className="user-management-empty-icon">
                                👥
                            </span>

                            <h3>
                                No users found
                            </h3>

                            <p>
                                There are currently no customers or
                                tour operators to manage.
                            </p>

                        </div>

                    ) : (

                        <div className="user-management-table-wrapper">

                            <table className="user-management-table">

                                <thead>

                                    <tr>

                                        <th>
                                            User
                                        </th>

                                        <th>
                                            Email
                                        </th>

                                        <th>
                                            Role
                                        </th>

                                        <th>
                                            Status
                                        </th>

                                        <th>
                                            Action
                                        </th>

                                    </tr>

                                </thead>


                                <tbody>

                                    {users.map((item) => (

                                        <tr
                                            key={item.id}
                                        >

                                            {/* USER */}

                                            <td>

                                                <div className="user-management-user">

                                                    <div className="user-management-avatar">

                                                        {(
                                                            item.first_name?.charAt(0) ||
                                                            ""
                                                        ).toUpperCase()}

                                                        {(
                                                            item.last_name?.charAt(0) ||
                                                            ""
                                                        ).toUpperCase()}

                                                    </div>


                                                    <div>

                                                        <strong>
                                                            {item.first_name}{" "}
                                                            {item.last_name}
                                                        </strong>

                                                        <span>
                                                            @{item.username}
                                                        </span>

                                                    </div>

                                                </div>

                                            </td>


                                            {/* EMAIL */}

                                            <td>

                                                <span className="user-management-email">
                                                    {item.email}
                                                </span>

                                            </td>


                                            {/* ROLE */}

                                            <td>

                                                <span
                                                    className={
                                                        item.role ===
                                                        "tour_operator"
                                                            ? "user-management-role operator"
                                                            : "user-management-role customer"
                                                    }
                                                >

                                                    {item.role ===
                                                    "tour_operator"
                                                        ? "🏕️"
                                                        : "👤"}

                                                    {getRoleLabel(
                                                        item.role
                                                    )}

                                                </span>

                                            </td>


                                            {/* STATUS */}

                                            <td>

                                                <div className="user-management-status">

                                                    <span
                                                        className={
                                                            item.is_active
                                                                ? "status-dot active"
                                                                : "status-dot inactive"
                                                        }
                                                    />

                                                    <span>
                                                        {item.is_active
                                                            ? "Active"
                                                            : "Inactive"}
                                                    </span>


                                                    {item.is_verified && (

                                                        <span
                                                            className="user-management-verified"
                                                            title="Verified account"
                                                        >
                                                            ✓
                                                        </span>

                                                    )}

                                                </div>

                                            </td>


                                            {/* ACTION */}

                                            <td>

                                                <button
                                                    type="button"
                                                    className="user-management-role-button"
                                                    onClick={() =>
                                                        openRoleChange(
                                                            item
                                                        )
                                                    }
                                                >
                                                    {getChangeLabel(
                                                        item.role
                                                    )}
                                                </button>

                                            </td>

                                        </tr>

                                    ))}

                                </tbody>

                            </table>

                        </div>

                    )}

                </section>


                {/* =================================================
                    INFORMATION
                ================================================= */}

                <section className="user-management-info">

                    <div className="user-management-info-icon">
                        ℹ️
                    </div>

                    <div>

                        <strong>
                            About role changes
                        </strong>

                        <p>
                            Changing a customer to a tour operator
                            gives them access to tour-management
                            features. Changing a tour operator back
                            to a customer removes those operator
                            permissions.
                        </p>

                    </div>

                </section>

            </div>


            {/* =====================================================
                ROLE CHANGE CONFIRMATION MODAL
            ===================================================== */}

            {selectedUser && (

                <div
                    className="user-management-modal-backdrop"
                    onMouseDown={(event) => {

                        if (
                            event.target ===
                            event.currentTarget
                        ) {
                            closeRoleChange()
                        }

                    }}
                >

                    <div
                        className="user-management-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="role-change-title"
                    >

                        <div className="user-management-modal-icon">
                            🔄
                        </div>


                        <h2 id="role-change-title">
                            Change User Role?
                        </h2>


                        <p>

                            You are about to change{" "}

                            <strong>
                                {selectedUser.first_name}{" "}
                                {selectedUser.last_name}
                            </strong>

                            {" "}from{" "}

                            <strong>
                                {getRoleLabel(
                                    selectedUser.role
                                )}
                            </strong>

                            {" "}to{" "}

                            <strong>
                                {getRoleLabel(
                                    selectedUser.role ===
                                    "customer"
                                        ? "tour_operator"
                                        : "customer"
                                )}
                            </strong>.

                        </p>


                        <div className="user-management-modal-warning">

                            <span>
                                ⚠️
                            </span>

                            <p>
                                This will change the permissions
                                available to this account.
                            </p>

                        </div>


                        <div className="user-management-modal-actions">

                            <button
                                type="button"
                                className="user-management-cancel-button"
                                onClick={closeRoleChange}
                                disabled={changingRole}
                            >
                                Cancel
                            </button>


                            <button
                                type="button"
                                className="user-management-confirm-button"
                                onClick={confirmRoleChange}
                                disabled={changingRole}
                            >

                                {changingRole ? (
                                    <>
                                        <span className="user-management-button-spinner" />
                                        Updating...
                                    </>
                                ) : (
                                    "Confirm Change"
                                )}

                            </button>

                        </div>

                    </div>

                </div>

            )}

        </main>
    )
}


export default UserManagement
