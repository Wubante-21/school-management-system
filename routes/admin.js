const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);
router.use(authorizeRoles('admin'));

router.get('/messages', async (req, res) => {
    try {
        const { type } = req.query;
        
        let messages;
        if (type === 'sent') {
            messages = await query(`
                SELECT m.*, u.name as receiver_name 
                FROM messages m 
                JOIN users u ON m.receiver_id = u.id 
                WHERE m.sender_id = ?
                ORDER BY m.created_at DESC
            `, [req.user.id]);
        } else {
            messages = await query(`
                SELECT m.*, u.name as sender_name 
                FROM messages m 
                JOIN users u ON m.sender_id = u.id 
                WHERE m.receiver_id = ?
                ORDER BY m.created_at DESC
            `, [req.user.id]);
        }
        
        res.json({ success: true, messages });
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/messages', [
    body('receiver_id').notEmpty(),
    body('content').notEmpty()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        const { receiver_id, subject, content } = req.body;

        await query(
            `INSERT INTO messages (sender_id, receiver_id, subject, content) VALUES (?, ?, ?, ?)`,
            [req.user.id, receiver_id, subject || '', content]
        );

        await query(
            `INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)`,
            [receiver_id, 'New Message', `New message: ${subject || 'No subject'}`, 'message']
        );

        res.status(201).json({ success: true, message: 'Message sent successfully' });
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/dashboard', async (req, res) => {
    try {
        const students = await query('SELECT COUNT(*) as count FROM students WHERE status = ?', ['active']);
        const teachers = await query('SELECT COUNT(*) as count FROM teachers WHERE status = ?', ['active']);
        const classes = await query('SELECT COUNT(*) as count FROM classes');
        const subjects = await query('SELECT COUNT(*) as count FROM subjects');

        const today = new Date().toISOString().split('T')[0];
        const attendanceToday = await query(
            'SELECT COUNT(*) as total, SUM(CASE WHEN status = "present" THEN 1 ELSE 0 END) as present FROM attendance WHERE date = ?',
            [today]
        );

        const recentStudents = await query(`
            SELECT s.*, u.email, c.name as class_name 
            FROM students s 
            JOIN users u ON s.user_id = u.id 
            LEFT JOIN classes c ON s.class_id = c.id 
            ORDER BY s.created_at DESC LIMIT 5
        `);

        const upcomingAssignments = await query(`
            SELECT a.*, sub.name as subject_name, c.name as class_name 
            FROM assignments a 
            JOIN subjects sub ON a.subject_id = sub.id 
            JOIN classes c ON a.class_id = c.id 
            WHERE a.due_date >= CURDATE() AND a.status = 'active' 
            ORDER BY a.due_date ASC LIMIT 5
        `);

        res.json({
            success: true,
            stats: {
                totalStudents: students[0].count,
                totalTeachers: teachers[0].count,
                totalClasses: classes[0].count,
                totalSubjects: subjects[0].count,
                presentToday: attendanceToday[0].present || 0,
                absentToday: (attendanceToday[0].total || 0) - (attendanceToday[0].present || 0)
            },
            recentStudents,
            upcomingAssignments
        });
    } catch (error) {
        console.error('Admin dashboard error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/settings', async (req, res) => {
    try {
        console.log('Admin settings route called');
        const settings = await query('SELECT setting_key, setting_value FROM settings');
        console.log('Settings found:', settings.length);
        const settingsObj = {};
        settings.forEach(s => { settingsObj[s.setting_key] = s.setting_value; });
        res.json({ success: true, settings: settingsObj });
    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.put('/settings', async (req, res) => {
    try {
        const { school_name, academic_year, term, grade_upload_enabled, grade_upload_start_date, grade_upload_end_date } = req.body;
        if (school_name) await query('INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?', ['school_name', school_name, school_name]);
        if (academic_year) await query('INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?', ['academic_year', academic_year, academic_year]);
        if (term) await query('INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?', ['term', term, term]);
        if (grade_upload_enabled !== undefined) await query('INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?', ['grade_upload_enabled', grade_upload_enabled, grade_upload_enabled]);
        if (grade_upload_start_date !== undefined) await query('INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?', ['grade_upload_start_date', grade_upload_start_date, grade_upload_start_date]);
        if (grade_upload_end_date !== undefined) await query('INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?', ['grade_upload_end_date', grade_upload_end_date, grade_upload_end_date]);
        res.json({ success: true, message: 'Settings updated' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/assignments', async (req, res) => {
    try {
        const assignments = await query(`
            SELECT a.*, s.name as subject_name, c.name as class_name,
            u.name as teacher_name,
            (SELECT COUNT(*) FROM submissions WHERE assignment_id = a.id) as submission_count
            FROM assignments a
            JOIN subjects s ON a.subject_id = s.id
            JOIN classes c ON a.class_id = c.id
            JOIN teachers t ON a.teacher_id = t.id
            JOIN users u ON t.user_id = u.id
            ORDER BY a.due_date DESC
        `);
        res.json({ success: true, assignments });
    } catch (error) {
        console.error('Get assignments error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/assignments', [
    body('title').trim().notEmpty(),
    body('class_id').notEmpty(),
    body('subject_id').notEmpty(),
    body('due_date').notEmpty()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        const { title, description, class_id, subject_id, due_date, max_marks } = req.body;

        const teachers = await query('SELECT id FROM teachers LIMIT 1');
        if (teachers.length === 0) {
            return res.status(403).json({ error: 'No teacher found. Please add a teacher first.' });
        }
        const teacherId = teachers[0].id;

        const result = await query(
            `INSERT INTO assignments (title, description, class_id, subject_id, teacher_id, due_date, max_marks, status) 
             VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
            [title, description || '', class_id, subject_id, teacherId, due_date, max_marks || 100]
        );

        const students = await query('SELECT user_id FROM students WHERE class_id = ?', [class_id]);
        for (const student of students) {
            await query(
                `INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)`,
                [student.user_id, 'New Assignment', `New assignment: ${title}. Due: ${due_date}`, 'assignment']
            );
        }

        res.status(201).json({ success: true, message: 'Assignment created successfully', assignment: { id: result.insertId, title } });
    } catch (error) {
        console.error('Create assignment error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/users', async (req, res) => {
    try {
        const { search, role, status, page = 1, limit = 10 } = req.query;
        let sql = 'SELECT id, name, email, role, phone, address, status, created_at FROM users WHERE 1=1';
        const params = [];

        if (search) { sql += ' AND (name LIKE ? OR email LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
        if (role) { sql += ' AND role = ?'; params.push(role); }
        if (status) { sql += ' AND status = ?'; params.push(status); }

        sql += ' ORDER BY created_at DESC';
        const offset = (page - 1) * limit;
        sql += ` LIMIT ${parseInt(limit)} OFFSET ${offset}`;

        const users = await query(sql, params);
        const [{ total }] = await query('SELECT COUNT(*) as total FROM users WHERE 1=1');

        res.json({ success: true, users, pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / limit) } });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/users', [
    body('name').trim().notEmpty(),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('role').isIn(['admin', 'teacher', 'student', 'parent'])
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        const { name, email, password, role, phone, address } = req.body;

        const existing = await query('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) return res.status(400).json({ error: 'Email already exists' });

        const hashedPassword = bcrypt.hashSync(password, 10);
        const result = await query(
            'INSERT INTO users (name, email, password, role, phone, address) VALUES (?, ?, ?, ?, ?, ?)',
            [name, email, hashedPassword, role, phone || '', address || '']
        );

        res.status(201).json({ success: true, message: 'User created', user: { id: result.insertId, name, email, role } });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.put('/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, role, status, phone, address } = req.body;
        const updates = [];
        const values = [];

        if (name) { updates.push('name = ?'); values.push(name); }
        if (email) { updates.push('email = ?'); values.push(email); }
        if (role) { updates.push('role = ?'); values.push(role); }
        if (status) { updates.push('status = ?'); values.push(status); }
        if (phone !== undefined) { updates.push('phone = ?'); values.push(phone); }
        if (address !== undefined) { updates.push('address = ?'); values.push(address); }

        if (updates.length > 0) {
            values.push(id);
            await query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
        }

        res.json({ success: true, message: 'User updated successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.delete('/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const users = await query('SELECT role FROM users WHERE id = ?', [id]);
        if (users.length === 0) return res.status(404).json({ error: 'User not found' });

        if (users[0].role === 'admin') {
            const adminCount = await query('SELECT COUNT(*) as count FROM users WHERE role = ?', ['admin']);
            if (adminCount[0].count <= 1) return res.status(400).json({ error: 'Cannot delete the last admin' });
        }

        await query('DELETE FROM users WHERE id = ?', [id]);
        res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/students', async (req, res) => {
    try {
        const { search, class_id, status, page = 1, limit = 10 } = req.query;
        let sql = `
            SELECT s.*, u.email, c.name as class_name, u.status as user_status 
            FROM students s 
            JOIN users u ON s.user_id = u.id 
            LEFT JOIN classes c ON s.class_id = c.id 
            WHERE 1=1
        `;
        const params = [];

        if (search) { sql += ' AND (s.name LIKE ? OR u.email LIKE ? OR s.roll_number LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
        if (class_id) { sql += ' AND s.class_id = ?'; params.push(class_id); }
        if (status) { sql += ' AND s.status = ?'; params.push(status); }

        sql += ' ORDER BY s.created_at DESC';
        const offset = (page - 1) * limit;
        sql += ` LIMIT ${parseInt(limit)} OFFSET ${offset}`;

        const students = await query(sql, params);
        const [{ total }] = await query('SELECT COUNT(*) as total FROM students');

        res.json({ success: true, students, pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / limit) } });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/students/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const students = await query(`
            SELECT s.*, u.email, c.name as class_name, u.status as user_status 
            FROM students s 
            JOIN users u ON s.user_id = u.id 
            LEFT JOIN classes c ON s.class_id = c.id 
            WHERE s.id = ?
        `, [id]);

        if (students.length === 0) return res.status(404).json({ error: 'Student not found' });

        const grades = await query(`
            SELECT g.*, sub.name as subject_name 
            FROM grades g 
            JOIN subjects sub ON g.subject_id = sub.id 
            WHERE g.student_id = ?
        `, [id]);

        res.json({ success: true, student: students[0], grades });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/students', [
    body('name').trim().notEmpty(),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('class_id').notEmpty()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        const { name, email, password, class_id, roll_number, date_of_birth, gender, phone, address } = req.body;

        const existing = await query('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) return res.status(400).json({ error: 'Email already exists' });

        const hashedPassword = bcrypt.hashSync(password, 10);
        const userResult = await query(
            'INSERT INTO users (name, email, password, role, phone, address) VALUES (?, ?, ?, ?, ?, ?)',
            [name, email, hashedPassword, 'student', phone || '', address || '']
        );

        const studentResult = await query(
            'INSERT INTO students (user_id, name, email, class_id, roll_number, date_of_birth, gender) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [userResult.insertId, name, email, class_id, roll_number || `STU${Date.now()}`, date_of_birth || null, gender || 'Male']
        );

        res.status(201).json({ success: true, message: 'Student created', student: { id: studentResult.insertId, name, email, class_id } });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.put('/students/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, class_id, roll_number, date_of_birth, gender, phone, address, status } = req.body;
        const updates = [];
        const values = [];

        if (name) { updates.push('name = ?'); values.push(name); }
        if (class_id !== undefined) { updates.push('class_id = ?'); values.push(class_id); }
        if (roll_number !== undefined) { updates.push('roll_number = ?'); values.push(roll_number); }
        if (date_of_birth !== undefined) { updates.push('date_of_birth = ?'); values.push(date_of_birth); }
        if (gender) { updates.push('gender = ?'); values.push(gender); }
        if (phone !== undefined) { updates.push('phone = ?'); values.push(phone); }
        if (address !== undefined) { updates.push('address = ?'); values.push(address); }
        if (status) { updates.push('status = ?'); values.push(status); }

        if (updates.length > 0) {
            values.push(id);
            await query(`UPDATE students SET ${updates.join(', ')} WHERE id = ?`, values);
        }

        res.json({ success: true, message: 'Student updated successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.delete('/students/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const students = await query('SELECT user_id FROM students WHERE id = ?', [id]);
        if (students.length === 0) return res.status(404).json({ error: 'Student not found' });

        await query('DELETE FROM students WHERE id = ?', [id]);
        await query('DELETE FROM users WHERE id = ?', [students[0].user_id]);

        res.json({ success: true, message: 'Student deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/teachers', async (req, res) => {
    try {
        const { search, status } = req.query;
        let sql = `
            SELECT t.*, u.email, u.phone, u.status as user_status 
            FROM teachers t 
            JOIN users u ON t.user_id = u.id 
            WHERE 1=1
        `;
        const params = [];

        if (search) { sql += ' AND (t.name LIKE ? OR u.email LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
        if (status) { sql += ' AND t.status = ?'; params.push(status); }

        sql += ' ORDER BY t.created_at DESC';
        const teachers = await query(sql, params);

        res.json({ success: true, teachers });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/teachers', [
    body('name').trim().notEmpty(),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        const { name, email, password, qualification, specialization, experience } = req.body;

        const existing = await query('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) return res.status(400).json({ error: 'Email already exists' });

        const hashedPassword = bcrypt.hashSync(password, 10);
        const userResult = await query(
            'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
            [name, email, hashedPassword, 'teacher']
        );

        const teacherResult = await query(
            'INSERT INTO teachers (user_id, name, employee_id, qualification, specialization, experience) VALUES (?, ?, ?, ?, ?, ?)',
            [userResult.insertId, name, `EMP${Date.now()}`, qualification || '', specialization || '', experience || 0]
        );

        res.status(201).json({ success: true, message: 'Teacher created', teacher: { id: teacherResult.insertId, name, email } });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.put('/teachers/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, qualification, specialization, experience, status } = req.body;
        const updates = [];
        const values = [];

        if (name) { updates.push('name = ?'); values.push(name); }
        if (qualification !== undefined) { updates.push('qualification = ?'); values.push(qualification); }
        if (specialization !== undefined) { updates.push('specialization = ?'); values.push(specialization); }
        if (experience !== undefined) { updates.push('experience = ?'); values.push(experience); }
        if (status) { updates.push('status = ?'); values.push(status); }

        if (updates.length > 0) {
            values.push(id);
            await query(`UPDATE teachers SET ${updates.join(', ')} WHERE id = ?`, values);
        }

        res.json({ success: true, message: 'Teacher updated successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.delete('/teachers/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const teachers = await query('SELECT user_id FROM teachers WHERE id = ?', [id]);
        if (teachers.length === 0) return res.status(404).json({ error: 'Teacher not found' });

        await query('DELETE FROM teachers WHERE id = ?', [id]);
        await query('DELETE FROM users WHERE id = ?', [teachers[0].user_id]);

        res.json({ success: true, message: 'Teacher deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/classes', async (req, res) => {
    try {
        const { search, grade } = req.query;
        let sql = 'SELECT c.*, (SELECT COUNT(*) FROM students WHERE class_id = c.id AND status = "active") as student_count FROM classes c WHERE 1=1';
        const params = [];

        if (search) { sql += ' AND (c.name LIKE ? OR c.grade LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
        if (grade) { sql += ' AND c.grade = ?'; params.push(grade); }

        sql += ' ORDER BY c.grade, c.section';
        const classes = await query(sql, params);

        res.json({ success: true, classes });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/classes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const classes = await query('SELECT * FROM classes WHERE id = ?', [id]);
        if (classes.length === 0) return res.status(404).json({ error: 'Class not found' });

        const students = await query(`
            SELECT s.*, u.email 
            FROM students s 
            JOIN users u ON s.user_id = u.id 
            WHERE s.class_id = ?
        `, [id]);

        const subjects = await query(`
            SELECT ts.*, t.name as teacher_name, sub.name as subject_name 
            FROM teacher_subjects ts 
            JOIN teachers t ON ts.teacher_id = t.id 
            JOIN subjects sub ON ts.subject_id = sub.id 
            WHERE ts.class_id = ?
        `, [id]);

        res.json({ success: true, class: { ...classes[0], student_count: students.length }, students, subjects });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/classes', [
    body('name').trim().notEmpty(),
    body('grade').notEmpty(),
    body('section').notEmpty()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        const { name, grade, section, room, capacity } = req.body;

        const existing = await query('SELECT id FROM classes WHERE grade = ? AND section = ?', [grade, section]);
        if (existing.length > 0) return res.status(400).json({ error: 'Class already exists' });

        const result = await query(
            'INSERT INTO classes (name, grade, section, room, capacity) VALUES (?, ?, ?, ?, ?)',
            [name, grade, section, room || '', capacity || 40]
        );

        res.status(201).json({ success: true, message: 'Class created', class: { id: result.insertId, name } });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.put('/classes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, room, capacity } = req.body;
        const updates = [];
        const values = [];

        if (name) { updates.push('name = ?'); values.push(name); }
        if (room !== undefined) { updates.push('room = ?'); values.push(room); }
        if (capacity) { updates.push('capacity = ?'); values.push(capacity); }

        if (updates.length > 0) {
            values.push(id);
            await query(`UPDATE classes SET ${updates.join(', ')} WHERE id = ?`, values);
        }

        res.json({ success: true, message: 'Class updated successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.delete('/classes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const students = await query('SELECT COUNT(*) as count FROM students WHERE class_id = ?', [id]);
        if (students[0].count > 0) return res.status(400).json({ error: 'Cannot delete class with students' });

        await query('DELETE FROM classes WHERE id = ?', [id]);
        res.json({ success: true, message: 'Class deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/subjects', async (req, res) => {
    try {
        const { search, type } = req.query;
        let sql = 'SELECT * FROM subjects WHERE 1=1';
        const params = [];

        if (search) { sql += ' AND (name LIKE ? OR code LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
        if (type) { sql += ' AND type = ?'; params.push(type); }

        sql += ' ORDER BY name';
        const subjects = await query(sql, params);

        res.json({ success: true, subjects });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/subjects', [
    body('name').trim().notEmpty(),
    body('code').trim().notEmpty()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        const { name, code, description, type } = req.body;

        const existing = await query('SELECT id FROM subjects WHERE code = ?', [code]);
        if (existing.length > 0) return res.status(400).json({ error: 'Subject code already exists' });

        const result = await query(
            'INSERT INTO subjects (name, code, description, type) VALUES (?, ?, ?, ?)',
            [name, code.toUpperCase(), description || '', type || 'core']
        );

        res.status(201).json({ success: true, message: 'Subject created', subject: { id: result.insertId, name, code } });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.put('/subjects/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, type } = req.body;
        const updates = [];
        const values = [];

        if (name) { updates.push('name = ?'); values.push(name); }
        if (description !== undefined) { updates.push('description = ?'); values.push(description); }
        if (type) { updates.push('type = ?'); values.push(type); }

        if (updates.length > 0) {
            values.push(id);
            await query(`UPDATE subjects SET ${updates.join(', ')} WHERE id = ?`, values);
        }

        res.json({ success: true, message: 'Subject updated successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.delete('/subjects/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await query('DELETE FROM subjects WHERE id = ?', [id]);
        res.json({ success: true, message: 'Subject deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/reports/attendance', async (req, res) => {
    try {
        const { class_id, start_date, end_date } = req.query;
        let sql = `
            SELECT a.*, s.name as student_name, s.roll_number, c.name as class_name 
            FROM attendance a 
            JOIN students s ON a.student_id = s.id 
            JOIN classes c ON a.class_id = c.id 
            WHERE 1=1
        `;
        const params = [];

        if (class_id) { sql += ' AND a.class_id = ?'; params.push(class_id); }
        if (start_date) { sql += ' AND a.date >= ?'; params.push(start_date); }
        if (end_date) { sql += ' AND a.date <= ?'; params.push(end_date); }

        sql += ' ORDER BY a.date DESC';
        const attendance = await query(sql, params);

        const stats = {
            total: attendance.length,
            present: attendance.filter(a => a.status === 'present').length,
            absent: attendance.filter(a => a.status === 'absent').length,
            late: attendance.filter(a => a.status === 'late').length
        };

        res.json({ success: true, attendance, stats });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/reports/grades', async (req, res) => {
    try {
        const { class_id, subject_id, student_id } = req.query;
        let sql = `
            SELECT g.*, s.name as student_name, s.roll_number, sub.name as subject_name, c.name as class_name,
            ROUND((g.score / g.max_score) * 100) as percentage 
            FROM grades g 
            JOIN students s ON g.student_id = s.id 
            JOIN subjects sub ON g.subject_id = sub.id 
            JOIN classes c ON g.class_id = c.id 
            WHERE 1=1
        `;
        const params = [];

        if (class_id) { sql += ' AND g.class_id = ?'; params.push(class_id); }
        if (subject_id) { sql += ' AND g.subject_id = ?'; params.push(subject_id); }
        if (student_id) { sql += ' AND g.student_id = ?'; params.push(student_id); }

        sql += ' ORDER BY g.created_at DESC';
        const grades = await query(sql, params);

        res.json({ success: true, grades });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/reports/analytics', async (req, res) => {
    try {
        const [{ totalStudents }] = await query('SELECT COUNT(*) as totalStudents FROM students');
        const [{ totalTeachers }] = await query('SELECT COUNT(*) as totalTeachers FROM teachers');
        const [{ totalClasses }] = await query('SELECT COUNT(*) as totalClasses FROM classes');
        const [{ totalSubjects }] = await query('SELECT COUNT(*) as totalSubjects FROM subjects');

        const subjectStats = await query(`
            SELECT sub.name as subject_name, 
                   AVG(g.score / g.max_score * 100) as average, 
                   COUNT(*) as total_grades 
            FROM grades g 
            JOIN subjects sub ON g.subject_id = sub.id 
            GROUP BY sub.id, sub.name
        `);

        res.json({
            success: true,
            overview: { totalStudents, totalTeachers, totalClasses, totalSubjects },
            subjectStats: subjectStats.map(s => ({ ...s, average: Math.round(s.average) }))
        });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/notifications', async (req, res) => {
    try {
        const notifications = await query(`
            SELECT * FROM notifications 
            WHERE user_id = ? 
            ORDER BY created_at DESC
        `, [req.user.id]);

        res.json({ success: true, notifications });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
