const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

let db = null;

function initialize() {
    db = new Database(':memory:');
    db.pragma('journal_mode = MEMORY');
    db.pragma('foreign_keys = ON');
    createTables();
    seedData();
    console.log('SQLite in-memory database initialized');
    return db;
}

function getPool() {
    return db ? {} : null;
}

function query(sql, params = []) {
    if (!db) throw new Error('Database not initialized');
    sql = sql.replace(/\bCURDATE\(\)/g, "date('now')");
    sql = sql.replace(/\bNOW\(\)/g, "datetime('now')");
    sql = sql.replace(/ON DUPLICATE KEY UPDATE\s+\w+\s*=\s*\?/gi, '');
    sql = sql.replace(/\bINSERT IGNORE\b/g, 'INSERT OR IGNORE');

    const isSelect = /^\s*SELECT/i.test(sql);
    try {
        const stmt = db.prepare(sql);
        if (isSelect) {
            const rows = params.length > 0 ? stmt.all(...params) : stmt.all();
            if (/COUNT/i.test(sql) && rows.length === 0) return [{ 'COUNT(*)': 0 }];
            if (rows.length === 0) return [];
            return rows;
        } else {
            const info = params.length > 0 ? stmt.run(...params) : stmt.run();
            return { insertId: info.lastInsertRowid, affectedRows: info.changes };
        }
    } catch (err) {
        console.error('SQLite query error:', err.message);
        console.error('SQL:', sql);
        console.error('Params:', params);
        throw err;
    }
}

function exec(sql) {
    if (!db) throw new Error('Database not initialized');
    db.exec(sql);
}

function createTables() {
    exec(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'student' CHECK(role IN ('admin','teacher','student','parent')),
        phone TEXT DEFAULT '',
        address TEXT,
        avatar TEXT DEFAULT NULL,
        status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive','suspended')),
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
    )`);
    exec(`CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        email TEXT DEFAULT '',
        class_id INTEGER DEFAULT NULL,
        roll_number TEXT DEFAULT NULL,
        date_of_birth TEXT DEFAULT NULL,
        gender TEXT DEFAULT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);
    exec(`CREATE TABLE IF NOT EXISTS teachers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL UNIQUE,
        name TEXT NOT NULL,
        employee_id TEXT DEFAULT NULL UNIQUE,
        qualification TEXT DEFAULT '',
        specialization TEXT DEFAULT '',
        experience INTEGER DEFAULT 0,
        joining_date TEXT DEFAULT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);
    exec(`CREATE TABLE IF NOT EXISTS parents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        email TEXT DEFAULT '',
        phone TEXT DEFAULT '',
        occupation TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);
    exec(`CREATE TABLE IF NOT EXISTS classes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        grade TEXT DEFAULT NULL,
        section TEXT DEFAULT NULL,
        room TEXT DEFAULT '',
        capacity INTEGER DEFAULT 40,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
    )`);
    exec(`CREATE TABLE IF NOT EXISTS subjects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        code TEXT NOT NULL UNIQUE,
        description TEXT,
        type TEXT DEFAULT 'core',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
    )`);
    exec(`CREATE TABLE IF NOT EXISTS teacher_subjects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        teacher_id INTEGER NOT NULL,
        subject_id INTEGER NOT NULL,
        class_id INTEGER NOT NULL,
        FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
    )`);
    exec(`CREATE TABLE IF NOT EXISTS student_parent (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        parent_id INTEGER NOT NULL,
        relationship TEXT DEFAULT NULL,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_id) REFERENCES parents(id) ON DELETE CASCADE
    )`);
    exec(`CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        class_id INTEGER DEFAULT NULL,
        date TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'present' CHECK(status IN ('present','absent','late','excused')),
        remarks TEXT,
        recorded_by INTEGER DEFAULT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    )`);
    exec(`CREATE TABLE IF NOT EXISTS grades (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        subject_id INTEGER DEFAULT NULL,
        class_id INTEGER DEFAULT NULL,
        assessment_type TEXT DEFAULT NULL,
        score REAL DEFAULT 0,
        max_score REAL DEFAULT 100,
        grade TEXT DEFAULT NULL,
        remarks TEXT,
        recorded_by INTEGER DEFAULT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    )`);
    exec(`CREATE TABLE IF NOT EXISTS assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        class_id INTEGER DEFAULT NULL,
        subject_id INTEGER DEFAULT NULL,
        teacher_id INTEGER DEFAULT NULL,
        due_date TEXT DEFAULT NULL,
        max_marks INTEGER DEFAULT 100,
        status TEXT DEFAULT 'active',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
        FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL
    )`);
    exec(`CREATE TABLE IF NOT EXISTS submissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        assignment_id INTEGER NOT NULL,
        student_id INTEGER NOT NULL,
        content TEXT,
        submitted_at TEXT DEFAULT (datetime('now')),
        grade TEXT DEFAULT NULL,
        feedback TEXT,
        FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    )`);
    exec(`CREATE TABLE IF NOT EXISTS timetable (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        class_id INTEGER DEFAULT NULL,
        subject_id INTEGER DEFAULT NULL,
        teacher_id INTEGER DEFAULT NULL,
        day TEXT NOT NULL,
        period INTEGER DEFAULT 1,
        start_time TEXT DEFAULT NULL,
        end_time TEXT DEFAULT NULL,
        room TEXT DEFAULT NULL,
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
        FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL
    )`);
    exec(`CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender_id INTEGER NOT NULL,
        receiver_id INTEGER NOT NULL,
        subject TEXT DEFAULT '',
        content TEXT NOT NULL,
        is_read INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
    )`);
    exec(`CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        message TEXT,
        type TEXT DEFAULT 'info',
        is_read INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);
    exec(`CREATE TABLE IF NOT EXISTS settings (
        setting_key TEXT PRIMARY KEY,
        setting_value TEXT
    )`);
    exec(`CREATE TABLE IF NOT EXISTS fees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        amount REAL NOT NULL DEFAULT 0,
        due_date TEXT DEFAULT NULL,
        status TEXT DEFAULT 'unpaid' CHECK(status IN ('paid','unpaid','partial','overdue')),
        paid_date TEXT DEFAULT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    )`);
    console.log('SQLite tables created');
}

function seedData() {
    const existing = query('SELECT COUNT(*) as count FROM users');
    if (existing[0].count > 0) return;

    const adminPw = bcrypt.hashSync('admin123', 10);
    const teacherPw = bcrypt.hashSync('teacher123', 10);
    const studentPw = bcrypt.hashSync('student123', 10);
    const parentPw = bcrypt.hashSync('parent123', 10);

    query(`INSERT INTO users (name, email, password, role, phone, address) VALUES (?, ?, ?, 'admin', '555-0001', 'Admin Office, Springfield')`, ['System Administrator', 'admin@school.com', adminPw]);
    query(`INSERT INTO users (name, email, password, role, phone, address) VALUES (?, ?, ?, 'teacher', '555-1001', 'Faculty Building A, Room 101')`, ['John Smith', 'john.smith@school.com', teacherPw]);
    query(`INSERT INTO users (name, email, password, role, phone, address) VALUES (?, ?, ?, 'teacher', '555-1002', 'Faculty Building B, Room 202')`, ['Sarah Johnson', 'sarah.johnson@school.com', teacherPw]);

    const adminUser = query(`SELECT id FROM users WHERE email = ?`, ['admin@school.com']);
    const teacher1User = query(`SELECT id FROM users WHERE email = ?`, ['john.smith@school.com']);
    const teacher2User = query(`SELECT id FROM users WHERE email = ?`, ['sarah.johnson@school.com']);

    query(`INSERT INTO teachers (user_id, name, employee_id, qualification, specialization, experience, joining_date) VALUES (?, ?, ?, ?, ?, ?, ?)`, [teacher1User[0].id, 'John Smith', 'EMP001', 'M.Sc Mathematics', 'Mathematics', 8, '2020-08-15']);
    query(`INSERT INTO teachers (user_id, name, employee_id, qualification, specialization, experience, joining_date) VALUES (?, ?, ?, ?, ?, ?, ?)`, [teacher2User[0].id, 'Sarah Johnson', 'EMP002', 'Ph.D Physics', 'Physics', 12, '2018-01-10']);

    query(`INSERT INTO classes (name, grade, section, room, capacity) VALUES (?, ?, ?, ?, ?)`, ['Class 10-A', '10', 'A', 'Room 101', 40]);
    query(`INSERT INTO classes (name, grade, section, room, capacity) VALUES (?, ?, ?, ?, ?)`, ['Class 10-B', '10', 'B', 'Room 102', 38]);
    query(`INSERT INTO classes (name, grade, section, room, capacity) VALUES (?, ?, ?, ?, ?)`, ['Class 9-A', '9', 'A', 'Room 201', 35]);
    query(`INSERT INTO classes (name, grade, section, room, capacity) VALUES (?, ?, ?, ?, ?)`, ['Class 9-B', '9', 'B', 'Room 202', 36]);
    query(`INSERT INTO classes (name, grade, section, room, capacity) VALUES (?, ?, ?, ?, ?)`, ['Class 8-A', '8', 'A', 'Room 301', 40]);

    query(`INSERT INTO subjects (name, code, description, type) VALUES (?, ?, ?, ?)`, ['Mathematics', 'MATH101', 'Core mathematics including algebra, geometry, and calculus basics', 'core']);
    query(`INSERT INTO subjects (name, code, description, type) VALUES (?, ?, ?, ?)`, ['Physics', 'PHY101', 'Fundamentals of physics including mechanics and thermodynamics', 'core']);
    query(`INSERT INTO subjects (name, code, description, type) VALUES (?, ?, ?, ?)`, ['Chemistry', 'CHEM101', 'Introduction to organic and inorganic chemistry', 'core']);
    query(`INSERT INTO subjects (name, code, description, type) VALUES (?, ?, ?, ?)`, ['English', 'ENG101', 'English language and literature', 'core']);
    query(`INSERT INTO subjects (name, code, description, type) VALUES (?, ?, ?, ?)`, ['History', 'HIST101', 'World history and geography', 'elective']);
    query(`INSERT INTO subjects (name, code, description, type) VALUES (?, ?, ?, ?)`, ['Biology', 'BIO101', 'Introduction to biology and life sciences', 'core']);
    query(`INSERT INTO subjects (name, code, description, type) VALUES (?, ?, ?, ?)`, ['Art & Craft', 'ART101', 'Creative arts', 'elective']);

    const teacher1 = query(`SELECT id FROM teachers WHERE employee_id = ?`, ['EMP001']);
    const teacher2 = query(`SELECT id FROM teachers WHERE employee_id = ?`, ['EMP002']);
    const class10a = query(`SELECT id FROM classes WHERE name = ?`, ['Class 10-A']);
    const class10b = query(`SELECT id FROM classes WHERE name = ?`, ['Class 10-B']);
    const math = query(`SELECT id FROM subjects WHERE code = ?`, ['MATH101']);
    const phy = query(`SELECT id FROM subjects WHERE code = ?`, ['PHY101']);

    query(`INSERT INTO teacher_subjects (teacher_id, subject_id, class_id) VALUES (?, ?, ?)`, [teacher1[0].id, math[0].id, class10a[0].id]);
    query(`INSERT INTO teacher_subjects (teacher_id, subject_id, class_id) VALUES (?, ?, ?)`, [teacher1[0].id, math[0].id, class10b[0].id]);
    query(`INSERT INTO teacher_subjects (teacher_id, subject_id, class_id) VALUES (?, ?, ?)`, [teacher2[0].id, phy[0].id, class10a[0].id]);
    query(`INSERT INTO teacher_subjects (teacher_id, subject_id, class_id) VALUES (?, ?, ?)`, [teacher2[0].id, phy[0].id, class10b[0].id]);

    const students = [
        { name: 'Michael Brown', email: 'michael.brown@student.com' },
        { name: 'Emily Davis', email: 'emily.davis@student.com' },
        { name: 'James Wilson', email: 'james.wilson@student.com' },
        { name: 'Emma Martinez', email: 'emma.martinez@student.com' },
        { name: 'William Taylor', email: 'william.taylor@student.com' },
        { name: 'Olivia Anderson', email: 'olivia.anderson@student.com' },
        { name: 'Benjamin Thomas', email: 'benjamin.thomas@student.com' },
        { name: 'Sophia Jackson', email: 'sophia.jackson@student.com' },
        { name: 'Lucas White', email: 'lucas.white@student.com' },
        { name: 'Ava Harris', email: 'ava.harris@student.com' }
    ];

    students.forEach((s, i) => {
        const clsId = i < 5 ? class10a[0].id : class10b[0].id;
        query(`INSERT INTO users (name, email, password, role, status) VALUES (?, ?, ?, 'student', 'active')`, [s.name, s.email, studentPw]);
        const user = query(`SELECT id FROM users WHERE email = ?`, [s.email]);
        query(`INSERT INTO students (user_id, name, email, class_id, roll_number, date_of_birth, gender) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [user[0].id, s.name, s.email, clsId, `STU${String(i + 1).padStart(4, '0')}`, '2010-05-15', i % 2 === 0 ? 'Male' : 'Female']);
    });

    query(`INSERT INTO users (name, email, password, role, phone, address) VALUES (?, ?, ?, 'parent', '555-2001', '123 Parent Street, Springfield')`, ['Robert Brown', 'robert.brown@parent.com', parentPw]);
    const parentUser = query(`SELECT id FROM users WHERE email = ?`, ['robert.brown@parent.com']);
    query(`INSERT INTO parents (user_id, name, email, phone, occupation) VALUES (?, ?, ?, ?, ?)`, [parentUser[0].id, 'Robert Brown', 'robert.brown@parent.com', '555-2001', 'Engineer']);
    const parent = query(`SELECT id FROM parents WHERE email = ?`, ['robert.brown@parent.com']);
    const stu1 = query(`SELECT id FROM students WHERE roll_number = ?`, ['STU0001']);
    query(`INSERT INTO student_parent (student_id, parent_id, relationship) VALUES (?, ?, ?)`, [stu1[0].id, parent[0].id, 'Father']);

    const subjectsArr = query(`SELECT id FROM subjects WHERE code IN (?, ?, ?, ?)`, ['CHEM101', 'ENG101', 'HIST101', 'BIO101']);
    const eng = subjectsArr[1];

    query(`INSERT INTO assignments (title, description, class_id, subject_id, teacher_id, due_date, max_marks) VALUES (?, ?, ?, ?, ?, date('now','+7 days'), 20)`, ['Mathematics Homework Ch. 5', 'Complete exercises 1-10 from Chapter 5: Quadratic Equations', class10a[0].id, math[0].id, teacher1[0].id]);
    query(`INSERT INTO assignments (title, description, class_id, subject_id, teacher_id, due_date, max_marks) VALUES (?, ?, ?, ?, ?, date('now','+5 days'), 30)`, ['Physics Lab Report', 'Write a lab report on the simple pendulum experiment', class10a[0].id, phy[0].id, teacher2[0].id]);
    query(`INSERT INTO assignments (title, description, class_id, subject_id, teacher_id, due_date, max_marks) VALUES (?, ?, ?, ?, ?, date('now','+10 days'), 25)`, ['English Essay', 'Write an essay on The Impact of Technology on Education (500 words)', class10a[0].id, eng.id, teacher1[0].id]);

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const periods = [
        [math[0].id, teacher1[0].id, '08:00', '09:00', 'Room 101'],
        [eng.id, teacher1[0].id, '09:00', '10:00', 'Room 101'],
        [phy[0].id, teacher2[0].id, '10:00', '11:00', 'Room 101']
    ];
    periods.forEach((p, pi) => {
        days.forEach(d => {
            query(`INSERT INTO timetable (class_id, subject_id, teacher_id, day, period, start_time, end_time, room) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [class10a[0].id, p[0], p[1], d, pi + 1, p[2], p[3], p[4]]);
        });
    });

    const studentRows = query(`SELECT id FROM students WHERE class_id = ?`, [class10a[0].id]);
    const allSubjects = query(`SELECT id FROM subjects`);
    studentRows.forEach(stu => {
        allSubjects.forEach(sub => {
            const score = Math.floor(Math.random() * 40) + 60;
            query(`INSERT INTO grades (student_id, subject_id, class_id, assessment_type, score, max_score) VALUES (?, ?, ?, ?, ?, ?)`,
                [stu.id, sub.id, class10a[0].id, 'Term Test', score, 100]);
        });
    });

    const settings = [
        ['school_name', 'Springfield Academy'],
        ['academic_year', '2025-2026'],
        ['term', 'First Term'],
        ['grade_upload_enabled', 'true'],
        ['grade_upload_start_date', ''],
        ['grade_upload_end_date', '']
    ];
    settings.forEach(s => {
        query(`INSERT OR IGNORE INTO settings (setting_key, setting_value) VALUES (?, ?)`, [s[0], s[1]]);
    });

    console.log('Default admin created: admin@school.com / admin123');
    console.log('Default teacher created: john.smith@school.com / teacher123');
    console.log('Default student created: michael.brown@student.com / student123');
    console.log('Default parent created: robert.brown@parent.com / parent123');
    console.log('Sample data seeded successfully');
}

module.exports = { initialize, getPool, query };