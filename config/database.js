const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

function getDbConfig() {
  let config;
  if (process.env.DATABASE_URL) {
    try {
      const url = new URL(process.env.DATABASE_URL);
      config = {
        host: url.hostname,
        port: parseInt(url.port || '3306'),
        user: decodeURIComponent(url.username),
        password: decodeURIComponent(url.password),
        database: url.pathname.replace(/^\//, '') || 'defaultdb',
      };
    } catch {
      config = { uri: process.env.DATABASE_URL };
      return config;
    }
  } else {
    config = {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'school_management',
      port: parseInt(process.env.DB_PORT || '3306'),
    };
  }
  config.waitForConnections = true;
  config.connectionLimit = parseInt(process.env.DB_POOL_LIMIT || '10');
  config.queueLimit = 0;
  const needsSsl = process.env.DB_SSL === 'true'
    || config.host !== 'localhost'
    || (process.env.DATABASE_URL || '').includes('ssl');
  config.ssl = needsSsl
    ? process.env.DB_CA_CERT
        ? { ca: process.env.DB_CA_CERT, rejectUnauthorized: true }
        : { rejectUnauthorized: false }
    : undefined;
  return config;
}

let pool;

async function initialize() {
    try {
        const config = getDbConfig();
        pool = config.uri
            ? mysql.createPool(config.uri)
            : mysql.createPool(config);
        
        const connection = await pool.getConnection();
        console.log('Connected to MySQL database successfully');
        
        await createTables(connection);
        await seedData(connection);
        
        connection.release();
        console.log('Database initialized successfully');
        return pool;
    } catch (error) {
        console.error('Database initialization failed:', error.message);
        throw error;
    }
}

async function createTables(connection) {
    await connection.query(`
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            role ENUM('admin','teacher','student','parent') NOT NULL DEFAULT 'student',
            phone VARCHAR(50) DEFAULT '',
            address TEXT,
            avatar VARCHAR(500) DEFAULT NULL,
            status ENUM('active','inactive','suspended') NOT NULL DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);
    await connection.query(`
        CREATE TABLE IF NOT EXISTS students (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) DEFAULT '',
            class_id INT DEFAULT NULL,
            roll_number VARCHAR(50) DEFAULT NULL,
            date_of_birth DATE DEFAULT NULL,
            gender VARCHAR(20) DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);
    await connection.query(`
        CREATE TABLE IF NOT EXISTS teachers (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL UNIQUE,
            name VARCHAR(255) NOT NULL,
            employee_id VARCHAR(50) DEFAULT NULL UNIQUE,
            qualification VARCHAR(255) DEFAULT '',
            specialization VARCHAR(255) DEFAULT '',
            experience INT DEFAULT 0,
            joining_date DATE DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);
    await connection.query(`
        CREATE TABLE IF NOT EXISTS parents (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) DEFAULT '',
            phone VARCHAR(50) DEFAULT '',
            occupation VARCHAR(255) DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);
    await connection.query(`
        CREATE TABLE IF NOT EXISTS classes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            grade VARCHAR(50) DEFAULT NULL,
            section VARCHAR(50) DEFAULT NULL,
            room VARCHAR(50) DEFAULT '',
            capacity INT DEFAULT 40,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);
    await connection.query(`
        CREATE TABLE IF NOT EXISTS subjects (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            code VARCHAR(50) NOT NULL UNIQUE,
            description TEXT,
            type VARCHAR(50) DEFAULT 'core',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);
    await connection.query(`
        CREATE TABLE IF NOT EXISTS teacher_subjects (
            id INT AUTO_INCREMENT PRIMARY KEY,
            teacher_id INT NOT NULL,
            subject_id INT NOT NULL,
            class_id INT NOT NULL,
            FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
            FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
            FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
        )
    `);
    await connection.query(`
        CREATE TABLE IF NOT EXISTS student_parent (
            id INT AUTO_INCREMENT PRIMARY KEY,
            student_id INT NOT NULL,
            parent_id INT NOT NULL,
            relationship VARCHAR(50) DEFAULT NULL,
            FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
            FOREIGN KEY (parent_id) REFERENCES parents(id) ON DELETE CASCADE
        )
    `);
    await connection.query(`
        CREATE TABLE IF NOT EXISTS attendance (
            id INT AUTO_INCREMENT PRIMARY KEY,
            student_id INT NOT NULL,
            class_id INT DEFAULT NULL,
            date DATE NOT NULL,
            status ENUM('present','absent','late','excused') NOT NULL DEFAULT 'present',
            remarks TEXT,
            recorded_by INT DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
        )
    `);
    await connection.query(`
        CREATE TABLE IF NOT EXISTS grades (
            id INT AUTO_INCREMENT PRIMARY KEY,
            student_id INT NOT NULL,
            subject_id INT DEFAULT NULL,
            class_id INT DEFAULT NULL,
            assessment_type VARCHAR(100) DEFAULT NULL,
            score DECIMAL(10,2) DEFAULT 0,
            max_score DECIMAL(10,2) DEFAULT 100,
            grade VARCHAR(10) DEFAULT NULL,
            remarks TEXT,
            recorded_by INT DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
        )
    `);
    await connection.query(`
        CREATE TABLE IF NOT EXISTS assignments (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            class_id INT DEFAULT NULL,
            subject_id INT DEFAULT NULL,
            teacher_id INT DEFAULT NULL,
            due_date DATE DEFAULT NULL,
            max_marks INT DEFAULT 100,
            status VARCHAR(50) DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
            FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
            FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL
        )
    `);
    await connection.query(`
        CREATE TABLE IF NOT EXISTS submissions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            assignment_id INT NOT NULL,
            student_id INT NOT NULL,
            content TEXT,
            submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            grade VARCHAR(10) DEFAULT NULL,
            feedback TEXT,
            FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
            FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
        )
    `);
    await connection.query(`
        CREATE TABLE IF NOT EXISTS timetable (
            id INT AUTO_INCREMENT PRIMARY KEY,
            class_id INT DEFAULT NULL,
            subject_id INT DEFAULT NULL,
            teacher_id INT DEFAULT NULL,
            day VARCHAR(20) NOT NULL,
            period INT DEFAULT 1,
            start_time VARCHAR(10) DEFAULT NULL,
            end_time VARCHAR(10) DEFAULT NULL,
            room VARCHAR(50) DEFAULT NULL,
            FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
            FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
            FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL
        )
    `);
    await connection.query(`
        CREATE TABLE IF NOT EXISTS messages (
            id INT AUTO_INCREMENT PRIMARY KEY,
            sender_id INT NOT NULL,
            receiver_id INT NOT NULL,
            subject VARCHAR(255) DEFAULT '',
            content TEXT NOT NULL,
            is_read TINYINT(1) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);
    await connection.query(`
        CREATE TABLE IF NOT EXISTS notifications (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            title VARCHAR(255) NOT NULL,
            message TEXT,
            type VARCHAR(50) DEFAULT 'info',
            is_read TINYINT(1) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);
    await connection.query(`
        CREATE TABLE IF NOT EXISTS settings (
            setting_key VARCHAR(100) PRIMARY KEY,
            setting_value TEXT
        )
    `);
    await connection.query(`
        CREATE TABLE IF NOT EXISTS fees (
            id INT AUTO_INCREMENT PRIMARY KEY,
            student_id INT NOT NULL,
            amount DECIMAL(10,2) NOT NULL DEFAULT 0,
            due_date DATE DEFAULT NULL,
            status ENUM('paid','unpaid','partial','overdue') DEFAULT 'unpaid',
            paid_date DATE DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
        )
    `);
    console.log('Database tables created/verified successfully');
}

function getPool() {
    return pool;
}

async function query(sql, params = []) {
    const [rows] = await pool.execute(sql, params);
    return rows;
}

async function seedData(connection) {
    const [existingUsers] = await connection.query('SELECT COUNT(*) as count FROM users');
    if (existingUsers[0].count > 0) {
        return;
    }

    const adminPassword = bcrypt.hashSync('admin123', 10);
    const teacherPassword = bcrypt.hashSync('teacher123', 10);
    const studentPassword = bcrypt.hashSync('student123', 10);
    const parentPassword = bcrypt.hashSync('parent123', 10);

    await connection.query(`
        INSERT INTO users (name, email, password, role, phone, address) VALUES
        (?, ?, ?, 'admin', '555-0001', 'Admin Office, Springfield'),
        (?, ?, ?, 'teacher', '555-1001', 'Faculty Building A, Room 101'),
        (?, ?, ?, 'teacher', '555-1002', 'Faculty Building B, Room 202')
    `, [
        'System Administrator', 'admin@school.com', adminPassword,
        'John Smith', 'john.smith@school.com', teacherPassword,
        'Sarah Johnson', 'sarah.johnson@school.com', teacherPassword
    ]);

    const [adminUser] = await connection.query('SELECT id FROM users WHERE email = ?', ['admin@school.com']);
    const [teacher1User] = await connection.query('SELECT id FROM users WHERE email = ?', ['john.smith@school.com']);
    const [teacher2User] = await connection.query('SELECT id FROM users WHERE email = ?', ['sarah.johnson@school.com']);

    await connection.query(`
        INSERT INTO teachers (user_id, name, employee_id, qualification, specialization, experience, joining_date) VALUES
        (?, 'John Smith', 'EMP001', 'M.Sc Mathematics', 'Mathematics', 8, '2020-08-15'),
        (?, 'Sarah Johnson', 'EMP002', 'Ph.D Physics', 'Physics', 12, '2018-01-10')
    `, [teacher1User[0].id, teacher2User[0].id]);

    await connection.query(`
        INSERT INTO classes (name, grade, section, room, capacity) VALUES
        ('Class 10-A', '10', 'A', 'Room 101', 40),
        ('Class 10-B', '10', 'B', 'Room 102', 38),
        ('Class 9-A', '9', 'A', 'Room 201', 35),
        ('Class 9-B', '9', 'B', 'Room 202', 36),
        ('Class 8-A', '8', 'A', 'Room 301', 40)
    `);

    await connection.query(`
        INSERT INTO subjects (name, code, description, type) VALUES
        ('Mathematics', 'MATH101', 'Core mathematics including algebra, geometry, and calculus basics', 'core'),
        ('Physics', 'PHY101', 'Fundamentals of physics including mechanics and thermodynamics', 'core'),
        ('Chemistry', 'CHEM101', 'Introduction to organic and inorganic chemistry', 'core'),
        ('English', 'ENG101', 'English language and literature', 'core'),
        ('History', 'HIST101', 'World history and geography', 'elective'),
        ('Biology', 'BIO101', 'Introduction to biology and life sciences', 'core'),
        ('Art & Craft', 'ART101', 'Creative arts', 'elective')
    `);

    const [teacher1] = await connection.query('SELECT id FROM teachers WHERE employee_id = ?', ['EMP001']);
    const [teacher2] = await connection.query('SELECT id FROM teachers WHERE employee_id = ?', ['EMP002']);
    const [class10a] = await connection.query('SELECT id FROM classes WHERE name = ?', ['Class 10-A']);
    const [class10b] = await connection.query('SELECT id FROM classes WHERE name = ?', ['Class 10-B']);
    const [math] = await connection.query('SELECT id FROM subjects WHERE code = ?', ['MATH101']);
    const [phy] = await connection.query('SELECT id FROM subjects WHERE code = ?', ['PHY101']);

    await connection.query(`
        INSERT INTO teacher_subjects (teacher_id, subject_id, class_id) VALUES
        (?, ?, ?),
        (?, ?, ?),
        (?, ?, ?),
        (?, ?, ?)
    `, [
        teacher1[0].id, math[0].id, class10a[0].id,
        teacher1[0].id, math[0].id, class10b[0].id,
        teacher2[0].id, phy[0].id, class10a[0].id,
        teacher2[0].id, phy[0].id, class10b[0].id
    ]);

    const studentNames = [
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

    for (let i = 0; i < studentNames.length; i++) {
        const student = studentNames[i];
        const userClassId = i < 5 ? class10a[0].id : class10b[0].id;
        
        const [result] = await connection.query(
            'INSERT INTO users (name, email, password, role, status) VALUES (?, ?, ?, ?, ?)',
            [student.name, student.email, studentPassword, 'student', 'active']
        );
        
        await connection.query(
            'INSERT INTO students (user_id, name, email, class_id, roll_number, date_of_birth, gender) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [result.insertId, student.name, student.email, userClassId, `STU${String(i + 1).padStart(4, '0')}`, '2010-05-15', i % 2 === 0 ? 'Male' : 'Female']
        );
    }

    await connection.query(`
        INSERT INTO users (name, email, password, role, phone, address) VALUES
        (?, ?, ?, 'parent', '555-2001', '123 Parent Street, Springfield')
    `, ['Robert Brown', 'robert.brown@parent.com', parentPassword]);

    const [parentUser] = await connection.query('SELECT id FROM users WHERE email = ?', ['robert.brown@parent.com']);
    
    await connection.query(
        'INSERT INTO parents (user_id, name, email, phone, occupation) VALUES (?, ?, ?, ?, ?)',
        [parentUser[0].id, 'Robert Brown', 'robert.brown@parent.com', '555-2001', 'Engineer']
    );

    const [parent] = await connection.query('SELECT id FROM parents WHERE email = ?', ['robert.brown@parent.com']);
    const [student1] = await connection.query('SELECT id FROM students WHERE roll_number = ?', ['STU0001']);
    
    await connection.query(
        'INSERT INTO student_parent (student_id, parent_id, relationship) VALUES (?, ?, ?)',
        [student1[0].id, parent[0].id, 'Father']
    );

    const [subjectRows] = await connection.query('SELECT id FROM subjects WHERE code IN (?, ?, ?, ?)', ['CHEM101', 'ENG101', 'HIST101', 'BIO101']);
    const chem = subjectRows[0];
    const eng = subjectRows[1];
    const hist = subjectRows[2];
    const bio = subjectRows[3];

    await connection.query(`
        INSERT INTO assignments (title, description, class_id, subject_id, teacher_id, due_date, max_marks) VALUES
        ('Mathematics Homework Ch. 5', 'Complete exercises 1-10 from Chapter 5: Quadratic Equations', ?, ?, ?, DATE_ADD(CURDATE(), INTERVAL 7 DAY), 20),
        ('Physics Lab Report', 'Write a lab report on the simple pendulum experiment', ?, ?, ?, DATE_ADD(CURDATE(), INTERVAL 5 DAY), 30),
        ('English Essay', 'Write an essay on The Impact of Technology on Education (500 words)', ?, ?, ?, DATE_ADD(CURDATE(), INTERVAL 10 DAY), 25)
    `, [
        class10a[0].id, math[0].id, teacher1[0].id,
        class10a[0].id, phy[0].id, teacher2[0].id,
        class10a[0].id, eng.id, teacher1[0].id
    ]);

    await connection.query(`
        INSERT INTO timetable (class_id, subject_id, teacher_id, day, period, start_time, end_time, room) VALUES
        (?, ?, ?, 'Monday', 1, '08:00', '09:00', 'Room 101'),
        (?, ?, ?, 'Monday', 2, '09:00', '10:00', 'Room 101'),
        (?, ?, ?, 'Monday', 3, '10:00', '11:00', 'Room 101'),
        (?, ?, ?, 'Tuesday', 1, '08:00', '09:00', 'Room 101'),
        (?, ?, ?, 'Tuesday', 2, '09:00', '10:00', 'Room 101'),
        (?, ?, ?, 'Wednesday', 1, '08:00', '09:00', 'Room 101'),
        (?, ?, ?, 'Thursday', 1, '08:00', '09:00', 'Room 101'),
        (?, ?, ?, 'Friday', 1, '08:00', '09:00', 'Room 101')
    `, [
        class10a[0].id, math[0].id, teacher1[0].id,
        class10a[0].id, eng[0].id, teacher1[0].id,
        class10a[0].id, phy[0].id, teacher2[0].id,
        class10a[0].id, phy[0].id, teacher2[0].id,
        class10a[0].id, math[0].id, teacher1[0].id,
        class10a[0].id, math[0].id, teacher1[0].id,
        class10a[0].id, eng[0].id, teacher1[0].id,
        class10a[0].id, math[0].id, teacher1[0].id
    ]);

    const [studentRows] = await connection.query('SELECT id FROM students WHERE class_id = ?', [class10a[0].id]);
    const [allSubjects] = await connection.query('SELECT id FROM subjects');

    for (const student of studentRows) {
        for (const subject of allSubjects) {
            await connection.query(
                'INSERT INTO grades (student_id, subject_id, class_id, assessment_type, score, max_score) VALUES (?, ?, ?, ?, ?, ?)',
                [student.id, subject.id, class10a[0].id, 'Term Test', Math.floor(Math.random() * 40) + 60, 100]
            );
        }
    }

    console.log('Default admin created: admin@school.com / admin123');
    console.log('Default teacher created: john.smith@school.com / teacher123');
    console.log('Default student created: michael.brown@student.com / student123');
    console.log('Default parent created: robert.brown@parent.com / parent123');
    console.log('Sample data seeded successfully');

    await connection.query(`
        INSERT IGNORE INTO settings (setting_key, setting_value) VALUES 
        ('school_name', 'Springfield Academy'),
        ('academic_year', '2025-2026'),
        ('term', 'First Term'),
        ('grade_upload_enabled', 'true'),
        ('grade_upload_start_date', ''),
        ('grade_upload_end_date', '')
    `);
}

module.exports = {
    initialize,
    getPool,
    query
};
