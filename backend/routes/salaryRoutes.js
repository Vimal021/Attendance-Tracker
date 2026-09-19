import express from 'express';
import { 
    getMonthlyStatementData, 
    issueAdvancePayment, 
    updateAdvancePayment, 
    wipeAdvancePayment, 
    finalizeMonthlyPayout 
} from '../controllers/salaryController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// Enforce authentication for all salary routes
router.use(protect);

// Allow access to Master Admin, Admin, Manager, Accountant, and Office Staff
router.use(authorizeRoles('Master Admin', 'Admin', 'Manager', 'Accountant', 'Office Staff', 'Regular Staff', 'Staff'));

router.get('/statement', getMonthlyStatementData);
router.post('/advance', issueAdvancePayment);
router.put('/advance/:id', updateAdvancePayment);
router.delete('/advance/:id', wipeAdvancePayment);

// Optional: If finalizing payouts should remain restricted strictly to Management/Accountant
router.post('/finalize', authorizeRoles('Master Admin', 'Admin', 'Accountant'), finalizeMonthlyPayout);

export default router;