import User from '../models/User.js';

// 1. LOGIN
export const loginUser = async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ message: 'Provide username and password' });

        const cleanUsername = username.trim().toLowerCase();
        const cleanPassword = password.trim();

        // Master Override (Bulletproof & Case-Insensitive)
        if (cleanUsername === 'vimal' && cleanPassword === 'UF_Admin_2026') {
            let user = await User.findOne({ username: { $regex: /^vimal$/i } });
            if (!user) {
                user = await User.create({ username: 'vimal', password: 'UF_Admin_2026', role: 'Master Admin' });
            } else if (user.role !== 'Master Admin') {
                user.role = 'Master Admin';
                await user.save();
            }
            return res.json({ _id: user._id, username: user.username, role: user.role });
        }

        // Regular User Login (Case-Insensitive match)
        const user = await User.findOne({ username: { $regex: new RegExp(`^${cleanUsername}$`, 'i') } });
        if (user && (await user.matchPassword(cleanPassword))) {
            return res.json({ _id: user._id, username: user.username, role: user.role });
        }

        return res.status(401).json({ message: 'Invalid credentials' });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// 2. REGISTER
export const registerUser = async (req, res) => {
    try {
        const { username, password, role } = req.body;
        if (!username || !password) return res.status(400).json({ message: 'Provide username and password' });

        const cleanUsername = username.trim().toLowerCase();
        const userExists = await User.findOne({ username: { $regex: new RegExp(`^${cleanUsername}$`, 'i') } });
        if (userExists) return res.status(400).json({ message: 'Username exists' });

        const user = await User.create({ username: cleanUsername, password, role: role || 'Regular Staff' });
        return res.status(201).json({ _id: user._id, username: user.username, role: user.role });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// 3. GET ALL USERS (Excludes Master Admin as requested)
export const getAllUsers = async (req, res) => {
    try {
        const users = await User.find({ username: { $not: /^vimal$/i } }).select('-password');
        return res.json(users);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// 4. DELETE USER
export const deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        if (user.username.toLowerCase() === 'vimal') return res.status(403).json({ message: 'Cannot delete Master Admin' });

        await User.findByIdAndDelete(req.params.id);
        return res.json({ message: 'User deleted' });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// 5. SEED MASTER ADMIN
export const seedAdmin = async (req, res) => {
    try {
        await User.deleteMany({ username: { $regex: /^vimal$/i } });
        await User.create({ username: 'vimal', password: 'UF_Admin_2026', role: 'Master Admin' });
        return res.status(201).json({ status: "SUCCESS", message: 'Master Admin reset successfully' });
    } catch (error) {
        return res.status(500).json({ status: "ERROR", message: error.message });
    }
};