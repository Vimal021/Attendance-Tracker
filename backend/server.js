import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Import route files
import authRoutes from './routes/authRoutes.js';
import employeeRoutes from './routes/employeeRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import salaryRoutes from './routes/salaryRoutes.js';
import userRoutes from './routes/userRoutes.js';

dotenv.config();
const app = express();

// Enable CORS for cross-device mobile/desktop and production usage
app.use(cors({
    origin: '*', // Or specify trusted frontend origins / local network subnets if needed
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-username', 'x-role']
}));

app.use(express.json());

// Register all API Routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/salary', salaryRoutes);
app.use('/api/users', userRoutes);

// Global Error Handling Middleware
app.use((err, req, res, next) => {
    console.error('Unhandled Server Error:', err.stack);
    res.status(500).json({ 
        success: false, 
        message: 'Internal Server Error', 
        error: process.env.NODE_ENV === 'development' ? err.message : undefined 
    });
});

const PORT = process.env.PORT || 5000;

// MongoDB Connection with Pooling & Reconnection robustness
mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
})
.then(() => {
    console.log(`Connected to MongoDB. Server running on port ${PORT}`);
    app.listen(PORT, '0.0.0.0', () => console.log(`Listening on all network interfaces (0.0.0.0:${PORT})`));
})
.catch(err => {
    console.error('Database connection error:', err);
    process.exit(1);
});