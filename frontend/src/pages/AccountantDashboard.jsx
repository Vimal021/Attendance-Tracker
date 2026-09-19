import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Package, Printer, CheckSquare, Square } from 'lucide-react';
import logoImage from '../Kishot_offset_logo.png';

const getBaseUrl = () => {
    if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
    const hostname = window.location.hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1' 
        ? 'http://localhost:5000' 
        : `http://${hostname}:5000`;
};

const API = axios.create({ baseURL: getBaseUrl() });

const AccountantDashboard = () => {
    const [employees, setEmployees] = useState([]);
    const [selectedEmployee, setSelectedEmployee] = useState('');
    
    const currentDate = new Date();
    const currentMonthDefault = String(currentDate.getMonth() + 1).padStart(2, '0');
    const currentYearDefault = String(currentDate.getFullYear());

    const [selectedMonth, setSelectedMonth] = useState(currentMonthDefault);
    const [selectedYear, setSelectedYear] = useState(currentYearDefault);

    const [reportData, setReportData] = useState(null);
    const [bulkModalOpen, setBulkModalOpen] = useState(false);
    const [bulkSelectedIds, setBulkSelectedIds] = useState([]);
    const [bulkReports, setBulkReports] = useState([]);
    const [bulkLoading, setBulkLoading] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const monthNames = {
        '01': 'January', '02': 'February', '03': 'March', '04': 'April',
        '05': 'May', '06': 'June', '07': 'July', '08': 'August',
        '09': 'September', '10': 'October', '11': 'November', '12': 'December'
    };

    const getAuthHeaders = () => ({
        headers: {
            'x-username': localStorage.getItem('uf_username') || '',
            'x-role': localStorage.getItem('uf_role') || ''
        }
    });

    useEffect(() => {
        const fetchEmployees = async () => {
            try {
                const res = await API.get('/api/employees?includeLeaved=true', getAuthHeaders());
                const data = res.data;
                const empList = Array.isArray(data) ? data : (data.employees || data.data || []);
                setEmployees(empList);
                if (empList.length > 0) {
                    setSelectedEmployee(empList[0]._id);
                    setBulkSelectedIds(empList.map(e => e._id));
                }
            } catch (err) {
                console.error('Error fetching employees:', err);
                setError('Failed to load employee list.');
            }
        };
        fetchEmployees();
    }, []);

    const fetchSingleEmployeeReport = async () => {
        if (!selectedEmployee) return;
        setLoading(true);
        setError(null);
        setReportData(null);
        setBulkReports([]);
        try {
            const res = await API.get(`/api/salary/statement?employeeId=${selectedEmployee}&month=${selectedMonth}&year=${selectedYear}`, getAuthHeaders());
            setReportData(res.data);
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenBulkModal = async () => {
        setBulkModalOpen(true);
        if (bulkSelectedIds.length === 0 && employees.length > 0) {
            setBulkSelectedIds(employees.map(e => e._id));
        }
    };

    const fetchBulkReportsData = async (idsToFetch = bulkSelectedIds) => {
        if (idsToFetch.length === 0) return [];
        setBulkLoading(true);
        try {
            const promises = idsToFetch.map(async (empId) => {
                try {
                    const res = await API.get(`/api/salary/statement?employeeId=${empId}&month=${selectedMonth}&year=${selectedYear}`, getAuthHeaders());
                    return res.data;
                } catch (e) {
                    console.error(`Failed report for employee ${empId}`, e);
                    return null;
                }
            });
            const results = await Promise.all(promises);
            const validResults = results.filter(r => r && r.employee);
            setBulkReports(validResults);
            return validResults;
        } catch (err) {
            console.error('Error fetching bulk reports:', err);
            setError('Failed to load bulk statements.');
            return [];
        } finally {
            setBulkLoading(false);
        }
    };

    const handleTriggerBulkPrint = async () => {
        setBulkModalOpen(false);
        setReportData(null);
        const reports = await fetchBulkReportsData(bulkSelectedIds);
        if (reports.length > 0) {
            setTimeout(() => {
                window.print();
            }, 400);
        }
    };

    const formatDayDateString = (year, month, dayNum) => {
        const paddedDay = String(dayNum).padStart(2, '0');
        return `${paddedDay}/${month}/${year}`;
    };

    const getDayFullNameString = (year, month, dayNum) => {
        const dateObj = new Date(Date.UTC(Number(year), Number(month) - 1, Number(dayNum)));
        return dateObj.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
    };

    const parseTimeToDecimal = (timeStr) => {
        if (!timeStr) return null;
        if (typeof timeStr === 'number') return timeStr;
        
        let str = String(timeStr).trim();
        const upper = str.toUpperCase();
        let isPM = upper.includes('PM');
        let isAM = upper.includes('AM');
        
        str = str.replace(/AM|PM/gi, '').trim();
        const parts = str.split(':');
        if (parts.length < 2) return null;

        let hours = parseInt(parts[0], 10);
        const minutes = parseInt(parts[1], 10);

        if (isNaN(hours) || isNaN(minutes)) return null;

        if (isPM && hours < 12) hours += 12;
        if (isAM && hours === 12) hours = 0;

        return hours + minutes / 60;
    };

    const computeTotalHoursFromLog = (log) => {
        if (!log) return 0;

        if (Array.isArray(log.sessions) && log.sessions.length > 0) {
            let sessionSum = 0;
            log.sessions.forEach(sess => {
                let sessHours = Number(sess.hours || 0);
                if (sessHours === 0 && sess.inTime && sess.outTime) {
                    const inDec = parseTimeToDecimal(sess.inTime);
                    const outDec = parseTimeToDecimal(sess.outTime);
                    if (inDec !== null && outDec !== null) {
                        sessHours = outDec >= inDec ? outDec - inDec : (24 - inDec) + outDec;
                    }
                }
                sessionSum += sessHours;
            });
            if (sessionSum > 0) return sessionSum;
        }

        if ((log.checkIn || log.inTime || log.startTime) && (log.checkOut || log.outTime || log.endTime)) {
            const inDec = parseTimeToDecimal(log.checkIn || log.inTime || log.startTime);
            const outDec = parseTimeToDecimal(log.checkOut || log.outTime || log.endTime);
            if (inDec !== null && outDec !== null) {
                return outDec >= inDec ? outDec - inDec : (24 - inDec) + outDec;
            }
        }

        return Number(log.totalDailyHours || log.totalHours || log.hours || 0);
    };

    const getEarliestCheckInDecimal = (log) => {
        if (!log) return null;
        let earliest = null;

        if (Array.isArray(log.sessions) && log.sessions.length > 0) {
            log.sessions.forEach(sess => {
                const dec = parseTimeToDecimal(sess.inTime);
                if (dec !== null) {
                    if (earliest === null || dec < earliest) earliest = dec;
                }
            });
        }

        if (earliest === null) {
            earliest = parseTimeToDecimal(log.checkIn || log.inTime || log.startTime);
        }

        return earliest;
    };

    const evaluateLogEntry = (log) => {
        if (!log) return { slot1: 'A', slot2: 'A', ot: 'Absent' };
        if (log.status === 'Holiday') return { slot1: 'Holiday', slot2: 'Holiday', ot: 'Holiday' };
        if (log.status === 'Absent') return { slot1: 'A', slot2: 'A', ot: 'Absent' };

        const hours = computeTotalHoursFromLog(log);
        if (hours <= 0 && log.status !== 'Present') return { slot1: 'A', slot2: 'A', ot: 'Absent' };

        const earliestIn = getEarliestCheckInDecimal(log);
        const isAfter1PM = earliestIn !== null && earliestIn >= 13;

        if (hours > 0 && hours < 3.75) {
            return { slot1: 'A', slot2: 'A', ot: `${hours}` };
        }

        if (hours >= 3.75 && hours < 4) {
            const slot1 = isAfter1PM ? 'A' : 'P';
            const slot2 = isAfter1PM ? 'P' : 'A';
            return { slot1, slot2, ot: '-' };
        }

        if (hours >= 4 && hours < 8) {
            const slot1 = isAfter1PM ? 'A' : 'P';
            const slot2 = isAfter1PM ? 'P' : 'A';
            const otHours = hours - 4;
            return { slot1, slot2, ot: otHours > 0 ? `${otHours}` : '-' };
        }

        if (hours >= 8) {
            const otHours = hours - 8;
            return { slot1: 'P', slot2: 'P', ot: otHours > 0 ? `${otHours}` : '-' };
        }

        return { slot1: 'A', slot2: 'A', ot: 'Absent' };
    };

    const computeSplitAttendanceMatrix = (logs = [], employeeObj = {}, targetYear = selectedYear, targetMonth = selectedMonth) => {
        const totalDays = new Date(Number(targetYear), Number(targetMonth), 0).getDate();
        const rows = [];
        
        const currentEmpObj = employees.find(e => e._id === employeeObj._id) || employeeObj;
        const configuredWeeklyOff = (currentEmpObj.weeklyHoliday || employeeObj.weeklyHoliday || 'Sunday').trim().toLowerCase();

        for (let i = 1; i <= 16; i++) {
            const leftDateStr = `${targetYear}-${targetMonth}-${String(i).padStart(2, '0')}`;
            const rightDayNum = i + 16;
            const rightDateStr = rightDayNum <= totalDays ? `${targetYear}-${targetMonth}-${String(rightDayNum).padStart(2, '0')}` : null;

            const leftLog = logs.find(l => l.date === leftDateStr);
            const rightLog = rightDateStr ? logs.find(l => l.date === rightDateStr) : null;

            const resolveCellState = (log, year, month, dayNum, dateStr) => {
                if (!dateStr) return { type: 'none' };
                const dayFull = getDayFullNameString(year, month, dayNum);
                const isWeeklyOff = dayFull.toLowerCase() === configuredWeeklyOff;

                if (isWeeklyOff || (log && log.status === 'Holiday')) {
                    return { text: `${dayFull} (Holiday)`, type: 'holiday' };
                }

                const res = evaluateLogEntry(log);
                return { slot1Text: res.slot1, slot2Text: res.slot2, type: 'normal' };
            };

            const leftState = resolveCellState(leftLog, targetYear, targetMonth, i, leftDateStr);
            const rightState = resolveCellState(rightLog, targetYear, targetMonth, rightDayNum, rightDateStr);

            rows.push({
                leftDate: formatDayDateString(targetYear, targetMonth, i),
                leftState,
                rightDate: rightDateStr ? formatDayDateString(targetYear, targetMonth, rightDayNum) : '',
                rightState
            });
        }
        return rows;
    };

    const computeSplitOvertimeMatrix = (logs = [], employeeObj = {}, targetYear = selectedYear, targetMonth = selectedMonth) => {
        const totalDays = new Date(Number(targetYear), Number(targetMonth), 0).getDate();
        const rows = [];
        
        const currentEmpObj = employees.find(e => e._id === employeeObj._id) || employeeObj;
        const configuredWeeklyOff = (currentEmpObj.weeklyHoliday || employeeObj.weeklyHoliday || 'Sunday').trim().toLowerCase();

        for (let i = 1; i <= 16; i++) {
            const leftDateStr = `${targetYear}-${targetMonth}-${String(i).padStart(2, '0')}`;
            const rightDayNum = i + 16;
            const rightDateStr = rightDayNum <= totalDays ? `${targetYear}-${targetMonth}-${String(rightDayNum).padStart(2, '0')}` : null;

            const leftLog = logs.find(l => l.date === leftDateStr);
            const rightLog = rightDateStr ? logs.find(l => l.date === rightDateStr) : null;

            const resolveOTState = (log, year, month, dayNum, dateStr) => {
                if (!dateStr) return { text: '', type: 'none' };
                const dayFull = getDayFullNameString(year, month, dayNum);
                const isWeeklyOff = dayFull.toLowerCase() === configuredWeeklyOff;

                if (isWeeklyOff || (log && log.status === 'Holiday')) {
                    const workedHours = computeTotalHoursFromLog(log);
                    return { text: workedHours > 0 ? `${workedHours}` : 'Holiday', type: workedHours > 0 ? 'ot' : 'holiday' };
                }

                const res = evaluateLogEntry(log);
                if (res.ot === 'Absent') {
                    return { text: 'Absent', type: 'absent' };
                }
                return { text: res.ot, type: res.ot !== '-' ? 'ot' : 'normal' };
            };

            const leftState = resolveOTState(leftLog, targetYear, targetMonth, i, leftDateStr);
            const rightState = resolveOTState(rightLog, targetYear, targetMonth, rightDayNum, rightDateStr);

            rows.push({
                leftDate: formatDayDateString(targetYear, targetMonth, i),
                leftState,
                rightDate: rightDateStr ? formatDayDateString(targetYear, targetMonth, rightDayNum) : '',
                rightState
            });
        }
        return rows;
    };

    const calculateTotalOvertimeSum = (logs = [], employeeObj = {}) => {
        const otMatrix = computeSplitOvertimeMatrix(logs, employeeObj);
        let sum = 0;
        otMatrix.forEach(row => {
            [row.leftState, row.rightState].forEach(st => {
                if (st && st.type === 'ot') {
                    const val = Number(st.text);
                    if (!isNaN(val)) sum += val;
                }
            });
        });
        return sum;
    };

    const getCellStyling = (type) => {
        if (type === 'absent') return { fontWeight: 'bold', textDecoration: 'underline' };
        if (type === 'holiday') return { fontWeight: 'bold' };
        return {};
    };

    const toggleBulkEmployee = (id) => {
        setBulkSelectedIds(prev => 
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const handleSelectAllBulk = () => {
        if (bulkSelectedIds.length === employees.length) {
            setBulkSelectedIds([]);
        } else {
            setBulkSelectedIds(employees.map(e => e._id));
        }
    };

    const triggerPaperPrintOperation = () => {
        window.print();
    };

    const renderReportSheet = (employee, logs) => {
        const attMatrix = computeSplitAttendanceMatrix(logs, employee);
        const otMatrix = computeSplitOvertimeMatrix(logs, employee);
        const totalOT = calculateTotalOvertimeSum(logs, employee);

        return (
            <div className="print-page-wrapper">
                {/* Header Logo */}
                <div className="d-flex justify-content-end align-items-center mb-3 pb-2 border-bottom border-dark">
                    <img 
                        src={logoImage} 
                        alt="Kishor Offset Logo" 
                        style={{ height: '38px', width: 'auto', objectFit: 'contain' }} 
                    />
                </div>

                {/* Attendance Section */}
                <div style={{ marginBottom: '28px' }}>
                    <div className="text-center bg-secondary text-white py-1 mb-2 border border-dark">
                        <span className="fw-bold text-uppercase sheet-banner-title">
                            {employee.name} - {monthNames[selectedMonth]} {selectedYear} ( Attendance Sheet )
                        </span>
                    </div>

                    <table className="table table-bordered border-dark text-center align-middle mb-0 custom-ledger-table">
                        <thead>
                            <tr className="table-secondary border-dark">
                                <th style={{ width: '15%' }}>Date</th>
                                <th style={{ width: '10%' }}>Slot 1</th>
                                <th style={{ width: '10%' }}>Slot 2</th>
                                <th style={{ width: '14%' }}>Remarks</th>
                                <th className="bg-white border-0 separator-col"></th>
                                <th style={{ width: '15%' }}>Date</th>
                                <th style={{ width: '10%' }}>Slot 1</th>
                                <th style={{ width: '10%' }}>Slot 2</th>
                                <th style={{ width: '14%' }}>Remarks</th>
                            </tr>
                        </thead>
                        <tbody>
                            {attMatrix.map((row, index) => {
                                const isLeftNone = row.leftState.type === 'none';
                                const isRightNone = row.rightState.type === 'none';
                                const isLeftHoliday = row.leftState.type === 'holiday';
                                const isRightHoliday = row.rightState.type === 'holiday';
                                const isLeftAbsent = row.leftState.type === 'absent';
                                const isRightAbsent = row.rightState.type === 'absent';

                                return (
                                    <tr key={index} className="border-dark">
                                        <td className="fw-semibold bg-light">{row.leftDate}</td>
                                        {isLeftNone ? (
                                            <td colSpan="2"></td>
                                        ) : isLeftHoliday ? (
                                            <td colSpan="2" style={{ ...getCellStyling('holiday'), fontSize: '8.5px' }}>{row.leftState.text}</td>
                                        ) : isLeftAbsent ? (
                                            <td colSpan="2" style={getCellStyling('absent')}>ABSENT</td>
                                        ) : (
                                            <>
                                                <td className={row.leftState.slot1Text === 'P' ? 'fw-bold p-highlight-cell border border-dark' : ''}>
                                                    {row.leftState.slot1Text}
                                                </td>
                                                <td className={row.leftState.slot2Text === 'P' ? 'fw-bold p-highlight-cell border border-dark' : ''}>
                                                    {row.leftState.slot2Text}
                                                </td>
                                            </>
                                        )}
                                        <td></td>
                                        <td className="bg-white border-0 separator-col"></td>
                                        <td className="fw-semibold bg-light">{row.rightDate}</td>
                                        {isRightNone ? (
                                            <td colSpan="2"></td>
                                        ) : isRightHoliday ? (
                                            <td colSpan="2" style={{ ...getCellStyling('holiday'), fontSize: '8.5px' }}>{row.rightState.text}</td>
                                        ) : isRightAbsent ? (
                                            <td colSpan="2" style={getCellStyling('absent')}>ABSENT</td>
                                        ) : (
                                            <>
                                                <td className={row.rightState.slot1Text === 'P' ? 'fw-bold p-highlight-cell border border-dark' : ''}>
                                                    {row.rightState.slot1Text}
                                                </td>
                                                <td className={row.rightState.slot2Text === 'P' ? 'fw-bold p-highlight-cell border border-dark' : ''}>
                                                    {row.rightState.slot2Text}
                                                </td>
                                            </>
                                        )}
                                        <td></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Overtime Section */}
                <div>
                    <div className="text-center bg-secondary text-white py-1 mb-2 border border-dark">
                        <span className="fw-bold text-uppercase sheet-banner-title">
                            {employee.name} - {monthNames[selectedMonth]} {selectedYear} ( Overtime Calculation )
                        </span>
                    </div>

                    <table className="table table-bordered border-dark text-center align-middle mb-0 custom-ledger-table">
                        <thead>
                            <tr className="table-secondary border-dark">
                                <th style={{ width: '15%' }}>Date</th>
                                <th style={{ width: '15%' }}>Hours</th>
                                <th style={{ width: '19%' }}>Remarks</th>
                                <th className="bg-white border-0 separator-col"></th>
                                <th style={{ width: '15%' }}>Date</th>
                                <th style={{ width: '15%' }}>Hours</th>
                                <th style={{ width: '19%' }}>Remarks</th>
                            </tr>
                        </thead>
                        <tbody>
                            {otMatrix.map((row, index) => {
                                const isLeftNone = row.leftState.type === 'none';
                                const isRightNone = row.rightState.type === 'none';
                                const isLeftHoliday = row.leftState.type === 'holiday';
                                const isRightHoliday = row.rightState.type === 'holiday';
                                const isLeftAbsent = row.leftState.type === 'absent';
                                const isRightAbsent = row.rightState.type === 'absent';

                                return (
                                    <tr key={index} className="border-dark">
                                        <td className="fw-semibold bg-light">{row.leftDate}</td>
                                        {isLeftNone ? (
                                            <td></td>
                                        ) : isLeftHoliday ? (
                                            <td style={{ ...getCellStyling('holiday'), fontSize: '8.5px' }}>{row.leftState.text}</td>
                                        ) : isLeftAbsent ? (
                                            <td style={getCellStyling('absent')}>{row.leftState.text}</td>
                                        ) : (
                                            <td>{row.leftState.text}</td>
                                        )}
                                        <td></td>
                                        <td className="bg-white border-0 separator-col"></td>
                                        <td className="fw-semibold bg-light">{row.rightDate}</td>
                                        {isRightNone ? (
                                            <td></td>
                                        ) : isRightHoliday ? (
                                            <td style={{ ...getCellStyling('holiday'), fontSize: '8.5px' }}>{row.rightState.text}</td>
                                        ) : isRightAbsent ? (
                                            <td style={getCellStyling('absent')}>{row.rightState.text}</td>
                                        ) : (
                                            <td>{row.rightState.text}</td>
                                        )}
                                        <td></td>
                                    </tr>
                                );
                            })}
                            <tr className="table-light border-dark fw-bold total-hours-row">
                                <td colSpan="3" className="text-end pe-3 total-hours-text">Total Hours:</td>
                                <td className="bg-white border-0 separator-col"></td>
                                <td colSpan="2" className="text-start ps-2 total-hours-val">{totalOT}</td>
                                <td></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    // Extended year options array from 2024 to 2030
    const yearsList = ['2024', '2025', '2026', '2027', '2028', '2029', '2030'];

    return (
        <div className="container-fluid px-4 py-4 bg-light min-vh-100">
            <style>{`
                .sheet-banner-title {
                    font-size: 11px;
                    letter-spacing: 0.6px;
                }
                .custom-ledger-table {
                    font-size: 10px !important;
                    width: 100% !important;
                    table-layout: fixed !important;
                }
                .custom-ledger-table th, 
                .custom-ledger-table td {
                    height: 22px !important;
                    padding: 1px 4px !important;
                    vertical-align: middle !important;
                    line-height: 1 !important;
                }
                .separator-col {
                    width: 4px !important;
                    padding: 0 !important;
                }

                .total-hours-row td {
                    height: 24px !important;
                    font-size: 11.5px !important;
                    font-weight: 700 !important;
                }

                .print-page-wrapper {
                    background: #fff;
                    width: 100%;
                    box-sizing: border-box;
                    padding: 15px;
                }

                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 10mm 12mm 10mm 12mm !important;
                    }

                    html, body {
                        width: 100% !important;
                        height: auto !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: #fff !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        overflow: visible !important;
                    }

                    body * {
                        visibility: hidden !important;
                    }

                    .main-app-card, 
                    .container-fluid {
                        padding: 0 !important;
                        margin: 0 !important;
                        border: none !important;
                        box-shadow: none !important;
                        background: transparent !important;
                    }

                    .print-container, .print-container * {
                        visibility: visible !important;
                    }

                    .print-container {
                        position: static !important;
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        border: none !important;
                        box-shadow: none !important;
                        background: #fff !important;
                    }

                    /* FIX FOR SINGLE-PAGE MOBILE PRINTING */
                    .single-print-active .no-print,
                    .single-print-active .main-app-card,
                    .single-print-active .container-fluid {
                        display: none !important;
                        height: 0 !important;
                        max-height: 0 !important;
                        overflow: hidden !important;
                    }

                    .single-print-active, 
                    .single-print-active body {
                        height: 100vh !important;
                        max-height: 100vh !important;
                        overflow: hidden !important;
                    }

                    .no-print {
                        display: none !important;
                    }

                    .print-page-wrapper {
                        display: block !important;
                        page-break-after: always !important;
                        break-after: page !important;
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                        width: 100% !important;
                        height: auto !important;
                        box-sizing: border-box !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: #fff !important;
                    }

                    .print-page-wrapper:only-child,
                    .print-page-wrapper:last-child {
                        page-break-after: avoid !important;
                        break-after: avoid !important;
                        page-break-before: avoid !important;
                        break-before: avoid !important;
                    }

                    .sheet-banner-title {
                        font-size: 10.5px !important;
                    }

                    .custom-ledger-table {
                        font-size: 9.5px !important;
                    }

                    .custom-ledger-table th, 
                    .custom-ledger-table td {
                        height: 20px !important;
                        padding: 1px 3px !important;
                    }

                    .total-hours-row td {
                        height: 22px !important;
                        font-size: 11px !important;
                    }

                    .table-secondary {
                        background-color: #d1d5db !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }

                    .p-highlight-cell {
                        background-color: #e5e7eb !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                }

                .table-secondary {
                    background-color: #d1d5db !important;
                }
                .p-highlight-cell {
                    background-color: #f3f4f6;
                }
            `}</style>

            <div className={`card main-app-card shadow-sm border-0 p-4 bg-white text-dark mx-auto ${reportData && bulkReports.length === 0 ? 'single-print-active' : ''}`} style={{ maxWidth: '1200px' }}>
                <h3 className="fw-bold mb-4 no-print">Accountant Workspace & Salary Statements</h3>
                
                {error && <div className="alert alert-danger py-2 mb-3 no-print">{error}</div>}

                <div className="row g-3 align-items-end mb-4 no-print">
                    <div className="col-12 col-sm-3">
                        <label className="small fw-bold text-muted">Employee Profile</label>
                        <select 
                            className="form-select" 
                            value={selectedEmployee} 
                            onChange={(e) => {
                                setSelectedEmployee(e.target.value);
                                setReportData(null);
                                setBulkReports([]);
                            }}
                        >
                            {employees.map(e => <option key={e._id} value={e._id}>{e.name}</option>)}
                        </select>
                    </div>
                    <div className="col-6 col-sm-2">
                        <label className="small fw-bold text-muted">Month</label>
                        <select className="form-select" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
                            {Object.keys(monthNames).map(m => <option key={m} value={m}>{monthNames[m]} ({m})</option>)}
                        </select>
                    </div>
                    <div className="col-6 col-sm-2">
                        <label className="small fw-bold text-muted">Year</label>
                        <select className="form-select" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
                            {yearsList.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                    <div className="col-12 col-sm-5 d-flex gap-2">
                        <button className="btn btn-dark fw-bold flex-fill d-flex align-items-center justify-content-center gap-2" onClick={fetchSingleEmployeeReport} disabled={loading || !selectedEmployee}>
                            <Search size={16} /> {loading ? 'Loading...' : 'Fetch Statements'}
                        </button>
                        <button className="btn btn-outline-secondary fw-bold d-flex align-items-center justify-content-center gap-2" onClick={handleOpenBulkModal}><Package size={16} /> Bulk Sheet</button>
                    </div>
                </div>

                {/* Bulk Print Modal Popup */}
                {bulkModalOpen && (
                    <div className="modal show fade d-block no-print" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                        <div className="modal-dialog modal-dialog-centered modal-lg">
                            <div className="modal-content shadow">
                                <div className="modal-header bg-dark text-white">
                                    <h5 className="modal-title fw-bold">Bulk Statement Generator ({monthNames[selectedMonth]} {selectedYear})</h5>
                                    <button type="button" className="btn-close btn-close-white" onClick={() => setBulkModalOpen(false)}></button>
                                </div>
                                <div className="modal-body p-4">
                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                        <p className="small text-muted mb-0">Select employees to include in bulk printing:</p>
                                        <button className="btn btn-sm btn-outline-dark fw-semibold" onClick={handleSelectAllBulk}>
                                            {bulkSelectedIds.length === employees.length ? 'Deselect All' : 'Select All'}
                                        </button>
                                    </div>
                                    
                                    <div className="row g-2 border rounded p-3 bg-light mb-4" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                        {employees.map(emp => {
                                            const isChecked = bulkSelectedIds.includes(emp._id);
                                            return (
                                                <div key={emp._id} className="col-6 col-md-4">
                                                    <div 
                                                        className={`p-2 border rounded bg-white d-flex align-items-center gap-2 cursor-pointer ${isChecked ? 'border-dark fw-bold' : 'text-muted'}`}
                                                        onClick={() => toggleBulkEmployee(emp._id)}
                                                        style={{ cursor: 'pointer' }}
                                                    >
                                                        {isChecked ? <CheckSquare size={18} className="text-dark" /> : <Square size={18} className="text-secondary" />}
                                                        <span className="text-truncate">{emp.name}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="d-flex justify-content-end gap-2">
                                        <button className="btn btn-outline-secondary fw-bold" onClick={() => setBulkModalOpen(false)}>Cancel</button>
                                        <button className="btn btn-dark fw-bold d-flex align-items-center gap-2" onClick={handleTriggerBulkPrint} disabled={bulkSelectedIds.length === 0 || bulkLoading}>
                                            <Printer size={16} /> {bulkLoading ? 'Preparing...' : `Print Selected Sheets (${bulkSelectedIds.length})`}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Single Employee View */}
                {reportData && reportData.employee && bulkReports.length === 0 && (
                    <div className="mt-2">
                        <div className="d-flex justify-content-end gap-2 mb-3 no-print">
                            <button className="btn btn-sm btn-outline-dark fw-bold d-flex align-items-center gap-1" onClick={triggerPaperPrintOperation}><Printer size={14} /> Print Sheet (A4)</button>
                        </div>

                        <div className="print-container border border-dark p-3 rounded shadow-sm bg-white">
                            {renderReportSheet(reportData.employee, reportData.logs)}
                        </div>
                    </div>
                )}

                {/* Bulk Print Container */}
                {bulkReports.length > 0 && (
                    <div className="print-container">
                        {bulkReports.map((rep) => renderReportSheet(rep.employee, rep.logs))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AccountantDashboard;