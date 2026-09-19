import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
    Calculator,
    Printer,
    CreditCard,
    PartyPopper,
    Edit3,
    PlusCircle,
    Trash2
} from 'lucide-react';

const SalaryCalculation = () => {
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);

    const toProperCase = (str) => {
        if (!str) return '';
        return str
            .toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    // Helper to format ISO/YYYY-MM-DD string to DD/MM/YYYY
    const formatDateToDDMMYYYY = (dateStr) => {
        if (!dateStr) return '';
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            const [year, month, day] = parts;
            return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
        }
        return dateStr;
    };

    const [employees, setEmployees] = useState([]);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState(queryParams.get('employeeId') || '');
    const [selectedMonth, setSelectedMonth] = useState(queryParams.get('month') || new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(queryParams.get('year') || new Date().getFullYear());

    const [payload, setPayload] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isPaid, setIsPaid] = useState(false);
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    
    const [salaryGivenBy, setSalaryGivenBy] = useState(() => {
        const loggedUser = localStorage.getItem('uf_username') || 'Admin';
        return toProperCase(loggedUser);
    });

    const [isPrintingMode, setIsPrintingMode] = useState(false);

    // Dynamic Adjustments (+ / - / Return Advance)
    const [adjustments, setAdjustments] = useState([]);
    const [adjModalOpen, setAdjModalOpen] = useState(false);
    const [adjDetails, setAdjDetails] = useState('');
    const [adjAmount, setAdjAmount] = useState('');
    const [adjType, setAdjType] = useState('add');
    const [editingAdjId, setEditingAdjId] = useState(null);

    const [customPaidAmount, setCustomPaidAmount] = useState('');

    const monthNames = {
        1: 'January', 2: 'February', 3: 'March', 4: 'April',
        5: 'May', 6: 'June', 7: 'July', 8: 'August',
        9: 'September', 10: 'October', 11: 'November', 12: 'December'
    };

    const getAuthHeaders = () => ({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('uf_token')}`,
        'x-username': localStorage.getItem('uf_username') || '',
        'x-role': localStorage.getItem('uf_role') || ''
    });

    useEffect(() => {
        const fetchEmployees = async () => {
            try {
                const res = await fetch('/api/employees?includeLeaved=true', { headers: getAuthHeaders() });
                if (res.ok) {
                    const data = await res.json();
                    const empList = Array.isArray(data) ? data : (data.employees || data.data || []);
                    setEmployees(empList);
                    if (!selectedEmployeeId && empList.length > 0) {
                        setSelectedEmployeeId(empList[0]._id);
                    }
                }
            } catch (err) {
                console.error('Error fetching employees:', err);
            }
        };
        fetchEmployees();
    }, []);

    const fetchStatementLedger = async (empId, m, y) => {
        const targetEmp = empId || selectedEmployeeId;
        const targetMonth = m || selectedMonth;
        const targetYear = y || selectedYear;

        if (!targetEmp || !targetMonth || !targetYear) return;

        setLoading(true);
        try {
            const res = await fetch(`/api/salary/statement?employeeId=${targetEmp}&month=${targetMonth}&year=${targetYear}`, {
                headers: getAuthHeaders()
            });
            const data = await res.json();
            setPayload(data);
            setIsPaid(false);
            setAdjustments([]);
            setCustomPaidAmount('');
        } catch (err) {
            console.error('Error fetching salary statement:', err);
            alert('Failed to load salary statement data.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const empId = queryParams.get('employeeId');
        const m = queryParams.get('month');
        const y = queryParams.get('year');
        if (empId && m && y) {
            fetchStatementLedger(empId, m, y);
        }
    }, [location.search]);

    const handleCalculateSubmit = (e) => {
        e.preventDefault();
        if (!selectedEmployeeId) {
            alert('Please select an employee');
            return;
        }
        fetchStatementLedger(selectedEmployeeId, selectedMonth, selectedYear);
    };

    // --- FORMULA LOGIC ---
    const monthlyBaseSalary = parseFloat(payload?.employee?.salary || 0);
    const hourlyRate = monthlyBaseSalary > 0 ? monthlyBaseSalary / (26 * 9) : 0;
    const totalWorkedHours = parseFloat(payload?.metrics?.totalWorkedHours || 0);
    const netSalary = totalWorkedHours * hourlyRate;

    // prevBalNum > 0 means employee owes debt to company
    // prevBalNum < 0 means company owes money to employee
    const prevBalNum = parseFloat(payload?.employee?.currentBalance || 0);

    // Rule: Positive company-due balance adds to salary automatically. Debt never auto-deducts.
    const autoAddedCompanyBalance = prevBalNum < 0 ? Math.abs(prevBalNum) : 0;

    const adjustmentsTotal = adjustments.reduce((sum, adj) => {
        const val = parseFloat(adj.amount) || 0;
        return adj.type === 'add' ? sum + val : sum - val;
    }, 0);

    const returnedAdvanceTotal = adjustments
        .filter(a => a.type === 'return_advance')
        .reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0);

    // Final Salary calculation
    const calculatedFinalSalary = netSalary + autoAddedCompanyBalance + adjustmentsTotal;

    // Default paid amount safely handles negative values
    const defaultPaidAmount = calculatedFinalSalary > 0 ? calculatedFinalSalary : 0;
    const actualPaidAmount = customPaidAmount !== '' ? parseFloat(customPaidAmount) : defaultPaidAmount;
    const salaryDifference = calculatedFinalSalary - actualPaidAmount;

    // --- STRICT RETURN ADVANCE LIMIT CAP ---
    const maxReturnLimit = Math.min(netSalary, prevBalNum > 0 ? prevBalNum : 0);

    const handleTypeChange = (newType) => {
        setAdjType(newType);
        if (newType === 'return_advance') {
            setAdjDetails('Return Advance');
            const cappedDefault = maxReturnLimit;
            setAdjAmount(cappedDefault > 0 ? parseFloat(cappedDefault.toFixed(2)) : '');
        }
    };

    const handleSaveAdjustment = () => {
        const numericAmount = parseFloat(adjAmount);

        if (!adjDetails.trim() || !adjAmount || isNaN(numericAmount) || numericAmount <= 0) {
            alert('Please enter a valid detail and positive amount.');
            return;
        }

        // STRICT GUARDRAIL: Block Return Advance if typed amount exceeds allowed limit
        if (adjType === 'return_advance' && numericAmount > maxReturnLimit) {
            alert(`Maximum allowed Return Advance for this payroll cycle is ₹${maxReturnLimit.toFixed(2)} (capped at lower of Net Salary or Total Debt).`);
            return;
        }

        if (editingAdjId) {
            setAdjustments(prev => prev.map(item => item.id === editingAdjId ? {
                ...item,
                details: adjDetails,
                amount: numericAmount,
                type: adjType
            } : item));
        } else {
            setAdjustments(prev => [...prev, {
                id: Date.now(),
                details: adjDetails,
                amount: numericAmount,
                type: adjType
            }]);
        }

        setAdjDetails('');
        setAdjAmount('');
        setEditingAdjId(null);
        setAdjModalOpen(false);
    };

    const handleEditAdjustment = (adj) => {
        setEditingAdjId(adj.id);
        setAdjDetails(adj.details);
        setAdjAmount(adj.amount);
        setAdjType(adj.type);
        setAdjModalOpen(true);
    };

    const handleDeleteAdjustment = (id) => {
        setAdjustments(prev => prev.filter(a => a.id !== id));
    };

    const handleGivenByChange = (e) => {
        setSalaryGivenBy(toProperCase(e.target.value));
    };

    const handleFinalPayoutLock = async () => {
        if (!salaryGivenBy.trim()) {
            alert('Please enter who is giving/issuing the salary.');
            return;
        }

        try {
            const payoutLogData = {
                employeeId: payload.employee._id,
                employeeName: payload.employee.name,
                month: Number(selectedMonth),
                year: Number(selectedYear),
                paymentDate: paymentDate,
                givenBy: salaryGivenBy.trim(),
                calculatedFinalSalary: calculatedFinalSalary,
                actualPaidAmount: actualPaidAmount,
                closingBalance: salaryDifference,
                salaryDifference: salaryDifference,
                returnedAdvanceAmount: returnedAdvanceTotal,
                createdBy: localStorage.getItem('uf_username') || 'Admin'
            };

            const res = await fetch('/api/salary/finalize', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(payoutLogData)
            });

            const resData = await res.json().catch(() => ({}));

            if (!res.ok) {
                throw new Error(resData.message || 'Transaction execution error');
            }

            setIsPaid(true);
            alert(`Salary finalized! Payment recorded by ${salaryGivenBy.trim()}.`);
        } catch (err) {
            alert(err.message);
        }
    };

    const executePrintLayout = () => {
        setIsPrintingMode(true);
        setTimeout(() => {
            window.print();
            setIsPrintingMode(false);
        }, 250);
    };

    const formatShiftTimeDisplay = (log) => {
        if (!log) return [];

        if (Array.isArray(log.sessions) && log.sessions.length > 0) {
            const sessionTimes = log.sessions
                .filter(s => s.inTime || s.checkIn)
                .map(s => {
                    const start = s.inTime || s.checkIn;
                    const end = s.outTime || s.checkOut || 'Active';
                    return `${start} - ${end}`;
                });
            if (sessionTimes.length > 0) return sessionTimes;
        }

        const checkIn = log.checkIn || log.inTime || log.startTime;
        const checkOut = log.checkOut || log.outTime || log.endTime;

        if (checkIn && checkOut) return [`${checkIn} - ${checkOut}`];
        if (checkIn) return [`${checkIn} - Active`];

        return [];
    };

    const renderAttendanceLogGrid = () => {
        if (!payload) return null;

        const logs = payload.logs || [];
        const totalDays = new Date(Number(selectedYear), Number(selectedMonth), 0).getDate();
        const configuredWeeklyOff = (payload.employee?.weeklyHoliday || 'Wednesday').trim().toLowerCase();
        const rows = [];

        const getLogForDay = (dayNum) => {
            const padDay = String(dayNum).padStart(2, '0');
            const padMonth = String(selectedMonth).padStart(2, '0');
            const dateStr = `${selectedYear}-${padMonth}-${padDay}`;
            return logs.find(l => l.date === dateStr);
        };

        const formatCell = (log, dayNum) => {
            if (dayNum > totalDays) {
                return { date: '', timeShifts: [], hours: '', isMerged: false, text: '' };
            }

            const padDay = String(dayNum).padStart(2, '0');
            const padMonth = String(selectedMonth).padStart(2, '0');
            const dateFormatted = `${padDay}/${padMonth}/${selectedYear}`;

            const dayObj = new Date(Date.UTC(Number(selectedYear), Number(selectedMonth) - 1, dayNum));
            const dayName = dayObj.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
            const isWeeklyOff = dayName.toLowerCase() === configuredWeeklyOff;

            const shiftsArray = formatShiftTimeDisplay(log);
            const hasWorked = shiftsArray.length > 0 || (log && log.status === 'Present') || (log && (log.totalDailyHours > 0 || log.hours > 0));

            if (isWeeklyOff || (log && log.status === 'Holiday')) {
                if (hasWorked) {
                    const hoursVal = log.totalDailyHours || log.totalHours || log.hours || '';
                    return {
                        date: dateFormatted,
                        timeShifts: shiftsArray.length > 0 ? shiftsArray : ['Present'],
                        hours: hoursVal,
                        isMerged: false
                    };
                }
                return { date: dateFormatted, isMerged: true, text: `${dayName} (Holiday)` };
            }

            if (!log || log.status === 'Absent' || !hasWorked) {
                return { date: dateFormatted, isMerged: true, text: 'Absent' };
            }

            const hoursVal = log.totalDailyHours || log.totalHours || log.hours || '';
            return {
                date: dateFormatted,
                timeShifts: shiftsArray.length > 0 ? shiftsArray : ['Present'],
                hours: hoursVal,
                isMerged: false
            };
        };

        for (let i = 1; i <= 16; i++) {
            const leftDay = i;
            const rightDay = i + 16;

            const leftData = formatCell(getLogForDay(leftDay), leftDay);
            const rightData = formatCell(getLogForDay(rightDay), rightDay);

            rows.push({ leftData, rightData });
        }

        return (
            <div className="table-responsive print-table-container">
                <table className="table table-bordered border-dark text-center align-middle print-table">
                    <thead>
                        <tr className="table-secondary border-dark">
                            <th style={{ width: '13%' }}>Date</th>
                            <th style={{ width: '30%' }}>Time</th>
                            <th style={{ width: '6%' }}>Hours</th>
                            <th style={{ width: '2%' }} className="bg-white border-0"></th>
                            <th style={{ width: '13%' }}>Date</th>
                            <th style={{ width: '30%' }}>Time</th>
                            <th style={{ width: '6%' }}>Hours</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, idx) => (
                            <tr key={idx} className="border-dark">
                                <td>{row.leftData.date}</td>
                                {row.leftData.isMerged ? (
                                    <td colSpan={2} className="fw-semibold">{row.leftData.text}</td>
                                ) : (
                                    <>
                                        <td className="time-cell">
                                            {row.leftData.timeShifts?.map((shift, sIdx) => (
                                                <span key={sIdx} className="d-inline-block me-1">{shift}</span>
                                            ))}
                                        </td>
                                        <td>{row.leftData.hours}</td>
                                    </>
                                )}
                                <td className="bg-white border-0"></td>
                                <td>{row.rightData.date}</td>
                                {row.rightData.isMerged ? (
                                    <td colSpan={2} className="fw-semibold">{row.rightData.text}</td>
                                ) : (
                                    <>
                                        <td className="time-cell">
                                            {row.rightData.timeShifts?.map((shift, sIdx) => (
                                                <span key={sIdx} className="d-inline-block me-1">{shift}</span>
                                            ))}
                                        </td>
                                        <td>{row.rightData.hours}</td>
                                    </>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    const monthsList = Object.keys(monthNames).map(k => ({ value: Number(k), name: `${monthNames[k]} (${String(k).padStart(2, '0')})` }));
    const years = Array.from({ length: 7 }, (_, i) => 2024 + i);

    return (
        <div className="container pb-5">
            {/* Print Overrides: Full Width A4, No Overflow Scrollbars */}
            <style>{`
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 6mm 8mm;
                    }
                    html, body, #root, .container, .desktop-centered-ledger {
                        background-color: #fff !important;
                        color: #000 !important;
                        font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        height: auto !important;
                        overflow: visible !important;
                    }
                    .no-print, nav, header, footer, .modal {
                        display: none !important;
                    }
                    #printable-area {
                        width: 100% !important;
                        max-width: 100% !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        border: none !important;
                        box-shadow: none !important;
                    }
                    .print-header {
                        margin-bottom: 6px !important;
                        padding-bottom: 4px !important;
                        border-bottom: 1.5px solid #000 !important;
                    }
                    .print-header h5 {
                        font-size: 16px !important;
                        font-weight: 700 !important;
                    }
                    .print-table-container {
                        margin-bottom: 8px !important;
                        overflow: visible !important;
                        overflow-x: visible !important;
                        width: 100% !important;
                    }
                    .print-table {
                        width: 100% !important;
                        max-width: 100% !important;
                        margin-bottom: 0 !important;
                        table-layout: fixed !important;
                    }
                    .print-table th, .print-table td {
                        padding: 2.5px 3px !important;
                        font-size: 10.5px !important;
                        border: 1px solid #000 !important;
                        line-height: 1.15 !important;
                        overflow: hidden !important;
                        text-overflow: ellipsis !important;
                    }
                    .print-table th {
                        background-color: #e9ecef !important;
                        font-weight: bold !important;
                    }
                    .time-cell {
                        white-space: nowrap !important;
                        font-size: 9.5px !important;
                    }
                    .summary-box {
                        border: 1px solid #000 !important;
                        padding: 6px 12px !important;
                        margin-bottom: 8px !important;
                        background-color: #f8f9fa !important;
                        page-break-inside: avoid !important;
                        width: 100% !important;
                    }
                    .summary-box .row {
                        padding-top: 2px !important;
                        padding-bottom: 2px !important;
                        font-size: 12px !important;
                    }
                    .summary-box .final-salary-row {
                        padding-top: 4px !important;
                        padding-bottom: 4px !important;
                        font-size: 14px !important;
                        font-weight: bold !important;
                    }
                    .payment-footer {
                        border: 1px solid #000 !important;
                        padding: 6px 12px !important;
                        page-break-inside: avoid !important;
                        width: 100% !important;
                    }
                    .payment-footer .alert {
                        padding: 6px !important;
                        margin-bottom: 0 !important;
                        font-size: 12px !important;
                        border: 1px solid #000 !important;
                    }
                    .print-only-inline {
                        display: inline-block !important;
                    }
                }
            `}</style>

            {/* Top Selection Form Bar */}
            <div className="card shadow-sm border-0 p-3 bg-white mb-4 no-print">
                <form onSubmit={handleCalculateSubmit} className="row g-3 align-items-end">
                    <div className="col-12 col-md-4">
                        <label className="form-label fw-bold text-secondary small mb-1">Employee Profile</label>
                        <select
                            className="form-select"
                            value={selectedEmployeeId}
                            onChange={(e) => setSelectedEmployeeId(e.target.value)}
                        >
                            <option value="">-- Select Employee --</option>
                            {employees.map(emp => (
                                <option key={emp._id} value={emp._id}>{emp.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="col-12 col-md-3">
                        <label className="form-label fw-bold text-secondary small mb-1">Month</label>
                        <select
                            className="form-select"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        >
                            {monthsList.map(m => (
                                <option key={m.value} value={m.value}>{m.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="col-12 col-md-2">
                        <label className="form-label fw-bold text-secondary small mb-1">Year</label>
                        <select
                            className="form-select"
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                        >
                            {years.map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>

                    <div className="col-12 col-md-3">
                        <button type="submit" className="btn btn-dark w-100 fw-bold d-flex align-items-center justify-content-center gap-2 py-2">
                            <Calculator size={18} /> Calculate Salary
                        </button>
                    </div>
                </form>
            </div>

            {/* Main Statement Calculation Card */}
            {loading ? (
                <div className="text-center py-5 text-muted">
                    <div className="spinner-border text-dark mb-2" role="status"></div>
                    <div>Compiling dynamic financial metrics ledger fields...</div>
                </div>
            ) : payload ? (
                <div className="desktop-centered-ledger text-dark">
                    <div className="card shadow border-0 p-4 bg-white" id="printable-area">
                        {/* Statement Title Header */}
                        <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom print-header">
                            <div className="text-start">
                                <h5 className="fw-bold mb-0">
                                    {payload.employee.name} ({monthNames[selectedMonth]} {selectedYear})
                                    <span className="no-print"> - Monthly Salary : ₹{monthlyBaseSalary.toLocaleString()}</span>
                                </h5>
                            </div>
                            <button
                                className={`btn fw-bold px-4 text-uppercase d-flex align-items-center gap-2 no-print ${isPrintingMode ? 'btn-success' : 'btn-dark'}`}
                                onClick={executePrintLayout}
                            >
                                <Printer size={18} /> Print Statement
                            </button>
                        </div>

                        {/* Attendance Log Table Grid */}
                        {renderAttendanceLogGrid()}

                        {/* Calculation Summary Table */}
                        <div className="border border-dark rounded p-3 bg-light mb-3 summary-box">
                            <div className="row py-1 border-bottom border-dark">
                                <div className="col-7 text-start fw-bold">Total Hours Worked:</div>
                                <div className="col-5 text-end fw-bold">{totalWorkedHours} Hours</div>
                            </div>

                            <div className="row py-1 border-bottom border-dark">
                                <div className="col-7 text-start">Net Salary:</div>
                                <div className="col-5 text-end text-success fw-bold">₹{netSalary.toFixed(2)}</div>
                            </div>

                            {/* Previous Balance / Debt Display */}
                            <div className="row py-1 border-bottom border-dark align-items-center">
                                <div className="col-7 text-start">
                                    {prevBalNum > 0 ? 'Advance Debt Owed (-):' : 'Previous Balance Dues (+):'}
                                </div>
                                <div className="col-5 text-end">
                                    <span className={`fw-bold ${prevBalNum > 0 ? 'text-danger' : 'text-success'}`}>
                                        {prevBalNum > 0 ? `-₹${prevBalNum.toLocaleString()}` : `+₹${Math.abs(prevBalNum).toLocaleString()}`}
                                    </span>
                                </div>
                            </div>

                            {/* Dynamic Custom Adjustments */}
                            {adjustments.map(adj => (
                                <div className="row py-1 border-bottom border-dark text-muted small align-items-center" key={adj.id}>
                                    <div className="col-7 text-start d-flex align-items-center gap-2">
                                        <div className="d-flex align-items-center gap-1 no-print">
                                            <button className="btn btn-link p-0 text-primary" onClick={() => handleEditAdjustment(adj)}><Edit3 size={14} /></button>
                                            <button className="btn btn-link p-0 text-danger ms-1" onClick={() => handleDeleteAdjustment(adj.id)}><Trash2 size={14} /></button>
                                        </div>
                                        <span className="text-dark fw-semibold">{adj.details}:</span>
                                    </div>
                                    <div className={`col-5 text-end fw-bold ${adj.type === 'add' ? 'text-success' : 'text-danger'}`}>
                                        {adj.type === 'add' ? '+' : '-'}₹{parseFloat(adj.amount).toLocaleString()}
                                    </div>
                                </div>
                            ))}

                            {/* Trigger Modal Button + / - */}
                            <div className="text-center my-1 no-print">
                                <button
                                    type="button"
                                    className="btn btn-sm btn-outline-dark fw-bold border-dashed d-inline-flex align-items-center gap-1 px-3"
                                    onClick={() => {
                                        setEditingAdjId(null);
                                        setAdjDetails('');
                                        setAdjAmount('');
                                        setAdjType('add');
                                        setAdjModalOpen(true);
                                    }}
                                >
                                    <PlusCircle size={15} /> + / -
                                </button>
                            </div>

                            {/* Final Salary Line */}
                            <div className="row py-2 border-top border-bottom border-dark bg-dark bg-opacity-10 align-items-center mt-1 final-salary-row">
                                <div className="col-7 text-start fw-bold mb-0">Final Salary:</div>
                                <div className={`col-5 text-end fw-bold mb-0 ${calculatedFinalSalary >= 0 ? 'text-primary' : 'text-danger'}`}>
                                    ={calculatedFinalSalary >= 0 ? '' : '-'}₹{Math.abs(calculatedFinalSalary).toFixed(2)}
                                </div>
                            </div>

                            {/* Paid Amount Line */}
                            <div className="row py-1 border-bottom border-dark align-items-center mt-1">
                                <div className="col-7 text-start">
                                    Paid Amount ({formatDateToDDMMYYYY(paymentDate)} by {salaryGivenBy || 'Admin'}):
                                </div>
                                <div className="col-5 text-end">
                                    {!isPaid ? (
                                        <>
                                            <input
                                                type="number"
                                                className="form-control form-control-sm text-end fw-bold text-success d-inline-block no-print"
                                                style={{ maxWidth: '140px' }}
                                                placeholder={`₹${defaultPaidAmount.toFixed(2)}`}
                                                value={customPaidAmount}
                                                onChange={(e) => setCustomPaidAmount(e.target.value)}
                                            />
                                            <span className="text-success fw-bold d-none print-only-inline">
                                                ₹{actualPaidAmount.toFixed(2)}
                                            </span>
                                        </>
                                    ) : (
                                        <span className="text-success fw-bold">₹{actualPaidAmount.toFixed(2)}</span>
                                    )}
                                </div>
                            </div>

                            {/* Closing Balance (Payable) */}
                            <div className="row py-1 border-top border-dark align-items-center mt-1">
                                <div className="col-7 text-start fw-bold mb-0">Closing Balance (Payable):</div>
                                <div className={`col-5 text-end fw-bold mb-0 ${salaryDifference >= 0 ? 'text-success' : 'text-danger'}`}>
                                    {salaryDifference >= 0 ? '+' : ''}₹{salaryDifference.toFixed(2)}
                                </div>
                            </div>
                        </div>

                        {/* Payment Confirmation Footer */}
                        <div className="p-2 border border-dark rounded bg-white payment-footer">
                            {isPaid ? (
                                <div className="alert alert-success border-2 text-center fw-bold mb-0 py-2 d-flex align-items-center justify-content-center gap-2">
                                    <PartyPopper size={18} className="no-print" />
                                    <span>The amount of Rs. {actualPaidAmount.toFixed(2)}/- was paid on {formatDateToDDMMYYYY(paymentDate)} by {salaryGivenBy}</span>
                                </div>
                            ) : (
                                <>
                                    <div className="row g-3 align-items-end justify-content-between no-print">
                                        <div className="col-12 col-md-4">
                                            <label className="small fw-bold text-muted mb-1">Select Payment Execution Date</label>
                                            <input type="date" className="form-control" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
                                        </div>

                                        <div className="col-12 col-md-4">
                                            <label className="small fw-bold text-muted mb-1">Salary Given By</label>
                                            <input
                                                type="text"
                                                className="form-control fw-semibold"
                                                placeholder="Issuer Name (e.g. Vimal Paun)"
                                                value={salaryGivenBy}
                                                onChange={handleGivenByChange}
                                            />
                                        </div>

                                        <div className="col-12 col-md-4">
                                            <button className="btn btn-success w-100 fw-bold text-uppercase py-2 d-flex align-items-center justify-content-center gap-2" onClick={handleFinalPayoutLock}>
                                                <CreditCard size={18} /> Mark As Finalized & Paid
                                            </button>
                                        </div>
                                    </div>
                                    <div className="d-none print-only-inline w-100 text-center fw-bold py-1">
                                        Status: Pending Finalization (Unpaid)
                                    </div>
                                </>
                            )}
                        </div>

                        {/* 
                            <div className="text-center mt-2 text-muted small border-top border-dark pt-2 footer-tag">
                                Kishor Offset Ledger Infrastructure Pipeline • July 2026
                            </div> 
                        */}
                    </div>
                </div>
            ) : (
                <div className="text-center py-5 text-muted card border-0 shadow-sm p-4">
                    <h5>Please select an employee and billing period above, then click <strong>Calculate Salary</strong>.</h5>
                </div>
            )}

            {/* Modal for + / - / Return Advance Adjustments */}
            {adjModalOpen && (
                <div className="modal show fade d-block no-print" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content shadow">
                            <div className="modal-header bg-dark text-white">
                                <h5 className="modal-title fw-bold">{editingAdjId ? 'Edit Adjustment' : 'Add Adjustment (+ / -)'}</h5>
                                <button type="button" className="btn-close btn-close-white" onClick={() => setAdjModalOpen(false)}></button>
                            </div>
                            <div className="modal-body p-4">
                                <div className="mb-3">
                                    <label className="form-label small fw-bold text-muted d-block mb-2">Type</label>
                                    <div className="d-flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            className={`btn btn-sm fw-bold px-3 py-2 ${
                                                adjType === 'add'
                                                    ? 'btn-success shadow-sm'
                                                    : 'btn-outline-success'
                                            }`}
                                            onClick={() => handleTypeChange('add')}
                                        >
                                            + Addition
                                        </button>

                                        <button
                                            type="button"
                                            className={`btn btn-sm fw-bold px-3 py-2 ${
                                                adjType === 'deduct'
                                                    ? 'btn-danger shadow-sm'
                                                    : 'btn-outline-danger'
                                            }`}
                                            onClick={() => handleTypeChange('deduct')}
                                        >
                                            - Deduction
                                        </button>

                                        <button
                                            type="button"
                                            className={`btn btn-sm fw-bold px-3 py-2 ${
                                                adjType === 'return_advance'
                                                    ? 'btn-warning text-dark shadow-sm'
                                                    : 'btn-outline-warning text-dark'
                                            }`}
                                            onClick={() => handleTypeChange('return_advance')}
                                        >
                                            - Return Advance
                                        </button>
                                    </div>
                                </div>

                                <div className="mb-3">
                                    <label className="form-label small fw-bold text-muted">Details / Reason</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="e.g. Transport, Bonus, Penalty"
                                        value={adjDetails}
                                        onChange={(e) => setAdjDetails(e.target.value)}
                                        readOnly={adjType === 'return_advance'}
                                    />
                                </div>

                                <div className="mb-3">
                                    <label className="form-label small fw-bold text-muted">Amount (₹)</label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        placeholder="e.g. 4190"
                                        value={adjAmount}
                                        max={adjType === 'return_advance' ? maxReturnLimit : undefined}
                                        onChange={(e) => setAdjAmount(e.target.value)}
                                    />
                                    {adjType === 'return_advance' && (
                                        <div className="form-text text-muted small mt-1">
                                            Maximum allowed return deduction: <strong className="text-dark">₹{maxReturnLimit.toFixed(2)}</strong>
                                        </div>
                                    )}
                                </div>

                                <div className="d-flex justify-content-end gap-2 mt-4">
                                    <button className="btn btn-outline-secondary fw-bold" onClick={() => setAdjModalOpen(false)}>Cancel</button>
                                    <button className="btn btn-dark fw-bold" onClick={handleSaveAdjustment}>Save Adjustment</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SalaryCalculation;