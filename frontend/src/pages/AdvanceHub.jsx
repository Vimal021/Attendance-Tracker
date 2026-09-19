import React, { useState, useEffect } from 'react';
import { Wallet, User, AlertCircle, PlusCircle, MinusCircle, ArrowDownLeft, ArrowUpRight, Edit3, Trash2, TrendingUp } from 'lucide-react';
import axios from 'axios';

const AdvanceHub = () => {
    const [employees, setEmployees] = useState([]);
    const [selectedEmployee, setSelectedEmployee] = useState('');
    const [employeeBalance, setEmployeeBalance] = useState(0);
    
    // Form toggle states
    const [showDistributeModal, setShowDistributeModal] = useState(false);
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);

    // Distribute Form States
    const [distributeAmount, setDistributeAmount] = useState('');
    const [distributeDate, setDistributeDate] = useState(new Date().toISOString().split('T')[0]);
    const [distributeGivenBy, setDistributeGivenBy] = useState('');

    // Return Form States
    const [returnAmount, setReturnAmount] = useState('');
    const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);
    const [returnReceivedBy, setReturnReceivedBy] = useState('');

    // Edit Form States
    const [editId, setEditId] = useState(null);
    const [editAmount, setEditAmount] = useState('');
    const [editDate, setEditDate] = useState('');
    const [editGivenBy, setEditGivenBy] = useState('');
    const [editType, setEditType] = useState('advance');

    const [recentAdvances, setRecentAdvances] = useState([]);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const loggedInUsername = localStorage.getItem('uf_username') || 'Admin';
    const loggedInRole = localStorage.getItem('uf_role');

    // Dynamic Base URL handler for seamless local, mobile Wi-Fi, and production deployment usage
    const getBaseUrl = () => {
        if (import.meta.env.VITE_API_URL) {
            return import.meta.env.VITE_API_URL;
        }
        const hostname = window.location.hostname;
        return hostname === 'localhost' ? 'http://localhost:5000' : `http://${hostname}:5000`;
    };

    const API = axios.create({
        baseURL: getBaseUrl()
    });

    const getHeaders = () => ({
        'x-username': loggedInUsername,
        'x-role': loggedInRole
    });

    const toProperCase = (str) => {
        if (!str) return '';
        return str.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    };

    const fetchEmployees = async () => {
        try {
            const res = await API.get('/api/employees?includeLeaved=false', {
                headers: getHeaders()
            });
            const data = res.data.employees || res.data;
            const activeEmps = Array.isArray(data) ? data : [];
            
            setEmployees(activeEmps);
            if (activeEmps.length > 0 && !selectedEmployee) {
                setSelectedEmployee(activeEmps[0]._id);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch employees');
        }
    };

    const fetchAdvances = async (isBackground = false) => {
        if (!selectedEmployee) return;
        try {
            const today = new Date();
            const statementRes = await API.get(`/api/salary/statement?employeeId=${selectedEmployee}&month=${today.getMonth() + 1}&year=${today.getFullYear()}`, {
                headers: getHeaders()
            });
            
            if (statementRes.status === 200) {
                const stmtData = statementRes.data;
                setRecentAdvances(stmtData.advances || []);
                setEmployeeBalance(stmtData.employee?.currentBalance || 0);
            } else {
                setRecentAdvances([]);
            }
        } catch (err) {
            console.error('Failed to fetch advance logs', err);
        }
    };

    // Initial load & Tab visibility sync (zero free-tier waste, instantly syncs when switching devices/tabs)
    useEffect(() => {
        fetchEmployees();
    }, []);

    useEffect(() => {
        if (selectedEmployee) {
            fetchAdvances();
        }

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && selectedEmployee) {
                fetchAdvances(true);
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [selectedEmployee]);

    const totalCurrentAdvances = recentAdvances.reduce((acc, curr) => acc + curr.amount, 0);

    const handleDistributeSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');

        if (!distributeAmount || Number(distributeAmount) <= 0) {
            setError('Enter a valid numerical amount');
            return;
        }

        try {
            setLoading(true);
            await API.post('/api/salary/advance', { 
                employeeId: selectedEmployee, 
                amount: Number(distributeAmount), 
                date: distributeDate,
                givenBy: distributeGivenBy ? toProperCase(distributeGivenBy) : toProperCase(loggedInUsername),
                type: 'advance'
            }, { headers: getHeaders() });

            setDistributeAmount('');
            setDistributeGivenBy('');
            setShowDistributeModal(false);
            setSuccessMessage('Advance cash distribution logged successfully.');
            fetchAdvances();
        } catch (err) {
            setError(err.response?.data?.message || 'Transaction submission error');
        } finally {
            setLoading(false);
        }
    };

    const handleReturnSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');

        if (!returnAmount || Number(returnAmount) <= 0) {
            setError('Enter a valid numerical return amount');
            return;
        }

        try {
            setLoading(true);
            await API.post('/api/salary/advance', { 
                employeeId: selectedEmployee, 
                amount: Number(returnAmount), 
                date: returnDate,
                givenBy: returnReceivedBy ? toProperCase(returnReceivedBy) : toProperCase(loggedInUsername),
                type: 'return'
            }, { headers: getHeaders() });

            setReturnAmount('');
            setReturnReceivedBy('');
            setShowReturnModal(false);
            setSuccessMessage('Advance return logged successfully.');
            fetchAdvances();
        } catch (err) {
            setError(err.response?.data?.message || 'Return transaction submission error');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenEditModal = (item) => {
        setEditId(item._id);
        setEditAmount(Math.abs(item.amount));
        setEditDate(item.date);
        setEditGivenBy(item.givenBy || '');
        setEditType(item.type || (item.amount < 0 ? 'return' : 'advance'));
        setShowEditModal(true);
        setError('');
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');

        if (!editAmount || Number(editAmount) <= 0) {
            setError('Enter a valid numerical amount');
            return;
        }

        try {
            setLoading(true);
            await API.put(`/api/salary/advance/${editId}`, {
                amount: Number(editAmount),
                date: editDate,
                givenBy: editGivenBy ? toProperCase(editGivenBy) : toProperCase(loggedInUsername),
                type: editType
            }, { headers: getHeaders() });

            setShowEditModal(false);
            setSuccessMessage('Advance transaction updated successfully.');
            fetchAdvances();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update transaction entry');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteEntry = async (id) => {
        const confirmed = window.confirm('Are you sure you want to delete this advance/return entry? This action cannot be undone.');
        if (!confirmed) return;

        setError('');
        setSuccessMessage('');

        try {
            setLoading(true);
            await API.delete(`/api/salary/advance/${id}`, { headers: getHeaders() });

            setSuccessMessage('Transaction entry cleared out successfully.');
            fetchAdvances();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to delete transaction record');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container py-4" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
            {/* Header Section */}
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4 pb-3 border-bottom border-secondary border-opacity-25">
                <div>
                    <h2 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
                        <Wallet className="text-secondary" size={28} /> Advance Distribution Hub
                    </h2>
                    <p className="text-muted small mb-0">Record and manage cash advances distributed and returned by factory floor personnel.</p>
                </div>
                {/* Desktop Action Buttons */}
                <div className="d-none d-md-flex align-items-center gap-2">
                    <button
                        className="btn text-white d-flex align-items-center gap-2 shadow-sm px-3 py-2 rounded-3"
                        style={{ backgroundColor: '#dc3545' }}
                        onClick={() => { setShowDistributeModal(true); setShowReturnModal(false); setShowEditModal(false); setError(''); }}
                    >
                        <PlusCircle size={18} /> Advance
                    </button>
                    <button
                        className="btn text-white d-flex align-items-center gap-2 shadow-sm px-3 py-2 rounded-3"
                        style={{ backgroundColor: '#198754' }}
                        onClick={() => { setShowReturnModal(true); setShowDistributeModal(false); setShowEditModal(false); setError(''); }}
                    >
                        <MinusCircle size={18} /> Return Advance
                    </button>
                </div>
            </div>

            {/* Global Alerts */}
            {error && !showDistributeModal && !showReturnModal && !showEditModal && (
                <div className="alert alert-danger py-2 small shadow-sm d-flex justify-content-between align-items-center mb-3">
                    <span className="d-flex align-items-center gap-2"><AlertCircle size={16} /> {error}</span>
                    <button type="button" className="btn-close btn-sm" onClick={() => setError('')}></button>
                </div>
            )}
            {successMessage && (
                <div className="alert alert-success py-2 small shadow-sm d-flex justify-content-between align-items-center mb-3">
                    <span>{successMessage}</span>
                    <button type="button" className="btn-close btn-sm" onClick={() => setSuccessMessage('')}></button>
                </div>
            )}

            {/* Employee Selector Bar & Current Balance Card */}
            <div className="row g-3 mb-4">
                <div className="col-lg-8">
                    <div className="card border-0 shadow-sm rounded-4 bg-white h-100">
                        <div className="card-body py-3">
                            <div className="d-flex align-items-center gap-3 mb-3 mb-md-0">
                                <div className="bg-secondary text-white p-2 rounded-circle d-flex align-items-center justify-content-center shadow-sm" style={{ width: '40px', height: '40px', minWidth: '40px' }}>
                                    <User size={20} />
                                </div>
                                <div className="flex-grow-1">
                                    <label className="form-label small fw-semibold text-muted mb-1">Select Employee Profile</label>
                                    <select 
                                        className="form-select rounded-3 border-secondary border-opacity-25 shadow-sm" 
                                        value={selectedEmployee} 
                                        onChange={(e) => setSelectedEmployee(e.target.value)}
                                    >
                                        {employees.map(emp => <option key={emp._id} value={emp._id}>{toProperCase(emp.name)}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Mobile Action Buttons (Displayed right under Employee Select) */}
                            <div className="d-flex d-md-none align-items-center gap-2 mt-3 pt-2 border-top">
                                <button
                                    className="btn text-white flex-fill d-flex align-items-center justify-content-center gap-1 shadow-sm py-2 rounded-3 small fw-semibold"
                                    style={{ backgroundColor: '#dc3545' }}
                                    onClick={() => { setShowDistributeModal(true); setShowReturnModal(false); setShowEditModal(false); setError(''); }}
                                >
                                    <PlusCircle size={16} /> Advance
                                </button>
                                <button
                                    className="btn text-white flex-fill d-flex align-items-center justify-content-center gap-1 shadow-sm py-2 rounded-3 small fw-semibold"
                                    style={{ backgroundColor: '#198754' }}
                                    onClick={() => { setShowReturnModal(true); setShowDistributeModal(false); setShowEditModal(false); setError(''); }}
                                >
                                    <MinusCircle size={16} /> Return Advance
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-lg-4">
                    <div className="card border-0 shadow-sm rounded-4 bg-white h-100 border-start border-4 border-primary">
                        <div className="card-body py-3 d-flex align-items-center justify-content-between">
                            <div>
                                <span className="text-muted small fw-semibold d-block mb-1">Total Net Advance Balance</span>
                                <h4 className={`fw-bold mb-0 ${totalCurrentAdvances >= 0 ? 'text-danger' : 'text-success'}`}>
                                    {totalCurrentAdvances < 0 ? `₹${Math.abs(totalCurrentAdvances).toLocaleString()}` : `₹${totalCurrentAdvances.toLocaleString()}`}
                                </h4>
                            </div>
                            <div className="bg-primary bg-opacity-10 text-primary p-3 rounded-circle d-flex align-items-center justify-content-center">
                                <TrendingUp size={22} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Distribute Modal Form */}
            {showDistributeModal && (
                <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(33, 37, 41, 0.6)', zIndex: 1050 }}>
                    <div className="modal-dialog modal-dialog-centered px-3">
                        <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
                            <div className="modal-header px-4 py-3 text-white" style={{ backgroundColor: '#dc3545' }}>
                                <h5 className="modal-title fw-bold d-flex align-items-center gap-2">
                                    <PlusCircle size={20} /> Distribute Cash Advance
                                </h5>
                                <button type="button" className="btn-close btn-close-white" onClick={() => setShowDistributeModal(false)}></button>
                            </div>
                            <form onSubmit={handleDistributeSubmit}>
                                <div className="modal-body p-4 bg-light">
                                    {error && <div className="alert alert-danger py-2 small mb-3">{error}</div>}
                                    <div className="mb-3">
                                        <label className="form-label small fw-semibold text-secondary">Advance Cash Distribution (₹)</label>
                                        <input 
                                            type="number" 
                                            className="form-control rounded-3 border-secondary border-opacity-25 shadow-sm" 
                                            value={distributeAmount} 
                                            onChange={(e) => setDistributeAmount(e.target.value)} 
                                            placeholder="Enter amount in ₹"
                                            required 
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label small fw-semibold text-secondary">Distribution Date</label>
                                        <input 
                                            type="date" 
                                            className="form-control rounded-3 border-secondary border-opacity-25 shadow-sm" 
                                            value={distributeDate} 
                                            onChange={(e) => setDistributeDate(e.target.value)} 
                                            required 
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label small fw-semibold text-secondary">Given By (Staff Name)</label>
                                        <input 
                                            type="text" 
                                            className="form-control rounded-3 border-secondary border-opacity-25 shadow-sm" 
                                            value={distributeGivenBy} 
                                            onChange={(e) => setDistributeGivenBy(e.target.value)} 
                                            placeholder={`Default: ${toProperCase(loggedInUsername)}`} 
                                        />
                                    </div>
                                </div>
                                <div className="modal-footer border-top px-4 py-3 bg-white">
                                    <button type="button" className="btn btn-outline-secondary btn-sm px-3 rounded-3" onClick={() => setShowDistributeModal(false)}>Cancel</button>
                                    <button type="submit" className="btn btn-danger btn-sm px-4 rounded-3 text-white fw-bold" disabled={loading}>
                                        {loading ? 'Logging...' : 'Confirm Distribution'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Return Advance Modal Form */}
            {showReturnModal && (
                <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(33, 37, 41, 0.6)', zIndex: 1050 }}>
                    <div className="modal-dialog modal-dialog-centered px-3">
                        <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
                            <div className="modal-header px-4 py-3 text-white" style={{ backgroundColor: '#198754' }}>
                                <h5 className="modal-title fw-bold d-flex align-items-center gap-2">
                                    <MinusCircle size={20} /> Return Advance Amount
                                </h5>
                                <button type="button" className="btn-close btn-close-white" onClick={() => setShowReturnModal(false)}></button>
                            </div>
                            <form onSubmit={handleReturnSubmit}>
                                <div className="modal-body p-4 bg-light">
                                    {error && <div className="alert alert-danger py-2 small mb-3">{error}</div>}
                                    <div className="mb-3">
                                        <label className="form-label small fw-semibold text-secondary">Return Amount (₹)</label>
                                        <input 
                                            type="number" 
                                            className="form-control rounded-3 border-secondary border-opacity-25 shadow-sm" 
                                            value={returnAmount} 
                                            onChange={(e) => setReturnAmount(e.target.value)} 
                                            placeholder="Enter returned amount in ₹"
                                            required 
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label small fw-semibold text-secondary">Return Date</label>
                                        <input 
                                            type="date" 
                                            className="form-control rounded-3 border-secondary border-opacity-25 shadow-sm" 
                                            value={returnDate} 
                                            onChange={(e) => setReturnDate(e.target.value)} 
                                            required 
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label small fw-semibold text-secondary">Received By (Staff Name)</label>
                                        <input 
                                            type="text" 
                                            className="form-control rounded-3 border-secondary border-opacity-25 shadow-sm" 
                                            value={returnReceivedBy} 
                                            onChange={(e) => setReturnReceivedBy(e.target.value)} 
                                            placeholder={`Default: ${toProperCase(loggedInUsername)}`} 
                                        />
                                    </div>
                                </div>
                                <div className="modal-footer border-top px-4 py-3 bg-white">
                                    <button type="button" className="btn btn-outline-secondary btn-sm px-3 rounded-3" onClick={() => setShowReturnModal(false)}>Cancel</button>
                                    <button type="submit" className="btn btn-success btn-sm px-4 rounded-3 text-white fw-bold" disabled={loading}>
                                        {loading ? 'Logging...' : 'Confirm Return'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Transaction Modal Form */}
            {showEditModal && (
                <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(33, 37, 41, 0.6)', zIndex: 1050 }}>
                    <div className="modal-dialog modal-dialog-centered px-3">
                        <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
                            <div className="modal-header px-4 py-3 text-white bg-dark">
                                <h5 className="modal-title fw-bold d-flex align-items-center gap-2">
                                    <Edit3 size={20} /> Edit Transaction Record
                                </h5>
                                <button type="button" className="btn-close btn-close-white" onClick={() => setShowEditModal(false)}></button>
                            </div>
                            <form onSubmit={handleEditSubmit}>
                                <div className="modal-body p-4 bg-light">
                                    {error && <div className="alert alert-danger py-2 small mb-3">{error}</div>}
                                    <div className="mb-3">
                                        <label className="form-label small fw-semibold text-secondary">Transaction Type</label>
                                        <select 
                                            className="form-select rounded-3 border-secondary border-opacity-25 shadow-sm"
                                            value={editType}
                                            onChange={(e) => setEditType(e.target.value)}
                                        >
                                            <option value="advance">Advance (Outgoing)</option>
                                            <option value="return">Return (Incoming)</option>
                                        </select>
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label small fw-semibold text-secondary">Amount (₹)</label>
                                        <input 
                                            type="number" 
                                            className="form-control rounded-3 border-secondary border-opacity-25 shadow-sm" 
                                            value={editAmount} 
                                            onChange={(e) => setEditAmount(e.target.value)} 
                                            required 
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label small fw-semibold text-secondary">Transaction Date</label>
                                        <input 
                                            type="date" 
                                            className="form-control rounded-3 border-secondary border-opacity-25 shadow-sm" 
                                            value={editDate} 
                                            onChange={(e) => setEditDate(e.target.value)} 
                                            required 
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label small fw-semibold text-secondary">Authorized / Received By</label>
                                        <input 
                                            type="text" 
                                            className="form-control rounded-3 border-secondary border-opacity-25 shadow-sm" 
                                            value={editGivenBy} 
                                            onChange={(e) => setEditGivenBy(e.target.value)} 
                                            required 
                                        />
                                    </div>
                                </div>
                                <div className="modal-footer border-top px-4 py-3 bg-white">
                                    <button type="button" className="btn btn-outline-secondary btn-sm px-3 rounded-3" onClick={() => setShowEditModal(false)}>Cancel</button>
                                    <button type="submit" className="btn btn-dark btn-sm px-4 rounded-3 text-white fw-bold" disabled={loading}>
                                        {loading ? 'Updating...' : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Log Tracker Context Table */}
            <div className="card shadow-sm border-0 rounded-4 overflow-hidden bg-white">
                <div className="card-header bg-white py-3 px-4 border-bottom border-secondary border-opacity-10">
                    <h5 className="fw-bold mb-0 text-dark">Current Employee Advance & Return Log Tracker</h5>
                </div>
                <div className="card-body p-0">
                    <div className="table-responsive">
                        <table className="table table-hover align-middle small mb-0">
                            <thead className="text-uppercase text-white small" style={{ backgroundColor: '#495057' }}>
                                <tr>
                                    <th className="py-3 ps-4">Date</th>
                                    <th className="py-3">Type</th>
                                    <th className="py-3">Amount</th>
                                    <th className="py-3">Authorized / Received By</th>
                                    <th className="py-3 pe-4 text-end">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentAdvances.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="text-center py-5 text-muted">No advance or return logs found for the current month.</td>
                                    </tr>
                                ) : (
                                    recentAdvances.map((a, index) => {
                                        const isReturn = a.amount < 0 || a.type === 'return';
                                        return (
                                            <tr key={a._id || index} style={{ borderBottomColor: '#f1f3f5' }}>
                                                <td className="ps-4 pt-3">{a.date}</td>
                                                <td className="pt-3">
                                                    {isReturn ? (
                                                        <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 px-2 py-1 d-inline-flex align-items-center gap-1">
                                                            <ArrowDownLeft size={12} /> Return
                                                        </span>
                                                    ) : (
                                                        <span className="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25 px-2 py-1 d-inline-flex align-items-center gap-1">
                                                            <ArrowUpRight size={12} /> Advance
                                                        </span>
                                                    )}
                                                </td>
                                                <td className={`fw-bold pt-3 ${isReturn ? 'text-success' : 'text-danger'}`}>
                                                    ₹{Math.abs(a.amount).toLocaleString()}
                                                </td>
                                                <td className="pt-3 text-muted">{toProperCase(a.givenBy)}</td>
                                                <td className="pe-4 pt-3 text-end">
                                                    <div className="d-flex justify-content-end gap-2">
                                                        <button 
                                                            className="btn btn-outline-primary btn-sm px-2 py-1 rounded-2 d-flex align-items-center gap-1"
                                                            title="Edit Entry"
                                                            onClick={() => handleOpenEditModal(a)}
                                                        >
                                                            <Edit3 size={14} />
                                                        </button>
                                                        <button 
                                                            className="btn btn-outline-danger btn-sm px-2 py-1 rounded-2 d-flex align-items-center gap-1"
                                                            title="Delete Entry"
                                                            onClick={() => handleDeleteEntry(a._id)}
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdvanceHub;