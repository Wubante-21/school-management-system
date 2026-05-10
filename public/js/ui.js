// UI Module - DOM Rendering Functions
// Handles all table rendering, cards, modals, and UI components

window.UI = {
    // Show loading spinner
    showLoading: (containerId) => {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div class="d-flex justify-content-center align-items-center py-5">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </div>`;
        }
    },

    // Show error message
    showError: (containerId, message) => {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div class="alert alert-danger m-3">
                    <i class="fas fa-exclamation-circle me-2"></i>
                    ${message}
                </div>`;
        }
    },

    // Render students table
    renderStudentsTable: (students) => {
        if (!students || students.length === 0) {
            return '<tr><td colspan="8" class="text-center py-4">No students found</td></tr>';
        }
        return students.map(s => `
            <tr>
                <td>${s.id}</td>
                <td>${window.escapeHtml(s.name || '')}</td>
                <td>${window.escapeHtml(s.email || '')}</td>
                <td>${window.escapeHtml(s.roll_number || 'N/A')}</td>
                <td>${window.escapeHtml(s.class_name || 'Not Assigned')}</td>
                <td><span class="badge bg-${s.status === 'active' ? 'success' : 'secondary'}">${s.status || 'active'}</span></td>
                <td>${s.created_at ? new Date(s.created_at).toLocaleDateString() : 'N/A'}</td>
                <td>
                    <button class="btn btn-sm btn-primary me-1" onclick="window.editStudent('${s.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-danger" onclick="window.confirmDelete('student', '${s.id}', '${window.escapeHtml(s.name)}')"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
    },

    // Render teachers table
    renderTeachersTable: (teachers) => {
        if (!teachers || teachers.length === 0) {
            return '<tr><td colspan="7" class="text-center py-4">No teachers found</td></tr>';
        }
        return teachers.map(t => `
            <tr>
                <td>${t.id}</td>
                <td>${window.escapeHtml(t.name || '')}</td>
                <td>${window.escapeHtml(t.email || '')}</td>
                <td>${window.escapeHtml(t.qualification || 'N/A')}</td>
                <td>${window.escapeHtml(t.phone || 'N/A')}</td>
                <td><span class="badge bg-${t.status === 'active' ? 'success' : 'secondary'}">${t.status || 'active'}</span></td>
                <td>
                    <button class="btn btn-sm btn-primary me-1" onclick="window.editTeacher('${t.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-danger" onclick="window.confirmDelete('teacher', '${t.id}', '${window.escapeHtml(t.name)}')"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
    },

    // Render classes table
    renderClassesTable: (classes) => {
        if (!classes || classes.length === 0) {
            return '<tr><td colspan="6" class="text-center py-4">No classes found</td></tr>';
        }
        return classes.map(c => `
            <tr>
                <td>${c.id}</td>
                <td>${window.escapeHtml(c.name || '')}</td>
                <td>${window.escapeHtml(c.grade || '')}</td>
                <td>${window.escapeHtml(c.section || '')}</td>
                <td>${window.escapeHtml(c.room || 'N/A')}</td>
                <td>
                    <button class="btn btn-sm btn-primary me-1" onclick="window.editClass('${c.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-danger" onclick="window.confirmDelete('class', '${c.id}', '${window.escapeHtml(c.name)}')"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
    },

    // Render subjects table
    renderSubjectsTable: (subjects) => {
        if (!subjects || subjects.length === 0) {
            return '<tr><td colspan="6" class="text-center py-4">No subjects found</td></tr>';
        }
        return subjects.map(s => `
            <tr>
                <td>${s.id}</td>
                <td>${window.escapeHtml(s.name || '')}</td>
                <td>${window.escapeHtml(s.code || '')}</td>
                <td>${window.escapeHtml(s.type || 'core')}</td>
                <td>${window.escapeHtml((s.description || '').substring(0, 50))}${s.description && s.description.length > 50 ? '...' : ''}</td>
                <td>
                    <button class="btn btn-sm btn-primary me-1" onclick="window.editSubject('${s.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-danger" onclick="window.confirmDelete('subject', '${s.id}', '${window.escapeHtml(s.name)}')"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
    },

    // Render assignments table
    renderAssignmentsTable: (assignments, role) => {
        if (!assignments || assignments.length === 0) {
            return '<tr><td colspan="6" class="text-center py-4">No assignments found</td></tr>';
        }
        if (role === 'admin' || role === 'teacher') {
            return assignments.map(a => `
                <tr>
                    <td>${window.escapeHtml(a.title || '')}</td>
                    <td>${window.escapeHtml(a.subject_name || 'N/A')}</td>
                    <td>${window.escapeHtml(a.class_name || 'N/A')}</td>
                    <td>${window.escapeHtml(a.teacher_name || 'N/A')}</td>
                    <td>${a.due_date ? new Date(a.due_date).toLocaleDateString() : 'N/A'}</td>
                    <td>${a.submission_count || 0}</td>
                    <td>
                        <button class="btn btn-sm btn-danger" onclick="window.confirmDelete('assignment', '${a.id}', '${window.escapeHtml(a.title)}')"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `).join('');
        }
        return assignments.map(a => `
            <tr>
                <td>${window.escapeHtml(a.title || '')}</td>
                <td>${window.escapeHtml(a.subject_name || 'N/A')}</td>
                <td>${window.escapeHtml(a.teacher_name || 'N/A')}</td>
                <td>${a.due_date ? new Date(a.due_date).toLocaleDateString() : 'N/A'}</td>
                <td>${a.is_submitted ? '<span class="badge bg-success">Submitted</span>' : '<span class="badge bg-warning">Pending</span>'}</td>
            </tr>
        `).join('');
    },

    // Render grades table
    renderGradesTable: (grades) => {
        if (!grades || grades.length === 0) {
            return '<tr><td colspan="7" class="text-center py-4">No grades found</td></tr>';
        }
        return grades.map(g => `
            <tr>
                <td>${window.escapeHtml(g.student_name || 'N/A')}</td>
                <td>${window.escapeHtml(g.roll_number || 'N/A')}</td>
                <td>${window.escapeHtml(g.assessment_type || '')}</td>
                <td>${g.score}/${g.max_score}</td>
                <td><span class="badge bg-${window.getGradeColor(g.grade)}">${g.grade || 'N/A'}</span></td>
                <td>${g.percentage ? Number(g.percentage).toFixed(1) + '%' : 'N/A'}</td>
                <td>${g.created_at ? new Date(g.created_at).toLocaleDateString() : 'N/A'}</td>
            </tr>
        `).join('');
    },

    // Render attendance table
    renderAttendanceTable: (attendance) => {
        if (!attendance || attendance.length === 0) {
            return '<tr><td colspan="6" class="text-center py-4">No attendance records found</td></tr>';
        }
        return attendance.map(a => `
            <tr>
                <td>${window.escapeHtml(a.roll_number || '')}</td>
                <td>${window.escapeHtml(a.student_name || '')}</td>
                <td>
                    <select class="form-select form-select-sm" onchange="window.markAttendance('${a.student_id}', this.value)">
                        <option value="present" ${a.status === 'present' ? 'selected' : ''}>Present</option>
                        <option value="absent" ${a.status === 'absent' ? 'selected' : ''}>Absent</option>
                        <option value="late" ${a.status === 'late' ? 'selected' : ''}>Late</option>
                    </select>
                </td>
                <td><input type="text" class="form-control form-control-sm" value="${window.escapeHtml(a.remarks || '')}" onchange="window.updateRemarks('${a.id}', this.value)" placeholder="Remarks"></td>
                <td>${a.date ? new Date(a.date).toLocaleDateString() : 'N/A'}</td>
            </tr>
        `).join('');
    },

    // Render messages table
    renderMessagesTable: (messages) => {
        if (!messages || messages.length === 0) {
            return '<tr><td colspan="5" class="text-center py-4">No messages found</td></tr>';
        }
        return messages.map(m => `
            <tr>
                <td>${window.escapeHtml(m.sender_name || m.receiver_name || 'N/A')}</td>
                <td>${window.escapeHtml(m.subject || 'No Subject')}</td>
                <td>${window.escapeHtml((m.content || '').substring(0, 50))}${m.content && m.content.length > 50 ? '...' : ''}</td>
                <td>${m.created_at ? new Date(m.created_at).toLocaleDateString() : 'N/A'}</td>
                <td><button class="btn btn-sm btn-info" onclick="window.viewMessage('${m.id}')"><i class="fas fa-eye"></i></button></td>
            </tr>
        `).join('');
    },

    // Render notifications dropdown
    renderNotificationsDropdown: (notifications) => {
        if (!notifications || notifications.length === 0) {
            return '<li class="dropdown-item text-muted">No notifications</li>';
        }
        return notifications.slice(0, 5).map(n => `
            <li>
                <a class="dropdown-item" href="#" onclick="window.loadSection('notifications'); return false;">
                    <div class="fw-bold">${window.escapeHtml(n.title || '')}</div>
                    <small class="text-muted">${window.escapeHtml((n.message || '').substring(0, 30))}...</small>
                </a>
            </li>
        `).join('');
    },

    // Render stat cards
    renderStatCards: (stats) => {
        return `
            <div class="stat-cards">
                <div class="stat-card">
                    <div class="stat-card-header">
                        <div class="stat-card-icon primary"><i class="fas fa-user-graduate"></i></div>
                    </div>
                    <h3>${stats.totalStudents || 0}</h3>
                    <p>Total Students</p>
                </div>
                <div class="stat-card">
                    <div class="stat-card-header">
                        <div class="stat-card-icon success"><i class="fas fa-chalkboard-teacher"></i></div>
                    </div>
                    <h3>${stats.totalTeachers || 0}</h3>
                    <p>Total Teachers</p>
                </div>
                <div class="stat-card">
                    <div class="stat-card-header">
                        <div class="stat-card-icon warning"><i class="fas fa-school"></i></div>
                    </div>
                    <h3>${stats.totalClasses || 0}</h3>
                    <p>Total Classes</p>
                </div>
                <div class="stat-card">
                    <div class="stat-card-header">
                        <div class="stat-card-icon info"><i class="fas fa-book"></i></div>
                    </div>
                    <h3>${stats.totalSubjects || 0}</h3>
                    <p>Total Subjects</p>
                </div>
            </div>`;
    },

    // Render page header with action button
    renderPageHeader: (title, subtitle, actionButton) => {
        return `
            <div class="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <div class="page-title">${title}</div>
                    <p class="page-subtitle">${subtitle}</p>
                </div>
                ${actionButton || ''}
            </div>`;
    },

    // Render data table wrapper
    renderTable: (headers, body, tableClass = 'table') => {
        return `
            <div class="card">
                <div class="card-body p-0">
                    <table class="${tableClass}">
                        <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
                        <tbody>${body}</tbody>
                    </table>
                </div>
            </div>`;
    },

    // Render pagination
    renderPagination: (currentPage, totalPages, onPageChange) => {
        if (totalPages <= 1) return '';
        let pages = '';
        for (let i = 1; i <= totalPages; i++) {
            pages += `<li class="page-item ${i === currentPage ? 'active' : ''}">
                <a class="page-link" href="#" onclick="${onPageChange}(${i}); return false;">${i}</a>
            </li>`;
        }
        return `
            <nav class="mt-3">
                <ul class="pagination justify-content-center">
                    <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                        <a class="page-link" href="#" onclick="${onPageChange}(${currentPage - 1}); return false;">Previous</a>
                    </li>
                    ${pages}
                    <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                        <a class="page-link" href="#" onclick="${onPageChange}(${currentPage + 1}); return false;">Next</a>
                    </li>
                </ul>
            </nav>`;
    },

    // Show modal
    showModal: (title, content, footer) => {
        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modalBody').innerHTML = content;
        document.getElementById('modalFooter').innerHTML = footer;
        const modal = new bootstrap.Modal(document.getElementById('formModal'));
        modal.show();
        return modal;
    },

    // Close modal
    closeModal: () => {
        const modal = bootstrap.Modal.getInstance(document.getElementById('formModal'));
        if (modal) modal.hide();
    }
};

// Helper function for grade colors
window.getGradeColor = function(grade) {
    const colors = { 'A+': 'success', 'A': 'success', 'B+': 'info', 'B': 'info', 'C': 'warning', 'D': 'warning', 'F': 'danger' };
    return colors[grade] || 'secondary';
};