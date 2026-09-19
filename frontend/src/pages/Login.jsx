import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import axios from 'axios';
import logoImage from '../Kishot_offset_logo.png';

const Login = () => {
    const [credentials, setCredentials] = useState({ username: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

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

    // Fix for browser password manager / autofill not updating React state
    useEffect(() => {
        const usernameInput = document.getElementById('username-input');
        const passwordInput = document.getElementById('password-input');

        const handleAutoFill = () => {
            if (usernameInput?.value || passwordInput?.value) {
                setCredentials({
                    username: usernameInput?.value || '',
                    password: passwordInput?.value || ''
                });
            }
        };

        const interval = setInterval(handleAutoFill, 500);
        return () => clearInterval(interval);
    }, []);

    const handleLogin = async (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        const currentUsername = credentials.username || document.getElementById('username-input')?.value || '';
        const currentPassword = credentials.password || document.getElementById('password-input')?.value || '';

        if (!currentUsername || !currentPassword) {
            setError('Please enter both username and password.');
            return;
        }

        setError('');
        setLoading(true);

        try {
            const response = await API.post('/api/auth/login', { 
                username: currentUsername, 
                password: currentPassword 
            });

            const data = response.data;

            // Store clean session variables for header-based auth
            localStorage.setItem('uf_token', data.token);
            localStorage.setItem('uf_username', data.username);
            localStorage.setItem('uf_role', data.role);

            // Bulletproof Role-Based Landing Page Routing
            const userRole = (data.role || '').toLowerCase();
            
            if (userRole.includes('staff')) {
                navigate('/'); 
            } else if (userRole === 'accountant') {
                navigate('/accountant'); // Accountants lock directly into the Accountant Workspace
            } else {
                navigate('/dashboard'); // Admins, Managers go to the main dashboard
            }

        } catch (err) {
            console.error("-> Login Error caught:", err);
            const errorMsg = err.response?.data?.message || err.message;
            
            // Handle network failure or friendly credential errors gracefully
            if (err.message === 'Failed to fetch' || err.name === 'TypeError' || err.code === 'ERR_NETWORK') {
                setError('Unable to connect to server. Please check your network connection.');
            } else if (err.response?.status === 401 || err.response?.status === 400 || errorMsg?.toLowerCase().includes('credential') || errorMsg?.toLowerCase().includes('password')) {
                setError('Invalid username or password.');
            } else {
                setError(errorMsg || 'Login failed. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container d-flex justify-content-center align-items-center vh-100 bg-light">
            <div className="card shadow-lg p-4 border-0 rounded-4" style={{ width: '100%', maxWidth: '400px' }}>

                {/* Header Section with Brand Logo */}
                <div className="text-center mb-4">
                    <img 
                        src={logoImage} 
                        alt="Kishor Offset Logo" 
                        style={{ height: '75px', width: 'auto', objectFit: 'contain' }} 
                        className="mb-2"
                    />
                    <p className="text-muted small mb-0">Attendance & Payroll System</p>
                </div>

                {error && (
                    <div className="alert alert-danger py-2 small text-center" role="alert">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin}>
                    <div className="mb-3">
                        <label className="form-label small fw-semibold text-secondary">Username</label>
                        <input
                            id="username-input"
                            type="text"
                            className="form-control"
                            placeholder="Enter your username"
                            value={credentials.username}
                            onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                        />
                    </div>

                    <div className="mb-4">
                        <label className="form-label small fw-semibold text-secondary">Password</label>
                        <div className="input-group">
                            <input
                                id="password-input"
                                type={showPassword ? 'text' : 'password'}
                                className="form-control"
                                placeholder="Enter your password"
                                value={credentials.password}
                                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                            />
                            <button
                                type="button"
                                className="btn btn-outline-secondary border"
                                onClick={() => setShowPassword(!showPassword)}
                                tabIndex="-1"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-dark w-100 py-2 fw-bold shadow-sm"
                        disabled={loading}
                    >
                        {loading && (
                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        )}
                        Secure Login
                    </button>
                </form>

                <div className="text-center mt-3">
                    <small className="text-muted" style={{ fontSize: '12px' }}>
                        Protected local business workspace
                    </small>
                </div>

            </div>
        </div>
    );
};

export default Login;