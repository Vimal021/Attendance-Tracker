import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Phone, IndianRupee, Calendar, Edit2, Trash2, CheckCircle, AlertTriangle } from 'lucide-react';
import axios from 'axios';

const ManageEmployees = () => {
    const [employees, setEmployees] = useState([]);
    const [name, setName] = useState('');
    const [mobileNumber, setMobileNumber] = useState('');
    const [salary, setSalary] = useState('');
    const [weeklyHoliday, setWeeklyHoliday] = useState('Sunday');
    const [editingId, setEditingId] = useState(null);
    const [expandedId, setExpandedId] = useState(null);
    const [showModal, setShowModal] = useState(false);

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
        'x-username': localStorage.getItem('uf_username') || '',
        'x-role': localStorage.getItem('uf_role') || ''
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

    const fetchEmployees = async () => {
        try {
            const res = await API.get('/api/employees?includeLeaved=true', {
                headers: getHeaders()
            });
            const data = res.data.employees || res.data;
            if (res.status === 200) {
                setEmployees(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            console.error('Failed to fetch employees directory', err);
        }
    };

    useEffect(() => { 
        fetchEmployees(); 
    }, []);

    const clearForm = () => {
        setName('');
        setMobileNumber('');
        setSalary('');
        setWeeklyHoliday('Sunday');
        setEditingId(null);
        setShowModal(false);
    };

    const openAddModal = () => {
        clearForm();
        setShowModal(true);
    };

    const initiateEdit = (emp) => {
        setEditingId(emp._id);
        setName(emp.name);
        setMobileNumber(emp.mobileNumber);
        setSalary(emp.salary);
        setWeeklyHoliday(emp.weeklyHoliday);
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation for Mobile Number (Strictly 10 digits)
        const mobileRegex = /^[0-9]{10}$/;
        if (!mobileRegex.test(mobileNumber.trim())) {
            alert('❌ Please enter a valid 10-digit mobile number.');
            return;
        }

        // Validation for Salary (Must be greater than 0)
        const parsedSalary = Number(salary);
        if (isNaN(parsedSalary) || parsedSalary <= 0) {
            alert('❌ Please enter a valid base monthly salary greater than 0.');
            return;
        }

        const payload = {
            name: toProperCase(name.trim()),
            mobileNumber: mobileNumber.trim(),
            salary: parsedSalary,
            weeklyHoliday
        };

        try {
            if (editingId) {
                await API.put(`/api/employees/${editingId}`, payload, { headers: getHeaders() });
            } else {
                await API.post('/api/employees', payload, { headers: getHeaders() });
            }

            clearForm();
            fetchEmployees();
        } catch (err) {
            console.error('Employee save operation error:', err);
            alert(err.response?.data?.message || err.response?.data?.error || 'Error processing employee profile operation');
        }
    };

    const toggleSoftDeleteStatus = async (emp) => {
        const updatedStatus = emp.status === 'Active' ? 'Leaved' : 'Active';
        try {
            const res = await API.put(`/api/employees/${emp._id}`, { status: updatedStatus }, { headers: getHeaders() });
            if (res.status !== 200) throw new Error('Status configuration transaction failed');
            fetchEmployees();
        } catch (err) {
            console.error('Status toggle error:', err);
            alert(err.response?.data?.message || err.message);
        }
    };

    const triggerHardDelete = async (id) => {
        const verify = window.confirm('⚠️ WARNING: Wiping out this profile deletes all historical attendance records, monthly hours, and advance statements out of the system entirely. Are you sure you want to proceed?');
        if (!verify) return;

        try {
            const res = await API.delete(`/api/employees/${id}`, { headers: getHeaders() });
            if (res.status !== 200) throw new Error('Database cascade deletion rejected');
            fetchEmployees();
        } catch (err) {
            console.error('Hard delete error:', err);
            alert(err.response?.data?.message || err.message);
        }
    };

    return (
        <div className="container py-3">
            {/* Header Section */}
            <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
                <div>
                    <h3 className="fw-bold text-dark mb-0"><Users className="me-2" size={28} /> Factory Floor Directory</h3>
                    <p className="text-muted small mb-0">Manage active employees, base wages, and weekly scheduled holidays.</p>
                </div>
                <button className="btn btn-dark fw-bold shadow-sm" onClick={openAddModal}>
                    <UserPlus size={18} className="me-2" /> Add New Employee
                </button>
            </div>

            {/* Employee List Directory */}
            <div className="card shadow-sm border-0 p-3 bg-white">
                <div className="list-group list-group-flush">
                    {employees.length === 0 ? (
                        <div className="text-center py-4 text-muted">No employee profiles registered yet. Tap "Add New Employee" to start.</div>
                    ) : (
                        employees.map((emp) => {
                            const isLeaved = emp.status === 'Leaved';
                            const isExpanded = expandedId === emp._id;
                            const currentBalanceValue = emp.currentBalance || 0;

                            return (
                                <div key={emp._id} className={`list-group-item p-3 mb-2 rounded border shadow-sm ${isLeaved ? 'bg-light opacity-75' : 'bg-white'}`}>
                                    <div className="d-flex justify-content-between align-items-center" onClick={() => setExpandedId(isExpanded ? null : emp._id)} style={{ cursor: 'pointer' }}>
                                        <div>
                                            <span className="fw-bold text-dark fs-5">{emp.name}</span>
                                            {isLeaved ? (
                                                <span className="badge bg-secondary ms-2 small">Status: Leaved</span>
                                            ) : (
                                                <span className="badge bg-success ms-2 small">Active</span>
                                            )}
                                        </div>
                                        <span className="small text-primary fw-semibold">{isExpanded ? '🔼 Hide Details' : '🔽 View Details'}</span>
                                    </div>

                                    {isExpanded && (
                                        <div className="mt-3 pt-3 border-top border-secondary border-opacity-10 bg-light p-3 rounded">
                                            <div className="row g-3 text-dark small mb-3">
                                                <div className="col-6 col-md-3">
                                                    <span className="text-muted d-block">Mobile Number</span>
                                                    <Phone size={14} className="me-1 text-secondary" /> {emp.mobileNumber}
                                                </div>
                                                <div className="col-6 col-md-3">
                                                    <span className="text-muted d-block">Base Monthly Salary</span>
                                                    <IndianRupee size={14} className="me-1 text-success" /> {emp.salary?.toLocaleString()}
                                                </div>
                                                <div className="col-6 col-md-3">
                                                    <span className="text-muted d-block">Scheduled Day Off</span>
                                                    <Calendar size={14} className="me-1 text-primary" /> {emp.weeklyHoliday}
                                                </div>
                                                <div className="col-6 col-md-3">
                                                    <span className="text-muted d-block">Live Ledger Balance</span>
                                                    <span className={currentBalanceValue >= 0 ? 'text-danger fw-bold fs-6' : 'text-success fw-bold fs-6'}>
                                                        ₹{Math.abs(currentBalanceValue).toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="d-flex gap-2 flex-wrap pt-2 border-top">
                                                <button className="btn btn-sm btn-outline-dark fw-bold" onClick={() => initiateEdit(emp)}>
                                                    <Edit2 size={14} className="me-1" /> Modify Settings
                                                </button>
                                                <button className={`btn btn-sm fw-bold ${isLeaved ? 'btn-outline-success' : 'btn-outline-warning text-dark'}`} onClick={() => toggleSoftDeleteStatus(emp)}>
                                                    {isLeaved ? <><CheckCircle size={14} className="me-1" /> Restore Status</> : <><AlertTriangle size={14} className="me-1" /> Mark as Leaved</>}
                                                </button>
                                                {localStorage.getItem('uf_role') === 'Master Admin' && (
                                                    <button className="btn btn-sm btn-danger fw-bold ms-auto" onClick={() => triggerHardDelete(emp._id)}>
                                                        <Trash2 size={14} className="me-1" /> Delete Profile
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Modal Popup for Add / Edit Employee */}
            {showModal && (
                <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 shadow-lg">
                            <div className="modal-header bg-dark text-white">
                                <h5 className="modal-title fw-bold">
                                    {editingId ? '✍️ Modify Employee Profile' : '➕ Register New Employee'}
                                </h5>
                                <button type="button" className="btn-close btn-close-white" onClick={clearForm}></button>
                            </div>
                            <form onSubmit={handleSubmit}>
                                <div className="modal-body p-4">
                                    <div className="mb-3">
                                        <label className="small fw-bold text-muted">Employee Name</label>
                                        <input 
                                            type="text" 
                                            className="form-control" 
                                            value={name} 
                                            onChange={(e) => setName(e.target.value)} 
                                            onBlur={(e) => setName(toProperCase(e.target.value))}
                                            placeholder="e.g. Smitbhai" 
                                            required 
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="small fw-bold text-muted">Mobile Number (10 Digits)</label>
                                        <input type="tel" maxLength="10" className="form-control" value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ''))} placeholder="e.g. 9876543210" required />
                                    </div>
                                    <div className="mb-3">
                                        <label className="small fw-bold text-muted">Base Monthly Salary (₹)</label>
                                        <input type="number" min="1" className="form-control" value={salary} onChange={(e) => setSalary(e.target.value)} placeholder="e.g. 12000" required />
                                    </div>
                                    <div className="mb-3">
                                        <label className="small fw-bold text-muted">Scheduled Day Off (Weekly Holiday)</label>
                                        <select className="form-select" value={weeklyHoliday} onChange={(e) => setWeeklyHoliday(e.target.value)}>
                                            {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((d) => (
                                                <option key={d} value={d}>{d}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="modal-footer bg-light px-4 py-3">
                                    <button type="button" className="btn btn-outline-secondary btn-sm px-3 fw-bold" onClick={clearForm}>Cancel</button>
                                    <button type="submit" className="btn btn-dark btn-sm px-4 fw-bold text-uppercase">
                                        {editingId ? 'Save Changes' : 'Register Employee'}
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

export default ManageEmployees;