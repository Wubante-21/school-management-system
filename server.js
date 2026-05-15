require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieSession = require('cookie-session');
const passport = require('./config/passport');
const db = require('./config/database');

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const teacherRoutes = require('./routes/teacher');
const studentRoutes = require('./routes/student');
const parentRoutes = require('./routes/parent');

const app = express();
const PORT = process.env.PORT || 3000;
const isVercel = !!process.env.VERCEL;

const originUrl = process.env.BASE_URL
  || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
  || 'http://localhost:3000';
app.use(cors({ origin: originUrl, credentials: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieSession({
  name: 'session',
  secret: process.env.SESSION_SECRET || 'school_oauth_session_secret',
  maxAge: 24 * 60 * 60 * 1000
}));
app.use(passport.initialize());
app.use(passport.session());

let initPromise = null;
app.use('/api', async (req, res, next) => {
    if (!db.getPool()) {
        if (!initPromise) {
            initPromise = db.initialize().catch(err => {
                console.error('DB init failed:', err.message);
                initPromise = null;
            });
        }
        try {
            await initPromise;
        } catch (e) {
            return res.status(503).json({ error: 'Database not available. Please configure a MySQL database (e.g., PlanetScale, Aiven, AWS RDS). Set DATABASE_URL or DB_HOST/DB_USER/DB_PASSWORD/DB_NAME in Vercel environment variables.' });
        }
        if (!db.getPool()) {
            return res.status(503).json({ error: 'Database not available. Please configure a MySQL database (e.g., PlanetScale, Aiven, AWS RDS). Set DATABASE_URL or DB_HOST/DB_USER/DB_PASSWORD/DB_NAME in Vercel environment variables.' });
        }
    }
    next();
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/parent', parentRoutes);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

async function startServer() {
    try {
        await db.initialize();
        console.log('Database initialized successfully');
    } catch (error) {
        console.error('Database initialization failed:', error.message);
        if (!isVercel) {
            process.exit(1);
        }
    }

    if (isVercel) return;

    const server = app.listen(PORT, () => {
        console.log(`School Management System running on http://localhost:${PORT}`);
        console.log('\n=== Default Login Credentials ===');
        console.log('Admin:   admin@school.com / admin123');
        console.log('Teacher: john.smith@school.com / teacher123');
        console.log('Student: michael.brown@student.com / student123');
        console.log('Parent:  robert.brown@parent.com / parent123');
        console.log('================================\n');
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`Port ${PORT} is in use, trying port ${PORT + 1}...`);
            server.listen(PORT + 1);
        } else {
            console.error('Server error:', err);
            process.exit(1);
        }
    });
}

if (!isVercel) {
    startServer();
}

module.exports = app;
