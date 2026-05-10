const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);
router.use(authorizeRoles('teacher'));

router.get('/dashboard', async (req, res) => {
    try {
        const teacherRows = await query('SELECT * FROM teachers WHERE user_id = ?', [req.user.id]);
        if (teacherRows.length === 0) return res.status(404).json({ error: 'Teacher not found' });

        const teacher = teacherRows[0];

        const classRows = await query(`
            SELECT c.*, ts.subject_id, s.name as subject_name 
            FROM classes c 
            JOIN teacher_subjects ts ON c.id = ts.class_id 
            JOIN subjects s ON ts.subject_id = s.id 
            WHERE ts.teacher_id = ?
        `, [teacher.id]);

        const today = new Date().toISOString().split('T')[0];
        const pendingRows = await query(
            'SELECT COUNT(*) as count FROM assignments WHERE teacher_id = ? AND due_date >= ?',
            [teacher.id, today]
        );

        res.json({
            success: true,
            teacher,
            myClasses: classRows,
            stats: { classesCount: classRows.length, pendingAssignments: pendingRows[0].count }
        });
    } catch (error) {
        console.error('Teacher dashboard error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/classes', async (req, res) => {
    try {
        const teacherRows = await query('SELECT id FROM teachers WHERE user_id = ?', [req.user.id]);
        if (teacherRows.length === 0) return res.json({ success: true, classes: [] });

        const teacherId = teacherRows[0].id;

        const classRows = await query(`
            SELECT c.*, ts.subject_id, s.name as subject_name,
            (SELECT COUNT(*) FROM students WHERE class_id = c.id) as student_count
            FROM classes c 
            JOIN teacher_subjects ts ON c.id = ts.class_id 
            JOIN subjects s ON ts.subject_id = s.id 
            WHERE ts.teacher_id = ?
        `, [teacherId]);

        res.json({ success: true, classes: classRows });
    } catch (error) {
        console.error('Get classes error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/class/:classId/students', async (req, res) => {
    try {
        const { classId } = req.params;
        const students = await query(`
            SELECT s.*, u.name, u.email 
            FROM students s 
            JOIN users u ON s.user_id = u.id 
            WHERE s.class_id = ?
        `, [classId]);

        res.json({ success: true, students });
    } catch (error) {
        console.error('Get students error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/attendance/:classId', async (req, res) => {
    try {
        const { classId } = req.params;
        const { date } = req.query;
        const targetDate = date || new Date().toISOString().split('T')[0];

        const attendance = await query(`
            SELECT a.*, u.name as student_name, s.roll_number 
            FROM attendance a 
            JOIN students s ON a.student_id = s.id 
            JOIN users u ON s.user_id = u.id 
            WHERE a.class_id = ? AND a.date = ?
        `, [classId, targetDate]);

        res.json({ success: true, attendance, date: targetDate });
    } catch (error) {
        console.error('Get attendance error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/attendance/:classId', [
    body('date').notEmpty(),
    body('attendance').isArray()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        const { classId } = req.params;
        const { date, attendance } = req.body;

        const teacherRows = await query('SELECT id FROM teachers WHERE user_id = ?', [req.user.id]);
        const teacherId = teacherRows[0]?.id;

        for (const record of attendance) {
            const existing = await query(
                'SELECT id FROM attendance WHERE student_id = ? AND date = ?',
                [record.student_id, date]
            );

            if (existing.length > 0) {
                await query(
                    'UPDATE attendance SET status = ?, remarks = ?, updated_at = NOW() WHERE id = ?',
                    [record.status, record.remarks || '', existing[0].id]
                );
            } else {
                await query(
                    `INSERT INTO attendance (student_id, class_id, date, status, remarks, recorded_by) 
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [record.student_id, classId, date, record.status, record.remarks || '', teacherId]
                );
            }
        }

        res.json({ success: true, message: 'Attendance marked successfully' });
    } catch (error) {
        console.error('Mark attendance error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/grades/:classId/:subjectId', async (req, res) => {
    try {
        const { classId, subjectId } = req.params;

        const grades = await query(`
            SELECT g.*, u.name as student_name, s.roll_number 
            FROM grades g 
            JOIN students s ON g.student_id = s.id 
            JOIN users u ON s.user_id = u.id 
            WHERE g.class_id = ? AND g.subject_id = ?
        `, [classId, subjectId]);

        res.json({ success: true, grades });
    } catch (error) {
        console.error('Get grades error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/grades', [
    body('student_id').notEmpty(),
    body('subject_id').notEmpty(),
    body('class_id').notEmpty(),
    body('assessment_type').notEmpty(),
    body('score').isNumeric(),
    body('max_score').isNumeric()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        const { student_id, subject_id, class_id, assessment_type, score, max_score, remarks } = req.body;

        const gradeUploadSettings = await query('SELECT setting_key, setting_value FROM settings WHERE setting_key IN ("grade_upload_enabled", "grade_upload_start_date", "grade_upload_end_date")');
        const settings = {};
        gradeUploadSettings.forEach(s => { settings[s.setting_key] = s.setting_value; });

        if (settings.grade_upload_enabled === 'false') {
            return res.status(403).json({ error: 'Grade upload is currently disabled by admin' });
        }

        const now = new Date();
        if (settings.grade_upload_start_date) {
            const startDate = new Date(settings.grade_upload_start_date);
            if (now < startDate) {
                return res.status(403).json({ error: `Grade upload will be enabled from ${startDate.toLocaleDateString()}` });
            }
        }
        if (settings.grade_upload_end_date) {
            const endDate = new Date(settings.grade_upload_end_date);
            if (now > endDate) {
                return res.status(403).json({ error: `Grade upload deadline was ${endDate.toLocaleDateString()}` });
            }
        }

        const scoreNum = parseFloat(score);
        const maxScoreNum = parseFloat(max_score);

        if (isNaN(scoreNum) || isNaN(maxScoreNum)) {
            return res.status(400).json({ error: 'Score and max score must be valid numbers' });
        }

        if (scoreNum < 0 || scoreNum > maxScoreNum) {
            return res.status(400).json({ error: `Score must be between 0 and ${maxScoreNum}` });
        }

        if (maxScoreNum <= 0) {
            return res.status(400).json({ error: 'Max score must be greater than 0' });
        }

        const teacherRows = await query('SELECT id FROM teachers WHERE user_id = ?', [req.user.id]);
        if (teacherRows.length === 0) {
            return res.status(403).json({ error: 'Teacher profile not found. Please contact admin.' });
        }
        const teacherId = teacherRows[0].id;

        const percentage = (scoreNum / maxScoreNum) * 100;
        let grade = percentage >= 90 ? 'A+' : percentage >= 80 ? 'A' : percentage >= 70 ? 'B+' : 
                    percentage >= 60 ? 'B' : percentage >= 50 ? 'C' : percentage >= 40 ? 'D' : 'F';

        const existing = await query(
            'SELECT id FROM grades WHERE student_id = ? AND subject_id = ? AND class_id = ? AND assessment_type = ?',
            [student_id, subject_id, class_id, assessment_type]
        );

        if (existing.length > 0) {
            await query(
                'UPDATE grades SET score = ?, max_score = ?, grade = ?, remarks = ?, updated_at = NOW() WHERE id = ?',
                [scoreNum, maxScoreNum, grade, remarks || '', existing[0].id]
            );
        } else {
            await query(
                `INSERT INTO grades (student_id, subject_id, class_id, assessment_type, score, max_score, grade, remarks, recorded_by) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [student_id, subject_id, class_id, assessment_type, scoreNum, maxScoreNum, grade, remarks || '', teacherId]
            );
        }

        const studentRows = await query('SELECT user_id FROM students WHERE id = ?', [student_id]);
        if (studentRows.length > 0) {
            await query(
                `INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)`,
                [studentRows[0].user_id, 'Grade Uploaded', 
                 `Your grade for ${assessment_type} has been uploaded. Score: ${scoreNum}/${maxScoreNum}`, 'grade']
            );
        }

        res.json({ success: true, message: 'Grade saved successfully', grade });
    } catch (error) {
        console.error('Save grade error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/assignments', async (req, res) => {
    try {
        const teacherRows = await query('SELECT id FROM teachers WHERE user_id = ?', [req.user.id]);
        if (teacherRows.length === 0) return res.json({ success: true, assignments: [] });

        const teacherId = teacherRows[0].id;

        const assignments = await query(`
            SELECT a.*, s.name as subject_name, c.name as class_name,
            (SELECT COUNT(*) FROM submissions WHERE assignment_id = a.id) as submission_count
            FROM assignments a
            JOIN subjects s ON a.subject_id = s.id
            JOIN classes c ON a.class_id = c.id
            WHERE a.teacher_id = ?
        `, [teacherId]);

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

        const teacherRows = await query('SELECT id FROM teachers WHERE user_id = ?', [req.user.id]);
        if (teacherRows.length === 0) {
            return res.status(403).json({ error: 'Teacher profile not found. Please contact admin.' });
        }
        const teacherId = teacherRows[0].id;

        if (!class_id || !subject_id) {
            return res.status(400).json({ error: 'Class and Subject are required' });
        }

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

router.put('/assignments/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, due_date, max_marks, status } = req.body;

        const existing = await query('SELECT id FROM assignments WHERE id = ?', [id]);
        if (existing.length === 0) return res.status(404).json({ error: 'Assignment not found' });

        const updates = [];
        const values = [];

        if (title) { updates.push('title = ?'); values.push(title); }
        if (description !== undefined) { updates.push('description = ?'); values.push(description); }
        if (due_date) { updates.push('due_date = ?'); values.push(due_date); }
        if (max_marks) { updates.push('max_marks = ?'); values.push(max_marks); }
        if (status) { updates.push('status = ?'); values.push(status); }

        if (updates.length > 0) {
            updates.push('updated_at = NOW()');
            values.push(id);
            await query(`UPDATE assignments SET ${updates.join(', ')} WHERE id = ?`, values);
        }

        res.json({ success: true, message: 'Assignment updated successfully' });
    } catch (error) {
        console.error('Update assignment error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.delete('/assignments/:id', async (req, res) => {
    try {
        const { id } = req.params;

        await query('DELETE FROM submissions WHERE assignment_id = ?', [id]);
        await query('DELETE FROM assignments WHERE id = ?', [id]);

        res.json({ success: true, message: 'Assignment deleted successfully' });
    } catch (error) {
        console.error('Delete assignment error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/assignments/:id/submissions', async (req, res) => {
    try {
        const { id } = req.params;

        const submissions = await query(`
            SELECT sub.*, u.name as student_name, s.roll_number 
            FROM submissions sub 
            JOIN students s ON sub.student_id = s.id 
            JOIN users u ON s.user_id = u.id 
            WHERE sub.assignment_id = ?
        `, [id]);

        res.json({ success: true, submissions });
    } catch (error) {
        console.error('Get submissions error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/timetable', async (req, res) => {
    try {
        const teacherRows = await query('SELECT id FROM teachers WHERE user_id = ?', [req.user.id]);
        if (teacherRows.length === 0) return res.json({ success: true, timetable: [] });

        const teacherId = teacherRows[0].id;

        const timetable = await query(`
            SELECT t.*, s.name as subject_name, c.name as class_name 
            FROM timetable t 
            JOIN subjects s ON t.subject_id = s.id 
            JOIN classes c ON t.class_id = c.id 
            WHERE t.teacher_id = ?
        `, [teacherId]);

        res.json({ success: true, timetable });
    } catch (error) {
        console.error('Get timetable error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

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
            [receiver_id, 'New Message', `New message: ${subject || 'No subject'}`, 'message']
        );

        res.status(201).json({ success: true, message: 'Message sent successfully' });
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/students/search', async (req, res) => {
    try {
        const { q } = req.query;
        const searchTerm = `%${q || ''}%`;

        const students = await query(`
            SELECT s.id, u.name, s.roll_number 
            FROM students s 
            JOIN users u ON s.user_id = u.id 
            WHERE u.name LIKE ? OR s.roll_number LIKE ?
            LIMIT 20
        `, [searchTerm, searchTerm]);

        res.json({ success: true, students });
    } catch (error) {
        console.error('Search students error:', error);
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
