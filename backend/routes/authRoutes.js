import express from 'express';
import {
    loginUser,
    registerUser,
    getAllUsers,
    deleteUser,
    seedAdmin
} from '../controllers/authController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.post('/login', loginUser);
router.post('/register', registerUser);
router.get('/seed', seedAdmin);

// Protected user management routes
// Uses flexible role checking (case-insensitive & matches 'Master Admin', 'Admin', or 'Manager')
router.get('/users', protect, authorizeRoles('Master Admin', 'Admin', 'Manager'), getAllUsers);
router.delete('/users/:id', protect, authorizeRoles('Master Admin', 'Admin'), deleteUser);

export default router;