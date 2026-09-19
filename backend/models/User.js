import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
        },
        password: {
            type: String,
            required: true,
        },
        role: {
            type: String,
            required: true,
            enum: ['Master Admin', 'Admin', 'Manager', 'Office Staff', 'Regular Staff', 'Accountant'],
            default: 'Regular Staff',
        },
        isActive: {
            type: Boolean,
            default: true, // Enables users by default upon creation
        },
    },
    {
        timestamps: true,
    }
);

// Secure method to verify passwords during authentication
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Clean pre-save hook for automatic password encryption
userSchema.pre('save', async function (next) {
    // If the password hasn't changed, skip re-hashing
    if (!this.isModified('password')) {
        return next();
    }

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

const User = mongoose.model('User', userSchema);
export default User;