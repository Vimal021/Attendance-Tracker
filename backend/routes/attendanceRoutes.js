import express from 'express';
import { saveAttendance, saveAllBulkAttendance, getDailyAttendanceMetrics, getEmployeeMonthlyGrid } from '../controllers/attendanceController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);
router.post('/save', authorizeRoles('Master Admin', 'Admin', 'Manager', 'Office Staff', 'Regular Staff'), saveAttendance);
router.post('/bulk-save', authorizeRoles('Master Admin', 'Admin', 'Manager', 'Office Staff', 'Regular Staff'), saveAllBulkAttendance);
router.get('/daily', authorizeRoles('Master Admin', 'Admin', 'Manager', 'Office Staff', 'Regular Staff'), getDailyAttendanceMetrics);
router.get('/monthly-grid', authorizeRoles('Master Admin', 'Admin', 'Manager', 'Office Staff', 'Accountant'), getEmployeeMonthlyGrid);

export default router;