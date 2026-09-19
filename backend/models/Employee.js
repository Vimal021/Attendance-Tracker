import mongoose from 'mongoose';

const employeeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Employee name is required'],
        trim: true
    },
    mobileNumber: {
        type: String,
        required: [true, 'Mobile number is required'],
        trim: true
    },
    salary: {
        type: Number,
        required: [true, 'Base monthly salary is required']
    },
    weeklyHoliday: {
        type: String,
        enum: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        required: true
    },
    status: {
        type: String,
        enum: ['Active', 'Leaved'],
        default: 'Active'
    },
    currentBalance: {
        type: Number,
        default: 0 // Positive = Payable (we owe them), Negative = Receivable (advance exceeds salary)
    }
}, { timestamps: true });

export default mongoose.model('Employee', employeeSchema);