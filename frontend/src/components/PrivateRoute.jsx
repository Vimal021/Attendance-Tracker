import React from 'react';
import { Navigate } from 'react-router-dom';

const PrivateRoute = ({ children }) => {
    const username = localStorage.getItem('uf_username');
    return username ? children : <Navigate to="/login" replace />;
};

export default PrivateRoute;