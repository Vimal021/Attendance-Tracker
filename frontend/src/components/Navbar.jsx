import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
    CalendarCheck,
    Users,
    UserCog,
    Wallet,
    CalendarDays,
    Briefcase,
    Calculator,
    User,
    LogOut
} from 'lucide-react';

const Navbar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const username = localStorage.getItem('uf_username');
    const role = localStorage.getItem('uf_role');
    const [collapsed, setCollapsed] = useState(true);

    if (!username || location.pathname === '/login') return null;

    const handleLogout = () => {
        localStorage.clear();
        navigate('/login');
    };

    const getBrandLink = () => {
        const userRole = (role || '').toLowerCase();
        if (userRole === 'accountant') return '/accountant';
        if (userRole === 'regular staff' || userRole === 'staff') return '/';
        return '/dashboard';
    };

    const handleNavClick = () => {
        setCollapsed(true);
    };

    return (
        <nav className="navbar navbar-expand-lg navbar-dark bg-dark px-3 no-print fixed-top shadow-sm" style={{ zIndex: 1030 }}>
            <div className="container-fluid">
                <Link className="navbar-brand fw-bold text-uppercase d-flex align-items-center gap-2" to={getBrandLink()} onClick={handleNavClick}>
                    Kishor Offset
                </Link>
                <button
                    className="navbar-toggler"
                    type="button"
                    onClick={() => setCollapsed(!collapsed)}
                    aria-expanded={!collapsed}
                >
                    <span className="navbar-toggler-icon"></span>
                </button>
                <div className={`collapse navbar-collapse ${!collapsed ? 'show' : ''}`} id="navbarNav">
                    <ul className="navbar-nav me-auto mb-2 mb-lg-0 align-items-lg-center gap-lg-2">
                        {role === 'Regular Staff' && (
                            <li className="nav-item">
                                <Link className="nav-link d-flex align-items-center gap-2" to="/" onClick={handleNavClick}>
                                    <CalendarCheck size={16} /> Attendance
                                </Link>
                            </li>
                        )}

                        {(role === 'Master Admin' || role === 'Admin' || role === 'Manager') && (
                            <>
                                <li className="nav-item">
                                    <Link className="nav-link d-flex align-items-center gap-2" to="/" onClick={handleNavClick}>
                                        <CalendarCheck size={16} /> Attendance
                                    </Link>
                                </li>
                                <li className="nav-item">
                                    <Link className="nav-link d-flex align-items-center gap-2" to="/employees" onClick={handleNavClick}>
                                        <Users size={16} /> Manage Employees
                                    </Link>
                                </li>
                                <li className="nav-item">
                                    <Link className="nav-link d-flex align-items-center gap-2" to="/manage-users" onClick={handleNavClick}>
                                        <UserCog size={16} /> Manage Users
                                    </Link>
                                </li>
                                <li className="nav-item">
                                    <Link className="nav-link d-flex align-items-center gap-2" to="/advances" onClick={handleNavClick}>
                                        <Wallet size={16} /> Advance Hub
                                    </Link>
                                </li>
                                <li className="nav-item">
                                    <Link className="nav-link d-flex align-items-center gap-2" to="/calendar-grid" onClick={handleNavClick}>
                                        <CalendarDays size={16} /> Month View
                                    </Link>
                                </li>
                                <li className="nav-item">
                                    <Link className="nav-link d-flex align-items-center gap-2" to="/salary-calculation" onClick={handleNavClick}>
                                        <Calculator size={16} /> Salary
                                    </Link>
                                </li>
                                <li className="nav-item">
                                    <Link className="nav-link d-flex align-items-center gap-2" to="/accountant" onClick={handleNavClick}>
                                        <Briefcase size={16} /> Accountant Workspace
                                    </Link>
                                </li>
                            </>
                        )}

                        {(role === 'Office Staff' || role === 'Staff') && (
                            <>
                                <li className="nav-item">
                                    <Link className="nav-link d-flex align-items-center gap-2" to="/" onClick={handleNavClick}>
                                        <CalendarCheck size={16} /> Attendance
                                    </Link>
                                </li>
                                <li className="nav-item">
                                    <Link className="nav-link d-flex align-items-center gap-2" to="/employees" onClick={handleNavClick}>
                                        <Users size={16} /> Manage Employees
                                    </Link>
                                </li>
                                <li className="nav-item">
                                    <Link className="nav-link d-flex align-items-center gap-2" to="/advances" onClick={handleNavClick}>
                                        <Wallet size={16} /> Advance Hub
                                    </Link>
                                </li>
                                <li className="nav-item">
                                    <Link className="nav-link d-flex align-items-center gap-2" to="/calendar-grid" onClick={handleNavClick}>
                                        <CalendarDays size={16} /> Month View
                                    </Link>
                                </li>
                                <li className="nav-item">
                                    <Link className="nav-link d-flex align-items-center gap-2" to="/salary-calculation" onClick={handleNavClick}>
                                        <Calculator size={16} /> Salary
                                    </Link>
                                </li>
                                <li className="nav-item">
                                    <Link className="nav-link d-flex align-items-center gap-2" to="/accountant" onClick={handleNavClick}>
                                        <Briefcase size={16} /> Accountant Workspace
                                    </Link>
                                </li>
                            </>
                        )}

                        {role === 'Accountant' && (
                            <li className="nav-item">
                                <Link className="nav-link d-flex align-items-center gap-2" to="/accountant" onClick={handleNavClick}>
                                    <Briefcase size={16} /> Accountant Workspace
                                </Link>
                            </li>
                        )}
                    </ul>
                    <div className="d-flex align-items-center text-light gap-3 mt-3 mt-lg-0 pb-2 pb-lg-0">
                        <span
                            className="d-flex align-items-center gap-2 border border-secondary px-2.5 py-1 rounded bg-secondary bg-opacity-25 small"
                            style={{ textTransform: 'capitalize' }}
                        >
                            <User size={15} /> {username} ({role}) 
                        </span>
                        <button className="btn btn-outline-danger btn-sm d-flex align-items-center gap-2" onClick={handleLogout}>
                            <LogOut size={14} /> Logout
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;