import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const Attendance = () => {
    const getFormattedDateStr = (d) => {
        const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return {
            backendStr: `${year}-${month}-${day}`,
            displayStr: `${day} / ${month} / ${year} , ${dayName}`
        };
    };

    const todayDateObj = new Date();
    const [dateObj, setDateObj] = useState(todayDateObj);
    const { backendStr: currentDate, displayStr: displayDateText } = getFormattedDateStr(dateObj);

    const [employees, setEmployees] = useState([]);
    const [attendanceMap, setAttendanceMap] = useState({});
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

    const currentUser = localStorage.getItem('uf_username') || 'Vimal';
    const currentRole = localStorage.getItem('uf_role') || 'Master Admin';
    const maxDateStr = getFormattedDateStr(todayDateObj).backendStr;
    const isPastDate = currentDate !== maxDateStr;

    // Use a ref to track the latest attendanceMap locally to avoid redundant fetches on rapid actions
    const attendanceMapRef = useRef(attendanceMap);
    useEffect(() => {
        attendanceMapRef.current = attendanceMap;
    }, [attendanceMap]);

    // Helper to convert 12-hour AM/PM string to 24-hour HH:mm for the time picker input
    const convertTo24Hour = (timeStr) => {
        if (!timeStr) return '';
        if (!timeStr.includes('AM') && !timeStr.includes('PM')) return timeStr;
        const [time, modifier] = timeStr.trim().toUpperCase().split(' ');
        let [hours, minutes] = time.split(':');
        if (hours === '12') hours = '00';
        if (modifier === 'PM') hours = parseInt(hours, 10) + 12;
        return `${String(hours).padStart(2, '0')}:${minutes}`;
    };

    // Helper to convert 24-hour HH:mm back to 12-hour AM/PM format for backend compatibility
    const convertTo12Hour = (time24) => {
        if (!time24) return '';
        if (time24.includes('AM') || time24.includes('PM')) return time24;
        let [hours, minutes] = time24.split(':').map(Number);
        const modifier = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${modifier}`;
    };

    const calculateSessionHours = (inTime, outTime) => {
        if (!inTime || !outTime) return 0;
        const [inH, inM] = convertTo24Hour(inTime).split(':').map(Number);
        const [outH, outM] = convertTo24Hour(outTime).split(':').map(Number);

        if (isNaN(inH) || isNaN(inM) || isNaN(outH) || isNaN(outM)) return 0;

        let inMinutes = inH * 60 + inM;
        let outMinutes = outH * 60 + outM;

        if (outMinutes < inMinutes) {
            outMinutes += 24 * 60;
        }
        return parseFloat(((outMinutes - inMinutes) / 60).toFixed(2));
    };

    const fetchAttendanceData = async (isBackgroundSync = false) => {
        try {
            if (!isBackgroundSync) {
                setLoading(true);
            }
            setMessage({ text: '', type: '' });
            const headers = {
                'x-username': currentUser,
                'x-role': currentRole
            };

            let activeEmps = employees;
            if (activeEmps.length === 0) {
                try {
                    const empRes = await axios.get('/api/employees', { headers });
                    const allEmps = empRes.data.employees || empRes.data;
                    activeEmps = Array.isArray(allEmps) ? allEmps.filter(e => e.status !== 'Leaved') : [];
                    setEmployees(activeEmps);
                } catch (empErr) {
                    if (!isBackgroundSync) {
                        setMessage({ text: empErr.response?.data?.message || 'Failed to authorize/load employee records.', type: 'danger' });
                    }
                    setLoading(false);
                    return;
                }
            }

            let existingRecords = {};
            try {
                const attRes = await axios.get(`/api/attendance/daily?date=${currentDate}`, { headers });
                if (Array.isArray(attRes.data)) {
                    attRes.data.forEach(record => {
                        const empId = record.employee?._id || record.employee;
                        existingRecords[empId] = record;
                    });
                }
            } catch (err) {
                // Safe fallback
            }

            const map = {};
            const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });

            activeEmps.forEach(emp => {
                const record = existingRecords[emp._id];
                const isHoliday = emp.weeklyHoliday === dayName;
                const localExisting = attendanceMapRef.current[emp._id];

                // Preserve local edit state if user is actively editing this specific card
                if (localExisting && localExisting.isEditing) {
                    map[emp._id] = localExisting;
                    return;
                }

                if (record) {
                    const formattedSessions = (record.sessions && record.sessions.length > 0 ? record.sessions : [{ inTime: '09:00 AM', outTime: '05:00 PM' }]).map(s => ({
                        inTime: convertTo24Hour(s.inTime),
                        outTime: convertTo24Hour(s.outTime),
                        hours: calculateSessionHours(s.inTime, s.outTime)
                    }));

                    map[emp._id] = {
                        status: record.status,
                        sessions: formattedSessions,
                        isSaved: true,
                        markedBy: record.markedBy || record.operator,
                        editedBy: record.editedBy,
                        isEditing: false
                    };
                } else {
                    const defaultSessions = isHoliday ? [] : [{ inTime: '09:00', outTime: '17:00', hours: 8 }];
                    map[emp._id] = {
                        status: isHoliday ? 'Holiday' : 'Present',
                        sessions: defaultSessions,
                        isSaved: false,
                        markedBy: '',
                        editedBy: '',
                        isEditing: false
                    };
                }
            });

            setAttendanceMap(map);
        } catch (error) {
            if (!isBackgroundSync) {
                setMessage({ text: error.response?.data?.message || 'Failed to load attendance metrics', type: 'danger' });
            }
        } finally {
            if (!isBackgroundSync) {
                setLoading(false);
            }
        }
    };

    // Optimized sync using a safe 45-second polling interval and visibility triggers to conserve free tier limits
    useEffect(() => {
        fetchAttendanceData(false);

        const syncInterval = setInterval(() => {
            if (document.visibilityState === 'visible') {
                fetchAttendanceData(true); // Background sync without loading spinners
            }
        }, 45000);

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                fetchAttendanceData(true);
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearInterval(syncInterval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [currentDate]);

    const handleSessionChange = (employeeId, idx, field, value) => {
        setAttendanceMap(prev => {
            const empData = prev[employeeId] || { status: 'Present', sessions: [{ inTime: '', outTime: '', hours: 0 }] };
            const updatedSessions = [...empData.sessions];
            updatedSessions[idx] = { ...updatedSessions[idx], [field]: value };
            updatedSessions[idx].hours = calculateSessionHours(updatedSessions[idx].inTime, updatedSessions[idx].outTime);

            return {
                ...prev,
                [employeeId]: { ...empData, sessions: updatedSessions }
            };
        });
    };

    const addSessionRow = (employeeId) => {
        setAttendanceMap(prev => {
            const empData = prev[employeeId] || { status: 'Present', sessions: [] };
            return {
                ...prev,
                [employeeId]: {
                    ...empData,
                    sessions: [...empData.sessions, { inTime: '', outTime: '', hours: 0 }]
                }
            };
        });
    };

    const removeSessionRow = (employeeId, idx) => {
        setAttendanceMap(prev => {
            const empData = prev[employeeId];
            const updatedSessions = empData.sessions.filter((_, i) => i !== idx);
            return {
                ...prev,
                [employeeId]: { ...empData, sessions: updatedSessions }
            };
        });
    };

    const handleStatusChange = (employeeId, newStatus) => {
        setAttendanceMap(prev => {
            const empData = prev[employeeId] || { sessions: [] };
            let sessions = empData.sessions;
            if (newStatus === 'Absent' || newStatus === 'Holiday') {
                sessions = [];
            } else if (!sessions || sessions.length === 0) {
                sessions = [{ inTime: '09:00', outTime: '17:00', hours: 8 }];
            }

            return {
                ...prev,
                [employeeId]: { ...empData, status: newStatus, sessions, isEditing: true }
            };
        });
    };

    const toggleEditMode = (employeeId) => {
        setAttendanceMap(prev => {
            const empData = prev[employeeId];
            const nextEditingState = !empData.isEditing;
            let sessions = empData.sessions;
            let status = empData.status;

            if (nextEditingState && (status === 'Absent' || status === 'Holiday' || !sessions || sessions.length === 0)) {
                status = 'Present';
                sessions = [{ inTime: '09:00', outTime: '17:00', hours: 8 }];
            }

            return {
                ...prev,
                [employeeId]: { ...empData, isEditing: nextEditingState, sessions, status }
            };
        });
    };

    const handleSaveSingle = async (employeeId) => {
        try {
            const headers = { 'x-username': currentUser, 'x-role': currentRole };
            const empData = attendanceMap[employeeId];

            const formattedSessions = (empData.sessions || []).map(s => ({
                inTime: convertTo12Hour(s.inTime),
                outTime: convertTo12Hour(s.outTime)
            }));

            const data = {
                employeeId,
                date: currentDate,
                status: empData.status,
                sessions: formattedSessions,
                operator: currentUser
            };

            await axios.post('/api/attendance/save', data, { headers });

            // Optimistic local update to avoid full layout re-fetch
            setAttendanceMap(prev => ({
                ...prev,
                [employeeId]: {
                    ...empData,
                    isSaved: true,
                    isEditing: false,
                    markedBy: currentUser
                }
            }));

            setMessage({ text: 'Attendance recorded successfully!', type: 'success' });
        } catch (error) {
            setMessage({ text: error.response?.data?.message || 'Error saving record', type: 'danger' });
        }
    };

    const handleBulkSave = async () => {
        try {
            const headers = { 'x-username': currentUser, 'x-role': currentRole };
            const records = Object.keys(attendanceMap).map(employeeId => {
                const empData = attendanceMap[employeeId];
                const formattedSessions = (empData.sessions || []).map(s => ({
                    inTime: convertTo12Hour(s.inTime),
                    outTime: convertTo12Hour(s.outTime)
                }));
                return {
                    employeeId,
                    status: empData.status,
                    sessions: formattedSessions,
                    operator: currentUser
                };
            });

            await axios.post('/api/attendance/bulk-save', { date: currentDate, records, operator: currentUser }, { headers });

            // Optimistic local update for all records
            setAttendanceMap(prev => {
                const updated = { ...prev };
                Object.keys(updated).forEach(id => {
                    updated[id] = {
                        ...updated[id],
                        isSaved: true,
                        isEditing: false,
                        markedBy: currentUser
                    };
                });
                return updated;
            });

            setMessage({ text: 'All changes saved successfully!', type: 'success' });
        } catch (error) {
            setMessage({ text: error.response?.data?.message || 'Bulk save failed', type: 'danger' });
        }
    };

    const getCardStyle = (data) => {
        if (data.isEditing) return { backgroundColor: '#fff9c4', borderColor: '#ffc107' };
        if (data.status === 'Absent') return { backgroundColor: '#ffe6e6', borderColor: '#dc3545' };
        if (data.status === 'Holiday') return { backgroundColor: '#e3f2fd', borderColor: '#0dcaf0' };
        if (data.isSaved) return { backgroundColor: '#e8f5e9', borderColor: '#2e7d32' };
        return { backgroundColor: '#ffffff', borderColor: '#dee2e6' };
    };

    return (
        <div className="container py-4" style={{ maxWidth: '1350px' }}>
            <div className="text-center mb-4">
                <h2 className="fw-bold text-dark mb-2">Daily Attendance Management</h2>
                <div className="d-flex justify-content-center align-items-center gap-2">
                    <span className="fw-bold text-secondary">Date:</span>
                    <input
                        type="date"
                        className="form-control form-control-sm w-auto fw-bold text-primary"
                        max={maxDateStr}
                        value={currentDate}
                        onChange={(e) => {
                            if (e.target.value) setDateObj(new Date(e.target.value));
                        }}
                    />
                </div>
                <small className="text-muted d-block mt-1">
                    Viewing: {displayDateText} | Logged in as: <strong style={{ textTransform: 'capitalize' }}>{currentUser}</strong>
                </small>
            </div>

            {message.text && (
                <div className={`alert alert-${message.type} alert-dismissible fade show`} role="alert">
                    {message.text}
                    <button type="button" className="btn-close" onClick={() => setMessage({ text: '', type: '' })}></button>
                </div>
            )}

            {loading ? (
                <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                </div>
            ) : (
                <div>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <span className="text-muted small fw-semibold">Active Staff: {employees.length}</span>
                        {!(isPastDate && currentRole === 'Regular Staff') && (
                            <button className="btn btn-success btn-sm fw-bold px-3 shadow-sm" onClick={handleBulkSave}>
                                Save All Changes (Bulk)
                            </button>
                        )}
                    </div>

                    <div className="row g-3 justify-content-start">
                        {employees.map(emp => {
                            const data = attendanceMap[emp._id] || { status: 'Present', sessions: [{ inTime: '09:00', outTime: '17:00', hours: 8 }], isSaved: false, isEditing: false };
                            const cardStyle = getCardStyle(data);

                            const isRegularStaffPast = isPastDate && currentRole === 'Regular Staff';
                            const locked = isPastDate ? (!data.isEditing) : (!data.isEditing && data.isSaved);

                            return (
                                <div key={emp._id} className="col-12 col-md-6 col-lg-4">
                                    <div className="card shadow-sm border-2 p-3 h-100" style={cardStyle}>

                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                            <div>
                                                <h5 className="fw-bold mb-0 text-dark">{emp.name}</h5>
                                                <small className="text-muted">Weekly Off: {emp.weeklyHoliday}</small>
                                            </div>
                                            {!locked && !isRegularStaffPast && (
                                                <div className="btn-group btn-group-sm">
                                                    <button
                                                        type="button"
                                                        className={`btn ${data.status === 'Absent' ? 'btn-danger' : 'btn-outline-danger'}`}
                                                        onClick={() => handleStatusChange(emp._id, 'Absent')}
                                                    >
                                                        Absent
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className={`btn ${data.status === 'Holiday' ? 'btn-info text-white' : 'btn-outline-info'}`}
                                                        onClick={() => handleStatusChange(emp._id, 'Holiday')}
                                                    >
                                                        Holiday
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {data.status === 'Absent' && locked ? (
                                            <div className="alert alert-danger py-1 px-2 my-2 text-center small fw-bold">
                                                MARKED ABSENT
                                            </div>
                                        ) : data.status === 'Holiday' && locked ? (
                                            <div className="alert alert-info py-1 px-2 my-2 text-center small fw-semibold">
                                                SCHEDULED HOLIDAY
                                            </div>
                                        ) : !data.isSaved && isPastDate && locked ? (
                                            <div className="alert alert-secondary py-1 px-2 my-2 text-center small fw-bold text-muted">
                                                NO ATTENDANCE MARKED
                                            </div>
                                        ) : (
                                            <div className="mb-2">
                                                <div className="d-flex text-muted fw-bold small mb-1 px-1">
                                                    <span style={{ width: '130px' }}>In-Time</span>
                                                    <span style={{ width: '35px' }} className="text-center"></span>
                                                    <span style={{ width: '130px' }} className="ps-1">Out-Time</span>
                                                    <span className="ms-auto">Hours</span>
                                                </div>
                                                {(data.sessions || []).map((session, idx) => (
                                                    <div key={idx} className="d-flex align-items-center gap-1 mb-2">
                                                        <input
                                                            type="time"
                                                            className="form-control form-control-sm text-center"
                                                            style={{ width: '130px' }}
                                                            value={session.inTime || ''}
                                                            disabled={locked || isRegularStaffPast}
                                                            onChange={(e) => handleSessionChange(emp._id, idx, 'inTime', e.target.value)}
                                                        />
                                                        <span className="small text-muted text-center" style={{ width: '35px' }}>to</span>
                                                        <input
                                                            type="time"
                                                            className="form-control form-control-sm text-center"
                                                            style={{ width: '130px' }}
                                                            value={session.outTime || ''}
                                                            disabled={locked || isRegularStaffPast}
                                                            onChange={(e) => handleSessionChange(emp._id, idx, 'outTime', e.target.value)}
                                                        />
                                                        <span className="badge bg-secondary small ms-auto">{session.hours || 0}h</span>
                                                        {!locked && !isRegularStaffPast && data.sessions.length > 1 && (
                                                            <button
                                                                type="button"
                                                                className="btn btn-outline-danger btn-sm py-0 px-1 ms-1"
                                                                onClick={() => removeSessionRow(emp._id, idx)}
                                                            >
                                                                &times;
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                                {!locked && !isRegularStaffPast && (
                                                    <button
                                                        type="button"
                                                        className="btn btn-link btn-sm p-0 text-decoration-none fw-bold"
                                                        onClick={() => addSessionRow(emp._id)}
                                                    >
                                                        + Add Split Shift
                                                    </button>
                                                )}
                                            </div>
                                        )}

                                        <div className="d-flex justify-content-between align-items-center mt-auto pt-2 border-top">
                                            <small className="text-muted" style={{ fontSize: '11px' }}>
                                                {data.isSaved ? (data.editedBy ? `Edited by ${data.editedBy}` : `Marked by ${data.markedBy}`) : 'No attendance marked'}
                                            </small>

                                            {isRegularStaffPast ? (
                                                <span className="badge bg-secondary">Read Only</span>
                                            ) : isPastDate && locked ? (
                                                <button
                                                    className="btn btn-sm py-1 px-3 fw-bold btn-warning text-dark"
                                                    onClick={() => toggleEditMode(emp._id)}
                                                >
                                                    Update
                                                </button>
                                            ) : data.isSaved && !data.isEditing ? (
                                                <button
                                                    className="btn btn-sm py-1 px-3 fw-bold btn-warning text-dark"
                                                    onClick={() => toggleEditMode(emp._id)}
                                                >
                                                    Update
                                                </button>
                                            ) : (
                                                <button
                                                    className="btn btn-sm py-1 px-3 fw-bold btn-dark"
                                                    onClick={() => handleSaveSingle(emp._id)}
                                                >
                                                    {data.isSaved ? 'Save Changes' : 'Save'}
                                                </button>
                                            )}
                                        </div>

                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Attendance;