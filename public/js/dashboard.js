// School Management System - Dashboard JavaScript with Validation

// Global state
window.currentUser = null;
let token = localStorage.getItem('token');

// Role Permissions - Define what each role can access
const RolePermissions = {
    admin: {
        dashboard: true,
        users: true,
        students: true,
        teachers: true,
        classes: true,
        subjects: true,
        attendance: true,
        grades: true,
        assignments: true,
        timetable: true,
        reports: true,
        messages: true,
        settings: true,
        profile: true,
        myClasses: false,
        children: false,
        notifications: true,
        canAddStudent: true,
        canAddTeacher: true,
        canAddClass: true,
        canAddSubject: true,
        canAddAssignment: true,
        canDeleteStudent: true,
        canDeleteTeacher: true,
        canDeleteClass: true,
        canDeleteSubject: true
    },
    teacher: {
        dashboard: true,
        users: false,
        students: false,
        teachers: false,
        classes: false,
        subjects: false,
        attendance: true,
        grades: true,
        assignments: true,
        timetable: true,
        reports: false,
        messages: true,
        settings: false,
        profile: true,
        myClasses: true,
        'my-classes': true,
        children: false,
        notifications: true,
        canAddStudent: false,
        canAddTeacher: false,
        canAddClass: false,
        canAddSubject: false,
        canAddAssignment: true,
        canDeleteStudent: false,
        canDeleteTeacher: false,
        canDeleteClass: false,
        canDeleteSubject: false
    },
    student: {
        dashboard: true,
        users: false,
        students: false,
        teachers: false,
        classes: false,
        subjects: false,
        attendance: true,
        grades: true,
        assignments: true,
        timetable: true,
        reports: false,
        messages: true,
        settings: false,
        profile: true,
        myClasses: false,
        children: false,
        notifications: true,
        canAddStudent: false,
        canAddTeacher: false,
        canAddClass: false,
        canAddSubject: false,
        canDeleteStudent: false,
        canDeleteTeacher: false,
        canDeleteClass: false,
        canDeleteSubject: false
    },
    parent: {
        dashboard: true,
        users: false,
        students: false,
        teachers: false,
        classes: false,
        subjects: false,
        attendance: true,
        grades: true,
        assignments: true,
        timetable: true,
        reports: false,
        messages: true,
        settings: false,
        profile: true,
        myClasses: false,
        children: true,
        canAddStudent: false,
        canAddTeacher: false,
        canAddClass: false,
        canAddSubject: false,
        canDeleteStudent: false,
        canDeleteTeacher: false,
        canDeleteClass: false,
        canDeleteSubject: false
    }
};

// Check if current user has permission
window.hasPermission = function(section) {
    if (!currentUser) return false;
    const permissions = RolePermissions[window.currentUser.role];
    return permissions ? permissions[section] === true : false;
};

// Access Denied Page
function showAccessDenied() {
    document.getElementById('pageContent').innerHTML = `
        <div class="container mt-5">
            <div class="row justify-content-center">
                <div class="col-md-6">
                    <div class="card text-center">
                        <div class="card-body p-5">
                            <i class="fas fa-lock text-danger" style="font-size: 64px;"></i>
                            <h2 class="mt-4 text-danger">Access Denied</h2>
                            <p class="text-muted mt-3">You don't have permission to access this section.</p>
                            <p class="text-muted">Your role: <strong>${currentUser?.role || 'Unknown'}</strong></p>
                            <button class="btn btn-primary mt-3" onclick="loadSection('dashboard')">
                                <i class="fas fa-home me-2"></i>Go to Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Validation Rules
const Validation = {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    phone: /^[\d\s\-+()]{10,20}$/,
    
    student: {
        name: { min: 2, max: 50, message: 'Name must be 2-50 characters' },
        email: { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email format' },
        password: { min: 6, max: 20, message: 'Password must be 6-20 characters' },
        rollNumber: { min: 1, max: 20, message: 'Roll number is required' },
        classId: { required: true, message: 'Please select a class' }
    },
    
    teacher: {
        name: { min: 2, max: 50, message: 'Name must be 2-50 characters' },
        email: { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email format' },
        password: { min: 6, max: 20, message: 'Password must be 6-20 characters' },
        qualification: { min: 2, max: 100, message: 'Qualification must be 2-100 characters' }
    },
    
    class: {
        name: { min: 2, max: 50, message: 'Class name must be 2-50 characters' },
        grade: { min: 1, max: 20, message: 'Grade is required' },
        section: { min: 1, max: 10, message: 'Section is required' },
        room: { max: 50, message: 'Room must be less than 50 characters' },
        capacity: { min: 1, max: 100, message: 'Capacity must be 1-100' }
    },
    
    subject: {
        name: { min: 2, max: 50, message: 'Subject name must be 2-50 characters' },
        code: { min: 2, max: 20, message: 'Code must be 2-20 characters' },
        description: { max: 500, message: 'Description must be less than 500 characters' }
    },
    
    assignment: {
        title: { min: 3, max: 100, message: 'Title must be 3-100 characters' },
        description: { max: 1000, message: 'Description must be less than 1000 characters' },
        dueDate: { required: true, message: 'Due date is required' },
        maxMarks: { min: 1, max: 1000, message: 'Max marks must be 1-1000' }
    },
    
    grade: {
        score: { min: 0, max: 1000, message: 'Score must be 0-1000' },
        maxScore: { min: 1, max: 1000, message: 'Max score must be 1-1000' }
    }
};

// Validation Functions
function validate(value, rules) {
    if (!rules) return { valid: true };
    
    if (rules.required && (!value || value.toString().trim() === '')) {
        return { valid: false, message: rules.message || 'This field is required' };
    }
    
    if (value && rules.min && value.toString().trim().length < rules.min) {
        return { valid: false, message: rules.message };
    }
    
    if (value && rules.max && value.toString().trim().length > rules.max) {
        return { valid: false, message: rules.message };
    }
    
    if (value && rules.pattern && !rules.pattern.test(value)) {
        return { valid: false, message: rules.message };
    }
    
    if (value && rules.min !== undefined && rules.max === undefined) {
        const num = parseFloat(value);
        if (isNaN(num) || num < rules.min) {
            return { valid: false, message: rules.message };
        }
    }
    
    if (value && rules.max !== undefined && rules.min !== undefined) {
        const num = parseFloat(value);
        if (!isNaN(num) && (num < rules.min || num > rules.max)) {
            return { valid: false, message: rules.message };
        }
    }
    
    return { valid: true };
}

function validateForm(formId, rules) {
    const form = document.getElementById(formId);
    if (!form) return { valid: true };
    
    const inputs = form.querySelectorAll('input, select, textarea');
    let isValid = true;
    let firstInvalid = null;
    
    inputs.forEach(input => {
        const fieldName = input.id.replace('form', '').toLowerCase();
        const fieldRules = rules[fieldName] || rules[input.name];
        
        if (fieldRules) {
            const result = validate(input.value, fieldRules);
            if (!result.valid) {
                input.classList.add('is-invalid');
                input.classList.remove('is-valid');
                isValid = false;
                if (!firstInvalid) firstInvalid = input;
            } else {
                input.classList.remove('is-invalid');
                if (input.value) input.classList.add('is-valid');
            }
        }
    });
    
    return { valid: isValid, firstInvalid };
}

// API Helper
const API = {
    base: '/api',
    
    async request(endpoint, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        try {
            const response = await fetch(`${this.base}${endpoint}`, {
                method: options.method || 'GET',
                headers,
                body: options.body ? JSON.stringify(options.body) : undefined
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                if (response.status === 401) {
                    localStorage.removeItem('token');
                    window.location.href = '/';
                }
                throw new Error(data.error || data.message || 'Request failed');
            }
            
            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },
    
    async login(email, password) {
        const response = await fetch(`${this.base}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        return response.json();
    },
    
    async me() {
        return this.request('/auth/me');
    },
    
    admin: {
        async getDashboard() { return API.request('/admin/dashboard'); },
        async users() { return API.request('/admin/users'); },
        async students() { return API.request('/admin/students'); },
        async teachers() { return API.request('/admin/teachers'); },
        async classes() { return API.request('/admin/classes'); },
        async subjects() { return API.request('/admin/subjects'); },
        async attendance() { return API.request('/admin/reports/attendance'); },
        async grades() { return API.request('/admin/reports/grades'); },
        async analytics() { return API.request('/admin/reports/analytics'); },
        async settings() { return API.request('/admin/settings'); },
        async assignments() { return API.request('/teacher/assignments'); },
        async createStudent(data) { return API.request('/admin/students', { method: 'POST', body: data }); },
        async createTeacher(data) { return API.request('/admin/teachers', { method: 'POST', body: data }); },
        async createClass(data) { return API.request('/admin/classes', { method: 'POST', body: data }); },
        async createSubject(data) { return API.request('/admin/subjects', { method: 'POST', body: data }); },
        async deleteStudent(id) { return API.request(`/admin/students/${id}`, { method: 'DELETE' }); },
        async deleteTeacher(id) { return API.request(`/admin/teachers/${id}`, { method: 'DELETE' }); },
        async deleteClass(id) { return API.request(`/admin/classes/${id}`, { method: 'DELETE' }); },
        async deleteSubject(id) { return API.request(`/admin/subjects/${id}`, { method: 'DELETE' }); }
    },
    
    teacher: {
        async dashboard() { return API.request('/teacher/dashboard'); },
        async classes() { return API.request('/teacher/classes'); },
        async assignments() { return API.request('/teacher/assignments'); },
        async timetable() { return API.request('/teacher/timetable'); },
        async messages() { return API.request('/teacher/messages'); },
        async notifications() { return API.request('/teacher/notifications'); },
        async createAssignment(data) { return API.request('/teacher/assignments', { method: 'POST', body: data }); },
        async deleteAssignment(id) { return API.request(`/teacher/assignments/${id}`, { method: 'DELETE' }); },
        async markAttendance(classId, data) { return API.request(`/teacher/attendance/${classId}`, { method: 'POST', body: data }); },
        async submitGrade(data) { return API.request('/teacher/grades', { method: 'POST', body: data }); },
        async getClassStudents(classId) { return API.request(`/teacher/class/${classId}/students`); },
        async getAttendance(classId, date) { return API.request(`/teacher/attendance/${classId}?date=${date}`); },
        async getGrades(classId, subjectId) { return API.request(`/teacher/grades/${classId}/${subjectId}`); }
    },
    
    student: {
        async dashboard() { return API.request('/student/dashboard'); },
        async profile() { return API.request('/student/profile'); },
        async attendance() { return API.request('/student/attendance'); },
        async grades() { return API.request('/student/grades'); },
        async subjects() { return API.request('/student/subjects'); },
        async timetable() { return API.request('/student/timetable'); },
        async assignments() { return API.request('/student/assignments'); },
        async messages() { return API.request('/student/messages'); },
        async notifications() { return API.request('/student/notifications'); },
        async submitAssignment(id, data) { return API.request(`/student/assignments/${id}/submit`, { method: 'POST', body: data }); },
        async updateProfile(data) { return API.request('/student/profile', { method: 'PUT', body: data }); }
    },
    
    parent: {
        async dashboard() { return API.request('/parent/dashboard'); },
        async children() { return API.request('/parent/children'); },
        async messages() { return API.request('/parent/messages'); },
        async fees() { return API.request('/parent/fees'); },
        async getChildAttendance(childId) { return API.request(`/parent/child/${childId}/attendance`); },
        async getChildGrades(childId) { return API.request(`/parent/child/${childId}/grades`); },
        async getChildAssignments(childId) { return API.request(`/parent/child/${childId}/assignments`); },
        async getChildTimetable(childId) { return API.request(`/parent/child/${childId}/timetable`); }
    }
};

// Make API globally available - api.js already sets window.api and window.API
window.currentUser = null;
window.currentSection = 'dashboard';

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Dashboard initializing...');
    
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
        console.log('No token found, redirecting to login...');
        window.location.href = '/';
        return;
    }
    
    try {
        const userData = await window.API.auth.getProfile();
        window.currentUser = userData;
        window.currentUser.role = userData.role;
        
        console.log('Logged in as:', userData.name, userData.role);
        
        document.getElementById('userName').textContent = userData.name;
        document.getElementById('userRole').textContent = userData.role.charAt(0).toUpperCase() + userData.role.slice(1);
        document.getElementById('userAvatar').textContent = userData.name.charAt(0).toUpperCase();
        document.getElementById('dropdownUserName').textContent = userData.name;
        document.getElementById('dropdownUserRole').textContent = userData.role.charAt(0).toUpperCase() + userData.role.slice(1);
        
        window.renderSidebar();
        await window.loadSection('dashboard');
        updateNotificationBadge();
        
        console.log('Dashboard initialized successfully!');
        
    } catch (error) {
        console.error('Initialization error:', error);
        window.toast('Session expired. Please login again.', 'error');
        localStorage.removeItem('token');
        window.location.href = '/';
    }
});

// Toast notification
window.toast = function(message, type = 'info') {
    const colors = {
        success: 'bg-success',
        error: 'bg-danger',
        warning: 'bg-warning',
        info: 'bg-info'
    };
    
    const toastHtml = `
        <div class="toast-container position-fixed top-0 end-0 p-3">
            <div class="toast show" role="alert">
                <div class="toast-header ${colors[type]} text-white">
                    <strong class="me-auto">${type.charAt(0).toUpperCase() + type.slice(1)}</strong>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast"></button>
                </div>
                <div class="toast-body">${message}</div>
            </div>
        </div>
    `;
    
    const existing = document.querySelector('.toast-container');
    if (existing) existing.remove();
    
    document.body.insertAdjacentHTML('beforeend', toastHtml);
    setTimeout(() => document.querySelector('.toast-container')?.remove(), 3000);
}

// Render sidebar menu
window.renderSidebar = function() {
    const menuContainer = document.getElementById('sidebarMenu');
    if (!menuContainer) {
        console.error('Sidebar menu container not found');
        return;
    }
    
    const menus = {
        admin: [
            { id: 'dashboard', icon: 'fa-home', label: 'Dashboard' },
            { id: 'users', icon: 'fa-users', label: 'Users' },
            { id: 'students', icon: 'fa-user-graduate', label: 'Students' },
            { id: 'teachers', icon: 'fa-chalkboard-teacher', label: 'Teachers' },
            { id: 'classes', icon: 'fa-school', label: 'Classes' },
            { id: 'subjects', icon: 'fa-book', label: 'Subjects' },
            { id: 'attendance', icon: 'fa-calendar-check', label: 'Attendance' },
            { id: 'grades', icon: 'fa-chart-line', label: 'Grades' },
            { id: 'assignments', icon: 'fa-tasks', label: 'Assignments' },
            { id: 'reports', icon: 'fa-chart-bar', label: 'Reports' },
            { id: 'messages', icon: 'fa-envelope', label: 'Messages' },
            { id: 'settings', icon: 'fa-cog', label: 'Settings' }
        ],
        teacher: [
            { id: 'dashboard', icon: 'fa-home', label: 'Dashboard' },
            { id: 'my-classes', icon: 'fa-school', label: 'My Classes' },
            { id: 'attendance', icon: 'fa-calendar-check', label: 'Mark Attendance' },
            { id: 'grades', icon: 'fa-chart-line', label: 'Grades' },
            { id: 'assignments', icon: 'fa-tasks', label: 'Assignments' },
            { id: 'timetable', icon: 'fa-clock', label: 'Timetable' },
            { id: 'messages', icon: 'fa-envelope', label: 'Messages' }
        ],
        student: [
            { id: 'dashboard', icon: 'fa-home', label: 'Dashboard' },
            { id: 'profile', icon: 'fa-user', label: 'My Profile' },
            { id: 'attendance', icon: 'fa-calendar-check', label: 'Attendance' },
            { id: 'grades', icon: 'fa-chart-line', label: 'My Grades' },
            { id: 'timetable', icon: 'fa-clock', label: 'Timetable' },
            { id: 'assignments', icon: 'fa-tasks', label: 'Assignments' },
            { id: 'messages', icon: 'fa-envelope', label: 'Messages' }
        ],
        parent: [
            { id: 'dashboard', icon: 'fa-home', label: 'Dashboard' },
            { id: 'children', icon: 'fa-child', label: 'My Children' },
            { id: 'attendance', icon: 'fa-calendar-check', label: 'Attendance' },
            { id: 'grades', icon: 'fa-chart-line', label: 'Grades' },
            { id: 'assignments', icon: 'fa-tasks', label: 'Assignments' },
            { id: 'messages', icon: 'fa-envelope', label: 'Messages' }
        ]
    };
    
    const roleMenus = menus[window.currentUser.role] || menus.student;
    
    menuContainer.innerHTML = roleMenus.map(menu => `
        <a class="menu-item ${menu.id === 'dashboard' ? 'active' : ''}" 
           onclick="loadSection('${menu.id}')" 
           data-section="${menu.id}">
            <i class="fas ${menu.icon}"></i>
            <span>${menu.label}</span>
        </a>
    `).join('');
}

// Load section content
window.loadSection = async function(sectionId) {
    console.log('Loading section:', sectionId);
    
    const sectionNames = {
        'dashboard': 'Dashboard', 'users': 'Users', 'students': 'Students', 'teachers': 'Teachers',
        'classes': 'Classes', 'subjects': 'Subjects', 'attendance': 'Attendance', 'grades': 'Grades',
        'assignments': 'Assignments', 'reports': 'Reports', 'messages': 'Messages', 'settings': 'Settings',
        'profile': 'My Profile', 'my-classes': 'My Classes', 'children': 'My Children',
        'notifications': 'Notifications'
    };
    
    // Check if user has permission to access this section
    if (!window.hasPermission(sectionId)) {
        showAccessDenied();
        return;
    }
    
    document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
    document.querySelector(`[data-section="${sectionId}"]`)?.classList.add('active');
    
    // Track current section for search
    window.currentSection = sectionId;
    if (window.Events) {
        window.Events.setActiveMenu(sectionId);
        window.Events.updateBreadcrumb(sectionNames[sectionId] || sectionId);
    }
    
    document.getElementById('pageContent').innerHTML = '<div class="loading-spinner"></div>';
    
    try {
        const handlers = {
            'dashboard': window.loadDashboard, 'users': window.loadUsers, 'students': () => window.Students.load(), 'teachers': () => window.Teachers.load(),
            'classes': window.loadClasses, 'subjects': window.loadSubjects, 'attendance': window.loadAttendance, 'grades': () => window.Grades.load(),
            'assignments': window.loadAssignments, 'timetable': window.loadTimetable, 'reports': window.loadReports, 'messages': window.loadMessages, 'settings': window.loadSettings,
            'profile': window.loadProfile, 'my-classes': window.loadMyClasses, 'children': window.loadChildren,
            'notifications': window.loadNotifications
        };
        
        if (handlers[sectionId]) await handlers[sectionId]();
        else document.getElementById('pageContent').innerHTML = '<div class="alert alert-info">Section not found</div>';
    } catch (error) {
        console.error('Error loading section:', error);
        document.getElementById('pageContent').innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
        window.toast(error.message, 'error');
    }
}

window.loadSection = loadSection;

// Dashboard Loaders
window.loadDashboard = async function() {
    let data;
    try {
        if (window.currentUser.role === 'admin') {
            data = await window.API.admin.getDashboard();
            renderAdminDashboard(data);
        } else if (window.currentUser.role === 'teacher') {
            data = await window.API.teacher.getDashboard();
            renderTeacherDashboard(data);
        } else if (window.currentUser.role === 'student') {
            data = await window.API.student.getDashboard();
            renderStudentDashboard(data);
        } else if (window.currentUser.role === 'parent') {
            data = await window.API.parent.getDashboard();
            renderParentDashboard(data);
        }
    } catch (error) {
        console.error('Load dashboard error:', error);
        window.toast('Failed to load dashboard', 'error');
    }
}

function renderAdminDashboard(data) {
    const { stats, recentStudents = [], upcomingAssignments = [] } = data;
    
    document.getElementById('pageContent').innerHTML = `
        <div class="page-title">Admin Dashboard</div>
        <p class="page-subtitle">Welcome back, ${window.currentUser.name}</p>
        
        <div class="stat-cards">
            <div class="stat-card">
                <div class="stat-card-header"><div class="stat-card-icon primary"><i class="fas fa-user-graduate"></i></div></div>
                <h3>${stats.totalStudents || 0}</h3><p>Total Students</p>
            </div>
            <div class="stat-card">
                <div class="stat-card-header"><div class="stat-card-icon success"><i class="fas fa-chalkboard-teacher"></i></div></div>
                <h3>${stats.totalTeachers || 0}</h3><p>Total Teachers</p>
            </div>
            <div class="stat-card">
                <div class="stat-card-header"><div class="stat-card-icon warning"><i class="fas fa-school"></i></div></div>
                <h3>${stats.totalClasses || 0}</h3><p>Total Classes</p>
            </div>
            <div class="stat-card">
                <div class="stat-card-header"><div class="stat-card-icon info"><i class="fas fa-book"></i></div></div>
                <h3>${stats.totalSubjects || 0}</h3><p>Total Subjects</p>
            </div>
        </div>

        <!-- Analytics Chart -->
        <div class="row mt-4">
            <div class="col-12">
                <div class="chart-card">
                    <div class="chart-header">
                        <h5><i class="fas fa-chart-bar me-2" style="color:var(--primary);"></i>Enrollment Analytics</h5>
                        <select><option>This Year</option><option>Last Year</option></select>
                    </div>
                    <div class="chart-bars" id="enrollmentChart">
                        <div class="chart-bar-wrap"><div class="chart-bar-value">320</div><div class="chart-bar" data-height="160" style="height:160px;background:linear-gradient(180deg,#4f46e5,#818cf8);"></div><div class="chart-bar-label">Jan</div></div>
                        <div class="chart-bar-wrap"><div class="chart-bar-value">280</div><div class="chart-bar" data-height="140" style="height:140px;background:linear-gradient(180deg,#4f46e5,#818cf8);"></div><div class="chart-bar-label">Feb</div></div>
                        <div class="chart-bar-wrap"><div class="chart-bar-value">410</div><div class="chart-bar" data-height="190" style="height:190px;background:linear-gradient(180deg,#4f46e5,#818cf8);"></div><div class="chart-bar-label">Mar</div></div>
                        <div class="chart-bar-wrap"><div class="chart-bar-value">350</div><div class="chart-bar" data-height="165" style="height:165px;background:linear-gradient(180deg,#4f46e5,#818cf8);"></div><div class="chart-bar-label">Apr</div></div>
                        <div class="chart-bar-wrap"><div class="chart-bar-value">500</div><div class="chart-bar" data-height="200" style="height:200px;background:linear-gradient(180deg,#4f46e5,#818cf8);"></div><div class="chart-bar-label">May</div></div>
                        <div class="chart-bar-wrap"><div class="chart-bar-value">450</div><div class="chart-bar" data-height="180" style="height:180px;background:linear-gradient(180deg,#4f46e5,#818cf8);"></div><div class="chart-bar-label">Jun</div></div>
                        <div class="chart-bar-wrap"><div class="chart-bar-value">380</div><div class="chart-bar" data-height="170" style="height:170px;background:linear-gradient(180deg,#0ea5e9,#38bdf8);"></div><div class="chart-bar-label">Jul</div></div>
                        <div class="chart-bar-wrap"><div class="chart-bar-value">420</div><div class="chart-bar" data-height="175" style="height:175px;background:linear-gradient(180deg,#0ea5e9,#38bdf8);"></div><div class="chart-bar-label">Aug</div></div>
                        <div class="chart-bar-wrap"><div class="chart-bar-value">560</div><div class="chart-bar" data-height="210" style="height:210px;background:linear-gradient(180deg,#0ea5e9,#38bdf8);"></div><div class="chart-bar-label">Sep</div></div>
                        <div class="chart-bar-wrap"><div class="chart-bar-value">480</div><div class="chart-bar" data-height="185" style="height:185px;background:linear-gradient(180deg,#0ea5e9,#38bdf8);"></div><div class="chart-bar-label">Oct</div></div>
                        <div class="chart-bar-wrap"><div class="chart-bar-value">340</div><div class="chart-bar" data-height="155" style="height:155px;background:linear-gradient(180deg,#10b981,#34d399);"></div><div class="chart-bar-label">Nov</div></div>
                        <div class="chart-bar-wrap"><div class="chart-bar-value">290</div><div class="chart-bar" data-height="130" style="height:130px;background:linear-gradient(180deg,#10b981,#34d399);"></div><div class="chart-bar-label">Dec</div></div>
                    </div>
                </div>
            </div>
        </div>

        <div class="row mt-4">
            <div class="col-md-6">
                <div class="card">
                    <div class="card-header"><h5>Recent Students</h5><button class="btn btn-sm btn-primary" onclick="loadSection('students')">View All</button></div>
                    <div class="card-body p-0">
                        <table class="table mb-0">
                            <thead><tr><th>Name</th><th>Class</th><th>Email</th></tr></thead>
                            <tbody>
                                ${recentStudents.length ? recentStudents.map(s => `<tr><td>${window.escapeHtml(s.name)}</td><td>${s.class_name || 'N/A'}</td><td>${window.escapeHtml(s.email || 'N/A')}</td></tr>`).join('') : '<tr><td colspan="3" class="text-center">No recent students</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            <div class="col-md-6">
                <div class="card">
                    <div class="card-header"><h5>Upcoming Assignments</h5><button class="btn btn-sm btn-primary" onclick="loadSection('assignments')">View All</button></div>
                    <div class="card-body p-0">
                        <table class="table mb-0">
                            <thead><tr><th>Title</th><th>Subject</th><th>Due Date</th></tr></thead>
                            <tbody>
                                ${upcomingAssignments.length ? upcomingAssignments.map(a => `<tr><td>${window.escapeHtml(a.title)}</td><td>${window.escapeHtml(a.subject_name || 'N/A')}</td><td>${new Date(a.due_date).toLocaleDateString()}</td></tr>`).join('') : '<tr><td colspan="3" class="text-center">No upcoming assignments</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>

        <div class="row mt-4">
            <div class="col-12">
                <div class="card">
                    <div class="card-header"><h5>Quick Actions</h5></div>
                    <div class="card-body">
                        <div class="quick-actions">
                            <div class="quick-action-btn" onclick="window.showAddModal('student')"><i class="fas fa-user-plus"></i><span>Add Student</span></div>
                            <div class="quick-action-btn" onclick="window.showAddModal('teacher')"><i class="fas fa-user-tie"></i><span>Add Teacher</span></div>
                            <div class="quick-action-btn" onclick="window.showAddModal('class')"><i class="fas fa-school"></i><span>Add Class</span></div>
                            <div class="quick-action-btn" onclick="window.showAddModal('subject')"><i class="fas fa-book-open"></i><span>Add Subject</span></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderTeacherDashboard(data) {
    const { teacher, myClasses = [], stats } = data;
    
    document.getElementById('pageContent').innerHTML = `
        <div class="page-title">Teacher Dashboard</div>
        <p class="page-subtitle">Welcome, ${teacher?.name || window.currentUser.name}</p>
        
        <div class="stat-cards">
            <div class="stat-card"><div class="stat-card-icon primary"><i class="fas fa-school"></i></div><h3>${stats?.classesCount || 0}</h3><p>My Classes</p></div>
            <div class="stat-card"><div class="stat-card-icon success"><i class="fas fa-tasks"></i></div><h3>${stats?.pendingAssignments || 0}</h3><p>Pending Assignments</p></div>
        </div>

        <div class="row mt-4">
            <div class="col-12">
                <div class="card">
                    <div class="card-header"><h5>My Classes</h5></div>
                    <div class="card-body p-0">
                        <table class="table mb-0">
                            <thead><tr><th>Class</th><th>Subject</th><th>Students</th><th>Actions</th></tr></thead>
                            <tbody>
                                ${myClasses.length ? myClasses.map(c => `<tr>
                                    <td>${window.escapeHtml(c.name)}</td><td>${window.escapeHtml(c.subject_name)}</td><td>${c.student_count || 0}</td>
                                    <td>
                                        <button class="btn btn-sm btn-primary" onclick="takeAttendance('${c.id}')"><i class="fas fa-clipboard-check"></i> Attendance</button>
                                        <button class="btn btn-sm btn-success" onclick="uploadGrade('${c.id}', '${c.subject_id}')"><i class="fas fa-chart-line"></i> Grades</button>
                                    </td>
                                </tr>`).join('') : '<tr><td colspan="4" class="text-center">No classes assigned</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderStudentDashboard(data) {
    const { student, recentGrades = [], upcomingAssignments = [] } = data;
    
    document.getElementById('pageContent').innerHTML = `
        <div class="page-title">Student Dashboard</div>
        <p class="page-subtitle">Welcome, ${student?.name || window.currentUser.name} - ${student?.class_name || 'No Class'}</p>
        
        <div class="stat-cards">
            <div class="stat-card"><div class="stat-card-icon success"><i class="fas fa-chart-line"></i></div><h3>${recentGrades.length}</h3><p>Recent Grades</p></div>
            <div class="stat-card"><div class="stat-card-icon warning"><i class="fas fa-tasks"></i></div><h3>${upcomingAssignments.length}</h3><p>Pending Assignments</p></div>
        </div>

        <div class="row mt-4">
            <div class="col-md-6">
                <div class="card">
                    <div class="card-header"><h5>Recent Grades</h5><button class="btn btn-sm btn-primary" onclick="loadSection('grades')">View All</button></div>
                    <div class="card-body p-0">
                        <table class="table mb-0">
                            <thead><tr><th>Subject</th><th>Score</th><th>Assessment</th></tr></thead>
                            <tbody>
                                ${recentGrades.length ? recentGrades.map(g => `<tr><td>${window.escapeHtml(g.subject_name || 'N/A')}</td><td>${g.score}/${g.max_score}</td><td>${window.escapeHtml(g.assessment_type)}</td></tr>`).join('') : '<tr><td colspan="3" class="text-center">No grades yet</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            <div class="col-md-6">
                <div class="card">
                    <div class="card-header"><h5>Upcoming Assignments</h5><button class="btn btn-sm btn-primary" onclick="loadSection('assignments')">View All</button></div>
                    <div class="card-body p-0">
                        <table class="table mb-0">
                            <thead><tr><th>Title</th><th>Subject</th><th>Due Date</th></tr></thead>
                            <tbody>
                                ${upcomingAssignments.length ? upcomingAssignments.map(a => `<tr><td>${window.escapeHtml(a.title)}</td><td>${window.escapeHtml(a.subject_name || 'N/A')}</td><td>${new Date(a.due_date).toLocaleDateString()}</td></tr>`).join('') : '<tr><td colspan="3" class="text-center">No upcoming assignments</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderParentDashboard(data) {
    const { children = [] } = data;
    
    document.getElementById('pageContent').innerHTML = `
        <div class="page-title">Parent Dashboard</div>
        <p class="page-subtitle">Welcome, ${window.currentUser.name}</p>
        
        <div class="stat-cards">
            <div class="stat-card"><div class="stat-card-icon primary"><i class="fas fa-child"></i></div><h3>${children.length}</h3><p>Children</p></div>
        </div>

        <div class="row mt-4">
            <div class="col-12">
                <div class="card">
                    <div class="card-header"><h5>My Children</h5></div>
                    <div class="card-body p-0">
                        <table class="table mb-0">
                            <thead><tr><th>Name</th><th>Class</th><th>Recent Grade</th><th>Actions</th></tr></thead>
                            <tbody>
                                ${children.length ? children.map(c => `<tr>
                                    <td>${window.escapeHtml(c.name)}</td><td>${c.class_name || 'N/A'}</td>
                                    <td>${c.recentGrades?.[0] ? `${window.escapeHtml(c.recentGrades[0].subject_name)}: ${c.recentGrades[0].score}/${c.recentGrades[0].max_score}` : 'N/A'}</td>
                                    <td>
                                        <button class="btn btn-sm btn-success" onclick="viewChildGrades('${c.id}')"><i class="fas fa-chart-line"></i> Grades</button>
                                        <button class="btn btn-sm btn-info" onclick="viewChildAttendance('${c.id}')"><i class="fas fa-calendar-check"></i> Attendance</button>
                                    </td>
                                </tr>`).join('') : '<tr><td colspan="4" class="text-center">No children registered</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Utility function to escape HTML
window.escapeHtml = function(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
};

// CRUD Section Loaders
async function loadUsers() {
    const data = await window.API.admin.getUsers();
    const users = data.users || [];
    
    const admins = users.filter(u => u.role === 'admin');
    const teachers = users.filter(u => u.role === 'teacher');
    const students = users.filter(u => u.role === 'student');
    const parents = users.filter(u => u.role === 'parent');

    const renderTable = (uList) => `
        <table class="table mb-0">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Created</th></tr></thead>
            <tbody>
                ${uList.length ? uList.map(u => `<tr>
                    <td>${window.escapeHtml(u.name)}</td><td>${window.escapeHtml(u.email)}</td>
                    <td><span class="badge-role ${u.role}">${u.role}</span></td>
                    <td><span class="attendance-status ${u.status === 'active' ? 'present' : 'absent'}">${u.status}</span></td>
                    <td>${new Date(u.created_at).toLocaleDateString()}</td>
                </tr>`).join('') : '<tr><td colspan="5" class="text-center">No users found</td></tr>'}
            </tbody>
        </table>
    `;

    document.getElementById('pageContent').innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <div><div class="page-title">Users</div><p class="page-subtitle">Manage all system users</p></div>
        </div>
        <div class="row">
            <div class="col-12 mb-4">
                <div class="card">
                    <div class="card-header"><h5>Admins</h5></div>
                    <div class="card-body p-0">${renderTable(admins)}</div>
                </div>
            </div>
            <div class="col-12 mb-4">
                <div class="card">
                    <div class="card-header"><h5>Teachers</h5></div>
                    <div class="card-body p-0">${renderTable(teachers)}</div>
                </div>
            </div>
            <div class="col-12 mb-4">
                <div class="card">
                    <div class="card-header"><h5>Students</h5></div>
                    <div class="card-body p-0">${renderTable(students)}</div>
                </div>
            </div>
            <div class="col-12 mb-4">
                <div class="card">
                    <div class="card-header"><h5>Parents</h5></div>
                    <div class="card-body p-0">${renderTable(parents)}</div>
                </div>
            </div>
        </div>
    `;
}

async function loadStudents() {
    const data = await window.API.admin.getStudents();
    const students = data.students || [];
    
    document.getElementById('pageContent').innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <div><div class="page-title">Students</div><p class="page-subtitle">Manage student records</p></div>
            ${window.hasPermission('canAddStudent') ? '<button class="btn btn-primary" onclick="window.showAddModal(\'student\')"><i class="fas fa-plus me-2"></i>Add Student</button>' : ''}
        </div>
        <div class="card">
            <div class="card-body p-0">
                <table class="table">
                    <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Roll No</th><th>Class</th><th>Status</th></tr></thead>
                    <tbody>
                        ${students.length ? students.map(s => `<tr>
                            <td>${s.id}</td>
                            <td>${window.escapeHtml(s.name || '')}</td>
                            <td>${window.escapeHtml(s.email || '')}</td>
                            <td>${window.escapeHtml(s.roll_number || 'N/A')}</td>
                            <td>${window.escapeHtml(s.class_name || 'Not Assigned')}</td>
                            <td><span class="badge bg-${s.status === 'active' ? 'success' : 'secondary'}">${s.status || 'active'}</span></td>
                        </tr>`).join('') : '<tr><td colspan="6" class="text-center py-4">No students found</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

async function loadTeachers() {
    const data = await window.API.admin.getTeachers();
    const teachers = data.teachers || [];
    
    document.getElementById('pageContent').innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <div><div class="page-title">Teachers</div><p class="page-subtitle">Manage all teachers</p></div>
            ${window.hasPermission('canAddTeacher') ? '<button class="btn btn-primary" onclick="window.showAddModal(\'teacher\')"><i class="fas fa-plus me-2"></i>Add Teacher</button>' : ''}
        </div>
        <div class="card">
            <div class="card-body p-0">
                <table class="table">
                    <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Qualification</th><th>Phone</th><th>Status</th></tr></thead>
                    <tbody>
                        ${teachers.length ? teachers.map(t => `<tr>
                            <td>${t.id}</td>
                            <td>${window.escapeHtml(t.name || '')}</td>
                            <td>${window.escapeHtml(t.email || '')}</td>
                            <td>${window.escapeHtml(t.qualification || 'N/A')}</td>
                            <td>${window.escapeHtml(t.phone || 'N/A')}</td>
                            <td><span class="badge bg-${t.status === 'active' ? 'success' : 'secondary'}">${t.status || 'active'}</span></td>
                        </tr>`).join('') : '<tr><td colspan="6" class="text-center py-4">No teachers found</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

async function loadClasses() {
    const data = await window.API.admin.getClasses();
    const classes = data.classes || [];
    
    document.getElementById('pageContent').innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <div><div class="page-title">Classes</div><p class="page-subtitle">Manage all classes</p></div>
            <button class="btn btn-primary" onclick="window.showAddModal('class')"><i class="fas fa-plus me-2"></i>Add Class</button>
        </div>
        <div class="card">
            <div class="card-body p-0">
                <table class="table">
                    <thead><tr><th>Class Name</th><th>Grade</th><th>Section</th><th>Room</th><th>Students</th><th>Actions</th></tr></thead>
                    <tbody>
                        ${classes.length ? classes.map(c => `<tr>
                            <td>${window.escapeHtml(c.name)}</td><td>${window.escapeHtml(c.grade)}</td><td>${window.escapeHtml(c.section)}</td><td>${window.escapeHtml(c.room || 'N/A')}</td><td>${c.student_count || 0}</td>
                            <td><button class="btn btn-sm btn-danger" onclick="window.confirmDelete('class', '${c.id}', '${window.escapeHtml(c.name)}')"><i class="fas fa-trash"></i> Delete</button></td>
                        </tr>`).join('') : '<tr><td colspan="6" class="text-center">No classes found</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

async function loadSubjects() {
    const data = await window.API.admin.getSubjects();
    const subjects = data.subjects || [];
    
    document.getElementById('pageContent').innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <div><div class="page-title">Subjects</div><p class="page-subtitle">Manage all subjects</p></div>
            <button class="btn btn-primary" onclick="window.showAddModal('subject')"><i class="fas fa-plus me-2"></i>Add Subject</button>
        </div>
        <div class="card">
            <div class="card-body p-0">
                <table class="table">
                    <thead><tr><th>Code</th><th>Name</th><th>Description</th><th>Type</th><th>Actions</th></tr></thead>
                    <tbody>
                        ${subjects.length ? subjects.map(s => `<tr>
                            <td>${window.escapeHtml(s.code)}</td><td>${window.escapeHtml(s.name)}</td><td>${window.escapeHtml(s.description || 'N/A')}</td><td><span class="badge bg-${s.type === 'core' ? 'primary' : 'secondary'}">${s.type}</span></td>
                            <td><button class="btn btn-sm btn-danger" onclick="window.confirmDelete('subject', '${s.id}', '${window.escapeHtml(s.name)}')"><i class="fas fa-trash"></i> Delete</button></td>
                        </tr>`).join('') : '<tr><td colspan="5" class="text-center">No subjects found</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

async function loadAttendance() {
    if (window.currentUser.role === 'admin') {
        const data = await window.API.admin.getAttendanceReport();
        const { attendance = [], stats = {} } = data;
        
        document.getElementById('pageContent').innerHTML = `
            <div class="page-title">Attendance Report</div>
            <p class="page-subtitle">View attendance records</p>
            <div class="stat-cards mb-4">
                <div class="stat-card"><div class="stat-card-icon success"><i class="fas fa-check"></i></div><h3>${stats.present || 0}</h3><p>Present</p></div>
                <div class="stat-card"><div class="stat-card-icon danger"><i class="fas fa-times"></i></div><h3>${stats.absent || 0}</h3><p>Absent</p></div>
                <div class="stat-card"><div class="stat-card-icon warning"><i class="fas fa-clock"></i></div><h3>${stats.late || 0}</h3><p>Late</p></div>
            </div>
            <div class="card">
                <div class="card-body p-0">
                    <table class="table">
                        <thead><tr><th>Date</th><th>Student</th><th>Class</th><th>Status</th></tr></thead>
                        <tbody>
                            ${attendance.length ? attendance.slice(0, 50).map(a => `<tr><td>${a.date}</td><td>${window.escapeHtml(a.student_name || 'N/A')}</td><td>${window.escapeHtml(a.class_name || 'N/A')}</td><td><span class="attendance-status ${a.status}">${a.status}</span></td></tr>`).join('') : '<tr><td colspan="4" class="text-center">No attendance records</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    } else if (window.currentUser.role === 'teacher') {
        const data = await window.API.teacher.getClasses();
        const classes = data.classes || [];
        
        document.getElementById('pageContent').innerHTML = `
            <div class="page-title">Mark Attendance</div>
            <p class="page-subtitle">Select a class to mark attendance</p>
            <div class="row mt-4">
                ${classes.map(c => `<div class="col-md-4 mb-4"><div class="card"><div class="card-body text-center">
                    <h5>${window.escapeHtml(c.name)}</h5><p class="text-muted">${window.escapeHtml(c.subject_name)}</p><p>${c.student_count || 0} Students</p>
                    <button class="btn btn-primary" onclick="takeAttendance('${c.id}')"><i class="fas fa-clipboard-check me-2"></i>Take Attendance</button>
                </div></div></div>`).join('')}
            </div>
        `;
    } else if (window.currentUser.role === 'student') {
        const data = await window.API.student.getAttendance();
        const { attendance = [], summary = {} } = data;
        
        document.getElementById('pageContent').innerHTML = `
            <div class="page-title">My Attendance</div>
            <p class="page-subtitle">View your attendance records</p>
            <div class="stat-cards mb-4">
                <div class="stat-card"><div class="stat-card-icon success"><i class="fas fa-check"></i></div><h3>${summary.present || 0}</h3><p>Present</p></div>
                <div class="stat-card"><div class="stat-card-icon danger"><i class="fas fa-times"></i></div><h3>${summary.absent || 0}</h3><p>Absent</p></div>
                <div class="stat-card"><div class="stat-card-icon warning"><i class="fas fa-clock"></i></div><h3>${summary.late || 0}</h3><p>Late</p></div>
            </div>
            <div class="card">
                <div class="card-body p-0">
                    <table class="table"><thead><tr><th>Date</th><th>Status</th><th>Remarks</th></tr></thead>
                    <tbody>${attendance.map(a => `<tr><td>${a.date}</td><td><span class="attendance-status ${a.status}">${a.status}</span></td><td>${window.escapeHtml(a.remarks || '-')}</td></tr>`).join('')}</tbody>
                </table>
            </div>
        `;
    } else if (window.currentUser.role === 'parent') {
        const data = await window.API.parent.getChildren();
        const children = data.children || [];
        
        document.getElementById('pageContent').innerHTML = `
            <div class="page-title">Children's Attendance</div>
            <p class="page-subtitle">Monitor attendance records</p>
            <div class="row mt-4">
                ${children.map(c => `<div class="col-md-6 mb-4"><div class="card"><div class="card-header"><h5>${window.escapeHtml(c.name)} - ${c.class_name}</h5></div>
                    <div class="card-body"><button class="btn btn-primary" onclick="viewChildAttendance('${c.id}')"><i class="fas fa-eye me-2"></i>View Attendance</button></div>
                </div></div>`).join('')}
            </div>
        `;
    }
}

async function loadGrades() {
    if (window.currentUser.role === 'admin') {
        const data = await window.API.admin.getGradesReport();
        const grades = data.grades || [];
        
        document.getElementById('pageContent').innerHTML = `
            <div class="page-title">Grades Report</div>
            <p class="page-subtitle">View all grade records</p>
            <div class="card">
                <div class="card-body p-0">
                    <table class="table">
                        <thead><tr><th>Student</th><th>Subject</th><th>Assessment</th><th>Score</th></tr></thead>
                        <tbody>
                            ${grades.length ? grades.map(g => `<tr><td>${window.escapeHtml(g.student_name || 'N/A')}</td><td>${window.escapeHtml(g.subject_name || 'N/A')}</td><td>${window.escapeHtml(g.assessment_type)}</td><td>${g.score}/${g.max_score}</td></tr>`).join('') : '<tr><td colspan="4" class="text-center">No grades found</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    } else if (window.currentUser.role === 'student') {
        const data = await window.API.student.getGrades();
        const { grades = [], summary = [] } = data;
        
        document.getElementById('pageContent').innerHTML = `
            <div class="page-title">My Grades</div>
            <p class="page-subtitle">View your academic performance</p>
            <div class="row mt-4 mb-4">
                ${summary.map(s => `<div class="col-md-3"><div class="stat-card"><h6>${window.escapeHtml(s.subject_name)}</h6><h3>${s.average}%</h3><p>Average</p></div></div>`).join('')}
            </div>
            <div class="card">
                <div class="card-body p-0">
                    <table class="table"><thead><tr><th>Subject</th><th>Assessment</th><th>Score</th></tr></thead>
                    <tbody>${grades.map(g => `<tr><td>${window.escapeHtml(g.subject_name || 'N/A')}</td><td>${window.escapeHtml(g.assessment_type)}</td><td>${g.score}/${g.max_score}</td></tr>`).join('')}</tbody>
                </table>
            </div>
        `;
    } else if (window.currentUser.role === 'teacher') {
        const data = await window.API.teacher.getClasses();
        const classes = data.classes || [];
        
        document.getElementById('pageContent').innerHTML = `
            <div class="page-title">Upload Grades</div>
            <p class="page-subtitle">Select a class to upload grades</p>
            <div class="row mt-4">
                ${classes.map(c => `<div class="col-md-4 mb-4"><div class="card"><div class="card-body text-center">
                    <h5>${window.escapeHtml(c.name)}</h5><p class="text-muted">${window.escapeHtml(c.subject_name)}</p>
                    <button class="btn btn-primary" onclick="uploadGrade('${c.id}', '${c.subject_id}')"><i class="fas fa-upload me-2"></i>Upload Grades</button>
                </div></div></div>`).join('')}
            </div>
        `;
    }
}

async function loadAssignments() {
    if (window.currentUser.role === 'admin') {
        const data = await window.API.admin.getAssignments();
        const assignments = data.assignments || [];
        
        document.getElementById('pageContent').innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-4">
                <div><div class="page-title">Assignments</div><p class="page-subtitle">View and manage all assignments</p></div>
            </div>
            <div class="card">
                <div class="card-body p-0">
                    <table class="table">
                        <thead><tr><th>Title</th><th>Subject</th><th>Class</th><th>Teacher</th><th>Due Date</th><th>Submissions</th></tr></thead>
                        <tbody>
                            ${assignments.length ? assignments.map(a => `<tr><td>${window.escapeHtml(a.title)}</td><td>${window.escapeHtml(a.subject_name || 'N/A')}</td><td>${window.escapeHtml(a.class_name || 'N/A')}</td><td>${window.escapeHtml(a.teacher_name || 'N/A')}</td><td>${new Date(a.due_date).toLocaleDateString()}</td><td>${a.submission_count || 0}</td></tr>`).join('') : '<tr><td colspan="6" class="text-center">No assignments</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    } else if (window.currentUser.role === 'teacher') {
        const data = await window.API.teacher.getAssignments();
        const assignments = data.assignments || [];
        
        document.getElementById('pageContent').innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-4">
                <div><div class="page-title">Assignments</div><p class="page-subtitle">Manage your assignments</p></div>
                <button class="btn btn-primary" onclick="window.showAddModal('assignment')"><i class="fas fa-plus me-2"></i>Post Assignment</button>
            </div>
            <div class="card">
                <div class="card-body p-0">
                    <table class="table">
                        <thead><tr><th>Title</th><th>Subject</th><th>Class</th><th>Due Date</th><th>Actions</th></tr></thead>
                        <tbody>
                            ${assignments.length ? assignments.map(a => `<tr><td>${window.escapeHtml(a.title)}</td><td>${window.escapeHtml(a.subject_name || 'N/A')}</td><td>${window.escapeHtml(a.class_name || 'N/A')}</td><td>${new Date(a.due_date).toLocaleDateString()}</td>
                                <td><button class="btn btn-sm btn-danger" onclick="window.confirmDelete('assignment', '${a.id}', '${window.escapeHtml(a.title)}')"><i class="fas fa-trash"></i></button></td></tr>`).join('') : '<tr><td colspan="5" class="text-center">No assignments</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    } else if (window.currentUser.role === 'student') {
        const data = await window.API.student.getAssignments();
        const assignments = data.assignments || data || [];
        
        document.getElementById('pageContent').innerHTML = `
            <div class="page-title">Assignments</div>
            <p class="page-subtitle">View and submit assignments</p>
            <div class="card">
                <div class="card-body p-0">
                    <table class="table">
                        <thead><tr><th>Title</th><th>Subject</th><th>Teacher</th><th>Due Date</th><th>Status</th></tr></thead>
                        <tbody>
                            ${assignments.length ? assignments.map(a => `<tr><td>${window.escapeHtml(a.title)}</td><td>${window.escapeHtml(a.subject_name || 'N/A')}</td><td>${window.escapeHtml(a.teacher_name || 'N/A')}</td><td>${new Date(a.due_date).toLocaleDateString()}</td>
                                <td>${a.is_submitted ? '<span class="attendance-status present">Submitted</span>' : '<span class="attendance-status late">Pending</span>'}</td></tr>`).join('') : '<tr><td colspan="5" class="text-center">No assignments</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }
}

async function loadReports() {
    const data = await window.API.admin.getAnalytics();
    const { overview = {}, subjectStats = [] } = data;
    
    document.getElementById('pageContent').innerHTML = `
        <div class="page-title">Reports & Analytics</div>
        <p class="page-subtitle">System overview and statistics</p>
        <div class="stat-cards mb-4">
            <div class="stat-card"><div class="stat-card-icon primary"><i class="fas fa-user-graduate"></i></div><h3>${overview.totalStudents || 0}</h3><p>Total Students</p></div>
            <div class="stat-card"><div class="stat-card-icon success"><i class="fas fa-chalkboard-teacher"></i></div><h3>${overview.totalTeachers || 0}</h3><p>Total Teachers</p></div>
            <div class="stat-card"><div class="stat-card-icon warning"><i class="fas fa-school"></i></div><h3>${overview.totalClasses || 0}</h3><p>Total Classes</p></div>
            <div class="stat-card"><div class="stat-card-icon info"><i class="fas fa-book"></i></div><h3>${overview.totalSubjects || 0}</h3><p>Total Subjects</p></div>
        </div>
        <div class="card">
            <div class="card-header"><h5>Subject Performance</h5></div>
            <div class="card-body p-0">
                <table class="table"><thead><tr><th>Subject</th><th>Average Score</th><th>Total Grades</th></tr></thead>
                <tbody>${subjectStats.map(s => `<tr><td>${window.escapeHtml(s.subject_name)}</td><td>${s.average || 0}%</td><td>${s.total_grades || 0}</td></tr>`).join('')}</tbody>
            </div>
        </div>
    `;
}

async function loadMessages() {
    let messages = [];
    
    if (window.currentUser.role === 'admin') {
        const data = await window.API.admin.getMessages();
        messages = data.messages || [];
    } else if (window.currentUser.role === 'student') {
        const data = await window.API.student.getMessages();
        messages = data.messages || data || [];
    } else if (window.currentUser.role === 'teacher') {
        const data = await window.API.teacher.getMessages();
        messages = data.messages || [];
    } else if (window.currentUser.role === 'parent') {
        const data = await window.API.parent.getMessages();
        messages = data.messages || data || [];
    }
    
    document.getElementById('pageContent').innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <div><div class="page-title">Messages</div><p class="page-subtitle">Your messages</p></div>
            ${window.currentUser.role === 'admin' ? `<button class="btn btn-primary" onclick="window.notifyAllTeachers()"><i class="fas fa-bullhorn me-2"></i>Notify All Teachers</button>` : ''}
        </div>
        <div class="card">
            <div class="card-body p-0">
                <table class="table">
                    <thead><tr><th>From/To</th><th>Subject</th><th>Message</th><th>Date</th></tr></thead>
                    <tbody>
                        ${messages.length ? messages.map(m => `<tr><td>${window.escapeHtml(m.sender_name || m.receiver_name || 'N/A')}</td><td>${window.escapeHtml(m.subject || 'No subject')}</td><td>${window.escapeHtml((m.content || '').substring(0, 50))}...</td><td>${new Date(m.created_at).toLocaleDateString()}</td></tr>`).join('') : '<tr><td colspan="4" class="text-center">No messages</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

async function loadSettings() {
    try {
        const data = await window.API.admin.getSettings();
        const settings = data.settings || {};
        
        document.getElementById('pageContent').innerHTML = `
            <div class="page-title">Settings</div>
            <p class="page-subtitle">Manage system configuration</p>
            <div class="row mt-4">
                <div class="col-12">
                    <div class="card">
                        <div class="card-header bg-white border-bottom">
                            <ul class="nav nav-tabs card-header-tabs" id="settingsTabs" role="tablist">
                                <li class="nav-item"><button class="nav-link active" data-bs-toggle="tab" data-bs-target="#schoolSettings" type="button"><i class="fas fa-school me-2"></i>School</button></li>
                                <li class="nav-item"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#gradeSettings" type="button"><i class="fas fa-chart-line me-2"></i>Grades</button></li>
                            </ul>
                        </div>
                        <div class="card-body">
                            <div class="tab-content">
                                <div class="tab-pane fade show active" id="schoolSettings">
                                    <div class="row">
                                        <div class="col-md-6">
                                            <div class="mb-3"><label class="form-label fw-semibold">School Name</label><input type="text" class="form-control" id="schoolName" value="${window.escapeHtml(settings.school_name || '')}" maxlength="100" placeholder="Enter school name"></div>
                                        </div>
                                        <div class="col-md-6">
                                            <div class="mb-3"><label class="form-label fw-semibold">Academic Year</label><input type="text" class="form-control" id="academicYear" value="${window.escapeHtml(settings.academic_year || '')}" maxlength="20" placeholder="e.g., 2025-2026"></div>
                                        </div>
                                        <div class="col-md-6">
                                            <div class="mb-3"><label class="form-label fw-semibold">Current Term</label><input type="text" class="form-control" id="currentTerm" value="${window.escapeHtml(settings.term || '')}" maxlength="20" placeholder="e.g., First Term"></div>
                                        </div>
                                    </div>
                                </div>
                                <div class="tab-pane fade" id="gradeSettings">
                                    <div class="row">
                                        <div class="col-md-12 mb-3">
                                            <div class="form-check form-switch">
                                                <input class="form-check-input fs-5" type="checkbox" id="gradeUploadEnabled" ${settings.grade_upload_enabled !== 'false' ? 'checked' : ''}>
                                                <label class="form-check-label fw-semibold ms-2">Enable Grade Upload</label>
                                            </div>
                                            <small class="text-muted">When disabled, teachers cannot upload grades</small>
                                        </div>
                                        <div class="col-md-6">
                                            <div class="mb-3"><label class="form-label fw-semibold">Start Date</label><input type="date" class="form-control" id="gradeStartDate" value="${settings.grade_upload_start_date || ''}"></div>
                                        </div>
                                        <div class="col-md-6">
                                            <div class="mb-3"><label class="form-label fw-semibold">End Date</label><input type="date" class="form-control" id="gradeEndDate" value="${settings.grade_upload_end_date || ''}"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="mt-4 pt-3 border-top">
                                <button type="button" class="btn btn-primary btn-lg" onclick="saveSettings()"><i class="fas fa-save me-2"></i>Save Settings</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Load settings error:', error);
        document.getElementById('pageContent').innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-circle me-2"></i>
                Failed to load settings: ${error.message}
            </div>
            <button class="btn btn-primary mt-2" onclick="loadSection('dashboard')">
                <i class="fas fa-home me-2"></i>Back to Dashboard
            </button>
        `;
    }
}

async function loadProfile() {
    let profile;
    if (window.currentUser.role === 'admin') {
        profile = await window.API.admin.getProfile();
    } else if (window.currentUser.role === 'teacher') {
        profile = await window.API.teacher.getProfile();
    } else if (window.currentUser.role === 'student') {
        profile = await window.API.student.getProfile();
    } else if (window.currentUser.role === 'parent') {
        profile = await window.API.parent.getProfile();
    }
    profile = profile || {};
    
    document.getElementById('pageContent').innerHTML = `
        <div class="page-title">My Profile</div>
        <p class="page-subtitle">View and update your information</p>
        <div class="row mt-4">
            <div class="col-md-8">
                <div class="card">
                    <div class="card-body">
                        <form id="profileForm">
                            <div class="mb-3"><label class="form-label">Name</label><input type="text" class="form-control" value="${window.escapeHtml(profile.name || currentUser.name)}" disabled></div>
                            <div class="mb-3"><label class="form-label">Email</label><input type="email" class="form-control" value="${window.escapeHtml(profile.email || currentUser.email)}" disabled></div>
                            <div class="mb-3"><label class="form-label">Phone</label><input type="text" class="form-control" id="phone" value="${window.escapeHtml(profile.phone || '')}" placeholder="Enter phone number" maxlength="20"></div>
                            <div class="mb-3"><label class="form-label">Address</label><textarea class="form-control" id="address" placeholder="Enter address" maxlength="200">${window.escapeHtml(profile.address || '')}</textarea></div>
                            ${profile.class_name ? `<div class="mb-3"><label class="form-label">Class</label><input type="text" class="form-control" value="${window.escapeHtml(profile.class_name)}" disabled></div>` : ''}
                            <button type="button" class="btn btn-primary" onclick="updateProfile()">Update Profile</button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    `;
}

async function loadMyClasses() {
    document.getElementById('pageContent').innerHTML = '<div class="loading-spinner"></div>';
    try {
        const data = await window.API.teacher.getClasses();
        const classes = Array.isArray(data) ? data : (data.classes || data.data || []);
        
        document.getElementById('pageContent').innerHTML = `
            <div class="page-title">My Classes</div>
            <p class="page-subtitle">Classes you teach</p>
            <div class="row mt-4">
                ${classes.length ? classes.map(c => `<div class="col-md-4 mb-4"><div class="card"><div class="card-body text-center">
                    <h5>${window.escapeHtml(c.name || c.class_name || 'Class')}</h5><p class="text-muted">${window.escapeHtml(c.subject_name || '')}</p><p>${c.student_count || 0} Students</p>
                    <button class="btn btn-primary" onclick="takeAttendance('${c.id}')"><i class="fas fa-clipboard-check me-2"></i>Attendance</button>
                    <button class="btn btn-success" onclick="uploadGrade('${c.id}', '${c.subject_id}')"><i class="fas fa-chart-line me-2"></i>Grades</button>
                </div></div></div>`).join('') : '<div class="col-12"><div class="alert alert-info">You are not assigned to any classes yet.</div></div>'}
            </div>
        `;
    } catch(e) {
        console.error('My Classes error:', e);
        document.getElementById('pageContent').innerHTML = '<div class="alert alert-danger">Error loading classes: ' + e.message + '</div>';
    }
}

async function loadChildren() {
    const data = await window.API.parent.getChildren();
    const children = data.children || [];
    
    document.getElementById('pageContent').innerHTML = `
        <div class="page-title">My Children</div>
        <p class="page-subtitle">View your children's information</p>
        <div class="row mt-4">
            ${children.map(c => `<div class="col-md-6 mb-4"><div class="card"><div class="card-header"><h5>${window.escapeHtml(c.name)}</h5></div>
                <div class="card-body"><p><strong>Class:</strong> ${c.class_name || 'N/A'}</p>
                    <button class="btn btn-sm btn-primary me-2" onclick="viewChildAttendance('${c.id}')"><i class="fas fa-calendar-check me-1"></i>Attendance</button>
                    <button class="btn btn-sm btn-success" onclick="viewChildGrades('${c.id}')"><i class="fas fa-chart-line me-1"></i>Grades</button>
                </div>
            </div></div>`).join('')}
        </div>
    `;
}

// Show Add Modal with Validation
async function showAddModal(type) {
    // Check permissions for add operations
    const addPermissions = {
        'student': 'canAddStudent',
        'teacher': 'canAddTeacher',
        'class': 'canAddClass',
        'subject': 'canAddSubject',
        'assignment': 'canAddAssignment'
    };
    
    if (addPermissions[type] && !window.hasPermission(addPermissions[type])) {
        window.toast('You do not have permission to add this item', 'error');
        return;
    }
    
    let title = 'Add Item';
    let formContent = '';
    
    switch (type) {
        case 'student':
            title = 'Add Student';
            const classes = await window.API.admin.getClasses();
            formContent = `
                <form id="addStudentForm" class="needs-validation" novalidate>
                    <div class="mb-3">
                        <label class="form-label">Name <span class="text-danger">*</span></label>
                        <input type="text" class="form-control" id="formName" required minlength="2" maxlength="50" placeholder="Enter student name">
                        <div class="invalid-feedback">Name must be 2-50 characters</div>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Email <span class="text-danger">*</span></label>
                        <input type="email" class="form-control" id="formEmail" required placeholder="Enter email address">
                        <div class="invalid-feedback">Please enter a valid email</div>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Password <span class="text-danger">*</span></label>
                        <input type="password" class="form-control" id="formPassword" required minlength="6" maxlength="20" placeholder="Min 6 characters">
                        <div class="invalid-feedback">Password must be 6-20 characters</div>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Class <span class="text-danger">*</span></label>
                        <select class="form-select" id="formClass" required>
                            <option value="">Select Class</option>
                            ${(classes.classes || []).map(c => `<option value="${c.id}">${window.escapeHtml(c.name)}</option>`).join('')}
                        </select>
                        <div class="invalid-feedback">Please select a class</div>
                    </div>
                </form>
            `;
            break;
        case 'teacher':
            title = 'Add Teacher';
            formContent = `
                <form id="addTeacherForm" class="needs-validation" novalidate>
                    <div class="mb-3">
                        <label class="form-label">Name <span class="text-danger">*</span></label>
                        <input type="text" class="form-control" id="formName" required minlength="2" maxlength="50" placeholder="Enter teacher name">
                        <div class="invalid-feedback">Name must be 2-50 characters</div>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Email <span class="text-danger">*</span></label>
                        <input type="email" class="form-control" id="formEmail" required placeholder="Enter email address">
                        <div class="invalid-feedback">Please enter a valid email</div>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Password <span class="text-danger">*</span></label>
                        <input type="password" class="form-control" id="formPassword" required minlength="6" maxlength="20" placeholder="Min 6 characters">
                        <div class="invalid-feedback">Password must be 6-20 characters</div>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Qualification</label>
                        <input type="text" class="form-control" id="formQualification" maxlength="100" placeholder="e.g., M.Sc, B.Ed">
                    </div>
                </form>
            `;
            break;
        case 'class':
            title = 'Add Class';
            formContent = `
                <form id="addClassForm" class="needs-validation" novalidate>
                    <div class="mb-3">
                        <label class="form-label">Class Name <span class="text-danger">*</span></label>
                        <input type="text" class="form-control" id="formName" required minlength="2" maxlength="50" placeholder="e.g., Class 10A">
                        <div class="invalid-feedback">Class name must be 2-50 characters</div>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Grade <span class="text-danger">*</span></label>
                        <input type="text" class="form-control" id="formGrade" required maxlength="20" placeholder="e.g., 10">
                        <div class="invalid-feedback">Grade is required</div>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Section <span class="text-danger">*</span></label>
                        <input type="text" class="form-control" id="formSection" required maxlength="10" placeholder="e.g., A, B, C">
                        <div class="invalid-feedback">Section is required</div>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Room</label>
                        <input type="text" class="form-control" id="formRoom" maxlength="50" placeholder="e.g., Room 101">
                    </div>
                </form>
            `;
            break;
        case 'subject':
            title = 'Add Subject';
            formContent = `
                <form id="addSubjectForm" class="needs-validation" novalidate>
                    <div class="mb-3">
                        <label class="form-label">Subject Name <span class="text-danger">*</span></label>
                        <input type="text" class="form-control" id="formName" required minlength="2" maxlength="50" placeholder="e.g., Mathematics">
                        <div class="invalid-feedback">Subject name must be 2-50 characters</div>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Code <span class="text-danger">*</span></label>
                        <input type="text" class="form-control" id="formCode" required minlength="2" maxlength="20" placeholder="e.g., MATH101">
                        <div class="invalid-feedback">Code must be 2-20 characters</div>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Description</label>
                        <textarea class="form-control" id="formDescription" maxlength="500" placeholder="Enter description"></textarea>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Type</label>
                        <select class="form-select" id="formType">
                            <option value="core">Core</option>
                            <option value="elective">Elective</option>
                        </select>
                    </div>
                </form>
            `;
            break;
        case 'assignment':
            title = 'Post Assignment';
            const [aClasses, subjects] = await Promise.all([API.admin.classes(), API.admin.subjects()]);
            formContent = `
                <form id="addAssignmentForm" class="needs-validation" novalidate>
                    <div class="mb-3">
                        <label class="form-label">Title <span class="text-danger">*</span></label>
                        <input type="text" class="form-control" id="formTitle" required minlength="3" maxlength="100" placeholder="Enter assignment title">
                        <div class="invalid-feedback">Title must be 3-100 characters</div>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Description</label>
                        <textarea class="form-control" id="formDescription" maxlength="1000" placeholder="Enter description"></textarea>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Class <span class="text-danger">*</span></label>
                        <select class="form-select" id="formClass" required>
                            <option value="">Select Class</option>
                            ${(aClasses.classes || []).map(c => `<option value="${c.id}">${window.escapeHtml(c.name)}</option>`).join('')}
                        </select>
                        <div class="invalid-feedback">Please select a class</div>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Subject <span class="text-danger">*</span></label>
                        <select class="form-select" id="formSubject" required>
                            <option value="">Select Subject</option>
                            ${(subjects.subjects || []).map(s => `<option value="${s.id}">${window.escapeHtml(s.name)}</option>`).join('')}
                        </select>
                        <div class="invalid-feedback">Please select a subject</div>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Due Date <span class="text-danger">*</span></label>
                        <input type="date" class="form-control" id="formDueDate" required>
                        <div class="invalid-feedback">Please select a due date</div>
                    </div>
                </form>
            `;
            break;
        case 'message_all_teachers':
            title = 'Notify All Teachers';
            formContent = `
                <form id="addMessageAllTeachersForm" class="needs-validation" novalidate>
                    <div class="mb-3">
                        <label class="form-label">Subject <span class="text-danger">*</span></label>
                        <input type="text" class="form-control" id="formSubject" required maxlength="100" placeholder="Enter message subject">
                        <div class="invalid-feedback">Subject is required</div>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Message <span class="text-danger">*</span></label>
                        <textarea class="form-control" id="formContent" required rows="4" placeholder="Enter your message to all teachers"></textarea>
                        <div class="invalid-feedback">Message content is required</div>
                    </div>
                </form>
            `;
            break;
    }
    
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = formContent;
    document.getElementById('modalSubmitBtn').onclick = () => submitForm(type);
    
    const modal = new bootstrap.Modal(document.getElementById('formModal'));
    modal.show();
}

// Submit Form with Validation
async function submitForm(type) {
    try {
        let formId, validationRules, data;
        
        switch (type) {
            case 'student':
                formId = 'addStudentForm';
                validationRules = Validation.student;
                data = {
                    name: document.getElementById('formName').value.trim(),
                    email: document.getElementById('formEmail').value.trim(),
                    password: document.getElementById('formPassword').value,
                    class_id: document.getElementById('formClass').value
                };
                break;
            case 'teacher':
                formId = 'addTeacherForm';
                validationRules = Validation.teacher;
                data = {
                    name: document.getElementById('formName').value.trim(),
                    email: document.getElementById('formEmail').value.trim(),
                    password: document.getElementById('formPassword').value,
                    qualification: document.getElementById('formQualification')?.value.trim() || ''
                };
                break;
            case 'class':
                formId = 'addClassForm';
                validationRules = Validation.class;
                data = {
                    name: document.getElementById('formName').value.trim(),
                    grade: document.getElementById('formGrade').value.trim(),
                    section: document.getElementById('formSection').value.trim(),
                    room: document.getElementById('formRoom')?.value.trim() || ''
                };
                break;
            case 'subject':
                formId = 'addSubjectForm';
                validationRules = Validation.subject;
                data = {
                    name: document.getElementById('formName').value.trim(),
                    code: document.getElementById('formCode').value.trim(),
                    description: document.getElementById('formDescription')?.value.trim() || '',
                    type: document.getElementById('formType')?.value || 'core'
                };
                break;
            case 'assignment':
                formId = 'addAssignmentForm';
                validationRules = Validation.assignment;
                data = {
                    title: document.getElementById('formTitle').value.trim(),
                    description: document.getElementById('formDescription')?.value.trim() || '',
                    class_id: document.getElementById('formClass').value,
                    subject_id: document.getElementById('formSubject').value,
                    due_date: document.getElementById('formDueDate').value,
                    max_marks: 100
                };
                if (!data.class_id || !data.subject_id || !data.due_date) {
                    window.toast('Please fill in all required fields', 'warning');
                    return;
                }
                break;
            case 'message_all_teachers':
                data = {
                    subject: document.getElementById('formSubject').value.trim(),
                    content: document.getElementById('formContent').value.trim()
                };
                if (!data.subject || !data.content) {
                    window.toast('Please fill in both subject and content', 'warning');
                    return;
                }
                try {
                    const tData = await window.API.admin.getTeachers();
                    for (const t of tData.teachers) {
                        await window.API.admin.sendMessage({
                            receiver_id: t.user_id,
                            subject: data.subject,
                            content: data.content
                        });
                    }
                    bootstrap.Modal.getInstance(document.getElementById('formModal')).hide();
                    window.toast('All teachers notified successfully!', 'success');
                    loadSection('messages');
                } catch(err) { window.toast('Failed to notify all teachers', 'error'); }
                return;
        }
        
        // Validate form
        const result = validateForm(formId, validationRules);
        if (!result.valid) {
            window.toast('Please fill in all required fields correctly', 'warning');
            result.firstInvalid?.focus();
            return;
        }
        
        // Submit data
        let response;
        switch (type) {
            case 'student': response = await window.API.admin.createStudent(data); break;
            case 'teacher': response = await window.API.admin.createTeacher(data); break;
            case 'class': response = await window.API.admin.createClass(data); break;
            case 'subject': response = await window.API.admin.createSubject(data); break;
            case 'assignment': 
                console.log('Submitting assignment with data:', data);
                response = await window.API.teacher.createAssignment(data); 
                console.log('Assignment response:', response);
                break;
        }
        
        bootstrap.Modal.getInstance(document.getElementById('formModal')).hide();
        window.toast(`${type.charAt(0).toUpperCase() + type.slice(1)} added successfully!`, 'success');
        loadSection(type === 'assignment' ? 'assignments' : type + 's');
        
    } catch (error) {
        console.error('Submit form error:', error);
        window.toast(error.message || 'Failed to add item: ' + (error.message || 'Unknown error'), 'error');
    }
}

// Confirm Delete
function confirmDelete(type, id, name) {
    // Check delete permissions
    const deletePermissions = {
        'student': 'canDeleteStudent',
        'teacher': 'canDeleteTeacher',
        'class': 'canDeleteClass',
        'subject': 'canDeleteSubject',
        'assignment': 'canDeleteAssignment'
    };
    
    if (deletePermissions[type] && !window.hasPermission(deletePermissions[type])) {
        window.toast('You do not have permission to delete this item', 'error');
        return;
    }
    
    if (confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
        deleteItem(type, id);
    }
}

async function deleteItem(type, id) {
    try {
        switch (type) {
            case 'student': await window.API.admin.deleteStudent(id); break;
            case 'teacher': await window.API.admin.deleteTeacher(id); break;
            case 'class': await window.API.admin.deleteClass(id); break;
            case 'subject': await window.API.admin.deleteSubject(id); break;
            case 'assignment': await window.API.teacher.deleteAssignment(id); break;
        }
        window.toast(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully!`, 'success');
        loadSection(type + 's');
    } catch (error) {
        window.toast(error.message || 'Failed to delete', 'error');
    }
}

// Attendance Functions
async function takeAttendance(classId) {
    const date = new Date().toISOString().split('T')[0];
    const [studentsData, attendanceData] = await Promise.all([
        API.teacher.getClassStudents(classId),
        API.teacher.getAttendance(classId, date)
    ]);
    
    const students = studentsData.students || [];
    const attendance = attendanceData.attendance || [];
    const existingMap = {};
    attendance.forEach(a => existingMap[a.student_id] = a.status);
    
    document.getElementById('pageContent').innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <div><div class="page-title">Take Attendance</div><p class="page-subtitle">Date: ${date}</p></div>
            <div>
                <button class="btn btn-success me-2" onclick="markAllPresent()">Mark All Present</button>
                <button class="btn btn-primary" onclick="submitAttendance('${classId}', '${date}')">Submit Attendance</button>
            </div>
        </div>
        <div class="card">
            <div class="card-body p-0">
                <table class="table" id="attendanceForm">
                    <thead><tr><th>Roll No</th><th>Name</th><th>Status</th></tr></thead>
                    <tbody>
                        ${students.map(s => `<tr data-student="${s.id}">
                            <td>${window.escapeHtml(s.roll_number || 'N/A')}</td>
                            <td>${window.escapeHtml(s.name)}</td>
                            <td>
                                <select class="form-select status-select" style="width: auto;">
                                    <option value="present" ${existingMap[s.id] === 'present' ? 'selected' : ''}>Present</option>
                                    <option value="absent" ${existingMap[s.id] === 'absent' ? 'selected' : ''}>Absent</option>
                                    <option value="late" ${existingMap[s.id] === 'late' ? 'selected' : ''}>Late</option>
                                </select>
                            </td>
                        </tr>`).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function markAllPresent() {
    document.querySelectorAll('.status-select').forEach(select => select.value = 'present');
}

async function submitAttendance(classId, date) {
    const attendance = [];
    document.querySelectorAll('#attendanceForm tbody tr').forEach(row => {
        attendance.push({
            student_id: row.dataset.student,
            status: row.querySelector('.status-select').value
        });
    });
    
    if (attendance.length === 0) {
        window.toast('No students to mark attendance for', 'warning');
        return;
    }
    
    try {
        await window.API.teacher.markAttendance(classId, { date, attendance });
        window.toast('Attendance submitted successfully!', 'success');
        loadSection('attendance');
    } catch (error) {
        window.toast(error.message || 'Failed to submit attendance', 'error');
    }
}

// Grade Functions
async function uploadGrade(classId, subjectId) {
    const [studentsData, gradesData] = await Promise.all([
        API.teacher.getClassStudents(classId),
        API.teacher.getGrades(classId, subjectId)
    ]);
    
    const students = studentsData.students || [];
    const grades = gradesData.grades || [];
    const gradeMap = {};
    grades.forEach(g => gradeMap[g.student_id] = g);
    
    document.getElementById('pageContent').innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <div><div class="page-title">Upload Grades</div></div>
            <button class="btn btn-primary" onclick="submitGrades('${classId}', '${subjectId}')">Save All Grades</button>
        </div>
        <div class="card">
            <div class="card-body p-0">
                <table class="table" id="gradeForm">
                    <thead><tr><th>Roll No</th><th>Name</th><th>Score</th><th>Max Score</th></tr></thead>
                    <tbody>
                        ${students.map(s => `<tr data-student="${s.id}">
                            <td>${window.escapeHtml(s.roll_number || 'N/A')}</td>
                            <td>${window.escapeHtml(s.name)}</td>
                            <td><input type="number" class="form-control score-input" value="${gradeMap[s.id]?.score || ''}" min="0" max="1000" placeholder="0"></td>
                            <td><input type="number" class="form-control max-score-input" value="${gradeMap[s.id]?.max_score || 100}" min="1" max="1000"></td>
                        </tr>`).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

async function submitGrades(classId, subjectId) {
    const grades = [];
    let hasErrors = false;
    
    document.querySelectorAll('#gradeForm tbody tr').forEach(row => {
        const scoreInput = row.querySelector('.score-input');
        const maxScoreInput = row.querySelector('.max-score-input');
        const score = parseFloat(scoreInput.value);
        const maxScore = parseFloat(maxScoreInput.value);
        
        if (scoreInput.value !== '') {
            if (isNaN(score) || score < 0 || score > 1000) {
                scoreInput.classList.add('is-invalid');
                hasErrors = true;
            } else {
                scoreInput.classList.remove('is-invalid');
            }
            
            if (isNaN(maxScore) || maxScore < 1 || maxScore > 1000) {
                maxScoreInput.classList.add('is-invalid');
                hasErrors = true;
            } else {
                maxScoreInput.classList.remove('is-invalid');
            }
            
            if (!hasErrors) {
                grades.push({
                    student_id: row.dataset.student,
                    assessment_type: 'Term Test',
                    score: score,
                    max_score: maxScore
                });
            }
        }
    });
    
    if (hasErrors) {
        window.toast('Please enter valid scores (0-1000)', 'warning');
        return;
    }
    
    if (grades.length === 0) {
        window.toast('No grades to save', 'warning');
        return;
    }
    
    try {
        for (const grade of grades) {
            await window.API.teacher.submitGrade({
                student_id: grade.student_id,
                subject_id: subjectId,
                class_id: classId,
                assessment_type: grade.assessment_type,
                score: grade.score,
                max_score: grade.max_score
            });
        }
        window.toast('Grades saved successfully!', 'success');
        loadSection('grades');
    } catch (error) {
        window.toast(error.message || 'Failed to save grades', 'error');
    }
}

// Parent Functions
async function viewChildAttendance(childId) {
    const data = await window.API.parent.getChildAttendance(childId);
    const { attendance = [], summary = {} } = data;
    
    document.getElementById('pageContent').innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <div><div class="page-title">Attendance</div><p class="page-subtitle">Attendance record</p></div>
            <button class="btn btn-secondary" onclick="loadSection('children')">Back</button>
        </div>
        <div class="stat-cards mb-4">
            <div class="stat-card"><div class="stat-card-icon success"><i class="fas fa-check"></i></div><h3>${summary.present || 0}</h3><p>Present</p></div>
            <div class="stat-card"><div class="stat-card-icon danger"><i class="fas fa-times"></i></div><h3>${summary.absent || 0}</h3><p>Absent</p></div>
        </div>
        <div class="card">
            <div class="card-body p-0">
                <table class="table"><thead><tr><th>Date</th><th>Status</th><th>Remarks</th></tr></thead>
                <tbody>${attendance.map(a => `<tr><td>${a.date}</td><td><span class="attendance-status ${a.status}">${a.status}</span></td><td>${window.escapeHtml(a.remarks || '-')}</td></tr>`).join('')}</tbody>
            </div>
        </div>
    `;
}

async function viewChildGrades(childId) {
    const data = await window.API.parent.getChildGrades(childId);
    const { grades = [], summary = [] } = data;
    
    document.getElementById('pageContent').innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <div><div class="page-title">Grades</div><p class="page-subtitle">Academic performance</p></div>
            <button class="btn btn-secondary" onclick="loadSection('children')">Back</button>
        </div>
        <div class="row mb-4">
            ${summary.map(s => `<div class="col-md-3"><div class="stat-card"><h6>${window.escapeHtml(s.subject_name)}</h6><h3>${s.average}%</h3><p>Average</p></div></div>`).join('')}
        </div>
        <div class="card">
            <div class="card-body p-0">
                <table class="table"><thead><tr><th>Subject</th><th>Assessment</th><th>Score</th></tr></thead>
                <tbody>${grades.map(g => `<tr><td>${window.escapeHtml(g.subject_name || 'N/A')}</td><td>${window.escapeHtml(g.assessment_type)}</td><td>${g.score}/${g.max_score}</td></tr>`).join('')}</tbody>
            </div>
        </div>
    `;
}

// Settings & Profile
async function saveSettings() {
    try {
        const schoolName = document.getElementById('schoolName')?.value.trim() || '';
        const academicYear = document.getElementById('academicYear')?.value.trim() || '';
        const currentTerm = document.getElementById('currentTerm')?.value.trim() || '';
        const gradeUploadEnabled = document.getElementById('gradeUploadEnabled')?.checked ? 'true' : 'false';
        const gradeStartDate = document.getElementById('gradeStartDate')?.value || '';
        const gradeEndDate = document.getElementById('gradeEndDate')?.value || '';

        await window.API.admin.updateSettings({
            school_name: schoolName,
            academic_year: academicYear,
            term: currentTerm,
            grade_upload_enabled: gradeUploadEnabled,
            grade_upload_start_date: gradeStartDate,
            grade_upload_end_date: gradeEndDate
        });
        window.toast('Settings saved successfully!', 'success');
        loadSection('settings');
    } catch (error) {
        window.toast(error.message || 'Failed to save settings', 'error');
    }
}

async function updateProfile() {
    const phone = document.getElementById('phone')?.value.trim() || '';
    const address = document.getElementById('address')?.value.trim() || '';
    
    if (phone && !Validation.phone.test(phone)) {
        window.toast('Please enter a valid phone number', 'warning');
        return;
    }
    
    try {
        if (window.currentUser.role === 'admin') {
            await window.API.admin.updateProfile({ phone, address });
        } else if (window.currentUser.role === 'teacher') {
            await window.API.teacher.updateProfile({ phone, address });
        } else if (window.currentUser.role === 'student') {
            await window.API.student.updateProfile({ phone, address });
        } else if (window.currentUser.role === 'parent') {
            await window.API.parent.updateProfile({ phone, address });
        }
        window.toast('Profile updated successfully!', 'success');
        loadSection('profile');
    } catch (error) {
        window.toast(error.message || 'Failed to update profile', 'error');
    }
}

async function updateNotificationBadge() {
    try {
        let notifications = [];
        if (window.currentUser.role === 'student') {
            const data = await window.API.student.getNotifications();
            notifications = data.notifications || data || [];
        } else if (window.currentUser.role === 'teacher') {
            const data = await window.API.teacher.getNotifications();
            notifications = data.notifications || data || [];
        } else if (window.currentUser.role === 'admin') {
            const data = await window.API.admin.getNotifications();
            notifications = data.notifications || data || [];
        }
        const count = Array.isArray(notifications) ? notifications.length : 0;
        document.getElementById('notificationCount').textContent = count;
    } catch (error) {
        console.log('Notifications not available');
    }
}

// Notifications
async function loadNotifications() {
    try {
        let notifications = [];
        if (window.currentUser.role === 'student') {
            const data = await window.API.student.getNotifications();
            notifications = data.notifications || data || [];
        } else if (window.currentUser.role === 'teacher') {
            const data = await window.API.teacher.getNotifications();
            notifications = data.notifications || data || [];
        } else if (window.currentUser.role === 'admin') {
            const data = await window.API.admin.getNotifications();
            notifications = data.notifications || data || [];
        }
        
        const count = Array.isArray(notifications) ? notifications.length : 0;
        document.getElementById('notificationCount').textContent = count;
        
        document.getElementById('pageContent').innerHTML = `
            <div class="page-title">Notifications</div>
            <p class="page-subtitle">All your notifications</p>
            <div class="card mt-4">
                <div class="card-body p-0">
                    <table class="table">
                        <thead><tr><th>Title</th><th>Message</th><th>Date</th></tr></thead>
                        <tbody>
                            ${notifications.length ? notifications.map(n => `<tr><td>${window.escapeHtml(n.title)}</td><td>${window.escapeHtml(n.message)}</td><td>${new Date(n.created_at).toLocaleDateString()}</td></tr>`).join('') : '<tr><td colspan="3" class="text-center">No notifications</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    } catch (error) {
        console.log('Notifications not available');
        document.getElementById('pageContent').innerHTML = '<div class="alert alert-info">Notifications not available</div>';
    }
}

// Logout
async function logout() {
    try {
        if (window.API && window.API.auth) await window.API.auth.logout();
    } catch(e) { console.error('API logout failed', e); }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
}

window.logout = logout;
window.showAddModal = showAddModal;
window.submitForm = submitForm;
window.confirmDelete = confirmDelete;
window.takeAttendance = takeAttendance;
window.markAllPresent = markAllPresent;
window.submitAttendance = submitAttendance;
window.uploadGrade = uploadGrade;
window.submitGrades = submitGrades;
window.viewChildAttendance = viewChildAttendance;
window.viewChildGrades = viewChildGrades;
window.saveSettings = saveSettings;
window.updateProfile = updateProfile;
window.toast = toast;
window.escapeHtml = escapeHtml;
window.loadSection = loadSection;
window.loadDashboard = loadDashboard;
window.loadUsers = loadUsers;
window.loadStudents = loadStudents;
window.loadTeachers = loadTeachers;
window.loadClasses = loadClasses;
window.loadSubjects = loadSubjects;
window.loadAttendance = loadAttendance;
window.loadGrades = loadGrades;
window.loadAssignments = loadAssignments;
window.loadReports = loadReports;
window.loadMessages = loadMessages;
window.loadSettings = loadSettings;
window.loadProfile = loadProfile;
window.loadMyClasses = loadMyClasses;
window.loadChildren = loadChildren;
window.loadNotifications = loadNotifications;
window.Students = Students;
window.Teachers = Teachers;
window.Grades = Grades;
window.Events = Events;
window.showAddModal = showAddModal;
window.submitForm = submitForm;
window.confirmDelete = confirmDelete;
window.deleteItem = deleteItem;
window.hasPermission = hasPermission;

// Expose edit functions for UI module
window.editStudent = async (id) => {
    const newName = prompt('Enter new Name:');
    if (!newName) return;
    try {
        await window.API.admin.updateStudent(id, { name: newName });
        window.toast('Student updated', 'success');
        if (window.currentSection === 'students') window.Students.load();
    } catch(err) { window.toast('Update failed', 'error'); }
};
window.editTeacher = async (id) => {
    const newName = prompt('Enter new Name:');
    if (!newName) return;
    try {
        await window.API.admin.updateTeacher(id, { name: newName });
        window.toast('Teacher updated', 'success');
        if (window.currentSection === 'teachers') loadSection('teachers');
    } catch(err) { window.toast('Update failed', 'error'); }
};
window.notifyAllTeachers = async () => {
    window.showAddModal('message_all_teachers');
};
window.editClass = (id) => loadSection('classes');
window.editSubject = (id) => loadSection('subjects');

// Missing functions referenced in onclick handlers
window.markAttendance = function(studentId, status) {
    console.log('Mark attendance:', studentId, status);
};
window.updateRemarks = function(id, remarks) {
    console.log('Update remarks:', id, remarks);
};
window.viewMessage = function(id) {
    console.log('View message:', id);
};

window.loadTimetable = async function() {
    let timetableData = [];
    try {
        if (window.currentUser.role === 'teacher') {
            const data = await window.API.teacher.getTimetable();
            timetableData = data.timetable || [];
        } else if (window.currentUser.role === 'student') {
            const data = await window.API.student.getTimetable();
            timetableData = data.timetable || [];
        } else if (window.currentUser.role === 'parent') {
            document.getElementById('pageContent').innerHTML = '<div class="alert alert-info">Please select a child to view their timetable from the My Children section.</div>';
            return;
        }
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        const timeSlots = [
            { period: 1, label: '08:00 - 09:00' },
            { period: 2, label: '09:00 - 10:00' },
            { period: 3, label: '10:00 - 11:00' },
            { period: 4, label: '11:00 - 12:00' },
            { period: 5, label: '12:00 - 01:00 PM' },
            { period: 6, label: '01:00 - 02:00 PM' },
            { period: 7, label: '02:00 - 03:00 PM' }
        ];
        let html = '<div class="page-title">Timetable</div><p class="page-subtitle">Your weekly schedule</p><div class="card mt-4"><div class="card-body p-0"><div class="table-responsive"><table class="table table-bordered text-center align-middle mb-0"><thead class="bg-light"><tr><th>Time</th>' + days.map(d => '<th>' + d + '</th>').join('') + '</tr></thead><tbody>';
        timeSlots.forEach(ts => {
            html += '<tr><td class="fw-bold">' + ts.label + '</td>';
            days.forEach(day => {
                const session = timetableData.find(t => t.day === day && t.period === ts.period);
                if (session) html += '<td class="bg-primary text-white rounded"><div class="fw-bold">' + (session.subject_name || session.class_name) + '</div><small>' + (session.room || 'TBA') + '</small></td>';
                else html += '<td class="text-muted">-</td>';
            });
            html += '</tr>';
        });
        html += '</tbody></table></div></div></div>';
        document.getElementById('pageContent').innerHTML = html;
    } catch(e) {
        console.error(e);
        document.getElementById('pageContent').innerHTML = '<div class="alert alert-info">Timetable not available.</div>';
    }
};

console.log('Dashboard JavaScript loaded with modules!');
