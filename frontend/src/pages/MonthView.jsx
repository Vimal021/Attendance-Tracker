import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const MonthView = () => {
    const [employees, setEmployees] = useState([]);
    const [selectedEmployee, setSelectedEmployee] = useState('');
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
    const [monthlyRecords, setMonthlyRecords] = useState([]);
    const [highlightedDate, setHighlightedDate] = useState(null);
    const [editingDate, setEditingDate] = useState(null);
    const [shifts, setShifts] = useState([{ inTime: '09:00', outTime: '17:00' }]);
    
    const rowRefs = useRef({});

    // Helper to get today's date in YYYY-MM-DD format based on local time
    const todayObj = new Date();
    const todayIsoString = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    // Dynamic Base URL handler for local development, mobile Wi-Fi testing, and production
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

    const getAuthHeaders = () => {
        const token = localStorage.getItem('uf_token');
        const headers = {
            'Content-Type': 'application/json',
            'x-username': localStorage.getItem('uf_username') || 'Vimal',
            'x-role': localStorage.getItem('uf_role') || 'Admin'
        };
        if (token && token !== 'null' && token !== 'undefined') {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
    };

    useEffect(() => {
        const fetchEmployees = async () => {
            try {
                const res = await API.get('/api/employees?includeLeaved=true', {
                    headers: getAuthHeaders()
                });
                const data = res.data.employees || res.data;
                if (Array.isArray(data)) {
                    setEmployees(data);
                    if (data.length > 0) setSelectedEmployee(data[0]._id);
                } else {
                    setEmployees([]);
                }
            } catch (err) {
                console.error('Failed to load employees for MonthView:', err);
                setEmployees([]);
            }
        };
        fetchEmployees();
    }, []);

    const fetchMonthlyData = async () => {
        if (!selectedEmployee) return;
        try {
            const res = await API.get(`/api/attendance/monthly-grid?employeeId=${selectedEmployee}&year=${currentYear}&month=${currentMonth}`, {
                headers: getAuthHeaders()
            });
            const data = res.data.records || res.data;
            setMonthlyRecords(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to fetch monthly grid records:', err);
            setMonthlyRecords([]);
        }
    };

    useEffect(() => {
        fetchMonthlyData();
    }, [selectedEmployee, currentYear, currentMonth]);

    const handlePrevMonth = () => {
        if (currentMonth === 1) {
            setCurrentMonth(12); 
            setCurrentYear(currentYear - 1);
        } else {
            setCurrentMonth(currentMonth - 1);
        }
    };

    const handleNextMonth = () => {
        if (currentMonth === 12) {
            setCurrentMonth(1); 
            setCurrentYear(currentYear + 1);
        } else {
            setCurrentMonth(currentMonth + 1);
        }
    };

    const handleCellClick = (dayIsoString) => {
        setHighlightedDate(dayIsoString);
        if (rowRefs.current[dayIsoString]) {
            rowRefs.current[dayIsoString].scrollIntoView({ behavior: 'smooth', block: 'center' });
            rowRefs.current[dayIsoString].classList.add('table-warning');
            setTimeout(() => {
                if (rowRefs.current[dayIsoString]) {
                    rowRefs.current[dayIsoString].classList.remove('table-warning');
                }
            }, 2000);
        }
    };

    const convertTo24Hour = (timeStr) => {
        if (!timeStr) return '09:00';
        if (!timeStr.includes('AM') && !timeStr.includes('PM')) {
            return timeStr;
        }
        const [time, modifier] = timeStr.trim().toUpperCase().split(' ');
        let [hours, minutes] = time.split(':');
        if (hours === '12') hours = '00';
        if (modifier === 'PM') hours = parseInt(hours, 10) + 12;
        return `${String(hours).padStart(2, '0')}:${minutes}`;
    };

    const convertTo12Hour = (time24) => {
        if (!time24) return '09:00 AM';
        if (time24.includes('AM') || time24.includes('PM')) return time24;
        let [hours, minutes] = time24.split(':').map(Number);
        const modifier = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${modifier}`;
    };

    const handleStartEdit = (effectiveStatus, dayIsoString) => {
        setEditingDate(dayIsoString);
        const matchingLog = monthlyRecords.find(r => {
            if (!r.date) return false;
            const recordDateStr = typeof r.date === 'string' ? r.date : r.date.toString();
            return recordDateStr.trim() === dayIsoString || recordDateStr.startsWith(dayIsoString);
        });

        if (matchingLog && matchingLog.sessions && matchingLog.sessions.length > 0) {
            setShifts(matchingLog.sessions.map(s => ({
                inTime: convertTo24Hour(s.inTime),
                outTime: convertTo24Hour(s.outTime)
            })));
        } else {
            setShifts([{ inTime: '09:00', outTime: '17:00' }]);
        }
    };

    const handleAddShift = () => {
        setShifts([...shifts, { inTime: '09:00', outTime: '17:00' }]);
    };

    const handleShiftChange = (index, field, value) => {
        const updated = [...shifts];
        updated[index][field] = value;
        setShifts(updated);
    };

    const handleRemoveShift = (index) => {
        if (shifts.length === 1) return;
        setShifts(shifts.filter((_, i) => i !== index));
    };

    const currentSelectedEmpObj = employees.find(e => e._id === selectedEmployee);
    const employeeWeeklyHoliday = currentSelectedEmpObj?.weeklyHoliday || 'Sunday';

    const handleSaveEdit = async (dayIsoString) => {
        try {
            const formattedSessions = shifts.map(s => ({
                inTime: convertTo12Hour(s.inTime),
                outTime: convertTo12Hour(s.outTime)
            }));

            const d = new Date(dayIsoString);
            const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
            const isWeeklyHol = dayName === employeeWeeklyHoliday;
            const currentStatus = isWeeklyHol ? 'Working Holiday' : 'Present';

            const res = await API.post('/api/attendance/save', {
                employeeId: selectedEmployee,
                date: dayIsoString,
                sessions: formattedSessions,
                status: currentStatus,
                operator: localStorage.getItem('uf_username') || 'Vimal'
            }, {
                headers: getAuthHeaders()
            });

            if (res.status === 200) {
                setEditingDate(null);
                fetchMonthlyData();
            }
        } catch (err) {
            console.error('Error updating attendance record:', err);
            alert(err.response?.data?.message || 'Failed to update attendance record.');
        }
    };

    const getComputedDayData = (dayIsoString) => {
        const matchingLog = monthlyRecords.find(r => {
            if (!r.date) return false;
            const recordDateStr = typeof r.date === 'string' ? r.date : r.date.toString();
            return recordDateStr.trim() === dayIsoString || recordDateStr.startsWith(dayIsoString);
        });

        const d = new Date(dayIsoString);
        const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
        const isWeeklyHol = dayName === employeeWeeklyHoliday;

        let status = null; 
        if (matchingLog) {
            status = matchingLog.status;
        } else if (isWeeklyHol) {
            status = 'Holiday';
        }

        return { matchingLog, status };
    };

    const generateCalendarMatrixDays = () => {
        const totalDays = new Date(currentYear, currentMonth, 0).getDate();
        const startDayOfWeek = new Date(currentYear, currentMonth - 1, 1).getDay();
        const cells = [];

        for (let i = 0; i < startDayOfWeek; i++) {
            cells.push(
                <div key={`pad-${i}`} className="border bg-light opacity-50" style={{ height: '70px' }}></div>
            );
        }

        for (let day = 1; day <= totalDays; day++) {
            const dayIsoString = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const { status } = getComputedDayData(dayIsoString);

            let cellBgStyle = '#ffffff';
            let textColor = '#212529';
            let statusLabel = '';

            if (status === 'Present' || status === 'Working Holiday') {
                cellBgStyle = '#2b8a3e';
                textColor = '#ffffff';
                statusLabel = status === 'Working Holiday' ? 'OT Shift' : 'PRESENT';
            } else if (status === 'Absent') {
                cellBgStyle = '#fa5252';
                textColor = '#ffffff';
                statusLabel = 'ABSENT';
            } else if (status === 'Holiday') {
                cellBgStyle = '#15aabf';
                textColor = '#ffffff';
                statusLabel = 'HOLIDAY';
            }

            cells.push(
                <div
                    key={day}
                    className="border d-flex flex-column justify-content-between p-1 fw-bold"
                    style={{ 
                        height: '70px', 
                        backgroundColor: cellBgStyle, 
                        color: textColor,
                        cursor: 'pointer',
                        fontSize: '12px'
                    }}
                    onClick={() => handleCellClick(dayIsoString)}
                >
                    <div>{day}</div>
                    {statusLabel && (
                        <div style={{ fontSize: '9px' }} className="text-truncate text-uppercase opacity-95 text-center w-100">
                            {statusLabel}
                        </div>
                    )}
                </div>
            );
        }
        return cells;
    };

    const totalDaysInMonth = new Date(currentYear, currentMonth, 0).getDate();

    let totalPresent = 0;
    let totalAbsent = 0;
    let totalHoliday = 0;

    for (let day = 1; day <= totalDaysInMonth; day++) {
        const dayIsoString = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const { status } = getComputedDayData(dayIsoString);
        if (status === 'Present' || status === 'Working Holiday') totalPresent++;
        else if (status === 'Absent') totalAbsent++;
        else if (status === 'Holiday') totalHoliday++;
    }

    return (
        <div className="card shadow-sm border-0 p-2 p-md-4 bg-white">
            <div className="row g-3 justify-content-between align-items-center mb-2">
                <div className="col-12 col-md-4">
                    <label className="small fw-bold text-muted">Filter Employee Name</label>
                    <select className="form-select" value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)}>
                        {employees.map(e => <option key={e._id} value={e._id}>{e.name}</option>)}
                    </select>
                </div>
                <div className="col-12 col-md-4 d-flex justify-content-center align-items-center mt-2 mt-md-4">
                    <button className="btn btn-outline-dark btn-sm fw-bold px-3 me-3" onClick={handlePrevMonth}>&lt;</button>
                    <h4 className="fw-bold mb-0 text-dark text-nowrap">{monthNames[currentMonth - 1]} {currentYear}</h4>
                    <button className="btn btn-outline-dark btn-sm fw-bold px-3 ms-3" onClick={handleNextMonth}>&gt;</button>
                </div>
                <div className="col-12 col-md-4 text-center text-md-end text-muted small mt-2 mt-md-4">
                    🟩 Present / OT Shift | 🟥 Absent | 🟦 Holiday
                </div>
            </div>

            <div className="row mb-4">
                <div className="col-12 text-center">
                    <div className="p-2 bg-light border rounded d-inline-flex gap-3 gap-md-4 fw-bold small shadow-sm">
                        <span className="text-success">Present: {totalPresent}</span>
                        <span className="text-danger">Absent: {totalAbsent}</span>
                        <span className="text-info">Holiday: {totalHoliday}</span>
                    </div>
                </div>
            </div>

            <div className="row g-4">
                <div className="col-12 col-lg-5">
                    <div className="border rounded bg-light p-2">
                        <div className="row row-cols-7 g-0 text-center border-bottom bg-white py-2 rounded-top text-dark fw-bold small">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                                <div key={d} className="col" style={{ width: '14.28%' }}>{d}</div>
                            ))}
                        </div>
                        <div className="row row-cols-7 g-0 border-start border-top border-end bg-white rounded-bottom" style={{ display: 'flex', flexWrap: 'wrap' }}>
                            {generateCalendarMatrixDays().map((cell, idx) => (
                                <div key={idx} style={{ width: '14.28%' }}>{cell}</div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="col-12 col-lg-7">
                    <div className="card border h-100 p-2 p-md-3 bg-light">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <h5 className="fw-bold text-dark mb-0 fs-6 fs-md-5 text-truncate pe-2">
                                {currentSelectedEmpObj ? currentSelectedEmpObj.name : 'Employee'} — Full Month Details
                            </h5>
                            <span className="badge bg-secondary flex-shrink-0">{monthNames[currentMonth - 1]} {currentYear}</span>
                        </div>

                        <div className="table-responsive bg-white border rounded" style={{ maxHeight: '480px', overflowY: 'auto' }}>
                            <table className="table table-striped table-hover mb-0 align-middle small text-nowxl" style={{ minWidth: '550px' }}>
                                <thead className="table-dark sticky-top">
                                    <tr>
                                        <th style={{ width: '32%' }}>Date (DD-MM-YYYY)</th>
                                        <th style={{ width: '20%' }}>In-time</th>
                                        <th style={{ width: '20%' }}>Out-time</th>
                                        <th style={{ width: '13%' }}>Hours</th>
                                        <th className="text-end" style={{ width: '15%' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Array.from({ length: totalDaysInMonth }, (_, index) => {
                                        const day = index + 1;
                                        const dayIsoString = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                        const formattedDisplayDate = `${String(day).padStart(2, '0')}-${String(currentMonth).padStart(2, '0')}-${currentYear}`;
                                        const isFutureDate = dayIsoString > todayIsoString;

                                        const { matchingLog, status } = getComputedDayData(dayIsoString);
                                        const isEditing = editingDate === dayIsoString;

                                        // Friendly display label mapping for table badges
                                        let displayStatusBadge = status;
                                        if (status === 'Working Holiday') displayStatusBadge = 'OT Shift';

                                        return (
                                            <tr 
                                                key={dayIsoString} 
                                                ref={el => rowRefs.current[dayIsoString] = el}
                                                className={highlightedDate === dayIsoString ? 'table-warning' : ''}
                                            >
                                                <td className="fw-bold">
                                                    <div className="d-flex align-items-center justify-content-between pe-1">
                                                        <span>{formattedDisplayDate}</span>
                                                        {status && (
                                                            <span 
                                                                className="px-2 py-0 rounded text-white fw-bold text-center" 
                                                                style={{ 
                                                                    fontSize: '10px', 
                                                                    backgroundColor: status === 'Present' || status === 'Working Holiday' ? '#2b8a3e' : status === 'Holiday' ? '#15aabf' : '#fa5252' 
                                                                }}
                                                            >
                                                                {displayStatusBadge}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td colSpan={isEditing ? 2 : 1}>
                                                    {isEditing ? (
                                                        <div className="d-flex flex-column gap-2 py-1">
                                                            {shifts.map((shift, sIdx) => (
                                                                <div key={sIdx} className="d-flex align-items-center gap-1">
                                                                    <input 
                                                                        type="time" 
                                                                        className="form-control form-control-sm px-1" 
                                                                        value={shift.inTime} 
                                                                        onChange={(e) => handleShiftChange(sIdx, 'inTime', e.target.value)} 
                                                                    />
                                                                    <span className="small text-muted">to</span>
                                                                    <input 
                                                                        type="time" 
                                                                        className="form-control form-control-sm px-1" 
                                                                        value={shift.outTime} 
                                                                        onChange={(e) => handleShiftChange(sIdx, 'outTime', e.target.value)} 
                                                                    />
                                                                    {shifts.length > 1 && (
                                                                        <button 
                                                                            type="button" 
                                                                            className="btn btn-outline-danger btn-sm px-1 py-0"
                                                                            onClick={() => handleRemoveShift(sIdx)}
                                                                        >
                                                                            &times;
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            ))}
                                                            <div>
                                                                <button 
                                                                    type="button" 
                                                                    className="btn btn-outline-primary btn-sm py-0 px-2 mt-1"
                                                                    style={{ fontSize: '11px' }}
                                                                    onClick={handleAddShift}
                                                                >
                                                                    + Add Shift
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div>
                                                            {matchingLog && matchingLog.sessions && matchingLog.sessions.length > 0 ? (
                                                                matchingLog.sessions.map((s, idx) => (
                                                                    <div key={idx}>{convertTo12Hour(s.inTime)}</div>
                                                                ))
                                                            ) : (
                                                                '-'
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                                {!isEditing && (
                                                    <td>
                                                        {matchingLog && matchingLog.sessions && matchingLog.sessions.length > 0 ? (
                                                            matchingLog.sessions.map((s, idx) => (
                                                                <div key={idx}>{convertTo12Hour(s.outTime)}</div>
                                                            ))
                                                        ) : (
                                                            '-'
                                                        )}
                                                    </td>
                                                )}
                                                <td>{matchingLog?.totalDailyHours !== undefined ? matchingLog.totalDailyHours : '-'}</td>
                                                <td className="text-end">
                                                    {localStorage.getItem('uf_role') !== 'Accountant' && !isFutureDate && (
                                                        isEditing ? (
                                                            <div className="d-flex justify-content-end gap-1">
                                                                <button 
                                                                    className="btn btn-success btn-sm fw-bold px-2 py-0"
                                                                    onClick={() => handleSaveEdit(dayIsoString)}
                                                                >
                                                                    Save
                                                                </button>
                                                                <button 
                                                                    className="btn btn-secondary btn-sm fw-bold px-2 py-0"
                                                                    onClick={() => setEditingDate(null)}
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button 
                                                                type="button"
                                                                className="btn btn-warning btn-sm fw-bold px-2 py-1 shadow-sm text-dark"
                                                                onClick={() => handleStartEdit(status, dayIsoString)}
                                                                style={{ backgroundColor: '#ffc107', borderColor: '#ffc107', fontSize: '12px' }}
                                                            >
                                                                Update
                                                            </button>
                                                        )
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MonthView;