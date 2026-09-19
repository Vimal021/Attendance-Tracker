import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Users, UserPlus, ClipboardCheck, ArrowRight } from 'lucide-react';
import axios from 'axios';

const Dashboard = () => {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);

    const loggedInUsername = localStorage.getItem('uf_username') || '';
    const loggedInRole = localStorage.getItem('uf_role') || '';

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
        'Content-Type': 'application/json',
        'x-username': loggedInUsername,
        'x-role': loggedInRole
    });

    // Current date logic matching your header requirement
    const currentDate = new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }).split('/').join(' / ') + ', ' + new Date().toLocaleDateString('en-US', { weekday: 'long' });

    const fetchDashboardData = async () => {
        try {
            const res = await API.get('/api/employees', {
                headers: getHeaders()
            });
            const data = res.data.employees || res.data;
            if (res.status === 200) {
                setEmployees(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            console.error('Failed to load dashboard metrics', err);
        } finally {
            setLoading(false);
        }
    };

    // Initial load & Tab visibility sync for cross-device updates
    useEffect(() => {
        fetchDashboardData();

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                fetchDashboardData();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    const activeEmployees = employees.filter(emp => emp.status !== 'Leaved');

    return (
        <div className="container py-3">
            {/* Header Section */}
            <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
                <div>
                    <h2 className="fw-bold text-dark mb-1">
                        <Link to="/dashboard" className="text-decoration-none text-dark">Kishor Offset</Link>
                    </h2>
                    <p className="text-muted small mb-0">
                        <Calendar size={16} className="me-2 text-primary" />
                        {currentDate}
                    </p>
                </div>
                <div className="d-flex gap-2">
                    <Link to="/employees" className="btn btn-outline-dark fw-bold shadow-sm">
                        <Users size={16} className="me-2" /> Manage Employees
                    </Link>
                </div>
            </div>

            {/* Interactive Navigation Cards */}
            <div className="row mb-4 g-3">
                {/* Mark Attendance Card - Primary Action */}
                <div className="col-12 col-md-4">
                    <div className="card p-3 shadow-sm border-0 bg-dark text-white h-100 d-flex flex-column justify-content-between">
                        <div>
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <span className="badge bg-success text-white small px-2 py-1">Daily Operations</span>
                                <ClipboardCheck size={24} className="text-success" />
                            </div>
                            <h5 className="fw-bold mb-1">Mark Attendance</h5>
                            <p className="text-white-50 small mb-3">Record daily factory floor presence, half-days, or shifts.</p>
                        </div>
                        <Link to="/" className="btn btn-light btn-sm fw-bold text-dark text-uppercase w-100 mt-2">
                            Open Attendance Sheet <ArrowRight size={14} className="ms-1" />
                        </Link>
                    </div>
                </div>

                {/* Total Active Staff Card */}
                <div className="col-6 col-md-4">
                    <div className="card p-3 shadow-sm border-0 h-100 d-flex flex-column justify-content-between bg-white">
                        <div>
                            <span className="text-muted small fw-bold d-block mb-1">Active Staff</span>
                            <h2 className="text-primary fw-bold mb-0">
                                <Users size={22} className="me-2 text-primary" />
                                {loading ? '...' : activeEmployees.length}
                            </h2>
                        </div>
                        <div className="mt-3 text-muted small">Registered in factory payroll</div>
                    </div>
                </div>

                {/* Quick Add Employee Card */}
                <div className="col-6 col-md-4">
                    <div className="card p-3 shadow-sm border-0 h-100 d-flex flex-column justify-content-between bg-white border-start border-4 border-dark">
                        <div>
                            <span className="text-muted small fw-bold d-block mb-1">Quick Action</span>
                            <h6 className="fw-bold text-dark mb-2">New Registration</h6>
                            <p className="text-muted small mb-2">Add new workers to database.</p>
                        </div>
                        <Link to="/employees" className="btn btn-outline-dark btn-sm fw-bold">
                            <UserPlus size={14} className="me-1" /> Add Employee
                        </Link>
                    </div>
                </div>
            </div>

            {/* Active Roster Preview Section */}
            <div className="card p-4 shadow-sm border-0 bg-white">
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="fw-bold mb-0 text-dark">Current Employee Roster</h5>
                    <Link to="/employees" className="text-decoration-none fw-bold small text-primary">
                        View All Directory &rarr;
                    </Link>
                </div>

                {loading ? (
                    <div className="text-center py-4 text-muted small">Loading active profiles...</div>
                ) : activeEmployees.length === 0 ? (
                    <div className="text-center py-4 text-muted">No active employees found. Please register staff using the employee panel.</div>
                ) : (
                    <div className="table-responsive">
                        <table className="table table-hover align-middle small mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th>Employee Name</th>
                                    <th>Mobile Number</th>
                                    <th>Base Salary</th>
                                    <th>Scheduled Off</th>
                                    <th>Ledger Balance</th>
                                </tr>
                            </thead>
                            <tbody>
                                {activeEmployees.slice(0, 5).map(emp => (
                                    <tr key={emp._id}>
                                        <td className="fw-bold text-dark">{emp.name}</td>
                                        <td>{emp.mobileNumber}</td>
                                        <td>₹{emp.salary?.toLocaleString()}</td>
                                        <td><span className="badge bg-light text-dark border">{emp.weeklyHoliday}</span></td>
                                        <td className={emp.currentBalance >= 0 ? 'text-danger fw-bold' : 'text-success fw-bold'}>
                                            ₹{emp.currentBalance?.toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;