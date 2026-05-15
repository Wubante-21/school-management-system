const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const passport = require('../config/passport');
const { query } = require('../config/database');
const { generateToken, authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.post('/login', [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password } = req.body;

        const users = await query('SELECT * FROM users WHERE email = ?', [email]);

        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const user = users[0];

        if (user.status !== 'active') {
            return res.status(401).json({ error: 'Account is deactivated. Please contact administrator.' });
        }

        const validPassword = bcrypt.compareSync(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const token = generateToken(user);

        let profileData = {};
        if (user.role === 'student') {
            const students = await query('SELECT s.*, c.name as class_name FROM students s LEFT JOIN classes c ON s.class_id = c.id WHERE s.user_id = ?', [user.id]);
            if (students.length > 0) {
                profileData = { student: students[0] };
            }
        } else if (user.role === 'teacher') {
            const teachers = await query('SELECT * FROM teachers WHERE user_id = ?', [user.id]);
            if (teachers.length > 0) {
                profileData = { teacher: teachers[0] };
            }
        } else if (user.role === 'parent') {
            const parents = await query('SELECT * FROM parents WHERE user_id = ?', [user.id]);
            if (parents.length > 0) {
                profileData = { parent: parents[0] };
            }
        }

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                avatar: user.avatar,
                phone: user.phone,
                address: user.address,
                ...profileData
            }
        });
    } catch (error) {
        console.error('Login error:', error.message);
        console.error('Login error stack:', error.stack);
        res.status(500).json({ error: 'Login failed: ' + error.message });
    }
});

router.post('/register', [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').isIn(['student', 'teacher', 'parent']).withMessage('Invalid role')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, email, password, role, phone, address } = req.body;

        const existingUsers = await query('SELECT id FROM users WHERE email = ?', [email]);
        if (existingUsers.length > 0) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        const hashedPassword = bcrypt.hashSync(password, 10);

        const result = await query(
            'INSERT INTO users (name, email, password, role, phone, address) VALUES (?, ?, ?, ?, ?, ?)',
            [name, email, hashedPassword, role, phone || '', address || '']
        );

        const userId = result.insertId;

        if (role === 'teacher') {
            await query(
                'INSERT INTO teachers (user_id, name, employee_id) VALUES (?, ?, ?)',
                [userId, name, `EMP${Date.now()}`]
            );
        } else if (role === 'parent') {
            await query(
                'INSERT INTO parents (user_id, name, email, phone) VALUES (?, ?, ?, ?)',
                [userId, name, email, phone || '']
            );
        }

        const token = generateToken({ id: userId, email, role });

        res.status(201).json({
            success: true,
            token,
            user: { id: userId, name, email, role }
        });
    } catch (error) {
        console.error('Registration error:', error.message);
        res.status(500).json({ error: 'Registration failed: ' + error.message });
    }
});

router.post('/forgot-password', [
    body('email').isEmail().normalizeEmail()
], async (req, res) => {
    try {
        const { email } = req.body;

        const users = await query('SELECT id FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(404).json({ error: 'Email not found in our records' });
        }

        res.json({
            success: true,
            message: 'Password reset instructions sent (simulated)',
            simulation: { expires_in: '1 hour' }
        });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/me', authenticateToken, async (req, res) => {
    try {
        const users = await query('SELECT * FROM users WHERE id = ?', [req.user.id]);

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = users[0];
        delete user.password;

        if (user.role === 'student') {
            const students = await query('SELECT s.*, c.name as class_name FROM students s LEFT JOIN classes c ON s.class_id = c.id WHERE s.user_id = ?', [user.id]);
            if (students.length > 0) {
                user.student = students[0];
            }
        } else if (user.role === 'teacher') {
            const teachers = await query('SELECT * FROM teachers WHERE user_id = ?', [user.id]);
            if (teachers.length > 0) {
                user.teacher = teachers[0];
            }
        } else if (user.role === 'parent') {
            const parents = await query('SELECT * FROM parents WHERE user_id = ?', [user.id]);
            if (parents.length > 0) {
                const children = await query(`
                    SELECT s.*, c.name as class_name, sp.relationship 
                    FROM student_parent sp 
                    JOIN students s ON sp.student_id = s.id 
                    LEFT JOIN classes c ON s.class_id = c.id 
                    WHERE sp.parent_id = ?
                `, [parents[0].id]);
                user.parent = { ...parents[0], children };
            }
        }

        res.json(user);
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/logout', authenticateToken, async (req, res) => {
    res.json({ success: true, message: 'Logged out successfully' });
});

router.put('/profile', authenticateToken, [
    body('name').optional().trim().notEmpty(),
    body('phone').optional().trim(),
    body('address').optional().trim()
], async (req, res) => {
    try {
        const { name, phone, address, avatar } = req.body;

        const updates = [];
        const values = [];

        if (name) { updates.push('name = ?'); values.push(name); }
        if (phone !== undefined) { updates.push('phone = ?'); values.push(phone); }
        if (address !== undefined) { updates.push('address = ?'); values.push(address); }
        if (avatar !== undefined) { updates.push('avatar = ?'); values.push(avatar); }

        if (updates.length > 0) {
            values.push(req.user.id);
            await query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
        }

        res.json({ success: true, message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.put('/change-password', authenticateToken, [
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 6 })
], async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        const users = await query('SELECT password FROM users WHERE id = ?', [req.user.id]);
        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (!bcrypt.compareSync(currentPassword, users[0].password)) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        const hashedPassword = bcrypt.hashSync(newPassword, 10);
        await query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.user.id]);

        res.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ── Google OAuth ──
router.get('/google', (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.status(501).json({ error: 'Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.' });
  }
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

router.get('/google/callback',
  (req, res, next) => {
    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.redirect('/login?error=Google OAuth not configured');
    }
    passport.authenticate('google', { failureRedirect: '/login?error=google_auth_failed' }, (err, user) => {
      if (err) return res.redirect(`/login?error=${encodeURIComponent(err.message)}`);
      if (!user) return res.redirect('/login?error=google_auth_failed');
      req.logIn(user, (loginErr) => {
        if (loginErr) return res.redirect(`/login?error=${encodeURIComponent(loginErr.message)}`);
        const token = generateToken(user);
        return res.redirect(`/dashboard.html?token=${token}`);
      });
    })(req, res, next);
  }
);

// ── GitHub OAuth ──
router.get('/github', (req, res, next) => {
  if (!process.env.GITHUB_CLIENT_ID) {
    return res.status(501).json({ error: 'GitHub OAuth not configured. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET environment variables.' });
  }
  passport.authenticate('github', { scope: ['user:email'] })(req, res, next);
});

router.get('/github/callback',
  (req, res, next) => {
    if (!process.env.GITHUB_CLIENT_ID) {
      return res.redirect('/login?error=GitHub OAuth not configured');
    }
    passport.authenticate('github', { failureRedirect: '/login?error=github_auth_failed' }, (err, user) => {
      if (err) return res.redirect(`/login?error=${encodeURIComponent(err.message)}`);
      if (!user) return res.redirect('/login?error=github_auth_failed');
      req.logIn(user, (loginErr) => {
        if (loginErr) return res.redirect(`/login?error=${encodeURIComponent(loginErr.message)}`);
        const token = generateToken(user);
        return res.redirect(`/dashboard.html?token=${token}`);
      });
    })(req, res, next);
  }
);

// ── OAuth status ──
router.get('/status', (req, res) => {
  res.json({
    google: !!process.env.GOOGLE_CLIENT_ID,
    github: !!process.env.GITHUB_CLIENT_ID,
    google_login_url: process.env.GOOGLE_CLIENT_ID ? '/api/auth/google' : null,
    github_login_url: process.env.GITHUB_CLIENT_ID ? '/api/auth/github' : null
  });
});

module.exports = router;
