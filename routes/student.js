const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);
router.use(authorizeRoles('student'));

router.get('/dashboard', async (req, res) => {
    try {
        const studentRows = await query('SELECT * FROM students WHERE user_id = ?', [req.user.id]);
        if (studentRows.length === 0) return res.status(404).json({ error: 'Student not found' });

        const student = studentRows[0];

        const userRows = await query('SELECT * FROM users WHERE id = ?', [req.user.id]);
        const user = userRows[0];

        const classRows = await query('SELECT * FROM classes WHERE id = ?', [student.class_id]);
        const classInfo = classRows[0] || {};

        const today = new Date().toISOString().split('T')[0];
        const todayAttendance = await query(
            'SELECT * FROM attendance WHERE student_id = ? AND date = ?',
            [student.id, today]
        );

        const recentGrades = await query(`
            SELECT g.*, s.name as subject_name 
            FROM grades g 
            JOIN subjects s ON g.subject_id = s.id 
            WHERE g.student_id = ? 
            ORDER BY g.created_at DESC LIMIT 5
        `, [student.id]);

        const upcomingAssignments = await query(`
            SELECT a.*, sub.name as subject_name, u.name as teacher_name 
            FROM assignments a 
            JOIN subjects sub ON a.subject_id = sub.id 
            JOIN teachers t ON a.teacher_id = t.id 
            JOIN users u ON t.user_id = u.id 
            WHERE a.class_id = ? AND a.due_date >= ? 
            ORDER BY a.due_date ASC LIMIT 5
        `, [student.class_id, today]);

        const notifications = await query(`
            SELECT * FROM notifications 
            WHERE user_id = ? AND is_read = false 
            ORDER BY created_at DESC LIMIT 5
        `, [req.user.id]);

        const totalGradesRows = await query(
            'SELECT COUNT(*) as count FROM grades WHERE student_id = ?',
            [student.id]
        );
        const totalAssignmentsRows = await query(
            'SELECT COUNT(*) as count FROM assignments WHERE class_id = ? AND due_date >= ?',
            [student.class_id, today]
        );

        res.json({
            success: true,
            student: { ...student, name: user?.name, email: user?.email, class_name: classInfo?.name },
            todayAttendance: todayAttendance[0] || null,
            recentGrades,
            upcomingAssignments,
            notifications,
            stats: {
                totalGrades: totalGradesRows[0].count,
                pendingAssignments: totalAssignmentsRows[0].count
            }
        });
    } catch (error) {
        console.error('Student dashboard error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/profile', async (req, res) => {
    try {
        const studentRows = await query('SELECT * FROM students WHERE user_id = ?', [req.user.id]);
        if (studentRows.length === 0) return res.status(404).json({ error: 'Student not found' });

        const student = studentRows[0];
        const userRows = await query('SELECT * FROM users WHERE id = ?', [req.user.id]);
        const classRows = await query('SELECT * FROM classes WHERE id = ?', [student.class_id || null]);

        const user = userRows[0];
        const classInfo = classRows[0];

        res.json({
            success: true,
            profile: { 
                ...student, 
                name: user?.name, 
                email: user?.email, 
                phone: user?.phone, 
                address: user?.address, 
                avatar: user?.avatar, 
                class_name: classInfo?.name 
            }
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.put('/profile', [body('phone').optional(), body('address').optional()], async (req, res) => {
    try {
        const { phone, address } = req.body;

        const updates = [];
        const values = [];

        if (phone !== undefined) { updates.push('phone = ?'); values.push(phone); }
        if (address !== undefined) { updates.push('address = ?'); values.push(address); }

        if (updates.length > 0) {
            updates.push('updated_at = NOW()');
            values.push(req.user.id);
            await query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
        }

        res.json({ success: true, message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/attendance', async (req, res) => {
    try {
        const { month, year } = req.query;

        const studentRows = await query('SELECT id FROM students WHERE user_id = ?', [req.user.id]);
        if (studentRows.length === 0) return res.json({ success: true, attendance: [], summary: {} });

        const studentId = studentRows[0].id;

        let attendance;
        if (month && year) {
            attendance = await query(`
                SELECT * FROM attendance 
                WHERE student_id = ? 
                AND MONTH(date) = ? AND YEAR(date) = ?
                ORDER BY date DESC
            `, [studentId, month, year]);
        } else {
            attendance = await query(
                'SELECT * FROM attendance WHERE student_id = ? ORDER BY date DESC',
                [studentId]
            );
        }

        const summary = {
            total: attendance.length,
            present: attendance.filter(a => a.status === 'present').length,
            absent: attendance.filter(a => a.status === 'absent').length,
            late: attendance.filter(a => a.status === 'late').length
        };

        res.json({ success: true, attendance, summary });
    } catch (error) {
        console.error('Get attendance error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/grades', async (req, res) => {
    try {
        const { subject_id, assessment_type } = req.query;

        const studentRows = await query('SELECT id FROM students WHERE user_id = ?', [req.user.id]);
        if (studentRows.length === 0) return res.json({ success: true, grades: [], summary: [] });

        const studentId = studentRows[0].id;

        let gradesQuery = `
            SELECT g.*, s.name as subject_name 
            FROM grades g 
            JOIN subjects s ON g.subject_id = s.id 
            WHERE g.student_id = ?
        `;
        const params = [studentId];

        if (subject_id) {
            gradesQuery += ' AND g.subject_id = ?';
            params.push(subject_id);
        }
        if (assessment_type) {
            gradesQuery += ' AND g.assessment_type = ?';
            params.push(assessment_type);
        }

        gradesQuery += ' ORDER BY g.created_at DESC';

        const grades = await query(gradesQuery, params);

        const gradesWithPercentage = grades.map(g => ({
            ...g,
            percentage: Math.round((g.score / g.max_score) * 100)
        }));

        const summaryMap = {};
        gradesWithPercentage.forEach(g => {
            if (!summaryMap[g.subject_id]) {
                summaryMap[g.subject_id] = { subject_name: g.subject_name, scores: [] };
            }
            summaryMap[g.subject_id].scores.push(g.percentage);
        });

        const subjectSummary = Object.entries(summaryMap).map(([id, data]) => ({
            subject_id: id,
            subject_name: data.subject_name,
            average: Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length)
        }));

        res.json({ success: true, grades: gradesWithPercentage, summary: subjectSummary });
    } catch (error) {
        console.error('Get grades error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/subjects', async (req, res) => {
    try {
        const studentRows = await query('SELECT class_id FROM students WHERE user_id = ?', [req.user.id]);
        if (studentRows.length === 0) return res.json({ success: true, subjects: [] });

        const classId = studentRows[0].class_id;

        const subjects = await query(`
            SELECT DISTINCT s.* 
            FROM subjects s 
            JOIN teacher_subjects ts ON s.id = ts.subject_id 
            WHERE ts.class_id = ?
        `, [classId]);

        res.json({ success: true, subjects });
    } catch (error) {
        console.error('Get subjects error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/timetable', async (req, res) => {
    try {
        const studentRows = await query('SELECT class_id FROM students WHERE user_id = ?', [req.user.id]);
        if (studentRows.length === 0) return res.json({ success: true, timetable: [] });

        const classId = studentRows[0].class_id;

        const timetable = await query(`
            SELECT t.*, s.name as subject_name, u.name as teacher_name 
            FROM timetable t 
            JOIN subjects s ON t.subject_id = s.id 
            JOIN teachers tc ON t.teacher_id = tc.id 
            JOIN users u ON tc.user_id = u.id 
            WHERE t.class_id = ?
            ORDER BY FIELD(t.day, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'), t.period
        `, [classId]);

        res.json({ success: true, timetable });
    } catch (error) {
        console.error('Get timetable error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/assignments', async (req, res) => {
    try {
        const { status } = req.query;

        const studentRows = await query('SELECT id, class_id FROM students WHERE user_id = ?', [req.user.id]);
        if (studentRows.length === 0) return res.json({ success: true, assignments: [] });

        const student = studentRows[0];
        const today = new Date().toISOString().split('T')[0];

        const assignments = await query(`
            SELECT a.*, sub.name as subject_name, u.name as teacher_name,
            (SELECT submitted_at FROM submissions WHERE assignment_id = a.id AND student_id = ?) as submitted_at
            FROM assignments a 
            JOIN subjects sub ON a.subject_id = sub.id 
            JOIN teachers t ON a.teacher_id = t.id 
            JOIN users u ON t.user_id = u.id 
            WHERE a.class_id = ?
        `, [student.id, student.class_id]);

        let filteredAssignments = assignments.map(a => ({
            ...a,
            is_submitted: !!a.submitted_at
        }));

        if (status === 'pending') {
            filteredAssignments = filteredAssignments.filter(a => !a.is_submitted && a.due_date >= today);
        } else if (status === 'submitted') {
            filteredAssignments = filteredAssignments.filter(a => a.is_submitted);
        } else if (status === 'overdue') {
            filteredAssignments = filteredAssignments.filter(a => !a.is_submitted && a.due_date < today);
        }

        filteredAssignments.sort((a, b) => new Date(b.due_date) - new Date(a.due_date));

        res.json({ success: true, assignments: filteredAssignments });
    } catch (error) {
        console.error('Get assignments error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/assignments/:id/submit', [body('content').optional().trim()], async (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;

        const studentRows = await query('SELECT id FROM students WHERE user_id = ?', [req.user.id]);
        if (studentRows.length === 0) return res.status(404).json({ error: 'Student not found' });

        const studentId = studentRows[0].id;

        const existing = await query(
            'SELECT id FROM submissions WHERE assignment_id = ? AND student_id = ?',
            [id, studentId]
        );

        if (existing.length > 0) {
            return res.status(400).json({ error: 'Assignment already submitted' });
        }

        await query(
            `INSERT INTO submissions (assignment_id, student_id, content) VALUES (?, ?, ?)`,
            [id, studentId, content || '']
        );

        res.status(201).json({ success: true, message: 'Assignment submitted successfully' });
    } catch (error) {
        console.error('Submit assignment error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/messages', async (req, res) => {
    try {
        const messages = await query(`
            SELECT m.*, u.name as sender_name 
            FROM messages m 
            JOIN users u ON m.sender_id = u.id 
            WHERE m.receiver_id = ?
            ORDER BY m.created_at DESC
        `, [req.user.id]);

        res.json({ success: true, messages });
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/messages', [body('receiver_id').notEmpty(), body('content').notEmpty()], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        const { receiver_id, subject, content } = req.body;

        await query(
            `INSERT INTO messages (sender_id, receiver_id, subject, content) VALUES (?, ?, ?, ?)`,
            [req.user.id, receiver_id, subject || '', content]
        );

        res.status(201).json({ success: true, message: 'Message sent successfully' });
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/notifications', async (req, res) => {
    try {
        const notifications = await query(`
            SELECT * FROM notifications 
            WHERE user_id = ? 
            ORDER BY created_at DESC 
            LIMIT 50
        `, [req.user.id]);

        res.json({ success: true, notifications });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.put('/notifications/:id/read', async (req, res) => {
    try {
        await query(
            'UPDATE notifications SET is_read = true WHERE id = ? AND user_id = ?',
            [req.params.id, req.user.id]
        );

        res.json({ success: true, message: 'Notification marked as read' });
    } catch (error) {
        console.error('Mark notification read error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/teachers', async (req, res) => {
    try {
        const studentRows = await query('SELECT class_id FROM students WHERE user_id = ?', [req.user.id]);
        if (studentRows.length === 0) return res.json({ success: true, teachers: [] });

        const classId = studentRows[0].class_id;

        const teachers = await query(`
            SELECT DISTINCT u.id, u.name, u.email, u.phone, t.specialization 
            FROM teachers t 
            JOIN users u ON t.user_id = u.id 
            JOIN teacher_subjects ts ON t.id = ts.teacher_id 
            WHERE ts.class_id = ?
        `, [classId]);

        res.json({ success: true, teachers });
    } catch (error) {
        console.error('Get teachers error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
