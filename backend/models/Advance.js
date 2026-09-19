import mongoose from 'mongoose';

const advanceSchema = new mongoose.Schema({
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true
    },
    amount: {
        type: Number,
        required: [true, 'Advance distribution amount is required'],
        validate: {
            validator: function(v) {
                return v !== 0; // Allows positive (advance) and negative (return) numbers, but disallows zero
            },
            message: 'Amount must not be zero'
        }
    },
    date: {
        type: String, // Stored as "YYYY-MM-DD"
        required: true
    },
    givenBy: {
        type: String, // Audit tracking of who handed out or received the funds
        required: true
    },
    type: {
        type: String,
        enum: ['advance', 'return'],
        default: 'advance'
    }
}, { timestamps: true });

export default mongoose.model('Advance', advanceSchema);