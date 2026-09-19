import User from '../models/User.js';

// Get all users (Excludes Master Admin for regular views if needed, or keeps standard list)
export const getUsers = async (req, res) => {
    try {
        const users = await User.find({}).select('-password');
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Create a new user
export const createUser = async (req, res) => {
    try {
        const { username, password, role } = req.body;
        if (!username || !password) {
            return res.status(400).json({ message: 'Provide username and password' });
        }

        const cleanUsername = username.trim().toLowerCase();
        const userExists = await User.findOne({ username: { $regex: new RegExp(`^${cleanUsername}$`, 'i') } });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const user = await User.create({
            username: cleanUsername,
            password,
            role: role || 'Regular Staff',
            isActive: true
        });

        res.status(201).json({
            _id: user._id,
            username: user.username,
            role: user.role,
            isActive: user.isActive,
            message: 'User created successfully'
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update user details (username, password, role)
export const updateUser = async (req, res) => {
    try {
        const { username, password, role } = req.body;
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Prevent tampering with Master Admin identity restrictions
        if (user.username.toLowerCase() === 'vimal' && role && role !== 'Master Admin') {
            return res.status(403).json({ message: 'Cannot modify Master Admin role' });
        }

        if (username) {
            user.username = username.trim().toLowerCase();
        }
        if (role) {
            user.role = role;
        }

        if (password && password.trim() !== '') {
            user.password = password; // Pre-save hook will handle hashing
        }

        const updatedUser = await user.save();

        res.status(200).json({
            _id: updatedUser._id,
            username: updatedUser.username,
            role: updatedUser.role,
            isActive: updatedUser.isActive,
            message: 'User updated successfully'
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Toggle user status (Enable / Disable)
export const toggleUserStatus = async (req, res) => {
    try {
        const { isActive } = req.body;
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Prevent disabling Master Admin
        if (user.username.toLowerCase() === 'vimal' && isActive === false) {
            return res.status(403).json({ message: 'Cannot disable Master Admin account' });
        }

        user.isActive = isActive;
        await user.save();

        res.status(200).json({ message: 'User status updated successfully', user });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Delete a user
export const deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.username.toLowerCase() === 'vimal') {
            return res.status(403).json({ message: 'Cannot delete Master Admin' });
        }

        await user.deleteOne();
        res.status(200).json({ message: 'User removed successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};