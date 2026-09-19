# Kishor Offset — Attendance & Payroll Management System

A full-stack, internal business management platform built for **Kishor Offset** to streamline employee tracking, automated attendance management, and salary distribution workflows with role-based access control.

---

## 🌟 What Makes Kishor Offset - Attendance & Payroll Management System Different?

Unlike generic attendance tracking templates, this system is customized for real-world print press manufacturing workflows:

- **📅 Interactive Full-Month Grid Matrix:** Visual month-at-a-glance attendance grid where admins can track complete monthly attendance (Present, Absent, Half-Day, Overtime) for every single worker simultaneously without toggling daily lists.
- **⚡ Real-Time Attendance Status Badges:** Dynamic color-coded markers for fast identification of attendance patterns, missing logs, or late arrivals across shifts.
- **💰 Integrated Salary Advance & Deduction Engine:** Tracks advance payments on the fly, automatically deducting them during month-end payroll settlement to prevent reconciliation discrepancies.
- **🔒 Tamper-Proof Session Tokens (No-JWT Vulnerability):** Replaced client-side role reliance and inspect-element vulnerabilities with server-generated random crypto session tokens validated against MongoDB on every request.
- **🏢 Tailored Role Workspaces:** Zero UI clutter—Accountants are routed straight to ledger tools (`/accountant`), workers see only essential status cards, and Master Admins retain full operational controls.
- **📶 Local Network / Production Hybrid Support:** Auto-detects whether the client is connecting via localhost, workshop Wi-Fi IP, or a cloud production server for seamless cross-device terminal punching.

---

## 📌 Core Features

- **Employee Directory:** Manage records, designations, wages, and active/inactive employment states.
- **Automated Time & Attendance:** Punch-in/punch-out handling with overtime calculations and monthly summaries.
- **Payroll Ledger:** Automated monthly salary disbursement calculations with deduction history.
- **Role-Based Access Control (RBAC):** Restrict system endpoints across Master Admin, Admin, Manager, Accountant, and Staff tiers.
- **Bulletproof Auth:** Secure passwords hashed with `bcryptjs` and session tokens stored in database documents.

---

## 🛠 Tech Stack

### Frontend
- **Framework:** React.js (Vite)
- **Styling:** Bootstrap & Custom Responsive CSS
- **Icons:** Lucide React
- **HTTP Client:** Axios (custom interceptor with dynamic headers)
- **Routing:** React Router DOM

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB (via Mongoose ODM)
- **Authentication:** Opaque random crypto session tokens, bcryptjs password hashing
- **Environment Management:** dotenv

---

## 👥 Roles & Access Permissions

The system uses structured access levels across the organization:

| Role | Permissions & Workspace |
| :--- | :--- |
| **Master Admin** | Unrestricted access across all operational data, users, and advance distributions |
| **Admin** | Full operational management, attendance modifications, and payroll overview |
| **Manager** | Oversees employee assignments and daily attendance tracking |
| **Accountant** | Dedicated access to `/accountant` workspace for salary and advance disbursements |
| **Office Staff / Regular Staff** | Standard views for checking operational statuses and personal logs |

---

## 🔐 Security Architecture

- **Session-Based Token Verification:** Avoids client-side role manipulation in DevTools (`localStorage`) by requiring both `x-username` and `x-token` on every protected API call.
- **Database-Level Middleware Guard:** Node.js directly checks MongoDB on every incoming request to verify that the active token matches the user's current session.
- **Password Security:** Salted and hashed using `bcryptjs` before storage in MongoDB.

---

## 📁 Repository Structure

```text
├── backend/
│   ├── config/             # Database connection setups
│   ├── controllers/        # Request handling logic (authController, etc.)
│   ├── middleware/         # Session verification and role protection
│   ├── models/             # Mongoose schemas (User, Employee, Attendance, Salary)
│   ├── routes/             # Express API endpoints
│   │   ├── attendanceRoutes.js
│   │   ├── authRoutes.js
│   │   ├── employeeRoutes.js
│   │   ├── salaryRoutes.js
│   │   └── userRoutes.js
│   ├── .env.example
│   └── server.js
│
└── frontend/
    ├── public/
    ├── src/
    │   ├── api/            # Configured Axios instance with request headers
    │   ├── assets/         # Images, branding, and logos
    │   ├── components/     # Reusable UI components & PrivateRoute wrapper
    │   ├── pages/          # Application views (Login, Dashboard, Accountant, etc.)
    │   ├── App.jsx
    │   └── main.jsx
    └── package.json
```

---

## 🚀 Getting Started

Follow these instructions to set up the project locally for development and production.

### Prerequisites

Ensure you have installed the following software before proceeding:
- **Node.js**: Version `v18.0.0` or higher
- **npm**: Version `v9.0.0` or higher (bundled with Node.js)
- **MongoDB**: A running local instance on port `27017` or an active MongoDB Atlas connection URI
- **Git**: Installed and configured on your local machine

---

### Step 1: Clone the Repository
```bash
git clone https://github.com/Vimal021/Attendance-Tracker.git
cd  Attendance-Tracker
```

---

### Step 2: Backend Setup & Installation

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create an environment configuration file:
```bash
type nul > .env
```

4. Populate `.env` with your database and port configuration:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/kishor_offset
```

5. Launch the backend server:
```bash
# Development mode
npm run dev

# Production mode
npm start
```
*The backend API will run at `http://localhost:5000`.*

---

### Step 3: Frontend Setup & Installation

1. Open a new terminal and navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. (Optional) Create a frontend `.env` file to specify a custom API endpoint:
```env
VITE_API_URL=http://localhost:5000
```

4. Launch the Vite development server:
```bash
npm run dev
```

5. Access the application in your browser:
```text
http://localhost:5173
```

---

## 🔌 API Endpoints Reference

### Authentication & Users (`/api/auth`)
- `POST /api/auth/login` — Authenticate credentials and return session token
- `POST /api/auth/register` — Register a new staff member (Admin only)
- `GET /api/auth/users` — List system users (Admin / Manager)
- `DELETE /api/auth/users/:id` — Remove user profile (Admin only)

### Operations
- `/api/employees` — Employee CRUD and profile details
- `/api/attendance` — Shift logs, check-ins, monthly grid summaries, and daily punch cards
- `/api/salary` — Advance allocations and payroll records

---

## 📄 License

This repository is maintained for internal business operations at Kishor Offset. All rights reserved.
