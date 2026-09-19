import React, { useState, useEffect } from 'react';
import { UserPlus, Edit2, Trash2, Shield, UserX, UserCheck, User, Lock, UserCog, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import axios from 'axios';

const ManageUsers = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // Modal & Form States
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentUserId, setCurrentUserId] = useState(null);

    // Mobile expanded card tracking
    const [expandedCards, setExpandedCards] = useState({});

    const [formData, setFormData] = useState({
        username: '',
        password: '',
        role: 'Regular Staff'
    });

    const loggedInUsername = localStorage.getItem('uf_username') || '';
    const loggedInRole = localStorage.getItem('uf_role') || '';

    // Dynamic Base URL handler for seamless local, mobile Wi-Fi, and production deployment usage
    const getBaseUrl = () => {
        if (import.meta.env.VITE_API_URL) {
            return import.meta.env.VITE_API_URL;
        }
        const hostname = window.location.hostname;
        return hostname === 'localhost' || hostname === '127.0.0.1' 
            ? 'http://localhost:5000' 
            : `http://${hostname}:5000`;
    };

    const API = axios.create({
        baseURL: getBaseUrl()
    });

    const getHeaders = () => ({
        'Content-Type': 'application/json',
        'x-username': loggedInUsername,
        'x-role': loggedInRole
    });

    // Helper function to capitalize names properly (Title Case)
    const toProperCase = (str) => {
        if (!str) return '';
        return str
            .toLowerCase()
            .split(' ')
            .filter(word => word.length > 0)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    const fetchUsers = async () => {
        try {
            setLoading(true);
            setError('');

            const response = await API.get('/api/users', {
                headers: getHeaders()
            });

            const data = response.data.users || response.data;
            if (response.status === 200) {
                setUsers(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            console.error('Failed to fetch system users:', err);
            setError(err.response?.data?.message || 'Unable to connect to the server. Please check your network connection.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleOpenAddModal = () => {
        setIsEditing(false);
        setFormData({ username: '', password: '', role: 'Regular Staff' });
        setCurrentUserId(null);
        setError('');
        setSuccessMessage('');
        setShowModal(true);
    };

    const handleOpenEditModal = (user) => {
        setIsEditing(true);
        setCurrentUserId(user._id);
        setFormData({
            username: user.username,
            password: '',
            role: user.role
        });
        setError('');
        setSuccessMessage('');
        setShowModal(true);
    };

    const handleSaveUser = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');

        const formattedPayload = {
            ...formData,
            username: toProperCase(formData.username.trim())
        };

        // If editing and password is blank, remove it from payload so backend doesn't overwrite with empty hash
        if (isEditing && !formattedPayload.password) {
            delete formattedPayload.password;
        }

        try {
            if (isEditing) {
                await API.put(`/api/users/${currentUserId}`, formattedPayload, { headers: getHeaders() });
                setSuccessMessage('User updated successfully!');
            } else {
                await API.post('/api/users', formattedPayload, { headers: getHeaders() });
                setSuccessMessage('User created successfully!');
            }

            setShowModal(false);
            fetchUsers();
        } catch (err) {
            console.error('User save operation error:', err);
            setError(err.response?.data?.message || err.message || 'Operation failed.');
        }
    };

    const handleToggleStatus = async (user) => {
        try {
            const response = await API.patch(`/api/users/${user._id}/status`, { 
                isActive: !user.isActive 
            }, { 
                headers: getHeaders() 
            });

            if (response.status === 200) {
                fetchUsers();
            }
        } catch (err) {
            console.error('Status toggle error:', err);
            setError(err.response?.data?.message || 'Failed to update user status.');
        }
    };

    const handleDeleteUser = async (id, username) => {
        if (!window.confirm(`Are you sure you want to delete user "${username}"?`)) return;

        try {
            const response = await API.delete(`/api/users/${id}`, {
                headers: getHeaders()
            });

            if (response.status === 200) {
                fetchUsers();
            }
        } catch (err) {
            console.error('Delete user error:', err);
            setError(err.response?.data?.message || 'Failed to delete user.');
        }
    };

    const toggleCardExpand = (id) => {
        setExpandedCards(prev => ({ ...prev, [id]: !prev[id] }));
    };

    // Filter users: Hide Master Admin from anyone who isn't a Master Admin themselves
    const filteredUsers = users.filter(u => {
        if (loggedInRole !== 'Master Admin') {
            return u.role !== 'Master Admin';
        }
        return true;
    });

    return (
        <div className="container py-4" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
            {/* Header Section */}
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4 pb-3 border-bottom border-secondary border-opacity-25">
                <div>
                    <h2 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
                        <UserCog className="text-secondary" size={28} /> Manage Users Dashboard
                    </h2>
                    <p className="text-muted small mb-0">Configure system access credentials, user roles, and active account statuses.</p>
                </div>
                <button
                    className="btn text-white d-flex align-items-center justify-content-center gap-2 shadow-sm px-3 py-2 rounded-3"
                    style={{ backgroundColor: '#343a40', transition: 'background-color 0.2s' }}
                    onClick={handleOpenAddModal}
                >
                    <UserPlus size={18} /> Add User
                </button>
            </div>

            {/* Dismissible Global Alerts */}
            {!showModal && error && (
                <div className="alert alert-danger py-2 small shadow-sm d-flex justify-content-between align-items-center mb-3">
                    <span className="d-flex align-items-center gap-2">
                        <AlertCircle size={16} /> {error}
                    </span>
                    <button type="button" className="btn-close btn-sm" onClick={() => setError('')}></button>
                </div>
            )}
            {!showModal && successMessage && (
                <div className="alert alert-success py-2 small shadow-sm d-flex justify-content-between align-items-center mb-3">
                    <span>{successMessage}</span>
                    <button type="button" className="btn-close btn-sm" onClick={() => setSuccessMessage('')}></button>
                </div>
            )}

            {/* Current Logged-In User Details Banner */}
            <div className="card border-0 shadow-sm mb-4 rounded-4" style={{ backgroundColor: '#e9ecef' }}>
                <div className="card-body d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 py-3">
                    <div className="d-flex align-items-center gap-3">
                        <div className="bg-secondary text-white p-3 rounded-circle d-flex align-items-center justify-content-center shadow-sm" style={{ width: '48px', height: '48px', minWidth: '48px' }}>
                            <Shield size={22} />
                        </div>
                        <div>
                            <h6 className="mb-0 fw-bold text-dark" style={{ textTransform: 'capitalize' }}>Current Session User: {loggedInUsername}</h6>
                            <span className="badge bg-secondary text-light mt-1 px-2 py-1">Role: {loggedInRole}</span>
                        </div>
                    </div>
                    <div className="text-muted small bg-white px-3 py-2 rounded-pill shadow-sm border border-secondary border-opacity-10 align-self-start align-self-md-auto">
                        Permissions Mode: <span className="fw-semibold text-secondary">Header Auth Active</span>
                    </div>
                </div>
            </div>

            {/* Users Display: Desktop Table vs Mobile Cards */}
            {loading ? (
                <div className="text-center py-5">
                    <div className="spinner-border spinner-border-sm text-secondary me-2" role="status"></div>
                    <span className="text-muted">Loading system users...</span>
                </div>
            ) : (
                <>
                    {/* Desktop Table View */}
                    <div className="d-none d-md-block card border-0 shadow-sm rounded-4 overflow-hidden bg-white">
                        <div className="card-body p-0">
                            <div className="table-responsive">
                                <table className="table table-hover align-middle mb-0">
                                    <thead className="text-uppercase text-white small" style={{ backgroundColor: '#495057' }}>
                                        <tr>
                                            <th className="py-3 ps-4">Username</th>
                                            <th className="py-3">Role</th>
                                            <th className="py-3">Status</th>
                                            <th className="py-3 text-end pe-4">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredUsers.map((u) => (
                                            <tr key={u._id} style={{ borderBottomColor: '#f1f3f5' }}>
                                                <td className="ps-4 fw-semibold text-dark d-flex align-items-center gap-2 pt-3" style={{ textTransform: 'capitalize' }}>
                                                    <User size={16} className="text-muted" /> {u.username}
                                                </td>
                                                <td>
                                                    <span className={`badge px-2 py-1 ${u.role === 'Master Admin' ? 'bg-dark text-white' : u.role === 'Admin' ? 'bg-secondary text-white' : 'bg-light text-dark border border-secondary border-opacity-25'}`}>
                                                        {u.role}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className={`badge ${u.isActive !== false ? 'bg-success bg-opacity-10 text-success border border-success border-opacity-25' : 'bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25'} px-2 py-1`}>
                                                        {u.isActive !== false ? 'Active' : 'Disabled'}
                                                    </span>
                                                </td>
                                                <td className="text-end pe-4">
                                                    <div className="btn-group gap-1" role="group">
                                                        <button
                                                            className="btn btn-outline-secondary btn-sm rounded-2"
                                                            title="Edit User"
                                                            onClick={() => handleOpenEditModal(u)}
                                                        >
                                                            <Edit2 size={14} />
                                                        </button>
                                                        <button
                                                            className={`btn btn-outline-${u.isActive !== false ? 'warning' : 'success'} btn-sm rounded-2`}
                                                            title={u.isActive !== false ? 'Disable User' : 'Enable User'}
                                                            onClick={() => handleToggleStatus(u)}
                                                        >
                                                            {u.isActive !== false ? <UserX size={14} /> : <UserCheck size={14} />}
                                                        </button>
                                                        <button
                                                            className="btn btn-outline-danger btn-sm rounded-2"
                                                            title="Delete User"
                                                            onClick={() => handleDeleteUser(u._id, u.username)}
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {filteredUsers.length === 0 && (
                                            <tr>
                                                <td colSpan="4" className="text-center py-5 text-muted">No system users found.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Mobile Accordion Card View */}
                    <div className="d-block d-md-none">
                        <div className="d-flex flex-column gap-3">
                            {filteredUsers.map((u) => {
                                const isExpanded = !!expandedCards[u._id];
                                return (
                                    <div key={u._id} className="card border-0 shadow-sm rounded-4 bg-white p-3">
                                        <div className="d-flex align-items-center justify-content-between">
                                            <div className="d-flex align-items-center gap-2">
                                                <User size={16} className="text-muted" />
                                                <span className="fw-bold text-dark" style={{ textTransform: 'capitalize' }}>{u.username}</span>
                                                <span className={`badge px-2 py-1 ms-1 ${u.isActive !== false ? 'bg-success bg-opacity-10 text-success border border-success border-opacity-25' : 'bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25'}`}>
                                                    {u.isActive !== false ? 'Active' : 'Disabled'}
                                                </span>
                                            </div>
                                            <button
                                                className="btn btn-sm btn-light border rounded-circle p-1 d-flex align-items-center justify-content-center shadow-sm"
                                                style={{ width: '32px', height: '32px' }}
                                                onClick={() => toggleCardExpand(u._id)}
                                                aria-label="Toggle details"
                                            >
                                                {isExpanded ? <ChevronUp size={16} className="text-secondary" /> : <ChevronDown size={16} className="text-secondary" />}
                                            </button>
                                        </div>

                                        {isExpanded && (
                                            <div className="mt-3 pt-3 border-top border-light d-flex flex-column gap-2 small">
                                                <div className="d-flex justify-content-between align-items-center">
                                                    <span className="text-muted">Role:</span>
                                                    <span className={`badge px-2 py-1 ${u.role === 'Master Admin' ? 'bg-dark text-white' : u.role === 'Admin' ? 'bg-secondary text-white' : 'bg-light text-dark border border-secondary border-opacity-25'}`}>
                                                        {u.role}
                                                    </span>
                                                </div>
                                                <div className="d-flex justify-content-between align-items-center pt-2">
                                                    <span className="text-muted">Actions:</span>
                                                    <div className="btn-group gap-1" role="group">
                                                        <button
                                                            className="btn btn-outline-secondary btn-sm rounded-2 px-2"
                                                            title="Edit User"
                                                            onClick={() => handleOpenEditModal(u)}
                                                        >
                                                            <Edit2 size={14} />
                                                        </button>
                                                        <button
                                                            className={`btn btn-outline-${u.isActive !== false ? 'warning' : 'success'} btn-sm rounded-2 px-2`}
                                                            title={u.isActive !== false ? 'Disable User' : 'Enable User'}
                                                            onClick={() => handleToggleStatus(u)}
                                                        >
                                                            {u.isActive !== false ? <UserX size={14} /> : <UserCheck size={14} />}
                                                        </button>
                                                        <button
                                                            className="btn btn-outline-danger btn-sm rounded-2 px-2"
                                                            title="Delete User"
                                                            onClick={() => handleDeleteUser(u._id, u.username)}
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            {filteredUsers.length === 0 && (
                                <div className="text-center py-5 text-muted bg-white rounded-4 shadow-sm">No system users found.</div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* Add / Edit User Modal */}
            {showModal && (
                <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(33, 37, 41, 0.6)', zIndex: 1050 }}>
                    <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable px-3">
                        <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
                            <div className="modal-header px-4 py-3 text-white" style={{ backgroundColor: '#343a40' }}>
                                <h5 className="modal-title fw-bold d-flex align-items-center gap-2">
                                    <UserCog size={20} /> {isEditing ? 'Edit User Credentials' : 'Add New User'}
                                </h5>
                                <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
                            </div>
                            <form onSubmit={handleSaveUser}>
                                <div className="modal-body p-4 bg-light">
                                    {error && (
                                        <div className="alert alert-danger py-2 small mb-3 d-flex align-items-center gap-2">
                                            <AlertCircle size={16} /> {error}
                                        </div>
                                    )}

                                    <div className="mb-3">
                                        <label className="form-label small fw-semibold text-secondary d-flex align-items-center gap-1">
                                            <User size={15} /> Username
                                        </label>
                                        <input
                                            type="text"
                                            name="username"
                                            className="form-control rounded-3 border-secondary border-opacity-25 shadow-sm"
                                            value={formData.username}
                                            onChange={handleChange}
                                            onBlur={(e) => setFormData({ ...formData, username: toProperCase(e.target.value) })}
                                            required
                                            placeholder="Enter username"
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label small fw-semibold text-secondary d-flex align-items-center gap-1">
                                            <Lock size={15} /> Password {isEditing && <span className="text-muted fw-normal small">(Leave blank to keep unchanged)</span>}
                                        </label>
                                        <input
                                            type="password"
                                            name="password"
                                            className="form-control rounded-3 border-secondary border-opacity-25 shadow-sm"
                                            value={formData.password}
                                            onChange={handleChange}
                                            required={!isEditing}
                                            placeholder="Enter password"
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label small fw-semibold text-secondary d-flex align-items-center gap-1">
                                            <Shield size={15} /> Role Assignment
                                        </label>
                                        <select
                                            name="role"
                                            className="form-select rounded-3 border-secondary border-opacity-25 shadow-sm"
                                            value={formData.role}
                                            onChange={handleChange}
                                        >
                                            <option value="Admin">Admin</option>
                                            <option value="Manager">Manager</option>
                                            <option value="Office Staff">Office Staff</option>
                                            <option value="Accountant">Accountant</option>
                                            <option value="Regular Staff">Regular Staff</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="modal-footer border-top border-secondary border-opacity-10 px-4 py-3 bg-white rounded-bottom-4">
                                    <button type="button" className="btn btn-outline-secondary btn-sm px-3 rounded-3" onClick={() => setShowModal(false)}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn text-white btn-sm px-4 rounded-3" style={{ backgroundColor: '#343a40' }}>
                                        {isEditing ? 'Save Changes' : 'Create User'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManageUsers;