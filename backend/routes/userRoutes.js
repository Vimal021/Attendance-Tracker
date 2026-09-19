import express from 'express';
import {
    getUsers,
    createUser,
    updateUser,
    toggleUserStatus,
    deleteUser
} from '../controllers/userController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply auth middleware and strict role checks to all user management routes
router.use(protect);
router.use(authorizeRoles('Master Admin', 'Admin'));

router.route('/')
    .get(getUsers)
    .post(createUser);

router.route('/:id')
    .put(updateUser)
    .delete(deleteUser);

router.patch('/:id/status', toggleUserStatus);

export default router;