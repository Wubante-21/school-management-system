# School Management System

A comprehensive, production-ready School Management System built with Node.js, Express, SQLite, and vanilla JavaScript with Bootstrap 5.

## Features

### User Roles
- **Admin**: Full system control - manage users, students, teachers, classes, subjects, attendance, grades
- **Teacher**: Manage classes, mark attendance, enter grades, create assignments
- **Student**: View grades, attendance, timetable, submit assignments
- **Parent**: Monitor children's academic progress

### Core Features

#### Admin Dashboard
- Dashboard with statistics and analytics
- User management (CRUD operations)
- Student management
- Teacher management
- Class management
- Subject management
- Attendance tracking
- Grade management
- Assignment oversight
- Reports and analytics with charts

#### Teacher Dashboard
- View assigned classes
- Mark student attendance
- Enter and manage grades
- Create and manage assignments
- View timetable
- Send messages

#### Student Dashboard
- View personal profile
- Track attendance record
- View grades and performance
- Access timetable
- View and submit assignments
- Communicate with teachers

#### Parent Dashboard
- View children's information
- Track attendance
- Monitor grades
- View assignments
- Communicate with teachers

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: SQLite (better-sqlite3)
- **Authentication**: JWT (JSON Web Tokens)
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **UI Framework**: Bootstrap 5
- **Charts**: Chart.js

## Installation

### Prerequisites
- Node.js (v14 or higher)
- npm (comes with Node.js)

### Steps

1. **Clone or download the project**
   ```bash
   cd sms_pro
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the server**
   ```bash
   npm start
   ```
   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

4. **Access the application**
   Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

## Default Login Credentials

### Admin Account
- **Email**: admin@school.com
- **Password**: admin123

### Teacher Account
- **Email**: john.smith@school.com
- **Password**: teacher123

## Project Structure

```
sms_pro/
├── config/
│   └── database.js          # Database configuration and schema
├── middleware/
│   └── auth.js              # Authentication middleware
├── public/
│   ├── js/
│   │   └── dashboard.js     # Dashboard functionality
│   ├── index.html           # Login page
│   └── dashboard.html       # Main dashboard
├── routes/
│   ├── admin.js             # Admin API routes
│   ├── auth.js              # Authentication routes
│   ├── parent.js            # Parent API routes
│   ├── student.js           # Student API routes
│   └── teacher.js           # Teacher API routes
├── database/                 # SQLite database files
├── server.js                # Main server file
├── package.json             # Dependencies and scripts
└── README.md                # This file
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile

### Admin Routes (requires admin role)
- `GET /api/admin/dashboard` - Dashboard stats
- `GET /api/admin/users` - List all users
- `POST /api/admin/users` - Create user
- `PUT /api/admin/users/:id` - Update user
- `DELETE /api/admin/users/:id` - Delete user
- `GET /api/admin/students` - List students
- `POST /api/admin/students` - Create student
- `GET /api/admin/teachers` - List teachers
- `POST /api/admin/teachers` - Create teacher
- `GET /api/admin/classes` - List classes
- `POST /api/admin/classes` - Create class
- `GET /api/admin/subjects` - List subjects
- `POST /api/admin/subjects` - Create subject
- `GET /api/admin/attendance/report` - Attendance report
- `GET /api/admin/grades/report` - Grades report
- `GET /api/admin/reports/analytics` - Analytics data

### Teacher Routes (requires teacher role)
- `GET /api/teacher/dashboard` - Dashboard data
- `GET /api/teacher/classes` - Teacher's classes
- `GET /api/teacher/class/:id/students` - Class students
- `GET /api/teacher/attendance/:classId` - Get attendance
- `POST /api/teacher/attendance/:classId` - Mark attendance
- `GET /api/teacher/grades/:classId/:subjectId` - Get grades
- `POST /api/teacher/grades` - Enter grades
- `GET /api/teacher/assignments` - Teacher's assignments
- `POST /api/teacher/assignments` - Create assignment
- `GET /api/teacher/timetable` - Teacher's timetable

### Student Routes (requires student role)
- `GET /api/student/dashboard` - Student dashboard
- `GET /api/student/profile` - Student profile
- `GET /api/student/attendance` - Attendance record
- `GET /api/student/grades` - Grades
- `GET /api/student/timetable` - Timetable
- `GET /api/student/assignments` - Assignments
- `POST /api/student/assignments/:id/submit` - Submit assignment

### Parent Routes (requires parent role)
- `GET /api/parent/dashboard` - Parent dashboard
- `GET /api/parent/children` - List children
- `GET /api/parent/child/:id/attendance` - Child attendance
- `GET /api/parent/child/:id/grades` - Child grades
- `GET /api/parent/child/:id/assignments` - Child assignments

## Database Schema

### Tables
- `users` - User accounts (all roles)
- `students` - Student profiles
- `teachers` - Teacher profiles
- `classes` - School classes
- `subjects` - Subjects
- `teacher_subjects` - Teacher-subject-class assignments
- `attendance` - Student attendance records
- `grades` - Student grades
- `assignments` - Assignments
- `submissions` - Assignment submissions
- `timetable` - Class timetables
- `notifications` - User notifications
- `messages` - Messages between users
- `fees` - Fee records

## Security Features

- Password hashing with bcrypt
- JWT-based authentication
- Role-based access control (RBAC)
- Input validation and sanitization
- SQL injection prevention (parameterized queries)

## Screenshots

The system includes:
- Modern, responsive login page
- Role-based dashboards
- Data tables with CRUD operations
- Charts and analytics
- Attendance management
- Grade management
- Assignment tracking
- Messaging system

## Future Enhancements

- Email/SMS notifications
- File upload for assignments
- Online examination system
- Library management
- Transport management
- Hostel management
- Online payment for fees
- Mobile responsive improvements
- Export reports to PDF/Excel

## License

This project is licensed under the MIT License.

## Support

For support, please contact the system administrator.
