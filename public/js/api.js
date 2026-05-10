const API_BASE = '/api';

const api = {
    async request(endpoint, options = {}) {
        const token = localStorage.getItem('token');
        const headers = { 'Content-Type': 'application/json', ...options.headers };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        try {
            const response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
            const data = await response.json();
            
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
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

    auth: {
        async login(email, password) {
            return api.request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
        },
        async register(data) {
            return api.request('/auth/register', { method: 'POST', body: JSON.stringify(data) });
        },
        async forgotPassword(email) {
            return api.request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
        },
        async logout() {
            return api.request('/auth/logout', { method: 'POST' });
        },
        async getProfile() {
            return api.request('/auth/me');
        },
        async updateProfile(data) {
            return api.request('/auth/profile', { method: 'PUT', body: JSON.stringify(data) });
        },
        async changePassword(currentPassword, newPassword) {
            return api.request('/auth/change-password', { method: 'PUT', body: JSON.stringify({ currentPassword, newPassword }) });
        }
    },

    admin: {
        async getDashboard() { return api.request('/admin/dashboard'); },
        async getSettings() { return api.request('/admin/settings'); },
        async updateSettings(data) { return api.request('/admin/settings', { method: 'PUT', body: JSON.stringify(data) }); },
        async getAssignments() { return api.request('/admin/assignments'); },
        async createAssignment(data) { return api.request('/admin/assignments', { method: 'POST', body: JSON.stringify(data) }); },
        async getMessages(type = 'inbox') { return api.request(`/admin/messages?type=${type === 'sent' ? 'sent' : ''}`); },
        async sendMessage(data) { return api.request('/admin/messages', { method: 'POST', body: JSON.stringify(data) }); },
        async getProfile() { return api.request('/auth/me'); },
        async updateProfile(data) { return api.request('/auth/profile', { method: 'PUT', body: JSON.stringify(data) }); },
        async getUsers(params = {}) { return api.request(`/admin/users?${new URLSearchParams(params)}`); },
        async createUser(data) { return api.request('/admin/users', { method: 'POST', body: JSON.stringify(data) }); },
        async updateUser(id, data) { return api.request(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }); },
        async deleteUser(id) { return api.request(`/admin/users/${id}`, { method: 'DELETE' }); },
        async getStudents(params = {}) { return api.request(`/admin/students?${new URLSearchParams(params)}`); },
        async getStudent(id) { return api.request(`/admin/students/${id}`); },
        async createStudent(data) { return api.request('/admin/students', { method: 'POST', body: JSON.stringify(data) }); },
        async updateStudent(id, data) { return api.request(`/admin/students/${id}`, { method: 'PUT', body: JSON.stringify(data) }); },
        async deleteStudent(id) { return api.request(`/admin/students/${id}`, { method: 'DELETE' }); },
        async getTeachers(params = {}) { return api.request(`/admin/teachers?${new URLSearchParams(params)}`); },
        async createTeacher(data) { return api.request('/admin/teachers', { method: 'POST', body: JSON.stringify(data) }); },
        async updateTeacher(id, data) { return api.request(`/admin/teachers/${id}`, { method: 'PUT', body: JSON.stringify(data) }); },
        async deleteTeacher(id) { return api.request(`/admin/teachers/${id}`, { method: 'DELETE' }); },
        async getClasses(params = {}) { return api.request(`/admin/classes?${new URLSearchParams(params)}`); },
        async getClass(id) { return api.request(`/admin/classes/${id}`); },
        async createClass(data) { return api.request('/admin/classes', { method: 'POST', body: JSON.stringify(data) }); },
        async updateClass(id, data) { return api.request(`/admin/classes/${id}`, { method: 'PUT', body: JSON.stringify(data) }); },
        async deleteClass(id) { return api.request(`/admin/classes/${id}`, { method: 'DELETE' }); },
        async getSubjects(params = {}) { return api.request(`/admin/subjects?${new URLSearchParams(params)}`); },
        async createSubject(data) { return api.request('/admin/subjects', { method: 'POST', body: JSON.stringify(data) }); },
        async updateSubject(id, data) { return api.request(`/admin/subjects/${id}`, { method: 'PUT', body: JSON.stringify(data) }); },
        async deleteSubject(id) { return api.request(`/admin/subjects/${id}`, { method: 'DELETE' }); },
        async getAttendanceReport(params = {}) { return api.request(`/admin/reports/attendance?${new URLSearchParams(params)}`); },
        async getGradesReport(params = {}) { return api.request(`/admin/reports/grades?${new URLSearchParams(params)}`); },
        async getAnalytics() { return api.request('/admin/reports/analytics'); },
        async getNotifications() { return api.request('/admin/notifications'); }
    },

    teacher: {
        async getDashboard() { return api.request('/teacher/dashboard'); },
        async getProfile() { return api.request('/auth/me'); },
        async updateProfile(data) { return api.request('/auth/profile', { method: 'PUT', body: JSON.stringify(data) }); },
        async getClasses() { return api.request('/teacher/classes'); },
        async getClassStudents(classId) { return api.request(`/teacher/class/${classId}/students`); },
        async getAttendance(classId, date) { return api.request(`/teacher/attendance/${classId}?date=${date}`); },
        async markAttendance(classId, data) { return api.request(`/teacher/attendance/${classId}`, { method: 'POST', body: JSON.stringify(data) }); },
        async getGrades(classId, subjectId) { return api.request(`/teacher/grades/${classId}/${subjectId}`); },
        async submitGrade(data) { return api.request('/teacher/grades', { method: 'POST', body: JSON.stringify(data) }); },
        async getAssignments() { return api.request('/teacher/assignments'); },
        async createAssignment(data) { return api.request('/teacher/assignments', { method: 'POST', body: JSON.stringify(data) }); },
        async updateAssignment(id, data) { return api.request(`/teacher/assignments/${id}`, { method: 'PUT', body: JSON.stringify(data) }); },
        async deleteAssignment(id) { return api.request(`/teacher/assignments/${id}`, { method: 'DELETE' }); },
        async getSubmissions(assignmentId) { return api.request(`/teacher/assignments/${assignmentId}/submissions`); },
        async getTimetable() { return api.request('/teacher/timetable'); },
        async getMessages(type) { return api.request(`/teacher/messages?type=${type}`); },
        async sendMessage(data) { return api.request('/teacher/messages', { method: 'POST', body: JSON.stringify(data) }); },
        async searchStudents(q) { return api.request(`/teacher/students/search?q=${q}`); },
        async getNotifications() { return api.request('/teacher/notifications'); }
    },

    student: {
        async getDashboard() { return api.request('/student/dashboard'); },
        async getProfile() { return api.request('/student/profile'); },
        async updateProfile(data) { return api.request('/student/profile', { method: 'PUT', body: JSON.stringify(data) }); },
        async getAttendance(params = {}) { return api.request(`/student/attendance?${new URLSearchParams(params)}`); },
        async getGrades(params = {}) { return api.request(`/student/grades?${new URLSearchParams(params)}`); },
        async getSubjects() { return api.request('/student/subjects'); },
        async getTimetable() { return api.request('/student/timetable'); },
        async getAssignments(params = {}) { return api.request(`/student/assignments?${new URLSearchParams(params)}`); },
        async submitAssignment(id, data) { return api.request(`/student/assignments/${id}/submit`, { method: 'POST', body: JSON.stringify(data) }); },
        async getMessages() { return api.request('/student/messages'); },
        async sendMessage(data) { return api.request('/student/messages', { method: 'POST', body: JSON.stringify(data) }); },
        async getNotifications() { return api.request('/student/notifications'); },
        async markNotificationRead(id) { return api.request(`/student/notifications/${id}/read`, { method: 'PUT' }); },
        async getTeachers() { return api.request('/student/teachers'); }
    },

    parent: {
        async getDashboard() { return api.request('/parent/dashboard'); },
        async getProfile() { return api.request('/auth/me'); },
        async updateProfile(data) { return api.request('/auth/profile', { method: 'PUT', body: JSON.stringify(data) }); },
        async getChildren() { return api.request('/parent/children'); },
        async getChild(childId) { return api.request(`/parent/child/${childId}`); },
        async getChildAttendance(childId, params = {}) { return api.request(`/parent/child/${childId}/attendance?${new URLSearchParams(params)}`); },
        async getChildGrades(childId, params = {}) { return api.request(`/parent/child/${childId}/grades?${new URLSearchParams(params)}`); },
        async getChildAssignments(childId, params = {}) { return api.request(`/parent/child/${childId}/assignments?${new URLSearchParams(params)}`); },
        async getChildTimetable(childId) { return api.request(`/parent/child/${childId}/timetable`); },
        async getMessages() { return api.request('/parent/messages'); },
        async sendMessage(data) { return api.request('/parent/messages', { method: 'POST', body: JSON.stringify(data) }); },
        async getTeachers() { return api.request('/parent/teachers'); },
        async getNotifications() { return api.request('/parent/notifications'); },
        async getFees() { return api.request('/parent/fees'); }
    }
};

window.api = api;
window.API = api;
