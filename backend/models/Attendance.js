import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
    inTime: { type: String, required: true },  // Format: "09:30 AM" or "21:00"
    outTime: { type: String, required: true }, // Format: "06:30 PM" or "01:00"
    hours: { type: Number, default: 0 }        // Calculated hours for this session row
});

const attendanceSchema = new mongoose.Schema({
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true
    },
    date: {
        type: String, // Stored as "YYYY-MM-DD" string to safely bypass timezone offset anomalies
        required: true
    },
    sessions: [sessionSchema], // Array supporting split entries (e.g., morning and evening shifts)
    totalDailyHours: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['Present', 'Absent', 'Holiday', 'Working Holiday'],
        default: 'Absent'
    },
    isOvertime: {
        type: Boolean,
        default: false
    },
    overtimeHours: {
        type: Number,
        default: 0
    },
    markedBy: {
        type: String, // Captured from current active session (e.g., "Vimal")
        required: true
    },
    editedBy: {
        type: String
    }
}, { timestamps: true });

// Unique index rule to ensure an employee never gets duplicate records for the same day
attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

export default mongoose.model('Attendance', attendanceSchema);