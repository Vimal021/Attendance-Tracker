import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import PrivateRoute from './components/PrivateRoute';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Attendance from './pages/Attendance';
import ManageEmployees from './pages/ManageEmployees';
import ManageUsers from './pages/ManageUsers';
import AdvanceHub from './pages/AdvanceHub';
import MonthView from './pages/MonthView';
import AccountantDashboard from './pages/AccountantDashboard';
import SalaryCalculation from './pages/SalaryCalculation';

// Layout wrapper keeping navbar fixed and content properly offset from top
const ProtectedLayout = ({ children }) => (
  <>
    <Navbar />
    <div className="container-fluid py-3" style={{ marginTop: '65px' }}>
      {children}
    </div>
  </>
);

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Daily Attendance Root */}
        <Route path="/" element={
          <PrivateRoute>
            <ProtectedLayout>
              <Attendance />
            </ProtectedLayout>
          </PrivateRoute>
        } />

        {/* Dashboard */}
        <Route path="/dashboard" element={
          <PrivateRoute>
            <ProtectedLayout>
              <Dashboard />
            </ProtectedLayout>
          </PrivateRoute>
        } />

        {/* Employee Management */}
        <Route path="/employees" element={
          <PrivateRoute>
            <ProtectedLayout>
              <ManageEmployees />
            </ProtectedLayout>
          </PrivateRoute>
        } />

        {/* System User Management */}
        <Route path="/manage-users" element={
          <PrivateRoute>
            <ProtectedLayout>
              <ManageUsers />
            </ProtectedLayout>
          </PrivateRoute>
        } />

        {/* Advance Hub */}
        <Route path="/advances" element={
          <PrivateRoute>
            <ProtectedLayout>
              <AdvanceHub />
            </ProtectedLayout>
          </PrivateRoute>
        } />

        {/* Calendar Grid / Month View */}
        <Route path="/calendar-grid" element={
          <PrivateRoute>
            <ProtectedLayout>
              <MonthView />
            </ProtectedLayout>
          </PrivateRoute>
        } />

        {/* Salary Calculation */}
        <Route path="/salary-calculation" element={
          <PrivateRoute>
            <ProtectedLayout>
              <SalaryCalculation />
            </ProtectedLayout>
          </PrivateRoute>
        } />

        {/* Accountant Dashboard */}
        <Route path="/accountant" element={
          <PrivateRoute>
            <ProtectedLayout>
              <AccountantDashboard />
            </ProtectedLayout>
          </PrivateRoute>
        } />

        {/* Alias Route */}
        <Route path="/accountant-workspace" element={
          <PrivateRoute>
            <ProtectedLayout>
              <AccountantDashboard />
            </ProtectedLayout>
          </PrivateRoute>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;