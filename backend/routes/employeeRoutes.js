import express from 'express';
import { createEmployee, getEmployees, updateEmployee, deleteEmployee } from '../controllers/employeeController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply authentication middleware across all employee routes
router.use(protect);

router.route('/')
    .post(authorizeRoles('Master Admin', 'Admin', 'Manager', 'Office Staff', 'Staff'), createEmployee)
    // Allows Master Admin, Admin, Manager, Accountant, and all Staff roles to view the employee list
    .get(authorizeRoles('Master Admin', 'Admin', 'Manager', 'Accountant', 'Office Staff', 'Regular Staff', 'Staff'), getEmployees);

router.route('/:id')
    .put(authorizeRoles('Master Admin', 'Admin', 'Manager', 'Office Staff', 'Staff'), updateEmployee)
    .delete(authorizeRoles('Master Admin', 'Admin'), deleteEmployee); // Strict delete rule: Only accessible by Master Admin and Admin

export default router;