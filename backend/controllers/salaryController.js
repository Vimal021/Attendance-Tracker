import Attendance from '../models/Attendance.js';
import Employee from '../models/Employee.js';
import Advance from '../models/Advance.js';

// Helper function to recalculate and sync employee's currentBalance based on all advances/returns
const syncEmployeeBalance = async (employeeId) => {
    const employee = await Employee.findById(employeeId);
    if (!employee) return;

    const allAdvances = await Advance.find({ employee: employeeId });
    let totalBalance = 0;
    allAdvances.forEach(adv => {
        totalBalance += adv.amount;
    });

    employee.currentBalance = totalBalance;
    await employee.save();
};

export const getMonthlyStatementData = async (req, res) => {
    try {
        const { employeeId, month, year } = req.query;
        if (!employeeId || !month || !year) {
            return res.status(400).json({ message: 'Missing employeeId, month, or year parameters' });
        }

        const employee = await Employee.findById(employeeId);
        if (!employee) return res.status(404).json({ message: 'Employee profile not found' });

        const paddedMonth = String(month).padStart(2, '0');
        const startDate = `${year}-${paddedMonth}-01`;
        const lastDay = new Date(Number(year), Number(month), 0).getDate();
        const endDate = `${year}-${paddedMonth}-${lastDay}`;

        const logs = await Attendance.find({ 
            employee: employeeId, 
            date: { $gte: startDate, $lte: endDate } 
        }).sort({ date: 1 });

        const advances = await Advance.find({ 
            employee: employeeId, 
            date: { $gte: startDate, $lte: endDate } 
        }).sort({ date: 1 });

        let totalWorkedHours = 0;
        let totalOvertimeHours = 0;

        logs.forEach(log => {
            totalWorkedHours += log.totalDailyHours || 0;
            if (log.isOvertime) {
                totalOvertimeHours += log.overtimeHours || 0;
            }
        });

        const hourlyRate = parseFloat((employee.salary / 26 / 9).toFixed(4));
        const netSalaryEarned = parseFloat((totalWorkedHours * hourlyRate).toFixed(2));
        const overtimePayEarned = parseFloat((totalOvertimeHours * hourlyRate).toFixed(2));

        let totalAdvanceDeductions = 0;
        advances.forEach(adv => { totalAdvanceDeductions += adv.amount; });

        res.json({
            employee: {
                _id: employee._id,
                name: employee.name,
                salary: employee.salary,
                currentBalance: employee.currentBalance
            },
            metrics: {
                totalWorkedHours,
                totalOvertimeHours,
                hourlyRate,
                netSalaryEarned,
                overtimePayEarned,
                totalAdvanceDeductions
            },
            logs,
            advances
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const issueAdvancePayment = async (req, res) => {
    try {
        const { employeeId, amount, date, givenBy, type } = req.body;
        const loggedInUser = req.headers['x-username'] || req.user?.username || 'Admin';

        const employee = await Employee.findById(employeeId);
        if (!employee) return res.status(404).json({ message: 'Employee match failed' });

        if (!amount || Number(amount) === 0) {
            return res.status(400).json({ message: 'Amount cannot be zero' });
        }

        const isReturn = type === 'return';
        const finalAmount = isReturn ? -Math.abs(Number(amount)) : Math.abs(Number(amount));

        const rawGiver = (givenBy && givenBy.trim()) ? givenBy.trim() : loggedInUser;
        const formattedGivenBy = rawGiver
            .toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');

        const advance = await Advance.create({
            employee: employeeId,
            amount: finalAmount,
            date,
            givenBy: formattedGivenBy,
            type: isReturn ? 'return' : 'advance'
        });

        await syncEmployeeBalance(employeeId);

        res.status(201).json(advance);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateAdvancePayment = async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, date, givenBy, type } = req.body;

        const advance = await Advance.findById(id);
        if (!advance) return res.status(404).json({ message: 'Advance log target missing' });

        if (amount !== undefined) {
            const isReturn = type ? type === 'return' : advance.type === 'return';
            advance.amount = isReturn ? -Math.abs(Number(amount)) : Math.abs(Number(amount));
        }
        if (date) advance.date = date;
        if (type) advance.type = type;
        if (givenBy) {
            advance.givenBy = givenBy.trim()
                .toLowerCase()
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
        }

        await advance.save();
        await syncEmployeeBalance(advance.employee);

        res.json({ message: 'Advance entry updated successfully', advance });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const wipeAdvancePayment = async (req, res) => {
    try {
        const advance = await Advance.findById(req.params.id);
        if (!advance) return res.status(404).json({ message: 'Advance log target missing' });

        const employeeId = advance.employee;
        await Advance.findByIdAndDelete(req.params.id);
        await syncEmployeeBalance(employeeId);

        res.json({ message: 'Advance row cleared out successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const finalizeMonthlyPayout = async (req, res) => {
    try {
        const { 
            employeeId, 
            month, 
            year, 
            paymentDate, 
            givenBy, 
            calculatedFinalSalary,
            actualPaidAmount,
            returnedAdvanceAmount 
        } = req.body;

        const employee = await Employee.findById(employeeId);
        if (!employee) return res.status(404).json({ message: 'Employee missing' });

        const monthNames = {
            1: 'January', 2: 'February', 3: 'March', 4: 'April',
            5: 'May', 6: 'June', 7: 'July', 8: 'August',
            9: 'September', 10: 'October', 11: 'November', 12: 'December'
        };

        const formattedMonth = monthNames[Number(month)] || 'Current Month';
        const formattedYear = year || new Date().getFullYear();

        const loggedInUser = req.headers['x-username'] || req.user?.username || 'Admin';
        const rawGiver = (givenBy && givenBy.trim()) ? givenBy.trim() : loggedInUser;
        const formattedGivenBy = rawGiver
            .toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');

        const pDate = paymentDate || new Date().toISOString().split('T')[0];
        const prevBal = Number(employee.currentBalance || 0);

        // CASE 1: Explicit "Return Advance" adjustment entered in UI modal (Deducting Debt)
        let explicitReturn = Number(returnedAdvanceAmount || 0);
        if (explicitReturn > 0) {
            await Advance.create({
                employee: employeeId,
                amount: -Math.abs(explicitReturn),
                date: pDate,
                givenBy: `${formattedGivenBy} (Advance returned in salary of ${formattedMonth} ${formattedYear})`,
                type: 'return'
            });
        } 
        // CASE 2: Company owed employee money (prevBal < 0). Clearing past company dues during salary payout!
        else if (prevBal < 0) {
            await Advance.create({
                employee: employeeId,
                amount: Math.abs(prevBal), // Positive entry clears negative balance
                date: pDate,
                givenBy: `${formattedGivenBy} (Company dues settled in salary of ${formattedMonth} ${formattedYear})`,
                type: 'return'
            });
        }

        // CASE 3: Leftover unpaid balance / difference carry-forward
        const finalSal = Number(calculatedFinalSalary || 0);
        const paid = Number(actualPaidAmount || 0);
        const diff = finalSal - paid;

        if (diff < 0) {
            // Employee owes remaining debt carry-forward
            await Advance.create({
                employee: employeeId,
                amount: Math.abs(diff),
                date: pDate,
                givenBy: `${formattedGivenBy} (Salary difference carry-forward for ${formattedMonth} ${formattedYear})`,
                type: 'advance'
            });
        }

        // Recalculate and persist live balance on Employee profile
        await syncEmployeeBalance(employeeId);

        res.json({ 
            message: 'Payout finalized, advance hub updated, and ledger synchronized successfully', 
            currentBalance: employee.currentBalance 
        });
    } catch (error) {
        console.error('Finalize payout execution error:', error);
        res.status(500).json({ message: error.message });
    }
};