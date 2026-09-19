import Employee from '../models/Employee.js';
import Attendance from '../models/Attendance.js';
import Advance from '../models/Advance.js';

export const createEmployee = async (req, res) => {
    try {
        const { name, mobileNumber, salary, weeklyHoliday } = req.body;
        const employee = await Employee.create({ name, mobileNumber, salary, weeklyHoliday });
        res.status(201).json(employee);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getEmployees = async (req, res) => {
    try {
        const { includeLeaved } = req.query;
        let filter = { status: 'Active' };

        if (includeLeaved === 'true') {
            filter = {}; // Returns both active and soft-deleted records for deep metrics auditing
        }

        const employees = await Employee.find(filter).lean().sort({ status: 1, name: 1 });

        // Optimized batch balance calculation using MongoDB Aggregation
        const employeeIds = employees.map(emp => emp._id);
        const advanceTotals = await Advance.aggregate([
            { $match: { employee: { $in: employeeIds } } },
            { $group: { _id: '$employee', totalBalance: { $sum: '$amount' } } }
        ]);

        // Map balance totals back to respective employee objects efficiently
        const balanceMap = {};
        advanceTotals.forEach(item => {
            balanceMap[item._id.toString()] = item.totalBalance;
        });

        const enrichedEmployees = employees.map(emp => ({
            ...emp,
            currentBalance: balanceMap[emp._id.toString()] || 0
        }));

        res.json(enrichedEmployees);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateEmployee = async (req, res) => {
    try {
        const { name, mobileNumber, salary, weeklyHoliday, status } = req.body;
        const employee = await Employee.findById(req.params.id);

        if (!employee) {
            return res.status(404).json({ message: 'Employee profile context not found' });
        }

        employee.name = name || employee.name;
        employee.mobileNumber = mobileNumber || employee.mobileNumber;
        employee.salary = salary !== undefined ? salary : employee.salary;
        employee.weeklyHoliday = weeklyHoliday || employee.weeklyHoliday;
        employee.status = status || employee.status;

        const updatedEmployee = await employee.save();
        res.json(updatedEmployee);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteEmployee = async (req, res) => {
    try {
        const employee = await Employee.findById(req.params.id);
        if (!employee) {
            return res.status(404).json({ message: 'Target employee file not found' });
        }

        // Hard delete rule: Wipes the profile and cascades down to clean all historical entries out of the database entirely
        await Attendance.deleteMany({ employee: employee._id });
        await Advance.deleteMany({ employee: employee._id });
        await Employee.findByIdAndDelete(employee._id);

        res.json({ message: 'Employee profile and all corresponding logs completely wiped out' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};