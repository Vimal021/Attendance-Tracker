import Attendance from '../models/Attendance.js';
import Employee from '../models/Employee.js';

// Helper to check if a date string (YYYY-MM-DD) is today's date
const isCurrentDate = (dateStr) => {
    const today = new Date();
    const tYear = today.getFullYear();
    const tMonth = String(today.getMonth() + 1).padStart(2, '0');
    const tDay = String(today.getDate()).padStart(2, '0');
    const todayStr = `${tYear}-${tMonth}-${tDay}`;
    return dateStr === todayStr;
};

// Midnight Cross Arithmetic engine
const calculateSessionHours = (inTime, outTime) => {
    const parseTimeToMinutes = (timeStr) => {
        let hours = 0, minutes = 0;
        const cleanStr = timeStr.trim().toUpperCase();

        if (cleanStr.includes('AM') || cleanStr.includes('PM')) {
            const [timePart, modifier] = cleanStr.split(' ');
            let [h, m] = timePart.split(':').map(Number);
            if (modifier === 'PM' && h !== 12) h += 12;
            if (modifier === 'AM' && h === 12) h = 0;
            hours = h;
            minutes = m;
        } else {
            [hours, minutes] = cleanStr.split(':').map(Number);
        }
        return hours * 60 + minutes;
    };

    let inMinutes = parseTimeToMinutes(inTime);
    let outMinutes = parseTimeToMinutes(outTime);

    // If Out-Time is numerically less than In-Time, add 24 hours (1440 minutes) to resolve midnight crossovers
    if (outMinutes < inMinutes) {
        outMinutes += 24 * 60;
    }

    return parseFloat(((outMinutes - inMinutes) / 60).toFixed(2));
};

export const saveAttendance = async (req, res) => {
    try {
        const { employeeId, date, sessions, status, isOvertimeHandled } = req.body;
        const operator = req.user.username;
        const userRole = req.user.role;

        // Enforce restriction for Regular Staff: they can only manage attendance for the current date
        if (userRole === 'Regular Staff' && !isCurrentDate(date)) {
            return res.status(403).json({ message: 'Forbidden: Regular Staff do not possess privileges to modify past attendance records' });
        }

        const employee = await Employee.findById(employeeId);
        if (!employee) return res.status(404).json({ message: 'Employee reference invalid' });

        let totalDailyHours = 0;
        let computedSessions = [];

        if (status === 'Present' || status === 'Working Holiday') {
            if (!sessions || sessions.length === 0) {
                return res.status(400).json({ message: 'Active work shifts require at least one time slot entry' });
            }

            for (let s of sessions) {
                const hrs = calculateSessionHours(s.inTime, s.outTime);
                totalDailyHours += hrs;
                computedSessions.push({ inTime: s.inTime, outTime: s.outTime, hours: hrs });
            }
        }

        const dateObj = new Date(date);
        const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
        const isScheduledHoliday = employee.weeklyHoliday === dayName;

        let finalStatus = status;
        let isOvertime = false;
        let overtimeHours = 0;

        if (isScheduledHoliday || isOvertimeHandled) {
            finalStatus = totalDailyHours > 0 ? 'Working Holiday' : 'Holiday';
            isOvertime = totalDailyHours > 0;
            overtimeHours = totalDailyHours;
        } else if (finalStatus === 'Present') {
            if (totalDailyHours > 8) {
                isOvertime = true;
                overtimeHours = totalDailyHours - 8;
            }
        }

        let record = await Attendance.findOne({ employee: employeeId, date });

        if (record) {
            record.sessions = computedSessions;
            record.totalDailyHours = totalDailyHours;
            record.status = finalStatus;
            record.isOvertime = isOvertime;
            record.overtimeHours = overtimeHours;
            record.editedBy = operator;
            await record.save();
        } else {
            record = await Attendance.create({
                employee: employeeId,
                date,
                sessions: computedSessions,
                totalDailyHours,
                status: finalStatus,
                isOvertime,
                overtimeHours,
                markedBy: operator
            });
        }

        res.status(200).json(record);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const saveAllBulkAttendance = async (req, res) => {
    try {
        const { date, records } = req.body;
        const operator = req.user.username;
        const userRole = req.user.role;

        if (userRole === 'Regular Staff' && !isCurrentDate(date)) {
            return res.status(403).json({ message: 'Forbidden: Regular Staff do not possess privileges to modify past attendance records' });
        }

        const savedLogs = [];
        const activeEmployees = await Employee.find({ status: 'Active' });

        for (let emp of activeEmployees) {
            const inputMatch = records.find(r => r.employeeId === emp._id.toString());

            const dateObj = new Date(date);
            const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
            const isScheduledHoliday = emp.weeklyHoliday === dayName;

            let finalStatus = 'Absent';
            let sessions = [];
            let totalDailyHours = 0;
            let isOvertime = false;
            let overtimeHours = 0;

            if (isScheduledHoliday) {
                finalStatus = 'Holiday';
            }

            if (inputMatch && (inputMatch.status === 'Present' || inputMatch.status === 'Working Holiday')) {
                finalStatus = inputMatch.status;
                totalDailyHours = 0;

                for (let s of inputMatch.sessions || []) {
                    const hrs = calculateSessionHours(s.inTime, s.outTime);
                    totalDailyHours += hrs;
                    sessions.push({ inTime: s.inTime, outTime: s.outTime, hours: hrs });
                }

                if (isScheduledHoliday || inputMatch.isOvertimeHandled) {
                    finalStatus = totalDailyHours > 0 ? 'Working Holiday' : 'Holiday';
                    isOvertime = totalDailyHours > 0;
                    overtimeHours = totalDailyHours;
                } else if (totalDailyHours > 8) {
                    isOvertime = true;
                    overtimeHours = totalDailyHours - 8;
                }
            } else if (inputMatch && inputMatch.status === 'Absent') {
                finalStatus = 'Absent';
            }

            let log = await Attendance.findOne({ employee: emp._id, date });
            if (log) {
                log.sessions = sessions;
                log.totalDailyHours = totalDailyHours;
                log.status = finalStatus;
                log.isOvertime = isOvertime;
                log.overtimeHours = overtimeHours;
                log.editedBy = operator;
                await log.save();
            } else {
                log = await Attendance.create({
                    employee: emp._id,
                    date,
                    sessions,
                    totalDailyHours,
                    status: finalStatus,
                    isOvertime,
                    overtimeHours,
                    markedBy: operator
                });
            }
            savedLogs.push(log);
        }

        res.status(200).json({ message: 'Bulk processing completed successfully', count: savedLogs.length });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getDailyAttendanceMetrics = async (req, res) => {
    try {
        const { date } = req.query; // YYYY-MM-DD
        if (!date) return res.status(400).json({ message: 'Target query date configuration required' });

        const attendanceRecords = await Attendance.find({ date }).populate('employee');
        res.json(attendanceRecords);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getEmployeeMonthlyGrid = async (req, res) => {
    try {
        const { employeeId, year, month } = req.query; // Month format 1-12
        if (!employeeId || !year || !month) {
            return res.status(400).json({ message: 'Missing employeeId, year, or month parameters' });
        }

        const paddedMonth = String(month).padStart(2, '0');
        const startDate = `${year}-${paddedMonth}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endDate = `${year}-${paddedMonth}-${lastDay}`;

        const records = await Attendance.find({
            employee: employeeId,
            date: { $gte: startDate, $lte: endDate }
        });

        res.json(records);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getMonthlyGrid = getEmployeeMonthlyGrid;