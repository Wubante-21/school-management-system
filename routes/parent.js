const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);
router.use(authorizeRoles('parent'));

router.get('/dashboard', async (req, res) => {
    try {
        const parentRows = await query('SELECT * FROM parents WHERE user_id = ?', [req.user.id]);
        if (parentRows.length === 0) return res.status(404).json({ error: 'Parent not found' });

        const parent = parentRows[0];

        const relationRows = await query('SELECT * FROM student_parent WHERE parent_id = ?', [parent.id]);

        const children = [];
        for (const relation of relationRows) {
            const studentRows = await query(`
                SELECT s.*, u.name, u.email, c.name as class_name 
                FROM students s 
                JOIN users u ON s.user_id = u.id 
                LEFT JOIN classes c ON s.class_id = c.id 
                WHERE s.id = ?
            `, [relation.student_id]);

            if (studentRows.length === 0) continue;

            const student = studentRows[0];

            const recentGrades = await query(`
                SELECT g.*, sub.name as subject_name 
                FROM grades g 
                JOIN subjects sub ON g.subject_id = sub.id 
                WHERE g.student_id = ? 
                ORDER BY g.created_at DESC LIMIT 3
            `, [student.id]);

            const recentAttendance = await query(`
                SELECT * FROM attendance 
                WHERE student_id = ? 
                ORDER BY date DESC LIMIT 7
            `, [student.id]);

            children.push({
                ...student,
                name: student.name,
                email: student.email,
                class_name: student.class_name,
                relationship: relation.relationship,
                recentGrades,
                recentAttendance
            });
        }

        const notifications = await query(`
            SELECT * FROM notifications 
            WHERE user_id = ? AND is_read = false 
            ORDER BY created_at DESC LIMIT 5
        `, [req.user.id]);

        res.json({
            success: true,
            parent,
            children,
            notifications,
            stats: { totalChildren: children.length }
        });
    } catch (error) {
        console.error('Parent dashboard error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/children', async (req, res) => {
    try {
        const parentRows = await query('SELECT id FROM parents WHERE user_id = ?', [req.user.id]);
        if (parentRows.length === 0) return res.json({ success: true, children: [] });

        const parentId = parentRows[0].id;

        const relationRows = await query('SELECT * FROM student_parent WHERE parent_id = ?', [parentId]);

        const children = [];
        for (const relation of relationRows) {
            const studentRows = await query(`
                SELECT s.*, u.name, u.email, c.name as class_name 
                FROM students s 
                JOIN users u ON s.user_id = u.id 
                LEFT JOIN classes c ON s.class_id = c.id 
                WHERE s.id = ?
            `, [relation.student_id]);

            if (studentRows.length > 0) {
                children.push({
                    ...studentRows[0],
                    relationship: relation.relationship
                });
            }
        }

        res.json({ success: true, children });
    } catch (error) {
        console.error('Get children error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/child/:childId', async (req, res) => {
    try {
        const { childId } = req.params;

        const parentRows = await query('SELECT id FROM parents WHERE user_id = ?', [req.user.id]);
        if (parentRows.length === 0) return res.status(404).json({ error: 'Parent not found' });

        const relationRows = await query(
            'SELECT * FROM student_parent WHERE student_id = ? AND parent_id = ?',
            [childId, parentRows[0].id]
        );

        if (relationRows.length === 0) {
            return res.status(404).json({ error: 'Student not found or not your child' });
        }

        const studentRows = await query(`
            SELECT s.*, u.name, u.email, u.phone, u.address, c.name as class_name 
            FROM students s 
            JOIN users u ON s.user_id = u.id 
            LEFT JOIN classes c ON s.class_id = c.id 
            WHERE s.id = ?
        `, [childId]);

        res.json({ success: true, child: studentRows[0] });
    } catch (error) {
        console.error('Get child error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/child/:childId/attendance', async (req, res) => {
    try {
        const { childId } = req.params;
        const { month, year } = req.query;

        const parentRows = await query('SELECT id FROM parents WHERE user_id = ?', [req.user.id]);
        if (parentRows.length === 0) return res.status(404).json({ error: 'Parent not found' });

        const relationRows = await query(
            'SELECT * FROM student_parent WHERE student_id = ? AND parent_id = ?',
            [childId, parentRows[0].id]
        );

        if (relationRows.length === 0) {
            return res.status(404).json({ error: 'Student not found or not your child' });
        }

        let attendance;
        if (month && year) {
            attendance = await query(`
                SELECT * FROM attendance 
                WHERE student_id = ? 
                AND MONTH(date) = ? AND YEAR(date) = ?
                ORDER BY date DESC
            `, [childId, month, year]);
        } else {
            attendance = await query(
                'SELECT * FROM attendance WHERE student_id = ? ORDER BY date DESC',
                [childId]
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
        console.error('Get child attendance error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/child/:childId/grades', async (req, res) => {
    try {
        const { childId } = req.params;
        const { subject_id, assessment_type } = req.query;

        const parentRows = await query('SELECT id FROM parents WHERE user_id = ?', [req.user.id]);
        if (parentRows.length === 0) return res.status(404).json({ error: 'Parent not found' });

        const relationRows = await query(
            'SELECT * FROM student_parent WHERE student_id = ? AND parent_id = ?',
            [childId, parentRows[0].id]
        );

        if (relationRows.length === 0) {
            return res.status(404).json({ error: 'Student not found or not your child' });
        }

        let gradesQuery = `
            SELECT g.*, s.name as subject_name 
            FROM grades g 
            JOIN subjects s ON g.subject_id = s.id 
            WHERE g.student_id = ?
        `;
        const params = [childId];

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
        console.error('Get child grades error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/child/:childId/assignments', async (req, res) => {
    try {
        const { childId } = req.params;
        const { status } = req.query;

        const parentRows = await query('SELECT id FROM parents WHERE user_id = ?', [req.user.id]);
        if (parentRows.length === 0) return res.status(404).json({ error: 'Parent not found' });

        const relationRows = await query(
            'SELECT * FROM student_parent WHERE student_id = ? AND parent_id = ?',
            [childId, parentRows[0].id]
        );

        if (relationRows.length === 0) {
            return res.status(404).json({ error: 'Student not found or not your child' });
        }

        const studentRows = await query('SELECT class_id FROM students WHERE id = ?', [childId]);
        if (studentRows.length === 0) return res.json({ success: true, assignments: [] });

        const classId = studentRows[0].class_id;
        const today = new Date().toISOString().split('T')[0];

        const assignments = await query(`
            SELECT a.*, sub.name as subject_name, u.name as teacher_name,
            (SELECT id FROM submissions WHERE assignment_id = a.id AND student_id = ?) as submission_id
            FROM assignments a 
            JOIN subjects sub ON a.subject_id = sub.id 
            JOIN teachers t ON a.teacher_id = t.id 
            JOIN users u ON t.user_id = u.id 
            WHERE a.class_id = ?
        `, [childId, classId]);

        let filteredAssignments = assignments.map(a => ({
            ...a,
            is_submitted: !!a.submission_id
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
        console.error('Get child assignments error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/child/:childId/timetable', async (req, res) => {
    try {
        const { childId } = req.params;

        const parentRows = await query('SELECT id FROM parents WHERE user_id = ?', [req.user.id]);
        if (parentRows.length === 0) return res.status(404).json({ error: 'Parent not found' });

        const relationRows = await query(
            'SELECT * FROM student_parent WHERE student_id = ? AND parent_id = ?',
            [childId, parentRows[0].id]
        );

        if (relationRows.length === 0) {
            return res.status(404).json({ error: 'Student not found or not your child' });
        }

        const studentRows = await query('SELECT class_id FROM students WHERE id = ?', [childId]);
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
        console.error('Get child timetable error:', error);
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

        await query(
            `INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)`,
            [receiver_id, 'New Message from Parent', `Message: ${subject || 'No subject'}`, 'message']
        );

        res.status(201).json({ success: true, message: 'Message sent successfully' });
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/teachers', async (req, res) => {
    try {
        const parentRows = await query('SELECT id FROM parents WHERE user_id = ?', [req.user.id]);
        if (parentRows.length === 0) return res.json({ success: true, teachers: [] });

        const parentId = parentRows[0].id;

        const relationRows = await query('SELECT student_id FROM student_parent WHERE parent_id = ?', [parentId]);
        const classIds = [];

        for (const relation of relationRows) {
            const studentRows = await query('SELECT class_id FROM students WHERE id = ?', [relation.student_id]);
            if (studentRows.length > 0 && studentRows[0].class_id) {
                classIds.push(studentRows[0].class_id);
            }
        }

        if (classIds.length === 0) return res.json({ success: true, teachers: [] });

        const placeholders = classIds.map(() => '?').join(',');
        const teachers = await query(`
            SELECT DISTINCT u.id, u.name, u.email, u.phone, t.specialization 
            FROM teachers t 
            JOIN users u ON t.user_id = u.id 
            JOIN teacher_subjects ts ON t.id = ts.teacher_id 
            WHERE ts.class_id IN (${placeholders})
        `, classIds);

        res.json({ success: true, teachers });
    } catch (error) {
        console.error('Get teachers error:', error);
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

router.get('/fees', async (req, res) => {
    try {
        const parentRows = await query('SELECT id FROM parents WHERE user_id = ?', [req.user.id]);
        if (parentRows.length === 0) return res.json({ success: true, fees: [] });

        const parentId = parentRows[0].id;

        const relationRows = await query('SELECT student_id FROM student_parent WHERE parent_id = ?', [parentId]);
        const childIds = relationRows.map(r => r.student_id);

        if (childIds.length === 0) return res.json({ success: true, fees: [] });

        const placeholders = childIds.map(() => '?').join(',');
        const fees = await query(`
            SELECT f.*, u.name as student_name 
            FROM fees f 
            JOIN students s ON f.student_id = s.id 
            JOIN users u ON s.user_id = u.id 
            WHERE f.student_id IN (${placeholders})
            ORDER BY f.due_date DESC
        `, childIds);

        res.json({ success: true, fees });
    } catch (error) {
        console.error('Get fees error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
